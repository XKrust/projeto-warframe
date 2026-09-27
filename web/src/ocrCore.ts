// Núcleo do OCR: independente de navegador. Recebe um "ambiente" que sabe criar canvas e rodar o
// Tesseract — no browser é o DOM + tesseract.js; nos testes é @napi-rs/canvas + tesseract.js em Node.
import {
  aggregate,
  analyzeLayout,
  gridSpacing,
  inferGrid,
  nameRegionInTile,
  parseNameLine,
  parseOcrLayout,
  parseOcrText,
  readCount,
  type Box,
  type OcrWord,
  type ParsedRelic,
} from './ocrParse';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CanvasLike {
  width: number;
  height: number;
  getContext(type: '2d', opts?: any): any;
}

export interface OcrEnv {
  createCanvas(width: number, height: number): CanvasLike;
  recognize(
    canvas: CanvasLike,
    params: { psm: string; whitelist: string; blocks?: boolean },
  ): Promise<{ text: string; blocks?: any[] | null }>;
}

export interface OcrResult {
  relics: ParsedRelic[];
  text: string;
}

// Modos de segmentação do Tesseract
const PSM_AUTO = '3';
const PSM_SINGLE_LINE = '7';
const PSM_SPARSE = '11';
const NAME_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';

/** Limiar de Otsu: separa texto do fundo automaticamente, seja qual for a cor do tema do jogo. */
function otsu(gray: Uint8ClampedArray): number {
  const hist = new Array<number>(256).fill(0);
  for (const g of gray) hist[g]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/** Imagem em tons de cinza: canal mais forte de cada pixel (o texto do jogo é colorido conforme o tema). */
interface Gray {
  data: Float32Array;
  width: number;
  height: number;
}

function toGray(env: OcrEnv, image: any): Gray {
  const canvas = env.createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0); // 1:1, sem reamostragem
  const px = ctx.getImageData(0, 0, image.width, image.height).data;
  const data = new Float32Array(image.width * image.height);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) data[j] = Math.max(px[i], px[i + 1], px[i + 2]);
  return { data, width: image.width, height: image.height };
}

/**
 * Recorta `box` e amplia `zoom` vezes com interpolação bilinear feita aqui mesmo — não pelo canvas —
 * pra dar exatamente o mesmo resultado no navegador e nos testes em Node (cada canvas amplia de um
 * jeito, e nessa fonte fina isso muda a leitura: "V9" vira "V3").
 */
function resample(src: Gray, box: Box, zoom: number): Gray {
  const width = Math.max(1, Math.round((box.x1 - box.x0) * zoom));
  const height = Math.max(1, Math.round((box.y1 - box.y0) * zoom));
  const data = new Float32Array(width * height);
  const maxX = src.width - 1;
  const maxY = src.height - 1;
  for (let y = 0; y < height; y++) {
    const sy = Math.min(Math.max(box.y0 + (y + 0.5) / zoom - 0.5, 0), maxY);
    const y0 = Math.floor(sy);
    const y1 = Math.min(y0 + 1, maxY);
    const fy = sy - y0;
    for (let x = 0; x < width; x++) {
      const sx = Math.min(Math.max(box.x0 + (x + 0.5) / zoom - 0.5, 0), maxX);
      const x0 = Math.floor(sx);
      const x1 = Math.min(x0 + 1, maxX);
      const fx = sx - x0;
      const top = src.data[y0 * src.width + x0] * (1 - fx) + src.data[y0 * src.width + x1] * fx;
      const bottom = src.data[y1 * src.width + x0] * (1 - fx) + src.data[y1 * src.width + x1] * fx;
      data[y * width + x] = top * (1 - fy) + bottom * fy;
    }
  }
  return { data, width, height };
}

/** Preto e branco pelo limiar de Otsu: texto (claro) vira preto. */
function binarize(g: Gray): Uint8ClampedArray {
  const rounded = Uint8ClampedArray.from(g.data);
  const t = otsu(rounded);
  return rounded.map((v) => (v > t ? 0 : 255));
}

/** Contraste esticado e invertido (texto escuro em fundo claro); gamma < 1 engrossa traços finos. */
function stretchGray(g: Gray, gamma = 1): Uint8ClampedArray {
  let lo = 255;
  let hi = 0;
  for (const v of g.data) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const range = Math.max(1, hi - lo);
  const out = new Uint8ClampedArray(g.data.length);
  for (let i = 0; i < out.length; i++) out[i] = 255 - Math.round(Math.pow((g.data[i] - lo) / range, gamma) * 255);
  return out;
}

