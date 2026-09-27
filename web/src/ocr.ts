// OCR no navegador: canvas do DOM + tesseract.js. A lógica fica em ocrCore.ts.
import { createWorker, type Worker } from 'tesseract.js';
import { readRelicsCore, type OcrEnv, type OcrResult } from './ocrCore';

export type { OcrResult };

let workerPromise: Promise<Worker> | null = null;

function getWorker() {
  workerPromise ??= createWorker('eng');
  return workerPromise;
}

async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function readRelicsFromImage(
  file: Blob,
  known: string[],
  onProgress: (p: number) => void,
): Promise<OcrResult> {
  const worker = await getWorker();
  const env: OcrEnv = {
    createCanvas: (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h }),
    recognize: async (canvas, { psm, whitelist, blocks }) => {
      await worker.setParameters({ tessedit_pageseg_mode: psm as never, tessedit_char_whitelist: whitelist });
      const { data } = await worker.recognize(canvas as HTMLCanvasElement, {}, { text: true, blocks: !!blocks });
      return { text: data.text, blocks: data.blocks };
    },
  };
  return readRelicsCore(await loadImage(file), known, env, onProgress);
}
