import Phaser from 'phaser';
import { W, H, T, held, just, finish, cam, img, panel, who } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import { S, P, tex, lg, rg, rr, el, line, poly, text, rng, parts, OUT, drawPeter, type C2, type Fit } from '../art';
import type { LevelDef } from '../content';
import { hifi, HiFi, texAt } from '../hifi';
import { LOOKS } from '../hifiLooks';

const AUTO = new URLSearchParams(location.search).has('auto');

/**
 * The hat trick (mechanic `hat-trick`, spec §10.15): a bet settled on camera, in two acts.
 * Act one, `act: 'walk'`, is a tracking shot: the camera's frame glides along a hall at its own pace, and the lead has to
 * stay in it while gathering what the scene needs (`items`: things to wear and a thing to carry), each picked up by
 * holding Space beside it, in shot. Leave the frame for too long and the director calls a cut: the take starts again.
 * Act two, `act: 'table'`, is the dish itself, made by hand at a table: snip the hat along the cut lines (steer the blade),
 * pulse the blender when the pieces have fallen back onto the blades, pour into the glass up to the line without
 * spilling, and take a taste. Everything about the setting (rooms, music, props, words) is in THEMES.
 */
type Kind = 'blazer' | 'cap' | 'blender';
interface Theme {
  music: [walk: string, table: string];
  hall: (c: C2, scene: Phaser.Scene, part?: number) => void; set: (c: C2, scene: Phaser.Scene, part?: number) => void;
  /** Hi-fi looks (hifiLooks.ts), one per act. */ hifi: { walk?: string; table?: string };
  heading: [walk: string, table: string]; quote: string; dish: string;
  winWalk: (takes: number) => string; winTable: (o: { acc: number; wasted: number; fill: number }) => string;
}
const THEMES: Record<string, Theme> = {
  neutron: {
    music: ['factory', 'space'], hall: (c, s, p) => walkHall(c, s, p), set: (c, s, p) => setHall(c, s, p), hifi: { walk: 'hatwalk', table: 'hatset' },
    heading: ['THE FACTORY WALK · TRACKING SHOT', 'THE TABLE · UNDER THE FAIRING'],
    quote: 'It’s about time I finally ate the hat.', dish: 'the hat',
    winWalk: (n) => `Blazer on, cap on, blender in hand, all in shot${n > 1 ? ` (take ${n})` : ', in one take'}. Through to the set, where the table is laid.`,
    winTable: ({ acc, wasted, fill }) => `Snipped ${Math.round(acc * 100)}% on the line, blended with ${wasted ? `${wasted} wasted pulse${wasted > 1 ? 's' : ''}` : 'no wasted pulses'}, poured ${Math.round(fill * 100)}% full, and eaten. The bet is settled.`,
  },
};

// ------------------------------------------------------------------ the rooms (also redrawn in parts by the looks, src/looks/hat.ts)
const FLOOR = 152, SEAT = 144; // where feet stand on the factory floor; where the lead's feet are, under the table
const carbonH = (c: C2, y: number, d: number) => lg(c, 0, y, 0, y + d, [0, '#2c2d37'], [0.3, '#4a4c58'], [0.55, '#15161c'], [1, '#050506']);
/** A first stage lying on its side in a cradle, engines to the right. */
function stageOnSide(c: C2, x: number, y: number, len: number, d: number) {
  rr(c, x, y, len, d, d * 0.15, carbonH(c, y, d), OUT, 0.3);
  rr(c, x + len * 0.08, y, 1.2, d, 0, 'rgba(150,158,176,.55)'); line(c, x + 2, y + d * 0.25, x + len - 2, y + d * 0.25, 'rgba(255,255,255,.18)', 0.3);
  for (let i = 0; i < 3; i++) poly(c, [x + len, y + 1.4 + i * (d - 2.8) / 3, x + len + 2.6, y + 0.8 + i * (d - 2.8) / 3, x + len + 2.6, y + 2.4 + (i + 1) * (d - 2.8) / 3, x + len, y + 1.4 + (i + 1) * (d - 2.8) / 3], '#6f7586', OUT, 0.2);
  for (const k of [0.22, 0.78]) { poly(c, [x + len * k - 4, y + d, x + len * k + 4, y + d, x + len * k + 3, y + d + 3.4, x + len * k - 3, y + d + 3.4], '#c8102e', OUT, 0.25); }
}
function flag(c: C2, x: number, y: number, nz: boolean) {
  line(c, x + 1, 30, x + 1, y, '#5f6678', 0.3); line(c, x + 23, 30, x + 23, y, '#5f6678', 0.3);
  if (!nz) { for (let i = 0; i < 13; i++) rr(c, x, y + i * 1.1, 24, 1.1, 0, i % 2 ? '#f4f4f0' : '#b22234'); rr(c, x, y, 10, 7.7, 0, '#3c3b6e'); for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) el(c, x + 1.2 + j * 1.9, y + 1.1 + i * 1.8, 0.28, 0.28, '#ffffff'); }
  else { rr(c, x, y, 24, 14.3, 0, '#012169'); rr(c, x, y, 11, 7, 0, '#012169'); line(c, x, y, x + 11, y + 7, '#ffffff', 1.4); line(c, x + 11, y, x, y + 7, '#ffffff', 1.4); line(c, x, y, x + 11, y + 7, '#c8102e', 0.5); line(c, x + 11, y, x, y + 7, '#c8102e', 0.5); rr(c, x + 4.6, y, 1.8, 7, 0, '#ffffff'); rr(c, x, y + 2.6, 11, 1.8, 0, '#ffffff'); rr(c, x + 5, y, 1, 7, 0, '#c8102e'); rr(c, x, y + 3, 11, 1, 0, '#c8102e'); for (const [sx, sy] of [[18, 3], [15.4, 6.6], [20.6, 6], [18, 11]]) { el(c, x + sx, y + sy, 1, 1, '#ffffff'); el(c, x + sx, y + sy, 0.7, 0.7, '#c8102e'); } }
  rr(c, x, y, 24, nz ? 14.3 : 14.3, 0, undefined, 'rgba(0,0,0,.25)', 0.3);
}
/**
 * The factory walk at the start of the announcement video: a bright white hall, Electron first stages racked on their
 * sides in red cradles, a Rutherford engine on a stand, two flags under the roof, red lines on the floor (as in the
 * video's frames; the game does not know which factory it is). `part`: 1 the hall, 2 what stands in it, 4 the lamps.
 */
