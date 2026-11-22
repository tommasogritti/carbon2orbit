import Phaser from 'phaser';

// All art is drawn in code at D texture pixels per world unit. The world stays 320x180 units;
// cameras zoom by D, so a texture shown at scale S covers its size in units at full 1280x720 detail.
export const D = 4;
export const S = 1 / D;
export const UI = '"Chakra Petch"';
/** Data URL of the drawn Peter Beck portrait, for use on DOM cards. */
export let BUST_URL = '';
/** Portrait data URLs by character prefix, for DOM cards. */
export const BUSTS: Record<string, string> = {};
/** Labelled diagrams for story cards, as data URLs, by name. */
export const DIAGRAMS: Record<string, string> = {};

export const P = {
  ink: 0x10131c, night: 0x141826, navy: 0x1b3a6b, sea: 0x2a66b8, sky: 0x6fb7ee, white: 0xe8e6df, grey: 0x8b93a7,
  dgrey: 0x4a5066, red: 0xd8452e, orange: 0xf28c28, yellow: 0xf2d14a, green: 0x4f9d4f, lgreen: 0x7cc56b, dgreen: 0x2f6b3a,
  brown: 0x6b4a2b, dirt: 0x8a5a34, skin: 0xe8b796, carbon: 0x1b1b22, steel: 0xb8c0cc, blue: 0x7fb4ff,
};

export type C2 = CanvasRenderingContext2D;
type Stop = [number, string];

export function tex(scene: Phaser.Scene, key: string, w: number, h: number, fn: (c: C2, w: number, h: number) => void) {
  const t = scene.textures.createCanvas(key, Math.ceil(w * D), Math.ceil(h * D))!;
  const c = t.getContext();
  c.scale(D, D); c.lineJoin = 'round'; c.lineCap = 'round';
  fn(c, w, h);
  t.refresh();
}
export const lg = (c: C2, x0: number, y0: number, x1: number, y1: number, ...stops: Stop[]) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
export const rg = (c: C2, x: number, y: number, r0: number, r1: number, ...stops: Stop[]) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
export const rr = (c: C2, x: number, y: number, w: number, h: number, r: number, fill?: string | CanvasGradient, stroke?: string, lw = 0.4) => { c.beginPath(); c.roundRect(x, y, w, h, r); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } };
export const el = (c: C2, x: number, y: number, rx: number, ry: number, fill?: string | CanvasGradient, stroke?: string, lw = 0.4) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } };
export const poly = (c: C2, pts: number[], fill?: string | CanvasGradient, stroke?: string, lw = 0.4) => { c.beginPath(); for (let i = 0; i < pts.length; i += 2) i ? c.lineTo(pts[i], pts[i + 1]) : c.moveTo(pts[i], pts[i + 1]); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } };
export const line = (c: C2, x0: number, y0: number, x1: number, y1: number, col: string, lw: number) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); };
export const text = (c: C2, s: string, x: number, y: number, size: number, col: string, weight = 600, align: CanvasTextAlign = 'center') => { c.font = `${weight} ${size}px ${UI}`; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, x, y); };
const i3 = (k: number) => (k > 0.66 ? '#8b93a7' : k > 0.33 ? '#6f7890' : '#a8aebc');
/**
 * Lets one backdrop function draw itself in parts, for the hi-fi looks (src/looks/): `pick(k)` gives the real canvas when
 * `part` includes k and a throwaway one when it does not, so the drawing code runs unchanged and in the same order.
 * Each backdrop says what its bits mean; by habit 1 is the shell (sky, sea, walls) and 2 the things in it.
 */
export function parts(c: C2, part: number) { const sink = document.createElement('canvas').getContext('2d')!; return (k: number) => (part & k ? c : sink); }
export function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const OUT = '#0b0c12';

// ---------------------------------------------------------------- Peter Beck
// Likeness notes (from the captioned Commons photos): a big mop of tight dark-brown curls, wider than the face and
// rising from a high hairline; a broad face with a wide jaw; light blue-grey eyes under straight brows; a closed,
// slightly lopsided smile. Today: black top and jeans. In the 1990s workshop level: navy overalls, darker hair.
const hairCols = (young: boolean) => (young ? ['#261a10', '#3d2b1b', '#55402a'] : ['#2e2016', '#463322', '#5e4830']);
function curls(c: C2, cx: number, cy: number, rIn: number, rOut: number, sx: number, sy: number, n: number, size: number, seed: number, young: boolean, a0 = 0.86, a1 = 2.14, keep?: (x: number, y: number) => boolean) {
  const [dk, md, lt] = hairCols(young), r = rng(seed);
  for (let i = 0; i < n; i++) {
    const t = Math.PI * (a0 + (a1 - a0) * r()), d = rIn + (rOut - rIn) * Math.sqrt(r());
    const x = cx + Math.cos(t) * d * sx, y = cy + Math.sin(t) * d * sy, q = size * (0.8 + r() * 0.5), k = r();
    const col = k > 0.8 ? lt : k > 0.3 ? md : dk; const a = r(), b2 = r();
    if (keep && !keep(x, y)) continue;
    el(c, x, y, q, q * 0.92, col, dk, size * 0.14);
    c.beginPath(); c.arc(x, y, q * 0.55, a * 6.28, b2 * 6.28 + 3.6); c.strokeStyle = dk; c.lineWidth = size * 0.16; c.stroke();
    c.beginPath(); c.arc(x - q * 0.2, y - q * 0.25, q * 0.5, 3.6, 5.2); c.strokeStyle = 'rgba(255,225,180,.18)'; c.lineWidth = size * 0.12; c.stroke();
  }
}
/**
 * Outfits: '' everyday, 'S' yellow suit and helmet, 'J' jet pack, 'H' hi-vis vest and hard hat, 'B' gumboots and a checked bush shirt,
 * 'T' clean-room coverall and safety glasses, 'L' carbon-weave jacket, 'F' face shield, apron and cryogenic gauntlets, 'M' methane-oxygen pack.
 */
