import path from 'node:path';

/**
 * Onde ficam inventário e cache. No app instalado, o Electron aponta RELIC_DATA_DIR pra pasta do
 * usuário (a pasta do programa é só leitura); em desenvolvimento, fica na pasta do projeto.
 */
export function dataPath(...parts: string[]) {
  const base = process.env.RELIC_DATA_DIR;
  return base ? path.join(base, ...parts) : path.resolve(...parts);
}