export function walkHall(real: C2, scene: Phaser.Scene, part = 7) {
  const pick = parts(real, part); let c = pick(1); const r = rng(31);
  c.fillStyle = lg(c, 0, 0, 0, 124, [0, '#c9ced7'], [0.3, '#e2e5ea'], [1, '#d3d7de']); c.fillRect(0, 0, 320, 124);
  c.fillStyle = lg(c, 0, 0, 0, 30, [0, '#7c8494'], [1, '#a9b0bd']); c.fillRect(0, 0, 320, 30);
  for (let x = 0; x < 320; x += 20) { line(c, x, 26, x + 10, 6, '#6a7282', 0.5); line(c, x + 10, 6, x + 20, 26, '#6a7282', 0.5); }
  rr(c, 0, 5, 320, 1.4, 0, '#5f6678'); rr(c, 0, 26, 320, 1.6, 0, '#5f6678'); rr(c, 0, 30, 320, 1, 0, 'rgba(255,255,255,.5)');
  for (let x = 16; x < 320; x += 32) line(c, x, 31, x, 124, 'rgba(120,128,146,.22)', 0.3);
  rr(c, 0, 76, 320, 1.4, 0, 'rgba(120,128,146,.3)');
  c.fillStyle = lg(c, 0, 124, 0, 180, [0, '#b6bbc6'], [0.4, '#d8dbe1'], [1, '#eceef2']); c.fillRect(0, 124, 320, 56);
  for (let x = -400; x < 720; x += 40) line(c, 160 + (x - 160) * 0.3, 124, x, 180, 'rgba(110,118,136,.2)', 0.3);
  for (const y of [132, 141, 156, 173]) line(c, 0, y, 320, y, 'rgba(110,118,136,.16)', 0.3);
  rr(c, 0, 127, 320, 1.3, 0, '#c8102e'); rr(c, 0, 168, 320, 2.2, 0, '#c8102e'); // red lines along the walkway
  for (let i = 0; i < 260; i++) el(c, r() * 320, 124 + r() * 56, 0.2 + r() * 0.4, 0.1 + r() * 0.2, `rgba(${r() < 0.5 ? '255,255,255' : '60,66,80'},${0.05 + r() * 0.08})`);
  c = pick(2);
  // left and right: first stages on their sides, two tiers; between them white machine cells and an engine on its stand
  for (const x0 of [6, 228]) for (const [y, k] of [[86, 0], [104, 1]] as [number, number][]) { stageOnSide(c, x0 + k * 6, y, 76, 8); if (!k) { rr(c, x0 - 2, y + 11.4, 90, 1.4, 0, '#8b93a7'); for (const dx of [0, 86]) rr(c, x0 - 2 + dx, y + 11, 1.6, 13, 0, '#8b93a7'); } }
  for (let i = 0; i < 3; i++) { const x = 104 + i * 26; rr(c, x, 82, 24, 42, 1, lg(c, x, 0, x + 24, 0, [0, '#f4f6f9'], [1, '#d9dde4']), 'rgba(90,98,116,.5)', 0.35); rr(c, x + 3, 88, 18, 14, 0.6, 'rgba(40,60,90,.55)', 'rgba(255,255,255,.6)', 0.3); rr(c, x + 3, 106, 6, 2, 0.4, i === 1 ? '#7cc56b' : '#f2d14a'); line(c, x + 3, 112, x + 21, 112, 'rgba(90,98,116,.4)', 0.3); }
  const eng = scene.textures.exists('rutherford') ? (scene.textures.get('rutherford').getSourceImage() as HTMLCanvasElement) : undefined;
  rr(c, 192, 116, 22, 8, 0.6, '#c8102e', OUT, 0.3); for (const dx of [2, 18]) line(c, 192 + dx, 124, 192 + dx, 127, '#5f6678', 0.8);
  if (eng) c.drawImage(eng, 191, 84, 24, 31.2);
  flag(c, 60, 34, false); flag(c, 236, 34, true);
  rr(c, 300, 92, 20, 60, 0, '#121318'); for (let x = 302; x < 320; x += 3) line(c, x, 92, x + 0.6, 152, 'rgba(70,74,92,.6)', 0.5); // the black drape into the set
  rr(c, 293, 80, 26, 9, 1, '#101624', OUT, 0.35); text(c, 'SET →', 306, 84.8, 4.4, '#ffe98a', 700);
  c = pick(4);
  for (let x = 14; x < 320; x += 48) { rr(c, x, 13, 28, 2.6, 0.8, '#ffffff', 'rgba(140,150,170,.6)', 0.3); c.fillStyle = lg(c, 0, 16, 0, 70, [0, 'rgba(255,255,255,.28)'], [1, 'rgba(255,255,255,0)']); c.beginPath(); c.moveTo(x, 16); c.lineTo(x + 28, 16); c.lineTo(x + 42, 70); c.lineTo(x - 14, 70); c.closePath(); c.fill(); }
}
/** The ribbed fairing mock-up of the dinner scene: ribs from a ring on the floor to a point above the table. */
export const CAGE = { x: 160, base: 148, top: -18, hw: 124, ribs: 15 };
export const rib = (k: number, t: number) => { // k from -1 (left) to 1 (right) around the near half; t from 0 (floor) to 1 (tip)
  const prof = Math.sqrt(Math.max(0, 1 - t * t)) * (1 - 0.15 * t); return [CAGE.x + k * CAGE.hw * prof, CAGE.base + (CAGE.top - CAGE.base) * t];
};
/**
 * The set of the dinner scene: a dark hall, a fairing-shaped cage of ribs lit along their length, blue light from the
 * floor, and a table laid in a white cloth inside it (the table itself is a sprite, in front of the lead).
 * `part`: 1 the dark hall, 2 the cage's structure, 4 every light.
 */
