import Phaser from 'phaser';
import { tex, el, lg, rg, rr, poly, line, text, rng, OUT, BUSTS, DIAGRAMS, type C2 } from './art';

// ---------------------------------------------------------------- the four YouTube creators of the Q2 2024 interview
// Drawn for the game, head and shoulders (48 x 54 units), to the likeness rules in docs/PROJECT_SPEC.md §7.0. No photo is
// shipped: each drawing was made by looking at the reference stills linked from GitHub issue #4 (each creator's own YouTube
// channel picture, and for Scott O a frame of the full interview, because his channel picture is a graphic, not a photo).
// Each is shown in his public role only, as a YouTube creator, under his channel's name and handle.
//
// Likeness notes:
// - Vince (Vince is Bullish, @vinceisbullish): very short light-brown hair, receding at the temples with a high forehead;
//   a short, ginger-brown beard and moustache; a wide grin that shows his teeth; a black V-neck tee.
// - Dave G (Dave G Investing, @daveginvesting): short reddish-brown hair, brushed up and to the side at the front;
//   short at the sides; clean-shaven; a young, rounded face with a small closed smile; a white shirt with a dark red tie.
// - Matt Farley (MattMoney, @RealMattMoney): auburn hair swept to one side from a parting, with volume on top; a full ginger beard;
//   a broad, round face and a big smile that shows his teeth; a dark jacket, white shirt and black bow tie.
// - Scott O (@scotto2050): short blond hair, faded at the sides and a little longer on top; dark rectangular glasses,
//   heavier along the top rim; light stubble; a dark button-down shirt over a white tee, white earphone wire.

/** Chip prefixes, used as `<pre>peter_bust` and `<pre>peter_chip` like every other character. */
export const CREATOR_PRE = { vince: 'cv', dave: 'cd', matt: 'cm', scott: 'cs' } as const;

