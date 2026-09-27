// Preço ideal de venda: baseado no que realmente vendeu (histórico de negócios fechados do
// warframe.market), ajustado pela concorrência de hoje.

export interface StatPoint {
  datetime: string;
  volume: number; // unidades negociadas no período
  median: number;
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Mediana ponderada pelo volume: cada unidade vendida conta um voto. */
function weightedMedian(points: StatPoint[]): number {
  const sorted = [...points].sort((a, b) => a.median - b.median);
  const total = sorted.reduce((s, p) => s + p.volume, 0);
  let cum = 0;
  for (const p of sorted) {
    cum += p.volume;
    if (cum >= total / 2) return p.median;
  }
  return sorted[sorted.length - 1].median;
}

/**
 * Preço pelo qual o item vendeu: últimas 48h; sem vendas nelas, últimos 7 dias.
 * `h48` = pontos por hora, `d90` = pontos por dia (formato da API de estatísticas).
 */
export function historicalMedian(
  h48: StatPoint[],
  d90: StatPoint[],
  now = Date.now(),
): { median: number; soldPerDay: number } | null {
  const recent = h48.filter((p) => p.volume > 0 && now - Date.parse(p.datetime) <= 48 * HOUR);
  if (recent.length) {
    const vol = recent.reduce((s, p) => s + p.volume, 0);
    return { median: weightedMedian(recent), soldPerDay: vol / 2 };
  }
  const week = d90.filter((p) => p.volume > 0 && now - Date.parse(p.datetime) <= 7 * DAY);
  if (week.length) {
    const vol = week.reduce((s, p) => s + p.volume, 0);
    return { median: weightedMedian(week), soldPerDay: vol / 7 };
  }
  return null;
}

/** Anúncio mais de 30% abaixo do que vende normalmente = alguém torrando; não vale acompanhar. */
const DUMP_RATIO = 0.7;

/**
 * hist = mediana do que vendeu; cheapestSell = anúncio online mais barato agora;
 * currentSell = preço atual dos anúncios (usado só quando não há histórico);
 * highestBuy = maior oferta de compra online.
 */
export function idealPrice(p: {
  hist: number | null;
  cheapestSell: number | null;
  currentSell: number | null;
  highestBuy?: number | null;
}) {
  let base = p.hist ?? p.currentSell;
  if (base == null) return null;
  // Se alguém anuncia mais barato hoje, acompanha — senão ninguém compra o seu
  if (p.hist != null && p.cheapestSell != null && p.cheapestSell < base && p.cheapestSell >= base * DUMP_RATIO) {
    base = p.cheapestSell;
  }
  // Tem gente pagando mais que isso agora? Então vale pelo menos isso.
  if (p.highestBuy != null && p.highestBuy > base) base = p.highestBuy;
  return Math.max(1, Math.round(base));
}
