// Cliente do warframe.market (API v2) com fila respeitando o limite de ~3 req/s.
import { cached, cachedEntry, HOUR, MINUTE } from './cache.ts';
import type { PriceSummary } from '../shared/types.ts';
import type { Refinement } from '../shared/calc.ts';
import { historicalMedian, idealPrice, type StatPoint } from './pricing.ts';

// Preços ficam 15 min em cache; o botão 'Atualizar preços' força buscar de novo.
const PRICE_TTL = 15 * MINUTE;

const BASE = 'https://api.warframe.market/v2';
const BASE_V1 = 'https://api.warframe.market/v1';
const MIN_GAP_MS = 400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastCall = 0;
let chain: Promise<unknown> = Promise.resolve();

function schedule<T>(fn: () => Promise<T>): Promise<T> {
  const p = chain.then(async () => {
    const wait = lastCall + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    return fn();
  });
  chain = p.catch(() => {});
  return p;
}

/** API v2 (itens, anúncios): resposta vem em `data`. */
async function get<T>(pathname: string): Promise<T> {
  return ((await fetchJson(BASE + pathname)) as { data: T }).data;
}

/** API v1 — só ela tem o histórico de negócios fechados; resposta vem em `payload`. */
async function getV1<T>(pathname: string): Promise<T> {
  return ((await fetchJson(BASE_V1 + pathname)) as { payload: T }).payload;
}

async function fetchJson(url: string): Promise<unknown> {
  const pathname = url.replace(/^https:\/\/[^/]+/, '');
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await schedule(() =>
      fetch(url, {
        headers: {
          Language: 'en',
          Platform: 'pc',
          Accept: 'application/json',
          'User-Agent': 'warframe-relic-advisor/1.0',
        },
      }),
    );
    if (res.status === 429 || res.status >= 500) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (res.status === 404) throw new Error(`WFM 404 ${pathname}`);
    if (!res.ok) throw new Error(`WFM ${res.status} ${pathname}`);
    console.log(`[wfm] ${pathname}`);
    return res.json();
  }
  throw new Error(`WFM falhou após retries: ${pathname}`);
}

export interface WfmItem {
  slug: string;
  name: string;
  ducats: number;
  vaulted: boolean;
  tags: string[];
}

export function getItems(force = false): Promise<WfmItem[]> {
  return cached(
    'wfm-items',
    24 * HOUR,
    async () => {
      const raw = await get<any[]>('/items');
      return raw.map((x) => ({
        slug: x.slug,
        name: x.i18n?.en?.name ?? x.slug,
        ducats: x.ducats ?? 0,
        vaulted: !!x.vaulted,
        tags: x.tags ?? [],
      }));
    },
    force,
  );
}

interface SlimOrder {
  type: 'sell' | 'buy';
  platinum: number;
  subtype?: string;
}

function isOnline(o: any) {
  return o.user?.status === 'ingame' || o.user?.status === 'online';
}

function slim(o: any): SlimOrder {
  return { type: o.type, platinum: o.platinum, subtype: o.subtype };
}

export function summarize(orders: SlimOrder[], updatedAt = Date.now()): PriceSummary {
  const sells = orders
    .filter((o) => o.type === 'sell')
    .map((o) => o.platinum)
    .sort((a, b) => a - b);
  const buys = orders
    .filter((o) => o.type === 'buy')
    .map((o) => o.platinum)
    .sort((a, b) => b - a);
  // Mediana dos 3 menores: ignora anúncio troll/outlier (ex.: 8, 10, 50 → 10).
  const low = sells.slice(0, 3);
  const median = low.length === 2 ? (low[0] + low[1]) / 2 : low[Math.floor(low.length / 2)];
  return {
    sell: low.length ? Math.round(median * 10) / 10 : null,
    buy: buys.length ? buys[0] : null,
    lowest: sells.length ? sells[0] : null,
    ideal: null,
    soldPerDay: null,
    orders: sells.length + buys.length,
    updatedAt,
  };
}

/** Histórico de negócios fechados (48h por hora, 90 dias por dia). Muda de hora em hora. */
function getItemStats(slug: string, force = false) {
  const slimStats = (xs: any[] | undefined): StatPoint[] =>
    (xs ?? []).map((p) => ({ datetime: p.datetime, volume: p.volume ?? 0, median: p.median ?? p.avg_price ?? 0 }));
  return cached(
    `stats-${slug}`,
    HOUR,
    async () => {
      const d = await getV1<{ statistics_closed: Record<string, any[]> }>(`/items/${slug}/statistics`);
      return { h48: slimStats(d.statistics_closed['48hours']), d90: slimStats(d.statistics_closed['90days']) };
    },
    force,
  );
}

/**
 * Preço de uma peça: anúncios atuais (endpoint /top, 5 melhores sell/buy de quem está online)
 * + histórico de vendas → preço ideal de venda.
 */
export async function getItemPrice(slug: string, force = false): Promise<PriceSummary> {
  const { at, value: orders } = await cachedEntry(
    `price-${slug}`,
    PRICE_TTL,
    async () => {
      const d = await get<{ sell: any[]; buy: any[] }>(`/orders/item/${slug}/top`);
      return [...d.sell, ...d.buy].filter(isOnline).map(slim);
    },
    force,
  );
  const summary = summarize(orders, at);
  let hist: ReturnType<typeof historicalMedian> = null;
  try {
    const stats = await getItemStats(slug, force);
    hist = historicalMedian(stats.h48, stats.d90);
  } catch (e) {
    console.warn(`[stats] ${slug}: ${(e as Error).message}`);
  }
  return {
    ...summary,
    ideal: idealPrice({
      hist: hist?.median ?? null,
      cheapestSell: summary.lowest,
      currentSell: summary.sell,
      highestBuy: summary.buy,
    }),
    soldPerDay: hist ? Math.round(hist.soldPerDay * 10) / 10 : 0,
  };
}

/** Preço de uma relíquia por refinamento: precisa da lista completa pra separar subtypes. */
export async function getRelicPrices(slug: string, force = false): Promise<Partial<Record<Refinement, PriceSummary>>> {
  const { at, value: orders } = await cachedEntry(
    `relic-${slug}`,
    PRICE_TTL,
    async () => {
      const d = await get<any[]>(`/orders/item/${slug}`);
      return d.filter(isOnline).map(slim);
    },
    force,
  );
  const out: Partial<Record<Refinement, PriceSummary>> = {};
  for (const r of ['intact', 'exceptional', 'flawless', 'radiant'] as Refinement[]) {
    const s = summarize(
      orders.filter((o) => (o.subtype ?? 'intact') === r),
      at,
    );
    if (s.orders > 0) out[r] = s;
  }
  return out;
}
