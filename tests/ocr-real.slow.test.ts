// Roda o OCR de verdade (Tesseract) nos prints reais de tests/fixtures. Lento: `npm run test:ocr`.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCanvas, loadImage, type Canvas } from '@napi-rs/canvas';
import { createWorker, type Worker } from 'tesseract.js';
import { readRelicsCore, type OcrEnv } from '../web/src/ocrCore';
import { getRelics } from '../server/relics';

let worker: Worker;
let known: string[];
let env: OcrEnv;

beforeAll(async () => {
  known = (await getRelics()).map((r) => r.id);
  worker = await createWorker('eng', 1, { cachePath: 'node_modules/.cache/tesseract' });
  env = {
    createCanvas: (w, h) => createCanvas(w, h) as never,
    recognize: async (canvas, { psm, whitelist, blocks }) => {
      await worker.setParameters({ tessedit_pageseg_mode: psm as never, tessedit_char_whitelist: whitelist });
      const png = (canvas as unknown as Canvas).toBuffer('image/png');
      const { data } = await worker.recognize(png, {}, { text: true, blocks: !!blocks });
      return { text: data.text, blocks: data.blocks };
    },
  };
}, 120_000);

afterAll(() => worker?.terminate());

// As duas fotos mostram o mesmo inventário (a segunda deslocada e com um tile destacado pelo mouse).
const EXPECTED = [
  'Neo P6 x20',
  'Meso H5 x18',
  'Neo A11 x16',
  'Neo A12 x16',
  'Meso B9 x15',
  'Meso W4 x15',
  'Neo G4 x15',
  'Neo N16 x15',
  'Neo R4 x15',
  'Neo T2 x15',
  'Lith S12 x14',
  'Neo D5 x14',
  'Neo M4 x14',
  'Neo M5 x14',
  'Neo P2 x14',
  'Neo S18 x14',
  'Lith C11 x13',
  'Meso V9 x13',
  'Neo N21 x13',
  'Neo T1 x13',
];

describe.each(['print-real.webp', 'print-real-2.webp'])('OCR em %s', (file) => {
  it('lê as 20 relíquias com nome e quantidade', async () => {
    const img = await loadImage(`tests/fixtures/${file}`);
    const res = await readRelicsCore(img, known, env);
    const got = res.relics.map((p) => `${p.relic} x${p.qty}`);
    const missing = EXPECTED.filter((e) => !got.includes(e));
    const extra = got.filter((g) => !EXPECTED.includes(g));
    if (missing.length || extra.length)
      console.log(file, { missing, extra }, res.text.split('--- tiles relidos ---')[1]);
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    // Leitura limpa: nenhuma votação dividida nesses prints
    expect(res.relics.filter((p) => p.uncertain).map((p) => p.relic)).toEqual([]);
    // Nada escrito sobre refinamento = Intact
    expect(res.relics.every((p) => p.refinement == null)).toBe(true);
  }, 180_000);
});