const SKIN = (c: C2) => rg(c, 21.5, 22, 2, 25, [0, '#f7d2b8'], [0.65, '#eebb9c'], [1, '#d59c7e']);
const shoulders = (c: C2, fill: string | CanvasGradient) => { c.beginPath(); c.moveTo(0, 54); c.quadraticCurveTo(3, 46.8, 15, 45.4); c.lineTo(33, 45.4); c.quadraticCurveTo(45, 46.8, 48, 54); c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.5; c.stroke(); };
const neck = (c: C2, w = 13) => rr(c, 24 - w / 2, 35, w, 13, 3, lg(c, 0, 38, 0, 48, [0, '#c78f72'], [1, '#e6ae8f']));
/** A face outline: `top` is how high the cranium goes, `jaw` how wide the chin stays, `chin` how low it comes. */
function face(c: C2, sx: number, top: number, jaw: number, chin: number) {
  c.beginPath(); c.moveTo(sx, 21); c.bezierCurveTo(sx, top, 48 - sx, top, 48 - sx, 21);
  c.bezierCurveTo(48 - sx + 0.2, 28, 48 - jaw + 1.4, 33, 48 - jaw, 37); c.bezierCurveTo(48 - jaw - 1.8, 40.4, 29.4, chin, 24, chin); c.bezierCurveTo(18.6, chin, jaw + 1.8, 40.4, jaw, 37); c.bezierCurveTo(jaw - 1.4, 33, sx - 0.2, 28, sx, 21); c.closePath();
  c.fillStyle = SKIN(c); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.5; c.stroke();
  for (const x of [16.8, 31.2]) { c.fillStyle = rg(c, x, 30, 0, 4.6, [0, 'rgba(225,115,100,.24)'], [1, 'rgba(225,115,100,0)']); c.fillRect(x - 5, 25, 10, 10); }
}
const ears = (c: C2, x0 = 12, x1 = 36) => { el(c, x0, 25.6, 1.6, 3.2, '#e0a689', OUT, 0.4); el(c, x1, 25.6, 1.6, 3.2, '#e0a689', OUT, 0.4); };
/** Eyes, brows and nose. `smile` narrows the eyes; `iris` and `brow` are colours. */
function eyes(c: C2, iris: string, brow: string, smile = 0, browW = 0.8) {
  for (const ex of [18.9, 29.1]) {
    const h = 1.1 - smile * 0.45;
    el(c, ex, 23.3, 2.3, h, '#fbfbf8'); el(c, ex + 0.1, 23.3, 0.95, Math.min(0.95, h), iris, 'rgba(30,30,40,.6)', 0.25); el(c, ex + 0.1, 23.3, 0.45, Math.min(0.46, h), '#0e0e12');
    c.beginPath(); c.moveTo(ex - 2.6, 23.4); c.quadraticCurveTo(ex, 21.6 + smile * 0.5, ex + 2.6, 23.2); c.strokeStyle = '#2e2016'; c.lineWidth = 0.65; c.stroke();
    if (smile) { c.beginPath(); c.moveTo(ex - 2.1, 24.2); c.quadraticCurveTo(ex, 25.4, ex + 2.2, 24.1); c.strokeStyle = 'rgba(175,115,92,.7)'; c.lineWidth = 0.4; c.stroke(); for (const dy of [-0.6, 0.6]) line(c, ex + (ex < 24 ? -2.9 : 2.9), 23.4 + dy * 0.5, ex + (ex < 24 ? -4.1 : 4.1), 23.4 + dy, 'rgba(170,110,88,.5)', 0.3); }
  }
  line(c, 15.8, 20.6, 21.6, 20.1, brow, browW); line(c, 26.4, 20.1, 32.2, 20.6, brow, browW);
  c.beginPath(); c.moveTo(24.9, 23.4); c.quadraticCurveTo(26.6, 28.6, 26.2, 29.6); c.quadraticCurveTo(24.3, 31, 21.9, 29.8); c.strokeStyle = 'rgba(180,115,92,.85)'; c.lineWidth = 0.55; c.stroke();
}
/** A wide open smile with teeth (`w` half-width), or a small closed one. */
function mouth(c: C2, open: boolean, w = 5.8, y = 33.2, lip = '#8a4338') {
  if (open) { c.beginPath(); c.moveTo(24 - w, y); c.quadraticCurveTo(24, y + 6.2, 24 + w, y); c.quadraticCurveTo(24, y + 1.2, 24 - w, y); c.closePath(); c.fillStyle = '#fbf6ee'; c.fill(); c.strokeStyle = lip; c.lineWidth = 0.6; c.stroke(); line(c, 24 - w + 1.2, y + 1.1, 24 + w - 1.2, y + 1.1, 'rgba(170,120,100,.35)', 0.3); }
  else { c.beginPath(); c.moveTo(24 - w, y); c.quadraticCurveTo(24, y + 2.2, 24 + w, y - 0.2); c.strokeStyle = lip; c.lineWidth = 0.55; c.stroke(); }
}
/** Short facial hair: a filled shape round the jaw and lip, with a few strokes for texture. */
function beard(c: C2, col: string, dark: string, full: boolean, seed: number) {
  c.save(); c.globalAlpha = full ? 0.95 : 0.78;
  c.beginPath(); c.moveTo(13.2, 27); c.bezierCurveTo(13.6, 34, 17, 41.4 + (full ? 2.4 : 0), 24, 42.6 + (full ? 2.6 : 0)); c.bezierCurveTo(31, 41.4 + (full ? 2.4 : 0), 34.4, 34, 34.8, 27);
  c.lineTo(33, 29.6); c.bezierCurveTo(31.4, 33.6, 29.6, 36.6, 24, 36.8); c.bezierCurveTo(18.4, 36.6, 16.6, 33.6, 15, 29.6); c.closePath();
  c.fillStyle = lg(c, 0, 27, 0, 44, [0, col], [1, dark]); c.fill();
  poly(c, [18.6, 32.2, 21.4, 30.6, 24, 31.2, 26.6, 30.6, 29.4, 32.2, 28, 33, 24, 32.4, 20, 33], col); // moustache
  c.restore();
  const r = rng(seed); c.strokeStyle = dark; c.lineWidth = 0.3;
  for (let i = 0; i < (full ? 70 : 40); i++) { const t = 0.15 + r() * 0.7, x = 14.5 + t * 19, y = 33 + Math.sin(t * Math.PI) * (full ? 9 : 6.5) * r() + 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 0.8, y + 0.9); c.stroke(); }
}

