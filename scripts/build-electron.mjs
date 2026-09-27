// Empacota electron/main.ts + o servidor num arquivo só (dist-electron/main.cjs).
// Assim o app instalado não precisa de node_modules.
import { build } from 'esbuild';

await build({
  entryPoints: ['electron/main.ts'],
  outfile: 'dist-electron/main.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  external: ['electron'],
  sourcemap: false,
  minify: false,
  logLevel: 'info',
});
