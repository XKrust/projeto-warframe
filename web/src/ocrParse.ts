// Transforma o texto "sujo" do OCR em entradas de inventário válidas.
import type { Refinement } from '../../shared/calc';

export interface ParsedRelic {
  relic: string; // "Axi A1"
  refinement: Refinement | null; // null = nada escrito no print → Intact
  qty: number;
  qtyRead: boolean; // false = OCR não achou o "x3" da relíquia, qty=1 é chute
  raw: string;
  uncertain?: boolean; // código corrigido por aproximação com mais de uma opção
}

const TIERS = ['LITH', 'MESO', 'NEO', 'AXI', 'REQUIEM'];
const REFS: [string, Refinement][] = [
  ['INTACT', 'intact'],
  ['EXCEPTIONAL', 'exceptional'],
  ['FLAWLESS', 'flawless'],
  ['RADIANT', 'radiant'],
];

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

// Dígitos que o OCR costuma colocar no lugar de letras e vice-versa.
const TO_LETTER: Record<string, string> = {
  '0': 'O',
  '1': 'I',
  '5': 'S',
  '8': 'B',
  '2': 'Z',
  '6': 'G',
  '4': 'A',
  '|': 'I',
};
const TO_DIGIT: Record<string, string> = {
  O: '0',
  D: '0',
  Q: '0',
  I: '1',
  L: '1',
  '|': '1',
  '!': '1',
  S: '5',
  B: '8',
  Z: '2',
  G: '6',
  T: '7',
};

function asLetters(s: string) {
  return [...s].map((c) => TO_LETTER[c] ?? c).join('');
}

function matchTier(word: string): string | null {
  const w = asLetters(word);
  if (w.length < 3 || w.length > 8) return null;
  let best: string | null = null;
  let bestD = Infinity;
  for (const t of TIERS) {
    const d = levenshtein(w, t);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  const tolerance = best && best.length >= 6 ? 2 : 1;
  return bestD <= tolerance ? best : null;
}

function matchRefinement(text: string): Refinement | null {
  for (const word of text.split(/[^A-Z0-9|]+/)) {
    if (word.length < 5) continue;
    const w = asLetters(word);
    for (const [label, ref] of REFS) {
      if (levenshtein(w, label) <= 2) return ref;
    }
  }
  return null;
}

// Letra lida no lugar de número pode significar mais de um número: na fonte do jogo "11" grudado
// vira "T" (Neo A11 → "AT"). Ordem = palpite mais provável primeiro.
const LETTER_DIGITS: Record<string, string[]> = {
  T: ['11', '7', '1'],
  I: ['1', '11'],
  L: ['1', '11'],
  '|': ['1'],
  '!': ['1'],
  // "9" de laço aberto sai como O/J/G/Q nessa fonte (V9 → "VO", B9 → "BJ")
  O: ['0', '9'],
  D: ['0'],
  Q: ['0', '9'],
  J: ['9'],
  S: ['5'],
  B: ['8'],
  Z: ['2'],
  G: ['6', '9'],
};

/**
 * Converte "A1", "Al", "A 1", "4I", "AT" em códigos de relíquia possíveis (["A1"], ["A11","A7","A1"]).
 * Vazio = não parece código.
 */
function codeVariants(raw: string): string[] {
  const s = raw.replace(/[^A-Z0-9|!]/g, '');
  // até 3 "dígitos": o OCR às vezes insere um a mais ("A172" = A12); a correção aproximada resolve
  if (s.length < 2 || s.length > 4) return [];
  const letter = TO_LETTER[s[0]] ?? s[0];
  if (!/[A-Z]/.test(letter)) return [];
  let digitSets = [''];
  for (const c of s.slice(1)) {
    const opts = /\d/.test(c) ? [c] : LETTER_DIGITS[c];
    if (!opts) return [];
    digitSets = digitSets.flatMap((d) => opts.map((o) => d + o));
  }
  const codes = digitSets.filter((d) => /^\d{1,3}$/.test(d)).map((d) => letter + String(Number(d)));
  return [...new Set(codes)];
}

function isSubsequence(short: string, long: string) {
  let i = 0;
  for (const ch of long) if (ch === short[i]) i++;
  return i === short.length;
}

function titleTier(t: string) {
  return t[0] + t.slice(1).toLowerCase();
}

interface RelicIndex {
  knownSet: Set<string>;
  byTier: Map<string, string[]>;
}

function indexKnown(known: Iterable<string>): RelicIndex {
  const knownSet = new Set(known);
  const byTier = new Map<string, string[]>();
  for (const id of knownSet) {
    const [tier, code] = id.split(' ');
    if (!byTier.has(tier)) byTier.set(tier, []);
    byTier.get(tier)!.push(code);
  }
  return { knownSet, byTier };
}

/**
 * Tenta reconhecer uma relíquia começando em tokens[i] ("NEO" "P6" ou "NEO" "P" "6").
 * `used` = quantos tokens depois do tier o código ocupou.
 */
function matchRelicAt(
  tokens: string[],
  i: number,
  idx: RelicIndex,
): { id: string; used: number; uncertain: boolean } | null {
  const tier = matchTier(tokens[i]);
  if (!tier) return null;

  let variants: string[] = [];
  let used = 0;
  if (tokens[i + 1]) {
    variants = codeVariants(tokens[i + 1]);
    used = 1;
    if (!variants.length && tokens[i + 2]) {
      variants = codeVariants(tokens[i + 1] + tokens[i + 2]);
      used = 2;
    }
  }
  if (!variants.length) return null;

  const tierName = titleTier(tier);
  const existing = variants.filter((c) => idx.knownSet.has(`${tierName} ${c}`));
  let id = `${tierName} ${existing[0] ?? variants[0]}`;
  let uncertain = existing.length > 1;
  if (!existing.length) {
    const read = variants[0];
    const scored = (idx.byTier.get(tierName) ?? [])
      .filter((c) => c[0] === read[0])
      .map((c) => ({ c, d: ocrDistance(c, read), sub: isSubsequence(c, read) }))
      .filter((x) => x.d <= 1)
      // menor custo; empate → prefere quando o OCR só inseriu caractere a mais ("S35" → "S5")
      .sort((a, b) => a.d - b.d || Number(b.sub) - Number(a.sub));
    if (!scored.length) return null;
    uncertain = scored.length > 1 && scored[1].d - scored[0].d < 0.5;
    id = `${tierName} ${scored[0].c}`;
  }
  return { id, used, uncertain };
}

// Pares de dígitos que o OCR confunde com frequência (na fonte do jogo o "1" fino vira "7").
const CONFUSABLE = new Set(['17', '71', '56', '65', '38', '83', '68', '86', '08', '80', '98', '89']);

/** Levenshtein em que trocar dígitos parecidos custa pouco. */
function ocrDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      const sub = a[i - 1] === b[j - 1] ? 0 : CONFUSABLE.has(a[i - 1] + b[j - 1]) ? 0.35 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + sub);
      prev = tmp;
    }
  }
  return dp[b.length];
}

