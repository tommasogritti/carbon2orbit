import Phaser from 'phaser';
import { W, H, T, held, just, finish, cam, img, panel } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import { S, tex, lg, rg, rr, el, poly, line, text, rng, starfield, OUT } from '../art';
import type { C2 } from '../art';
import type { LevelDef } from '../content';

const AUTO = new URLSearchParams(location.search).has('auto');
const HZ = 96; // the horizon
const WALK = 50, LOAD = 5, HOP = 80, GRAV = 300; // walking pace, what each unit of weight takes off it, and the hop
const REACH = 4, SNAP = 3.5, WADE = 6, BOARD = 10; // how near a thing, a mark and a boat must be; how deep the player will wade
const CRAB = 70, PINCH = 3; // a ghost crab's pace, and how near its claws reach
const WET = 1.2, SOAK = 1.6, SURGE = 4.2; // a thing this deep for this long is gone; the swell's period
const smooth = (u: number) => { u = Phaser.Math.Clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const mix = (a: number, b: number, t: number) => { const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t); return (ch(16) << 16) | (ch(8) << 8) | ch(0); };

// ---------------------------------------------------------------- people: nobody real
interface Wear { shirt: string; print: string; shorts: string; skin: string; skinD: string; top: 'straw' | 'cap' | 'bun' | 'crop' | 'visor'; hair: string }
/** The first is the player; the rest are the guests. All invented: no likeness is taken from anyone. */
const WEAR: Wear[] = [
  { shirt: '#e2572e', print: '#ffe9b0', shorts: '#2c7f86', skin: '#eebf9f', skinD: '#d9a283', top: 'straw', hair: '#5a3d26' },
  { shirt: '#2f8fa8', print: '#f2d14a', shorts: '#e8e6df', skin: '#c98f66', skinD: '#b07a54', top: 'cap', hair: '#1b1b22' },
  { shirt: '#d95a8c', print: '#ffffff', shorts: '#3a4057', skin: '#f0c8a8', skinD: '#dcae8c', top: 'bun', hair: '#c9a15a' },
  { shirt: '#f4f2ea', print: '#4f9d4f', shorts: '#d8452e', skin: '#8a5a3c', skinD: '#74492f', top: 'crop', hair: '#15171f' },
  { shirt: '#7cc56b', print: '#1b3a6b', shorts: '#6b4a2b', skin: '#e8b796', skinD: '#cf9c7c', top: 'visor', hair: '#8b93a7' },
  { shirt: '#f2c230', print: '#d8452e', shorts: '#263f6b', skin: '#d9a47c', skinD: '#c08a64', top: 'bun', hair: '#3a2715' },
  { shirt: '#8a5ad0', print: '#ffe98a', shorts: '#e8e6df', skin: '#f0c8a8', skinD: '#dcae8c', top: 'cap', hair: '#3a2715' },
  { shirt: '#ff8a5a', print: '#2c7f86', shorts: '#1b3a6b', skin: '#6b4630', skinD: '#59391f', top: 'visor', hair: '#15171f' },
  { shirt: '#3fb8a0', print: '#ffffff', shorts: '#d95a8c', skin: '#e8b796', skinD: '#cf9c7c', top: 'crop', hair: '#6b4a2b' },
];
/** A beach-goer on a 16 x 22 frame, feet on the bottom edge, facing right. `leg` swings the stride; `arms`: 0 at the sides, 1 both up (carrying, dancing), 2 pointing at the horizon, 3 a cocktail held up. */
function fan(c: C2, k: Wear, leg: number, arms: 0 | 1 | 2 | 3) {
  const limb = (x0: number, y0: number, ang: number, len: number, w: number, col: string) => { const x1 = x0 + Math.sin(ang) * len, y1 = y0 + Math.cos(ang) * len; line(c, x0, y0, x1, y1, OUT, w + 0.6); line(c, x0, y0, x1, y1, col, w); return [x1, y1]; };
  const a = leg * 0.55, foot = ([x, y]: number[]) => rr(c, x - 1.1, y - 0.3, 3, 0.9, 0.4, '#23262f');
  foot(limb(7.3, 14.6, a, 6.4, 1.8, k.skinD)); foot(limb(8.7, 14.6, -a, 6.4, 1.8, k.skin));
  if (arms === 1) limb(6.2, 8, Math.PI - 0.2, 5.4, 1.6, k.skinD); else limb(6, 8.4, arms ? -0.1 : -a * 0.9 - 0.1, 5, 1.6, k.skinD);
  rr(c, 5.3, 12, 5.4, 3.8, 1, k.shorts, OUT, 0.3);
  rr(c, 4.9, 6.8, 6.2, 6.2, 1.6, k.shirt, OUT, 0.3);
  for (const [x, y] of [[6.2, 8.2], [8.6, 7.8], [9.8, 10], [7.2, 10.4], [5.9, 11.9], [9, 12.1]]) el(c, x, y, 0.5, 0.5, k.print); // the print on the shirt
  if (arms === 1) limb(9.8, 8, Math.PI + 0.2, 5.4, 1.6, k.skin); else if (arms === 2) limb(10, 8.2, Math.PI / 2 + 0.45, 5.6, 1.6, k.skin); else if (arms === 3) { const [hx, hy] = limb(10, 8.2, Math.PI - 0.95, 5, 1.6, k.skin); line(c, hx, hy - 0.2, hx, hy - 1.4, '#f4f6fa', 0.3); poly(c, [hx - 1.4, hy - 3.2, hx + 1.4, hy - 3.2, hx, hy - 1.3], '#ff8ab0', OUT, 0.2); line(c, hx + 0.3, hy - 3.2, hx + 1.2, hy - 4.6, '#f2d14a', 0.3); el(c, hx + 1.2, hy - 4.7, 0.9, 0.4, '#f2d14a', OUT, 0.15); } else limb(10, 8.4, a * 0.9 + 0.1, 5, 1.6, k.skin);
  if (k.top === 'bun') { line(c, 5.7, 3.4, 5.4, 6.6, k.hair, 1.5); el(c, 5.5, 1.5, 1.3, 1.3, k.hair, OUT, 0.25); }
  el(c, 8, 4.4, 2.5, 2.6, k.skin, OUT, 0.3); el(c, 9.2, 4.3, 0.3, 0.36, '#16171d');
  if (k.top === 'straw') { rr(c, 5.9, 0.6, 4.2, 2.8, 1.2, '#e9d28a', OUT, 0.3); el(c, 8, 3, 4.6, 0.9, '#e9d28a', OUT, 0.3); rr(c, 6, 1.9, 4, 0.7, 0, '#d8452e'); }
  else if (k.top === 'cap') { c.beginPath(); c.ellipse(8, 3.3, 2.7, 2.5, 0, Math.PI, 0); c.closePath(); c.fillStyle = '#15171f'; c.fill(); rr(c, 8.6, 2.7, 3.4, 0.8, 0.4, '#15171f'); }
  else if (k.top === 'bun') el(c, 7.5, 2.6, 2.7, 1.6, k.hair, OUT, 0.25);
  else if (k.top === 'crop') { el(c, 7.8, 2.6, 2.6, 1.4, k.hair); rr(c, 8.1, 3.7, 2.5, 1, 0.3, '#15171f'); }
  else { el(c, 7.6, 2.5, 2.6, 1.5, k.hair, OUT, 0.2); rr(c, 8.3, 3, 3.7, 0.7, 0.3, '#f4f2ea', OUT, 0.2); }
}
const POSES: Record<string, [leg: number, arms: 0 | 1 | 2 | 3]> = { s: [0, 0], w0: [1, 0], w1: [-1, 0], cs: [0, 1], c0: [1, 1], c1: [-1, 1], look: [0, 2], ck: [0.35, 3], d: [-0.35, 1] };

