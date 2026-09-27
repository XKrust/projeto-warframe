import { describe, expect, it } from 'vitest';
import { allocateTraces, evBestOf, recommend, upgradeCost, type RewardRow } from '../shared/calc';

// Tabela no formato real de relíquia: 3 comuns, 2 incomuns, 1 rara.
const table: RewardRow[] = [
  { value: 1, chances: { intact: 0.2533, exceptional: 0.2333, flawless: 0.2, radiant: 0.1667 } },
  { value: 1, chances: { intact: 0.2533, exceptional: 0.2333, flawless: 0.2, radiant: 0.1667 } },
  { value: 2, chances: { intact: 0.2533, exceptional: 0.2333, flawless: 0.2, radiant: 0.1667 } },
  { value: 5, chances: { intact: 0.11, exceptional: 0.13, flawless: 0.17, radiant: 0.2 } },
  { value: 5, chances: { intact: 0.11, exceptional: 0.13, flawless: 0.17, radiant: 0.2 } },
  { value: 100, chances: { intact: 0.02, exceptional: 0.04, flawless: 0.06, radiant: 0.1 } },
];

describe('evBestOf', () => {
  it('solo = soma de chance x valor', () => {
    const drops = [
      { value: 10, chance: 0.5 },
      { value: 0, chance: 0.5 },
    ];
    expect(evBestOf(drops, 1)).toBeCloseTo(5);
  });

  it('duo pega o melhor de 2: item raro de 2% sai com 1-0.98² ≈ 3.96%', () => {
    const drops = [
      { value: 100, chance: 0.02 },
      { value: 0, chance: 0.98 },
    ];
    expect(evBestOf(drops, 2)).toBeCloseTo(100 * (1 - 0.98 ** 2));
  });

  it('duo nunca é pior que solo', () => {
    const drops = table.map((r) => ({ value: r.value, chance: r.chances.intact }));
    expect(evBestOf(drops, 2)).toBeGreaterThan(evBestOf(drops, 1));
  });
});

describe('recommend', () => {
  it('manda upar pra radiante quando o raro vale muito', () => {
    const r = recommend(table, 'intact', 'solo', 0.05);
    expect(r.action.kind).toBe('upgrade');
    if (r.action.kind === 'upgrade') {
      expect(r.action.to).toBe('radiant');
      expect(r.action.traces).toBe(100);
    }
  });

  it('abre intact se o trace for caro demais', () => {
    expect(recommend(table, 'intact', 'solo', 10).action.kind).toBe('open');
  });

  it('manda vender a relíquia se ela vale bem mais que abrir', () => {
    expect(recommend(table, 'intact', 'solo', 0.05, 50).action.kind).toBe('sell');
  });

  it('não manda vender por diferença pequena', () => {
    const best = recommend(table, 'intact', 'solo', 0.05).bestValue;
    expect(recommend(table, 'intact', 'solo', 0.05, best + 1).action.kind).not.toBe('sell');
  });

  it('custo de upgrade parcial', () => {
    expect(upgradeCost('exceptional', 'radiant')).toBe(75);
    expect(upgradeCost('flawless', 'radiant')).toBe(50);
  });
});

describe('allocateTraces', () => {
  it('escolhe a melhor combinação dentro do orçamento', () => {
    const groups = [
      [
        { id: 'a', to: 'radiant' as const, cost: 100, gain: 10 },
        { id: 'a', to: 'flawless' as const, cost: 50, gain: 7 },
      ],
      [
        { id: 'b', to: 'radiant' as const, cost: 100, gain: 9 },
        { id: 'b', to: 'flawless' as const, cost: 50, gain: 6 },
      ],
    ];
    // Com 100 traces: flawless+flawless (13) > radiant único (10)
    const plan = allocateTraces(groups, 100);
    expect(plan.gain).toBeCloseTo(13);
    expect(plan.spent).toBe(100);
    // Com 200: radiant nos dois
    expect(allocateTraces(groups, 200).gain).toBeCloseTo(19);
    expect(allocateTraces(groups, 10).chosen).toHaveLength(0);
  });
});