export type Fit = '' | 'S' | 'J' | 'H' | 'B' | 'T' | 'L' | 'F' | 'M';
function peter(c: C2, leg: number, air = false, young = false, fit: Fit = '', adam = false) {
  const limb = (x0: number, y0: number, ang: number, len: number, w: number, col: string) => { const x1 = x0 + Math.sin(ang) * len, y1 = y0 + Math.cos(ang) * len; line(c, x0, y0, x1, y1, OUT, w + 0.7); line(c, x0, y0, x1, y1, col, w); return [x1, y1]; };
  const a = leg * 0.62, skin = '#eebf9f', skinD = '#dba283';
  const suit = fit === 'S', boots = fit === 'B', clean = fit === 'T', weave = fit === 'L', cryo = fit === 'F';
  const legA = clean ? '#cfd6e2' : suit ? '#d9b93a' : adam ? '#2a2e3c' : young ? '#24406f' : '#263f6b', legB = clean ? '#f2f5fa' : suit ? '#f2d14a' : adam ? '#353a4c' : young ? '#2b4f8a' : '#30508a';
  const shoe = (x: number, y: number) => {
    if (boots) { rr(c, x - 1.9, y - 5, 4, 6.2, 1, '#17181e', OUT, 0.35); rr(c, x - 1.9, y - 0.6, 5.2, 2.4, 1, '#17181e', OUT, 0.35); rr(c, x - 1.9, y - 5, 4, 1.1, 0.4, '#d8452e'); return; } // gumboots with a red band
    if (clean) { rr(c, x - 1.8, y - 1.4, 4.8, 2.8, 1.2, '#4d9be8', OUT, 0.35); return; } // blue shoe covers
    rr(c, x - 1.6, y - 1.1, 4.4, 2.3, 1, suit ? '#3a3f4f' : young ? '#6b4a2b' : '#23262f', OUT, 0.35); rr(c, x - 1.6, y + 0.5, 4.4, 0.7, 0.3, young || suit ? '#3a2715' : '#e8e6df');
  };
  // the apprentice has a short-sleeved tee under overalls; today it is a long-sleeved black top
  const arm = (x: number, ang: number, back: boolean) => {
    if (suit) { const [hx, hy] = limb(x, 18, ang, 5.6, 2.6, back ? '#d9b93a' : '#f2d14a'); el(c, hx, hy + 0.5, 1.3, 1.3, '#3a3f4f', OUT, 0.3); }
    else if (clean) { const [hx, hy] = limb(x, 18, ang, 5.6, 2.6, back ? '#cfd6e2' : '#f2f5fa'); el(c, hx, hy + 0.5, 1.3, 1.3, '#4d9be8', OUT, 0.3); }
    else if (weave) { const [hx, hy] = limb(x, 18, ang, 5.6, 2.6, back ? '#101116' : '#22242c'); rr(c, hx - 1.3, hy - 1, 2.6, 0.9, 0.3, '#2fd0c0'); el(c, hx, hy + 0.5, 1.2, 1.2, back ? skinD : skin, OUT, 0.3); }
    else if (cryo) { const [hx, hy] = limb(x, 18, ang, 3, 2.5, back ? '#0f1014' : '#1b1c23'); const [gx, gy] = limb(hx, hy, ang, 3.2, 3.3, back ? '#2a5fa8' : '#3f7fd0'); el(c, gx, gy + 0.4, 1.7, 1.6, back ? '#2a5fa8' : '#3f7fd0', OUT, 0.3); }
    else if (boots) { const [hx, hy] = limb(x, 18, ang, 5.6, 2.5, back ? '#8f2a1c' : '#b8342a'); el(c, hx, hy + 0.5, 1.2, 1.2, back ? skinD : skin, OUT, 0.3); }
    else if (adam) { const [hx, hy] = limb(x, 18, ang, 5.6, 2.6, back ? '#141c30' : '#1f2b47'); rr(c, hx - 1.3, hy - 0.9, 2.6, 1, 0.3, '#f4f4f0'); el(c, hx, hy + 0.6, 1.2, 1.2, back ? skinD : skin, OUT, 0.3); }
    else if (young) { limb(x, 18.2, 0, 1.6, 2.6, '#cfd5df'); const [hx, hy] = limb(x, 19, ang, 5, 2.1, back ? skinD : skin); el(c, hx, hy, 1.25, 1.25, back ? skinD : skin, OUT, 0.3); }
    else { const [hx, hy] = limb(x, 18, ang, 5.6, 2.5, back ? '#0f1014' : '#1b1c23'); el(c, hx, hy + 0.5, 1.2, 1.2, back ? skinD : skin, OUT, 0.3); }
  };
  if (fit === 'M') for (const [x, col] of [[4.6, '#bfe3ff'], [15.4, '#c8f0c0']] as [number, string][]) { // methane and liquid-oxygen bottles, frosted, with a blue-flame nozzle each
    rr(c, x, 14, 4, 11, 2, lg(c, x, 0, x + 4, 0, [0, '#ffffff'], [0.5, col], [1, '#6f8fb0']), OUT, 0.35); rr(c, x, 16.4, 4, 1, 0, '#1d3a7a'); poly(c, [x + 0.8, 25, x + 3.2, 25, x + 3.8, 27.4, x + 0.2, 27.4], '#3a3c48', OUT, 0.25); el(c, x + 2, 15.2, 1.2, 0.5, 'rgba(255,255,255,.8)');
  }
  if (fit === 'J') for (const x of [4.6, 15.4]) { // jet pack: twin tanks behind the shoulders
    rr(c, x, 14.6, 4, 10.4, 1.8, lg(c, x, 0, x + 4, 0, [0, '#f2f4f8'], [0.5, '#b8c0cc'], [1, '#6f7890']), OUT, 0.35); rr(c, x, 17, 4, 1, 0, '#d8452e'); poly(c, [x + 0.8, 25, x + 3.2, 25, x + 3.8, 27.4, x + 0.2, 27.4], '#3a3c48', OUT, 0.25);
  }
  arm(15.6, a * 0.9 + (air ? -2.2 : 0), true);
  const [l1x, l1y] = limb(13.3, 25, -a, 6.2, 3.0, legA); shoe(l1x, l1y + 0.6);
  const [l2x, l2y] = limb(10.7, 25, a + (air ? 0.5 : 0), 6.2, 3.0, legB); shoe(l2x, l2y + 0.6);
  // torso
  if (suit) {
    rr(c, 7.4, 16.6, 9.2, 9.4, 2.2, lg(c, 7.4, 0, 16.6, 0, [0, '#ffe98a'], [0.5, '#f2d14a'], [1, '#c9a52a']), OUT, 0.4); line(c, 12, 16.8, 12, 25.6, '#8a6a12', 0.4); rr(c, 7.6, 22.6, 8.8, 1.1, 0, '#3a3f4f');
  } else if (clean) { // white coverall with a zip and a chest badge
    rr(c, 7.2, 16.4, 9.6, 9.8, 2.4, lg(c, 7.2, 0, 16.8, 0, [0, '#ffffff'], [0.6, '#eef2f7'], [1, '#c2cad8']), OUT, 0.4); line(c, 12, 16.6, 12, 26, '#9aa3b5', 0.35); rr(c, 13.2, 18.6, 2.4, 1.6, 0.3, '#4d9be8'); rr(c, 7.4, 23.2, 9.2, 0.8, 0, '#cfd6e2');
  } else if (weave) { // carbon twill, with a bright edge so it reads against dark backgrounds
    rr(c, 7.2, 16.4, 9.6, 9.8, 2.2, '#1b1c23', OUT, 0.4); c.save(); c.beginPath(); c.roundRect(7.2, 16.4, 9.6, 9.8, 2.2); c.clip(); for (let i = -4; i < 10; i++) { line(c, 7 + i * 1.5, 26.4, 12 + i * 1.5, 16.2, 'rgba(120,128,150,.55)', 0.4); line(c, 7 + i * 1.5, 16.2, 12 + i * 1.5, 26.4, 'rgba(60,64,80,.6)', 0.4); } c.restore();
    rr(c, 7.2, 16.4, 9.6, 9.8, 2.2, undefined, '#2fd0c0', 0.5); line(c, 12, 16.6, 12, 26, '#2fd0c0', 0.45);
  } else if (boots) {
    rr(c, 7.4, 16.6, 9.2, 9.4, 2.2, '#b8342a', OUT, 0.4); c.save(); c.beginPath(); c.roundRect(7.4, 16.6, 9.2, 9.4, 2.2); c.clip(); for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(15,15,20,.55)'; c.fillRect(7.4 + i * 2.6, 16.6, 1.2, 9.4); c.fillRect(7.4, 17.4 + i * 2.6, 9.2, 1.2); } c.restore();
  } else if (adam) { // navy blazer over an open-collar white shirt
    rr(c, 6.6, 16.4, 10.8, 9.8, 2.4, lg(c, 6.6, 0, 17.4, 0, [0, '#26355a'], [0.5, '#1c2740'], [1, '#121a2e']), OUT, 0.4); // broad shoulders
    poly(c, [10, 16.6, 14, 16.6, 12, 23], '#cfe0f2'); poly(c, [10, 16.6, 12, 19.4, 10.6, 20.2], '#e2e6ee', OUT, 0.2); poly(c, [14, 16.6, 12, 19.4, 13.4, 20.2], '#e2e6ee', OUT, 0.2);
    line(c, 9.6, 16.8, 12, 23.4, '#0f1626', 0.5); line(c, 14.4, 16.8, 12, 23.4, '#0f1626', 0.5); el(c, 12, 24.6, 0.4, 0.4, '#0f1626');
  } else if (young) {
    rr(c, 7.6, 16.6, 8.8, 9.4, 2.2, '#cfd5df', OUT, 0.4);
    rr(c, 8.4, 19.6, 7.2, 6.6, 1, '#2b4f8a', OUT, 0.3); line(c, 9.2, 19.8, 9.6, 16.8, '#2b4f8a', 1.1); line(c, 14.8, 19.8, 14.4, 16.8, '#2b4f8a', 1.1); el(c, 9.3, 20.4, 0.4, 0.4, '#f2d14a'); el(c, 14.7, 20.4, 0.4, 0.4, '#f2d14a');
  } else {
    rr(c, 7.4, 16.6, 9.2, 9.4, 2.2, lg(c, 7.4, 0, 16.6, 0, [0, '#24252d'], [0.5, '#17181e'], [1, '#0d0e12']), OUT, 0.4);
    poly(c, [10.2, 16.5, 12, 18.6, 9.4, 18.4], '#2c2d37'); poly(c, [13.8, 16.5, 12, 18.6, 14.6, 18.4], '#2c2d37'); line(c, 12, 18.6, 12, 25.6, '#33343f', 0.3);
  }
  if (fit === 'H') { // hi-vis vest with reflective bands
    rr(c, 8, 16.8, 8, 8.6, 1.4, '#ff7a1a', OUT, 0.35); rr(c, 8, 20.4, 8, 1.1, 0, '#e8eef2'); rr(c, 8, 22.6, 8, 1.1, 0, '#e8eef2'); rr(c, 9.4, 16.8, 1, 8.6, 0, '#ffe98a'); rr(c, 13.6, 16.8, 1, 8.6, 0, '#ffe98a'); poly(c, [10.4, 16.8, 12, 19.4, 13.6, 16.8], '#17181e');
  }
  if (cryo) { rr(c, 8.2, 17.4, 7.6, 10.6, 1, lg(c, 0, 17, 0, 28, [0, '#4d8fdc'], [1, '#2a5fa8']), OUT, 0.35); line(c, 9.4, 17.4, 10.6, 16.6, '#2a5fa8', 0.7); line(c, 14.6, 17.4, 13.4, 16.6, '#2a5fa8', 0.7); rr(c, 10.4, 21, 3.2, 2.4, 0.4, '#2a5fa8', 'rgba(0,0,0,.3)', 0.25); } // long apron
  if (fit === 'J' || fit === 'M') { line(c, 9, 16.8, 10.2, 25.4, '#3a3f4f', 0.9); line(c, 15, 16.8, 13.8, 25.4, '#3a3f4f', 0.9); rr(c, 9.4, 20.4, 5.2, 1.1, 0.3, '#3a3f4f'); }
  rr(c, adam ? 9 : 9.6, 14.6, adam ? 6 : 4.8, 2.6, 0.8, skinD);
  // hair behind, then a broad, square-jawed face
  if (!adam) el(c, 12, 7.6, 6.9, 6.7, hairCols(young)[0]);
  else { el(c, 6.9, 10.4, 0.8, 1.5, skinD, OUT, 0.3); el(c, 17.1, 10.4, 0.8, 1.5, skinD, OUT, 0.3); } // shaved head: small flat ears
  const hx = adam ? 7.2 : 6.7, ht = adam ? 1.6 : 3.4; // Adam: a longer, narrower head
  c.beginPath(); c.moveTo(hx, 9.4); c.bezierCurveTo(hx, ht, 24 - hx, ht, 24 - hx, 9.4); c.bezierCurveTo(24 - hx + 0.1, 12.4, 17, 14, 15.6, 15.3); c.bezierCurveTo(14.4, 16.4, 9.6, 16.4, 8.4, 15.3); c.bezierCurveTo(7, 14, hx - 0.1, 12.4, hx, 9.4); c.closePath();
  c.fillStyle = lg(c, 6, 4, 18, 16, [0, '#f4c9aa'], [1, skinD]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.4; c.stroke();
  if (!adam) { curls(c, 12, 8.4, 4.6, 6.9, 0.97, 1.0, 130, 0.85, 7, young, 0.95, 2.05, (x, y) => y < 5.6 || Math.abs(x - 12) > 4.7); curls(c, 12, 8.4, 6.9, 7.7, 0.97, 1.0, 16, 0.6, 9, young, 1.0, 2.0); }
  else { el(c, 10.6, 4.8, 2.4, 1.1, 'rgba(255,255,255,.3)'); c.beginPath(); c.arc(12, 9.6, 5.4, Math.PI * 1.15, Math.PI * 1.85); c.strokeStyle = 'rgba(120,90,75,.25)'; c.lineWidth = 0.5; c.stroke(); }
  if (fit === 'S') { // open-face helmet: the curls still escape at the sides
    c.beginPath(); c.moveTo(5.2, 9.6); c.bezierCurveTo(4.6, -0.6, 19.4, -0.6, 18.8, 9.6); c.lineTo(17, 9.6); c.bezierCurveTo(17, 5.4, 7, 5.4, 7, 9.6); c.closePath(); c.fillStyle = lg(c, 5, 0, 19, 0, [0, '#ffffff'], [0.6, '#e4e8ee'], [1, '#aab2c0']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.4; c.stroke();
    c.beginPath(); c.moveTo(12, 0.6); c.lineTo(12, 5.6); c.strokeStyle = '#d8452e'; c.lineWidth = 1.6; c.stroke(); rr(c, 6.6, 5.8, 10.8, 1.3, 0.6, 'rgba(160,215,255,.75)', OUT, 0.25);
  }
  if (fit === 'H') { // hard hat perched on the curls
    c.beginPath(); c.moveTo(6.2, 5.6); c.bezierCurveTo(6.2, -0.8, 17.8, -0.8, 17.8, 5.6); c.closePath(); c.fillStyle = lg(c, 6, 0, 18, 0, [0, '#ffffff'], [1, '#c2c8d2']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.4; c.stroke();
    rr(c, 4.8, 5, 14.4, 1.4, 0.7, '#f4f4f0', OUT, 0.35); line(c, 12, 0.8, 12, 5, 'rgba(0,0,0,.2)', 0.5);
  }
  if (clean || weave) { for (const ex of [9.9, 14.1]) rr(c, ex - 1.5, 8.9, 3, 2, 0.6, 'rgba(190,230,255,.45)', clean ? '#4d9be8' : '#2fd0c0', 0.3); line(c, 11.4, 9.7, 12.6, 9.7, clean ? '#4d9be8' : '#2fd0c0', 0.3); } // safety glasses
  if (fit === 'J' || fit === 'M') { const gy = adam ? 14.4 : 6.2; rr(c, 7.4, gy, 9.2, 2.2, 1, '#23262f', OUT, 0.3); el(c, 9.8, gy + 1.1, 1.5, 1.0, 'rgba(160,215,255,.85)', OUT, 0.25); el(c, 14.2, gy + 1.1, 1.5, 1.0, 'rgba(160,215,255,.85)', OUT, 0.25); } // goggles pushed up on the forehead (round the neck for a shaved head, so it still shows)
  // small, hooded grey-blue eyes; straight brows; a flat, closed, slightly lopsided smile
  el(c, 9.9, 9.9, 0.85, 0.5, '#fbfbf8'); el(c, 14.1, 9.9, 0.85, 0.5, '#fbfbf8');
  el(c, 10, 9.95, 0.44, 0.46, adam ? '#5c6770' : '#6f8799'); el(c, 14.2, 9.95, 0.44, 0.46, adam ? '#5c6770' : '#6f8799'); el(c, 10, 9.95, 0.2, 0.22, '#111'); el(c, 14.2, 9.95, 0.2, 0.22, '#111');
  line(c, 8.9, 9.25, 10.9, 9.25, '#2e2016', 0.34); line(c, 13.1, 9.25, 15.1, 9.25, '#2e2016', 0.34);
  line(c, 8.8, 8.7, 11, adam ? 8.95 : 8.55, adam ? '#a08c78' : '#6a5038', 0.38); line(c, 13, adam ? 8.95 : 8.55, 15.2, 8.7, adam ? '#a08c78' : '#6a5038', 0.38);
  c.beginPath(); c.moveTo(12.2, 10.2); c.quadraticCurveTo(12.9, 11.8, 12.1, 12.1); c.strokeStyle = '#c98f72'; c.lineWidth = 0.35; c.stroke();
  c.beginPath(); c.moveTo(adam ? 10.5 : 10.2, adam ? 13.5 : 13.3); c.quadraticCurveTo(12.2, adam ? 13.6 : 14.5, adam ? 13.7 : 14, adam ? 13.5 : 13.0); c.strokeStyle = '#8a4b3c'; c.lineWidth = 0.45; c.stroke();
  if (!adam) { c.fillStyle = rg(c, 8.5, 12, 0, 1.6, [0, 'rgba(226,120,100,.22)'], [1, 'rgba(226,120,100,0)']); c.fillRect(6.5, 10.2, 4, 3.6); c.fillStyle = rg(c, 15.5, 12, 0, 1.6, [0, 'rgba(226,120,100,.22)'], [1, 'rgba(226,120,100,0)']); c.fillRect(13.5, 10.2, 4, 3.6); }
  if (cryo) { rr(c, 6, 5.2, 12, 1.5, 0.7, '#f2d14a', OUT, 0.3); c.beginPath(); c.moveTo(6.6, 6.6); c.lineTo(17.4, 6.6); c.quadraticCurveTo(18, 12.5, 15.6, 15.8); c.lineTo(8.4, 15.8); c.quadraticCurveTo(6, 12.5, 6.6, 6.6); c.closePath(); c.fillStyle = 'rgba(190,232,255,.34)'; c.fill(); c.strokeStyle = 'rgba(220,245,255,.9)'; c.lineWidth = 0.35; c.stroke(); line(c, 8.2, 7.6, 9, 13.6, 'rgba(255,255,255,.55)', 0.5); } // clear face shield on a yellow headband: the curls stay out
  arm(8.4, -a * 0.9 + (air ? 2.2 : 0), false);
}
/** Head-and-shoulders portrait, 48 x 54 units. Adult proportions: eyes a little above the middle, long lower face, heavy jaw. */
// Shaun D'Mello (from the captioned black-and-white portrait on Rocket Lab's team page): short dark hair, cropped close at the
// sides and brushed up and back on top; clean-shaven; no glasses; a rounded-oval face with full cheeks and dark brows; a
// blazer over an open-neck white shirt. Colours cannot be read from that photo and are the game's choice; the skin tone is set
// a step deeper than Peter's and Adam's because the photo reads that way, and still wants checking against a colour photo.
function bust(c: C2, young = false, adam = false, shaun = false) {
  const dk = hairCols(young)[0], hy = young ? 1.12 : 1.05, jaw = young ? 1 : 0, nw = young ? 12.5 : adam ? 17.4 : shaun ? 16 : 15.2;
  const onFace = (x: number, y: number) => y > 12.6 && Math.abs(x - 24) < 11.4; // keeps a squarish, high hairline with the corners exposed
  if (!adam && !shaun) el(c, 24, 18.5, 16.5, 17, dk);
  // shoulders, neck, collar
  c.beginPath(); c.moveTo(0, 54); c.quadraticCurveTo(3, 46.8, 15, 45.4); c.lineTo(33, 45.4); c.quadraticCurveTo(45, 46.8, 48, 54); c.closePath();
  c.fillStyle = young ? '#cfd5df' : shaun ? lg(c, 0, 0, 48, 0, [0, '#5a6072'], [0.5, '#3f4454'], [1, '#2a2e3a']) : adam ? lg(c, 0, 0, 48, 0, [0, '#2a3a62'], [0.5, '#1c2740'], [1, '#111a2e']) : lg(c, 0, 0, 48, 0, [0, '#26272f'], [0.5, '#17181e'], [1, '#0c0d11']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.5; c.stroke();
  if (young) { rr(c, 11, 50, 26, 6, 1, '#2b4f8a', OUT, 0.4); line(c, 14.5, 50, 16.5, 45.6, '#2b4f8a', 3); line(c, 33.5, 50, 31.5, 45.6, '#2b4f8a', 3); }
  rr(c, 24 - nw / 2, 35, nw, 13, 3, shaun ? lg(c, 0, 38, 0, 48, [0, '#96694a'], [1, '#bd8c68']) : lg(c, 0, 38, 0, 48, [0, '#c08a6e'], [1, '#e0aa8b']));
  if (adam || shaun) { poly(c, [17, 44.8, 31, 44.8, 24, 54], '#cfe0f2'); poly(c, [16.4, 44.4, 24, 49.4, 19, 52.2], '#dfeaf6', OUT, 0.35); poly(c, [31.6, 44.4, 24, 49.4, 29, 52.2], '#dfeaf6', OUT, 0.35); line(c, 14.4, 45.6, 21.6, 54, '#0f1626', 0.8); line(c, 33.6, 45.6, 26.4, 54, '#0f1626', 0.8); }
  else if (!young) { poly(c, [14.6, 44.6, 24, 50.6, 13.4, 50], '#2c2d37', OUT, 0.35); poly(c, [33.4, 44.6, 24, 50.6, 34.6, 50], '#2c2d37', OUT, 0.35); line(c, 24, 50.6, 24, 54, '#3a3b47', 0.5); }
  else { c.beginPath(); c.arc(24, 44.6, 6.6, 0.15, Math.PI - 0.15); c.strokeStyle = '#aab2c0'; c.lineWidth = 1; c.stroke(); }
  // side hair first, so the cheeks sit in front of it; ears mostly hidden
  if (!adam && !shaun) curls(c, 24, 20.5, 10.5, 16, 0.95, hy, 430, 1.7, 23, young, 0.86, 2.14, (_x, y) => y > 21);
  if (adam || shaun) { const ear = shaun ? '#b98862' : '#dba283'; el(c, 12.4, 26, 1.5, 3.3, ear, OUT, 0.45); el(c, 35.6, 26, 1.5, 3.3, ear, OUT, 0.45); } // small, flat ears
  else { el(c, 11.6, 26.4, 1.5, 3, '#d39a7b'); el(c, 36.4, 26.4, 1.5, 3, '#d39a7b'); }
  // broad face, wide short jaw
  const jx = (adam ? 14.2 : shaun ? 13.4 : 12.6) + jaw, cy = adam ? 43 : shaun ? 41.4 : 42, sx = adam ? 13 : shaun ? 12.2 : 11.6; // Adam: a long, tall oval with a heavy jaw; Shaun: rounder, fuller cheeks
  const dome = adam ? 0.5 : shaun ? 4 : 7.5; // a shaved head shows the whole cranium
  c.beginPath(); c.moveTo(sx, 21); c.bezierCurveTo(sx, dome, 48 - sx, dome, 48 - sx, 21); c.bezierCurveTo(48 - sx + 0.2, 27, 48 - jx + 1.5, 32.4, 48 - jx, 36.8); c.bezierCurveTo(48 - jx - 1.8, 40, 29.6, cy, 24, cy); c.bezierCurveTo(18.4, cy, jx + 1.8, 40, jx, 36.8); c.bezierCurveTo(jx - 1.5, 32.4, sx - 0.2, 27, sx, 21); c.closePath();
  c.fillStyle = shaun ? rg(c, 21.5, 22, 2, 25, [0, '#dcae8a'], [0.65, '#c99872'], [1, '#a97a58']) : rg(c, 21.5, 22, 2, 25, [0, '#f6cfb3'], [0.65, '#ecb999'], [1, '#d49b7c']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.5; c.stroke();
  const blush = young ? 0.3 : adam ? 0.08 : 0.2;
  if (shaun) for (const x of [17.2, 30.8]) { c.fillStyle = rg(c, x, 32.6, 0, 5.4, [0, 'rgba(226,182,148,.5)'], [1, 'rgba(226,182,148,0)']); c.fillRect(x - 6, 27, 12, 12); } // full cheeks
  c.fillStyle = rg(c, 16.6, 30.6, 0, 4.6, [0, `rgba(222,110,95,${blush})`], [1, 'rgba(222,110,95,0)']); c.fillRect(11, 25, 12, 12);
  c.fillStyle = rg(c, 31.4, 30.6, 0, 4.6, [0, `rgba(222,110,95,${blush})`], [1, 'rgba(222,110,95,0)']); c.fillRect(25, 25, 12, 12);
  // top hair: tallest on top, fine tight ringlets, dark chocolate brown
  if (shaun) { // short and dark: close at the sides, a little longer on top and brushed up and back
    c.beginPath(); c.moveTo(12, 22.4); c.bezierCurveTo(10.8, 10.6, 16, 5, 25, 4.6); c.bezierCurveTo(33.4, 5, 37.4, 10.6, 36, 22.4); c.lineTo(34.8, 17.4); c.bezierCurveTo(33, 12.4, 28, 11.6, 23, 12.4); c.bezierCurveTo(18.6, 13, 14.4, 13.4, 13.2, 17.4); c.closePath();
    c.fillStyle = lg(c, 12, 2, 36, 14, [0, '#2a211a'], [0.6, '#17120d'], [1, '#0e0b08']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.45; c.stroke();
    for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(15 + i * 2.3, 12.2 - Math.sin(i * 0.4) * 0.6); c.quadraticCurveTo(17 + i * 2.2, 8, 20.5 + i * 1.7, 5.8); c.strokeStyle = 'rgba(120,100,84,.35)'; c.lineWidth = 0.35; c.stroke(); }
  } else if (!adam) { curls(c, 24, 20.5, 10.5, 16, 0.95, hy, 430, 1.7, 23, young, 0.86, 2.14, (x, y) => y <= 21 && !onFace(x, y)); curls(c, 24, 20.5, 16, 17.6, 0.95, 1.05, 46, 1.15, 31, young, 0.95, 2.05); } // stray ringlets break up the outline
  else { el(c, 19.6, 11.6, 5.4, 2.6, 'rgba(255,255,255,.28)'); c.fillStyle = rg(c, 24, 14, 4, 16, [0, 'rgba(120,95,80,0)'], [1, 'rgba(120,95,80,.16)']); c.fillRect(11, 6, 26, 12); line(c, 18.4, 15.6, 29.6, 15.4, 'rgba(170,112,90,.35)', 0.35); line(c, 19.4, 17.4, 28.6, 17.2, 'rgba(170,112,90,.28)', 0.3); }
  // eyes: small, narrow, grey-blue, a little hooded
  for (const ex of [18.9, 29.1]) {
    el(c, ex, 23.1, 2.35, young ? 1.3 : adam ? 0.85 : 1.1, '#fbfbf8'); el(c, ex + 0.1, 23.15, 1.05, 1.05, shaun ? '#4a3524' : adam ? '#6b747c' : '#7f97aa', shaun ? '#2a1c12' : adam ? '#3f464c' : '#4a6072', 0.28); el(c, ex + 0.1, 23.15, 0.48, 0.5, '#0e0e12');
    c.beginPath(); c.moveTo(ex - 2.6, 23.1); c.quadraticCurveTo(ex, 21.3, ex + 2.6, 22.9); c.strokeStyle = '#2e2016'; c.lineWidth = 0.7; c.stroke();
    c.beginPath(); c.moveTo(ex - 2.8, 22.0); c.quadraticCurveTo(ex, 20.7, ex + 2.9, 22.1); c.strokeStyle = 'rgba(175,115,92,.7)'; c.lineWidth = 0.4; c.stroke();
    c.beginPath(); c.moveTo(ex - 2.1, 24.3); c.quadraticCurveTo(ex, 25, ex + 2.2, 24.2); c.strokeStyle = 'rgba(175,115,92,.55)'; c.lineWidth = 0.35; c.stroke();
    if (!young) { c.beginPath(); c.moveTo(ex - 1.8, 25.6); c.quadraticCurveTo(ex, 26.1, ex + 2, 25.4); c.strokeStyle = 'rgba(175,115,92,.25)'; c.lineWidth = 0.3; c.stroke(); }
  }
  if (adam) { line(c, 15.6, 20.6, 21.8, 21.3, '#a08c78', 0.8); line(c, 26.2, 21.3, 32.4, 20.6, '#a08c78', 0.8); // pale brows set low over deep-set eyes
    line(c, 23.2, 19.6, 23.4, 21.2, 'rgba(150,95,78,.5)', 0.35); line(c, 24.8, 19.6, 24.6, 21.2, 'rgba(150,95,78,.5)', 0.35); }
  else if (shaun) { line(c, 15.6, 20.3, 21.8, 20.0, '#1c1510', 1.15); line(c, 26.2, 20.0, 32.4, 20.3, '#1c1510', 1.15); }
  else { line(c, 15.8, 20.5, 21.6, 20.2, '#6a5038', 0.8); line(c, 26.4, 20.2, 32.2, 20.5, '#6a5038', 0.8); }
  // nose
  c.beginPath(); c.moveTo(25, 23.2); c.quadraticCurveTo(26.9, 28.8, 26.5, 29.9); c.quadraticCurveTo(24.4, 31.6, 21.7, 30.1); c.strokeStyle = 'rgba(180,115,92,.85)'; c.lineWidth = 0.55; c.stroke();
  el(c, 22.5, 30.3, 0.6, 0.35, 'rgba(150,85,70,.6)'); el(c, 25.7, 30.3, 0.6, 0.35, 'rgba(150,85,70,.6)');
  // closed, thin-lipped smile, a touch higher on one side
  if (shaun) { c.beginPath(); c.moveTo(19.6, 34.4); c.quadraticCurveTo(24, 36.6, 28.4, 34.4); c.strokeStyle = '#8a4338'; c.lineWidth = 0.75; c.stroke(); line(c, 19.1, 33.9, 19.6, 34.7, 'rgba(150,90,75,.6)', 0.35); line(c, 28.9, 33.9, 28.4, 34.7, 'rgba(150,90,75,.6)', 0.35); } // a slight, closed, even smile
  else if (adam) { c.beginPath(); c.moveTo(20.2, 34.8); c.quadraticCurveTo(24, 35.0, 27.8, 34.8); c.strokeStyle = '#8a4338'; c.lineWidth = 0.75; c.stroke(); } // straight, closed mouth
  else {
    c.beginPath(); c.moveTo(19.4, 34.7); c.quadraticCurveTo(24.2, 36.9, 28.8, 34.1); c.strokeStyle = '#8a4338'; c.lineWidth = 0.75; c.stroke();
    line(c, 18.9, 34.1, 19.4, 35, 'rgba(150,90,75,.7)', 0.35); line(c, 29.3, 33.5, 28.9, 34.4, 'rgba(150,90,75,.7)', 0.35);
  }
  if (!young) {
    c.beginPath(); c.moveTo(16.2, 29.6); c.quadraticCurveTo(16.6, 32.8, 18, 34.6); c.strokeStyle = 'rgba(180,120,98,.4)'; c.lineWidth = 0.4; c.stroke();
    c.beginPath(); c.moveTo(31.8, 29.6); c.quadraticCurveTo(31.4, 32.4, 30.2, 34); c.strokeStyle = 'rgba(180,120,98,.4)'; c.lineWidth = 0.4; c.stroke();
    c.beginPath(); c.arc(24, 37.8, 3, 0.6, Math.PI - 0.6); c.strokeStyle = 'rgba(170,112,90,.22)'; c.lineWidth = 0.4; c.stroke();
  }
}

// ---------------------------------------------------------------- Ashlee Vance (running mate in Rosie the Robot)
// Likeness notes, from the captioned Commons photo of him at a signing for his Elon Musk biography (2015): shaggy mid-brown
// hair, parted on his right (the viewer's left), the fringe swept across the forehead and the sides long enough to cover the ears
// and reach the jaw; a broad-cheeked face with a wide, open, squinting smile and laughter lines; a little stubble; a green shirt
// checked with blue and white, worn open over a dark V-neck tee. In the game he also carries a reporter's notebook and a camera
// on a strap, because he was at the factory reporting a book. (Revised after the fan review of 22 Nov 2026: the parting had been
// mirrored and the hair was too short.)
const VH = ['#3e2a1a', '#5a3d26', '#80603e']; // hair: dark, mid, light
const plaid = (c: C2, x: number, y: number, w: number, h: number, r: number, base = '#3f6b3a', step = 2.2) => {
  rr(c, x, y, w, h, r, base, OUT, 0.4); c.save(); c.beginPath(); c.roundRect(x, y, w, h, r); c.clip();
  for (let i = 0; i * step < Math.max(w, h) + step; i++) { c.fillStyle = 'rgba(40,70,150,.5)'; c.fillRect(x + 0.4 + i * step, y, step * 0.4, h); c.fillRect(x, y + 0.6 + i * step, w, step * 0.4); c.fillStyle = 'rgba(240,245,255,.4)'; c.fillRect(x + step * 0.72 + i * step, y, step * 0.14, h); c.fillRect(x, y + step * 0.82 + i * step, w, step * 0.12); }
  c.restore();
};
function vance(c: C2, leg: number, air = false, flash = false) {
  const limb = (x0: number, y0: number, ang: number, len: number, w: number, col: string) => { const x1 = x0 + Math.sin(ang) * len, y1 = y0 + Math.cos(ang) * len; line(c, x0, y0, x1, y1, OUT, w + 0.7); line(c, x0, y0, x1, y1, col, w); return [x1, y1]; };
  const a = leg * 0.62, skinD = '#d69f80';
  const shoe = (x: number, y: number) => { rr(c, x - 1.6, y - 1.2, 4.4, 2.4, 1, '#5b3d22', OUT, 0.35); rr(c, x - 1.6, y + 0.5, 4.4, 0.7, 0.3, '#2a1c10'); };
  { const [hx, hy] = limb(15.6, 18, a * 0.9 + (air ? -2.2 : 0), 5.6, 2.6, '#2f5530'); el(c, hx, hy + 0.5, 1.2, 1.2, skinD, OUT, 0.3); }
  const [l1x, l1y] = limb(13.3, 25, -a, 6.2, 3.0, '#33527f'); shoe(l1x, l1y + 0.6);
  const [l2x, l2y] = limb(10.7, 25, a + (air ? 0.5 : 0), 6.2, 3.0, '#3f6396'); shoe(l2x, l2y + 0.6);
  // dark V-neck tee, and the checked shirt open over it
  rr(c, 8.4, 16.6, 7.2, 9.6, 2, '#2f3340', OUT, 0.35); poly(c, [10.6, 16.6, 12, 18.8, 13.4, 16.6], '#d69f80');
  plaid(c, 7.2, 16.4, 3.8, 10.2, 1.6); plaid(c, 13, 16.4, 3.8, 10.2, 1.6);
  poly(c, [9.4, 16.4, 11.4, 19, 10.8, 16.4], '#2f5530', OUT, 0.2); poly(c, [14.6, 16.4, 12.6, 19, 13.2, 16.4], '#2f5530', OUT, 0.2);
  if (!flash) { line(c, 8.2, 17, 15.4, 24.4, '#15171f', 0.6); rr(c, 13.4, 22.6, 4.6, 3.2, 0.6, '#23262f', OUT, 0.3); el(c, 15.7, 24.2, 1.15, 1.15, '#5b6275', OUT, 0.25); el(c, 15.7, 24.2, 0.5, 0.5, '#9fd6f5'); } // the camera at his hip
  rr(c, 10, 14.6, 4, 2.6, 0.8, skinD);
  el(c, 12, 8.6, 6.8, 6.8, VH[0]);
  // a broad-cheeked face, and a little stubble
  c.beginPath(); c.moveTo(6.8, 9.2); c.bezierCurveTo(6.8, 3.4, 17.2, 3.4, 17.2, 9.2); c.bezierCurveTo(17.3, 12.8, 15.4, 15.6, 12, 16.2); c.bezierCurveTo(8.6, 15.6, 6.7, 12.8, 6.8, 9.2); c.closePath();
  c.fillStyle = lg(c, 6, 4, 18, 16, [0, '#f6cbad'], [1, skinD]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.4; c.stroke();
  c.fillStyle = 'rgba(96,66,42,.22)'; c.beginPath(); c.moveTo(8.2, 12); c.bezierCurveTo(9, 14.6, 15, 14.6, 15.8, 12); c.lineTo(15.3, 13.6); c.bezierCurveTo(14, 16.2, 10, 16.2, 8.7, 13.6); c.closePath(); c.fill();
  // shaggy hair: drawn with the parting on the viewer's left, the fringe swept to the right, the sides down over the ears
  c.save(); c.translate(24, 0); c.scale(-1, 1);
  c.beginPath(); c.moveTo(5.4, 13.4); c.bezierCurveTo(4.2, 4, 8, 1.1, 12.6, 1.3); c.bezierCurveTo(17.4, 1.5, 20, 5, 18.8, 13.2); c.lineTo(17.4, 12.6); c.lineTo(17.2, 9.6); c.bezierCurveTo(16.8, 7.4, 15.2, 6.2, 13.6, 6.4); c.quadraticCurveTo(11, 8, 8.2, 7.4); c.quadraticCurveTo(7.2, 8.8, 6.9, 10.6); c.lineTo(6.6, 12.8); c.closePath();
  c.fillStyle = lg(c, 5, 1, 19, 10, [0, VH[2]], [0.5, VH[1]], [1, VH[0]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.4; c.stroke();
  for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(9.6 + i * 1.3, 2.3 + i * 0.2); c.quadraticCurveTo(8.4 + i * 1.1, 5, 6.6 + i * 1.2, 7.4); c.strokeStyle = 'rgba(170,130,90,.45)'; c.lineWidth = 0.3; c.stroke(); }
  line(c, 14, 1.7, 14.6, 5.8, 'rgba(30,20,12,.6)', 0.3);
  c.restore();
  el(c, 9.9, 10, 0.8, 0.42, '#fbfbf8'); el(c, 14.1, 10, 0.8, 0.42, '#fbfbf8'); for (const ex of [10, 14.2]) { el(c, ex, 10.05, 0.38, 0.36, '#6a6650'); el(c, ex, 10.05, 0.2, 0.2, '#111'); } // narrowed by the smile
  line(c, 8.9, 9.0, 10.9, 8.8, '#4a3220', 0.38); line(c, 13.1, 8.8, 15.1, 9.0, '#4a3220', 0.38);
  c.beginPath(); c.moveTo(12.2, 10.4); c.quadraticCurveTo(12.9, 12, 12.1, 12.3); c.strokeStyle = '#c98f72'; c.lineWidth = 0.35; c.stroke();
  c.beginPath(); c.moveTo(9.5, 13.0); c.quadraticCurveTo(12, 15.6, 14.5, 13.0); c.closePath(); c.fillStyle = '#fbf6ee'; c.fill(); c.strokeStyle = '#8a4b3c'; c.lineWidth = 0.4; c.stroke(); // a wide, open smile
  if (flash) { // camera up to his eye, flash going off
    const [hx, hy] = limb(8.4, 18, Math.PI - 0.32, 7.2, 2.6, '#3f6b3a'); el(c, hx, hy, 1.2, 1.2, '#efc09f', OUT, 0.3);
    rr(c, 4.6, 8.2, 6.4, 4.2, 0.8, '#23262f', OUT, 0.35); el(c, 6.4, 10.3, 1.7, 1.7, '#5b6275', OUT, 0.3); el(c, 6.4, 10.3, 0.8, 0.8, '#9fd6f5'); rr(c, 8.2, 7.4, 2.4, 1, 0.3, '#f4f6fa', OUT, 0.2);
    c.fillStyle = rg(c, 9.4, 7.6, 0.2, 5, [0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,250,210,.7)'], [1, 'rgba(255,250,210,0)']); c.fillRect(4, 2, 11, 11);
    poly(c, [9.4, 3.4, 10, 6.8, 13.6, 7.6, 10, 8.4, 9.4, 11.8, 8.8, 8.4, 5.2, 7.6, 8.8, 6.8], 'rgba(255,255,255,.95)');
  } else { // the notebook in his hand
    const [hx, hy] = limb(8.4, 18, -a * 0.9 + (air ? 2.2 : 0) + 0.5, 5.2, 2.6, '#3f6b3a');
    rr(c, hx - 2, hy - 3.6, 3.6, 4.6, 0.4, '#f4f2ea', OUT, 0.3); for (let k = 0; k < 3; k++) line(c, hx - 1.4, hy - 2.2 + k * 1.1, hx + 1, hy - 2.2 + k * 1.1, 'rgba(60,90,160,.6)', 0.25); line(c, hx - 2, hy - 3.6, hx + 1.6, hy - 3.6, '#8b93a7', 0.5);
    el(c, hx, hy + 0.4, 1.2, 1.2, '#efc09f', OUT, 0.3);
  }
}
/** Ashlee Vance, head and shoulders (48 x 54), to the notes above. */
function bustVance(c: C2) {
  // shoulders: the checked shirt open over a dark V-neck tee
  c.save(); c.beginPath(); c.moveTo(0, 54); c.quadraticCurveTo(3, 46.8, 15, 45.4); c.lineTo(33, 45.4); c.quadraticCurveTo(45, 46.8, 48, 54); c.closePath(); c.clip(); plaid(c, 0, 44, 48, 10, 0, '#3f6b3a', 4); c.restore();
  c.beginPath(); c.moveTo(0, 54); c.quadraticCurveTo(3, 46.8, 15, 45.4); c.lineTo(33, 45.4); c.quadraticCurveTo(45, 46.8, 48, 54); c.closePath(); c.strokeStyle = OUT; c.lineWidth = 0.5; c.stroke();
  el(c, 24, 20, 16, 17.5, VH[0]); // hair behind, down to the jaw
  rr(c, 17.6, 35, 12.8, 13, 3, lg(c, 0, 38, 0, 48, [0, '#c08a6e'], [1, '#e0aa8b']));
  poly(c, [16.6, 45, 31.4, 45, 28.6, 54, 19.4, 54], '#2f3340', OUT, 0.35); poly(c, [19.6, 45, 28.4, 45, 24, 51.4], '#e0aa8b'); // the V-neck
  poly(c, [15, 45.2, 19.2, 46, 18.4, 54, 13.4, 54], '#2f5530', OUT, 0.35); poly(c, [33, 45.2, 28.8, 46, 29.6, 54, 34.6, 54], '#2f5530', OUT, 0.35); // collar and placket
  line(c, 14.6, 45.4, 20.4, 54, '#15171f', 0.9); // camera strap
  // a broad-cheeked face
  c.beginPath(); c.moveTo(12.4, 21); c.bezierCurveTo(12.4, 6, 35.6, 6, 35.6, 21); c.bezierCurveTo(35.8, 29, 32, 38.4, 24, 42); c.bezierCurveTo(16, 38.4, 12.2, 29, 12.4, 21); c.closePath();
  c.fillStyle = rg(c, 21.5, 22, 2, 25, [0, '#f6cfb3'], [0.65, '#ecb999'], [1, '#d49b7c']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.5; c.stroke();
  for (const x of [16.6, 31.4]) { c.fillStyle = rg(c, x, 30, 0, 4.6, [0, 'rgba(222,120,100,.2)'], [1, 'rgba(222,120,100,0)']); c.fillRect(x - 5, 25, 10, 10); }
  c.fillStyle = 'rgba(96,66,42,.2)'; c.beginPath(); c.moveTo(15.4, 30); c.bezierCurveTo(17, 38.4, 31, 38.4, 32.6, 30); c.lineTo(31.6, 33.6); c.bezierCurveTo(29, 41.4, 19, 41.4, 16.4, 33.6); c.closePath(); c.fill(); // stubble
  const r = rng(61); c.fillStyle = 'rgba(80,54,34,.3)'; for (let i = 0; i < 70; i++) { const t = r() * Math.PI, d = r(); el(c, 24 + Math.cos(t) * (6 + d * 7), 33 + Math.sin(t) * (3 + d * 6), 0.18, 0.18); }
  // the sides: long enough to cover the ears and reach the jaw
  for (const sg of [-1, 1]) {
    c.beginPath(); c.moveTo(24 + sg * 11.4, 14); c.bezierCurveTo(24 + sg * 15, 18, 24 + sg * 15.4, 28, 24 + sg * 14, 37.4); c.quadraticCurveTo(24 + sg * 12.4, 36.8, 24 + sg * 11.2, 33.6); c.bezierCurveTo(24 + sg * 12.6, 29, 24 + sg * 12.2, 22, 24 + sg * 11.6, 18); c.closePath();
    c.fillStyle = lg(c, 0, 14, 0, 38, [0, VH[1]], [1, VH[0]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.45; c.stroke();
    for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(24 + sg * (12.4 + k * 0.7), 17 + k * 2); c.quadraticCurveTo(24 + sg * (14 + k * 0.4), 26, 24 + sg * (12.8 + k * 0.4), 35 - k); c.strokeStyle = k % 2 ? 'rgba(170,130,90,.4)' : 'rgba(30,20,12,.4)'; c.lineWidth = 0.4; c.stroke(); }
  }
  // the top, drawn mirrored so the parting sits on the viewer's left and the fringe sweeps right
  c.save(); c.translate(48, 0); c.scale(-1, 1);
  c.beginPath(); c.moveTo(9.4, 30); c.bezierCurveTo(7.4, 10, 15, 2.2, 25, 2.4); c.bezierCurveTo(35.6, 2.6, 41, 10, 38.6, 30); c.lineTo(35.4, 24); c.bezierCurveTo(35, 18, 32.6, 14.4, 29, 14.6); c.quadraticCurveTo(22, 19.4, 15.4, 17.4); c.quadraticCurveTo(13.4, 20.4, 13.2, 25.4); c.closePath();
  c.fillStyle = lg(c, 8, 2, 40, 26, [0, VH[2]], [0.45, VH[1]], [1, VH[0]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.5; c.stroke();
  for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(17 + i * 1.6, 4 + Math.abs(i - 6) * 0.3); c.quadraticCurveTo(15 + i * 1.3, 11, 12 + i * 1.5, 17 + (i > 7 ? -1 : 0)); c.strokeStyle = i % 3 ? 'rgba(170,130,90,.4)' : 'rgba(40,26,14,.4)'; c.lineWidth = 0.4; c.stroke(); }
  line(c, 28.6, 3, 29.6, 13.6, 'rgba(30,20,12,.55)', 0.45); // the parting
  c.restore();
  // eyes narrowed by the smile, with laughter lines
  for (const ex of [18.9, 29.1]) {
    const out = ex < 24 ? -1 : 1;
    el(c, ex, 23.5, 2.3, 0.8, '#fbfbf8'); el(c, ex + 0.1, 23.5, 0.9, 0.78, '#6a6650', '#3e3a2a', 0.28); el(c, ex + 0.1, 23.5, 0.42, 0.42, '#0e0e12');
    c.beginPath(); c.moveTo(ex - 2.6, 23.6); c.quadraticCurveTo(ex, 21.9, ex + 2.6, 23.4); c.strokeStyle = '#2e2016'; c.lineWidth = 0.6; c.stroke();
    c.beginPath(); c.moveTo(ex - 2.2, 24.4); c.quadraticCurveTo(ex, 25.6, ex + 2.3, 24.3); c.strokeStyle = 'rgba(175,115,92,.7)'; c.lineWidth = 0.4; c.stroke(); // the cheek pushes the lower lid up
    for (const dy of [-0.8, 0.4, 1.6]) line(c, ex + out * 2.9, 23.4 + dy * 0.5, ex + out * 4.3, 23.4 + dy, 'rgba(170,110,88,.55)', 0.3); // crow's feet
  }
  line(c, 15.8, 20.4, 21.6, 20.0, '#4a3220', 0.85); line(c, 26.4, 20.0, 32.2, 20.4, '#4a3220', 0.85);
  c.beginPath(); c.moveTo(25, 23.4); c.quadraticCurveTo(26.8, 28.8, 26.4, 29.8); c.quadraticCurveTo(24.4, 31.4, 21.8, 30); c.strokeStyle = 'rgba(180,115,92,.85)'; c.lineWidth = 0.55; c.stroke();
  // a wide, open smile with teeth
  c.beginPath(); c.moveTo(18.2, 33.2); c.quadraticCurveTo(24, 39.6, 29.8, 33.2); c.quadraticCurveTo(24, 34.4, 18.2, 33.2); c.closePath(); c.fillStyle = '#fbf6ee'; c.fill(); c.strokeStyle = '#8a4338'; c.lineWidth = 0.6; c.stroke();
  line(c, 19.4, 34.3, 28.6, 34.3, 'rgba(170,120,100,.35)', 0.3);
  for (const x of [17, 31]) { c.beginPath(); c.moveTo(x, 30.6); c.quadraticCurveTo(x + (x < 24 ? -0.9 : 0.9), 33.2, x + (x < 24 ? 0.6 : -0.6), 35.6); c.strokeStyle = 'rgba(180,120,98,.5)'; c.lineWidth = 0.45; c.stroke(); }
}

// ---------------------------------------------------------------- Madison Malone (someone to meet, 2024)
// Likeness notes, from her captioned byline photo on her NZ Herald articles: long hair parted in the centre and worn loose past the
// shoulders, darker at the crown and lighter, honey-brown, in the lengths, with a slight wave; a round, full face with wide cheeks
// and a soft chin; defined dark brows; blue-grey eyes; a broad smile that shows her teeth; a black blazer. (Revised after the fan
// review of 22 Nov 2026: the chin had been drawn too pointed and the hair too flat.)
function bustMadison(c: C2) {
  const hair = (x0: number) => lg(c, x0, 0, x0 + 14, 0, [0, '#6a4a2e'], [0.5, '#a07a52'], [1, '#c9a57a']);
  // hair behind: long, past the shoulders
  c.beginPath(); c.moveTo(8, 54); c.bezierCurveTo(6, 36, 7, 12, 24, 5.6); c.bezierCurveTo(41, 12, 42, 36, 40, 54); c.closePath(); c.fillStyle = lg(c, 0, 6, 0, 54, [0, '#4a3220'], [1, '#8a6642']); c.fill();
  // black blazer, open neck
  c.beginPath(); c.moveTo(0, 54); c.quadraticCurveTo(3, 46.8, 15, 45.6); c.lineTo(33, 45.6); c.quadraticCurveTo(45, 46.8, 48, 54); c.closePath();
  c.fillStyle = lg(c, 0, 0, 48, 0, [0, '#2a2b33'], [0.5, '#15161b'], [1, '#0b0c10']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.5; c.stroke();
  rr(c, 19.4, 35, 9.2, 13, 3, lg(c, 0, 38, 0, 48, [0, '#d8a58a'], [1, '#efc3a8'])); poly(c, [17.6, 45.4, 30.4, 45.4, 24, 53.6], '#efc3a8'); // neck and the open collar
  poly(c, [17, 45.4, 24, 54, 15.4, 54, 12.6, 47.4], '#25262e', OUT, 0.35); poly(c, [31, 45.4, 24, 54, 32.6, 54, 35.4, 47.4], '#25262e', OUT, 0.35); // lapels
  // a round, full face with wide cheeks and a soft chin
  c.beginPath(); c.moveTo(12.8, 21); c.bezierCurveTo(12.8, 7, 35.2, 7, 35.2, 21); c.bezierCurveTo(35.4, 30.4, 32, 39.6, 24, 40.8); c.bezierCurveTo(16, 39.6, 12.6, 30.4, 12.8, 21); c.closePath();
  c.fillStyle = rg(c, 21.5, 22, 2, 24, [0, '#f8d6bf'], [0.65, '#f0c2a6'], [1, '#dca487']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.5; c.stroke();
  for (const x of [16.6, 31.4]) { c.fillStyle = rg(c, x, 30, 0, 4.8, [0, 'rgba(230,120,110,.26)'], [1, 'rgba(230,120,110,0)']); c.fillRect(x - 5, 25, 10, 11); }
  // centre parting; the hair falls down both sides of the face, darker at the crown, with a slight wave in the lengths
  for (const sg of [-1, 1]) {
    c.beginPath(); c.moveTo(24, 6.4); c.bezierCurveTo(24 + sg * 10, 6.6, 24 + sg * 14.8, 14, 24 + sg * 14.6, 26); c.bezierCurveTo(24 + sg * 15.8, 36, 24 + sg * 14.6, 44, 24 + sg * 17.4, 54); c.lineTo(24 + sg * 11.8, 54); c.bezierCurveTo(24 + sg * 12.6, 46, 24 + sg * 11, 38, 24 + sg * 11.4, 28); c.bezierCurveTo(24 + sg * 10.8, 16, 24 + sg * 6, 10.4, 24, 8.6); c.closePath();
    c.fillStyle = hair(sg < 0 ? 6 : 28); c.fill();
    c.fillStyle = lg(c, 0, 6, 0, 26, [0, 'rgba(58,38,22,.7)'], [1, 'rgba(58,38,22,0)']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.45; c.stroke();
    for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(24 + sg * (2 + k * 2), 7.4 + k * 0.4); c.bezierCurveTo(24 + sg * (9 + k), 10, 24 + sg * (12.6 + k * 0.4), 22, 24 + sg * (13 + k * 0.6), 30); c.bezierCurveTo(24 + sg * (14.6 + k * 0.6), 38, 24 + sg * (12.6 + k * 0.6), 44, 24 + sg * (14 + k * 0.8), 52); c.strokeStyle = k % 2 ? 'rgba(235,205,160,.5)' : 'rgba(80,54,30,.35)'; c.lineWidth = 0.4; c.stroke(); }
  }
  // defined dark brows, blue-grey eyes
  for (const ex of [18.9, 29.1]) {
    el(c, ex, 23.2, 2.3, 1.15, '#fbfbf8'); el(c, ex + 0.1, 23.25, 1.05, 1.05, '#6f8aa0', '#46606f', 0.28); el(c, ex + 0.1, 23.25, 0.48, 0.5, '#0e0e12');
    c.beginPath(); c.moveTo(ex - 2.6, 23.2); c.quadraticCurveTo(ex, 21.4, ex + 2.6, 23); c.strokeStyle = '#2a1c12'; c.lineWidth = 0.75; c.stroke();
    line(c, ex + (ex < 24 ? -2.4 : 2.4), 22.6, ex + (ex < 24 ? -3.2 : 3.2), 22, '#2a1c12', 0.4); // lashes
    c.beginPath(); c.moveTo(ex - 1.8, 24.7); c.quadraticCurveTo(ex, 25.6, ex + 2, 24.5); c.strokeStyle = 'rgba(190,120,100,.5)'; c.lineWidth = 0.35; c.stroke();
  }
  c.beginPath(); c.moveTo(15.8, 20.6); c.quadraticCurveTo(18.6, 18.8, 21.8, 19.8); c.strokeStyle = '#4a3020'; c.lineWidth = 1.0; c.stroke();
  c.beginPath(); c.moveTo(26.2, 19.8); c.quadraticCurveTo(29.4, 18.8, 32.2, 20.6); c.strokeStyle = '#4a3020'; c.lineWidth = 1.0; c.stroke();
  c.beginPath(); c.moveTo(24.8, 23.6); c.quadraticCurveTo(26.2, 28.2, 25.8, 29.2); c.quadraticCurveTo(24.2, 30.4, 22.2, 29.4); c.strokeStyle = 'rgba(190,120,98,.8)'; c.lineWidth = 0.5; c.stroke();
  // a broad smile that shows her teeth
  c.beginPath(); c.moveTo(18.2, 32.6); c.quadraticCurveTo(24, 38.6, 29.8, 32.6); c.quadraticCurveTo(24, 33.8, 18.2, 32.6); c.closePath(); c.fillStyle = '#fdfaf4'; c.fill(); c.strokeStyle = '#c87a76'; c.lineWidth = 0.55; c.stroke();
  line(c, 19.4, 33.5, 28.6, 33.5, 'rgba(190,140,130,.4)', 0.3);
  for (const x of [17.2, 30.8]) { c.beginPath(); c.moveTo(x, 30.8); c.quadraticCurveTo(x + (x < 24 ? -0.6 : 0.6), 32.8, x + (x < 24 ? 0.4 : -0.4), 34.6); c.strokeStyle = 'rgba(200,130,110,.35)'; c.lineWidth = 0.35; c.stroke(); } // smile lines
}

// ---------------------------------------------------------------- Electron
/** Draws Electron parts in a 8-unit-wide column starting at (x, y). Heights: fairing 12, stage 2 10, stage 1 (with interstage and engines) 58. */
const carbon = (c: C2, x: number) => lg(c, x, 0, x + 6, 0, [0, '#060608'], [0.22, '#2c2d37'], [0.42, '#191a21'], [1, '#040405']);
function fairing(c: C2, x: number, y: number) {
  c.beginPath(); c.moveTo(x, y + 12); c.bezierCurveTo(x, y + 5, x + 1.6, y + 1.2, x + 3, y); c.bezierCurveTo(x + 4.4, y + 1.2, x + 6, y + 5, x + 6, y + 12); c.closePath();
  c.fillStyle = carbon(c, x); c.fill();
  line(c, x + 3, y + 1.5, x + 3, y + 12, 'rgba(255,255,255,.12)', 0.2);
  rr(c, x + 1.9, y + 7.4, 2.2, 1.5, 0.2, '#e8e6df'); rr(c, x + 2.2, y + 7.7, 1.6, 0.9, 0.1, '#d8452e');
}
function stage2(c: C2, x: number, y: number) {
  rr(c, x, y, 6, 10, 0.2, carbon(c, x));
  rr(c, x, y, 6, 0.7, 0, '#9aa3b5'); rr(c, x, y + 9.3, 6, 0.7, 0, '#9aa3b5');
  line(c, x + 1.5, y + 1, x + 1.5, y + 9, 'rgba(255,255,255,.22)', 0.25);
  rr(c, x + 3.4, y + 3.4, 1.6, 1, 0.1, '#e8e6df');
}
function stage1(c: C2, x: number, y: number) {
  rr(c, x, y, 6, 4, 0.2, lg(c, x, 0, x + 6, 0, [0, '#101116'], [0.25, '#3a3c48'], [1, '#08080b'])); // interstage
  for (let i = 0; i < 4; i++) rr(c, x + 0.9 + i * 1.2, y + 1.4, 0.6, 1.2, 0.1, '#050506');
  rr(c, x, y + 4, 6, 48, 0.2, carbon(c, x));
  line(c, x + 1.5, y + 5, x + 1.5, y + 51, 'rgba(255,255,255,.22)', 0.25);
  rr(c, x, y + 4, 6, 0.6, 0, '#9aa3b5');
  // ELECTRON lettering, reading upward
  c.save(); c.translate(x + 3.5, y + 31); c.rotate(-Math.PI / 2); text(c, 'ELECTRON', 0, 0, 2.9, '#f2f2ee', 700); c.restore();
  // flags
  rr(c, x + 2.2, y + 44.5, 2.4, 1.5, 0.1, '#1d3a7a'); rr(c, x + 2.2, y + 44.5, 1, 0.75, 0, '#c8102e');
  rr(c, x + 2.2, y + 46.6, 2.4, 1.5, 0.1, '#f2f2ee'); for (let i = 0; i < 3; i++) rr(c, x + 2.2, y + 46.7 + i * 0.5, 2.4, 0.22, 0, '#c8102e'); rr(c, x + 2.2, y + 46.6, 1, 0.75, 0, '#1d3a7a');
  // engine section and Rutherford nozzles
  rr(c, x - 0.2, y + 52, 6.4, 3, 0.3, lg(c, x, 0, x + 6, 0, [0, '#2a2c36'], [0.3, '#5d6272'], [1, '#1c1d24']));
  for (let i = 0; i < 4; i++) poly(c, [x + 0.5 + i * 1.5, y + 55, x + 1.2 + i * 1.5, y + 55, x + 1.6 + i * 1.5, y + 57.6, x + 0.1 + i * 1.5, y + 57.6], lg(c, 0, y + 55, 0, y + 58, [0, '#8a8f9e'], [1, '#3a3c48']));
}
function vacNozzle(c: C2, x: number, y: number, hot = false) {
  poly(c, [x + 2.1, y, x + 3.9, y, x + 5.2, y + 4, x + 0.8, y + 4], hot ? lg(c, 0, y, 0, y + 4, [0, '#7a3a1c'], [1, '#f28c28']) : lg(c, 0, y, 0, y + 4, [0, '#6a6f7e'], [1, '#2a2c36']), OUT, 0.2);
}
/** Whole vehicle, for pad and prop art. Total height 80 units. */
export function electronFull(c: C2, x: number, y: number) { fairing(c, x, y); stage2(c, x, y + 12); stage1(c, x, y + 22); }

// ---------------------------------------------------------------- clouds, glows, worlds
export function cloud(c: C2, w: number, h: number, seed: number, shade = '#b9cfe6') {
  const r = rng(seed);
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 9; i++) {
    const x = w * (0.14 + 0.72 * (i / 8)), rx = w * (0.1 + r() * 0.07), ry = h * (0.24 + r() * 0.2) * (1 - Math.abs(i - 4) / 7);
    el(c, x, h * 0.62 - ry * 0.3 + (pass ? -h * 0.07 : 0), rx, ry, pass ? '#ffffff' : shade);
  }
  rr(c, w * 0.08, h * 0.6, w * 0.84, h * 0.24, h * 0.12, shade);
}
/** A world seen whole. `sun` is where its light comes from, as a fraction of the radius from the centre (the plain art lights everything from the upper left). */
export function planet(c: C2, cx: number, cy: number, r: number, kind: 'earth' | 'moon', sun = [-0.35, -0.35]) {
  const lx = cx + r * sun[0], ly = cy + r * sun[1], dx = cx - r * sun[0] * (0.5 / 0.35), dy = cy - r * sun[1] * (0.5 / 0.35);
  c.save(); el(c, cx, cy, r, r); c.clip();
  if (kind === 'earth') {
    c.fillStyle = rg(c, lx, ly, r * 0.1, r * 1.5, [0, '#4d9be8'], [0.6, '#1f5fb8'], [1, '#0b2a63']); c.fillRect(cx - r, cy - r, r * 2, r * 2);
    const q = rng(11);
    for (let i = 0; i < 7; i++) { const x = cx + (q() - 0.5) * r * 1.7, y = cy + (q() - 0.5) * r * 1.7; c.beginPath(); for (let k = 0; k < 9; k++) { const t = (k / 9) * 6.283, d = r * (0.16 + q() * 0.22); k ? c.lineTo(x + Math.cos(t) * d * 1.3, y + Math.sin(t) * d) : c.moveTo(x + Math.cos(t) * d * 1.3, y + Math.sin(t) * d); } c.closePath(); c.fillStyle = i % 2 ? '#4f9d4f' : '#6fae5a'; c.fill(); }
    for (let i = 0; i < 9; i++) el(c, cx + (q() - 0.5) * r * 1.8, cy + (q() - 0.5) * r * 1.8, r * (0.2 + q() * 0.3), r * 0.06, 'rgba(255,255,255,.55)');
  } else {
    c.fillStyle = rg(c, lx, ly, r * 0.1, r * 1.5, [0, '#f1f1ee'], [0.6, '#c3c6cf'], [1, '#70758a']); c.fillRect(cx - r, cy - r, r * 2, r * 2);
    const q = rng(5);
    for (let i = 0; i < 12; i++) { const x = cx + (q() - 0.5) * r * 1.6, y = cy + (q() - 0.5) * r * 1.6, d = r * (0.05 + q() * 0.14); el(c, x, y, d, d, 'rgba(120,125,145,.55)'); el(c, x + d * 0.2, y + d * 0.2, d * 0.75, d * 0.75, 'rgba(200,203,212,.5)'); }
    el(c, cx - r * 0.3, cy - r * 0.2, r * 0.36, r * 0.3, 'rgba(120,125,145,.35)'); el(c, cx + r * 0.25, cy + r * 0.3, r * 0.28, r * 0.22, 'rgba(120,125,145,.3)');
  }
  c.fillStyle = rg(c, dx, dy, r * 0.4, r * 1.5, [0, 'rgba(0,0,10,.0)'], [1, 'rgba(0,0,10,.6)']); c.fillRect(cx - r, cy - r, r * 2, r * 2);
  c.restore();
}
export function starfield(c: C2, w: number, h: number, n: number, seed: number) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, s = r(); const col = s > 0.92 ? '#ffd9a8' : s > 0.84 ? '#a8ccff' : '#ffffff'; c.globalAlpha = 0.35 + r() * 0.65; el(c, x, y, s > 0.95 ? 0.55 : 0.16 + s * 0.22, s > 0.95 ? 0.55 : 0.16 + s * 0.22, col); }
  c.globalAlpha = 1;
}

// ---------------------------------------------------------------- the engine test stand
/** The Rutherford test stand at night, 320 x 180. `part`: 1 the sky, hills and apron, 2 the stand and everything on it, 4 the floodlight's glow. */
export function drawStand(real: C2, part = 7) {
  const pick = parts(real, part); let c = pick(1);
  c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#0b1024'], [0.7, '#1c2a52'], [1, '#2c3f70']); c.fillRect(0, 0, 320, 180); starfield(c, 320, 110, 120, 12);
  poly(c, [0, 132, 50, 112, 110, 124, 180, 108, 260, 122, 320, 112, 320, 140, 0, 140], '#0f1a36');
  c.fillStyle = lg(c, 0, 134, 0, 180, [0, '#3a4057'], [1, '#22273a']); c.fillRect(0, 134, 320, 46);
  for (let x = -20; x < 340; x += 26) line(c, x, 180, x + 30, 134, 'rgba(255,255,255,.04)', 0.5);
  c = pick(2);
  // stand
  for (const x of [58, 152]) { rr(c, x, 26, 6, 108, 0.5, lg(c, x, 0, x + 6, 0, [0, '#6f7890'], [1, '#3a3f4f']), OUT, 0.3); }
  rr(c, 52, 22, 112, 7, 1, lg(c, 0, 22, 0, 29, [0, '#8b93a7'], [1, '#4a5066']), OUT, 0.3);
  for (let y = 34; y < 130; y += 16) { line(c, 64, y, 152, y + 16, 'rgba(120,130,150,.35)', 0.6); line(c, 152, y, 64, y + 16, 'rgba(120,130,150,.35)', 0.6); }
  for (let x = 52; x < 164; x += 8) poly(c, [x, 22, x + 4, 22, x + 2, 25, x - 2, 25], '#f2d14a');
  poly(c, [84, 134, 132, 134, 124, 120, 92, 120], lg(c, 0, 120, 0, 134, [0, '#5b6275'], [1, '#2a2e3c']), OUT, 0.3); // flame deflector
  // battery cart and tanks
  rr(c, 14, 100, 30, 30, 2, lg(c, 14, 0, 44, 0, [0, '#ffe98a'], [1, '#c8961c']), OUT, 0.4); rr(c, 18, 104, 22, 8, 1, '#23262f'); for (let i = 0; i < 4; i++) rr(c, 20 + i * 5, 106, 3.4, 4, 0.4, '#7cc56b'); text(c, 'BATT', 29, 121, 4.4, '#5b4410', 700); el(c, 20, 132, 3, 3, '#15171f'); el(c, 38, 132, 3, 3, '#15171f');
  c.beginPath(); c.moveTo(44, 110); c.bezierCurveTo(70, 118, 80, 60, 96, 52); c.strokeStyle = '#f2d14a'; c.lineWidth = 1; c.stroke();
  rr(c, 176, 70, 18, 64, 8, lg(c, 176, 0, 194, 0, [0, '#f2f4f8'], [1, '#8b93a7']), OUT, 0.35); text(c, 'LOX', 185, 100, 4, '#4a5066', 700);
  rr(c, 198, 84, 14, 50, 6, lg(c, 198, 0, 212, 0, [0, '#e8b796'], [1, '#a8603c']), OUT, 0.35); text(c, 'RP-1', 205, 110, 3, '#4a2a18', 700);
  c = pick(4); c.fillStyle = rg(c, 108, 26, 2, 60, [0, 'rgba(255,240,200,.22)'], [1, 'rgba(255,240,200,0)']); c.fillRect(40, 0, 140, 100);
}

// ---------------------------------------------------------------- launch sites
/**
 * A launch site, 320 x 150 with the ground line at y = 100: Great Mercury Island (`island`) or the pad at Māhia.
 * `part`: 1 the sea, 4 the far headlands, 2 the land, 8 what stands on it.
 */
export function drawSite(real: C2, island: boolean, part = 15) {
  const pick = parts(real, part); let c = pick(1);
  c.fillStyle = lg(c, 0, 82, 0, 150, [0, '#7fc0ee'], [0.08, '#2f7fd0'], [1, '#12407f']); c.fillRect(0, 82, 320, 68);
  const r = rng(island ? 41 : 42);
  for (let i = 0; i < 90; i++) { const x = r() * 320, y = 86 + r() * 62; line(c, x, y, x + 3 + r() * 7, y, `rgba(210,235,255,${0.12 + r() * 0.25})`, 0.4); }
  c = pick(4); poly(c, [0, 84, 30, 76, 66, 80, 96, 84], '#5d86a8'); poly(c, [230, 84, 262, 74, 300, 78, 320, 82, 320, 84], '#5d86a8'); // far headlands
  c = pick(2);
  if (island) {
    c.beginPath(); c.moveTo(40, 112); c.quadraticCurveTo(80, 84, 140, 96); c.quadraticCurveTo(180, 90, 220, 99); c.quadraticCurveTo(262, 100, 286, 114); c.quadraticCurveTo(160, 126, 40, 112); c.fillStyle = lg(c, 0, 86, 0, 120, [0, '#6cb968'], [1, '#2f7a47']); c.fill();
    c.beginPath(); c.moveTo(40, 112); c.quadraticCurveTo(160, 126, 286, 114); c.quadraticCurveTo(160, 134, 40, 112); c.fillStyle = '#e6d9a8'; c.fill();
    c = pick(8);
    for (let i = 0; i < 16; i++) { const x = 60 + r() * 60, y = 96 + r() * 10; el(c, x, y, 4 + r() * 3, 3 + r() * 2, i % 3 ? '#2f6b3a' : '#3f8a4c'); if (i % 4 === 0) el(c, x + 1, y - 1, 1.6, 1.2, '#c8102e'); }
    rr(c, 146, 98.6, 30, 3, 1, '#b8b29a', OUT, 0.25); line(c, 150, 100, 158, 64, '#8b93a7', 0.9); line(c, 152, 100, 158, 64, '#5b6275', 0.5); // launch rail
    rr(c, 196, 93, 12, 7, 0.6, '#f4f2ea', OUT, 0.3); poly(c, [195, 93, 202, 89, 209, 93], '#d8452e', OUT, 0.3);
  } else {
    // Māhia: a cliff-top pad at the tip of the peninsula
    c.beginPath(); c.moveTo(0, 104); c.quadraticCurveTo(60, 96, 110, 100); c.lineTo(214, 100); c.quadraticCurveTo(250, 100, 262, 108); c.lineTo(258, 150); c.lineTo(0, 150); c.closePath(); c.fillStyle = lg(c, 0, 98, 0, 150, [0, '#7cc56b'], [0.2, '#4f9d4f'], [1, '#2f6b3a']); c.fill();
    poly(c, [214, 100, 262, 108, 258, 150, 226, 150, 222, 120], lg(c, 0, 100, 0, 150, [0, '#e2d6b4'], [1, '#9a8a66'])); // papa cliffs
    for (let i = 0; i < 9; i++) line(c, 226 + r() * 30, 108 + r() * 36, 228 + r() * 30, 112 + r() * 36, 'rgba(90,70,40,.35)', 0.4);
    c = pick(8);
    rr(c, 132, 99, 60, 3, 1, lg(c, 0, 99, 0, 102, [0, '#c8ccd4'], [1, '#8b93a7']), OUT, 0.25); // pad apron
    // strongback, lowered away from the vehicle
    rr(c, 140, 30, 2.4, 70, 0.3, '#5b6275', OUT, 0.25); rr(c, 146, 30, 2.4, 70, 0.3, '#5b6275', OUT, 0.25);
    for (let y = 32; y < 98; y += 7) { line(c, 141, y, 147.5, y + 7, '#8b93a7', 0.45); line(c, 147.5, y, 141, y + 7, '#8b93a7', 0.45); }
    for (const y of [44, 66]) rr(c, 148.4, y, 7, 1.2, 0.3, '#d8452e', OUT, 0.2);
    for (const x of [120, 196]) { line(c, x, 12, x, 100, '#8b93a7', 0.6); line(c, x, 12, x, 16, '#d8452e', 0.8); }
    rr(c, 170, 86, 12, 14, 4, lg(c, 170, 0, 182, 0, [0, '#f2f4f8'], [1, '#9aa3b5']), OUT, 0.3); rr(c, 184, 90, 9, 10, 3, lg(c, 184, 0, 193, 0, [0, '#f2f4f8'], [1, '#9aa3b5']), OUT, 0.3);
    rr(c, 60, 90, 34, 10, 0.8, '#e4e8ee', OUT, 0.3); poly(c, [58, 90, 77, 84, 96, 90], '#9aa3b5', OUT, 0.3); rr(c, 66, 93, 10, 7, 0.3, '#5b6275'); // hangar
    for (let i = 0; i < 6; i++) { const x = 14 + r() * 40, y = 104 + r() * 8; el(c, x, y, 1.8, 1.2, '#f4f2ea'); el(c, x + 1.5, y - 0.4, 0.7, 0.6, '#2f2f38'); } // sheep, of course
    for (let x = 100; x < 214; x += 5) { line(c, x, 103, x, 106, '#e8e6df', 0.35); } line(c, 100, 104, 214, 104, '#e8e6df', 0.25);
  }
}

// Wallops Island, Virginia: Launch Complex 2 on a flat barrier island, the Atlantic behind it, Pad 0A and its water tower next door
/** Launch Complex 2 on Wallops Island. `part`, as for `drawSite`: 1 the sea, 2 the island, 8 what stands on it. */
export function drawWallops(real: C2, part = 15) {
  const pick = parts(real, part); let c = pick(1);
  c.fillStyle = lg(c, 0, 80, 0, 150, [0, '#8cc0e6'], [0.1, '#2f74c0'], [1, '#143c78']); c.fillRect(0, 80, 320, 70);
  const r = rng(57);
  for (let i = 0; i < 110; i++) { const x = r() * 320, y = 84 + r() * 64; line(c, x, y, x + 3 + r() * 8, y, `rgba(215,235,255,${0.1 + r() * 0.25})`, 0.4); }
  c = pick(2);
  // the island: low dunes and a seawall of rock, never more than a few metres above the sea
  c.beginPath(); c.moveTo(0, 100); c.quadraticCurveTo(40, 97, 90, 99); c.lineTo(246, 99); c.quadraticCurveTo(290, 100, 320, 104); c.lineTo(320, 118); c.quadraticCurveTo(160, 124, 0, 116); c.closePath(); c.fillStyle = lg(c, 0, 97, 0, 122, [0, '#d9cf9f'], [0.35, '#c6bb86'], [1, '#a59c6e']); c.fill();
  for (let i = 0; i < 60; i++) { const x = r() * 320, y = 101 + r() * 14; el(c, x, y, 2 + r() * 4, 0.8 + r(), i % 3 ? 'rgba(95,130,70,.5)' : 'rgba(150,160,90,.45)'); } // dune grass
  for (let x = 200; x < 320; x += 5) el(c, x + r() * 2, 117 + (x - 200) * 0.012 + r() * 2, 2.6, 1.6, i3(r()), OUT, 0.2); // rock seawall
  c = pick(8);
  // Pad 0A next door: the tall water tower, the ramp and four lightning masts
  rr(c, 30, 95, 52, 4, 0.6, '#b8bcc4', OUT, 0.25); poly(c, [30, 99, 16, 99, 30, 95], '#a8acb4', OUT, 0.25);
  line(c, 62, 95, 62, 14, '#d7dbe4', 2.6); line(c, 62, 95, 62, 14, 'rgba(0,0,0,.15)', 0.7); el(c, 62, 11, 8, 6.2, lg(c, 54, 0, 70, 0, [0, '#ffffff'], [1, '#aab2c0']), OUT, 0.3); rr(c, 59.2, 16, 5.6, 3.4, 0.4, '#c2c8d2', OUT, 0.25); // the 94 m water tower: the tallest thing on the island
  for (const x of [34, 46, 74, 84]) { line(c, x, 95, x, 30, '#8b93a7', 0.5); line(c, x, 30, x, 34, '#d8452e', 0.7); }
  rr(c, 40, 86, 10, 9, 0.5, '#d7dbe4', OUT, 0.3); text(c, '0A', 45, 90.6, 3.2, '#4a5066', 700);
  // LC-2: concrete apron, flame duct, strongback lowered away, tanks, the integration building inland
  rr(c, 118, 97.6, 84, 3.4, 0.8, lg(c, 0, 97.6, 0, 101, [0, '#d2d6dc'], [1, '#8b93a7']), OUT, 0.25);
  rr(c, 146, 92, 20, 6, 0.6, lg(c, 0, 92, 0, 98, [0, '#8b93a7'], [1, '#4a5066']), OUT, 0.3); rr(c, 150, 95, 12, 3, 0.3, '#15171f'); // launch mount over the flame duct
  rr(c, 140, 28, 2.4, 66, 0.3, '#5b6275', OUT, 0.25); rr(c, 146, 28, 2.4, 66, 0.3, '#5b6275', OUT, 0.25);
  for (let y = 30; y < 92; y += 7) { line(c, 141, y, 147.5, y + 7, '#8b93a7', 0.45); line(c, 147.5, y, 141, y + 7, '#8b93a7', 0.45); }
  for (const y of [42, 64]) rr(c, 148.4, y, 7, 1.2, 0.3, '#d8452e', OUT, 0.2);
  for (const x of [124, 194]) { line(c, x, 40, x, 98, '#8b93a7', 0.6); line(c, x, 40, x, 44, '#d8452e', 0.8); }
  rr(c, 172, 86, 11, 12, 4, lg(c, 172, 0, 183, 0, [0, '#f2f4f8'], [1, '#9aa3b5']), OUT, 0.3); rr(c, 185, 90, 8, 8, 3, lg(c, 185, 0, 193, 0, [0, '#f2f4f8'], [1, '#9aa3b5']), OUT, 0.3);
  rr(c, 100, 90.6, 13, 7.4, 0.6, '#f4f2ea', OUT, 0.3); text(c, 'LC-2', 106.5, 94.4, 3.4, '#1d3a7a', 700);
  line(c, 280, 99, 280, 84, '#f4f2ea', 0.5); rr(c, 280, 84, 8, 4.6, 0.2, '#f4f2ea', OUT, 0.2); for (let i = 0; i < 3; i++) rr(c, 280, 84.4 + i * 1.5, 8, 0.6, 0, '#c8102e'); rr(c, 280, 84, 3.4, 2.4, 0, '#1d3a7a'); // the Stars and Stripes
  // piping plovers on the sand (they nest on Wallops Island); the wild ponies live next door on Assateague, not here
  for (const x of [222, 229, 300]) { el(c, x, 110, 1.5, 1, '#d9cdb0', OUT, 0.2); el(c, x + 1.3, 109.2, 0.8, 0.7, '#f4f2ea', OUT, 0.2); line(c, x + 2, 109.3, x + 2.9, 109.5, '#f28c28', 0.3); line(c, x, 111, x, 112.2, '#f28c28', 0.25); }
}

// ---------------------------------------------------------------- map geography (lon, lat) outlines
const NI = [172.7, -34.4, 173.0, -34.4, 173.5, -34.9, 174.1, -35.2, 174.5, -35.8, 174.8, -36.4, 174.9, -36.85, 175.3, -37.0, 175.5, -36.7, 175.35, -36.47, 175.75, -36.6, 175.95, -37.0, 175.95, -37.45, 176.3, -37.7, 177.0, -37.95, 177.6, -37.95, 178.0, -37.55, 178.55, -37.7, 178.35, -38.3, 178.0, -38.7, 177.95, -39.05, 177.98, -39.3, 177.82, -39.22, 177.4, -39.07, 176.9, -39.45, 177.1, -39.65, 176.7, -40.3, 176.2, -41.0, 175.3, -41.6, 174.75, -41.35, 175.0, -40.8, 175.25, -40.3, 175.0, -39.95, 174.3, -39.6, 173.8, -39.3, 174.1, -39.0, 174.6, -38.8, 174.75, -38.1, 174.75, -37.4, 174.55, -37.05, 174.3, -36.5, 173.9, -36.0, 173.4, -35.5, 173.1, -35.0];
const SI = [172.7, -40.5, 173.05, -40.52, 173.0, -41.15, 173.8, -40.9, 174.3, -41.05, 174.3, -41.7, 173.7, -42.4, 172.8, -43.25, 173.1, -43.65, 172.9, -43.9, 172.3, -43.9, 171.3, -44.4, 171.0, -45.1, 170.75, -45.8, 169.8, -46.45, 168.9, -46.65, 168.35, -46.6, 167.7, -46.25, 166.5, -46.2, 166.6, -45.6, 167.4, -44.9, 168.0, -44.3, 168.8, -43.9, 170.2, -43.2, 171.2, -42.4, 171.6, -41.7, 172.1, -40.9];
const STEWART = [167.5, -46.9, 168.2, -46.9, 168.15, -47.2, 167.6, -47.3];
const USA = [-124.7, 48.4, -123, 49, -95, 49, -89.5, 48, -84.5, 46.5, -82.5, 45.3, -82.4, 43, -79, 43.2, -76.5, 43.6, -75, 45, -71.5, 45, -69.2, 47.4, -67.8, 47.1, -67, 44.8, -70.2, 43.6, -70.7, 42.6, -70, 42.05, -70, 41.7, -71.5, 41.4, -74, 40.6, -74.1, 39.7, -75.1, 38.8, -75.4, 37.9, -76, 36.9, -75.5, 35.2, -77.9, 33.9, -79.9, 32.7, -81.2, 31.5, -81.4, 30.4, -80.6, 28.4, -80, 26.8, -80.4, 25.2, -81.8, 26, -82.8, 27.8, -82.8, 29.2, -84, 30.1, -85.4, 29.7, -87.5, 30.3, -89.4, 30.2, -89.2, 29.1, -91, 29.2, -93.8, 29.7, -95, 29.2, -97.2, 27.8, -97.2, 25.9, -99.5, 27.5, -101.4, 29.8, -103.2, 29, -104.5, 29.6, -106.5, 31.8, -108.2, 31.8, -108.2, 31.3, -111, 31.3, -114.8, 32.5, -117.1, 32.5, -118.4, 33.8, -120.5, 34.5, -121.9, 36.6, -122.5, 37.8, -123.8, 39.8, -124.3, 40.4, -124.1, 43, -124, 46.2];
export const MAPW = 860, MAPH = 450;
/** Aotearoa is drawn large on the left, the USA smaller on the right; the Pacific between them is not to scale. */
export const nz = (lon: number, lat: number): [number, number] => [60 + (lon - 166.5) * 13.6, 165 + (-lat - 34.4) * 18];
export const us = (lon: number, lat: number): [number, number] => [580 + (lon + 124.7) * 4.16, 195 + (49 - lat) * 5.2];
const proj = (pts: number[], f: (a: number, b: number) => [number, number]) => { const o: number[] = []; for (let i = 0; i < pts.length; i += 2) o.push(...f(pts[i], pts[i + 1])); return o; };
function landmass(c: C2, pts: number[], g0: string, g1: string, sea: C2 = c) {
  const ys = pts.filter((_, i) => i % 2), y0 = Math.min(...ys), y1 = Math.max(...ys);
  sea.save(); sea.shadowColor = 'rgba(120,200,255,.55)'; sea.shadowBlur = 26; poly(sea, pts, '#3c86c9'); sea.restore(); // shallows
  poly(c, pts, '#e6d9a8', '#e6d9a8', 1.6); // beach
  poly(c, pts, lg(c, 0, y0, 0, y1, [0, g0], [1, g1]), 'rgba(20,50,30,.55)', 0.4);
}
function pin(c: C2, x: number, y: number, label: string, dx = 3, align: CanvasTextAlign = 'left', col = '#17301f') {
  el(c, x, y, 1.6, 1.6, '#fff', '#17301f', 0.5); el(c, x, y, 0.7, 0.7, '#d8452e');
  c.save(); c.shadowColor = 'rgba(0,10,30,.7)'; c.shadowBlur = 6; text(c, label, x + dx, y + 0.2, 5.4, col, 600, align); c.restore();
}
/**
 * The world map, MAPW x MAPH. `part`: 1 space and the ocean, 2 the Moon and Mars, 16 the shallows round the land,
 * 8 the land itself, 4 every name, pin and the compass.
 */
export function drawMap(real: C2, w: number, h: number, part = 31) {
  const pick = parts(real, part), sea = pick(16); let c = pick(1);
  // space, upper atmosphere, ocean
  c.fillStyle = lg(c, 0, 0, 0, 150, [0, '#04050c'], [0.55, '#0a1030'], [0.8, '#1b3f86'], [1, '#2f6fc0']); c.fillRect(0, 0, w, 150);
  c.fillStyle = rg(c, 620, 40, 5, 150, [0, 'rgba(120,80,200,.22)'], [1, 'rgba(120,80,200,0)']); c.fillRect(0, 0, w, 150);
  starfield(c, w, 105, 520, 3);
  c.fillStyle = lg(c, 0, 150, 0, h, [0, '#2f6fc0'], [0.25, '#1f5aa8'], [1, '#123a78']); c.fillRect(0, 150, w, h - 150);
  c.fillStyle = lg(c, 0, 138, 0, 162, [0, 'rgba(190,225,255,0)'], [0.5, 'rgba(190,225,255,.5)'], [1, 'rgba(190,225,255,0)']); c.fillRect(0, 138, w, 24);
  const r = rng(21);
  for (let i = 0; i < 520; i++) { const x = r() * w, y = 165 + r() * (h - 165), l = 3 + r() * 6; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 0.9, x + l, y); c.strokeStyle = `rgba(160,205,255,${0.1 + r() * 0.2})`; c.lineWidth = 0.35; c.stroke(); }
  // Moon and Mars
  c = pick(2); c.save(); c.shadowColor = 'rgba(220,225,255,.7)'; c.shadowBlur = 40; el(c, 430, 60, 16, 16, '#c3c6cf'); c.restore(); planet(c, 430, 60, 16, 'moon');
  text(pick(4), 'THE MOON', 430, 82, 4.4, '#aab4d4', 600);
  c.save(); c.shadowColor = 'rgba(255,140,90,.7)'; c.shadowBlur = 26; el(c, 764, 32, 9, 9, '#c8623a'); c.restore(); el(c, 764, 32, 9, 9, rg(c, 761, 29, 1, 12, [0, '#f0a070'], [0.6, '#c8623a'], [1, '#6a2a18'])); el(c, 761, 34, 3.6, 1.8, 'rgba(110,50,30,.45)'); el(c, 767, 29, 2.2, 1.2, 'rgba(110,50,30,.4)'); el(c, 764, 24.2, 3, 1, 'rgba(255,255,255,.8)'); text(pick(4), 'MARS', 764, 46.4, 4.4, '#c9a090', 600);
  // a corner of Australia at the map's western edge (the Tasman is squeezed, like the Pacific)
  const land = pick(8), ink = pick(4); c = land;
  landmass(c, [-6, 180, 14, 184, 28, 198, 36, 220, 38, 246, 32, 272, 22, 292, 8, 306, -6, 310], '#d9b877', '#b8935a', sea); text(ink, 'AUSTRALIA', 15, 228, 3.8, 'rgba(70,50,20,.7)', 700); pin(ink, 13, 258, 'Koonibba', 3, 'left', '#fff6e0');
  // Aotearoa
  landmass(c, proj(SI, nz), '#5fae62', '#2f7a47', sea); landmass(c, proj(NI, nz), '#6cb968', '#3a8a4c', sea); landmass(c, proj(STEWART, nz), '#4f9d55', '#2f7a47', sea);
  poly(c, [...nz(175.75, -36.56), ...nz(175.9, -36.58), ...nz(175.85, -36.68)], '#6cb968', '#e6d9a8', 0.5); // Great Mercury Island
  // Southern Alps and central plateau
  for (let i = 0; i < 26; i++) { const t = i / 25, [x, y] = nz(167.6 + t * 5.0, -45.1 + t * 3.6); const j = (r() - 0.5) * 3; poly(c, [x - 2.2 + j, y + 1.6, x + j, y - 2.4, x + 2.2 + j, y + 1.6], '#6f8f7a'); poly(c, [x - 0.9 + j, y - 0.8, x + j, y - 2.4, x + 0.9 + j, y - 0.8], '#f4f6f8'); }
  for (const [lo, la] of [[175.57, -39.28], [174.06, -39.3], [175.65, -39.16]]) { const [x, y] = nz(lo, la); poly(c, [x - 2.6, y + 1.8, x, y - 2.8, x + 2.6, y + 1.8], '#6f8f7a'); poly(c, [x - 1, y - 1, x, y - 2.8, x + 1, y - 1], '#f4f6f8'); }
  const ni = proj(NI, nz), si = proj(SI, nz);
  for (let i = 0; i < 260; i++) { const x = 60 + r() * 180, y = 165 + r() * 240; if (inside(ni, x, y) || inside(si, x, y)) el(c, x, y, 0.9 + r() * 1.2, 0.6 + r(), 'rgba(30,80,45,.22)'); }
  c = ink; text(c, 'AOTEAROA', 96, 238, 9, 'rgba(210,240,255,.75)', 700); text(c, 'NEW ZEALAND', 96, 247, 4.2, 'rgba(210,240,255,.6)', 600);
  pin(c, ...nz(174.76, -36.85), 'Auckland', -3, 'right', '#eaf6ff'); pin(c, ...nz(177.87, -39.26), 'Māhia · LC-1', 4, 'left', '#eaf6ff');
  pin(c, ...nz(174.78, -41.29), 'Wellington', -3, 'right', '#eaf6ff'); pin(c, ...nz(170.5, -45.87), 'Dunedin', 4, 'left', '#eaf6ff');
  pin(c, ...nz(168.35, -46.41), 'Invercargill', -3, 'right', '#eaf6ff'); pin(c, ...nz(175.82, -36.6), 'Great Mercury Is.', 4, 'left', '#eaf6ff');
  pin(c, ...nz(172.75, -43.8), 'Kaitorete Spit', 4, 'left', '#eaf6ff');
  // USA
  c = land; landmass(c, proj(USA, us), '#c9b877', '#8f9a58', sea);
  for (let i = 0; i < 16; i++) { const [x, y] = us(-112 + (r() - 0.5) * 10, 34 + i * 0.9); poly(c, [x - 2, y + 1.4, x, y - 2, x + 2, y + 1.4], '#8f8660'); poly(c, [x - 0.8, y - 0.7, x, y - 2, x + 0.8, y - 0.7], '#f4f6f8'); }
  c = ink; text(c, 'UNITED STATES', 700, 245, 7, 'rgba(60,50,25,.6)', 700);
  pin(c, ...us(-118.2, 33.8), 'Long Beach HQ', -3, 'right', '#eaf6ff'); pin(c, ...us(-89.6, 30.4), 'Stennis', 0, 'center', '#eaf6ff');
  pin(c, ...us(-74, 40.7), 'New York', -3, 'right', '#eaf6ff'); pin(c, ...us(-75.45, 37.9), 'Wallops · LC-2, LC-3', 4, 'left', '#eaf6ff');
  // ocean dressing
  c.save(); c.translate(400, 300); c.rotate(-0.08); text(c, 'P A C I F I C   O C E A N', 0, 0, 8, 'rgba(180,215,255,.4)', 600); c.restore();
  text(c, '(not to scale)', 400, 312, 3.6, 'rgba(180,215,255,.35)', 500);
  c.save(); c.translate(500, 395); el(c, 0, 0, 13, 13, 'rgba(10,30,70,.35)', 'rgba(200,225,255,.5)', 0.4); for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); poly(c, [0, -12 + (i % 2) * 5, 1.6, 0, -1.6, 0], i % 2 ? 'rgba(200,225,255,.45)' : 'rgba(235,245,255,.85)'); } c.rotate(0); text(c, 'N', 0, -16.5, 4.5, 'rgba(235,245,255,.85)', 700); c.restore();
}
function inside(pts: number[], x: number, y: number) { let hit = false; for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) { const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit; } return hit; }

// ---------------------------------------------------------------- everything
export function makeArt(scene: Phaser.Scene) {
  // particles and lights
  tex(scene, 'puff', 16, 16, (c) => { c.fillStyle = rg(c, 8, 8, 0, 8, [0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']); c.fillRect(0, 0, 16, 16); });
  tex(scene, 'px', 1, 1, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 1, 1); });

  // Peter: present-day set, and a younger set ('y' prefix) for the 1990s workshop
  // Character sets, by key prefix: '' Peter Beck today, 'y' Peter in the 1990s, 'a' Adam Spice. Each gets the everyday look plus power-up outfits.
  for (const [pre, young, adam] of [['', false, false], ['y', true, false], ['a', false, true]] as [string, boolean, boolean][]) {
    for (const fit of (adam ? ['', 'S', 'J', 'H', 'B'] : young ? ['', 'S', 'J'] : ['', 'H', 'B', 'T', 'L', 'F', 'M']) as Fit[]) {
      [0, 1, 0.5, -0.5, -1, -0.5, 0.5].forEach((l, i) => tex(scene, pre + fit + (i === 0 ? 'peter0' : 'peterw' + (i - 1)), 24, 34, (c) => peter(c, i === 0 ? 0.12 : l, false, young, fit, adam)));
      tex(scene, pre + fit + 'peterj', 24, 34, (c) => peter(c, 0.9, true, young, fit, adam));
    }
    tex(scene, pre + 'peter_bust', 48, 54, (c) => bust(c, young, adam));
    tex(scene, pre + 'peter_chip', 30, 30, (c) => {
      c.save(); el(c, 15, 15, 13.4, 13.4); c.clip();
      c.fillStyle = lg(c, 0, 0, 0, 30, [0, '#3f7fd0'], [1, '#16305f']); c.fillRect(0, 0, 30, 30);
      c.translate(15 - 24 * 0.6, 0.6); c.scale(0.6, 0.6); bust(c, young, adam); c.restore();
      el(c, 15, 15, 13.4, 13.4, undefined, '#ffffff', 1.1); el(c, 15, 15, 14.2, 14.2, undefined, '#0b0c12', 0.5);
    });
    BUSTS[pre] = (scene.textures.get(pre + 'peter_bust').getSourceImage() as HTMLCanvasElement).toDataURL();
  }
  // Shaun D'Mello leads a riding level, so he needs a portrait and a chip; on the bike he is in a helmet
  tex(scene, 'speter_bust', 48, 54, (c) => bust(c, false, false, true));
  tex(scene, 'speter_chip', 30, 30, (c) => { c.save(); el(c, 15, 15, 13.4, 13.4); c.clip(); c.fillStyle = lg(c, 0, 0, 0, 30, [0, '#3f7fd0'], [1, '#16305f']); c.fillRect(0, 0, 30, 30); c.translate(15 - 24 * 0.6, 0.6); c.scale(0.6, 0.6); bust(c, false, false, true); c.restore(); el(c, 15, 15, 13.4, 13.4, undefined, '#ffffff', 1.1); el(c, 15, 15, 14.2, 14.2, undefined, '#0b0c12', 0.5); });
  BUSTS.s = (scene.textures.get('speter_bust').getSourceImage() as HTMLCanvasElement).toDataURL();
  // portraits drawn by their own functions: Ashlee Vance ('v', who also walks, as a running mate) and Madison Malone ('m', met on the map)
  for (const [pre, draw] of [['v', bustVance], ['m', bustMadison]] as [string, (c: C2) => void][]) {
    tex(scene, pre + 'peter_bust', 48, 54, (c) => draw(c));
    tex(scene, pre + 'peter_chip', 30, 30, (c) => { c.save(); el(c, 15, 15, 13.4, 13.4); c.clip(); c.fillStyle = lg(c, 0, 0, 0, 30, [0, '#3f7fd0'], [1, '#16305f']); c.fillRect(0, 0, 30, 30); c.translate(15 - 24 * 0.6, 0.6); c.scale(0.6, 0.6); draw(c); c.restore(); el(c, 15, 15, 13.4, 13.4, undefined, '#ffffff', 1.1); el(c, 15, 15, 14.2, 14.2, undefined, '#0b0c12', 0.5); });
    BUSTS[pre] = (scene.textures.get(pre + 'peter_bust').getSourceImage() as HTMLCanvasElement).toDataURL();
  }
  [0, 1, 0.5, -0.5, -1, -0.5, 0.5].forEach((l, i) => tex(scene, i === 0 ? 'vpeter0' : 'vpeterw' + (i - 1), 24, 34, (c) => vance(c, i === 0 ? 0.12 : l)));
  tex(scene, 'vpeterj', 24, 34, (c) => vance(c, 0.9, true));
  tex(scene, 'vpeterf', 24, 34, (c) => vance(c, 0.12, false, true)); // taking a photo
  // a small figure for people you can meet on the map
  tex(scene, 'n_person', 18, 18, (c) => { el(c, 9, 15.6, 6, 1.5, 'rgba(0,0,0,.35)'); el(c, 9, 8.6, 7, 7, lg(c, 0, 2, 0, 16, [0, '#d7b8ff'], [1, '#7a4fd0']), '#0b0c12', 0.7); el(c, 9, 6.6, 2.4, 2.4, '#1c1240'); c.beginPath(); c.arc(9, 14, 4.6, Math.PI, 0); c.fillStyle = '#1c1240'; c.fill(); el(c, 7, 4.6, 2.6, 1.2, 'rgba(255,255,255,.3)'); });
  BUST_URL = (scene.textures.get('peter_bust').getSourceImage() as HTMLCanvasElement).toDataURL();

  // Ātea-1 cutaway, drawn from Peter Beck's own walk-through of a wind-tunnel model (Science Learning Hub, 2011).
  // Proportions are schematic. Flies left to right: exit cone at the left, nose tip at the right.
  tex(scene, 'atea_diagram', 188, 62, (c) => {
    const y = 30, lab = (s: string, x: number, ty: number, ax: number, ay: number, align: CanvasTextAlign = 'center') => { line(c, ax, ay, ax, ty + (ty < y ? 3 : -3), 'rgba(200,214,240,.55)', 0.35); text(c, s, x, ty, 3.7, '#e8ecf5', 700, align); };
    // shock wave off the nose tip
    for (const d of [-1, 1]) { line(c, 180, y, 150, y + d * 13, 'rgba(127,208,255,.55)', 0.5); line(c, 180, y, 158, y + d * 6.4, 'rgba(127,208,255,.3)', 0.4); }
    // exit cone and booster case
    poly(c, [16, y - 2.2, 8, y - 4.4, 8, y + 4.4, 16, y + 2.2], '#8b93a7', OUT, 0.35);
    rr(c, 16, y - 5, 96, 10, 1.2, lg(c, 0, y - 5, 0, y + 5, [0, '#4a4e5e'], [0.35, '#15161c'], [1, '#07080b']), OUT, 0.4);
    for (const d of [-1, 1]) poly(c, [18, y + d * 5, 30, y + d * 5, 20, y + d * 11, 16, y + d * 11], '#c8102e', OUT, 0.35); // fins
    // cutaway: solid fuel grain with its port at the back, liquid oxidiser ahead of it
    rr(c, 19, y - 3.6, 22, 7.2, 0.6, '#8a6238', OUT, 0.25); rr(c, 19, y - 1, 22, 2, 0.4, '#1a0f08'); for (let x = 22; x < 40; x += 3) line(c, x, y - 3.4, x + 1.4, y - 1.2, 'rgba(0,0,0,.25)', 0.3);
    rr(c, 43, y - 3.6, 66, 7.2, 3.4, lg(c, 0, y - 3.6, 0, y + 3.6, [0, '#bfe9ff'], [1, '#3f8fd0']), OUT, 0.25); for (const x of [56, 74, 92]) el(c, x, y - 0.6, 1, 1, 'rgba(255,255,255,.6)');
    line(c, 41, y, 43, y, '#dfe5ee', 0.8);
    // separation joint, the slimmer dart, the nose tip
    poly(c, [112, y - 5, 118, y - 2.6, 118, y + 2.6, 112, y + 5], '#c9ced9', OUT, 0.35); line(c, 112, y - 7, 112, y + 7, '#ffe98a', 0.5);
    rr(c, 118, y - 2.6, 44, 5.2, 0.6, lg(c, 0, y - 2.6, 0, y + 2.6, [0, '#f4f6fa'], [1, '#9aa3b8']), OUT, 0.35);
    for (const [x, col] of [[124, '#2f9d8f'], [134, '#f2d14a'], [144, '#d8452e']] as [number, string][]) rr(c, x, y - 1.5, 6, 3, 0.4, col, OUT, 0.2);
    poly(c, [162, y - 2.6, 180, y, 162, y + 2.6], lg(c, 162, 0, 180, 0, [0, '#c9ced9'], [0.6, '#ff9a4a'], [1, '#ffe98a']), OUT, 0.35);
    // labels, in the game's own words
    lab('EXIT CONE', 4, 8, 11, y - 4.6, 'left'); lab('LIQUID OXIDISER, HIGH PRESSURE', 76, 8, 76, y - 5.2); lab('SEPARATION', 112, 14, 112, y - 7.4); lab('NOSE TIP · ABOUT 900 °C', 186, 8, 176, y - 1, 'right');
    lab('SOLID FUEL', 30, 46, 30, y + 3.8); lab('PAYLOAD · FLIGHT COMPUTER · RECOVERY', 140, 46, 140, y + 2.8);
    line(c, 16, 52, 112, 52, 'rgba(200,214,240,.55)', 0.35); line(c, 16, 50.4, 16, 53.6, 'rgba(200,214,240,.55)', 0.35); line(c, 112, 50.4, 112, 53.6, 'rgba(200,214,240,.55)', 0.35); text(c, 'BOOSTER: NOTHING IN IT BUT PROPELLANT', 64, 57, 3.7, '#ffe98a', 700);
    line(c, 118, 52, 180, 52, 'rgba(200,214,240,.55)', 0.35); text(c, 'DART: SLIMMER, SO LESS DRAG', 149, 57, 3.7, '#ffe98a', 700);
    text(c, 'SHOCK WAVE · MACH 5', 150, 19.6, 3.4, '#7fd0ff', 700);
  });
  DIAGRAMS.atea = (scene.textures.get('atea_diagram').getSourceImage() as HTMLCanvasElement).toDataURL();

  // Story-card scenes: each card is its own place. Drawn for the game; no publisher, broadcaster or magazine artwork.
  const bustImg = (pre: string) => scene.textures.get(pre + 'peter_bust').getSourceImage() as HTMLCanvasElement;
  const chipAt = (pre: string, x: number, y: number, r: number) => { c0.save(); el(c0, x, y, r, r); c0.clip(); c0.fillStyle = lg(c0, 0, y - r, 0, y + r, [0, '#3f7fd0'], [1, '#16305f']); c0.fillRect(x - r, y - r, r * 2, r * 2); c0.drawImage(bustImg(pre), x - r * 0.95, y - r * 0.92, r * 1.9, r * 2.14); c0.restore(); el(c0, x, y, r, r, undefined, '#ffffff', 0.6); };
  let c0!: C2;
  const card = (key: string, fn: (c: C2) => void) => { tex(scene, key, 188, 84, (c) => { c0 = c; fn(c); }); DIAGRAMS[key] = (scene.textures.get(key).getSourceImage() as HTMLCanvasElement).toDataURL(); };
  const vtext = (c: C2, s: string, x: number, y: number, size: number, col: string) => { c.save(); c.translate(x, y); c.rotate(-Math.PI / 2); text(c, s, 0, 0, size, col, 700); c.restore(); };
  // the book: a shelf, its spine, and a reporter's notebook open at the four companies it follows
  card('card_heavens', (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 84, [0, '#2a1e16'], [1, '#140e0a']); c.fillRect(0, 0, 188, 84);
    c.fillStyle = rg(c, 150, 6, 2, 70, [0, 'rgba(255,214,150,.35)'], [1, 'rgba(255,214,150,0)']); c.fillRect(0, 0, 188, 84); // a desk lamp
    rr(c, 4, 60, 92, 4, 0.6, '#6b4a2b', OUT, 0.3); const r = rng(5);
    for (let x = 8, i = 0; x < 88; i++) { const w = 4 + r() * 3, h = 28 + r() * 14; if (i === 5) { rr(c, x, 60 - 50, 11, 50, 0.8, lg(c, x, 0, x + 11, 0, [0, '#10264f'], [0.5, '#1d3a7a'], [1, '#0b1a38']), OUT, 0.35); for (const y of [14, 54]) line(c, x + 1, y, x + 10, y, '#e2b85a', 0.4); vtext(c, 'WHEN THE HEAVENS WENT ON SALE', x + 4.4, 34, 2.4, '#f2e6c4'); vtext(c, 'ASHLEE VANCE', x + 8.2, 34, 1.9, '#e2b85a'); text(c, 'ECCO', x + 5.5, 57, 1.8, '#e2b85a', 700); x += 13; continue; } rr(c, x, 60 - h, w, h, 0.5, ['#6a2a24', '#2f5530', '#5b6275', '#8a6238', '#3a3f4f'][i % 5], OUT, 0.3); line(c, x + 0.8, 60 - h + 3, x + w - 0.8, 60 - h + 3, 'rgba(255,255,255,.2)', 0.3); x += w + 0.6; }
    rr(c, 0, 66, 188, 18, 0, lg(c, 0, 66, 0, 84, [0, '#7a5636'], [1, '#4a321e'])); line(c, 0, 66, 188, 66, 'rgba(255,230,190,.3)', 0.4);
    // the notebook, open
    c.save(); c.translate(140, 40); c.rotate(-0.06);
    rr(c, -38, -26, 76, 48, 1.4, '#f4f2ea', OUT, 0.4); line(c, 0, -26, 0, 22, '#cfc8b6', 0.6); for (let i = -36; i < 38; i += 3.2) el(c, i, -26.6, 0.7, 0.9, undefined, '#8b93a7', 0.35);
    for (let y = -19; y < 20; y += 4.4) { line(c, -35, y, -3, y, 'rgba(70,110,180,.35)', 0.25); line(c, 3, y, 35, y, 'rgba(70,110,180,.35)', 0.25); }
    text(c, 'FOUR COMPANIES', -19, -21, 3, '#1d3a7a', 700); text(c, 'ROCKET LAB', -19, -12.2, 3.8, '#c8102e', 700); text(c, 'ASTRA', -19, -3.4, 3.8, '#2a2e3c', 700); text(c, 'FIREFLY', -19, 5.4, 3.8, '#2a2e3c', 700); text(c, 'PLANET', -19, 14.2, 3.8, '#2a2e3c', 700);
    text(c, 'AUCKLAND', 19, -12.2, 3.2, '#1d3a7a', 600); text(c, 'NOV 2018', 19, -7.4, 2.8, '#1d3a7a', 600); text(c, 'the factory floor', 19, 1, 2.6, '#5b6275', 600); text(c, 'with Peter Beck', 19, 5.4, 2.6, '#5b6275', 600);
    c.restore(); line(c, 108, 72, 132, 64, '#23262f', 1.4); line(c, 132, 64, 134, 63.2, '#d8b25a', 1.2); // a pen
  });
  // Markets with Madison, May 2023: an Auckland studio, and Peter Beck on the line from California
  card('card_mwm', (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 84, [0, '#101626'], [1, '#1a2238']); c.fillRect(0, 0, 188, 84);
    for (let x = 4; x < 188; x += 14) rr(c, x, 4, 11, 52, 1, 'rgba(255,255,255,.035)');
    rr(c, 8, 8, 26, 8, 1.4, '#3a0e0e', '#ff5a4a', 0.6); c.fillStyle = rg(c, 21, 12, 1, 16, [0, 'rgba(255,90,74,.35)'], [1, 'rgba(255,90,74,0)']); c.fillRect(0, 0, 50, 30); text(c, 'ON AIR', 21, 12.2, 4.2, '#ff8a70', 700);
    // the monitor: two windows
    rr(c, 52, 8, 92, 48, 2, '#07090f', '#5b6275', 0.8); rr(c, 94, 56, 8, 6, 0, '#3a3f4f'); rr(c, 84, 61, 28, 2, 0.6, '#3a3f4f');
    for (const [x, pre, place] of [[55, 'm', 'AUCKLAND'], [99, '', 'CALIFORNIA']] as [number, string, string][]) { rr(c, x, 11, 42, 36, 1, lg(c, 0, 11, 0, 47, [0, '#3f7fd0'], [1, '#16305f'])); c.save(); c.beginPath(); c.rect(x, 11, 42, 36); c.clip(); c.drawImage(bustImg(pre), x + 7, 12, 28, 31.5); c.restore(); rr(c, x, 41, 42, 6, 0, 'rgba(7,9,15,.8)'); text(c, place, x + 21, 44.2, 3, '#ffe98a', 700); }
    text(c, 'MARKETS WITH MADISON · 18 MAY 2023', 98, 51.6, 3, '#dfe6f7', 700);
    // the microphone on its arm, headphones
    line(c, 30, 30, 44, 50, '#3a3f4f', 1.4); line(c, 44, 50, 40, 66, '#3a3f4f', 1.4); rr(c, 24, 20, 10, 14, 4, lg(c, 24, 0, 34, 0, [0, '#5b6275'], [0.5, '#aab2c0'], [1, '#3a3f4f']), OUT, 0.4); for (let y = 23; y < 32; y += 2) line(c, 25.4, y, 32.6, y, 'rgba(0,0,0,.35)', 0.3);
    rr(c, 0, 64, 188, 20, 0, lg(c, 0, 64, 0, 84, [0, '#2a3048'], [1, '#141a2c'])); line(c, 0, 64, 188, 64, 'rgba(127,208,255,.3)', 0.5);
    c.beginPath(); c.arc(170, 68, 8, Math.PI, 0); c.strokeStyle = '#23262f'; c.lineWidth = 1.4; c.stroke(); el(c, 162, 69, 2.6, 3.4, '#23262f', OUT, 0.3); el(c, 178, 69, 2.6, 3.4, '#23262f', OUT, 0.3);
    // what they talked about, as cards on the desk
    for (const [x, s, col] of [[12, 'NEUTRON vs FALCON 9', '#ffe98a'], [62, 'STARSHIP · APRIL 2023', '#ff8a70'], [112, 'ELECTRON: RELIABILITY', '#7fd0ff']] as [number, string, string][]) { rr(c, x, 69, 44, 10, 1, '#f4f2ea', OUT, 0.35); rr(c, x, 69, 2, 10, 0, col); text(c, s, x + 23, 74.2, 2.9, '#1d2438', 700); }
  });
  // Wild Wild Space: a clapperboard and a can of film; three companies on the strip
  card('card_wws', (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 84, [0, '#0a0a10'], [1, '#18141c']); c.fillRect(0, 0, 188, 84);
    c.fillStyle = rg(c, 60, 0, 4, 80, [0, 'rgba(255,240,200,.22)'], [1, 'rgba(255,240,200,0)']); c.fillRect(0, 0, 188, 84);
    for (let i = 0; i < 60; i++) { const r = rng(i + 3); el(c, r() * 188, r() * 40, 0.25, 0.25, 'rgba(255,255,255,.5)'); }
    // the clapperboard
    rr(c, 10, 30, 84, 46, 1.4, '#15161c', OUT, 0.5);
    c.save(); c.translate(10, 30); c.rotate(-0.16); rr(c, 0, -9, 84, 8, 0.8, '#f4f4f0', OUT, 0.4); c.save(); c.beginPath(); c.rect(0, -9, 84, 8); c.clip(); for (let x = -6; x < 90; x += 10) poly(c, [x, -1, x + 5, -1, x + 10, -9, x + 5, -9], '#15161c'); c.restore(); c.restore();
    rr(c, 10, 30, 84, 7, 0, '#f4f4f0'); c.save(); c.beginPath(); c.rect(10, 30, 84, 7); c.clip(); for (let x = 4; x < 100; x += 10) poly(c, [x, 37, x + 5, 37, x + 10, 30, x + 5, 30], '#15161c'); c.restore();
    text(c, 'WILD WILD SPACE', 52, 45, 6.6, '#f4f4f0', 700);
    for (const [y, a, b] of [[54, 'DIRECTOR', 'ROSS KAUFFMAN'], [61, 'PREMIERE', 'DC/DOX · 14 JUNE 2024'], [68, 'ON TV', 'HBO AND MAX · 17 JULY 2024']] as [number, string, string][]) { text(c, a, 14, y, 2.8, '#8b93a7', 700, 'left'); text(c, b, 38, y, 3.2, '#f4f4f0', 700, 'left'); line(c, 14, y + 3, 90, y + 3, 'rgba(255,255,255,.18)', 0.3); }
    // the can and the strip
    el(c, 158, 40, 24, 24, lg(c, 134, 16, 182, 64, [0, '#e4e8ee'], [0.5, '#9aa3b5'], [1, '#5b6275']), OUT, 0.5); el(c, 158, 40, 19, 19, undefined, 'rgba(0,0,0,.25)', 0.6); el(c, 158, 40, 4, 4, '#3a3f4f', OUT, 0.3); for (let k = 0; k < 3; k++) { const t = k * 2.09; el(c, 158 + Math.cos(t) * 11, 40 + Math.sin(t) * 11, 4.4, 4.4, '#5b6275', OUT, 0.3); }
    rr(c, 98, 52, 66, 20, 0.6, '#2a1c10', OUT, 0.35); for (let x = 100; x < 162; x += 4) { rr(c, x, 53, 2, 1.6, 0.3, '#f4e6c4'); rr(c, x, 69.4, 2, 1.6, 0.3, '#f4e6c4'); }
    for (const [i, lab] of [[0, 'ROCKET LAB'], [1, 'ASTRA'], [2, 'PLANET']] as [number, string][]) {
      const x = 101 + i * 21; rr(c, x, 55.6, 18, 12.8, 0.4, '#1d3a7a');
      if (i === 0) rr(c, x + 7.6, 57, 2.8, 10, 1, '#0b0c12', '#5b6275', 0.25); // a black carbon rocket
      else if (i === 1) { rr(c, x + 7.8, 57.4, 2.4, 9.6, 1, '#f4f4f0', OUT, 0.25); poly(c, [x + 7.8, 58.6, x + 9, 56.4, x + 10.2, 58.6], '#f4f4f0'); }
      else { rr(c, x + 7.6, 59.6, 2.8, 4.4, 0.3, '#c9ced9', OUT, 0.25); rr(c, x + 2, 60.8, 5.4, 2, 0.2, '#3f6fd0'); rr(c, x + 10.6, 60.8, 5.4, 2, 0.2, '#3f6fd0'); } // a small Earth-imaging satellite
      text(c, lab, x + 9, 77.6, 2.8, '#dfe6f7', 700);
    }
  });
  // Forbes, November 2024: a list with a new name on it, and what Forbes counted
  card('card_forbes', (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 84, [0, '#f4f2ea'], [1, '#dcd6c6']); c.fillRect(0, 0, 188, 84);
    rr(c, 8, 8, 110, 68, 1.4, '#ffffff', '#b8b2a2', 0.5); rr(c, 8, 8, 110, 10, 1.4, '#15171f'); text(c, 'BILLIONAIRES · FORBES ESTIMATES', 63, 13.2, 3.6, '#ffffff', 700); text(c, '15 NOVEMBER 2024', 63, 22.4, 2.8, '#5b6275', 700);
    const r = rng(77); for (let i = 0; i < 6; i++) { const y = 27 + i * 7.6; if (i === 3) continue; rr(c, 14, y, 6, 4.4, 1, '#d6d2c6'); rr(c, 24, y + 0.8, 36 + r() * 24, 2.8, 1.2, '#d6d2c6'); rr(c, 96, y + 0.8, 16, 2.8, 1.2, '#d6d2c6'); }
    const y = 27 + 3 * 7.6; rr(c, 11, y - 2, 104, 8.4, 1, '#fff3c4', '#e2b85a', 0.5); chipAt('', 17, y + 2.2, 3.4); text(c, 'PETER BECK', 24, y + 2.2, 3.6, '#15171f', 700, 'left'); text(c, 'NEW ZEALAND', 62, y + 2.2, 3, '#5b6275', 700, 'left'); text(c, 'US$1 BILLION', 113, y + 2.2, 3.2, '#15171f', 700, 'right');
    rr(c, 98, y - 6.8, 15, 4.4, 1, '#c8102e'); text(c, 'NEW', 105.5, y - 4.6, 2.8, '#ffffff', 700);
    // what the estimate counted
    el(c, 150, 34, 18, 18, '#d6d2c6', OUT, 0.4); c.beginPath(); c.moveTo(150, 34); c.arc(150, 34, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 0.2); c.closePath(); c.fillStyle = '#c8102e'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.4; c.stroke();
    text(c, 'HIS STAKE IN ROCKET LAB', 150, 58, 3.2, '#15171f', 700); text(c, 'ABOUT 10%', 150, 63.4, 3.6, '#c8102e', 700); text(c, '+ MONEY FROM EARLIER SHARE SALES', 150, 71, 2.8, '#5b6275', 700);
  });

  // animals and pickups
  tex(scene, 'sheep', 24, 17, (c) => {
    for (const x of [6, 9, 14, 17]) rr(c, x, 11, 1.5, 5.5, 0.5, '#2a2a33');
    const r = rng(4); for (let i = 0; i < 26; i++) el(c, 5 + r() * 12, 4.5 + r() * 6, 2.6, 2.4, i % 4 ? '#f4f2ea' : '#dcd8cc', 'rgba(120,115,100,.5)', 0.2);
    el(c, 19.5, 7, 3, 2.6, '#2f2f38', OUT, 0.3); el(c, 17.6, 5, 1.3, 0.8, '#2f2f38'); el(c, 20.4, 6.4, 0.55, 0.55, '#fff'); el(c, 20.5, 6.4, 0.25, 0.25, '#111');
    el(c, 18.5, 4.2, 2, 1.5, '#f4f2ea');
  });
  tex(scene, 'gnome', 10, 14, (c) => { poly(c, [5, 0, 8, 6, 2, 6], '#d8452e', OUT, 0.3); el(c, 5, 6.8, 2.4, 2, '#f0c3a2', OUT, 0.3); poly(c, [2.8, 7.4, 7.2, 7.4, 5, 11.5], '#f4f2ea', OUT, 0.25); rr(c, 2.6, 9.6, 4.8, 3.6, 1, '#30508a', OUT, 0.3); rr(c, 2.2, 12.6, 2.4, 1.3, 0.5, '#23262f'); rr(c, 5.4, 12.6, 2.4, 1.3, 0.5, '#23262f'); el(c, 4.2, 6.6, 0.3, 0.3, '#111'); el(c, 5.8, 6.6, 0.3, 0.3, '#111'); });
  tex(scene, 'waterrocket', 10, 16, (c) => { poly(c, [5, 0, 7.4, 4, 2.6, 4], '#d8452e', OUT, 0.3); rr(c, 2.6, 4, 4.8, 8, 1, 'rgba(160,215,255,.9)', OUT, 0.3); rr(c, 2.6, 8, 4.8, 4, 1, '#4d9be8'); rr(c, 4, 12, 2, 1.6, 0.2, '#e8e6df', OUT, 0.2); poly(c, [2.6, 9, 0.6, 13.5, 2.6, 12], '#d8452e', OUT, 0.25); poly(c, [7.4, 9, 9.4, 13.5, 7.4, 12], '#d8452e', OUT, 0.25); });
  tex(scene, 'part', 12, 12, (c) => {
    c.fillStyle = rg(c, 6, 6, 1, 6, [0, 'rgba(255,230,120,.9)'], [1, 'rgba(255,230,120,0)']); c.fillRect(0, 0, 12, 12);
    c.save(); c.translate(6, 6); for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); rr(c, -0.9, -4.4, 1.8, 2, 0.3, '#f2d14a', '#8a6a12', 0.25); } c.restore();
    el(c, 6, 6, 3.1, 3.1, lg(c, 3, 3, 9, 9, [0, '#ffe98a'], [1, '#d9a520']), '#8a6a12', 0.3); el(c, 6, 6, 1.2, 1.2, '#5b4410');
  });

  // tiles (16x16 units)
  tex(scene, 't_workshop', 16, 16, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 16, [0, '#7d8598'], [0.14, '#646b7d'], [1, '#4d5364']); c.fillRect(0, 0, 16, 16);
    c.fillStyle = '#9aa3b5'; c.fillRect(0, 0, 16, 0.8);
    for (let i = 0; i < 4; i++) poly(c, [i * 4, 0.8, i * 4 + 2, 0.8, i * 4 + 1, 2.4, i * 4 - 1, 2.4], '#f2d14a'); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, 2.4, 16, 0.4);
    line(c, 0, 9, 16, 9, 'rgba(0,0,0,.22)', 0.4); line(c, 8, 2.8, 8, 9, 'rgba(0,0,0,.22)', 0.4); line(c, 3, 9, 3, 16, 'rgba(0,0,0,.22)', 0.4); line(c, 12, 9, 12, 16, 'rgba(0,0,0,.22)', 0.4);
    const r = rng(9); for (let i = 0; i < 14; i++) el(c, r() * 16, 3 + r() * 13, 0.3, 0.3, 'rgba(255,255,255,.12)');
  });
  tex(scene, 't_workshop_fill', 16, 16, (c) => { c.fillStyle = '#434858'; c.fillRect(0, 0, 16, 16); line(c, 0, 8, 16, 8, 'rgba(0,0,0,.22)', 0.4); line(c, 5, 0, 5, 8, 'rgba(0,0,0,.22)', 0.4); line(c, 11, 8, 11, 16, 'rgba(0,0,0,.22)', 0.4); });
  tex(scene, 't_mahia', 16, 16, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 16, [0, '#9a6a3c'], [1, '#6e4526']); c.fillRect(0, 0, 16, 16);
    const r = rng(3); for (let i = 0; i < 9; i++) el(c, r() * 16, 7 + r() * 9, 0.6 + r(), 0.5 + r() * 0.5, 'rgba(60,35,18,.45)');
    c.fillStyle = lg(c, 0, 0, 0, 5, [0, '#8fd16a'], [1, '#4f9d4f']); c.beginPath(); c.moveTo(0, 0); c.lineTo(16, 0); c.lineTo(16, 4.2); for (let x = 16; x >= 0; x -= 2) c.quadraticCurveTo(x - 1, 6.4, x - 2, 4.2); c.closePath(); c.fill();
    for (let i = 0; i < 12; i++) { const x = r() * 16; line(c, x, 1.2, x + (r() - 0.5), -0.2 + r() * 0.6, '#b6e88a', 0.3); }
  });
  tex(scene, 't_mahia_fill', 16, 16, (c) => { c.fillStyle = '#6e4526'; c.fillRect(0, 0, 16, 16); const r = rng(8); for (let i = 0; i < 10; i++) el(c, r() * 16, r() * 16, 0.6 + r(), 0.5 + r() * 0.5, 'rgba(60,35,18,.45)'); for (let i = 0; i < 3; i++) el(c, r() * 16, r() * 16, 1.2, 0.9, '#8f8a80', 'rgba(0,0,0,.3)', 0.2); });
  tex(scene, 'p_workshop', 16, 6, (c) => { c.fillStyle = lg(c, 0, 0, 0, 4, [0, '#d2a06a'], [1, '#9a6a3c']); c.fillRect(0, 0, 16, 4); c.fillStyle = '#6b4a2b'; c.fillRect(0, 4, 16, 1.2); line(c, 0, 0.3, 16, 0.3, '#ecc592', 0.4); line(c, 5, 1.4, 12, 1.6, 'rgba(90,55,25,.5)', 0.25); rr(c, 1, 4, 1.4, 2, 0.2, '#4a5066'); rr(c, 13.6, 4, 1.4, 2, 0.2, '#4a5066'); });
  tex(scene, 'p_mahia', 16, 6, (c) => { c.fillStyle = lg(c, 0, 0, 0, 6, [0, '#c8ccd4'], [1, '#737a8a']); c.beginPath(); c.roundRect(0, 0.6, 16, 5, 1.6); c.fill(); c.fillStyle = lg(c, 0, 0, 0, 2, [0, '#8fd16a'], [1, '#4f9d4f']); c.beginPath(); c.roundRect(0, 0, 16, 1.8, 0.8); c.fill(); line(c, 4, 3.2, 7, 4, 'rgba(0,0,0,.25)', 0.3); });
  tex(scene, 'vent', 16, 8, (c) => { rr(c, 3, 3, 10, 5, 1, lg(c, 0, 3, 0, 8, [0, '#8b93a7'], [1, '#3a3f4f']), OUT, 0.3); for (let i = 0; i < 4; i++) rr(c, 4.4 + i * 2, 4.2, 1, 2.6, 0.3, '#15171f'); rr(c, 2, 2.2, 12, 1.2, 0.5, '#d8452e', OUT, 0.25); });

  // workshop props
  tex(scene, 'bike', 44, 24, (c) => {
    for (const x of [8, 35]) { el(c, x, 16.5, 6.6, 6.6, undefined, '#15171f', 1.6); el(c, x, 16.5, 5.2, 5.2, undefined, '#9aa3b5', 0.3); for (let i = 0; i < 8; i++) line(c, x, 16.5, x + Math.cos(i * 0.785) * 5.2, 16.5 + Math.sin(i * 0.785) * 5.2, 'rgba(180,190,205,.7)', 0.2); el(c, x, 16.5, 0.9, 0.9, '#9aa3b5'); }
    line(c, 8, 16.5, 17, 8, '#d8452e', 1.3); line(c, 17, 8, 31, 8, '#d8452e', 1.3); line(c, 31, 8, 35, 16.5, '#d8452e', 1.3); line(c, 17, 8, 22, 16.5, '#d8452e', 1.1); line(c, 22, 16.5, 8, 16.5, '#d8452e', 1.1); line(c, 31, 8, 30, 4.4, '#8b93a7', 0.9); line(c, 28, 4.2, 33, 4.6, '#15171f', 1.1);
    rr(c, 13, 5.6, 7, 1.6, 0.8, '#15171f');
    // peroxide rocket slung along the frame
    rr(c, 6, 9.6, 21, 4.2, 2, lg(c, 0, 9.6, 0, 13.8, [0, '#f2f4f8'], [0.5, '#b8c0cc'], [1, '#6f7890']), OUT, 0.35);
    poly(c, [6, 10.4, 1.2, 9, 1.2, 14.4, 6, 13], lg(c, 0, 9, 0, 14.4, [0, '#8a8f9e'], [1, '#3a3c48']), OUT, 0.3);
    rr(c, 16, 9.6, 1, 4.2, 0, '#d8452e'); text(c, 'H₂O₂', 22, 11.8, 2.2, '#3a3f4f', 700);
  });
  tex(scene, 'mini', 52, 26, (c) => {
    el(c, 26, 24.4, 24, 1.4, 'rgba(0,0,0,.3)');
    c.beginPath(); c.moveTo(2, 19); c.lineTo(2, 13.5); c.quadraticCurveTo(3, 11.5, 11, 11); c.lineTo(15.5, 3.6); c.quadraticCurveTo(16.4, 2.4, 19, 2.4); c.lineTo(36, 2.4); c.quadraticCurveTo(39, 2.6, 40.6, 5); c.lineTo(44, 11); c.quadraticCurveTo(50, 11.6, 50, 14.5); c.lineTo(50, 19); c.closePath();
    c.fillStyle = lg(c, 0, 2, 0, 19, [0, '#3f9a56'], [0.5, '#2f7a47'], [1, '#1f5a34']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.4; c.stroke();
    rr(c, 15.8, 1.6, 22.5, 1.4, 0.7, '#f4f2ea', OUT, 0.25);
    poly(c, [16.6, 5, 26.5, 5, 26.5, 10.6, 13.4, 10.6], lg(c, 0, 5, 0, 11, [0, '#bfe3ff'], [1, '#6fa8d8']), OUT, 0.3); poly(c, [28, 5, 38.4, 5, 41.6, 10.6, 28, 10.6], lg(c, 0, 5, 0, 11, [0, '#bfe3ff'], [1, '#6fa8d8']), OUT, 0.3);
    line(c, 27.2, 11, 27.2, 18.6, 'rgba(0,0,0,.35)', 0.3); rr(c, 29, 13, 2.4, 0.7, 0.3, '#cfd5df');
    rr(c, 1, 16.6, 50.4, 1.6, 0.8, '#cfd5df', OUT, 0.25); el(c, 48.6, 13.6, 1.5, 1.5, '#ffe98a', OUT, 0.25); rr(c, 1.6, 13, 1.2, 2, 0.3, '#d8452e');
    for (const x of [12, 40]) { el(c, x, 20, 4.6, 4.6, '#15171f', OUT, 0.3); el(c, x, 20, 2.2, 2.2, '#cfd5df', OUT, 0.25); }
    rr(c, 44, 8.6, 5, 2.2, 0.6, '#8b93a7', OUT, 0.25); text(c, 'TURBO', 34.5, 15.2, 2.3, '#f4f2ea', 700);
  });
  tex(scene, 'washer', 22, 26, (c) => {
    rr(c, 0.5, 0.5, 21, 25, 1, lg(c, 0, 0, 22, 0, [0, '#e4e8ee'], [0.5, '#c2c8d2'], [1, '#9aa3b5']), OUT, 0.4);
    for (const y of [2.4, 13.6]) { rr(c, 2, y, 18, 10, 0.6, lg(c, 0, y, 0, y + 10, [0, '#d2d8e2'], [1, '#aab2c0']), 'rgba(0,0,0,.35)', 0.3); rr(c, 5, y + 1.4, 12, 1.1, 0.5, '#5b6275'); el(c, 17.6, y + 7.6, 0.6, 0.6, y < 5 ? '#7cc56b' : '#d8452e'); }
  });
  tex(scene, 'jetpack', 20, 26, (c) => {
    for (const x of [2, 12]) { rr(c, x, 3, 6, 17, 3, lg(c, x, 0, x + 6, 0, [0, '#f2f4f8'], [0.5, '#b8c0cc'], [1, '#6f7890']), OUT, 0.35); rr(c, x, 7, 6, 1.4, 0, '#d8452e'); poly(c, [x + 1.4, 20, x + 4.6, 20, x + 5.6, 24.5, x + 0.4, 24.5], '#3a3c48', OUT, 0.3); }
    rr(c, 7.4, 6, 5.2, 9, 1, '#4a5066', OUT, 0.3); line(c, 4, 3, 2, 0.6, '#15171f', 0.8); line(c, 16, 3, 18, 0.6, '#15171f', 0.8);
  });
  tex(scene, 'missile', 44, 18, (c) => {
    rr(c, 0, 14, 44, 2, 0.4, '#6b4a2b', OUT, 0.3); rr(c, 6, 11, 3, 4, 0.3, '#4a5066'); rr(c, 33, 11, 3, 4, 0.3, '#4a5066');
    rr(c, 5, 3, 30, 8.4, 4, lg(c, 0, 3, 0, 11.4, [0, '#e4e8ee'], [0.5, '#9aa3b5'], [1, '#5b6275']), OUT, 0.4);
    poly(c, [35, 4, 42, 2, 42, 12.4, 35, 10.4], lg(c, 0, 2, 0, 12, [0, '#8a8f9e'], [1, '#3a3c48']), OUT, 0.35);
    el(c, 6.6, 7.2, 2, 3.6, '#23262f', OUT, 0.3); for (let i = 0; i < 5; i++) line(c, 13 + i * 4, 3.4, 13 + i * 4, 11, 'rgba(0,0,0,.25)', 0.25); rr(c, 16, 0.8, 9, 2.4, 0.6, '#5b6275', OUT, 0.3);
  });
  tex(scene, 'sign', 46, 30, (c) => { rr(c, 21.5, 14, 3, 16, 0.4, lg(c, 21, 0, 25, 0, [0, '#8a6238'], [1, '#5b3d22']), OUT, 0.3); rr(c, 0.5, 0.5, 45, 15, 1.4, '#f4f2ea', OUT, 0.4); rr(c, 1.8, 1.8, 42.4, 12.4, 0.8, '#1f5a34'); });
  tex(scene, 'pad', 70, 100, (c) => {
    rr(c, 0, 94, 70, 6, 1, lg(c, 0, 94, 0, 100, [0, '#b8c0cc'], [1, '#6f7890']), OUT, 0.3);
    // strongback
    rr(c, 14, 14, 3, 80, 0.3, '#5b6275', OUT, 0.3); rr(c, 22, 14, 3, 80, 0.3, '#5b6275', OUT, 0.3);
    for (let y = 16; y < 92; y += 8) { line(c, 15.5, y, 23.5, y + 8, '#8b93a7', 0.5); line(c, 23.5, y, 15.5, y + 8, '#8b93a7', 0.5); line(c, 14, y, 25, y, '#9aa3b5', 0.6); }
    for (const y of [26, 50, 74]) { rr(c, 25, y, 8, 1.6, 0.3, '#d8452e', OUT, 0.25); }
    electronFull(c, 33, 13.5);
    // lightning masts and tank
    for (const x of [4, 62]) { line(c, x, 2, x, 94, '#8b93a7', 0.7); line(c, x, 2, x, 6, '#d8452e', 0.9); }
    rr(c, 46, 78, 14, 16, 5, lg(c, 46, 0, 60, 0, [0, '#f2f4f8'], [1, '#9aa3b5']), OUT, 0.35); text(c, 'LOX', 53, 86, 3.4, '#4a5066', 700);
  });

  // rockets
  tex(scene, 'electron_s1', 8, 58, (c) => stage1(c, 1, 0));
  tex(scene, 'electron_s2', 8, 22, (c) => { fairing(c, 1, 0); stage2(c, 1, 12); });
  tex(scene, 'electron_s2free', 8, 26, (c) => { vacNozzle(c, 1, 22, true); fairing(c, 1, 0); stage2(c, 1, 12); });
  tex(scene, 'electron_s2bare', 8, 26, (c) => {
    vacNozzle(c, 1, 22, true); stage2(c, 1, 12);
    rr(c, 1.6, 8.6, 4.8, 3.4, 0.6, lg(c, 0, 8.6, 0, 12, [0, '#f2d14a'], [1, '#a8801c']), OUT, 0.25); // kick stage in gold foil
    rr(c, 2.6, 4.6, 2.8, 4, 0.4, '#d7dbe4', OUT, 0.25); rr(c, 0.4, 5.6, 2.2, 1.8, 0.2, '#30508a', OUT, 0.2); rr(c, 5.4, 5.6, 2.2, 1.8, 0.2, '#30508a', OUT, 0.2);
  });
  tex(scene, 'electron_full', 8, 80, (c) => electronFull(c, 1, 0));
  tex(scene, 'atea', 8, 40, (c) => {
    rr(c, 2.4, 20, 3.2, 17, 0.4, lg(c, 2.4, 0, 5.6, 0, [0, '#08080b'], [0.3, '#34353f'], [1, '#08080b']), OUT, 0.25); rr(c, 2.4, 24, 3.2, 1.2, 0, '#d8452e'); rr(c, 2.4, 20, 3.2, 0.8, 0, '#9aa3b5');
    poly(c, [2.4, 31, 0.2, 38, 2.4, 37], '#e8e6df', OUT, 0.25); poly(c, [5.6, 31, 7.8, 38, 5.6, 37], '#e8e6df', OUT, 0.25);
    rr(c, 3.1, 6, 1.8, 14, 0.3, lg(c, 3.1, 0, 4.9, 0, [0, '#08080b'], [0.4, '#34353f'], [1, '#08080b']), OUT, 0.25);
    poly(c, [3.1, 9, 3.1, 6, 4, 0.4, 4.9, 6, 4.9, 9], lg(c, 3.1, 0, 4.9, 0, [0, '#8b93a7'], [0.4, '#e4e8ee'], [1, '#6f7890']), OUT, 0.25); rr(c, 3.1, 12, 1.8, 0.8, 0, '#d8452e'); rr(c, 3.1, 37, 1.8, 1.6, 0.2, '#3a3c48');
  });
  tex(scene, 'curie', 10, 10, (c) => { rr(c, 2, 2, 6, 4, 1, lg(c, 0, 2, 0, 6, [0, '#f2d14a'], [1, '#a8801c']), OUT, 0.3); poly(c, [4, 6, 6, 6, 7, 9, 3, 9], '#6a6f7e', OUT, 0.25); rr(c, 3.4, 0.4, 3.2, 1.8, 0.3, '#d7dbe4', OUT, 0.25); });

  // skies, clouds, planets
  tex(scene, 'sky_day', 320, 180, (c) => { c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#2a78d2'], [0.55, '#6fb7ee'], [1, '#d6ecfb']); c.fillRect(0, 0, 320, 180); c.fillStyle = rg(c, 236, 78, 2, 70, [0, 'rgba(255,250,220,.95)'], [0.12, 'rgba(255,245,200,.55)'], [1, 'rgba(255,245,200,0)']); c.fillRect(0, 0, 320, 180); el(c, 236, 78, 6, 6, '#fffbe6'); });
  tex(scene, 'sky_night', 320, 180, (c) => { c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#050818'], [0.6, '#14254f'], [1, '#33508f']); c.fillRect(0, 0, 320, 180); starfield(c, 320, 150, 220, 17); });
  tex(scene, 'stars', 320, 180, (c) => { starfield(c, 320, 180, 420, 5); c.fillStyle = rg(c, 220, 60, 4, 140, [0, 'rgba(110,90,200,.16)'], [1, 'rgba(110,90,200,0)']); c.fillRect(0, 0, 320, 180); });
  tex(scene, 'cloud1', 70, 24, (c, w, h) => cloud(c, w, h, 1)); tex(scene, 'cloud2', 100, 30, (c, w, h) => cloud(c, w, h, 2)); tex(scene, 'cloud3', 46, 16, (c, w, h) => cloud(c, w, h, 6));
  tex(scene, 'earth', 40, 40, (c) => { c.save(); c.shadowColor = '#6fc3ff'; c.shadowBlur = 22; el(c, 20, 20, 14, 14, '#2a66b8'); c.restore(); planet(c, 20, 20, 14, 'earth'); });
  tex(scene, 'moon', 30, 30, (c) => { c.save(); c.shadowColor = 'rgba(220,225,255,.8)'; c.shadowBlur = 18; el(c, 15, 15, 10, 10, '#c3c6cf'); c.restore(); planet(c, 15, 15, 10, 'moon'); });
  tex(scene, 'earthlimb', 400, 130, (c) => {
    c.save(); c.shadowColor = 'rgba(120,200,255,.95)'; c.shadowBlur = 60; el(c, 200, 830, 800, 800, '#2f7fd6'); c.restore();
    c.save(); el(c, 200, 830, 800, 800); c.clip();
    c.fillStyle = lg(c, 0, 30, 0, 130, [0, '#3f8fe0'], [1, '#123a78']); c.fillRect(0, 0, 400, 130);
    const r = rng(31);
    for (let i = 0; i < 9; i++) { const x = r() * 400, y = 55 + r() * 70; c.beginPath(); for (let k = 0; k < 10; k++) { const t = (k / 10) * 6.283, d = 12 + r() * 22; k ? c.lineTo(x + Math.cos(t) * d * 2, y + Math.sin(t) * d * 0.5) : c.moveTo(x + Math.cos(t) * d * 2, y + Math.sin(t) * d * 0.5); } c.closePath(); c.fillStyle = i % 2 ? 'rgba(79,157,79,.9)' : 'rgba(150,170,95,.9)'; c.fill(); }
    for (let i = 0; i < 40; i++) el(c, r() * 400, 40 + r() * 90, 14 + r() * 30, 1.5 + r() * 2.5, 'rgba(255,255,255,.5)');
    c.restore();
    c.save(); c.beginPath(); c.arc(200, 830, 800, Math.PI * 1.3, Math.PI * 1.7); c.strokeStyle = 'rgba(190,230,255,.9)'; c.lineWidth = 1.2; c.stroke(); c.restore();
  });

  // launch sites: ground line at y = 100 of 150
  const site = (key: string, island: boolean) => tex(scene, key, 320, 150, (c) => drawSite(c, island));
  site('site_mahia', false); site('site_island', true);
  // Wallops Island, Virginia: Launch Complex 2 on a flat barrier island, the Atlantic behind it, Pad 0A and its water tower next door
  tex(scene, 'site_wallops', 320, 150, (c) => drawWallops(c));
  // twilight for the first launch from Virginia: lift-off came about 45 minutes after sunset
  tex(scene, 'sky_dusk', 320, 180, (c) => { c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#141a44'], [0.38, '#3b3f86'], [0.66, '#b0679a'], [0.86, '#f0946a'], [1, '#ffd08a']); c.fillRect(0, 0, 320, 180); starfield(c, 320, 70, 70, 23); c.fillStyle = rg(c, 60, 176, 4, 150, [0, 'rgba(255,220,150,.75)'], [1, 'rgba(255,200,140,0)']); c.fillRect(0, 0, 320, 180); for (const [x, y, w] of [[40, 120, 90], [150, 132, 120], [230, 110, 70]]) { c.fillStyle = 'rgba(70,40,90,.35)'; c.beginPath(); c.ellipse(x, y, w / 2, 2.2, 0, 0, 6.3); c.fill(); } });

  // helicopter catch
  tex(scene, 'heli', 64, 26, (c) => {
    line(c, 30, 5, 30, 8, '#3a3c48', 1.2);
    c.beginPath(); c.moveTo(20, 9); c.quadraticCurveTo(34, 5.6, 46, 8.4); c.quadraticCurveTo(57, 10, 58, 15.5); c.quadraticCurveTo(57, 20.4, 48, 21); c.lineTo(24, 21); c.quadraticCurveTo(19, 20, 17, 15.5); c.lineTo(3, 12.4); c.lineTo(3, 10.2); c.closePath();
    c.fillStyle = lg(c, 0, 6, 0, 21, [0, '#f4f4f0'], [0.55, '#d7dbe4'], [1, '#8b93a7']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.4; c.stroke();
    c.beginPath(); c.moveTo(18, 15.5); c.lineTo(57.6, 15.5); c.quadraticCurveTo(57, 20.4, 48, 21); c.lineTo(24, 21); c.quadraticCurveTo(19.6, 20, 18, 15.5); c.fillStyle = '#d8452e'; c.fill();
    poly(c, [1, 3, 4.6, 3, 5.4, 11, 2.4, 11], '#d8452e', OUT, 0.3); el(c, 3, 5, 3, 3, 'rgba(60,65,80,.35)');
    poly(c, [47, 9.6, 53.4, 10.6, 56.4, 14.4, 47, 14.4], lg(c, 0, 9, 0, 15, [0, '#bfe3ff'], [1, '#4d7fb0']), OUT, 0.3);
    for (let i = 0; i < 5; i++) rr(c, 24 + i * 4.4, 10.8, 2.8, 2.6, 0.6, '#4d7fb0', OUT, 0.2);
    rr(c, 26, 20.4, 18, 3, 1.4, '#8b93a7', OUT, 0.3); el(c, 29, 24, 1.6, 1.6, '#15171f'); el(c, 41, 24, 1.6, 1.6, '#15171f'); el(c, 52, 23.4, 1.4, 1.4, '#15171f'); line(c, 52, 21, 52, 23, '#3a3c48', 0.6);
    rr(c, 26, 7, 10, 2.4, 1, '#5b6275', OUT, 0.25);
  });
  tex(scene, 'rotor', 70, 4, (c) => { c.fillStyle = lg(c, 0, 0, 70, 0, [0, 'rgba(30,32,40,0)'], [0.15, 'rgba(30,32,40,.55)'], [0.5, 'rgba(30,32,40,.9)'], [0.85, 'rgba(30,32,40,.55)'], [1, 'rgba(30,32,40,0)']); c.beginPath(); c.ellipse(35, 2, 35, 1.3, 0, 0, 6.3); c.fill(); });
  tex(scene, 'chute', 44, 30, (c) => {
    for (let i = 0; i < 7; i++) line(c, 3 + i * 6.3, 13.5, 22, 29.5, 'rgba(60,65,80,.7)', 0.22);
    c.save(); c.beginPath(); c.moveTo(1, 14); c.bezierCurveTo(2, -4, 42, -4, 43, 14); c.quadraticCurveTo(22, 9.4, 1, 14); c.clip();
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f4f2ea' : '#f28c28'; c.fillRect(1 + i * 5.25, 0, 5.3, 15); }
    c.fillStyle = lg(c, 0, 0, 0, 15, [0, 'rgba(255,255,255,.35)'], [1, 'rgba(0,0,0,.28)']); c.fillRect(0, 0, 44, 15); c.restore();
    c.beginPath(); c.moveTo(1, 14); c.bezierCurveTo(2, -4, 42, -4, 43, 14); c.quadraticCurveTo(22, 9.4, 1, 14); c.strokeStyle = OUT; c.lineWidth = 0.35; c.stroke();
  });
  tex(scene, 'ship', 84, 26, (c) => {
    poly(c, [2, 14, 82, 14, 76, 24, 9, 24], lg(c, 0, 14, 0, 24, [0, '#3a4a66'], [1, '#1c2538']), OUT, 0.4); rr(c, 2, 13, 80, 1.6, 0.4, '#d8452e');
    rr(c, 50, 4, 20, 9.4, 0.8, '#f4f2ea', OUT, 0.35); for (let i = 0; i < 4; i++) rr(c, 52.4 + i * 4.4, 6, 2.8, 2.4, 0.3, '#4d7fb0'); rr(c, 56, 0.6, 6, 3.6, 0.4, '#d7dbe4', OUT, 0.3);
    line(c, 20, 13, 30, 1, '#f2d14a', 1); line(c, 30, 1, 38, 6, '#f2d14a', 0.6); line(c, 38, 6, 38, 10, '#15171f', 0.3); rr(c, 8, 9.6, 30, 3.4, 0.5, '#5b6275', OUT, 0.3);
  });
  tex(scene, 'sea', 320, 30, (c) => { c.fillStyle = lg(c, 0, 0, 0, 30, [0, '#3f8fe0'], [1, '#123a78']); c.fillRect(0, 0, 320, 30); const r = rng(77); for (let i = 0; i < 70; i++) { const x = r() * 320, y = 1 + r() * 28; line(c, x, y, x + 4 + r() * 9, y, `rgba(220,240,255,${0.15 + r() * 0.3})`, 0.4); } line(c, 0, 0.3, 320, 0.3, 'rgba(230,245,255,.8)', 0.6); });

  // hot-fire
  tex(scene, 'rutherford', 40, 52, (c) => {
    rr(c, 13, 0, 14, 4, 0.6, '#5b6275', OUT, 0.3); // mount
    for (const s of [-1, 1]) { const x = 20 + s * 11; rr(c, x - 4.5, 6, 9, 13, 2.4, lg(c, x - 4.5, 0, x + 4.5, 0, [0, '#3a3f4f'], [0.4, '#6f7890'], [1, '#23262f']), OUT, 0.35); rr(c, x - 4.5, 9, 9, 1.4, 0, '#f2d14a'); el(c, x, 14.5, 2.2, 2.2, '#15171f', '#8b93a7', 0.3); line(c, x, 19, 20 + s * 3, 24, '#b8c0cc', 1.2); }
    rr(c, 14.4, 4, 11.2, 14, 2, lg(c, 14, 0, 26, 0, [0, '#8b93a7'], [0.35, '#e4e8ee'], [1, '#5b6275']), OUT, 0.35); // injector and chamber
    for (let i = 0; i < 5; i++) line(c, 14.8, 6 + i * 2.4, 25.2, 6 + i * 2.4, 'rgba(0,0,0,.18)', 0.25);
    rr(c, 16.6, 18, 6.8, 5, 1, lg(c, 16, 0, 24, 0, [0, '#6f7890'], [0.4, '#cfd5df'], [1, '#4a5066']), OUT, 0.3);
    c.beginPath(); c.moveTo(16.8, 23); c.lineTo(23.2, 23); c.bezierCurveTo(24.6, 32, 30, 42, 33, 51); c.lineTo(7, 51); c.bezierCurveTo(10, 42, 15.4, 32, 16.8, 23); c.closePath();
    c.fillStyle = lg(c, 7, 0, 33, 0, [0, '#3a3c48'], [0.3, '#9aa3b5'], [0.55, '#5b6275'], [1, '#23262f']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.4; c.stroke();
    for (let i = 1; i < 7; i++) { const y = 23 + i * 4, w = 3.4 + i * 1.5; line(c, 20 - w, y, 20 + w, y, 'rgba(0,0,0,.2)', 0.25); }
  });
  tex(scene, 'bg_stand', 320, 180, (c) => drawStand(c));

  // world map and its nodes
  tex(scene, 'map', MAPW, MAPH, drawMap);
  const node = (key: string, c0: string, c1: string, icon: (c: C2) => void) => tex(scene, key, 18, 18, (c) => {
    el(c, 9, 15.6, 6.4, 1.6, 'rgba(0,0,0,.35)');
    rr(c, 2, 1.6, 14, 14, 3.4, lg(c, 0, 1.6, 0, 15.6, [0, c0], [1, c1]), '#0b0c12', 0.7); rr(c, 3.2, 2.6, 11.6, 4.4, 2.2, 'rgba(255,255,255,.28)');
    icon(c);
  });
  node('n_platform', '#8fe08a', '#3f9a4c', (c) => { rr(c, 4.6, 11, 8.8, 1.8, 0.6, '#0f2a16'); rr(c, 7.4, 6.6, 3.2, 4.4, 1, '#0f2a16'); el(c, 9, 5.2, 1.7, 1.7, '#0f2a16'); });
  node('n_launch', '#ff9a7a', '#d8452e', (c) => { c.beginPath(); c.moveTo(9, 3.4); c.quadraticCurveTo(11.4, 6, 10.6, 11.4); c.lineTo(7.4, 11.4); c.quadraticCurveTo(6.6, 6, 9, 3.4); c.fillStyle = '#3a0f08'; c.fill(); poly(c, [7.4, 9.4, 5.6, 12.6, 7.4, 11.6], '#3a0f08'); poly(c, [10.6, 9.4, 12.4, 12.6, 10.6, 11.6], '#3a0f08'); poly(c, [8, 11.8, 10, 11.8, 9, 14], '#fff3c4'); });
  node('n_minigame', '#ffe98a', '#d9a520', (c) => { c.save(); c.translate(9, 8.6); c.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283 - 1.5708, d = i % 2 ? 2 : 4.6; i ? c.lineTo(Math.cos(a) * d, Math.sin(a) * d) : c.moveTo(Math.cos(a) * d, Math.sin(a) * d); } c.closePath(); c.fillStyle = '#4a3408'; c.fill(); c.restore(); });
  node('n_card', '#a8ccff', '#4d7fd0', (c) => { rr(c, 5, 4, 8, 10, 0.8, '#0f2247'); for (let i = 0; i < 3; i++) rr(c, 6.2, 5.6 + i * 2.4, i === 2 ? 3.6 : 5.6, 1, 0.3, '#a8ccff'); });
  node('n_locked', '#b0b6c6', '#5b6275', (c) => { rr(c, 5.6, 8, 6.8, 5.4, 1, '#23262f'); c.beginPath(); c.arc(9, 8, 2.2, Math.PI, 0); c.strokeStyle = '#23262f'; c.lineWidth = 1.1; c.stroke(); });
  tex(scene, 'check', 8, 8, (c) => { el(c, 4, 4, 3.6, 3.6, '#2f9a4c', '#0b0c12', 0.5); c.beginPath(); c.moveTo(2.2, 4.2); c.lineTo(3.5, 5.6); c.lineTo(5.9, 2.7); c.strokeStyle = '#fff'; c.lineWidth = 0.9; c.stroke(); });
  tex(scene, 'ring', 26, 26, (c) => { el(c, 13, 13, 11, 11, undefined, 'rgba(255,255,255,.9)', 1); });
}
