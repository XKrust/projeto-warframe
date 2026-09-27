// Matemática pura: valor esperado de relíquias, refino e alocação de Void Traces.

export type Refinement = 'intact' | 'exceptional' | 'flawless' | 'radiant';
export type Mode = 'solo' | 'duo';

export const REFINEMENTS: Refinement[] = ['intact', 'exceptional', 'flawless', 'radiant'];

export const REFINEMENT_LABEL: Record<Refinement, string> = {
  intact: 'Intact',
  exceptional: 'Exceptional',
  flawless: 'Flawless',
  radiant: 'Radiant',
};

/** Traces acumulados pra chegar em cada nível a partir de Intact. */
export const TRACE_COST: Record<Refinement, number> = {
  intact: 0,
  exceptional: 25,
  flawless: 50,
  radiant: 100,
};

export const SELL_MARGIN = 1.25;
export const SELL_MIN_DIFF = 2;

export function upgradeCost(from: Refinement, to: Refinement): number {
  return TRACE_COST[to] - TRACE_COST[from];
}

export interface Drop {
  value: number; // plat
  chance: number; // fração 0..1
}

export interface RewardRow {
  value: number;
  chances: Record<Refinement, number>; // frações 0..1
}

/**
 * Valor esperado da melhor recompensa entre `players` sorteios independentes da mesma tabela.
 * players=1 é o EV solo. P(max <= k) = F_k^n, então P(max = k) = F_k^n - F_{k-1}^n.
 */
export function evBestOf(drops: Drop[], players: number): number {
  const sorted = [...drops].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((s, d) => s + d.chance, 0) || 1;
  let cum = 0;
  let prev = 0;
  let ev = 0;
  for (const d of sorted) {
    cum += d.chance / total;
    const p = Math.pow(cum, players);
    ev += (p - prev) * d.value;
    prev = p;
  }
  return ev;
}

export function evFor(drops: Drop[], mode: Mode): number {
  return evBestOf(drops, mode === 'duo' ? 2 : 1);
}

export function dropsAt(rewards: RewardRow[], r: Refinement): Drop[] {
  return rewards.map((rw) => ({ value: rw.value, chance: rw.chances[r] }));
}

export function evByRefinement(rewards: RewardRow[], mode: Mode): Record<Refinement, number> {
  const out = {} as Record<Refinement, number>;
  for (const r of REFINEMENTS) out[r] = evFor(dropsAt(rewards, r), mode);
  return out;
}

export type Action =
  | { kind: 'open'; refinement: Refinement }
  | { kind: 'upgrade'; to: Refinement; gain: number; traces: number; platPerTrace: number }
  | { kind: 'sell'; price: number; refinement: Refinement };

export interface Recommendation {
  ev: Record<Refinement, number>;
  action: Action;
  /** Valor final da melhor opção (plat), já descontando traces pelo valor informado. */
  bestValue: number;
}

/**
 * Decide o que fazer com UMA cópia da relíquia no refinamento atual.
 * traceValue = quanto 1 trace vale pro jogador em plat (custo de oportunidade).
 * relicSellPrice = preço de venda da relíquia inteira no refinamento atual (null se sem dados).
 */
export function recommend(
  rewards: RewardRow[],
  current: Refinement,
  mode: Mode,
  traceValue: number,
  relicSellPrice: number | null = null,
): Recommendation {
  const ev = evByRefinement(rewards, mode);
  let bestR: Refinement = current;
  let bestNet = ev[current];
  for (const r of REFINEMENTS) {
    const cost = upgradeCost(current, r);
    if (cost <= 0) continue;
    const net = ev[r] - cost * traceValue;
    if (net > bestNet + 1e-9) {
      bestNet = net;
      bestR = r;
    }
  }

  let action: Action;
  if (bestR === current) {
    action = { kind: 'open', refinement: current };
  } else {
    const traces = upgradeCost(current, bestR);
    const gain = ev[bestR] - ev[current];
    action = { kind: 'upgrade', to: bestR, gain, traces, platPerTrace: gain / traces };
  }

  // Vender a relíquia dá trabalho (achar comprador, trocar): só vale com folga clara.
  if (relicSellPrice != null && relicSellPrice >= bestNet * SELL_MARGIN && relicSellPrice - bestNet >= SELL_MIN_DIFF) {
    return { ev, action: { kind: 'sell', price: relicSellPrice, refinement: current }, bestValue: relicSellPrice };
  }
  return { ev, action, bestValue: bestNet };
}

export interface TraceOption {
  id: string; // identifica o grupo (uma cópia de relíquia)
  to: Refinement;
  cost: number;
  gain: number;
}

export interface TracePlan {
  chosen: TraceOption[];
  spent: number;
  gain: number;
}

/**
 * Mochila de múltipla escolha: cada cópia de relíquia pode receber no máximo um upgrade.
 * Custos são múltiplos de 25, então o DP roda em unidades de 25 traces.
 */
export function allocateTraces(groups: TraceOption[][], budget: number): TracePlan {
  const UNIT = 25;
  const valid = groups.map((g) => g.filter((o) => o.gain > 0 && o.cost > 0)).filter((g) => g.length > 0);
  const maxUseful = valid.reduce((s, g) => s + Math.max(...g.map((o) => o.cost)), 0);
  const cap = Math.floor(Math.min(Math.max(budget, 0), maxUseful) / UNIT);

  // dp[b] = melhor ganho usando até b unidades; choice[i][b] = índice da opção do grupo i (-1 = nada)
  let dp = new Array<number>(cap + 1).fill(0);
  const choice: Int16Array[] = [];
  for (const g of valid) {
    const next = dp.slice();
    const pick = new Int16Array(cap + 1).fill(-1);
    g.forEach((o, oi) => {
      const c = Math.round(o.cost / UNIT);
      for (let b = cap; b >= c; b--) {
        const v = dp[b - c] + o.gain;
        if (v > next[b] + 1e-9) {
          next[b] = v;
          pick[b] = oi;
        }
      }
    });
    choice.push(pick);
    dp = next;
  }

  const chosen: TraceOption[] = [];
  let b = cap;
  for (let i = valid.length - 1; i >= 0; i--) {
    const oi = choice[i][b];
    if (oi >= 0) {
      const o = valid[i][oi];
      chosen.push(o);
      b -= Math.round(o.cost / UNIT);
    }
  }
  chosen.reverse();
  return {
    chosen,
    spent: chosen.reduce((s, o) => s + o.cost, 0),
    gain: chosen.reduce((s, o) => s + o.gain, 0),
  };
}
