import Phaser from 'phaser';
import { D, S, C2, el, line, lg, rng, drawSite, drawWallops } from '../art';
import { texAt, soft, add, halo, sheet } from '../hifi';
import type { HiFi } from '../hifi';
import { puffy } from './flight';

// ------------------------------------------------------------------ a launch pad seen on a console, round the clock
// Two mini-games (the two counts of "Two Hemispheres", the countdown race of VICTUS HAZE) show a pad as a half-size
// picture while a clock runs through day and night. This is what their looks share: the pad redrawn in daylight by the
// plain drawing's own code (`drawSite`, `drawWallops`, in parts), a night sky and a day sky that cross over with the
// scene's own measure of daylight, first light and the sun coming up out of the sea, the pink band opposite a sunset,
// floodlights that take over as it gets dark, and a lift-off that lights the pad. Both pads are seen looking out to sea
// and so roughly east (the game's choice of camera): the sun and the moon rise in frame, and set behind the viewer.
// Everything is in the site drawing's own units (320 by 150, drawn at half size), so a thing keeps its place.
const K = 0.5, UP = 44, SKH = 132; // the picture's scale; how far the sky reaches above the site drawing; the sky's height
type Im = Phaser.GameObjects.Image; type Em = Phaser.GameObjects.Particles.ParticleEmitter;

export interface Pad {
  id: string; /** The horizon and the pad's column in the site drawing. */ hz: number; x: number;
  day(c: C2): void; night(c: C2): void; sky(c: C2): void;
  /** Floodlight heads [x, y, toX, toY], the pools they throw [x, y, rx, ry, strength], and the red lights on the masts. */
  heads: number[][]; pools: number[][]; beacons: number[][];
  /** Where the sun comes up, which way it climbs (1: to the right, as it does looking east from the north), and how deep the open water is under it. */
  rise: [x: number, dir: number, depth: number];
  /** A moon that rises in frame: where, and the local hours it is up between. */
  moon?: { x: number; up: number; down: number };
}

