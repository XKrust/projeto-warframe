import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getRelics } from './relics.ts';
import { getItemPrice, getRelicPrices } from './wfm.ts';
import type { InventoryEntry, PricesResponse } from '../shared/types.ts';
import { REFINEMENTS } from '../shared/calc.ts';
import { dataPath } from './paths.ts';

export function createApp(staticDir: string) {
  const INVENTORY_FILE = dataPath('data', 'inventario.json');
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/relics', async (req, res, next) => {
    try {
      res.json(await getRelics(req.query.force === '1'));
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/inventory', async (_req, res) => {
    try {
      res.json(JSON.parse(await fs.readFile(INVENTORY_FILE, 'utf8')));
    } catch {
      res.json([]);
    }
  });

  app.put('/api/inventory', async (req, res) => {
    const body = req.body as InventoryEntry[];
    if (!Array.isArray(body)) return res.status(400).json({ error: 'esperava uma lista' });
    const clean = body
      .filter((e) => typeof e.relic === 'string' && REFINEMENTS.includes(e.refinement))
      .map((e) => ({ relic: e.relic, refinement: e.refinement, qty: Math.max(1, Math.floor(Number(e.qty) || 1)) }));
    await fs.mkdir(path.dirname(INVENTORY_FILE), { recursive: true });
    await fs.writeFile(INVENTORY_FILE, JSON.stringify(clean, null, 2));
    res.json(clean);
  });

  // Busca preços em lotes pequenos (o front chama várias vezes pra mostrar progresso).
  app.post('/api/prices', async (req, res) => {
    const {
      items = [],
      relics = [],
      force = false,
    } = req.body as { items?: string[]; relics?: string[]; force?: boolean };
    const out: PricesResponse = { items: {}, relics: {} };
    for (const slug of items.slice(0, 50)) {
      try {
        out.items[slug] = await getItemPrice(slug, force);
      } catch (e) {
        console.warn(`[prices] ${slug}: ${(e as Error).message}`);
        out.items[slug] = {
          sell: null,
          buy: null,
          lowest: null,
          ideal: null,
          soldPerDay: null,
          orders: 0,
          updatedAt: Date.now(),
        };
      }
    }
    for (const slug of relics.slice(0, 50)) {
      try {
        out.relics[slug] = await getRelicPrices(slug, force);
      } catch (e) {
        console.warn(`[prices] ${slug}: ${(e as Error).message}`);
        out.relics[slug] = {};
      }
    }
    res.json(out);
  });

  // Fora do modo de desenvolvimento, serve o front já buildado.
  app.use(express.static(staticDir));

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });

  return app;
}

/** Sobe o servidor e devolve a porta usada (0 = qualquer porta livre). */
export function startServer(opts: { port: number; host?: string; staticDir: string }): Promise<number> {
  const app = createApp(opts.staticDir);
  return new Promise((resolve, reject) => {
    const server = app.listen(opts.port, opts.host ?? '127.0.0.1', () => {
      const addr = server.address();
      resolve(typeof addr === 'object' && addr ? addr.port : opts.port);
    });
    server.on('error', reject);
  });
}
