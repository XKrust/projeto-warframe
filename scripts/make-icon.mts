// Gera build/icon.png (512×512): diamante azul-céu com brilho sobre fundo preto, igual ao logo do app.
// Uso: npx tsx scripts/make-icon.mts
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';

const S = 512;
const c = createCanvas(S, S);
const g = c.getContext('2d');

// Fundo: quadrado arredondado preto com brilho azul no centro
const r = 96;
g.beginPath();
g.moveTo(r, 0);
g.arcTo(S, 0, S, S, r);
g.arcTo(S, S, 0, S, r);
g.arcTo(0, S, 0, 0, r);
g.arcTo(0, 0, S, 0, r);
g.closePath();
const bg = g.createRadialGradient(S / 2, S / 2, 20, S / 2, S / 2, S * 0.7);
bg.addColorStop(0, '#0b2233');
bg.addColorStop(1, '#030509');
g.fillStyle = bg;
g.fill();

const diamond = (size: number) => {
  g.beginPath();
  g.moveTo(S / 2, S / 2 - size);
  g.lineTo(S / 2 + size, S / 2);
  g.lineTo(S / 2, S / 2 + size);
  g.lineTo(S / 2 - size, S / 2);
  g.closePath();
};

// Losango externo com brilho
g.shadowColor = 'rgba(79, 195, 255, 0.9)';
g.shadowBlur = 40;
g.strokeStyle = '#4fc3ff';
g.lineWidth = 26;
g.lineJoin = 'round';
diamond(170);
g.stroke();

// Núcleo claro
g.shadowBlur = 50;
g.fillStyle = '#b6ecff';
diamond(70);
g.fill();

fs.mkdirSync('build', { recursive: true });
fs.writeFileSync('build/icon.png', c.toBuffer('image/png'));
console.log('build/icon.png gerado');