const stars = (seed: number, milky: number, top: string) => (c: C2) => {
  const r = rng(seed); c.translate(0, UP);
  c.fillStyle = lg(c, 0, -UP, 0, 88, [0, top], [0.5, '#071026'], [0.88, '#12204a'], [1, '#1c2e60']); c.fillRect(0, -UP, 320, SKH);
  soft(c, 6); for (let i = 0; i < 34; i++) { const x = -10 + i * 10 + r() * 14, y = -UP + 4 + i * 3.4 + (r() - 0.5) * 18; el(c, x, y, 14 + r() * 18, 5 + r() * 7, `rgba(${130 + r() * 60},${130 + r() * 50},226,${(0.03 + r() * 0.04) * milky})`); if (milky > 1 && i > 10 && i < 24) el(c, x, y, 9 + r() * 8, 3 + r() * 3, `rgba(255,222,186,${0.03 + r() * 0.03})`); }
  if (milky > 1) { soft(c, 2); for (let i = 6; i < 30; i++) el(c, -10 + i * 10 + r() * 10, -UP + 6 + i * 3.4 + (r() - 0.5) * 6, 5 + r() * 8, 0.8 + r() * 1.2, 'rgba(2,4,12,.4)'); } // the dark lane down the middle of it
  soft(c, 0);
  for (let i = 0; i < 760; i++) { const x = r() * 320, y = -UP + r() * (UP + 84), s = r(), q = r(), rad = s > 0.975 ? 0.62 : 0.2 + s * 0.26; c.globalAlpha = (0.3 + q * 0.7) * Math.min(1, (90 - y) / 34); el(c, x, y, rad, rad, s > 0.9 ? '#ffd9a8' : s > 0.8 ? '#a8ccff' : '#ffffff'); }
  c.globalAlpha = 1;
};
const blue = (stops: [number, string][], seed: number) => (c: C2) => {
  const r = rng(seed); c.translate(0, UP);
  c.fillStyle = lg(c, 0, -UP, 0, 86, ...stops); c.fillRect(0, -UP, 320, SKH);
  soft(c, 2); for (let i = 0; i < 16; i++) { const x = r() * 340 - 10, y = -UP + 6 + r() * 96, len = 26 + r() * 70; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len * 0.5, y - 3 - r() * 4, x + len, y - 1 - r() * 6); c.strokeStyle = `rgba(255,255,255,${0.08 + r() * 0.16})`; c.lineWidth = 0.8 + r() * 1.8; c.stroke(); } soft(c, 0); // high cloud
};
/** What stands on the site, with one side to the light, and the shadows it throws along the ground. */
function standing(draw: (c: C2, part: number) => void, gx: number) {
  const things = sheet(320, 150, D, (t) => draw(t, 8));
  const shade = sheet(320, 150, D, (t) => { t.transform(1, 0, -0.5, -0.24, gx * 0.5, gx * 1.24); t.drawImage(things, 0, 0, 320, 150); t.globalCompositeOperation = 'source-in'; t.fillStyle = '#06201c'; t.fillRect(-400, -400, 1200, 1200); });
  const lit = sheet(320, 150, D, (t) => { t.drawImage(things, 0, 0, 320, 150); t.globalCompositeOperation = 'source-atop'; t.fillStyle = lg(t, 0, 0, 320, 0, [0, 'rgba(255,246,214,.2)'], [0.45, 'rgba(255,246,214,.05)'], [0.55, 'rgba(10,26,44,.05)'], [1, 'rgba(10,26,44,.26)']); t.fillRect(0, 0, 320, 150); });
  return { shade, lit };
}
function sea(c: C2, hz: number, stops: [number, string][], seed: number) {
  const r = rng(seed);
  c.fillStyle = lg(c, 0, hz, 0, 150, ...stops); c.fillRect(0, hz, 320, 150 - hz);
  soft(c, 3); for (const [x, y, w] of [[60, hz + 8, 50], [286, hz + 26, 36], [300, hz + 52, 44]]) el(c, x, y, w, 1.6 + (y - hz) * 0.05, 'rgba(8,34,86,.2)'); soft(c, 0); // cloud shadows crossing the water
  for (let i = 0; i < 340; i++) { const k = r() ** 1.5, y = hz + 0.8 + k * (149 - hz), x = r() * 336 - 8, len = 1.6 + k * 13; line(c, x, y, x + len, y, `rgba(232,244,252,${0.07 + r() * 0.2})`, 0.2 + k * 0.4); } // swell, closer together toward the horizon
}

