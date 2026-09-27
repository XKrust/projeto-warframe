// Servidor pela linha de comando (npm run dev / npm start). O app instalado usa electron/main.ts.
import path from 'node:path';
import { startServer } from './app.ts';

// API_PORT (não PORT): ferramentas de preview costumam setar PORT pro Vite.
const port = Number(process.env.API_PORT ?? 3001);

startServer({ port, staticDir: path.resolve('dist') }).then((p) => console.log(`[server] http://127.0.0.1:${p}`));