/**
 * Leitura só pelo texto (sem posições). known: ids válidos ("Axi A1").
 * Retorna relíquias agregadas por (relíquia, refinamento).
 */
export function parseOcrText(text: string, known: Iterable<string>): ParsedRelic[] {
  const idx = indexKnown(known);
  const lines = text.toUpperCase().split(/\r?\n/);
  const found: ParsedRelic[] = [];

  lines.forEach((line, li) => {
    const tokens = line.split(/[\s,;:·•\-\[\]()]+/).filter(Boolean);
    for (let i = 0; i < tokens.length; i++) {
      const m = matchRelicAt(tokens, i, idx);
      if (!m) continue;

      // Contexto = tokens até a próxima relíquia na mesma linha.
      const after = tokens.slice(i + 1 + m.used);
      const stop = after.findIndex((t) => matchTier(t));
      const rest = (stop >= 0 ? after.slice(0, stop) : after).join(' ');
      // A linha de baixo só conta se não for outra relíquia (nome quebrado em 2 linhas no tile).
      const below = lines[li + 1] ?? '';
      const next = below.split(/\s+/).some((t) => matchTier(t)) ? '' : below;
      const refinement = matchRefinement(rest) ?? matchRefinement(next);

      // Só confia em quantidade escrita como "x3"/"×3": número solto costuma ser de outro tile.
      const qm = (rest + ' ' + next).match(/(?:^|\s)[X×]\s?(\d{1,3})(?=\s|$)/);
      const qty = qm ? Math.max(1, Number(qm[1])) : 1;

      found.push({
        relic: m.id,
        refinement,
        qty,
        qtyRead: !!qm,
        raw: line.trim(),
        ...(m.uncertain ? { uncertain: true } : {}),
      });
      i += m.used;
    }
  });

  return aggregate(found);
}

// ---------- Leitura com posição (layout do inventário do jogo) ----------

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  bbox: Box;
}

