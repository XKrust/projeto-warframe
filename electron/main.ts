// App de desktop: sobe o servidor local dentro do Electron e abre a janela apontando pra ele.
import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';

// Porta fixa: o idioma e as preferências ficam salvos por endereço (localStorage), então mudar de
// porta a cada abertura faria o app "esquecer" tudo. Se estiver ocupada, usa qualquer uma livre.
const PREFERRED_PORT = 47831;

// Inventário e cache vão pra pasta do usuário (a de instalação é só leitura), numa subpasta
// própria: o Chromium já usa "Cache" ali, e no Windows cache == Cache.
process.env.RELIC_DATA_DIR ??= path.join(app.getPath('userData'), 'relic-data');

let win: BrowserWindow | null = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.whenReady().then(start);
}

async function start() {
  // Importado só agora pra já enxergar RELIC_DATA_DIR
  const { startServer } = await import('../server/app.ts');
  const staticDir = path.join(__dirname, '..', 'dist');
  const port = await startServer({ port: PREFERRED_PORT, staticDir }).catch(() => startServer({ port: 0, staticDir }));

  win = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 760,
    minHeight: 560,
    title: 'Relic Advisor',
    backgroundColor: '#030509',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  // Links (wiki, warframe.market) abrem no navegador, não dentro do app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => (win = null));
  await win.loadURL(`http://127.0.0.1:${port}`);
}

app.on('window-all-closed', () => app.quit());