export function setHall(real: C2, _scene: Phaser.Scene, part = 7) {
  const pick = parts(real, part); let c = pick(1); const r = rng(8);
  c.fillStyle = lg(c, 0, 0, 0, 150, [0, '#05070d'], [0.7, '#0b101c'], [1, '#121a2c']); c.fillRect(0, 0, 320, 150);
  for (let x = 0; x < 320; x += 30) line(c, x, 0, x, 150, 'rgba(80,100,150,.08)', 0.5);
  c.fillStyle = lg(c, 0, 150, 0, 180, [0, '#141b2c'], [1, '#06080e']); c.fillRect(0, 150, 320, 30);
  for (let i = 0; i < 160; i++) el(c, r() * 320, 151 + r() * 29, 0.3 + r() * 0.6, 0.1 + r() * 0.2, `rgba(120,150,220,${0.03 + r() * 0.05})`);
  c = pick(2);
  const ribPath = (k: number, t0 = 0, t1 = 1) => { c.beginPath(); for (let i = 0; i <= 24; i++) { const [x, y] = rib(k, t0 + ((t1 - t0) * i) / 24); if (i) c.lineTo(x, y); else c.moveTo(x, y); } };
  for (let i = 0; i < CAGE.ribs; i++) { const k = -1 + (2 * i) / (CAGE.ribs - 1); ribPath(k); c.strokeStyle = '#2a3042'; c.lineWidth = 1.8; c.stroke(); ribPath(k); c.strokeStyle = 'rgba(170,186,220,.35)'; c.lineWidth = 0.4; c.stroke(); }
  for (const t of [0.04, 0.3, 0.55, 0.78]) { c.beginPath(); for (let i = 0; i <= 40; i++) { const [x, y] = rib(-1 + i / 20, t); const yy = y + Math.sin((i / 40) * Math.PI) * 6 * (1 - t); if (i) c.lineTo(x, yy); else c.moveTo(x, yy); } c.strokeStyle = '#2a3042'; c.lineWidth = 1.4; c.stroke(); c.strokeStyle = 'rgba(170,186,220,.3)'; c.lineWidth = 0.35; c.stroke(); }
  rr(c, CAGE.x - CAGE.hw - 4, CAGE.base - 1, CAGE.hw * 2 + 8, 3, 1, '#1d2232', 'rgba(170,186,220,.35)', 0.35);
  c = pick(4);
  for (let i = 0; i < CAGE.ribs; i++) { const k = -1 + (2 * i) / (CAGE.ribs - 1); if (Math.abs(k) > 0.95) continue; ribPath(k, 0.03, 0.6); c.strokeStyle = 'rgba(235,242,255,.9)'; c.lineWidth = 0.7; c.stroke(); ribPath(k, 0.03, 0.6); c.strokeStyle = 'rgba(200,220,255,.18)'; c.lineWidth = 3.2; c.stroke(); } // the light strips along the ribs
  for (const x of [44, 108, 212, 276]) { c.fillStyle = rg(c, x, 150, 0, 40, [0, 'rgba(60,120,255,.55)'], [1, 'rgba(60,120,255,0)']); c.fillRect(x - 40, 110, 80, 70); el(c, x, 150.5, 3, 0.8, '#bcd4ff'); } // blue floor lights
}
/** A prop or a thing to gather, drawn for the game. */
const PROPS: Record<string, [w: number, h: number, (c: C2) => void]> = {
  ht_coat: [16, 58, (c) => { rr(c, 7.2, 4, 1.6, 52, 0.6, lg(c, 7, 0, 9, 0, [0, '#c9ced7'], [1, '#6f7586']), OUT, 0.3); for (const d of [-1, 1]) line(c, 8, 7, 8 + d * 5, 4, '#8b93a7', 0.7); el(c, 8, 56, 7, 1.6, '#3a3c48', OUT, 0.3); el(c, 8, 3.4, 1.2, 1.2, '#8b93a7', OUT, 0.3); }],
  ht_blazer: [14, 20, (c) => { line(c, 3, 2.6, 11, 2.6, '#8b93a7', 0.5); line(c, 7, 0.4, 7, 2.6, '#8b93a7', 0.4); poly(c, [2, 3, 12, 3, 13, 19, 1, 19], lg(c, 1, 0, 13, 0, [0, '#3558b0'], [0.5, '#2a4c9e'], [1, '#1b3574']), OUT, 0.35); poly(c, [5, 3, 9, 3, 8.2, 13, 5.8, 13], '#f4f6fa'); poly(c, [5, 3, 7, 13, 4, 11], '#23438e', OUT, 0.25); poly(c, [9, 3, 7, 13, 10, 11], '#23438e', OUT, 0.25); el(c, 7, 15, 0.4, 0.4, '#152a5e'); }],
  ht_bench: [30, 24, (c) => { rr(c, 0, 2, 30, 3, 0.6, lg(c, 0, 2, 0, 5, [0, '#e4e8ee'], [1, '#8b93a7']), OUT, 0.3); for (const x of [2, 26]) rr(c, x, 5, 2, 19, 0.3, '#5f6678', OUT, 0.25); rr(c, 2, 15, 26, 1.4, 0, '#5f6678'); rr(c, 6, 7, 18, 6, 0.6, '#c8102e', OUT, 0.25); rr(c, 13, 9, 4, 1, 0.3, '#f4f4f0'); }],
  ht_cap: [12, 6, (c) => { c.beginPath(); c.moveTo(1.6, 5); c.bezierCurveTo(1.6, -0.6, 9.6, -0.6, 9.6, 5); c.closePath(); c.fillStyle = lg(c, 1, 0, 10, 0, [0, '#3a3c46'], [0.5, '#1c1d24'], [1, '#0c0d11']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.35; c.stroke(); poly(c, [8.6, 4.2, 11.8, 4.6, 11.6, 5.6, 8.2, 5.4], '#111217', OUT, 0.25); rr(c, 4.2, 1.6, 2.4, 1.3, 0.3, 'rgba(235,238,245,.75)'); line(c, 5.6, 0.4, 5.6, 5, 'rgba(120,124,140,.4)', 0.25); }],
  ht_trolley: [26, 22, (c) => { rr(c, 1, 2, 24, 2.4, 0.6, '#d9dde4', OUT, 0.3); rr(c, 1, 12, 24, 2, 0.6, '#b8c0cc', OUT, 0.3); for (const x of [2, 23]) rr(c, x, 2, 1.4, 16, 0.3, '#8b93a7'); for (const x of [3, 23]) el(c, x, 19.6, 1.8, 1.8, '#23262f', OUT, 0.3); }],
  ht_blender: [10, 20, (c) => { poly(c, [1.4, 2, 8.6, 2, 7.6, 13, 2.4, 13], 'rgba(200,225,255,.35)', 'rgba(230,240,255,.9)', 0.4); rr(c, 1, 0.6, 8, 1.8, 0.5, '#1c1d24', OUT, 0.3); line(c, 3, 3, 3.6, 12, 'rgba(255,255,255,.6)', 0.3); for (let y = 5; y < 12; y += 2.4) line(c, 6.8, y, 7.6, y, 'rgba(255,255,255,.5)', 0.25); line(c, 3.4, 12, 6.6, 12, '#c9ced7', 0.5); rr(c, 1.6, 13, 6.8, 6.4, 1, lg(c, 1, 0, 9, 0, [0, '#4a4e5e'], [0.5, '#2a2c36'], [1, '#15161c']), OUT, 0.35); el(c, 5, 16.4, 1.4, 1.4, '#c9ced7', OUT, 0.25); el(c, 5, 16.4, 0.5, 0.5, '#7cc56b'); }],
  // the table under the fairing: a white cloth to the floor, the silver cloche lifted beside a plate, a martini glass, scissors
  ht_table: [150, 34, (c) => {
    c.fillStyle = lg(c, 0, 4, 0, 34, [0, '#ffffff'], [0.15, '#eef1f5'], [1, '#b9c1cf']); c.beginPath(); c.moveTo(4, 6); c.quadraticCurveTo(75, 2, 146, 6); c.lineTo(150, 34); c.lineTo(0, 34); c.closePath(); c.fill(); c.strokeStyle = 'rgba(30,36,52,.6)'; c.lineWidth = 0.4; c.stroke();
    for (let x = 12; x < 148; x += 11) line(c, x, 9, x + (x - 75) * 0.04, 34, 'rgba(120,132,160,.18)', 0.6);
    el(c, 75, 6, 71, 3.6, lg(c, 0, 2, 0, 10, [0, '#ffffff'], [1, '#e2e6ee']), 'rgba(30,36,52,.35)', 0.3);
    el(c, 108, 4.6, 8, 2, 'rgba(40,44,60,.18)'); c.beginPath(); c.moveTo(101, 4.4); c.bezierCurveTo(101, -4.6, 115, -4.6, 115, 4.4); c.closePath(); c.fillStyle = lg(c, 101, 0, 115, 0, [0, '#8b93a7'], [0.35, '#f4f6fa'], [1, '#6f7586']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.3; c.stroke(); el(c, 108, -1.6, 1, 0.7, '#c9ced7', OUT, 0.2); // the cloche, lifted off
    line(c, 124, 5.6, 132, 4.4, '#8b93a7', 0.6); el(c, 123, 6, 1.3, 0.8, undefined, '#c8102e', 0.5); el(c, 123.6, 4.8, 1.3, 0.8, undefined, '#c8102e', 0.5); // scissors
    for (const x of [16, 134]) { line(c, x - 4, 5.4, x + 4, 5.4, '#c9ced7', 0.5); } // a knife and a fork, far apart
  }],
  ht_plate: [26, 6, (c) => { el(c, 13, 3, 12.6, 2.6, lg(c, 0, 0, 0, 6, [0, '#ffffff'], [1, '#c9ced7']), 'rgba(30,36,52,.45)', 0.3); el(c, 13, 3, 8.6, 1.6, undefined, 'rgba(150,160,180,.5)', 0.3); }],
  ht_glass: [12, 16, (c) => { poly(c, [0.6, 0.6, 11.4, 0.6, 6.2, 8.4, 5.8, 8.4], 'rgba(200,225,255,.22)', 'rgba(230,240,255,.95)', 0.35); line(c, 6, 8.4, 6, 14.6, 'rgba(230,240,255,.95)', 0.5); el(c, 6, 15, 3.6, 0.8, 'rgba(200,225,255,.3)', 'rgba(230,240,255,.95)', 0.3); line(c, 2, 1.2, 5.4, 6.8, 'rgba(255,255,255,.6)', 0.3); }],
};
const STRIPS = (c: C2) => { const r = rng(4); for (let i = 0; i < 9; i++) { const x = 6 + r() * 14, y = 1 + r() * 3; c.save(); c.translate(x, y); c.rotate((r() - 0.5) * 1.4); rr(c, -2.6, -0.6, 5.2, 1.2, 0.4, i % 3 ? '#16171d' : '#2a2c36', OUT, 0.15); c.restore(); } };

// the lead, drawn at the size each act shows him: walk frames at 1.5 times the platform size, the table at 2.4 times
const WALK_K = 1.5, TABLE_K = 2.4, RW = 4 * WALK_K, RT = 10;
const pkey = (fit: Fit, i: number) => `ht_p${fit || '_'}${i}`, tkey = (fit: Fit, k = 0) => `ht_t${fit || '_'}${k}`;
function makePeter(scene: Phaser.Scene, act: 'walk' | 'table') {
  if (act === 'walk') for (const fit of ['', 'K', 'Q', 'R'] as Fit[]) [0.12, 1, 0.5, -0.5, -1, -0.5, 0.5].forEach((l, i) => { if (!scene.textures.exists(pkey(fit, i))) texAt(scene, pkey(fit, i), 24, 34, RW, (c) => drawPeter(c, l, fit)); });
  else for (const [fit, k] of [['R', 0], ['N', 0], ['N', 1], ['N', 2], ['N', 3]] as [Fit, number][]) if (!scene.textures.exists(tkey(fit, k))) texAt(scene, tkey(fit, k), 24, 34, RT, (c) => drawPeter(c, 0.12, fit, k / 3));
}

type Step = 'serve' | 'snip' | 'blend' | 'pour' | 'taste' | 'done';
const IX = 210, IY = 24, IW = 104, IH = 92; // the close-up panel at the table
export class HatTrickScene extends Phaser.Scene {
  def!: LevelDef; p: any; th!: Theme; act: 'walk' | 'table' = 'walk'; ended = false; hf?: HiFi; g!: Phaser.GameObjects.Graphics; vf!: Phaser.GameObjects.Graphics; call!: Phaser.GameObjects.Text; info!: Phaser.GameObjects.Text; head!: Phaser.GameObjects.Text;
  peter!: Phaser.GameObjects.Image; t = 0; motor?: Loop;
  // act one
  px = 30; dir = 1; dist = 0; moving = false; fx = 0; got = new Set<number>(); holdT = 0; holding = -1; outT = 0; takes = 1; cutT = 0; things: { kind: Kind; x: number; label: string; o: Phaser.GameObjects.Image; prop: Phaser.GameObjects.Image }[] = []; carry?: Phaser.GameObjects.Image;
  // act two
  step: Step = 'serve'; stepT = 0; ci = 0; sx = 0; sy = 0; onLine = 0; total = 0; accs: number[] = []; trail: [number, number, boolean][] = [];
  bits: { h: number; v: number; x: number; r: number }[] = []; shred = 0; wasted = 0; heat = 0; pulseT = 0; cool = 0;
  tilt = 0; flow = 0; fill = 0; left = 1.25; reach = 0; bubble?: Phaser.GameObjects.Text; capObj?: Phaser.GameObjects.Image; plate?: Phaser.GameObjects.Image; glass?: Phaser.GameObjects.Image; jar?: Phaser.GameObjects.Image; botT = 0;
  constructor() { super('HatTrick'); }

  /** The controls panel (H or the ? button), by act and step. Shape agreed with core's showHelp. */
  help(): { title: string; rows: [keys: string, does: string][]; note?: string } {
    if (this.act === 'walk') return { title: 'The tracking shot', rows: [['← →', 'Walk along the hall.'], ['Space', 'Hold beside something to pick it up or put it on: it has to happen in shot.']], note: `Stay inside the camera’s frame: out of shot for too long and the director calls a cut, and the take starts again (${this.p.takes} takes at most). Gather everything, then walk through to the set when the camera gets there.` };
    const rows: Record<Step, [string, string][]> = {
      serve: [], snip: [['↑ ↓', 'Steer the scissors onto the dashed cut line as they move across the cap.']],
      blend: [['Space', 'Pulse the blender. Wait until the pieces have fallen back onto the blades: a pulse with them in the air only heats the motor.']],
      pour: [['→', 'Tip the jar towards the glass: the further, the faster it pours.'], ['←', 'Stand it back up. The pieces keep sliding out for a moment after you do.']],
      taste: [['Space', 'Take a pinch and eat it.']], done: [],
    };
    return { title: 'The table', rows: rows[this.step], note: 'Snip, blend, pour, taste. Snip on the line, waste no pulses, and fill the glass to the middle of the green band for three stars. Overheat the motor or overfill the glass and it is a mess.' };
  }
  init(d: { def: LevelDef }) {
    this.def = d.def; this.p = d.def.params; this.th = THEMES[this.p.theme]; this.act = this.p.act === 'table' ? 'table' : 'walk'; this.ended = false; this.t = 0;
    this.px = this.p.start ?? 30; this.dir = 1; this.dist = 0; this.fx = 0; this.got = new Set(); this.holdT = 0; this.holding = -1; this.outT = 0; this.takes = 1; this.cutT = 0; this.things = []; this.carry = undefined;
    this.step = 'serve'; this.stepT = 0; this.ci = 0; this.accs = []; this.trail = []; this.shred = 0; this.wasted = 0; this.heat = 0; this.pulseT = 0; this.cool = 0; this.tilt = 0; this.flow = 0; this.fill = 0; this.left = this.p.pour?.jar ?? 1.25; this.reach = 0; this.bubble = undefined; this.botT = 0;
    this.bits = Array.from({ length: 9 }, (_, i) => ({ h: 0, v: 0, x: (i + 0.5) / 9, r: 1 }));
  }
  create() {
    cam(this); stopLoops(); music.play(this.th.music[this.act === 'walk' ? 0 : 1], 1);
    makePeter(this, this.act);
    for (const [k, [w, h, fn]] of Object.entries(PROPS)) if (!this.textures.exists(k)) tex(this, k, w, h, fn);
    if (!this.textures.exists('ht_strips')) tex(this, 'ht_strips', 26, 6, STRIPS);
    const bg = `ht_${this.act}_${this.p.theme}`;
    if (!this.textures.exists(bg)) tex(this, bg, W, H, (c) => (this.act === 'walk' ? this.th.hall : this.th.set)(c, this));
    const hf = (this.hf = hifi(this, LOOKS[this.th.hifi[this.act] || '']));
    const world: Record<string, Phaser.GameObjects.GameObject> = {};
    if (hf) hf.backdrop(); else world.room = img(this, 0, 0, bg).setOrigin(0);
    if (this.act === 'walk') this.buildWalk(world); else this.buildTable(world);
    this.g = this.add.graphics(); world.g = this.g; // in the world: what the hands are working on, so it takes the light and the glow
    const worldN = this.children.length; // everything from here on is HUD
    this.vf = this.add.graphics();
    panel(this, 4, 4, 200, 16, 0.85); this.head = T(this, 9, 6.6, this.th.heading[this.act === 'walk' ? 0 : 1], '#ffffff', 6, '700');
    this.info = T(this, 9, 23, '', '#ffffff', 5, '700').setLineSpacing(1.2).setShadow(0, 1, '#000000', 3);
    this.call = T(this, 160, H - 9, '', '#ffe98a', 6.4, '700').setOrigin(0.5).setAlign('center').setWordWrapWidth(300).setShadow(0, 1, '#000000', 3);
    if (this.act === 'walk') who(this, this.def, 188, 24); else who(this, this.def, 4, 154);
    this.say(this.act === 'walk' ? '← → walk · hold SPACE beside something to pick it up · stay inside the frame' : 'Cap off, onto the plate. Napkin in.');
    if (hf) { hf.tag(world); this.tell(); hf.ready({ hud: this.children.list.slice(worldN), lateHud: true }); }
  }
  say(s: string) { this.call.setText(s); }
  tell() { this.hf?.set({ act: this.act === 'walk' ? 0 : 1, x: this.act === 'walk' ? this.px : 160, y: this.act === 'walk' ? FLOOR - 26 : SEAT - 60, fx: this.fx, fw: this.p.frame?.[1] ?? 0, step: ['serve', 'snip', 'blend', 'pour', 'taste', 'done'].indexOf(this.step), pulse: this.pulseT, heat: this.heat, fill: this.fill, tilt: this.tilt, reach: this.reach, got: this.got.size }); }

  // ---------------------------------------------------------------- act one: the tracking shot
  buildWalk(world: Record<string, Phaser.GameObjects.GameObject>) {
    const stands: Record<Kind, [string, number, number]> = { blazer: ['ht_coat', -3, 10], cap: ['ht_bench', -22, 0], blender: ['ht_trolley', -20, 0] };
    (this.p.items as [Kind, number, string][]).forEach(([kind, x, label], i) => {
      const [sk, ty] = stands[kind], prop = img(this, x, FLOOR, sk).setOrigin(0.5, 1);
      const o = img(this, x, FLOOR + ty - (kind === 'blazer' ? 46 : 0), 'ht_' + kind).setOrigin(0.5, 1);
      if (kind === 'blazer') o.setOrigin(0.5, 0).setY(FLOOR - 52);
      this.things.push({ kind, x, label, o, prop }); world['prop' + i] = prop; world['item' + i] = o;
      this.hf?.shade(prop); this.hf?.shade(o);
    });
    this.peter = img(this, this.px, FLOOR, pkey('', 0)).setOrigin(0.5, 1).setScale(WALK_K / RW); world.peter = this.peter;
    this.carry = img(this, this.px, FLOOR - 22, 'ht_blender').setOrigin(0.5, 1).setVisible(false); world.carry = this.carry;
    if (this.hf) { this.hf.actor(this.peter); this.hf.shade(this.carry); }
  }
  fit(): Fit { const wear = (k: Kind) => this.things.some((t, i) => t.kind === k && this.got.has(i)); return wear('blazer') && wear('cap') ? 'R' : wear('blazer') ? 'K' : wear('cap') ? 'Q' : ''; }
  frameSpeed() { const [, , v, wob = 0] = this.p.frame as number[]; return v * (1 + wob * Math.sin(this.t * 0.9)); }
  walk(dt: number) {
    const [, fw] = this.p.frame as number[], end = W - fw, hold = this.p.hold as number, speed = this.p.speed as number;
    if (this.cutT > 0) { // the director has called a cut: everything goes back to its mark
      this.cutT -= dt; if (this.cutT <= 0) { this.px = this.p.start ?? 30; this.fx = 0; this.t = 0; this.got.clear(); this.outT = 0; this.holdT = 0; this.things.forEach((t) => t.o.setVisible(true).setAlpha(1)); this.carry!.setVisible(false); this.say(`Take ${this.takes}. Rolling.`); snd.click(); }
      this.drawWalk(); return;
    }
    this.fx = Math.min(end, this.fx + this.frameSpeed() * dt);
    const near = this.things.findIndex((t, i) => !this.got.has(i) && Math.abs(t.x - this.px) < 9);
    let mv = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), grab = held('a');
    if (AUTO) { // the bot keeps to the front of the frame, and stops to pick up only with room to spare behind it
      const next = this.things.map((t, i) => ({ t, i })).filter(({ i }) => !this.got.has(i)).sort((a, b) => a.t.x - b.t.x)[0];
      const tx = Math.min(next ? next.t.x : this.p.end, this.fx + fw - 12);
      const room = this.px - this.fx - 6 > this.frameSpeed() * (hold - this.holdT) + 4;
      grab = near >= 0 && room && (!next || Math.abs(next.t.x - this.px) < 3 || this.holdT > 0); mv = grab ? 0 : Math.abs(tx - this.px) < 1.5 ? 0 : Math.sign(tx - this.px);
    }
    if (grab && near >= 0) {
      if (this.holding !== near) { this.holding = near; this.holdT = 0; }
      this.holdT += dt; mv = 0;
      if (this.holdT >= hold) {
        const t = this.things[near]; this.got.add(near); this.holdT = 0; this.holding = -1; snd.pickup(); t.o.setVisible(false);
        if (t.kind === 'blender') this.carry!.setVisible(true);
        const inShot = t.x > this.fx && t.x < this.fx + fw;
        this.say(`${t.label}: ${t.kind === 'blender' ? 'in hand' : 'on'}.${inShot ? '' : ' (Just out of shot.)'} ${this.got.size < this.things.length ? `${this.things.length - this.got.size} to go.` : 'Now through to the set, with the camera.'}`);
      }
    } else { this.holdT = Math.max(0, this.holdT - dt * 3); if (!grab) this.holding = -1; }
    this.moving = mv !== 0;
    if (mv) { this.dir = mv; this.px = Phaser.Math.Clamp(this.px + mv * speed * dt, 8, W - 6); this.dist += speed * dt; }
    const out = this.px < this.fx + 6 || this.px > this.fx + fw - 6;
    this.outT = out ? this.outT + dt : Math.max(0, this.outT - dt * 0.6);
    if (out && this.outT > 0.25 && this.outT - dt <= 0.25) { snd.alarm(); this.say(this.px < this.fx + 6 ? 'You are falling out of shot: keep up with the camera!' : 'Out ahead of the camera: wait for the frame!'); }
    if (this.outT >= this.p.outMax) {
      this.takes++; snd.deny();
      if (this.takes > this.p.takes) { this.ended = true; return void finish(this, this.def, { success: false, title: 'That’s a wrap', text: `${this.p.takes} takes and none of them in shot. Walk at the camera’s pace, and stop to pick things up only with room behind you in the frame.` }); }
      this.cutT = 1.2; this.say(`CUT! Out of shot. Back to the start: take ${this.takes}.`); this.cameras.main.flash(120, 255, 255, 255);
    }
    if (this.got.size === this.things.length && this.px >= this.p.end - 2 && this.fx >= end - 0.5) {
      this.ended = true; snd.select();
      const stars = this.takes === 1 ? 3 : this.takes === 2 ? 2 : 1;
      this.time.delayedCall(500, () => finish(this, this.def, { success: true, stars, title: this.takes === 1 ? 'One take' : `Take ${this.takes}`, text: this.th.winWalk(this.takes) }));
    }
    this.drawWalk();
  }
  drawWalk() {
    const fit = this.fit(), f = !this.moving || this.cutT > 0 ? 0 : 1 + (Math.floor(this.dist / 5) % 6);
    this.peter.setTexture(pkey(fit, f)).setPosition(this.px, FLOOR).setFlipX(this.dir < 0);
    this.carry!.setPosition(this.px + this.dir * 7, FLOOR - 20);
    const [, fw] = this.p.frame as number[], g = this.vf; g.clear();
    // the viewfinder: what is outside the frame is dimmed; brackets, a REC lamp, the out-of-shot meter
    const x0 = this.fx, x1 = this.fx + fw, y0 = 44, y1 = 164, warn = this.outT > 0.05;
    g.fillStyle(0x05070d, 0.42).fillRect(0, y0, x0, y1 - y0).fillRect(x1, y0, W - x1, y1 - y0);
    g.lineStyle(1.1, warn ? P.red : 0xffffff, 0.95);
    for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) g.beginPath().moveTo(x, y + sy * 10).lineTo(x, y).lineTo(x + sx * 10, y).strokePath();
    g.fillStyle(P.red, Math.sin(this.time.now / 180) > 0 ? 1 : 0.3).fillCircle(x0 + 6, y0 + 6, 1.8);
    if (this.outT > 0) { g.fillStyle(0x000000, 0.6).fillRoundedRect(x0 + 12, y0 + 3.6, 40, 4, 2); g.fillStyle(P.red).fillRoundedRect(x0 + 12, y0 + 3.6, Math.max(3, 40 * Math.min(1, this.outT / this.p.outMax)), 4, 2); }
    if (this.holding >= 0 && this.holdT > 0) { const k = this.holdT / this.p.hold, x = this.px, y = FLOOR - 58; g.lineStyle(1.4, 0x000000, 0.5).strokeCircle(x, y, 5); g.lineStyle(1.4, P.lgreen, 1).beginPath().arc(x, y, 5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2).strokePath(); }
    if (this.cutT > 0) g.fillStyle(0x000000, 0.35).fillRect(0, 0, W, H);
    const list = this.things.map((t, i) => `${this.got.has(i) ? '✓' : '☐'} ${t.label}`).join('\n');
    this.info.setText(`● REC · TAKE ${this.takes} of ${this.p.takes}\n${list}`);
  }

  // ---------------------------------------------------------------- act two: the table
  buildTable(world: Record<string, Phaser.GameObjects.GameObject>) {
    this.peter = img(this, 160, SEAT, tkey('R')).setOrigin(0.5, 1).setScale(TABLE_K / RT); world.peter = this.peter;
    const table = img(this, 160, 128, 'ht_table').setOrigin(0.5, 0); world.table = table;
    this.plate = img(this, 160, 134, 'ht_plate').setOrigin(0.5, 1); this.glass = img(this, 120, 134, 'ht_glass').setOrigin(0.5, 1); this.jar = img(this, 196, 135, 'ht_blender').setOrigin(0.5, 1);
    this.capObj = img(this, 160, SEAT - 66, 'ht_cap').setOrigin(0.5, 1).setScale(S * 2.4).setVisible(false);
    Object.assign(world, { plate: this.plate, glass: this.glass, jar: this.jar, cap: this.capObj });
    if (this.hf) { this.hf.actor(this.peter); for (const o of [table, this.plate, this.glass, this.jar, this.capObj]) this.hf.shade(o); }
  }
  next(s: Step, msg: string) { this.step = s; this.stepT = 0; this.say(msg); }
  /** The cut lines across the cap: [amplitude, waves, phase, offset] each, in the close-up panel's units. */
  cutY(x: number) { const [a, f, ph, off] = (this.p.cuts as number[][])[this.ci]; return IY + 50 + off + a * Math.sin(((x - (IX + 18)) / (IW - 36)) * f * Math.PI * 2 + ph); }
  table(dt: number) {
    this.stepT += dt; this.heat = Math.max(0, this.heat - dt * 0.12); this.pulseT = Math.max(0, this.pulseT - dt);
    const pp = this.p;
    if (this.step === 'serve') {
      if (this.stepT > 0.3 && !this.capObj!.visible) { this.capObj!.setVisible(true); this.peter.setTexture(tkey('N')); snd.move(); this.tweens.add({ targets: this.capObj, x: 160, y: 132, scale: S * 1.6, duration: 600, ease: 'Sine.easeInOut' }); }
      if (this.stepT > 1.2) { this.sx = IX + 18; this.sy = this.cutY(this.sx); this.onLine = 0; this.total = 0; this.trail = []; this.next('snip', `Cut 1 of ${pp.cuts.length}: ↑ ↓ keep the scissors on the dashed line.`); }
    } else if (this.step === 'snip') {
      const x1 = IX + IW - 18, v = pp.snipSpeed as number;
      let dy = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
      if (AUTO) { const want = this.cutY(this.sx + v * 0.03); dy = Math.abs(want - this.sy) < 0.6 ? 0 : Math.sign(want - this.sy); }
      this.sy = Phaser.Math.Clamp(this.sy + dy * 46 * dt, IY + 10, IY + IH - 10); this.sx += v * dt;
      const ok = Math.abs(this.sy - this.cutY(this.sx)) < 2.4; this.total += dt; if (ok) this.onLine += dt;
      this.trail.push([this.sx, this.sy, ok]); if (Math.floor(this.stepT * 9) !== Math.floor((this.stepT - dt) * 9)) snd.sizzle();
      if (this.sx >= x1) {
        this.accs.push(this.onLine / Math.max(0.01, this.total)); snd.click(); this.ci++;
        if (this.ci < pp.cuts.length) { this.sx = IX + 18; this.sy = this.cutY(this.sx); this.onLine = 0; this.total = 0; this.trail = []; this.say(`Cut ${this.ci + 1} of ${pp.cuts.length}: ${Math.round(this.accs[this.ci - 1] * 100)}% on the line last time.`); }
        else { this.capObj!.setTexture('ht_strips').setScale(S); this.tweens.add({ targets: this.capObj, x: 196, y: 121, alpha: 0, duration: 500, ease: 'Quad.easeIn' }); this.motor = loop('whine'); this.motor.set(0, 0.3); this.next('blend', `Into the blender. SPACE pulses it: wait for the pieces to fall back onto the blades. ${pp.pulses} good pulses.`); }
      }
    } else if (this.step === 'blend') {
      const down = this.bits.filter((b) => b.h < 0.08).length / this.bits.length;
      if (this.shred >= pp.pulses) { if (this.pulseT <= 0 && down > 0.95) { this.motor?.set(0, 0); this.next('pour', '→ tip the jar over the glass, ← stand it back up. Fill it to the green band, and mind the lag.'); } }
      let pulse = just('a'); if (AUTO) { this.botT -= dt; pulse = this.botT <= 0 && down > 0.95 && this.stepT > 0.6; }
      if (pulse && this.pulseT <= 0 && this.shred < pp.pulses) {
        this.pulseT = 0.32; if (AUTO) this.botT = 0.4;
        const good = down >= 0.7;
        if (good) { this.shred++; snd.burn(0.4); if (this.shred < pp.pulses) this.say(`Good pulse: ${this.shred} of ${pp.pulses}.`); }
        else { this.wasted++; this.heat += 0.34; snd.dud(); this.say(this.heat > 0.6 ? 'The motor is getting hot! Let the pieces settle.' : 'The pieces were still in the air: that pulse was wasted.'); }
        const r = rng(this.shred * 7 + this.wasted * 3 + 1);
        for (const b of this.bits) if (good || b.h < 0.08) b.v = 1.5 + r() * 0.9;
        if (good && this.bits.length < 22) for (let i = 0; i < 2; i++) this.bits.push({ h: 0, v: 1.4 + r() * 0.9, x: r(), r: 1 });
        for (const b of this.bits) b.r = Math.max(0.35, 1 - this.shred * 0.11);
      }
      for (const b of this.bits) { b.v -= 3.2 * dt; b.h += b.v * dt; if (b.h <= 0) { b.h = 0; b.v = 0; } }
      this.motor?.set(this.pulseT > 0 ? 0.9 : 0, 0.35 + this.heat * 0.5);
      if (this.heat >= 1) { this.ended = true; this.motor?.set(0, 0); snd.powerdown(); return void finish(this, this.def, { success: false, title: 'The motor gave up', text: 'Pulsing with the pieces still in the air spins the blades in nothing and heats the motor. Wait for them to land on the blades, then pulse.' }); }
    } else if (this.step === 'pour') {
      const [lo, hi] = pp.pour.band as number[], mid = (lo + hi) / 2;
      let d = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
      if (AUTO) d = this.fill + this.flow * 0.55 >= mid ? -1 : this.tilt < 0.78 ? 1 : 0;
      this.tilt = Phaser.Math.Clamp(this.tilt + (d > 0 ? 0.7 : d < 0 ? -1.2 : 0) * dt, 0, 1);
      const want = this.left > 0 ? Math.max(0, this.tilt - 0.4) * 1.8 : 0; this.flow += (want - this.flow) * Math.min(1, dt / 0.35);
      const q = Math.min(this.left, this.flow * dt); this.fill += q; this.left -= q;
      if (this.flow > 0.05 && Math.floor(this.stepT * 7) !== Math.floor((this.stepT - dt) * 7)) snd.step();
      if (this.fill >= 1) { this.ended = true; snd.splash(); return void finish(this, this.def, { success: false, title: 'All over the tablecloth', text: 'The glass overflowed. The shredded cap keeps sliding out for a moment after you stand the jar up: start tipping it back before the glass reaches the line.' }); }
      if (this.tilt < 0.15 && this.flow < 0.02 && this.fill >= lo) { snd.select(); this.next('taste', `${Math.round(this.fill * 100)}% full. SPACE: take a pinch.`); }
      else if (this.tilt < 0.15 && this.flow < 0.02 && this.left <= 0.001) { this.ended = true; return void finish(this, this.def, { success: false, title: 'Not enough hat', text: 'The jar is empty and the glass is not full enough.' }); }
    } else if (this.step === 'taste') {
      if ((AUTO ? this.stepT > 0.6 : just('a')) && this.reach === 0) { this.reach = 0.01; snd.move(); }
      if (this.reach > 0) {
        this.reach = Math.min(1, this.reach + dt * 2.2); this.peter.setTexture(tkey('N', Math.min(3, Math.round(this.reach * 3))));
        if (this.reach >= 1 && !this.bubble) {
          this.bubble = T(this, 160, 52, `“${this.th.quote}”`, '#ffffff', 6.6, '700').setOrigin(0.5, 1).setAlign('center').setWordWrapWidth(130).setShadow(0, 1, '#000000', 3); this.hf?.hud(this.bubble);
          this.next('done', '');
          const [lo, hi] = pp.pour.band as number[], mid = (lo + hi) / 2, acc = this.accs.reduce((a, b) => a + b, 0) / this.accs.length;
          const faults = (acc >= 0.8 ? 0 : acc >= 0.6 ? 1 : 2) + (this.wasted <= 1 ? 0 : this.wasted <= 3 ? 1 : 2) + (Math.abs(this.fill - mid) <= (hi - lo) * 0.3 ? 0 : 1);
          const stars = faults <= 1 ? 3 : faults <= 3 ? 2 : 1, egg = faults === 0 && (this.def._stars ?? 3) === 3;
          this.ended = true; snd.egg();
          this.time.delayedCall(2600, () => finish(this, this.def, { success: true, stars, egg, title: `${this.th.dish[0].toUpperCase()}${this.th.dish.slice(1)}, eaten`, text: this.th.winTable({ acc, wasted: this.wasted, fill: this.fill }) }));
        }
      }
    }
    this.drawTable();
  }
  drawTable() {
    const g = this.g, pp = this.p; g.clear();
    // the glass on the table fills as the jar pours; the jar goes from full to empty
    const gl = this.glass!, lvl = Math.cbrt(Math.min(1, this.fill));
    if (this.fill > 0) { const top = gl.y - 15.4 + 7.8 * (1 - lvl), hw = 5.4 * lvl; g.fillStyle(0x16171d, 0.95).fillTriangle(gl.x - hw, top, gl.x + hw, top, gl.x, gl.y - 7.6); }
    this.jar!.setAlpha(this.step === 'pour' || this.step === 'blend' ? 0.4 : 1);
    const ip = this.step === 'snip' || this.step === 'blend' || this.step === 'pour';
    if (!ip) { this.info.setText(this.steps()); return; }
    g.fillStyle(0x070a14, 0.82).fillRoundedRect(IX, IY, IW, IH, 4); g.lineStyle(0.5, 0xffffff, 0.25).strokeRoundedRect(IX, IY, IW, IH, 4); // the close-up, in the world: it takes the room's light and glow
    const cx = IX + IW / 2;
    if (this.step === 'snip') { // the cap from above, the cut line, the cut so far and the blade
      g.fillStyle(0x0f1015).fillCircle(cx, IY + 50, 30); g.fillStyle(0x1c1d24).fillCircle(cx, IY + 46, 24); g.lineStyle(0.4, 0x3a3c48).strokeCircle(cx, IY + 46, 24);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.lineBetween(cx, IY + 46, cx + Math.cos(a) * 24, IY + 46 + Math.sin(a) * 24); }
      g.fillStyle(0xeef0f5, 0.8).fillRect(cx - 4, IY + 30, 8, 4);
      for (let x = IX + 18; x < IX + IW - 18; x += 3) { const y = this.cutY(x); g.fillStyle(0xffffff, 0.9).fillRect(x, y - 0.3, 1.6, 0.6); }
      for (const [x, y, ok] of this.trail) g.fillStyle(ok ? P.yellow : P.red, 1).fillRect(x - 0.4, y - 0.4, 0.8, 0.8);
      const bx = this.sx, by = this.sy, op = Math.abs(Math.sin(this.stepT * 14)) * 0.5;
      g.lineStyle(1, 0xd9dde4).lineBetween(bx - 9, by - 3 - op * 4, bx, by).lineBetween(bx - 9, by + 3 + op * 4, bx, by);
      g.lineStyle(0.8, P.red).strokeCircle(bx - 11, by - 4 - op * 4, 1.8).strokeCircle(bx - 11, by + 4 + op * 4, 1.8);
    } else if (this.step === 'blend') { // the jar, close up: the pieces, the blades, the motor's temperature
      const j0 = IY + 12, j1 = IY + 72, jl = (y: number) => cx - 26 + ((y - j0) / (j1 - j0)) * 8, jr = (y: number) => cx + 26 - ((y - j0) / (j1 - j0)) * 8;
      g.fillStyle(0xbfe0ff, 0.07).fillPoints([new Phaser.Math.Vector2(jl(j0), j0), new Phaser.Math.Vector2(jr(j0), j0), new Phaser.Math.Vector2(jr(j1), j1), new Phaser.Math.Vector2(jl(j1), j1)], true);
      g.lineStyle(0.7, 0xe6f0ff, 0.9).beginPath().moveTo(jl(j0), j0).lineTo(jl(j1), j1).lineTo(jr(j1), j1).lineTo(jr(j0), j0).strokePath();
      const spin = this.pulseT > 0 ? this.time.now / 25 : 0; g.lineStyle(1, 0xc9ced7).lineBetween(cx - 9 * Math.cos(spin), j1 - 3, cx + 9 * Math.cos(spin), j1 - 3); g.fillStyle(0x8b93a7).fillCircle(cx, j1 - 3, 1.4);
      g.fillStyle(0x2a2c36).fillRoundedRect(cx - 20, j1, 40, 12, 2); g.fillStyle(this.heat > 0.66 ? P.red : P.lgreen).fillCircle(cx, j1 + 6, 1.6);
      const r = rng(3);
      for (const b of this.bits) { const y = j1 - 4 - b.h * (j1 - j0 - 10), x = jl(y) + 4 + b.x * (jr(y) - jl(y) - 8), s = 3.6 * b.r; g.fillStyle(0x000000, 0.6).fillRect(x - s - 0.4, y - s * 0.4 - 0.4, s * 2 + 0.8, s * 0.8 + 0.8); g.fillStyle(r() < 0.3 ? 0x3a3c46 : 0x1c1d24).fillRect(x - s, y - s * 0.4, s * 2, s * 0.8); }
      g.fillStyle(0x000000, 0.5).fillRoundedRect(IX + 6, IY + IH - 9, IW - 12, 4, 2); g.fillStyle(this.heat > 0.66 ? P.red : P.orange).fillRoundedRect(IX + 6, IY + IH - 9, Math.max(3, (IW - 12) * Math.min(1, this.heat)), 4, 2);
      for (let i = 0; i < pp.pulses; i++) g.fillStyle(i < this.shred ? P.lgreen : 0x3a3c48).fillCircle(IX + IW - 8 - i * 6, IY + 6, 2);
    } else { // the pour: the jar tipping over the glass, the glass's green band
      const GH = 24, gx = IX + 30, gy = IY + 70, top = gy - GH, hw0 = 16, lvl2 = Math.cbrt(Math.min(1, this.fill)), [lo, hi] = pp.pour.band as number[];
      const bandY = (f: number) => gy - GH * Math.cbrt(f);
      g.fillStyle(P.green, 0.35).fillRect(gx - hw0 - 3, bandY(hi), hw0 * 2 + 6, bandY(lo) - bandY(hi));
      if (this.fill > 0) { const hw = hw0 * lvl2; g.fillStyle(0x16171d).fillTriangle(gx - hw, gy - GH * lvl2, gx + hw, gy - GH * lvl2, gx, gy); }
      g.lineStyle(0.7, 0xe6f0ff, 0.95).beginPath().moveTo(gx - hw0, top).lineTo(gx, gy).lineTo(gx + hw0, top).strokePath(); g.lineBetween(gx, gy, gx, gy + 12); g.lineBetween(gx - 8, gy + 12, gx + 8, gy + 12);
      const a = -this.tilt * 1.7, px = IX + 74, py = IY + 40, c = Math.cos(a), s = Math.sin(a), P2 = (x: number, y: number) => [px + x * c - y * s, py + x * s + y * c];
      const pts = [[-9, -30], [9, -30], [6, 0], [-6, 0]].map(([x, y]) => P2(x, y));
      g.fillStyle(0xbfe0ff, 0.1).fillPoints(pts.map(([x, y]) => new Phaser.Math.Vector2(x, y)), true); g.lineStyle(0.8, 0xe6f0ff, 0.95).strokePoints(pts.map(([x, y]) => new Phaser.Math.Vector2(x, y)), true);
      const k = Math.min(1, this.left / (pp.pour.jar ?? 1.25)); if (k > 0.02) { const pts2 = [[-6 - 2.6 * k, -29 * k], [6 + 2.6 * k, -29 * k], [5.6, -1], [-5.6, -1]].map(([x, y]) => P2(x, y)); g.fillStyle(0x16171d, 0.95).fillPoints(pts2.map(([x, y]) => new Phaser.Math.Vector2(x, y)), true); }
      if (this.flow > 0.03) { const [lx, ly] = P2(-9, -30), n = Math.round(4 + this.flow * 10); for (let i = 0; i < n; i++) { const t = ((this.stepT * 3 + i / n) % 1); g.fillStyle(0x16171d).fillRect(lx - 1 - t * 3, ly + (gy - GH * lvl2 - ly) * t - 1, 2.2, 2.2); } }
      g.fillStyle(0x2a2c36).fillCircle(px, py, 2);
    }
    this.info.setText(this.steps());
  }
  steps() { const all: [Step, string][] = [['snip', 'SNIP'], ['blend', 'BLEND'], ['pour', 'POUR'], ['taste', 'TASTE']], at = ['serve', 'snip', 'blend', 'pour', 'taste', 'done'].indexOf(this.step); return all.map(([s, n], i) => `${i + 1 < at ? '✓' : i + 1 === at ? '▶' : '·'} ${n}${s === 'blend' && at >= 2 ? `  ${this.shred}/${this.p.pulses}` : ''}`).join('\n'); }

  update(_t: number, dms: number) {
    if (this.ended) { if (this.act === 'table') this.drawTable(); this.tell(); return; }
    const dt = Math.min(0.05, dms / 1000); this.t += dt;
    if (this.act === 'walk') this.walk(dt); else this.table(dt);
    this.tell();
  }
}
