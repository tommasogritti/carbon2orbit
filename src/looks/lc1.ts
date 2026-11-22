import { D, C2, el, line, poly, lg, rg, rng, drawSite } from '../art';
import { texAt, soft, add, halo, sheet } from '../hifi';
import type { Grade, Look } from '../hifi';
import { spaceTextures, SPACE, puffy, ascentLive, ascentStep, CloudTone } from './flight';

// ------------------------------------------------------------------ Launch Complex 1, Māhia: one pad, a different day each flight
// Every Electron in the story leaves the same cliff-top pad, so the site is one drawing (`drawSite`, the plain one's code)
// and each flight brings its own light: a `Day` below, chosen from the hour it really flew. The sun's height follows the
// clock; which way the camera looks is the game's own (the plain sky already has the sun in frame, out over the sea).
// Launch control places its own backdrop, so these looks have no layer stack: they redraw the textures the scene asks
// for (`swap`); what moves on the way up is shared with the other launch looks (flight.ts).
const HZ = 82; // the horizon of the site drawing

interface Day {
  key: string; seed: number; sun: [number, number]; disc: [number, string];
  sky: [number, string][]; sunRGB: string; glow: [number, number, number, number]; rays: number; cirrus: [number, string]; /** Patches of broken cloud across the sky. */ deck?: number;
  sea: [number, string][]; swell: [string, string]; glitter: (k: number) => string; bank?: string;
  haze: [string, string]; mist: string; grassDark: string; grassLight: string;
  slope: [number, string][]; cliff: [number, string][]; shadow: [number, number, number, string];
  thing: [number, string][]; tone: CloudTone; grade: Grade; flare: number; sunTint: number; glint: number;
}

const sky = (d: Day) => (c: C2) => {
  const [sx, sy] = d.sun, r = rng(d.seed), [g0, a0, g1, a1] = d.glow;
  c.fillStyle = lg(c, 0, 0, 0, 180, ...d.sky); c.fillRect(0, 0, 320, 180);
  soft(c, 2.2); for (let i = 0; i < d.cirrus[0]; i++) { const x = r() * 340 - 10, y = 8 + r() * 78, len = 26 + r() * 70; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len * 0.5, y - 3 - r() * 4, x + len, y - 1 - r() * 6); c.strokeStyle = `rgba(${d.cirrus[1]},${0.08 + r() * 0.16})`; c.lineWidth = 0.8 + r() * 1.8; c.stroke(); } soft(c, 0); // high cloud
  if (d.deck) { // a broken deck of cloud: grey on top, and lit from underneath wherever the sun can reach
    soft(c, 2.6);
    for (let i = 0; i < d.deck; i++) { const x = r() * 340 - 10, y = 4 + r() * 88, rx = 14 + r() * 40, ry = 1.4 + r() * 3.6, near = Math.max(0, 1 - Math.hypot(x - sx, (y - sy) * 2) / 210); el(c, x, y - ry * 0.6, rx, ry, `rgba(${70 + near * 70},${76 + near * 40},120,.5)`); el(c, x + 2, y + ry * 0.25, rx * 0.92, ry * 0.7, `rgba(255,${170 + near * 60},${130 + near * 40},${0.2 + near * 0.5})`); }
    soft(c, 0);
  }
  halo(c, sx, sy, g0, d.sunRGB, a0); halo(c, sx, sy, g1, d.sunRGB, a1);
  add(c, () => { for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.283 + r() * 0.2, len = (30 + r() * 46) * d.rays, w = 0.035 + r() * 0.03; c.fillStyle = rg(c, sx, sy, 4, len, [0, `rgba(${d.sunRGB},.14)`], [1, `rgba(${d.sunRGB},0)`]); c.beginPath(); c.moveTo(sx, sy); c.arc(sx, sy, len, a - w, a + w); c.closePath(); c.fill(); } });
  el(c, sx, sy, d.disc[0], d.disc[0], d.disc[1]); halo(c, sx, sy, d.disc[0] * 2.4, '255,255,250', 0.95);
};