/** Contador do tile: "x20", "X15", "×3" (OCR às vezes troca 0→O, 1→l). */
export function readCount(text: string): number | null {
  const m = text.toUpperCase().match(/^[X×K]([0-9OQDILS|]{1,3})$/);
  if (!m) return null;
  const n = Number([...m[1]].map((c) => TO_DIGIT[c] ?? c).join(''));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Lê um nome isolado (recorte de um tile): "Neo P6 Relic" → Neo P6. */
export function parseNameLine(
  text: string,
  known: Iterable<string>,
): { relic: string; refinement: Refinement | null; uncertain: boolean } | null {
  const idx = indexKnown(known);
  const tokens = text
    .toUpperCase()
    .split(/[\s,;:·•\-\[\]()'"’“”]+/)
    .filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const m = matchRelicAt(tokens, i, idx);
    if (m) {
      return {
        relic: m.id,
        refinement: matchRefinement(tokens.slice(i + 1 + m.used).join(' ')),
        uncertain: m.uncertain,
      };
    }
  }
  return null;
}

export interface NameHit {
  relic: string;
  refinement: Refinement | null;
  uncertain: boolean;
  raw: string;
  box: Box;
}

export interface CountHit {
  n: number;
  box: Box;
}

export interface LayoutAnalysis {
  names: NameHit[];
  counts: CountHit[];
  /** nameOf[i] = índice do nome ligado ao contador i (ou -1) */
  nameOf: number[];
}

const median = (xs: number[]) => [...xs].sort((p, q) => p - q)[Math.floor(xs.length / 2)];

function cluster(values: number[], tol: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const groups: number[][] = [];
  for (const v of sorted) {
    const g = groups[groups.length - 1];
    if (g && v - g[g.length - 1] <= tol) g.push(v);
    else groups.push([v]);
  }
  return groups.map(median);
}

/**
 * Distância entre colunas e entre linhas de tiles (medida entre os "xN").
 * Com uma coluna/linha só, estima pela outra (tiles quase quadrados: 216×203 no jogo).
 */
export function gridSpacing(counts: CountHit[]): { col: number; row: number } | null {
  if (!counts.length) return null;
  const h = median(counts.map((c) => c.box.y1 - c.box.y0));
  const step = (vals: number[]) => {
    const centers = cluster(vals, h * 1.5);
    if (centers.length < 2) return null;
    return median(centers.slice(1).map((v, i) => v - centers[i]));
  };
  const col = step(counts.map((c) => c.box.x0));
  const row = step(counts.map((c) => c.box.y0));
  if (col && row) return { col, row };
  if (col) return { col, row: col / 1.064 };
  if (row) return { col: row * 1.064, row };
  return { col: h * 12.7, row: h * 11.9 }; // um tile só: proporção à altura do "xN"
}

/**
 * Faixa do nome dentro do tile, em proporção ao tamanho da grade (medido em prints reais:
 * nome centralizado ~35% da largura à direita do "xN" e ~71% da altura abaixo dele).
 */
export function nameRegionInTile(count: Box, spacing: { col: number; row: number }): Box {
  const cx = count.x0 + 0.35 * spacing.col;
  const cy = count.y0 + 0.708 * spacing.row;
  const halfW = 0.46 * spacing.col;
  const halfH = 0.085 * spacing.row;
  return { x0: Math.max(0, cx - halfW), x1: cx + halfW, y0: Math.max(0, cy - halfH), y1: cy + halfH };
}

export interface GridCell {
  box: Box; // onde fica (ou deveria ficar) o "xN"
  count: number | null; // já lido na etapa 1?
}

/**
 * Os tiles formam uma grade: com as colunas e linhas dos "xN" que foram lidos, deduz a posição
 * dos que o OCR não pegou (colunas × linhas).
 */
export function inferGrid(counts: CountHit[]): GridCell[] {
  if (!counts.length) return [];
  const w = median(counts.map((c) => c.box.x1 - c.box.x0));
  const h = median(counts.map((c) => c.box.y1 - c.box.y0));
  const cols = cluster(
    counts.map((c) => c.box.x0),
    h * 1.5,
  );
  const rows = cluster(
    counts.map((c) => c.box.y0),
    h * 1.5,
  );
  const cells: GridCell[] = [];
  for (const y of rows) {
    for (const x of cols) {
      const hit = counts.find((c) => Math.abs(c.box.x0 - x) <= h * 1.5 && Math.abs(c.box.y0 - y) <= h * 1.5);
      cells.push(hit ? { box: hit.box, count: hit.n } : { box: { x0: x, y0: y, x1: x + w, y1: y + h }, count: null });
    }
  }
  return cells;
}

/**
 * Inventário de relíquias do Warframe: cada tile tem "xN" no canto de cima à esquerda e o nome
 * ("Neo P6 Relic") centralizado embaixo. Liga cada nome ao contador logo acima dele, na mesma coluna.
 * `lines` = palavras agrupadas por linha, como o Tesseract devolve.
 */
export function parseOcrLayout(lines: OcrWord[][], known: Iterable<string>): ParsedRelic[] {
  const { names, counts, nameOf } = analyzeLayout(lines, known);
  const qtyOf = new Map<number, number>();
  nameOf.forEach((ni, ci) => ni >= 0 && qtyOf.set(ni, counts[ci].n));
  return aggregate(
    names.map((nm, ni) => ({
      relic: nm.relic,
      refinement: nm.refinement,
      qty: qtyOf.get(ni) ?? 1,
      qtyRead: qtyOf.has(ni),
      raw: nm.raw + (qtyOf.has(ni) ? ` · x${qtyOf.get(ni)}` : ''),
      ...(nm.uncertain ? { uncertain: true } : {}),
    })),
  );
}

export function analyzeLayout(lines: OcrWord[][], known: Iterable<string>): LayoutAnalysis {
  const idx = indexKnown(known);
  const names: NameHit[] = [];
  const counts: (CountHit & { used: boolean })[] = [];

  for (const words of lines) {
    const tokens = words.map((w) => w.text.toUpperCase().replace(/[,;:·•\[\]()]/g, ''));
    const consumed = new Set<number>();
    for (let i = 0; i < tokens.length; i++) {
      const m = matchRelicAt(tokens, i, idx);
      if (!m) continue;
      const span = words.slice(i, i + 1 + m.used);
      for (let k = i; k <= i + m.used; k++) consumed.add(k);
      // Inclui o "Relic" na caixa: sem ele o centro do nome sai deslocado pra esquerda.
      const after = tokens[i + 1 + m.used];
      if (after && levenshtein(after.replace(/[^A-Z]/g, ''), 'RELIC') <= 2) span.push(words[i + 1 + m.used]);
      // "Relic" e um possível "[Radiant]" logo depois fazem parte do mesmo nome
      const tail = tokens.slice(i + 1 + m.used, i + 4 + m.used);
      const stop = tail.findIndex((t) => matchTier(t));
      names.push({
        relic: m.id,
        refinement: matchRefinement((stop >= 0 ? tail.slice(0, stop) : tail).join(' ')),
        uncertain: m.uncertain,
        raw: span.map((w) => w.text).join(' '),
        box: {
          x0: Math.min(...span.map((w) => w.bbox.x0)),
          y0: Math.min(...span.map((w) => w.bbox.y0)),
          x1: Math.max(...span.map((w) => w.bbox.x1)),
          y1: Math.max(...span.map((w) => w.bbox.y1)),
        },
      });
      i += m.used;
    }
    words.forEach((w, k) => {
      if (consumed.has(k)) return;
      const n = readCount(w.text);
      if (n != null) counts.push({ n, box: w.bbox, used: false });
    });
  }

  // Pares (nome, contador) possíveis, do mais perto pro mais longe; cada contador vale pra um nome só.
  const pairs: { ni: number; ci: number; d: number }[] = [];
  names.forEach((nm, ni) => {
    const w = nm.box.x1 - nm.box.x0;
    const h = Math.max(nm.box.y1 - nm.box.y0, 8);
    const cx = (nm.box.x0 + nm.box.x1) / 2;
    counts.forEach((c, ci) => {
      const dy = nm.box.y0 - c.box.y1;
      const above = dy > -h * 0.5 && dy < h * 14;
      const sameColumn = c.box.x0 < cx && c.box.x0 > cx - w * 2.2;
      if (above && sameColumn) pairs.push({ ni, ci, d: dy + Math.abs(c.box.x0 - (cx - w)) * 0.2 });
    });
  });
  pairs.sort((a, b) => a.d - b.d);
  const nameOf = counts.map(() => -1);
  const named = new Set<number>();
  for (const p of pairs) {
    if (named.has(p.ni) || counts[p.ci].used) continue;
    counts[p.ci].used = true;
    named.add(p.ni);
    nameOf[p.ci] = p.ni;
  }
  return { names, counts: counts.map(({ n, box }) => ({ n, box })), nameOf };
}

/**
 * No jogo cada relíquia+refinamento aparece num tile só (com a quantidade), então a mesma leitura
 * repetida (OCR lendo 2x, prints sobrepostos) NÃO soma: fica a maior quantidade lida.
 */
export function aggregate(list: ParsedRelic[]): ParsedRelic[] {
  const map = new Map<string, ParsedRelic>();
  for (const p of list) {
    const key = `${p.relic}|${p.refinement ?? '?'}`;
    const cur = map.get(key);
    if (!cur) map.set(key, { ...p });
    else if (p.qtyRead && (!cur.qtyRead || p.qty > cur.qty))
      map.set(key, { ...p, uncertain: cur.uncertain || p.uncertain });
  }
  return [...map.values()];
}
