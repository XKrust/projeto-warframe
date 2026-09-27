import { describe, expect, it } from 'vitest';
import { historicalMedian, idealPrice, type StatPoint } from '../server/pricing';

const NOW = new Date('2026-09-27T12:00:00Z').getTime();
const hour = (h: number, volume: number, median: number): StatPoint => ({
  datetime: new Date(NOW - h * 3600_000).toISOString(),
  volume,
  median,
});
const day = (d: number, volume: number, median: number): StatPoint => ({
  datetime: new Date(NOW - d * 86400_000).toISOString(),
  volume,
  median,
});

describe('historicalMedian', () => {
  it('usa as vendas das últimas 48h, pesando pelo volume', () => {
    // 1 venda a 10, 5 vendas a 15, 1 venda a 30 → mediana ponderada = 15
    const h = historicalMedian([hour(30, 1, 10), hour(10, 5, 15), hour(2, 1, 30)], [], NOW);
    expect(h).toEqual({ median: 15, soldPerDay: 3.5 });
  });

  it('sem vendas em 48h, usa os últimos 7 dias', () => {
    const d90 = [day(40, 50, 99), day(6, 2, 20), day(3, 5, 22)];
    const h = historicalMedian([], d90, NOW);
    expect(h).toEqual({ median: 22, soldPerDay: 1 });
  });

  it('sem vendas recentes nenhuma → null', () => {
    expect(historicalMedian([hour(5, 0, 10)], [day(30, 4, 20)], NOW)).toBeNull();
  });
});

describe('idealPrice', () => {
  it('base = o que realmente vendeu', () => {
    expect(idealPrice({ hist: 15, cheapestSell: 18, currentSell: 19 })).toBe(15);
  });

  it('acompanha quem anuncia mais barato hoje', () => {
    expect(idealPrice({ hist: 20, cheapestSell: 16, currentSell: 18 })).toBe(16);
  });

  it('ignora quem está torrando (mais de 30% abaixo)', () => {
    expect(idealPrice({ hist: 20, cheapestSell: 12, currentSell: 18 })).toBe(20);
  });

  it('sem histórico, usa o preço atual dos anúncios', () => {
    expect(idealPrice({ hist: null, cheapestSell: 8, currentSell: 9.5 })).toBe(10);
  });

  it('nunca abaixo de quem já está pagando mais (maior oferta de compra)', () => {
    expect(idealPrice({ hist: 34, cheapestSell: 36, currentSell: 38, highestBuy: 35 })).toBe(35);
  });

  it('sem dado nenhum → null', () => {
    expect(idealPrice({ hist: null, cheapestSell: null, currentSell: null })).toBeNull();
  });

  it('arredonda e nunca fica abaixo de 1', () => {
    expect(idealPrice({ hist: 14.6, cheapestSell: null, currentSell: null })).toBe(15);
    expect(idealPrice({ hist: 0.4, cheapestSell: null, currentSell: null })).toBe(1);
  });
});