// ---------------------------------------------------------------- what is carried
/** What a party is made of: its size on the sand (units) and how it is drawn, base on the bottom edge. */
interface Kind {
  w: number; h: number; draw: (c: C2) => void;
  /** Stays where it is put: it cannot be taken off again. */ fixed?: boolean;
  /** Seconds of pumping before it stands. */ pump?: number;
  /** Something to look through (Enter): the easter egg. */ look?: boolean;
  /** The music starts when this is set up. */ sound?: boolean;
  /** Burns: a flame, and it goes out when the water reaches it. */ fire?: boolean;
  /** Lights it carries, lit once it is set up: [x, y from its top left, radius, colour]. */ lit?: [number, number, number, number][];
  /** A mirror ball: once it is up, coloured spots sweep the sand. */ disco?: boolean;
  /** Lies flat on the sand and lights up square by square; the guests dance on it. */ floor?: boolean;
}
const DISCO = [0xff4fa8, 0x4fd8ff, 0xffe14f, 0x7dff6a, 0xb47dff];
const KINDS: Record<string, Kind> = {
  fire: { w: 12, h: 9, fixed: true, fire: true, lit: [[6, 2, 46, 0xffa040]], draw: (c) => {
    for (const x of [1.8, 4.6, 7.4, 10.2]) el(c, x, 8.1, 1.4, 0.9, '#8b93a7', OUT, 0.25);
    for (const a of [0.5, -0.5]) { c.save(); c.translate(6, 6.4); c.rotate(a); rr(c, -5, -0.9, 10, 1.8, 0.6, a > 0 ? '#6b4a2b' : '#7d5a36', OUT, 0.3); c.restore(); }
    rr(c, 5.2, 2.6, 1.7, 5.4, 0.6, '#5a3d22', OUT, 0.3);
  } },
  bar: { w: 22, h: 23, lit: [[5, 10, 7, 0xffe2a0], [11, 10.6, 7, 0xffe2a0], [17, 10, 7, 0xffe2a0]], draw: (c) => {
    for (const x of [2.6, 18.1]) rr(c, x, 6, 1.3, 17, 0.3, '#c9a15a', OUT, 0.3);
    poly(c, [0.4, 8, 3.4, 1.4, 18.6, 1.4, 21.6, 8], lg(c, 0, 1, 0, 8, [0, '#e2c26a'], [1, '#b58a3a']), OUT, 0.3);
    for (let x = 1.6, i = 0; x < 21; x += 1.6, i++) line(c, x, 8, x + (x < 11 ? -0.4 : 0.4), 9.4 + (i % 2) * 0.7, '#b58a3a', 0.4);
    rr(c, 1.6, 14.6, 18.8, 8.4, 0.5, lg(c, 0, 14.6, 0, 23, [0, '#b8813e'], [1, '#7a4e22']), OUT, 0.3);
    for (let x = 3.2; x < 20; x += 1.9) line(c, x, 15.6, x, 22.6, 'rgba(60,36,12,.35)', 0.3);
    rr(c, 0.8, 13.6, 20.4, 1.4, 0.4, '#e2c26a', OUT, 0.3);
    rr(c, 6, 10.4, 1.1, 3.2, 0.3, '#4f9d4f', OUT, 0.2); rr(c, 8.4, 11, 1.1, 2.6, 0.3, '#d8452e', OUT, 0.2); rr(c, 13, 10.6, 1.2, 3, 0.3, '#f2d14a', OUT, 0.2);
    for (const [x, col] of [[10.7, '#ff8ab0'], [16.7, '#9fe6ff']] as [number, string][]) { poly(c, [x - 1.3, 11.2, x + 1.3, 11.2, x + 0.2, 12.8, x - 0.2, 12.8], col, OUT, 0.2); line(c, x, 12.8, x, 13.6, OUT, 0.3); line(c, x + 0.4, 11.2, x + 1.2, 9.9, '#f2d14a', 0.3); el(c, x + 1.2, 9.8, 0.9, 0.4, '#f2d14a', OUT, 0.15); } // cocktails, with paper umbrellas
    rr(c, 7, 16.6, 8, 3.8, 0.5, '#2c7f86', OUT, 0.25); text(c, 'TIKI', 11, 18.6, 2.6, '#ffe9b0', 700);
  } },
  scope: { w: 10, h: 13, look: true, draw: (c) => {
    line(c, 5, 6.4, 1.6, 12.7, '#3a3f4f', 0.7); line(c, 5, 6.4, 8.4, 12.7, '#3a3f4f', 0.7); line(c, 5, 6.4, 5, 12.7, '#4a5066', 0.6);
    c.save(); c.translate(5, 5.4); c.rotate(-0.5); rr(c, -4.4, -1.3, 9, 2.6, 0.6, lg(c, 0, -1.3, 0, 1.3, [0, '#f4f6fa'], [1, '#9aa3b4']), OUT, 0.3); rr(c, 3.6, -1.6, 1.6, 3.2, 0.4, '#15171f'); rr(c, -5.6, -0.7, 1.6, 1.4, 0.3, '#15171f'); c.restore();
  } },
  speaker: { w: 10, h: 13, sound: true, lit: [[8, 1.6, 2.4, 0x7cc56b]], draw: (c) => {
    rr(c, 0.4, 0.4, 9.2, 12.2, 1, '#1b1b22', OUT, 0.35); el(c, 5, 3.8, 1.9, 1.9, '#3a3f4f', OUT, 0.25); el(c, 5, 3.8, 0.7, 0.7, '#15171f');
    el(c, 5, 8.9, 2.8, 2.8, '#3a3f4f', OUT, 0.25); el(c, 5, 8.9, 1.1, 1.1, '#15171f'); el(c, 8, 1.6, 0.4, 0.4, '#7cc56b');
  } },
  banner: { w: 28, h: 22, lit: [[5, 10.6, 3.4, 0xffe2a0], [14, 11.2, 3.4, 0xffe2a0], [23, 10.6, 3.4, 0xffe2a0]], draw: (c) => {
    for (const x of [1, 26]) rr(c, x, 1, 1, 21, 0.3, '#c9a15a', OUT, 0.25);
    poly(c, [2, 2.6, 26, 2.6, 26, 9.4, 2, 9.4], '#f4f2ea', OUT, 0.3); text(c, 'ALL-TIME HIGH', 14, 6.2, 3, '#d8452e', 700);
    line(c, 2, 10, 26, 10, '#8b93a7', 0.25); for (let i = 0; i < 6; i++) { const x = 3.2 + i * 3.9; poly(c, [x, 10, x + 2.6, 10, x + 1.3, 12.7], ['#f2d14a', '#2f8fa8', '#d95a8c'][i % 3], OUT, 0.2); }
  } },
  rocket: { w: 8, h: 25, pump: 2.4, draw: (c) => { // an inflatable Electron: black, with its name down the side
    const body = lg(c, 2, 0, 6, 0, [0, '#3a3c48'], [0.35, '#1b1b22'], [1, '#0c0c10']);
    el(c, 4, 23.6, 3.6, 1.2, '#d8452e', OUT, 0.3); rr(c, 2, 4.4, 4, 19, 1.4, body, OUT, 0.35);
    c.beginPath(); c.moveTo(2, 5.8); c.quadraticCurveTo(2, 0.8, 4, 0.5); c.quadraticCurveTo(6, 0.8, 6, 5.8); c.closePath(); c.fillStyle = body; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.35; c.stroke();
    rr(c, 2.1, 7.6, 3.8, 0.6, 0, '#e8e6df'); rr(c, 2.1, 20.2, 3.8, 0.6, 0, '#e8e6df');
    [...'ELECTRON'].forEach((ch, i) => text(c, ch, 4, 9.6 + i * 1.3, 1.5, '#e8e6df', 700));
    line(c, 2.8, 2.6, 2.8, 22, 'rgba(255,255,255,.22)', 0.4);
  } },
  palms: { w: 24, h: 27, lit: [[8, 13.4, 3.2, 0xffe2a0], [12, 14.4, 3.2, 0xff9ad0], [16, 13.4, 3.2, 0x9fe6ff]], draw: (c) => { // two palm trees, in pots: they came by boat like everything else
    const palm = (x: number, lean: number) => {
      const tx = x + lean * 3, ty = 7.4;
      poly(c, [x - 2.6, 22.6, x + 2.6, 22.6, x + 2, 26.7, x - 2, 26.7], '#c8663a', OUT, 0.3); rr(c, x - 3, 21.8, 6, 1.2, 0.4, '#d97a4a', OUT, 0.25);
      c.beginPath(); c.moveTo(x, 22); c.quadraticCurveTo(x + lean * 1.2, 14, tx, ty); c.strokeStyle = OUT; c.lineWidth = 2.3; c.stroke(); c.strokeStyle = '#8a6a3c'; c.lineWidth = 1.6; c.stroke();
      for (const [dx, dy] of [[-7, -1], [-5.4, -5], [-1.5, -6.6], [2.5, -6.2], [6, -4], [7, 0.4]]) { c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + dx * 0.6, ty + dy * 1.1 - 1.5, tx + dx, ty + dy + 2.4); c.strokeStyle = '#255a30'; c.lineWidth = 1.8; c.stroke(); c.strokeStyle = '#4f9d4f'; c.lineWidth = 1.1; c.stroke(); }
      el(c, tx - 0.7, ty + 0.9, 0.7, 0.7, '#6b4a2b', OUT, 0.2); el(c, tx + 0.7, ty + 1.1, 0.7, 0.7, '#6b4a2b', OUT, 0.2);
    };
    palm(5.5, -0.5); palm(18.5, 0.5);
    c.beginPath(); c.moveTo(5, 11.4); c.quadraticCurveTo(12, 17.4, 19, 11.4); c.strokeStyle = '#3a3f4f'; c.lineWidth = 0.3; c.stroke(); // a string of lights between them
    for (const [x, y, col] of [[8, 13.4, '#ffe2a0'], [12, 14.4, '#ff9ad0'], [16, 13.4, '#9fe6ff']] as [number, number, string][]) el(c, x, y, 0.6, 0.7, col, OUT, 0.15);
  } },
  floor: { w: 34, h: 4, floor: true, draw: (c) => { rr(c, 0.3, 1, 33.4, 2.8, 0.5, '#1b1b22', OUT, 0.3); for (let i = 0; i < 8; i++) rr(c, 1.2 + i * 4, 1.4, 3.6, 1.6, 0.2, ['#7a2a58', '#2a6a80', '#80702a', '#3e7a36'][i % 4]); } },
  disco: { w: 8, h: 27, disco: true, lit: [[4, 3.6, 6, 0xffffff]], draw: (c) => {
    line(c, 4, 26.6, 4, 7, '#3a3f4f', 0.7); line(c, 4, 22, 1, 26.6, '#3a3f4f', 0.6); line(c, 4, 22, 7, 26.6, '#3a3f4f', 0.6);
    el(c, 4, 3.6, 3.3, 3.3, rg(c, 3, 2.6, 0.3, 3.8, [0, '#ffffff'], [0.5, '#b8c0cc'], [1, '#5b6275']), OUT, 0.3);
    for (const y of [2, 3.6, 5.2]) line(c, 1.1, y, 6.9, y, 'rgba(20,24,34,.35)', 0.2); for (const x of [2.6, 4, 5.4]) line(c, x, 0.6, x, 6.6, 'rgba(20,24,34,.35)', 0.2); el(c, 3, 2.4, 0.5, 0.5, '#ffffff');
  } },
  table: { w: 22, h: 21, lit: [[11, 10.2, 5, 0xffd9a0]], draw: (c) => { // a restaurant: one table, two chairs, a parasol and a sign
    line(c, 11, 3, 11, 20.6, '#8b93a7', 0.5); poly(c, [1.6, 6, 11, 1, 20.4, 6], '#f4f2ea', OUT, 0.3); poly(c, [1.6, 6, 6.6, 3.4, 7.4, 6], '#d8452e'); poly(c, [9.2, 2, 12.8, 2, 13.8, 6, 8.2, 6], '#d8452e'); poly(c, [14.6, 6, 15.4, 3.4, 20.4, 6], '#d8452e');
    for (const [x, d] of [[2.4, 1], [19.6, -1]]) { line(c, x, 20.6, x, 11.6, '#6b4a2b', 0.6); rr(c, d > 0 ? x - 0.2 : x - 2.8, 15.4, 3, 0.8, 0.2, '#6b4a2b'); line(c, x + d * 2.6, 16, x + d * 2.6, 20.6, '#6b4a2b', 0.6); }
    line(c, 7, 18, 7, 20.6, '#8b93a7', 0.5); line(c, 15, 18, 15, 20.6, '#8b93a7', 0.5); rr(c, 5.4, 13.4, 11.2, 5, 0.4, '#ffffff', OUT, 0.3); rr(c, 4.8, 12.6, 12.4, 1.2, 0.4, '#f4f2ea', OUT, 0.25);
    for (const x of [7.6, 14.4]) el(c, x, 12.4, 1.3, 0.35, '#e8e6df', OUT, 0.15); rr(c, 10.6, 10.8, 0.8, 1.8, 0.2, '#f4f2ea'); el(c, 11, 10.2, 0.5, 0.7, '#ffd24a');
    rr(c, 6.2, 14.5, 9.6, 2.7, 0.3, '#1b3a6b'); text(c, 'RESTAURANT', 11, 15.95, 1.5, '#ffe9b0', 700);
  } },
  chairs: { w: 15, h: 9, draw: (c) => {
    const chair = (x: number, col: string) => { line(c, x + 5.6, 8.6, x + 1.2, 4.4, '#c9a15a', 0.6); line(c, x, 8.6, x + 5, 1.8, '#c9a15a', 0.6); poly(c, [x + 0.9, 7.4, x + 4.9, 2.2, x + 5.6, 2.8, x + 1.7, 8], col, OUT, 0.25); for (const t of [0.3, 0.7]) line(c, x + 1.3 + t * 4, 7.7 - t * 5.2, x + 1.9 + t * 4, 8.2 - t * 5.2, '#f4f2ea', 0.5); };
    chair(0.6, '#d8452e'); chair(8.4, '#2f6fc0');
  } },
  cooler: { w: 10, h: 7, draw: (c) => {
    c.beginPath(); c.arc(5, 1.6, 2.4, Math.PI, 0); c.strokeStyle = '#8b93a7'; c.lineWidth = 0.5; c.stroke();
    rr(c, 0.4, 2.2, 9.2, 4.6, 0.6, '#2f6fc0', OUT, 0.3); rr(c, 0.2, 1.2, 9.6, 1.8, 0.5, '#f4f2ea', OUT, 0.3); rr(c, 4.4, 2.8, 1.2, 1, 0.2, '#f4f2ea');
  } },
};
/** The boats, bow to the right: size, how far down the picture the waterline is, where a name painted on the side goes, and the drawing. */
const BOATS: Record<string, { w: number; h: number; line: number; name: string; tag?: [x: number, y: number, size: number]; draw: (c: C2) => void }> = {
  dinghy: { w: 40, h: 10, line: 0.9, name: 'dinghy', tag: [20.6, 6.2, 2.1], draw: (c) => {
    rr(c, 0, 0.4, 2.4, 4, 0.5, '#15171f', OUT, 0.25); line(c, 1.2, 4.4, 1.2, 9.4, '#3a3f4f', 0.7); rr(c, 0.2, 8.6, 2.2, 0.9, 0.3, '#8b93a7'); // the outboard
    rr(c, 4, 7.2, 30, 2.2, 1, '#3a4057'); rr(c, 1.6, 2.4, 37.6, 5.4, 2.7, lg(c, 0, 2.4, 0, 7.8, [0, '#e2e6ee'], [0.55, '#aab2c0'], [1, '#6f7889']), OUT, 0.35);
    rr(c, 3, 4.1, 34.6, 0.6, 0.3, '#15171f');
  } },
  pedalo: { w: 24, h: 16, line: 0.93, name: 'pedalo', draw: (c) => { // a flamingo
    c.beginPath(); c.moveTo(17.4, 10.6); c.bezierCurveTo(22.4, 9, 21.6, 4.4, 18.6, 3.6); c.strokeStyle = OUT; c.lineWidth = 2.5; c.stroke(); c.strokeStyle = '#f6a6c0'; c.lineWidth = 1.9; c.stroke();
    el(c, 18.2, 2.8, 1.8, 1.5, '#f6a6c0', OUT, 0.3); poly(c, [19.6, 2.4, 22.6, 3.5, 19.8, 3.9], '#15171f'); poly(c, [19.5, 2.4, 20.6, 2.8, 19.7, 3.6], '#f4f2ea'); el(c, 18.3, 2.5, 0.3, 0.3, '#15171f');
    rr(c, 4, 6.4, 6, 3.6, 1, '#f9c7d8', OUT, 0.3); rr(c, 1, 9.6, 20, 5.6, 2.6, lg(c, 0, 9.6, 0, 15.2, [0, '#f9b8cf'], [1, '#d95a8c']), OUT, 0.35); el(c, 7, 14.4, 2.4, 0.8, '#b8436e');
  } },
};