// ---- Launch Complex 1, Māhia: the cliff-top pad, in plain daylight from over the viewer's left shoulder
function mahiaDay(c: C2) {
  const r = rng(11), HZ = 82, { shade, lit } = standing((t, p) => drawSite(t, false, p), 100);
  sea(c, HZ, [[0, '#bcd9ea'], [0.05, '#5c9fcf'], [0.22, '#2071b8'], [0.6, '#10509a'], [1, '#0a3570']], 3);
  for (let i = 0; i < 30; i++) { const y = 110 + r() * 40, x = 259 - (y - 110) * 0.1 + r() * 2.5; line(c, x, y, x + 2 + r() * 6, y + (r() - 0.5), `rgba(255,255,255,${0.25 + r() * 0.45})`, 0.5); } // surf at the foot of the cliffs
  c.drawImage(sheet(320, 150, D, (t) => { drawSite(t, false, 4); t.globalCompositeOperation = 'source-atop'; t.fillStyle = lg(t, 0, 72, 0, 85, [0, 'rgba(190,210,230,.3)'], [1, 'rgba(214,228,240,.66)']); t.fillRect(0, 0, 320, 150); }), 0, 0, 320, 150); // the far headlands, pale with distance
  c.fillStyle = lg(c, 0, HZ - 7, 0, HZ + 5, [0, 'rgba(232,240,248,0)'], [0.6, 'rgba(232,240,248,.3)'], [1, 'rgba(232,240,248,0)']); c.fillRect(0, HZ - 7, 320, 12);
  c.drawImage(sheet(320, 150, D, (t) => {
    drawSite(t, false, 2); t.globalCompositeOperation = 'source-atop';
    const q = rng(19); for (let i = 0; i < 1500; i++) { const x = q() * 218, y = 98 + q() * 52, k = q(), far = (y - 98) / 52; line(t, x, y, x + (q() - 0.5) * (0.8 + far), y - 0.4 - q() * (0.6 + far), k < 0.5 ? 'rgba(18,80,42,.24)' : 'rgba(232,248,140,.22)', 0.2 + far * 0.2); } // pasture, coarser toward us
    for (let i = 0; i < 26; i++) { const y = 108 + q() * 40; line(t, 222 + (y - 108) * 0.1 + q() * 3, y, 256 - q() * 4, y + (q() - 0.5) * 2.4, 'rgba(96,72,44,.22)', 0.3 + q() * 0.4); } // the beds of the papa cliffs
    soft(t, 4); for (const [x, y, rx, ry, a] of [[40, 120, 60, 5, 0.2], [150, 134, 90, 7, 0.16], [90, 147, 80, 6, 0.22], [190, 113, 40, 3, 0.12]]) el(t, x, y, rx, ry, `rgba(8,40,30,${a})`); for (const [x, y, rx, ry, a] of [[100, 108, 50, 3, 0.16], [30, 105, 40, 2.4, 0.18], [170, 123, 60, 4, 0.12]]) el(t, x, y, rx, ry, `rgba(240,250,150,${a})`); soft(t, 0); // the roll of the paddocks
    for (let i = 0; i < 46; i++) { const y = 104 + q() * 46, far = (y - 98) / 52; el(t, q() * 212, y, 1.2 + q() * 3.4 * far, 0.5 + q() * 1.3 * far, 'rgba(14,56,32,.42)'); } // gorse and rushes
    t.beginPath(); t.moveTo(92, 99.8); t.quadraticCurveTo(112, 103.4, 133, 101.4); t.strokeStyle = 'rgba(216,206,172,.75)'; t.lineWidth = 1.3; t.stroke(); // the track from the hangar to the pad
    t.fillStyle = lg(t, 0, 100, 0, 150, [0, 'rgba(255,246,170,.2)'], [0.4, 'rgba(30,60,40,.03)'], [1, 'rgba(6,36,48,.34)']); t.fillRect(0, 0, 214, 150);
    t.save(); t.beginPath(); t.moveTo(214, 100); t.lineTo(262, 108); t.lineTo(258, 150); t.lineTo(226, 150); t.lineTo(222, 120); t.closePath(); t.clip(); // the cliff face: its top edge in the light, its foot and its seaward side in shade
    t.fillStyle = lg(t, 214, 0, 262, 0, [0, 'rgba(255,236,190,.22)'], [1, 'rgba(60,44,40,.36)']); t.fillRect(214, 0, 106, 150); t.fillStyle = lg(t, 0, 104, 0, 150, [0, 'rgba(255,244,214,.2)'], [0.3, 'rgba(60,44,40,0)'], [1, 'rgba(40,34,50,.4)']); t.fillRect(214, 0, 106, 150);
    for (let i = 0; i < 9; i++) { const x = 226 + q() * 30, y = 110 + q() * 10; line(t, x, y, x + (q() - 0.5) * 3, y + 14 + q() * 22, 'rgba(60,44,30,.24)', 0.5 + q() * 0.7); } t.restore(); // gullies
    soft(t, 0.5); t.globalAlpha = 0.5; t.drawImage(shade, 0, 0, 320, 150); t.globalAlpha = 1; soft(t, 0);
  }), 0, 0, 320, 150);
  line(c, 110, 100.1, 214, 100.1, 'rgba(236,246,150,.7)', 0.3); // the lip of the cliff top catching the light
  c.drawImage(lit, 0, 0, 320, 150);
}
// ---- Launch Complex 2, Wallops Island: a barrier island a few metres above the Atlantic
function wallopsDay(c: C2) {
  const r = rng(23), HZ = 80, { shade, lit } = standing(drawWallops, 99);
  sea(c, HZ, [[0, '#bdd0dc'], [0.06, '#6194bc'], [0.25, '#2d69a6'], [0.65, '#1a4a86'], [1, '#123462']], 7);
  for (let i = 0; i < 150; i++) { const k = r(), y = (1 - k) * (1 - k) * 118 + 2 * (1 - k) * k * 124 + k * k * 116 - 2.6 + r() * 3.4, x = 320 * (1 - k); line(c, x, y, x + 3 + r() * 8, y + (r() - 0.5) * 0.5, `rgba(255,255,255,${0.25 + r() * 0.6})`, 0.4 + r() * 0.5); } // the Atlantic breaking along the beach
  c.drawImage(sheet(320, 150, D, (t) => {
    drawWallops(t, 2); t.globalCompositeOperation = 'source-atop';
    const q = rng(31); for (let i = 0; i < 900; i++) { const x = q() * 320, y = 97 + q() * 26; el(t, x, y, 0.2 + q() * 0.4, 0.12 + q() * 0.2, q() < 0.5 ? 'rgba(255,250,224,.3)' : 'rgba(96,84,52,.22)'); } // sand
    for (let i = 0; i < 260; i++) { const x = q() * 320, y = 100 + q() * 16; line(t, x, y, x + (q() - 0.5) * 1.6, y - 1 - q() * 1.6, q() < 0.5 ? 'rgba(74,112,58,.5)' : 'rgba(170,176,96,.5)', 0.25); } // marram on the dunes
    t.fillStyle = lg(t, 0, 97, 0, 124, [0, 'rgba(255,250,214,.22)'], [0.5, 'rgba(60,50,30,0)'], [0.82, 'rgba(96,78,48,.2)'], [1, 'rgba(70,84,104,.5)']); t.fillRect(0, 90, 320, 60); // dry sand above, wet sand at the water
    soft(t, 0.5); t.globalAlpha = 0.46; t.drawImage(shade, 0, 0, 320, 150); t.globalAlpha = 1; soft(t, 0);
  }), 0, 0, 320, 150);
  c.drawImage(lit, 0, 0, 320, 150);
}
export const MAHIA: Pad = {
  id: 'mahia', hz: 82, x: 154, day: mahiaDay, night: stars(21, 1.7, '#02040c'), // midwinter and late spring both put the Milky Way high over the sea in the evening
  sky: blue([[0, '#0d459e'], [0.4, '#2c74cc'], [0.7, '#6aaae2'], [0.9, '#a6cdea'], [1, '#cfe2f0']], 4),
  heads: [[120, 16, 150, 70], [196, 16, 158, 70], [71, 89, 77, 98]], pools: [[156, 97, 54, 9, 1], [150, 62, 15, 46, 1], [182, 92, 14, 12, 0.8], [77, 93, 22, 9, 0.8]], beacons: [[120, 12], [196, 12]],
  rise: [292, -1, 66],
};
export const WALLOPS: Pad = {
  id: 'wallops', hz: 80, x: 154, day: wallopsDay, night: stars(33, 0.8, '#03050e'),
  sky: blue([[0, '#2a5aa4'], [0.4, '#5488c6'], [0.75, '#93b6d8'], [1, '#c9d8e4']], 9), // a paler sky: late November at 38° north
  heads: [[124, 42, 148, 74], [194, 42, 160, 74], [281, 98, 284, 86]], pools: [[158, 95, 52, 8, 1], [150, 60, 15, 44, 1], [182, 92, 13, 11, 0.8], [106, 94, 10, 6, 0.9], [284, 88, 7, 9, 0.9], [56, 95, 30, 5, 0.45]], beacons: [[62, 5], [62, 50], [34, 30], [46, 30], [74, 30], [84, 30], [124, 40], [194, 40]],
  rise: [252, 1, 18], moon: { x: 236, up: 0.35, down: 6.9 },
};