function toCanvas(env: OcrEnv, values: Uint8ClampedArray, width: number, height: number): CanvasLike {
  const canvas = env.createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(width, height);
  for (let i = 0, j = 0; j < values.length; i += 4, j++) {
    img.data[i] = img.data[i + 1] = img.data[i + 2] = values[j];
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function wordLines(blocks: any[] | null | undefined): OcrWord[][] {
  const lines: OcrWord[][] = [];
  for (const b of blocks ?? [])
    for (const p of b.paragraphs ?? [])
      for (const l of p.lines ?? []) {
        const words = (l.words ?? [])
          .filter((w: any) => w.text?.trim())
          .map((w: any) => ({ text: w.text.trim(), bbox: w.bbox }));
        if (words.length) lines.push(words);
      }
  return lines;
}

/**
 * Lê as relíquias de um print do inventário.
 * Etapa 1: leitura geral acha os "xN" (texto branco em caixa escura — sai bem).
 * Etapa 2: os tiles formam uma grade; pra cada tile relê o "xN" que faltou e o nome em recortes
 * ampliados do print original (3 leituras + votação), posicionados em proporção ao tamanho da grade.
 */
export async function readRelicsCore(
  image: { width: number; height: number },
  known: string[],
  env: OcrEnv,
  onProgress: (p: number) => void = () => {},
): Promise<OcrResult> {
  const scale = image.width < 2200 ? 2 : 1;
  const gray = toGray(env, image);
  const full = resample(gray, { x0: 0, y0: 0, x1: image.width, y1: image.height }, scale);
  const bin = toCanvas(env, binarize(full), full.width, full.height);
  const texts: string[] = [];

  const first = await env.recognize(bin, { psm: PSM_SPARSE, whitelist: '', blocks: true });
  texts.push(first.text);
  onProgress(0.3);
  const lines = wordLines(first.blocks);
  const layout = analyzeLayout(lines, known);

  // Sem nenhum "xN" (print de outra tela): cai na leitura só por texto.
  if (!layout.counts.length) {
    const second = await env.recognize(bin, { psm: PSM_AUTO, whitelist: '', blocks: true });
    texts.push(second.text);
    const found = [
      ...parseOcrLayout(lines, known),
      ...parseOcrText(first.text, known),
      ...parseOcrLayout(wordLines(second.blocks), known),
      ...parseOcrText(second.text, known),
    ];
    return { relics: aggregate(found), text: texts.join('\n-----\n') };
  }

  const spacing = gridSpacing(layout.counts)!;
  const cells = inferGrid(layout.counts);
  const found: ParsedRelic[] = [];
  const readRegions: Box[] = [];
  const log: string[] = [];

  // Recortes saem do print ORIGINAL (reamostrar a versão já ampliada borra o texto e troca 9 por 3).
  // As caixas da etapa 1 estão na escala ampliada, então divide por `scale`.
  const cropOriginal = (r: Box, zoom: number, treat: (g: Gray) => Uint8ClampedArray) => {
    const g = resample(gray, { x0: r.x0 / scale, y0: r.y0 / scale, x1: r.x1 / scale, y1: r.y1 / scale }, zoom);
    return toCanvas(env, treat(g), g.width, g.height);
  };

  const readCrop = async (r: Box, whitelist: string, accept: (text: string) => boolean) => {
    let text = '';
    for (const treat of [(g: Gray) => stretchGray(g), binarize]) {
      text = (await env.recognize(cropOriginal(r, 3, treat), { psm: PSM_SINGLE_LINE, whitelist })).text.trim();
      if (accept(text)) break;
    }
    return text;
  };

  // Nome: várias leituras com tratamentos diferentes e o recorte deslocado ±1-2px, e vota.
  // Motivo: nessa fonte fina, 1 pixel de diferença troca "V9" por "VO" — nenhuma leitura isolada é
  // confiável, mas a maioria acerta. Para cedo quando um nome já tem 3 votos.
  // Combinação escolhida testando nos prints reais (tests/fixtures).
  const shift = (r: Box, dy: number): Box => ({ ...r, y0: r.y0 + dy * scale, y1: r.y1 + dy * scale });
  // [deslocamento vertical px, zoom, tratamento] — todas acertaram 40/40 tiles reais sozinhas.
  const NAME_READS: [number, number, (g: Gray) => Uint8ClampedArray][] = [
    [0, 3, (g) => stretchGray(g)],
    [0, 4, (g) => stretchGray(g, 0.8)],
    [0, 2, (g) => stretchGray(g, 0.6)],
    [0.5, 5, (g) => stretchGray(g)],
    [-0.5, 3, (g) => stretchGray(g, 0.8)],
  ];
  const readName = async (r: Box) => {
    const reads: { text: string; hit: ReturnType<typeof parseNameLine> }[] = [];
    const votes = new Map<string, number>();
    for (const [dy, zoom, treat] of NAME_READS) {
      const crop = cropOriginal(shift(r, dy), zoom, treat);
      const text = (await env.recognize(crop, { psm: PSM_SINGLE_LINE, whitelist: NAME_CHARS })).text.trim();
      const hit = parseNameLine(text, known);
      reads.push({ text, hit });
      if (hit) votes.set(hit.relic, (votes.get(hit.relic) ?? 0) + 1);
      if (Math.max(0, ...votes.values()) >= 3) break;
    }
    const winner = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]; // empate: vale a ordem de leitura
    if (!winner) return { hit: null, rawName: reads.map((x) => x.text).join(' / ') };
    const best = reads.find((x) => x.hit?.relic === winner[0])!;
    const unanimous = votes.size === 1 && winner[1] >= 3; // qualquer discordância → conferir
    return {
      hit: { ...best.hit!, uncertain: best.hit!.uncertain || !unanimous },
      rawName: reads.map((x) => x.text).join(' / '),
    };
  };

  for (let i = 0; i < cells.length; i++) {
    onProgress(0.3 + (0.7 * i) / cells.length);
    const cell = cells[i];
    const b = cell.box;
    let count = cell.count;
    if (count == null) {
      const w = b.x1 - b.x0;
      const h = b.y1 - b.y0;
      const raw = await readCrop(
        { x0: Math.max(0, b.x0 - w * 0.3), y0: Math.max(0, b.y0 - h * 0.4), x1: b.x1 + w * 0.8, y1: b.y1 + h * 0.4 },
        'xX0123456789',
        (t) => readCount(t.replace(/\s/g, '')) != null,
      );
      count = readCount(raw.replace(/\s/g, ''));
    }

    const region = nameRegionInTile(b, spacing);
    const { hit, rawName } = await readName(region);
    log.push(`${count != null ? 'x' + count : 'x?'} → ${rawName || '(vazio)'}`);

    if (hit) {
      readRegions.push(region);
      found.push({
        ...hit,
        qty: count ?? 1,
        qtyRead: count != null,
        raw: `${rawName}${count != null ? ` · x${count}` : ''}`,
        uncertain: hit.uncertain || undefined,
      });
    } else if (cell.count != null) {
      // Recorte falhou, mas a etapa 1 já tinha ligado um nome a esse "xN"
      const ci = layout.counts.findIndex((c) => c.box === b);
      const ni = ci >= 0 ? layout.nameOf[ci] : -1;
      if (ni >= 0) {
        const nm = layout.names[ni];
        readRegions.push(region);
        found.push({ ...nm, qty: cell.count, qtyRead: true, raw: `${nm.raw} · x${cell.count}` });
      }
    }
  }

  // Nomes da etapa 1 fora de qualquer tile relido (ex.: tile cortado na borda do print)
  const inside = (n: Box, r: Box) => {
    const cx = (n.x0 + n.x1) / 2;
    const cy = (n.y0 + n.y1) / 2;
    return cx >= r.x0 && cx <= r.x1 && cy >= r.y0 && cy <= r.y1;
  };
  for (const nm of layout.names) {
    if (!readRegions.some((r) => inside(nm.box, r))) found.push({ ...nm, qty: 1, qtyRead: false });
  }

  onProgress(1);
  texts.push('--- tiles relidos ---\n' + log.join('\n'));
  return { relics: aggregate(found), text: texts.join('\n-----\n') };
}

/** Exposto só pra testes/ajuste das leituras. */
export const imageOps = { toGray, resample, binarize, stretchGray, toCanvas };