// ---------------------------------------------------------------- the setting
interface Theme {
  music: [party: string, tide: string]; heads: [out: string, turn: string, tide: string]; date: string; who: [name: string, role: string]; tags: Record<string, string>;
  /** The sky above the horizon (320 x 96) and the sea below it (320 x 84), by day's end and by night. */
  sky: (c: C2, night: boolean) => void; sea: (c: C2, night: boolean) => void;
  /** The far shore: a strip 320 x 18 whose row 16 is the horizon. */ far: (c: C2) => void;
  /** A light on the far shore that turns: where it is. */ beacon?: [x: number, y: number];
  /** What stands on the far shore until the turn: its drawing, its size, and where its foot is. */ mark: { w: number; h: number; x: number; draw: (c: C2) => void };
  /** What the telescope shows, 60 x 60. */ view: (c: C2) => void; viewSay: string;
  /** The turn: what a guest says, how many seconds the sound takes to arrive, and the call-outs. */
  turn: { say: string; lag: number; seen: string; heard: string; go: string };
  outSay: string; allSay: string; endSay: string;
  title: string; failTitle: string; text: (set: number, of: number, saved: number, all: number, lost: string[]) => string;
}
/** Off Cocoa Beach, looking north-north-east up the coast to Cape Canaveral: the VAB, the pads, the lighthouse, Launch Complex 36. */
const cocoa: Theme = {
  music: ['party', 'heli'], date: 'THU 28 MAY', who: ['A FAN', 'Invented for this level, like the party'], tags: { dinghy: 'M/Y UNREALISED GAINS' },
  heads: ['OFF COCOA BEACH, FLORIDA · THE TIDE IS OUT', 'OFF COCOA BEACH, FLORIDA · NINE O’CLOCK', 'OFF COCOA BEACH, FLORIDA · THE TIDE COMES IN'],
  sky: (c, night) => {
    const r = rng(7);
    if (night) { c.fillStyle = lg(c, 0, 0, 0, 96, [0, '#060a1c'], [0.6, '#0f1836'], [1, '#1b2850']); c.fillRect(0, 0, 320, 96); c.fillStyle = rg(c, 0, 96, 2, 110, [0, 'rgba(126,92,140,.5)'], [1, 'rgba(126,92,140,0)']); c.fillRect(0, 0, 320, 96); starfield(c, 320, 88, 170, 12); }
    else { c.fillStyle = lg(c, 0, 0, 0, 96, [0, '#27356a'], [0.4, '#6d5f95'], [0.72, '#d98b78'], [1, '#ffd49a']); c.fillRect(0, 0, 320, 96); c.fillStyle = rg(c, 0, 96, 2, 150, [0, 'rgba(255,226,160,.9)'], [0.3, 'rgba(255,190,130,.38)'], [1, 'rgba(255,190,130,0)']); c.fillRect(0, 0, 320, 96); }
    for (let i = 0; i < 9; i++) { const x = r() * 340 - 10, y = 28 + r() * 52, w = 24 + r() * 46, h = 1.5 + r() * 2.2; el(c, x, y, w / 2, h, night ? 'rgba(8,12,28,.55)' : 'rgba(70,58,104,.5)'); if (!night) el(c, x - 2, y + h * 0.6, w / 2.3, h * 0.55, 'rgba(255,176,128,.6)'); }
  },
  sea: (c, night) => {
    const r = rng(5);
    c.fillStyle = night ? lg(c, 0, 0, 0, 84, [0, '#22335c'], [0.2, '#152445'], [1, '#080f22']) : lg(c, 0, 0, 0, 84, [0, '#f2b98e'], [0.1, '#b98a96'], [0.4, '#566a94'], [1, '#27406a']); c.fillRect(0, 0, 320, 84);
    for (let i = 0; i < 110; i++) { const x = r() * 320, y = 1 + r() * 80, l = 2 + r() * 8; line(c, x, y, x + l, y, night ? `rgba(170,190,255,${0.03 + r() * 0.07})` : `rgba(255,238,214,${0.04 + r() * 0.1})`, 0.35); }
    if (!night) for (let i = 0; i < 60; i++) { const y = r() * r() * 56, x = (r() - 0.2) * (14 + y * 1.1), l = 1 + r() * 5; line(c, x, y, x + l, y, `rgba(255,226,170,${0.5 * (1 - y / 60)})`, 0.35); } // the last of the sun, off to the west
  },
  far: (c) => {
    const r = rng(31);
    c.beginPath(); c.moveTo(0, 17); for (let x = 0; x <= 320; x += 2) c.lineTo(x, 15.2 - r() * 0.8); c.lineTo(320, 17); c.closePath(); c.fillStyle = '#1d2b3c'; c.fill();
    rr(c, 36, 11, 4.6, 4.4, 0, '#2c3c52'); rr(c, 40.6, 12.6, 2.4, 2.8, 0, '#25354a'); // the Vehicle Assembly Building, 24 km off
    for (const x of [123, 125.4, 129, 131.4]) line(c, x, 15, x, 10.8, '#3a4a60', 0.3); // the towers of Space Launch Complexes 41 and 40
    rr(c, 228, 13, 8, 2.4, 0.2, '#34445a'); // Launch Complex 36: the hangar, two lightning towers, the launch tower, the water tower
    for (const x of [237.4, 253.6]) line(c, x, 15, x, 0.6, '#5a6a80', 0.35);
    rr(c, 246.6, 2.4, 1.5, 12.8, 0, '#46566c'); for (let y = 3.2; y < 15; y += 1.6) line(c, 246.6, y, 248.1, y + 1.2, '#6a7a90', 0.2); // the launch tower stands a third taller than the rocket
    line(c, 256.6, 15, 256.6, 10.6, '#8b93a7', 0.5); el(c, 256.6, 9.8, 1.6, 1.3, '#d8dde6');
    rr(c, 250, 8.8, 1.2, 6.4, 0, '#e8e6df'); rr(c, 250, 10, 1.2, 1.2, 0, '#15171f'); rr(c, 250, 12.4, 1.2, 1.2, 0, '#15171f'); el(c, 250.6, 8.4, 0.7, 0.6, '#15171f'); // Cape Canaveral lighthouse: almost in line with the pad from here, and a kilometre nearer
  },
  beacon: [250.6, HZ - 7.6],
  mark: { w: 4, h: 10, x: 244, draw: (c) => { // New Glenn: tall, white, seven metres across from foot to fairing, strakes at the foot
    poly(c, [0.4, 9.6, 1.1, 7.8, 2.9, 7.8, 3.6, 9.6], '#aab2c0'); rr(c, 1.1, 2.6, 1.8, 7, 0.2, lg(c, 1.1, 0, 2.9, 0, [0, '#ffffff'], [1, '#b8c0cc']));
    c.beginPath(); c.moveTo(1.1, 2.8); c.quadraticCurveTo(1.1, 0.5, 2, 0.2); c.quadraticCurveTo(2.9, 0.5, 2.9, 2.8); c.closePath(); c.fillStyle = '#f4f6fa'; c.fill(); rr(c, 1.1, 5, 1.8, 0.45, 0, '#4a5066'); rr(c, 1.3, 9.4, 1.4, 0.5, 0, '#3a3f4f');
  } },
  view: (c) => {
    c.save(); el(c, 30, 30, 28, 28); c.clip();
    c.fillStyle = lg(c, 0, 2, 0, 58, [0, '#0a1230'], [0.7, '#2a3a66'], [1, '#6a5a7a']); c.fillRect(0, 0, 60, 60); starfield(c, 60, 36, 26, 4);
    for (const x of [6, 54]) poly(c, [x, 54, 26, 6, 34, 6], 'rgba(255,250,224,.09)'); // floodlights
    rr(c, 0, 51, 60, 9, 0, '#141c2a'); rr(c, 20, 48.6, 22, 3, 0.4, '#3a4a60', OUT, 0.3);
    rr(c, 12, 1, 5, 48, 0, '#46566c', OUT, 0.3); for (let y = 1; y < 48; y += 4) { line(c, 12, y, 17, y + 4, '#7a8aa0', 0.4); line(c, 17, y, 12, y + 4, '#7a8aa0', 0.4); } for (const y of [24, 36]) rr(c, 17, y, 10, 1.2, 0, '#5a6a80');
    poly(c, [25.6, 48.6, 27, 43, 35, 43, 36.4, 48.6], '#aab2c0', OUT, 0.3); rr(c, 27, 19, 8, 27, 0.6, lg(c, 27, 0, 35, 0, [0, '#ffffff'], [0.6, '#e2e6ee'], [1, '#9aa3b4']), OUT, 0.35);
    c.beginPath(); c.moveTo(27, 20); c.quadraticCurveTo(27, 13, 31, 11); c.quadraticCurveTo(35, 13, 35, 20); c.closePath(); c.fillStyle = lg(c, 27, 0, 35, 0, [0, '#ffffff'], [1, '#aab2c0']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.35; c.stroke();
    rr(c, 27, 29.6, 8, 1.6, 0, '#4a5066'); for (const [x, y] of [[36, 32], [37.4, 30], [38.2, 33.4]]) el(c, x, y, 1.6, 1, 'rgba(255,255,255,.3)'); // a wisp of vented oxygen
    line(c, 46, 51, 46, 34, '#8b93a7', 0.8); el(c, 46, 31.6, 3.4, 2.8, '#d8dde6', OUT, 0.3); line(c, 52, 51, 52, 2, '#5a6a80', 0.5);
    c.restore(); el(c, 30, 30, 28, 28, undefined, '#e8e6df', 1.2); line(c, 30, 4, 30, 9, 'rgba(232,230,223,.6)', 0.4); line(c, 30, 51, 30, 56, 'rgba(232,230,223,.6)', 0.4); line(c, 4, 30, 9, 30, 'rgba(232,230,223,.6)', 0.4); line(c, 51, 30, 56, 30, 'rgba(232,230,223,.6)', 0.4);
  },
  viewSay: 'Through the telescope: New Glenn on Launch Complex 36, lit up for an engine test',
  turn: { say: 'Is that New Glenn?', lag: 4.4, seen: 'A flash on the far shore. No sound yet.', heard: 'Then the sound gets here.', go: 'The tide has turned. Get everything back to the boats: the lowest things first.' },
  outSay: '← → walk · SPACE picks up and puts down · ↑ hops a crab · each thing has an outline on the sand',
  allSay: 'Now that is a party! Nine o’clock is coming round.',
  endSay: 'Last one off the sandbar.',
  title: 'The party is over', failTitle: 'Gone with the tide',
  text: (set, of, saved, all, lost) => `${set === of ? 'The whole party was up before nine' : `${set} of ${of} things were set up by nine`}, and ${saved === all ? `every one of the ${all} things that could be carried is back in the boats` : `${saved} of ${all} made it back to the boats`}${lost.length ? `. The tide kept the ${lost.join(', the ').toLowerCase()}` : ''}. The sandbar is under water, and there is a column of smoke over the Cape.`,
};
const THEMES: Record<string, Theme> = { cocoa };

type State = 'due' | 'shore' | 'held' | 'set' | 'loose' | 'saved' | 'lost';
interface Item { key: string; kind: string; label: string; mx: number; wt: number; boat: number; at: number; k: Kind; state: State; x: number; wet: number; air: number; out: boolean; o: Phaser.GameObjects.Image; glows: Phaser.GameObjects.Image[]; flame?: Phaser.GameObjects.Image; chip?: Phaser.GameObjects.Text }
interface Boat { kind: string; side: number; cap: number; bow: number; drift: number; o: Phaser.GameObjects.Image; load: Item[]; crew: number }
interface Guest { x: number; tx: number; pre: string; o: Phaser.GameObjects.Image; state: 'walk' | 'party' | 'look' | 'leave' | 'aboard'; wait: number; boat?: Boat; seat: number }
interface Crab { x: number; v: number; o: Phaser.GameObjects.Image }
const ON_SAND: State[] = ['shore', 'set', 'loose'];

/**
 * A party on a sandbar, in two halves on the same ground. While the tide is out, boats land things at the water's edge
 * and the player carries each to its outline on the sand, before a set time. Then something happens on the far shore,
 * the tide turns, and everything has to go back into the boats before the water reaches it: the lowest first, and each
 * boat holds only so many. The bar's shape, the tide, the clock, the boats, the things and when they land are all the
 * level's params; the place, the far shore, the people and the words are a theme.
 */
export class SandbarScene extends Phaser.Scene {
  def!: LevelDef; p: any; th!: Theme; pts: number[][] = [];
  ph: 'out' | 'turn' | 'in' | 'end' = 'out'; t = 0; life = 0; secs = 0; wl = 0; wle = 0; xl = 0; xr = 0; night = 0; ended = false; egg = false; pinches = 0; setN = 0; flags: Record<string, boolean> = {};
  x = 160; vx = 0; py = 0; vy = 0; face = 1; stun = 0; cool = 0; step = 0; pumpT = 0; carry?: Item;
  items: Item[] = []; boats: Boat[] = []; guests: Guest[] = []; crabs: Crab[] = []; crabAt: [number, number][] = [];
  me!: Phaser.GameObjects.Image; g!: Phaser.GameObjects.Graphics; sea!: Phaser.GameObjects.Graphics; dark!: Phaser.GameObjects.Graphics; hud!: Phaser.GameObjects.Graphics;
  call!: Phaser.GameObjects.Text; head!: Phaser.GameObjects.Text; clockT!: Phaser.GameObjects.Text; markT!: Phaser.GameObjects.Text; tideT!: Phaser.GameObjects.Text;
  beams!: Phaser.GameObjects.Graphics; conf!: Phaser.GameObjects.Graphics; spots: Phaser.GameObjects.Image[] = []; bits: { x: number; y: number; vx: number; vy: number; col: number; life: number }[] = [];
  skyN!: Phaser.GameObjects.Image; seaN!: Phaser.GameObjects.Image; far!: Phaser.GameObjects.Image; farMark!: Phaser.GameObjects.Image; padLight!: Phaser.GameObjects.Image; beacon?: Phaser.GameObjects.Image; fx: Phaser.GameObjects.Image[] = []; view?: Phaser.GameObjects.Container; bub?: { c: Phaser.GameObjects.Container; life: number; total: number }; raft?: { it: Item; boat: Boat };
  surf!: Loop;
  constructor() { super('Sandbar'); }
  /** The controls panel (H or the ? button): what the keys do right now. */
  help(): { title: string; rows: [keys: string, does: string][]; note?: string } {
    const rows: [string, string][] = [['← →', 'Walk. Carrying something heavy is slower, and so is wading.'], ['↑', 'Hop: over a crab, for one.']];
    if (this.ph === 'out') rows.push(['Space', this.carry ? 'Put it down: on its outline to set it up, anywhere else to leave it for now.' : 'Pick up what you are standing next to.'], ['Space (hold)', 'Beside something that needs air: pump it up.'], ['Enter', 'Beside the telescope: have a look.']);
    else rows.push(['Space', this.carry ? 'At the water’s edge beside a boat: load it. Anywhere else: put it down.' : 'Pick up what you are standing next to.']);
    return { title: this.ph === 'out' ? 'The tide is out' : 'The tide comes in', rows, note: this.ph === 'out' ? 'Set everything up on its outline before the clock reaches the hour. Once it is all up, the evening passes more quickly.' : 'Whatever the water covers for more than a moment floats away. The lowest things go first. Each boat holds only so many: the dots beside it show how many more.' };
  }
  init(d: { def: LevelDef }) {
    this.def = d.def; this.p = d.def.params; this.th = THEMES[this.p.theme]; this.pts = this.p.bar;
    this.ph = 'out'; this.t = 0; this.life = 0; this.secs = 0; this.ended = false; this.egg = false; this.pinches = 0; this.setN = 0; this.flags = {};
    this.x = this.p.start ?? 160; this.vx = 0; this.py = 0; this.vy = 0; this.face = 1; this.stun = 0; this.cool = 0; this.step = 0; this.pumpT = 0; this.carry = undefined;
    this.items = []; this.boats = []; this.guests = []; this.crabs = []; this.crabAt = [...(this.p.crabs || [])]; this.fx = []; this.view = undefined; this.bub = undefined; this.raft = undefined; this.spots = []; this.bits = [];
  }
  /** The sand's surface at x: smooth through the bar's control points. */
  ground(x: number): number {
    const p = this.pts; let i = 1; while (i < p.length - 1 && p[i][0] < x) i++;
    const a = p[i - 1], b = p[i], f = Phaser.Math.Clamp((x - a[0]) / (b[0] - a[0] || 1), 0, 1);
    return a[1] + (b[1] - a[1]) * f * f * (3 - 2 * f);
  }
  /** How far under water the sand at x is (negative: dry), against the swell. */
  depth(x: number) { return this.ground(x) - this.wle; }
  complete(it: Item) { return it.state === 'set' && (!it.k.pump || it.air >= 1); }
  say(s: string) { this.call.setText(s); }
  mk(key: string, w: number, h: number, fn: (c: C2) => void) { if (!this.textures.exists(key)) tex(this, key, w, h, fn); return key; }

  create() {
    cam(this); stopLoops(); music.stop(0.2); this.surf = loop('sea'); this.surf.set(0.45);
    const p = this.p, th = this.th, id = p.theme, x0 = this.pts[0][0], x1 = this.pts[this.pts.length - 1][0];
    // ---- the far view: two skies and two seas that cross over as night falls, the far shore, and what stands on it
    for (const n of [0, 1]) { this.mk(`sb_sky${n}_${id}`, W, HZ, (c) => th.sky(c, !!n)); this.mk(`sb_sea${n}_${id}`, W, H - HZ, (c) => th.sea(c, !!n)); }
    img(this, 0, 0, `sb_sky0_${id}`).setOrigin(0); this.skyN = img(this, 0, 0, `sb_sky1_${id}`).setOrigin(0).setAlpha(0);
    img(this, 0, HZ, `sb_sea0_${id}`).setOrigin(0).setDepth(0.3); this.seaN = img(this, 0, HZ, `sb_sea1_${id}`).setOrigin(0).setDepth(0.3).setAlpha(0);
    this.mk('sb_glow', 32, 32, (c) => { c.fillStyle = rg(c, 16, 16, 0, 16, [0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.55)'], [0.6, 'rgba(255,255,255,.14)'], [1, 'rgba(255,255,255,0)']); c.fillRect(0, 0, 32, 32); });
    this.far = img(this, 0, HZ - 16, this.mk(`sb_far_${id}`, W, 18, th.far)).setOrigin(0).setDepth(1);
    this.padLight = this.glow(th.mark.x, HZ - 4, 9, 0xfff2d0).setDepth(1.05).setAlpha(0);
    this.beacon = th.beacon ? this.glow(th.beacon[0], th.beacon[1], 4, 0xfff6d0).setDepth(1.15).setAlpha(0) : undefined;
    this.farMark = img(this, th.mark.x, HZ - 0.6, this.mk(`sb_mark_${id}`, th.mark.w, th.mark.h, th.mark.draw)).setOrigin(0.5, 1).setDepth(1.1);
    this.mk('sb_yacht', 30, 8, (c) => { poly(c, [0.4, 5, 29.6, 5, 27, 7.6, 2.4, 7.6], '#0e1626'); poly(c, [6, 5, 8, 3, 22, 3, 24, 5], '#16203a'); poly(c, [10, 3, 11.4, 1.4, 19, 1.4, 20, 3], '#1c2846'); line(c, 15, 1.4, 15, 0, '#1c2846', 0.3); for (let x = 8.6; x < 22; x += 1.5) rr(c, x, 3.7, 0.8, 0.6, 0, '#ffe9a8'); for (let x = 11.6; x < 19; x += 1.5) rr(c, x, 1.9, 0.7, 0.5, 0, '#ffe9a8'); });
    const yacht = img(this, -30, 105, 'sb_yacht').setDepth(0.6).setAlpha(0.9); this.tweens.add({ targets: yacht, x: W + 40, duration: 95000 }); // somebody else's yacht
    // ---- the bar: sand from its crest down to the bottom of the screen
    const bk = this.mk('sb_bar_' + this.def.id, W, H - 110, (c) => {
      const r = rng(23), top = (x: number) => this.ground(x) - 110;
      c.beginPath(); c.moveTo(x0 - 60, 80); for (let x = x0; x <= x1; x++) c.lineTo(x, top(x)); c.lineTo(x1 + 60, 80); c.closePath(); c.fillStyle = lg(c, 0, 16, 0, 70, [0, '#ecdcb4'], [0.3, '#d6bf8e'], [1, '#8f7b58']); c.fill();
      c.beginPath(); for (let x = x0; x <= x1; x++) x === x0 ? c.moveTo(x, top(x) + 0.2) : c.lineTo(x, top(x) + 0.2); c.strokeStyle = '#f8eecf'; c.lineWidth = 0.6; c.stroke();
      for (const k of [3.4, 7, 11.6]) { c.beginPath(); for (let x = x0 + 8; x <= x1 - 8; x++) { const y = top(x) + k + Math.sin(x * 0.21 + k) * 0.5; x === x0 + 8 ? c.moveTo(x, y) : c.lineTo(x, y); } c.strokeStyle = 'rgba(120,96,60,.16)'; c.lineWidth = 0.35; c.stroke(); } // ripples the last tide left
      for (let i = 0; i < 300; i++) { const x = x0 + 4 + r() * (x1 - x0 - 8); el(c, x, top(x) + 0.8 + r() * 16, 0.3 + r() * 0.5, 0.25, 'rgba(120,96,60,.26)'); }
      for (let i = 0; i < 14; i++) { const x = x0 + 10 + r() * (x1 - x0 - 20), y = top(x) + 1 + r() * 5; el(c, x, y, 0.7, 0.45, '#fbf6e6', 'rgba(120,96,60,.5)', 0.15); }
    });
    img(this, 0, 110, bk).setOrigin(0).setDepth(2);
    this.g = this.add.graphics().setDepth(3); this.sea = this.add.graphics().setDepth(7); this.dark = this.add.graphics().setDepth(8);
    this.beams = this.add.graphics().setDepth(9.1).setBlendMode(Phaser.BlendModes.ADD); this.conf = this.add.graphics().setDepth(9.3);
    // ---- boats, things, the player
    this.wl = this.wle = p.tide.start; this.shores();
    for (const [kind, side, cap] of p.boats as [string, string, number][]) {
      const b = BOATS[kind], s = side === 'left' ? -1 : 1, name = th.tags[kind];
      // a boat on the right is drawn the other way round, bow to the sand; its name still reads from the left
      const key = this.mk(`sb_boat_${kind}_${id}_${side}`, b.w, b.h, (c) => { c.save(); if (s > 0) { c.translate(b.w, 0); c.scale(-1, 1); } b.draw(c); c.restore(); if (b.tag && name) text(c, name, s > 0 ? b.w - b.tag[0] : b.tag[0], b.tag[1], b.tag[2], '#1b3a6b', 700); });
      this.boats.push({ kind, side: s, cap, bow: s < 0 ? this.xl : this.xr, drift: 0, load: [], crew: 0, o: img(this, 0, 0, key).setOrigin(0.5, b.line).setDepth(5) });
    }
    for (const [key, kind, label, mx, wt, boat, at] of p.items as [string, string, string, number, number, number, number][]) {
      const k = KINDS[kind]; this.mk('sb_' + kind, k.w, k.h, k.draw);
      const it: Item = { key, kind, label, mx, wt, boat, at, k, state: 'due', x: mx, wet: 0, air: k.pump ? 0 : 1, out: false, glows: [], o: img(this, mx, 0, 'sb_' + kind).setOrigin(0.5, 1).setDepth(4).setVisible(false) };
      for (const [dx, dy, r, tint] of k.lit || []) it.glows.push(this.glow(0, 0, r, tint).setData('at', [dx - k.w / 2, dy - k.h]).setVisible(false));
      if (k.fire) it.flame = img(this, 0, 0, this.mk('sb_flame', 8, 11, (c) => { const drop = (cx: number, w: number, h: number, col: string) => { c.beginPath(); c.moveTo(cx, 11 - h); c.bezierCurveTo(cx + w, 11 - h * 0.45, cx + w * 0.9, 11, cx, 11); c.bezierCurveTo(cx - w * 0.9, 11, cx - w, 11 - h * 0.45, cx, 11 - h); c.fillStyle = col; c.fill(); }; drop(4, 3.6, 10.6, '#f28c28'); drop(4.2, 2.3, 7, '#ffd24a'); drop(4, 1.1, 3.6, '#fff6d8'); })).setOrigin(0.5, 1).setDepth(9.2).setVisible(false);
      this.items.push(it);
    }
    WEAR.forEach((k, i) => { for (const [pose, [leg, arms]] of Object.entries(POSES)) this.mk(`sb_p${i}_${pose}`, 16, 22, (c) => fan(c, k, leg, arms)); });
    this.mk('sb_chip', 24, 24, (c) => { c.save(); el(c, 12, 12, 11, 11, '#22355a'); c.clip(); c.translate(12, 16); c.scale(2.7, 2.7); c.translate(-8, -5.6); fan(c, WEAR[0], 0, 0); c.restore(); el(c, 12, 12, 11, 11, undefined, '#ffe98a', 0.8); });
    this.mk('sb_crab', 8, 5, (c) => { for (const s of [-1, 1]) { for (let k = 0; k < 3; k++) line(c, 4 + s * 1.6, 3.1 + k * 0.3, 4 + s * (3.3 - k * 0.3), 4.7 - k * 0.2, '#cdbb8c', 0.35); el(c, 4 + s * 3, 2.3, 0.9, 0.65, '#f4ead0', OUT, 0.25); line(c, 4 + s * 0.9, 2, 4 + s * 1.1, 0.7, OUT, 0.3); el(c, 4 + s * 1.1, 0.6, 0.35, 0.35, '#15171f'); } el(c, 4, 3, 2.4, 1.5, '#e8d9b0', OUT, 0.3); });
    this.me = img(this, this.x, 0, 'sb_p0_s').setOrigin(0.5, 1).setDepth(6);
    for (let i = 0; i < 8; i++) this.spots.push(this.glow(0, 0, 5, DISCO[i % DISCO.length]).setVisible(false)); // the mirror ball's spots on the sand
    // ---- the HUD: the heading with the clock and the tide, the call-out, the list
    this.hud = this.add.graphics().setDepth(22);
    panel(this, 4, 4, W - 8, 15, 0.9).setDepth(20); this.head = T(this, 9, 6.6, th.heads[0], '#ffffff', 5.4, '700').setDepth(21);
    this.clockT = T(this, W - 86, 7, '', '#ffe98a', 4.8, '700').setOrigin(1, 0).setDepth(21); this.tideT = T(this, W - 80, 7, 'TIDE', '#aab4d4', 4.6, '700').setDepth(21);
    this.call = T(this, W / 2, 22, th.outSay, '#ffe98a', 5.2, '700').setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(300).setShadow(0, 1, '#000000', 4).setDepth(21);
    this.markT = T(this, 0, 0, '', '#ffffff', 4.2, '700').setOrigin(0.5, 1).setShadow(0, 1, '#000000', 3).setDepth(9.4);
    panel(this, 4, 163, W - 8, 13, 0.86).setDepth(20);
    const cw = (W - 16) / this.items.length; this.items.forEach((it, i) => (it.chip = T(this, 8 + i * cw + cw / 2, 166, '', '#aab4d4', this.items.length > 8 ? 3.5 : 3.9, '700').setOrigin(0.5, 0).setDepth(21)));
    // who is played: nobody real, and the plate says so
    const plate = [panel(this, 4, 36, 118, 22, 0.85).setDepth(48), img(this, 15, 47, 'sb_chip').setScale(S * 0.8).setDepth(49), T(this, 27, 39.6, th.who[0], '#ffffff', 6.6, '700').setDepth(49), T(this, 27, 48.4, th.who[1], '#ffe98a', 4.6).setDepth(49)];
    plate.forEach((o) => o.setAlpha(0)); this.tweens.add({ targets: plate, alpha: 1, duration: 250 }); this.tweens.add({ targets: plate, alpha: 0, delay: 4200, duration: 600, onComplete: () => plate.forEach((o) => o.destroy()) });
    if (!this.items.some((i) => i.k.sound)) music.play(th.music[0]);
    this.draw(0);
  }
  /** A soft light, added to the picture. */
  glow(x: number, y: number, r: number, tint: number) { return img(this, x, y, 'sb_glow').setScale((S * r) / 16).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(9); }
  /** Where the dry sand ends on each side, at the tide's own level (the swell moves the water, not the boats). */
  shores() {
    const x0 = this.pts[0][0], x1 = this.pts[this.pts.length - 1][0]; let a = NaN, b = NaN;
    for (let x = x0; x <= x1; x += 0.5) if (this.ground(x) < this.wl) { if (isNaN(a)) a = x; b = x; }
    if (!isNaN(a)) { this.xl = a; this.xr = b; }
    return !isNaN(a);
  }
  boatFor(x: number) { return this.boats.filter((b) => Math.abs(x - b.bow) < BOARD).sort((a, b) => Math.abs(x - a.bow) - Math.abs(x - b.bow))[0]; }
  nearItem(pick: (i: Item) => boolean) { return this.items.filter((i) => pick(i) && Math.abs(i.x - this.x) < i.k.w / 2 + REACH).sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x))[0]; }

  // ------------------------------------------------------------------ picking up, putting down
  take() {
    const it = this.nearItem((i) => i.state === 'shore' || i.state === 'loose' || (i.state === 'set' && this.ph !== 'out' && !i.k.fixed));
    if (!it) { // nothing to carry here: say why, unless the thing wants pumping
      const here = this.nearItem((i) => i.state === 'set');
      if (here && !(here.k.pump && here.air < 1)) this.say(this.ph === 'out' ? `The ${here.label.toLowerCase()} is where it belongs.` : `The ${here.label.toLowerCase()} stays. It cannot be carried.`);
      return;
    }
    it.state = 'held'; it.wet = 0; this.carry = it; snd.click(); it.o.setDepth(6.5);
    this.say(this.ph === 'out' ? `${it.label}: look for the outline on the sand.` : `${it.label}: to a boat.`);
  }
  put(it: Item) {
    const b = this.ph === 'in' ? this.boatFor(this.x) : undefined;
    if (b && b.load.length >= b.cap) { snd.deny(); return this.say(`The ${BOATS[b.kind].name} is full. Try the other boat.`); }
    it.o.setDepth(4).setRotation(0);
    if (b) {
      it.state = 'saved'; this.carry = undefined; b.load.push(it); snd.pickup();
      const left = this.items.filter((i) => !i.k.fixed && i.state !== 'saved' && i.state !== 'lost').length;
      return this.say(`${it.label}: in the ${BOATS[b.kind].name}.${left ? ` ${left} still on the sand.` : ''}`);
    }
    if (this.depth(this.x) > 1) { snd.deny(); return this.say('Not in the water.'); }
    this.carry = undefined; it.x = this.x;
    if (this.ph === 'out' && Math.abs(this.x - it.mx) <= SNAP) {
      it.state = 'set'; it.x = it.mx; snd.land(); snd.stage();
      if (it.k.sound) music.play(this.th.music[0]);
      const left = this.items.filter((i) => !this.complete(i)).length;
      return this.say(it.k.pump && it.air < 1 ? `${it.label}: it needs air. Hold SPACE beside it.` : left ? `${it.label}: set up. ${left} to go.` : this.th.allSay);
    }
    it.state = 'loose'; snd.land();
    this.say(this.ph === 'out' ? `Put down. The ${it.label.toLowerCase()} belongs on its outline.` : 'Put down.');
  }
  lose(it: Item) {
    it.state = 'lost'; snd.splash(); this.say(`The ${it.label.toLowerCase()} is gone with the tide.`);
    const dir = it.x < (this.xl + this.xr) / 2 ? -1 : 1;
    this.tweens.add({ targets: it.o, x: it.x + dir * 46, angle: dir * 24, alpha: 0, duration: 3000, ease: 'Sine.easeIn' });
  }
  /** The telescope: what stands on the far shore, close up. The easter egg. */
  peek() {
    if (this.view) return;
    const key = this.mk('sb_view_' + this.p.theme, 60, 60, this.th.view);
    const v = (this.view = this.add.container(W / 2, 84, [this.add.graphics().fillStyle(0x05060c, 0.6).fillCircle(0, 0, 33), img(this, 0, 0, key)]).setDepth(23).setAlpha(0));
    this.tweens.add({ targets: v, alpha: 1, duration: 200 }); this.tweens.add({ targets: v, alpha: 0, delay: 3600, duration: 400, onComplete: () => { v.destroy(); this.view = undefined; } });
    if (!this.egg) { this.egg = true; snd.egg(); }
    this.say(this.th.viewSay);
  }

  // ------------------------------------------------------------------ the turn: something on the far shore
  blast() {
    const th = this.th, x = th.mark.x, y = HZ - 2;
    this.farMark.setVisible(false); this.padLight.setVisible(false);
    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xffe2b0, 0.38).setDepth(9.8); this.tweens.add({ targets: flash, alpha: 0, duration: 800, onComplete: () => flash.destroy() });
    const sky = this.glow(x, y, 150, 0xff8a40).setDepth(0.5).setAlpha(0); this.tweens.add({ targets: sky, alpha: 0.5, duration: 300, yoyo: true, hold: 500, onComplete: () => sky.setAlpha(0.2) });
    const ball = this.glow(x, y - 2, 4, 0xffc070).setDepth(1.3); this.tweens.add({ targets: ball, scale: (S * 34) / 16, duration: 550, ease: 'Cubic.easeOut' }); this.tweens.add({ targets: ball, y: y - 20, alpha: 0.12, scale: (S * 24) / 16, delay: 600, duration: 4200 });
    const core = this.glow(x, y - 2, 3, 0xffffff).setDepth(1.4); this.tweens.add({ targets: core, scale: (S * 16) / 16, alpha: 0, duration: 1100 });
    const fire = this.glow(x, y, 9, 0xff7a30).setDepth(1.3);
    const key = this.mk('sb_smoke', 30, 58, (c) => { const r = rng(77); for (let i = 0; i < 30; i++) { const t = i / 29, yy = 56 - t * 50, rx = 1.6 + t * t * 9 + r() * 2; const k = Math.round(26 + (1 - t) * 60); el(c, 12 + t * 6 + (r() - 0.5) * rx * 0.7, yy, rx, rx * 0.8, `rgba(${k + 20},${Math.round(k * 0.6) + 14},${Math.round(k * 0.4) + 18},.5)`); } for (let i = 0; i < 6; i++) el(c, 12 + (r() - 0.5) * 3, 55 - r() * 6, 1.6 + r(), 1.4, 'rgba(255,140,60,.4)'); });
    const smoke = img(this, x + 1, y + 1, key).setOrigin(0.4, 1).setDepth(1.2).setScale(S * 0.3, 0); this.tweens.add({ targets: smoke, scaleX: S, scaleY: S, duration: 9000, ease: 'Sine.easeOut' });
    const refl = img(this, x, HZ + 0.5, this.mk('sb_refl', 8, 44, (c) => { c.fillStyle = lg(c, 0, 0, 0, 44, [0, 'rgba(255,170,90,.75)'], [1, 'rgba(255,170,90,0)']); c.fillRect(1.5, 0, 5, 44); })).setOrigin(0.5, 0).setDepth(1.3).setBlendMode(Phaser.BlendModes.ADD);
    this.fx = [fire, refl];
    this.say(th.turn.seen);
  }
  bubble(x: number, y: number, s: string, ms: number) {
    const t = T(this, 0, 0, s, '#10131c', 5.2, '700').setOrigin(0.5), w = t.width + 8;
    const g = this.add.graphics(); g.fillStyle(0xffffff, 0.96).fillRoundedRect(-w / 2, -6, w, 12, 3).fillTriangle(-2, 5.6, 3, 5.6, 0, 10);
    this.bub = { c: this.add.container(Phaser.Math.Clamp(x, w / 2 + 6, W - w / 2 - 6), y, [g, t]).setDepth(9.6).setAlpha(0), life: ms / 1000, total: ms / 1000 }; // timed by the game's own clock, so it keeps pace at any game speed
  }
  once(key: string, when: boolean) { if (!when || this.flags[key]) return false; return (this.flags[key] = true); }

  update(_time: number, ms: number) {
    if (this.ended) return;
    const dt = Math.min(0.05, ms / 1000), p = this.p, th = this.th, tide = p.tide;
    this.life += dt;
    let dir = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), hop = just('up'), act = just('a'), hold = held('a'), look = just('b');
    if (AUTO) ({ dir, hop, act, hold, look } = this.bot());
    // ---- the clock and the tide
    const all = this.items.length > 0 && this.items.every((i) => this.complete(i));
    const pace = this.ph === 'out' && all ? 3 : 1; // with everything up, the evening passes more quickly
    this.t += dt * pace; if (this.ph !== 'turn') this.secs += dt * pace;
    if (this.ph === 'out') {
      this.wl = tide.start + (tide.low - tide.start) * smooth(this.t / (tide.out * 0.75));
      for (const it of this.items) if (it.state === 'due' && this.t >= it.at) this.land(it);
      while (this.crabAt.length && this.t >= this.crabAt[0][0]) { const [, side] = this.crabAt.shift()!; this.crabs.push({ x: side < 0 ? this.xl + 1 : this.xr - 1, v: -side * CRAB, o: img(this, 0, 0, 'sb_crab').setOrigin(0.5, 1).setDepth(5) }); snd.sizzle(); }
      if (this.once('all', all)) { this.say(th.allSay); snd.power(); const r = rng(3); for (let i = 0; i < 90; i++) { const x = this.xl + 20 + r() * (this.xr - this.xl - 40); this.bits.push({ x, y: this.ground(x) - 8 - r() * 10, vx: (r() - 0.5) * 50, vy: -50 - r() * 70, col: DISCO[i % DISCO.length], life: 2.2 + r() * 1.6 }); } }
      if (this.t >= tide.out) { this.ph = 'turn'; this.t = 0; this.setN = this.items.filter((i) => this.complete(i)).length; music.stop(0.05); this.head.setText(th.heads[1]); if (this.view) { this.tweens.killTweensOf(this.view); this.view.destroy(); this.view = undefined; } this.blast(); for (const g of this.guests) if (g.state !== 'aboard') g.state = 'look'; }
    } else if (this.ph === 'turn') {
      this.wl = tide.low;
      if (this.once('say', this.t > 1.3)) { const g = [...this.guests].sort((a, b) => Math.abs(a.x - th.mark.x) - Math.abs(b.x - th.mark.x))[0], bx = g ? g.x : 200; this.bubble(bx, this.ground(bx) - 30, th.turn.say, 3400); }
      if (this.once('boom', this.t > th.turn.lag)) { snd.far(); this.cameras.main.shake(380, 0.0022); this.say(th.turn.heard); }
      if (this.t > th.turn.lag + 2.2) { this.ph = 'in'; this.t = 0; music.play(th.music[1]); this.head.setText(th.heads[2]); this.say(th.turn.go); this.guests.forEach((g, i) => { if (g.state !== 'aboard') { g.state = 'leave'; g.wait = 1.2 + i * 2; } }); }
    } else {
      const u = this.t / tide.in; this.wl = this.ph === 'in' ? tide.low + (tide.high - tide.low) * Math.pow(Phaser.Math.Clamp(u, 0, 1), 1.3) : Math.max(tide.high - 5, this.wl - 7 * dt);
    }
    this.wle = this.wl + (this.ph === 'out' ? 0.5 : 1.4) * Math.sin((this.life * 2 * Math.PI) / SURGE);
    const dry = this.shores();
    for (const b of this.boats) { const want = b.side < 0 ? this.xl : this.xr; if (dry) b.bow += Phaser.Math.Clamp(want - b.bow, -40 * dt, 40 * dt); }
    const clock = p.clock[0] + ((p.clock[1] - p.clock[0]) * (this.ph === 'out' ? this.t : Math.max(tide.out, this.secs))) / tide.out;
    this.night = smooth((clock - p.dusk[0]) / (p.dusk[1] - p.dusk[0]));
    const hh = Math.floor(clock), mm = Math.floor((clock - hh) * 60);
    this.clockT.setText(`${th.date} · ${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'p.m.' : 'a.m.'}`);

    // ---- the player
    this.stun = Math.max(0, this.stun - dt); this.cool = Math.max(0, this.cool - dt);
    if (this.ph !== 'end') {
      const d0 = this.depth(this.x), sp = (WALK - (this.carry ? LOAD * this.carry.wt : 0)) * (d0 > 0 ? Math.max(0.5, 1 - 0.07 * d0) : 1);
      const nx = Phaser.Math.Clamp(this.x + (this.stun > 0 ? 0 : dir) * sp * dt, this.pts[0][0] + 2, this.pts[this.pts.length - 1][0] - 2), d1 = this.depth(nx);
      this.vx = d1 > WADE && d1 > d0 ? 0 : (nx - this.x) / dt; this.x += this.vx * dt; if (dir) this.face = dir;
      if (hop && this.py === 0 && this.stun <= 0) { this.vy = -HOP; snd.jump(); }
      if (this.py < 0 || this.vy < 0) { this.vy += GRAV * dt; this.py = Math.min(0, this.py + this.vy * dt); if (this.py === 0) this.vy = 0; }
      if (this.py === 0) this.step += Math.abs(this.vx) * dt;
      if (act && this.stun <= 0) { if (this.carry) this.put(this.carry); else this.take(); }
      // pumping: hold beside the thing that needs air
      const flat = !this.carry && this.ph === 'out' ? this.nearItem((i) => i.state === 'set' && !!i.k.pump && i.air < 1) : undefined;
      if (flat && hold) { flat.air = Math.min(1, flat.air + dt / flat.k.pump!); this.pumpT -= dt; if (this.pumpT <= 0) { this.pumpT = 0.22; snd.tick(); } if (flat.air >= 1) { snd.power(); const left = this.items.filter((i) => !this.complete(i)).length; this.say(left ? `${flat.label}: standing. ${left} to go.` : th.allSay); } }
      if (look && !this.carry) { const sc = this.nearItem((i) => !!i.k.look && i.state === 'set'); if (sc && this.ph === 'out') this.peek(); }
    }
    // ---- crabs: they cross the bar; a pinch makes the player drop what is carried
    for (const c of this.crabs) {
      c.x += c.v * dt;
      if (Math.abs(c.x - this.x) < PINCH && this.py > -3 && this.cool <= 0 && this.ph === 'out') {
        this.cool = 1.4; this.stun = 0.5; this.pinches++; snd.hurt(); const it = this.carry;
        if (it) { this.carry = undefined; it.state = 'loose'; it.x = this.x; it.o.setDepth(4).setRotation(0); this.say(`Pinched by a ghost crab! You dropped the ${it.label.toLowerCase()}.`); } else this.say('Pinched by a ghost crab! Hop over them with ↑.');
      }
    }
    this.crabs = this.crabs.filter((c) => { const gone = c.x < this.xl - 3 || c.x > this.xr + 3; if (gone) c.o.destroy(); return !gone; });
    // ---- the water reaches things
    if (this.ph === 'in' || this.ph === 'end') for (const it of this.items) {
      if (!ON_SAND.includes(it.state)) continue;
      const d = this.depth(it.x);
      if (it.k.fire) { if (!it.out && d > 0.4) { it.out = true; snd.sizzle(); snd.splash(); if (this.ph === 'in') this.say(`The ${it.label.toLowerCase()} is out.`); } continue; }
      it.wet = d > WET ? it.wet + dt : Math.max(0, it.wet - dt * 0.5);
      if (it.wet > SOAK) this.lose(it);
    }
    // ---- guests
    for (const g of this.guests) {
      if (g.state === 'walk') { g.x += Phaser.Math.Clamp(g.tx - g.x, -30 * dt, 30 * dt); if (Math.abs(g.tx - g.x) < 0.5) g.state = 'party'; }
      else if (g.state === 'leave') { g.wait -= dt; if (g.wait <= 0) { const b = (g.boat ||= [...this.boats].sort((a, c) => Math.abs(a.bow - g.x) - Math.abs(c.bow - g.x))[0]); g.x += Phaser.Math.Clamp(b.bow - g.x, -36 * dt, 36 * dt); if (Math.abs(b.bow - g.x) < 3 || this.depth(g.x) > 3) { g.state = 'aboard'; g.seat = b.crew++; } } }
    }
    // ---- the end of it
    if (this.ph === 'in') {
      const left = this.items.filter((i) => !i.k.fixed && (ON_SAND.includes(i.state) || i.state === 'held'));
      if (!left.length || this.t > tide.in + 5) this.wrap();
    }
    this.draw(dt);
  }
  /** A boat hands something ashore, just above the water's edge, and somebody comes with it. */
  land(it: Item) {
    const b = this.boats[it.boat] || this.boats[0], n = this.items.filter((i) => i.state === 'shore' && i.boat === it.boat).length;
    it.state = 'shore'; it.x = b.bow - b.side * (7 + n * 7); it.o.setVisible(true).setAlpha(0); this.tweens.add({ targets: it.o, alpha: 1, duration: 300 }); snd.move();
    this.say(`The ${BOATS[b.kind].name} has brought the ${it.label.toLowerCase()}.`);
    const spots = (this.p.guests || []) as number[];
    if (this.guests.length < spots.length) { const i = this.guests.length, pre = `sb_p${1 + (i % (WEAR.length - 1))}`; this.guests.push({ x: b.bow - b.side * 3, tx: spots[i], pre, state: 'walk', wait: 0, seat: 0, o: img(this, 0, 0, pre + '_s').setOrigin(0.5, 1).setDepth(4.5) }); }
  }
  wrap() {
    this.ph = 'end'; this.t = 0; this.me.setVisible(false); this.markT.setText('');
    const held = this.carry; if (held) { this.carry = undefined; this.lose(held); }
    const mine = [...this.boats].sort((a, b) => Math.abs(a.bow - this.x) - Math.abs(b.bow - this.x))[0];
    const toy = this.items.find((i) => i.k.pump && i.state === 'saved'); // if the inflatable was saved, the last one off rides it
    if (toy) { const b = this.boats.find((q) => q.load.includes(toy))!; this.raft = { it: toy, boat: b }; } else this.guests.push({ x: mine.bow, tx: 0, pre: 'sb_p0', state: 'aboard', wait: 0, seat: mine.crew++, boat: mine, o: img(this, 0, 0, 'sb_p0_s').setOrigin(0.5, 1).setDepth(4.5) });
    this.say(this.th.endSay);
    this.time.delayedCall(3800, () => {
      this.ended = true;
      const p = this.p, th = this.th, can = this.items.filter((i) => !i.k.fixed), saved = can.filter((i) => i.state === 'saved').length, lost = can.filter((i) => i.state !== 'saved').map((i) => i.label);
      const ok = saved >= p.need, stars = saved === can.length && this.setN === this.items.length ? 3 : saved >= Math.ceil(can.length * 0.6) ? 2 : 1;
      finish(this, this.def, { success: ok, stars, egg: this.egg, title: ok ? th.title : th.failTitle, text: th.text(this.setN, this.items.length, saved, can.length, lost) + (ok && stars < 3 ? ' For three stars: everything set up before the hour, and nothing left to the tide.' : '') + (ok ? '' : ` Save at least ${p.need} things.`) });
    });
  }

  // ------------------------------------------------------------------ drawing
  draw(dt: number) {
    const n = this.night, th = this.th, lit = 0.3 + 0.7 * n, beat = Math.floor(this.life * 3.9) % 2;
    this.skyN.setAlpha(n); this.seaN.setAlpha(n); this.far.setTint(mix(0xffffff, 0x5a6890, n)); if (this.farMark.visible) { this.padLight.setAlpha(0.55 * n); this.farMark.setTint(mix(0xd8c8c0, 0xffffff, n)); }
    this.beacon?.setAlpha(n * Math.pow(Math.max(0, Math.sin(this.life * 1.3)), 12)); // the lighthouse comes round
    for (const f of this.fx) f.setAlpha(0.6 + 0.4 * Math.sin(this.life * 17 + f.x) * Math.sin(this.life * 7.3));
    // the player
    const gy = this.ground(this.x) + 0.6 + this.py, walking = Math.abs(this.vx) > 2 && this.py === 0, fr = Math.floor(this.step / 5) % 2;
    this.me.setPosition(this.x, gy).setFlipX(this.face < 0).setTexture(`sb_p0_${this.carry ? (walking ? 'c' + fr : 'cs') : walking ? 'w' + fr : 's'}`).setAlpha(this.stun > 0 && Math.floor(this.life * 16) % 2 ? 0.5 : 1);
    // things
    const g = this.g; g.clear(); this.markT.setText('');
    for (const it of this.items) {
      const k = it.k, set = it.state === 'set';
      if (it.state === 'due' || it.state === 'lost') { it.glows.forEach((o) => o.setVisible(false)); it.flame?.setVisible(false); continue; }
      let x = it.x, y = this.ground(it.x) + 0.8, sc = 1;
      if (it.state === 'held') { x = this.x; y = gy - 19 + (walking ? fr * 0.6 : 0); it.o.setRotation(walking ? (fr - 0.5) * 0.08 : 0); }
      else if (it.state === 'saved') { const b = this.boats.find((q) => q.load.includes(it))!, i = b.load.indexOf(it), bw = BOATS[b.kind].w; sc = 0.6; x = b.o.x + b.side * (bw * 0.38 - i * 5.4); y = b.o.y - 1.2; if (this.raft?.it === it) { sc = 1; x = b.o.x + b.side * (bw / 2 + 14); y = this.wle - 2; it.o.setRotation((-b.side * Math.PI) / 2).setOrigin(0.5, 0.5).setDepth(5); } }
      else if (it.wet > 0) y -= Math.min(1.4, it.wet) * (0.6 + 0.4 * Math.sin(this.life * 9)); // lifting off the sand
      if (k.floor && ON_SAND.includes(it.state)) it.o.setRotation(Math.atan2(this.ground(it.x + k.w / 2) - this.ground(it.x - k.w / 2), k.w)); // it lies on the slope
      it.o.setPosition(x, y).setScale(S * sc, S * sc * (k.pump ? 0.14 + 0.86 * it.air : 1)).setTint(it.state === 'saved' ? 0xc8ccd8 : 0xffffff);
      const on = set && this.complete(it) && !it.out;
      for (const o of it.glows) { const [dx, dy] = o.getData('at') as number[]; o.setVisible(on).setPosition(x + dx, y + dy).setAlpha(lit * (k.fire ? 0.5 + 0.08 * Math.sin(this.life * 13) + 0.06 * Math.sin(this.life * 31) : 0.8)); }
      it.flame?.setVisible(on).setPosition(x, y - 3).setScale(S * (0.9 + 0.12 * Math.sin(this.life * 19)), S * (1 + 0.16 * Math.sin(this.life * 23 + 1)));
      // its outline on the sand, while the tide is out
      if (this.ph === 'out' && !set) {
        const my = this.ground(it.mx) + 0.8, mine = it === this.carry, ok = mine && Math.abs(this.x - it.mx) <= SNAP, a = mine ? 0.6 + 0.35 * Math.sin(this.life * 7) : this.carry ? 0.12 : 0.3;
        g.lineStyle(mine ? 0.6 : 0.4, ok ? 0x7cc56b : 0xffffff, a); for (let i = 0; i < k.w; i += 3) { g.lineBetween(it.mx - k.w / 2 + i, my, it.mx - k.w / 2 + Math.min(k.w, i + 1.6), my); g.lineBetween(it.mx - k.w / 2 + i, my - k.h, it.mx - k.w / 2 + Math.min(k.w, i + 1.6), my - k.h); } for (let i = 0; i < k.h; i += 3) { g.lineBetween(it.mx - k.w / 2, my - i, it.mx - k.w / 2, my - Math.min(k.h, i + 1.6)); g.lineBetween(it.mx + k.w / 2, my - i, it.mx + k.w / 2, my - Math.min(k.h, i + 1.6)); }
        if (mine) this.markT.setText(it.label.toUpperCase() + (ok ? ' · SPACE' : '')).setPosition(it.mx, my - k.h - 1.5).setColor(ok ? '#9fe08a' : '#ffffff');
      }
      if (set && k.pump && it.air < 1 && this.ph === 'out' && !this.markT.text) this.markT.setText('HOLD SPACE TO PUMP').setPosition(it.mx, y - 9).setColor('#ffe98a');
      const c = it.chip!;
      if (this.ph === 'out') c.setText(`${this.complete(it) ? '✓' : it.state === 'held' ? '▲' : set ? '◔' : '☐'} ${it.label}`).setColor(this.complete(it) ? '#7cc56b' : it.state === 'held' ? '#ffe98a' : '#ffffff');
      else c.setText(`${it.state === 'saved' ? '✓' : it.state === 'held' ? '▲' : k.fixed ? '–' : '☐'} ${it.label}`).setColor(it.state === 'saved' ? '#7cc56b' : it.state === 'held' ? '#ffe98a' : k.fixed ? '#77809c' : it.wet > 0 && beat ? '#ff6a50' : '#ffffff');
    }
    for (const it of this.items) { if (it.state === 'due') it.chip!.setText(`· ${it.label}`).setColor('#77809c'); if (it.state === 'lost') it.chip!.setText(`✗ ${it.label}`).setColor('#ff6a50'); }
    // the mirror ball's spots sweeping the sand, the dance floor lighting up square by square, and the confetti
    const L = this.beams, tunes = this.items.some((i) => i.k.sound && this.complete(i)); L.clear();
    const ball = this.items.find((i) => i.k.disco && this.complete(i)), flr = this.items.find((i) => i.k.floor && this.complete(i));
    this.spots.forEach((o, i) => {
      if (!ball) return void o.setVisible(false);
      const bx = ball.x, by = this.ground(ball.x) + 4.4 - ball.k.h, x = Phaser.Math.Clamp(bx + 78 * Math.sin(this.life * (0.5 + i * 0.11) + i * 1.7), this.xl + 4, this.xr - 4), y = this.ground(x) + 0.4, col = DISCO[(i + Math.floor(this.life * 0.8)) % DISCO.length];
      o.setVisible(true).setPosition(x, y).setTint(col).setScale((S * 7) / 16, (S * 2.2) / 16).setAlpha(0.8 * lit);
      L.fillStyle(col, 0.06 * lit).fillTriangle(bx, by, x - 5, y, x + 5, y);
    });
    if (flr) for (let i = 0; i < 8; i++) { const tx = flr.x - flr.k.w / 2 + 1.2 + i * 4; L.fillStyle(DISCO[(i + Math.floor(this.life * 3.9)) % DISCO.length], 0.3 + 0.3 * lit).fillRect(tx, this.ground(tx + 1.8) - 1.9, 3.6, 1.7); }
    if (this.bub) { const b = this.bub; b.life -= dt; b.c.setAlpha(Phaser.Math.Clamp(Math.min((b.total - b.life) / 0.16, b.life / 0.4), 0, 1)); if (b.life <= 0) { b.c.destroy(); this.bub = undefined; } }
    const cf = this.conf; cf.clear();
    for (const b of this.bits) { b.life -= dt; b.vy = Math.min(24, b.vy + 110 * dt); b.vx *= 1 - 1.4 * dt; b.x += b.vx * dt; b.y += b.vy * dt; cf.fillStyle(b.col, Math.min(1, b.life)).fillRect(b.x, b.y, 0.4 + Math.abs(Math.sin(b.life * 9 + b.x)) * 1.1, 0.8); }
    this.bits = this.bits.filter((b) => b.life > 0);
    // boats: they float at the water's edge, bow to the sand; dots show the room left
    const h = this.hud; h.clear();
    for (const b of this.boats) {
      const bw = BOATS[b.kind].w; if (this.ph === 'end') b.drift = b.side * 34 * Math.pow(Math.min(1, this.t / 3.6), 2); // the boats pull away
      b.o.setPosition(b.bow + b.drift + b.side * (bw / 2 - 3), this.wle + 0.6 * Math.sin(this.life * 1.7 + b.side)).setRotation(0.03 * Math.sin(this.life * 1.3 + b.side));
      if (this.ph === 'in') for (let i = 0; i < b.cap; i++) { h.fillStyle(i < b.load.length ? 0x7cc56b : 0x0b0e18, 0.95).fillCircle(b.o.x - ((b.cap - 1) * 3.4) / 2 + i * 3.4, b.o.y - BOATS[b.kind].h - 5, 1.2); h.lineStyle(0.3, 0xffffff, 0.8).strokeCircle(b.o.x - ((b.cap - 1) * 3.4) / 2 + i * 3.4, b.o.y - BOATS[b.kind].h - 5, 1.2); }
    }
    // guests and crabs
    for (const q of this.guests) {
      if (q.state === 'aboard' && q.boat) { const bw = BOATS[q.boat.kind].w; q.o.setPosition(q.boat.o.x - q.boat.side * (bw * 0.34 - q.seat * 4.5), q.boat.o.y + 0.5).setDepth(4.8).setTexture(q.pre + '_s').setFlipX(q.boat.side > 0); continue; }
      const moving = q.state === 'walk' || (q.state === 'leave' && q.wait <= 0), gi = this.guests.indexOf(q), up = (beat + gi) % 2, dance = q.state === 'party' && tunes; // they dance once there is music, and jump once the party is complete
      q.o.setPosition(q.x, this.ground(q.x) + 0.6 - (dance && up ? (this.flags.all ? 2 : 0.9) : 0)).setTexture(q.pre + (q.state === 'look' ? '_look' : moving ? '_w' + (Math.floor(this.life * 7) % 2) : dance ? (up ? '_d' : '_ck') : gi % 2 ? '_ck' : '_s')).setFlipX(q.state === 'look' ? th.mark.x < q.x : moving ? (q.state === 'walk' ? q.tx < q.x : (q.boat?.bow ?? 0) < q.x) : q.x > 200);
    }
    for (const c of this.crabs) c.o.setPosition(c.x, this.ground(c.x) + 0.8).setRotation(0.12 * Math.sin(this.life * 30));
    if (this.raft) { const b = this.raft.boat, bw = BOATS[b.kind].w; this.me.setVisible(true).setTexture('sb_p0_cs').setFlipX(b.side > 0).setPosition(b.o.x + b.side * (bw / 2 + 14), this.wle - 5.4 + 0.5 * Math.sin(this.life * 5)).setDepth(5.2).setAlpha(1); this.g.lineStyle(0.3, 0xe8e6df, 0.8).lineBetween(b.o.x + b.side * (bw / 2 - 1), b.o.y - 2, b.o.x + b.side * (bw / 2 + 2), this.wle - 2); }
    // the water in front, the dark, the tide gauge
    const s = this.sea, col = mix(0x35557c, 0x0b1730, n); s.clear();
    s.fillStyle(col, 0.72).fillRect(0, this.wle, W, H - this.wle); s.fillStyle(0xffffff, 0.1 + 0.06 * (1 - n)).fillRect(0, this.wle, W, 0.5);
    for (let i = 0; i < 9; i++) { const x = (i * 41 + this.life * (5 + (i % 3) * 3)) % (W + 30) - 15, y = this.wle + 3 + ((i * 7) % 22); s.fillStyle(0xffffff, 0.05 + 0.04 * (1 - n)).fillRect(x, y, 8 + (i % 4) * 3, 0.4); }
    for (const x of [this.xl, this.xr]) { const e = x + (x === this.xl ? -1 : 1) * (this.wl - this.wle) * 3; s.fillStyle(0xffffff, 0.5).fillEllipse(e, this.wle + 0.3, 9, 1.1); }
    this.dark.clear().fillStyle(0x050818, 0.52 * n).fillRect(0, HZ + 2, W, H - HZ - 2);
    const gx = W - 64, gw = 26, tide = this.p.tide, full = Phaser.Math.Clamp((tide.low - this.wl) / (tide.low - tide.high), 0, 1);
    h.fillStyle(0x000000, 0.5).fillRoundedRect(gx, 9.2, gw, 4.4, 2); h.fillStyle(0x4d9be8, 0.9).fillRoundedRect(gx, 9.2, Math.max(4, gw * full), 4.4, 2);
    this.tideT.setText(this.ph === 'out' ? 'TIDE ▼' : this.ph === 'turn' ? 'TIDE –' : 'TIDE ▲').setColor(this.ph === 'in' ? '#ff9a80' : '#aab4d4');
    this.surf.set(0.4 + 0.25 * full, 0.3);
  }

  // ------------------------------------------------------------------ the bot
  /** One thing at a time: the oldest thing waiting goes to its outline; after the turn the lowest thing goes to the nearest boat with room. It hops crabs and has a look through the telescope. */
  bot() {
    const out = { dir: 0, hop: false, act: false, hold: false, look: false };
    const go = (X: number, tol: number) => { const d = X - this.x; if (Math.abs(d) > tol) out.dir = Math.sign(d); return Math.abs(d) <= tol; };
    const waiting = this.items.filter((i) => i.state === 'shore' || i.state === 'loose');
    if (this.ph === 'out') {
      if (this.carry) { if (go(this.carry.mx, 1)) out.act = true; }
      else if (waiting.length) { if (go(waiting.sort((a, b) => a.at - b.at)[0].x, 2)) out.act = true; }
      else {
        const flat = this.items.find((i) => i.state === 'set' && i.k.pump && i.air < 1), sc = this.items.find((i) => i.k.look && i.state === 'set');
        if (flat) { if (go(flat.x, 2)) out.hold = true; } else if (sc && !this.egg) { if (go(sc.x, 2)) out.look = true; } else go(this.p.start ?? 160, 3);
      }
      for (const c of this.crabs) { const rel = c.v - this.vx, gap = (this.x - c.x) * Math.sign(rel); if (gap > 0 && (gap - PINCH) / Math.abs(rel) < 0.1 && this.py === 0) out.hop = true; } // leave the sand just before it arrives
    } else if (this.ph === 'in') {
      if (this.carry) { const b = this.boats.filter((q) => q.load.length < q.cap).sort((a, c) => Math.abs(a.bow - this.x) - Math.abs(c.bow - this.x))[0]; if (b && go(b.bow, 6)) out.act = true; }
      else { const it = [...waiting, ...this.items.filter((i) => i.state === 'set' && !i.k.fixed)].sort((a, b) => this.ground(b.x) - this.ground(a.x))[0]; if (it && go(it.x, 2)) out.act = true; }
    }
    return out;
  }
}