/** The site: the plain drawing's sea, headlands, peninsula and pad, under the day's sun. */
const site = (d: Day) => (c: C2) => {
  const r = rng(d.seed + 4), sx = d.sun[0], [sh, fl, sa, scol] = d.shadow;
  c.fillStyle = lg(c, 0, HZ, 0, 150, ...d.sea); c.fillRect(0, HZ, 320, 68);
  soft(c, 3); for (const [x, y, w] of [[40, 90, 46], [150, 94, 60], [296, 112, 34], [300, 136, 40]]) el(c, x, y, w, 1.6 + (y - HZ) * 0.05, d.swell[1]); soft(c, 0); // cloud shadows crossing the water
  for (let i = 0; i < 300; i++) { const k = r() ** 1.5, y = HZ + 0.8 + k * 67, x = r() * 336 - 8, len = 1.6 + k * 13; line(c, x, y, x + len, y, `rgba(${d.swell[0]},${0.08 + r() * 0.2})`, 0.2 + k * 0.4); } // swell, closer together toward the horizon
  for (let i = 0; i < 280; i++) { const k = r(), y = HZ + 0.5 + k * k * 62, hw = 3 + (y - HZ) * 0.6, x = sx + (r() - 0.5) * 2 * hw; line(c, x - 0.5 - r() * 2.2, y, x + 0.5 + r() * 2.2, y, d.glitter(k), 0.34); } // the sun on the water
  halo(c, sx, HZ + 1.5, 44, d.sunRGB, 0.3);
  if (d.bank) { soft(c, 1.6); for (let i = 0; i < 14; i++) el(c, r() * 320, HZ - 1.6 - r() * 2.4, 14 + r() * 26, 1.2 + r() * 1.6, d.bank); soft(c, 0); } // a bank of cloud lying on the horizon
  // far: the plain drawing's two headlands, pale with distance, and the haze along the horizon
  c.drawImage(sheet(320, 150, D, (t) => { drawSite(t, false, 4); t.globalCompositeOperation = 'source-atop'; t.fillStyle = lg(t, 0, 72, 0, 85, [0, d.haze[0]], [1, d.haze[1]]); t.fillRect(0, 0, 320, 150); }), 0, 0, 320, 150);
  c.fillStyle = lg(c, 0, HZ - 7, 0, HZ + 5, [0, 'rgba(0,0,0,0)'], [0.6, d.mist], [1, 'rgba(0,0,0,0)']); c.fillRect(0, HZ - 7, 320, 12);
  // what stands on the peninsula, and the shadow it throws away from the sun, across the grass toward us
  const things = sheet(320, 150, D, (t) => drawSite(t, false, 8));
  const shade = sheet(320, 150, D, (t) => { t.transform(1, 0, sh, fl, -100 * sh, 100 * (1 - fl)); t.drawImage(things, 0, 0, 320, 150); t.globalCompositeOperation = 'source-in'; t.fillStyle = scol; t.fillRect(-400, -400, 1200, 1200); });
  c.drawImage(sheet(320, 150, D, (t) => {
    drawSite(t, false, 2); t.globalCompositeOperation = 'source-atop';
    const q = rng(19); for (let i = 0; i < 1500; i++) { const x = q() * 218, y = 98 + q() * 52, k = q(), far = (y - 98) / 52; line(t, x, y, x + (q() - 0.5) * (0.8 + far), y - 0.4 - q() * (0.6 + far), k < 0.5 ? d.grassDark : d.grassLight, 0.2 + far * 0.2); } // pasture, coarser toward us
    for (let i = 0; i < 26; i++) { const y = 108 + q() * 40; line(t, 222 + (y - 108) * 0.1 + q() * 3, y, 256 - q() * 4, y + (q() - 0.5) * 2.4, 'rgba(96,72,44,.22)', 0.3 + q() * 0.4); } // the beds of the papa cliffs
    t.fillStyle = lg(t, 0, 100, 0, 150, ...d.slope); t.fillRect(0, 0, 214, 150);
    t.fillStyle = lg(t, 214, 0, 262, 0, ...d.cliff); t.fillRect(214, 0, 106, 150);
    soft(t, 0.6); t.globalAlpha = sa; t.drawImage(shade, 0, 0, 320, 150); t.globalAlpha = 1; soft(t, 0);
  }), 0, 0, 320, 150);
  line(c, 110, 100.1, 214, 100.1, d.grassLight.replace(/[\d.]+\)$/, '.7)'), 0.3); // the lip of the cliff top catching the light
  c.drawImage(sheet(320, 150, D, (t) => { t.drawImage(things, 0, 0, 320, 150); t.globalCompositeOperation = 'source-atop'; t.fillStyle = lg(t, 110, 0, 200, 0, ...d.thing); t.fillRect(0, 0, 320, 150); }), 0, 0, 320, 150);
};