function shared(scene: Phaser.Scene) {
  if (scene.textures.exists('hf_pv_dawn')) return;
  texAt(scene, 'hf_pv_dawn', 320, SKH, 1, (c) => { c.fillStyle = lg(c, 0, 0, 0, SKH, [0, 'rgba(255,130,120,0)'], [0.45, 'rgba(255,120,110,.16)'], [0.78, 'rgba(255,150,90,.5)'], [0.95, 'rgba(255,196,110,.85)'], [1, 'rgba(255,210,130,.9)']); c.fillRect(0, 0, 320, SKH); });
  texAt(scene, 'hf_pv_dusk', 320, SKH, 1, (c) => { c.fillStyle = lg(c, 0, 0, 0, SKH - 4, [0, 'rgba(255,170,150,0)'], [0.5, 'rgba(255,170,150,.12)'], [0.8, 'rgba(255,150,160,.55)'], [0.9, 'rgba(232,130,160,.6)'], [0.96, 'rgba(110,104,160,.6)'], [1, 'rgba(70,84,140,.66)']); c.fillRect(0, 0, 320, SKH); }); // the pink band opposite a sunset, over the Earth's own shadow
  texAt(scene, 'hf_pv_glit', 70, 68, 2, (c) => { const r = rng(4); for (let i = 0; i < 260; i++) { const k = r(), y = 0.5 + k * k * 66, hw = 2 + y * 0.36, x = 35 + (r() - 0.5) * 2 * hw; line(c, x - 0.5 - r() * 2.2, y, x + 0.5 + r() * 2.2, y, `rgba(255,255,255,${0.95 - k * 0.5})`, 0.4); } });
  texAt(scene, 'hf_pv_moon', 16, 16, 8, (c) => { // a waning moon a little short of half, its lit side down and to the left, toward a sun still under the horizon
    c.translate(8, 8); c.rotate(-0.7); c.beginPath(); c.arc(0, 0, 5, Math.PI / 2, Math.PI * 1.5); c.closePath(); c.fillStyle = lg(c, -5, 0, 0, 0, [0, '#fff6e0'], [1, '#e8dcc0']); c.fill();
    const r = rng(3); c.globalCompositeOperation = 'source-atop'; for (let i = 0; i < 9; i++) el(c, -4.4 + r() * 4, -3.6 + r() * 7.2, 0.5 + r() * 1.1, 0.4 + r() * 0.9, 'rgba(150,140,130,.25)');
    c.globalCompositeOperation = 'destination-out'; el(c, 0, 0, 0.8, 5, '#000');
  });
  texAt(scene, 'hf_pv_cloud1', 70, 24, 2, puffy(1)); texAt(scene, 'hf_pv_cloud2', 100, 30, 2, puffy(2)); texAt(scene, 'hf_pv_cloud3', 46, 16, 2, puffy(6));
}
/** Draws a pad's textures: `hf_pv_<id>_day` (the same size as the plain site texture, to swap for it), its two skies, and what its floodlights pick out. */
export function padTextures(scene: Phaser.Scene, p: Pad) {
  const k = 'hf_pv_' + p.id; if (scene.textures.exists(k + '_day')) return; shared(scene);
  const day = texAt(scene, k + '_day', 320, 150, D, p.day).getSourceImage() as HTMLCanvasElement;
  texAt(scene, k + '_night', 320, SKH, 2, p.night); texAt(scene, k + '_sky', 320, SKH, 2, p.sky);
  texAt(scene, k + '_flood', 320, 150, 2, (c) => { // the pad as its floodlights show it: the daylight drawing, wherever a pool of light falls
    for (const [x, y, rx, ry, a] of p.pools) { c.save(); c.translate(x, y); c.scale(1, ry / rx); const g = c.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.7})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(-rx, -rx, rx * 2, rx * 2); c.restore(); }
    c.globalCompositeOperation = 'source-in'; c.drawImage(day, 0, 0, 320, 150);
    c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(206,224,255,.14)'; c.fillRect(0, 0, 320, 150);
  });
  texAt(scene, k + '_beam', 320, 150, 1, (c) => { // the lamps themselves, and their beams in the sea air
    soft(c, 1.5); add(c, () => { for (const [x, y, tx, ty] of p.heads) { const dx = tx - x, dy = ty - y, n = Math.hypot(dx, dy), px = (-dy / n) * (3 + n * 0.16), py = (dx / n) * (3 + n * 0.16); c.fillStyle = lg(c, x, y, tx, ty, [0, 'rgba(214,230,255,.4)'], [1, 'rgba(214,230,255,0)']); c.beginPath(); c.moveTo(x, y); c.lineTo(tx + px, ty + py); c.lineTo(tx - px, ty - py); c.closePath(); c.fill(); } }); soft(c, 0);
    for (const [x, y] of p.heads) { halo(c, x, y, 9, '220,234,255', 0.9); el(c, x, y, 0.9, 0.9, '#ffffff'); }
  });
}

