// Liga inventário + preços + matemática compartilhada.
import {
  recommend,
  REFINEMENTS,
  upgradeCost,
  evByRefinement,
  type Mode,
  type Recommendation,
  type Refinement,
  type RewardRow,
} from '../../shared/calc';
import type { PriceSummary, PricesResponse, RelicInfo } from '../../shared/types';

export type PriceField = 'sell' | 'buy';

export interface Settings {
  mode: Mode;
  traceValue: number;
  priceField: PriceField;
}

export const DEFAULT_SETTINGS: Settings = { mode: 'solo', traceValue: 0.05, priceField: 'sell' };

export function priceOf(s: PriceSummary | undefined, field: PriceField): number {
  if (!s) return 0;
  // 'sell' = preço ideal pra anunciar (cai pro preço dos anúncios se não houver histórico)
  return (field === 'sell' ? (s.ideal ?? s.sell ?? s.buy) : (s.buy ?? (s.sell != null ? s.sell * 0.7 : null))) ?? 0;
}

export function rewardRows(relic: RelicInfo, prices: PricesResponse, field: PriceField): RewardRow[] {
  return relic.rewards.map((r) => ({
    value: r.slug ? priceOf(prices.items[r.slug], field) : 0,
    chances: r.chances,
  }));
}

export function hasAllPrices(relic: RelicInfo, prices: PricesResponse) {
  return relic.rewards.every((r) => !r.slug || prices.items[r.slug]);
}

export interface Analysis {
  relic: RelicInfo;
  refinement: Refinement;
  qty: number;
  rec: Recommendation;
  relicPrice: number | null;
}

export function analyze(
  relic: RelicInfo,
  refinement: Refinement,
  qty: number,
  prices: PricesResponse,
  settings: Settings,
  considerSelling = true,
): Analysis {
  const rows = rewardRows(relic, prices, settings.priceField);
  const rp = relic.slug ? prices.relics[relic.slug]?.[refinement] : undefined;
  const relicPrice = considerSelling && rp && rp.orders >= 2 ? priceOf(rp, settings.priceField) || null : null;
  const rec = recommend(rows, refinement, settings.mode, settings.traceValue, relicPrice);
  return { relic, refinement, qty, rec, relicPrice };
}

export function traceGroups(relic: RelicInfo, from: Refinement, prices: PricesResponse, settings: Settings) {
  const ev = evByRefinement(rewardRows(relic, prices, settings.priceField), settings.mode);
  return REFINEMENTS.filter((r) => upgradeCost(from, r) > 0).map((to) => ({
    id: `${relic.id}|${from}`,
    to,
    cost: upgradeCost(from, to),
    gain: ev[to] - ev[from],
  }));
}

// Formato dos números segue o idioma escolhido (definido pelo I18nProvider)
let numberLocale = 'pt-BR';
export function setNumberLocale(locale: string) {
  numberLocale = locale;
}

export const fmt = (n: number, d = 1) =>
  n.toLocaleString(numberLocale, { minimumFractionDigits: d, maximumFractionDigits: d });
