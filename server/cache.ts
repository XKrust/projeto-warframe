import fs from 'node:fs/promises';
import path from 'node:path';
import { dataPath } from './paths.ts';

const memory = new Map<string, { at: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;

function fileFor(key: string) {
  return path.join(dataPath('cache'), key.replace(/[^a-z0-9_.-]/gi, '_') + '.json');
}

async function readDisk(key: string): Promise<{ at: number; value: unknown } | null> {
  try {
    return JSON.parse(await fs.readFile(fileFor(key), 'utf8'));
  } catch {
    return null;
  }
}

export interface Entry<T> {
  at: number; // quando foi buscado (ms)
  value: T;
}

/** Valor do cache (memória → disco) se ainda válido, junto com quando foi buscado; senão chama `fetcher` e grava. */
export async function cachedEntry<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  force = false,
): Promise<Entry<T>> {
  if (!force) {
    const hit = memory.get(key) ?? (await readDisk(key));
    if (hit && Date.now() - hit.at < ttlMs) {
      memory.set(key, hit);
      return hit as Entry<T>;
    }
  }
  const running = inflight.get(key);
  if (running) return running as Promise<Entry<T>>;

  const p = (async () => {
    const entry = { at: Date.now(), value: await fetcher() };
    memory.set(key, entry);
    await fs.mkdir(dataPath('cache'), { recursive: true });
    await fs.writeFile(fileFor(key), JSON.stringify(entry));
    return entry;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>, force = false): Promise<T> {
  return (await cachedEntry(key, ttlMs, fetcher, force)).value;
}