export interface View { p: Pad; ox: number; oy: number; night: Im; day: Im; dawn: Im; dusk: Im; sunGlow: Im; sun: Im; sunGlit: Im; moonGlow?: Im; moon?: Im; moonGlit?: Im; clouds: Im[]; twinkle: Im[]; site: Im; rocket: Im; flame: Em; flood: Im; beam: Im; wash: Im; pool: Im; skyGlow: Im; plume: Im; core: Im; smoke: Em; trail: Em; beacons: Im[]; b: number; y0: number; dark: boolean }
const mix = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k), rgb = (c: number[]) => Phaser.Display.Color.GetColor(Math.min(255, c[0]), Math.min(255, c[1]), Math.min(255, c[2]));
const sat = (v: number) => Phaser.Math.Clamp(v, 0, 1);

/**
 * Builds one pad picture round the scene's own sprites. `ox`, `oy` is where the site drawing's corner sits; the names are
 * the scene's tags for its sky, its site image, its rocket and its flame. Whatever spills out of the picture is the
 * look's to cover (a bezel drawn over it).
 */
export function padView(hf: HiFi, p: Pad, o: { ox: number; oy: number; sky: string; site: string; rocket: string; flame: string }): View {
  const s = hf.scene, k = 'hf_pv_' + p.id, X = (x: number) => o.ox + x * K, Y = (y: number) => o.oy + y * K, r = rng(p.hz + p.x);
  const puff = (x: number, y: number, kx: number, ky: number, tint: number) => s.add.image(X(x), Y(y), 'puff').setScale(S * kx, S * ky).setTint(tint).setBlendMode('ADD').setAlpha(0);
  const sheetAt = (key: string, res: number, y = 0) => s.add.image(o.ox, Y(y), key).setOrigin(0).setScale(K / res);
  const back = <T extends Phaser.GameObjects.GameObject>(q: T) => hf.below(q, o.site), mid = <T extends Phaser.GameObjects.GameObject>(q: T) => hf.below(q, o.flame);
  // behind the site: the two skies, first light, the band opposite a sunset, the sun, the moon, cloud
  const night = back(sheetAt(k + '_night', 2, -UP)), twinkle = [0, 1, 2, 3, 4, 5].map(() => back(puff(20 + r() * 280, -UP + 6 + r() * 70, 0.1, 0.1, 0xffffff)));
  const moonGlow = p.moon && back(puff(0, 0, 1.5, 1.5, 0xffd9a0)), moon = p.moon && back(s.add.image(0, 0, 'hf_pv_moon').setScale(K / 8).setAlpha(0));
  const day = back(sheetAt(k + '_sky', 2, -UP)).setAlpha(0), dusk = back(sheetAt('hf_pv_dusk', 1, -UP).setScale(K, K * (p.hz + UP) / (SKH - 4))).setAlpha(0), dawn = back(sheetAt('hf_pv_dawn', 1, -UP).setScale(K, K * (p.hz + UP) / SKH)).setBlendMode('ADD').setAlpha(0);
  const sunGlow = back(puff(0, 0, 3.2, 2.2, 0xffb060)), sun = back(puff(0, 0, 0.5, 0.5, 0xfff6e0));
  const clouds = [[36, 60, 1, 0.5], [150, 66, 2, 0.42], [246, 54, 3, 0.55], [300, 70, 1, 0.34]].map(([x, y, n, k]) => back(s.add.image(X(x), Y(y), 'hf_pv_cloud' + n).setScale(K / 2 * k))); // fair-weather cumulus, far out over the sea
  // on the water and on the ground: glitter under the sun and the moon, the floodlights, the red lights on the masts
  const glit = (x: number, tint: number) => mid(s.add.image(X(x), Y(p.hz + 0.6), 'hf_pv_glit').setOrigin(0.5, 0).setScale(K / 2).setCrop(0, 0, 140, p.rise[2] * 2).setTint(tint).setBlendMode('ADD').setAlpha(0));
  const sunGlit = glit(p.rise[0], 0xffd9a0), moonGlit = p.moon && glit(p.moon.x, 0xd6e2ff);
  const flood = mid(sheetAt(k + '_flood', 2)).setAlpha(0), beam = mid(sheetAt(k + '_beam', 1)).setBlendMode('ADD').setAlpha(0);
  const beacons = p.beacons.map(([x, y]) => mid(puff(x, y, 0.22, 0.22, 0xff4a3a)));
  // lift-off: the sky lit from below, the pad in the engine's own light, smoke rolling out along the ground, and the column it leaves
  const skyGlow = back(puff(p.x, 96, 9, 6, 0xff9a50)), wash = mid(sheetAt(k + '_flood', 2)).setBlendMode('ADD').setTint(0xffb070).setAlpha(0), pool = mid(puff(p.x, 100, 5, 0.9, 0xffa050));
  const smoke = mid(s.add.particles(X(p.x), Y(99), 'puff', { x: { min: -2, max: 2 }, speedX: { min: -46, max: 46 }, speedY: { min: -9, max: 1 }, gravityY: -5, lifespan: { min: 1500, max: 3200 }, scale: { start: S * 0.2, end: S * 1.1 }, alpha: { start: 0.55, end: 0 }, frequency: 22, emitting: false }));
  const trail = mid(s.add.particles(0, 0, 'puff', { speedX: { min: -3, max: 3 }, speedY: { min: 2, max: 9 }, lifespan: { min: 900, max: 1700 }, scale: { start: S * 0.12, end: S * 0.6 }, alpha: { start: 0.3, end: 0 }, frequency: 26, emitting: false }));
  const rocket = hf.tags[o.rocket] as Im, plume = hf.above(puff(0, 0, 1.7, 2.3, 0xffa858), o.rocket), core = hf.above(puff(0, 0, 0.5, 0.9, 0xffffff), o.rocket);
  return { p, ox: o.ox, oy: o.oy, night, day, dawn, dusk, sunGlow, sun, sunGlit, moonGlow, moon, moonGlit, clouds, twinkle, site: hf.tags[o.site] as Im, rocket, flame: hf.tags[o.flame] as Em, flood, beam, wash, pool, skyGlow, plume, core, smoke, trail, beacons, b: 0, y0: Y(100), dark: false };
}