// ---- 25 May 2017, 16:20 NZST: "It's a Test". Late autumn at 39° south: the sun set that day a little before five, so
// the first Electron left with the sun about five degrees up, and Spaceflight Now (the level's source) has it climbing
// "into mostly cloudy skies". Low gold light under a broken deck of cloud, long shadows, warm undersides.
const TEST: Day = {
  key: 'hf_l1t', seed: 3, sun: [238, 98], disc: [7.4, '#fff3cf'],
  sky: [[0, '#122f72'], [0.3, '#2f5aa6'], [0.5, '#7f9cc8'], [0.6, '#e3bf9a'], [0.66, '#ffc98a'], [0.8, '#ffd9a6'], [1, '#ffe8c4']],
  sunRGB: '255,196,120', glow: [150, 0.34, 46, 0.62], rays: 1.25, cirrus: [14, '255,214,170'], deck: 46,
  sea: [[0, '#ffd9a0'], [0.05, '#b79a9c'], [0.2, '#4e6f9c'], [0.6, '#27487c'], [1, '#15305c']], swell: ['255,226,190', 'rgba(14,26,66,.22)'],
  glitter: (k) => `rgba(255,${236 - k * 50},${176 - k * 70},${0.95 - k * 0.5})`, bank: 'rgba(196,140,140,.5)',
  haze: ['rgba(255,196,150,.34)', 'rgba(255,212,170,.62)'], mist: 'rgba(255,214,170,.42)', grassDark: 'rgba(20,52,34,.26)', grassLight: 'rgba(255,220,120,.22)',
  slope: [[0, 'rgba(255,190,90,.26)'], [0.3, 'rgba(120,90,60,.10)'], [1, 'rgba(10,24,44,.42)']], cliff: [[0, 'rgba(40,30,60,.34)'], [0.5, 'rgba(255,170,90,.12)'], [1, 'rgba(255,196,120,.42)']],
  shadow: [1.5, -0.3, 0.5, '#0a1c26'], thing: [[0, 'rgba(18,22,52,.42)'], [0.6, 'rgba(18,22,52,.12)'], [1, 'rgba(255,186,110,.42)']],
  tone: { shade: '#a99cb8', down: [[0, 'rgba(255,238,214,.75)'], [0.4, 'rgba(255,214,170,.25)'], [0.72, 'rgba(255,150,96,.5)'], [1, 'rgba(226,110,90,.7)']], across: [[0, 'rgba(60,60,120,.3)'], [0.6, 'rgba(255,200,150,0)'], [1, 'rgba(255,200,130,.5)']] },
  grade: { threshold: 0.86, bloom: 0.5, exposure: 1.0, contrast: 1.12, saturation: 1.14, shadows: [0.9, 0.96, 1.16], highs: [1.08, 1.0, 0.9], vignette: 0.42, grain: 0.02, fringe: 0.005 },
  flare: 0.9, sunTint: 0xffd9a0, glint: 0xffe2b0,
};

const look = (d: Day): Look => ({
  build(scene) {
    texAt(scene, d.key + '_sky', 320, 180, D, sky(d)); texAt(scene, d.key + '_site', 320, 150, D, site(d)); spaceTextures(scene);
    texAt(scene, d.key + '_cloud1', 70, 24, D, puffy(1, d.tone)); texAt(scene, d.key + '_cloud2', 100, 30, D, puffy(2, d.tone)); texAt(scene, d.key + '_cloud3', 46, 16, D, puffy(6, d.tone));
  },
  layers: [],
  swap: { ...SPACE, sky_day: d.key + '_sky', site_mahia: d.key + '_site', cloud1: d.key + '_cloud1', cloud2: d.key + '_cloud2', cloud3: d.key + '_cloud3' },
  grade: d.grade,
  live(hf) { ascentLive(hf, { sun: d.sun, glint: { x: d.sun[0], y0: -17, y1: 2, tint: d.glint }, flare: d.flare, sunTint: d.sunTint, plume: 1.5 }); },
  step: ascentStep,
});
export const lc1Looks: Record<string, Look> = { 'lc1-test': look(TEST) };