function bustVince(c: C2) {
  shoulders(c, lg(c, 0, 0, 48, 0, [0, '#2a2b31'], [0.5, '#17181c'], [1, '#0c0d10'])); // black tee
  neck(c); poly(c, [18.6, 45.2, 29.4, 45.2, 24, 51.6], '#e6ae8f'); line(c, 18.6, 45.2, 24, 51.6, '#0a0a0d', 0.9); line(c, 29.4, 45.2, 24, 51.6, '#0a0a0d', 0.9); // the V-neck
  ears(c, 12.2, 35.8);
  face(c, 12.6, 3.2, 14, 42);
  // very short hair, receding at the temples: a thin cap with stubble texture, the forehead high and bare
  c.save(); c.beginPath(); c.moveTo(12.6, 21); c.bezierCurveTo(12.6, 3.2, 35.4, 3.2, 35.4, 21); c.lineTo(34.8, 19.4); c.bezierCurveTo(34, 15, 32.2, 12.6, 30, 12.2); c.quadraticCurveTo(27, 12.8, 24, 13.4); c.quadraticCurveTo(21, 12.8, 18, 12.2); c.bezierCurveTo(15.8, 12.6, 14, 15, 13.2, 19.4); c.closePath();
  c.fillStyle = lg(c, 0, 4, 0, 18, [0, 'rgba(112,78,50,.92)'], [1, 'rgba(120,84,54,.7)']); c.fill(); c.clip();
  const r = rng(41); for (let i = 0; i < 260; i++) el(c, 12 + r() * 24, 4 + r() * 15, 0.17, 0.17, 'rgba(70,46,28,.6)'); c.restore(); // close-cropped: stubble texture
  beard(c, '#a8683e', '#7a4a2a', false, 17);
  eyes(c, '#6f8799', '#8a6040', 0.7, 0.7);
  mouth(c, true, 6);
}
function bustDave(c: C2) {
  shoulders(c, lg(c, 0, 0, 48, 0, [0, '#ffffff'], [0.6, '#eef1f5'], [1, '#c8ced8'])); // white shirt
  neck(c, 12);
  poly(c, [17.4, 44.8, 24, 47.6, 21.6, 50.6], '#f4f6f9', OUT, 0.35); poly(c, [30.6, 44.8, 24, 47.6, 26.4, 50.6], '#f4f6f9', OUT, 0.35); // collar points
  poly(c, [22.4, 47.2, 25.6, 47.2, 25, 48.8, 23, 48.8], '#8a1f24', OUT, 0.3); poly(c, [23, 48.8, 25, 48.8, 26.2, 54, 21.8, 54], lg(c, 22, 0, 26, 0, [0, '#9a2329'], [1, '#6a1419']), OUT, 0.3); // dark red tie
  ears(c, 12.4, 35.6);
  face(c, 12.8, 6.6, 14.2, 41.4);
  // short reddish-brown hair, brushed up and over to the side at the front
  for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(24 + sg * 11.4, 21); c.bezierCurveTo(24 + sg * 11.8, 15, 24 + sg * 10.6, 11, 24 + sg * 8.4, 9); c.lineTo(24 + sg * 8, 12.6); c.bezierCurveTo(24 + sg * 9.6, 14.4, 24 + sg * 10.4, 17, 24 + sg * 10.4, 21); c.closePath(); c.fillStyle = '#7e4a28'; c.fill(); } // short at the sides
  c.beginPath(); c.moveTo(15.4, 13.6); c.bezierCurveTo(14.6, 8, 17.4, 5, 21, 4.4); c.bezierCurveTo(22.6, 1.6, 27.4, 1.2, 30.6, 3); c.bezierCurveTo(34, 4.8, 34.6, 9, 33.2, 13.4); c.bezierCurveTo(31.4, 11.2, 28.6, 10.4, 25.6, 10.8); c.quadraticCurveTo(20, 11, 15.4, 13.6); c.closePath(); // the quiff, highest at the front
  c.fillStyle = lg(c, 14, 1, 34, 13, [0, '#c08250'], [0.5, '#9a5c30'], [1, '#6e3f20']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.45; c.stroke();
  c.save(); c.clip(); for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(15 + i * 1.6, 13 - i * 0.2); c.quadraticCurveTo(18 + i * 1.4, 6, 24 + i * 1, 1.6); c.strokeStyle = i % 3 ? 'rgba(235,185,135,.45)' : 'rgba(60,30,14,.4)'; c.lineWidth = 0.35; c.stroke(); } c.restore();
  eyes(c, '#7a8f70', '#8a5530', 0.25, 0.75);
  mouth(c, false, 3.6, 33.6, '#a0524a'); for (const x of [19.6, 28.4]) { c.beginPath(); c.arc(x, 33.4, 0.8, Math.PI * 0.6, Math.PI * 1.4); c.strokeStyle = 'rgba(180,115,92,.5)'; c.lineWidth = 0.3; c.stroke(); }
}
function bustMatt(c: C2) {
  shoulders(c, lg(c, 0, 0, 48, 0, [0, '#2a2d38'], [0.5, '#1a1c24'], [1, '#0e0f14'])); // dark jacket
  poly(c, [16, 45.4, 32, 45.4, 28.4, 54, 19.6, 54], '#f2f3f6', OUT, 0.35); // white shirt
  neck(c, 14.4);
  poly(c, [15.6, 45.4, 21.4, 54, 13, 54, 11.4, 48.4], '#23252e', OUT, 0.35); poly(c, [32.4, 45.4, 26.6, 54, 35, 54, 36.6, 48.4], '#23252e', OUT, 0.35); // lapels
  poly(c, [18.6, 47, 23.4, 48.6, 18.6, 50.6], '#0d0d10', OUT, 0.3); poly(c, [29.4, 47, 24.6, 48.6, 29.4, 50.6], '#0d0d10', OUT, 0.3); rr(c, 22.8, 47.6, 2.4, 2, 0.5, '#151519', OUT, 0.3); // black bow tie
  ears(c, 11.4, 36.6);
  face(c, 11.8, 5.6, 13, 42.4); // a broad, round face
  // auburn hair, swept up and back, with volume on top
  c.beginPath(); c.moveTo(11.8, 21); c.bezierCurveTo(10.4, 10, 13.4, 4, 18, 3); c.bezierCurveTo(24, 0.4, 33, 0.6, 36.2, 6.4); c.bezierCurveTo(37.6, 10, 37.2, 15, 36.4, 21); c.lineTo(35.2, 16.4); c.bezierCurveTo(34.4, 12.6, 31, 10, 26, 9.8); c.quadraticCurveTo(19, 9.4, 15.6, 11.4); c.quadraticCurveTo(13.4, 13.4, 13, 16.4); c.closePath();
  c.fillStyle = lg(c, 10, 0, 38, 18, [0, '#c08250'], [0.5, '#9a5c30'], [1, '#6e3f1f']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.45; c.stroke();
  c.save(); c.clip(); for (let i = 0; i < 13; i++) { c.beginPath(); c.moveTo(17 + i * 0.3, 3.4 + i * 0.5); c.bezierCurveTo(22, 1.4 + i * 0.6, 30, 2 + i * 0.7, 36 + i * 0.1, 8 + i * 0.9); c.strokeStyle = i % 3 ? 'rgba(235,185,130,.42)' : 'rgba(70,36,16,.42)'; c.lineWidth = 0.38; c.stroke(); } c.restore();
  line(c, 17.6, 3.2, 15.8, 10.8, 'rgba(70,36,16,.6)', 0.45); // the parting
  beard(c, '#b4723e', '#84502a', true, 29);
  eyes(c, '#6d8596', '#8a5a34', 0.6, 0.8);
  mouth(c, true, 5.6, 33.6);
}
function bustScott(c: C2) {
  shoulders(c, lg(c, 0, 0, 48, 0, [0, '#2a2f3e'], [0.5, '#1b1f2a'], [1, '#10131a'])); // dark button-down shirt
  neck(c, 12.4);
  c.beginPath(); c.arc(24, 45, 4.4, 0.1, Math.PI - 0.1); c.fillStyle = '#f2f3f6'; c.fill(); // white tee at the collar
  poly(c, [17.6, 44.6, 23, 47.8, 19.6, 50.4], '#232836', OUT, 0.35); poly(c, [30.4, 44.6, 25, 47.8, 28.4, 50.4], '#232836', OUT, 0.35); // collar
  for (const y of [50.6, 53]) el(c, 24, y, 0.45, 0.45, '#8b93a7');
  ears(c, 12.4, 35.6);
  face(c, 12.8, 5.2, 14.4, 41.8);
  // short blond hair: faded close at the sides, a little longer on top
  for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(24 + sg * 11.2, 22); c.bezierCurveTo(24 + sg * 11.3, 16, 24 + sg * 10.6, 12, 24 + sg * 9, 9.6); c.lineTo(24 + sg * 8.6, 13); c.bezierCurveTo(24 + sg * 9.8, 15, 24 + sg * 10.2, 18, 24 + sg * 10.2, 22); c.closePath(); c.fillStyle = 'rgba(184,154,98,.55)'; c.fill(); } // faded short at the sides
  c.beginPath(); c.moveTo(14.4, 17); c.bezierCurveTo(13.6, 9, 16.4, 4.6, 22, 4); c.bezierCurveTo(28.6, 3.2, 34.2, 5.4, 33.8, 15.4); c.bezierCurveTo(32.4, 12.4, 30, 11.2, 27, 11.4); c.quadraticCurveTo(21, 10.4, 17.4, 12.6); c.quadraticCurveTo(15.4, 14, 14.4, 17); c.closePath();
  c.fillStyle = lg(c, 14, 2, 34, 14, [0, '#ecdcae'], [0.5, '#d2b67c'], [1, '#a88a52']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.45; c.stroke();
  c.save(); c.clip(); for (let i = 0; i < 11; i++) { c.beginPath(); c.moveTo(15 + i * 1.9, 13 - i * 0.12); c.quadraticCurveTo(19 + i * 1.6, 6.4, 26 + i * 1.2, 4.2); c.strokeStyle = i % 2 ? 'rgba(255,245,210,.55)' : 'rgba(140,110,60,.4)'; c.lineWidth = 0.35; c.stroke(); } c.restore();
  line(c, 18.4, 12.2, 19.6, 5.4, 'rgba(120,92,50,.55)', 0.4); // side parting
  // light stubble
  const r = rng(53); c.fillStyle = 'rgba(160,120,70,.28)'; for (let i = 0; i < 120; i++) { const t = r() * Math.PI, d = r(); el(c, 24 + Math.cos(t) * (6 + d * 8), 33 + Math.sin(t) * (3 + d * 6.6), 0.16, 0.16); }
  eyes(c, '#7c95a8', '#a88a52', 0, 0.7);
  // dark rectangular glasses, heavier along the top
  for (const ex of [18.9, 29.1]) { rr(c, ex - 4, 20.9, 8, 5, 1.2, 'rgba(190,215,235,.12)', '#141418', 0.55); line(c, ex - 4, 21.2, ex + 4, 21.2, '#141418', 1.1); }
  line(c, 22.9, 22.4, 25.1, 22.4, '#141418', 0.6); line(c, 14.9, 22, 12.6, 22.6, '#141418', 0.6); line(c, 33.1, 22, 35.4, 22.6, '#141418', 0.6);
  mouth(c, false, 3.4, 34, '#9a5a4c');
  c.beginPath(); c.moveTo(12.6, 28); c.bezierCurveTo(11.6, 36, 15, 44, 17.4, 54); c.strokeStyle = '#f4f4f4'; c.lineWidth = 0.4; c.stroke(); el(c, 12.6, 27.6, 0.8, 0.9, '#f4f4f4', '#9aa0aa', 0.25); // earphone and its wire
}

/** Draw the four portraits and their round chips, and register them for the DOM cards (BUSTS). Called once at boot. */
export function makeCreators(scene: Phaser.Scene) {
  const all: [string, (c: C2) => void][] = [[CREATOR_PRE.vince, bustVince], [CREATOR_PRE.dave, bustDave], [CREATOR_PRE.matt, bustMatt], [CREATOR_PRE.scott, bustScott]];
  for (const [pre, draw] of all) {
    tex(scene, pre + 'peter_bust', 48, 54, (c) => draw(c));
    tex(scene, pre + 'peter_chip', 30, 30, (c) => { c.save(); el(c, 15, 15, 13.4, 13.4); c.clip(); c.fillStyle = lg(c, 0, 0, 0, 30, [0, '#d8452e'], [1, '#6a1a12']); c.fillRect(0, 0, 30, 30); c.translate(15 - 24 * 0.6, 0.6); c.scale(0.6, 0.6); draw(c); c.restore(); el(c, 15, 15, 13.4, 13.4, undefined, '#ffffff', 1.1); el(c, 15, 15, 14.2, 14.2, undefined, '#0b0c12', 0.5); });
    BUSTS[pre] = (scene.textures.get(pre + 'peter_bust').getSourceImage() as HTMLCanvasElement).toDataURL();
  }
  // the cast of the Q2 2024 interview, for the level's intro card: the four creators, then their two guests (drawn by art.ts)
  const bust = (pre: string) => scene.textures.get(pre + 'peter_bust').getSourceImage() as HTMLCanvasElement;
  tex(scene, 'cast_q2_2024', 188, 62, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 62, [0, '#1a1630'], [1, '#0a0912']); c.fillRect(0, 0, 188, 62);
    const who: [string, string, string, boolean][] = [[CREATOR_PRE.vince, 'VINCE', 'Vince is Bullish', false], [CREATOR_PRE.dave, 'DAVE G', 'Dave G Investing', false], [CREATOR_PRE.matt, 'MATT FARLEY', 'MattMoney', false], [CREATOR_PRE.scott, 'SCOTT O', '@scotto2050', false], ['', 'SIR PETER BECK', 'CEO', true], ['a', 'ADAM SPICE', 'CFO', true]];
    who.forEach(([pre, name, sub, guest], i) => {
      const x = 4 + i * 30.4 + (guest ? 4 : 0);
      rr(c, x, 6, 27, 30, 2, lg(c, 0, 6, 0, 36, guest ? [0, '#3f7fd0'] : [0, '#d8452e'], guest ? [1, '#16305f'] : [1, '#6a1a12']));
      c.save(); c.beginPath(); c.roundRect(x, 6, 27, 30, 2); c.clip(); c.drawImage(bust(pre), x + 0.5, 7, 26, 29.25); c.restore();
      rr(c, x, 6, 27, 30, 2, undefined, '#ffffff', 0.4);
      text(c, name, x + 13.5, 41.5, 2.6, '#ffffff', 700); text(c, sub, x + 13.5, 45.6, 2.3, guest ? '#7fb4ff' : '#ff9a8a', 600);
      text(c, guest ? 'GUEST' : `PART ${i + 1}`, x + 13.5, 50.4, 2.2, '#ffe98a', 700);
    });
    line(c, 125.6, 8, 125.6, 52, 'rgba(255,255,255,.25)', 0.4);
    text(c, 'FOUR CREATORS ASK', 62, 57.6, 2.6, 'rgba(255,233,138,.8)', 700); text(c, 'TWO GUESTS ANSWER', 157, 57.6, 2.6, 'rgba(127,180,255,.8)', 700);
  });
  DIAGRAMS.cast_q2_2024 = (scene.textures.get('cast_q2_2024').getSourceImage() as HTMLCanvasElement).toDataURL();
}