/**
 * Moves one pad picture on: `light` is the scene's own daylight (0 night, 1 day), `hour` the local time, `rise` and `set`
 * the hours its daylight begins and ends. Returns how hard the engine is burning in frame, for the look's heat shimmer.
 */
export function padStep(v: View, hf: HiFi, dt: number, light: number, hour: number, rise: number, set: number) {
  const p = v.p, t = hf.t, n = 1 - light, X = (x: number) => v.ox + x * K, Y = (y: number) => v.oy + y * K;
  const sr = rise + 0.35, ss = set - 0.5, e = (hour - sr) / 1.5; // sunrise and sunset by the scene's daylight, and how far up the sun has come
  const dawn = sat(Math.min((hour - (sr - 0.7)) / 0.8, (sr + 1.7 - hour) / 1.5)), gold = hour < ss ? sat((hour - (ss - 2.6)) / 2.6) : sat(1 - (hour - ss) / 0.9), warm = Math.max(dawn, gold ** 1.5);
  // the sky
  v.day.setAlpha(light); v.dawn.setAlpha(dawn * 0.9); v.dusk.setAlpha(gold * gold * 0.85 * (0.35 + 0.65 * light));
  v.twinkle.forEach((q, i) => q.setAlpha(n * (0.5 + 0.5 * Math.sin(t * (2 + i * 0.7) + i * 2))));
  const up = e > -0.2 && e < 1.3, sx = p.rise[0] + p.rise[1] * e * 34, sy = p.hz + 3 - e * 80, sa = up ? sat((e + 0.2) * 4) * sat((1.3 - e) * 4) : 0;
  v.sun.setPosition(X(sx), Y(sy)).setAlpha(sa).setTint(rgb(mix([255, 150, 70], [255, 250, 232], sat(e * 1.6)))).setScale(S * (0.62 - 0.14 * sat(e)));
  v.sunGlow.setPosition(X(sx), Y(Math.min(sy, p.hz))).setAlpha(sa * (0.7 - 0.4 * sat(e * 2))).setTint(rgb(mix([255, 120, 60], [255, 214, 150], sat(e * 1.4))));
  v.sunGlit.setX(X(sx)).setAlpha(sat(e * 4) * sat((1.2 - e) * 2) * 0.9);
  if (p.moon && v.moon && v.moonGlow && v.moonGlit) {
    const m = hour - p.moon.up, on = m > 0 && hour < p.moon.down ? sat(m * 5) * n : 0, low = sat(1 - m / 1.6), mx = p.moon.x + m * 9, my = p.hz + 4 - m * 14;
    v.moon.setPosition(X(mx), Y(my)).setAlpha(on).setTint(rgb(mix([255, 252, 240], [255, 190, 120], low * low)));
    v.moonGlow.setPosition(X(mx), Y(my)).setAlpha(on * 0.5); v.moonGlit.setX(X(mx)).setAlpha(on * sat(m * 2.5) * 0.55);
  }
  const cl = rgb(mix(mix([44, 56, 96], [255, 255, 255], light), [255, 176, 150], warm * 0.5 * light));
  v.clouds.forEach((q, i) => { q.x += dt * (0.3 + i * 0.12); if (q.x > v.ox + 180) q.x = v.ox - 20; q.setTint(cl).setAlpha(0.3 + 0.6 * light); });
  // the ground: moonless dark by night, white by day, gold at either end of it; then the floodlights
  const tone = mix(mix([52, 68, 118], [255, 255, 255], light), [255, 196, 132], warm * 0.7 * light);
  v.site.setTint(rgb(tone)); v.rocket.setTint(rgb(mix([206, 220, 255], tone, light)));
  v.flood.setAlpha(n * 0.96); v.beam.setAlpha(n * (0.75 + 0.05 * Math.sin(t * 1.7)));
  v.beacons.forEach((q, i) => q.setAlpha(Math.max(0, Math.sin(t * 2.2 + i * 1.9)) ** 2 * (0.3 + 0.7 * n)));
  // lift-off
  const on = v.flame.emitting && v.rocket.visible, alt = Math.max(0, v.y0 - v.rocket.y), near = 1 / (1 + alt / 22), fl = 0.86 + 0.14 * Math.sin(t * 61) * Math.sin(t * 37);
  v.b += ((on ? 1 : 0) - v.b) * Math.min(1, dt * (on ? 9 : 1.6)); const b = v.b;
  if (v.dark !== n > 0.5) { v.dark = n > 0.5; v.smoke.setParticleTint(v.dark ? 0xd9a070 : 0xf2f4f8); v.trail.setParticleTint(v.dark ? 0xc08a60 : 0xe8ecf4); }
  v.plume.setPosition(v.rocket.x, v.rocket.y + 3).setAlpha(b * fl * (0.5 + 0.4 * n)); v.core.setPosition(v.rocket.x, v.rocket.y + 2).setAlpha(b * fl * 0.9);
  v.wash.setAlpha(b * fl * near * (0.12 + 0.8 * n)); v.pool.setAlpha(b * fl * near * (0.3 + 0.6 * n)); v.skyGlow.setAlpha(b * fl * n * 0.45);
  v.smoke.emitting = on && alt < 30; v.trail.emitting = on && alt > 2; v.trail.setPosition(v.rocket.x, v.rocket.y + 4);
  return b * near;
}
