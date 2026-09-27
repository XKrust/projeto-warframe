import { describe, expect, it } from 'vitest';
import {
  analyzeLayout,
  inferGrid,
  gridSpacing,
  nameRegionInTile,
  parseNameLine,
  parseOcrLayout,
  parseOcrText,
  readCount,
} from '../web/src/ocrParse';

const known = ['Lith A1', 'Lith B2', 'Meso N12', 'Neo S5', 'Axi A1', 'Axi S5', 'Requiem I'];

describe('parseOcrText', () => {
  it('lê nomes limpos', () => {
    const r = parseOcrText('AXI A1 RELIC x3', known);
    expect(r).toEqual([{ relic: 'Axi A1', refinement: null, qty: 3, qtyRead: true, raw: 'AXI A1 RELIC X3' }]);
  });

  it('corrige erros comuns do OCR', () => {
    const r = parseOcrText('L1TH Al RELIC X2\nAx1 S5 Radiant\nMES0 N 12 RELIC', known);
    expect(r.map((p) => [p.relic, p.refinement, p.qty])).toEqual([
      ['Lith A1', null, 2],
      ['Axi S5', 'radiant', 1],
      ['Meso N12', null, 1],
    ]);
  });

  it('pega refinamento na linha de baixo e não soma leitura repetida', () => {
    const r = parseOcrText('NEO S5 RELIC\n[RADIANT]\nNEO S5 RELIC X4\nRADlANT', known);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ relic: 'Neo S5', refinement: 'radiant', qty: 4, qtyRead: true });
  });

  it('número solto (de outro tile) não vira quantidade', () => {
    const r = parseOcrText('NEO S5 RELIC 6', known);
    expect(r[0]).toMatchObject({ qty: 1, qtyRead: false });
  });

  it('duas relíquias na mesma linha', () => {
    const r = parseOcrText('LITH B2 RELIC   AXI A1 RELIC', known);
    expect(r.map((p) => p.relic)).toEqual(['Lith B2', 'Axi A1']);
  });

  it('ignora lixo e relíquias inexistentes', () => {
    expect(parseOcrText('INVENTORY  MODS  ARCANES\nLITH Z9 RELIC', known)).toEqual([]);
  });
});

describe('correção aproximada', () => {
  it('"S35" vira S5 (caractere extra) e marca como incerto quando há outra opção', () => {
    const r = parseOcrText('AXI S35 RELIC', [...known, 'Axi S3']);
    expect(r[0]).toMatchObject({ relic: 'Axi S5', uncertain: true });
  });
});

// Geometria tirada de um print real do inventário (tiles 216px de largura, 203px de altura).
const word = (text: string, x0: number, y0: number, x1: number, y1: number) => ({ text, bbox: { x0, y0, x1, y1 } });
const realKnown = [
  'Neo P6',
  'Meso H5',
  'Neo A11',
  'Neo A7',
  'Neo A1',
  'Neo A12',
  'Neo N21',
  'Neo N2',
  'Lith C11',
  'Lith C1',
];

describe('leitura com posição (layout do jogo)', () => {
  it('lê contadores com erros comuns', () => {
    expect(readCount('x20')).toBe(20);
    expect(readCount('X1O')).toBe(10);
    expect(readCount('20')).toBeNull(); // sem "x" pode ser qualquer número
  });

  it('liga cada "xN" ao nome logo abaixo, na mesma coluna', () => {
    const lines = [
      [word('x20', 30, 23, 65, 40), word('x18', 246, 23, 282, 40)],
      [word('Neo', 50, 153, 85, 174), word('P6', 90, 153, 110, 174), word('Relic', 115, 153, 161, 174)],
      [word('Meso', 258, 153, 300, 174), word('H5', 305, 153, 330, 174), word('Relic', 335, 153, 384, 174)],
      // linha de baixo: o contador x13 fica mais perto do nome de cima, mas é de outro tile
      [word('x13', 30, 226, 65, 242)],
      [word('Neo', 50, 356, 85, 377), word('A12', 90, 356, 120, 377)],
    ];
    const r = parseOcrLayout(lines, realKnown);
    expect(r.map((p) => `${p.relic} x${p.qty}`)).toEqual(['Neo P6 x20', 'Meso H5 x18', 'Neo A12 x13']);
  });

  it('deduz na grade o "xN" que o OCR não pegou', () => {
    const counts = [
      { n: 20, box: { x0: 30, y0: 23, x1: 65, y1: 40 } },
      { n: 18, box: { x0: 246, y0: 23, x1: 282, y1: 40 } },
      { n: 13, box: { x0: 30, y0: 226, x1: 65, y1: 242 } },
    ];
    const cells = inferGrid(counts);
    expect(cells).toHaveLength(4);
    expect(cells.filter((c) => c.count == null)).toHaveLength(1);
    expect(cells[3].box.x0).toBe(246);
    expect(cells[3].box.y0).toBe(226);
  });

  it('posiciona a faixa do nome pela grade (cobre "Neo P6 Relic" inteiro)', () => {
    const counts = [
      { n: 20, box: { x0: 30, y0: 23, x1: 65, y1: 40 } },
      { n: 18, box: { x0: 246, y0: 23, x1: 282, y1: 40 } },
      { n: 13, box: { x0: 30, y0: 226, x1: 65, y1: 242 } },
    ];
    const sp = gridSpacing(counts)!;
    expect(sp.col).toBe(216);
    expect(sp.row).toBe(203);
    // nome real do 1º tile: x 48..162, y 157..177
    const r = nameRegionInTile(counts[0].box, sp);
    expect(r.x0).toBeLessThan(48);
    expect(r.x1).toBeGreaterThan(162);
    expect(r.y0).toBeLessThan(157);
    expect(r.y1).toBeGreaterThan(177);
    expect(r.x1).toBeLessThan(246); // não invade o tile do lado
  });

  it('"11" grudado lido como "T" vira A11, marcado pra conferir', () => {
    expect(parseNameLine('Neo AT Relic', realKnown)).toMatchObject({ relic: 'Neo A11', uncertain: true });
  });

  it('"1" fino lido como "7" (N27 → N21, C17 → C11)', () => {
    expect(parseNameLine('Neo N27 Relic', realKnown)?.relic).toBe('Neo N21');
    expect(parseNameLine('Lith C17 Relic', realKnown)?.relic).toBe('Lith C11');
  });
});

describe('letra no lugar de número', () => {
  it('"O" e "J" podem ser 9 (VO → V9, BJ → B9)', () => {
    const k = ['Meso V9', 'Meso V8', 'Meso B9', 'Meso B1'];
    expect(parseNameLine('Meso VO Relic', k)?.relic).toBe('Meso V9');
    expect(parseNameLine('Meso BJ Relic', k)?.relic).toBe('Meso B9');
  });
});
