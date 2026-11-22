import { D, C2, el, line, poly, lg, rg, rng, drawSite } from '../art';
import { texAt, soft, add, halo, sheet } from '../hifi';
import type { Grade, Look } from '../hifi';
import { spaceTextures, SPACE, puffy, ascentLive, ascentStep, CloudTone, NOON } from './flight';
import { evening, Eve, Pad } from './evening';

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
  thing: [number, string][]; tone: CloudTone; grade: Grade; flare: number; sunTint: number; glint: number; /** The glitter that moves, where the sun stands over the strip of sea behind the pad: half its width, and how far down it reaches. */ glintBox?: [number, number];
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

// ---- 21 January 2018, 14:43 NZDT: "Still Testing". High summer, an hour and a half after the sun's highest point, so it
// stands some sixty degrees up: out of the top of the frame, with only its glare coming in. Hard light, a deep sky,
// short shadows. (The hour is 01:43 UTC in the level's source, the list of Electron launches; the fair weather is the game's choice.)
const STILL: Day = {
  key: 'hf_l1s', seed: 9, sun: [214, -12], disc: [7, '#fffef8'],
  sky: [[0, '#0a3f9e'], [0.35, '#1f6fd0'], [0.62, '#62aeea'], [0.86, '#a9d6f4'], [1, '#d4ecfa']],
  sunRGB: '255,251,236', glow: [190, 0.3, 80, 0.5], rays: 2.3, cirrus: [12, '255,255,255'],
  sea: [[0, '#8fc6e8'], [0.04, '#4ba3d6'], [0.2, '#1675c2'], [0.6, '#0c54a4'], [1, '#073878']], swell: ['226,244,255', 'rgba(6,36,92,.22)'],
  glitter: (k) => `rgba(255,${254 - k * 20},${240 - k * 40},${0.7 - k * 0.45})`,
  haze: ['rgba(176,208,234,.30)', 'rgba(196,224,244,.66)'], mist: 'rgba(214,236,250,.2)', grassDark: 'rgba(18,84,44,.22)', grassLight: 'rgba(224,250,150,.22)',
  slope: [[0, 'rgba(255,250,190,.24)'], [0.45, 'rgba(8,44,48,0)'], [1, 'rgba(8,44,48,.30)']], cliff: [[0, 'rgba(70,56,40,.22)'], [0.5, 'rgba(255,250,220,.06)'], [1, 'rgba(255,250,224,.30)']],
  shadow: [0.14, -0.12, 0.5, '#04201a'], thing: [[0, 'rgba(6,30,34,.22)'], [0.55, 'rgba(6,30,34,0)'], [1, 'rgba(255,250,210,.26)']],
  tone: NOON,
  grade: { threshold: 0.9, bloom: 0.42, exposure: 1.0, contrast: 1.12, saturation: 1.18, shadows: [0.92, 1.0, 1.12], highs: [1.05, 1.02, 0.95], vignette: 0.36, grain: 0.018, fringe: 0.005 },
  flare: 0.8, sunTint: 0xfff6dc, glint: 0xfffbe6,
};

// ---- 11 November 2018, 16:50 NZDT: "It's Business Time". The level's own account gives the hour: ten to five on a late
// spring afternoon, three hours before sunset, the sun about a third of the way up the sky. Warm white light from one
// side, shadows as long as the things that throw them, cumulus building over the sea. (The cloud is the game's choice.)
const BUSINESS: Day = {
  key: 'hf_l1b', seed: 14, sun: [212, 68], disc: [6.8, '#fffbe8'],
  sky: [[0, '#0b3a8c'], [0.35, '#2a6cc4'], [0.6, '#74b0e4'], [0.8, '#c0daee'], [1, '#f2e8d4']],
  sunRGB: '255,240,204', glow: [130, 0.3, 44, 0.6], rays: 1.1, cirrus: [18, '255,248,236'],
  sea: [[0, '#cfe0e6'], [0.05, '#5fa4cc'], [0.2, '#1f6fb4'], [0.6, '#114e96'], [1, '#0a3470']], swell: ['240,246,250', 'rgba(8,34,86,.22)'],
  glitter: (k) => `rgba(255,${250 - k * 30},${222 - k * 52},${0.9 - k * 0.5})`, bank: 'rgba(255,244,230,.6)',
  haze: ['rgba(190,208,226,.30)', 'rgba(226,226,220,.64)'], mist: 'rgba(244,238,222,.3)', grassDark: 'rgba(16,76,40,.24)', grassLight: 'rgba(236,246,130,.24)',
  slope: [[0, 'rgba(255,240,150,.26)'], [0.4, 'rgba(40,60,40,.04)'], [1, 'rgba(6,36,48,.36)']], cliff: [[0, 'rgba(56,44,48,.3)'], [0.5, 'rgba(255,230,180,.08)'], [1, 'rgba(255,232,180,.38)']],
  shadow: [0.62, -0.2, 0.5, '#06201c'], thing: [[0, 'rgba(10,26,44,.34)'], [0.6, 'rgba(10,26,44,.06)'], [1, 'rgba(255,236,186,.36)']],
  tone: { shade: '#b8c6dc', down: [[0, 'rgba(255,252,240,.95)'], [0.42, 'rgba(255,246,226,.2)'], [0.7, 'rgba(130,140,180,.28)'], [1, 'rgba(96,104,156,.62)']], across: [[0, 'rgba(60,80,140,.26)'], [0.6, 'rgba(255,240,210,0)'], [1, 'rgba(255,232,186,.5)']] },
  grade: { threshold: 0.88, bloom: 0.46, exposure: 1.0, contrast: 1.12, saturation: 1.16, shadows: [0.9, 0.98, 1.14], highs: [1.07, 1.02, 0.93], vignette: 0.38, grain: 0.018, fringe: 0.005 },
  flare: 1, sunTint: 0xfff0d0, glint: 0xfff6dc,
};

const look = (d: Day): Look => ({
  build(scene) {
    texAt(scene, d.key + '_sky', 320, 180, D, sky(d)); texAt(scene, d.key + '_site', 320, 150, D, site(d)); spaceTextures(scene);
    texAt(scene, d.key + '_cloud1', 70, 24, D, puffy(1, d.tone)); texAt(scene, d.key + '_cloud2', 100, 30, D, puffy(2, d.tone)); texAt(scene, d.key + '_cloud3', 46, 16, D, puffy(6, d.tone));
  },
  layers: [],
  swap: { ...SPACE, sky_day: d.key + '_sky', site_mahia: d.key + '_site', cloud1: d.key + '_cloud1', cloud2: d.key + '_cloud2', cloud3: d.key + '_cloud3' },
  grade: d.grade,
  live(hf) { ascentLive(hf, { sun: d.sun, glint: { x: d.sun[0], y0: -17, y1: d.glintBox?.[1] ?? 2, tint: d.glint, w: d.glintBox?.[0] }, flare: d.flare, sunTint: d.sunTint, plume: 1.5 }); },
  step: ascentStep,
});
// ---- 15 December 2023, 5:05 pm NZDT: "The Moon God Awakens", the return to flight in the third act of Paschen's Law
// (04:05 UTC in the list of Electron launches). A week before midsummer, more than three hours before sunset: the sun
// is still a third of the way up the sky, white with a little warmth in it. The cloudless sky is the game's choice.
const MOONGOD: Day = {
  key: 'hf_l1g', seed: 21, sun: [206, 62], disc: [6.8, '#fffdf0'],
  sky: [[0, '#07358c'], [0.35, '#1c66c8'], [0.6, '#5aa6e6'], [0.82, '#a8d4f2'], [1, '#e2eef2']],
  sunRGB: '255,246,220', glow: [150, 0.3, 54, 0.56], rays: 1.5, cirrus: [22, '255,255,255'],
  sea: [[0, '#b9dcec'], [0.05, '#52a6d4'], [0.2, '#1873be'], [0.6, '#0d52a0'], [1, '#083674']], swell: ['232,246,255', 'rgba(6,36,92,.22)'],
  glitter: (k) => `rgba(255,${252 - k * 24},${232 - k * 46},${0.85 - k * 0.5})`,
  haze: ['rgba(180,208,232,.30)', 'rgba(206,226,240,.64)'], mist: 'rgba(226,240,250,.26)', grassDark: 'rgba(16,80,42,.22)', grassLight: 'rgba(232,250,140,.24)',
  slope: [[0, 'rgba(255,246,170,.26)'], [0.42, 'rgba(20,50,44,.02)'], [1, 'rgba(6,40,48,.32)']], cliff: [[0, 'rgba(60,48,44,.26)'], [0.5, 'rgba(255,240,200,.07)'], [1, 'rgba(255,240,200,.36)']],
  shadow: [0.5, -0.18, 0.5, '#05201c'], thing: [[0, 'rgba(8,28,40,.3)'], [0.58, 'rgba(8,28,40,.03)'], [1, 'rgba(255,244,200,.32)']],
  tone: NOON,
  grade: { threshold: 0.89, bloom: 0.44, exposure: 1.0, contrast: 1.12, saturation: 1.17, shadows: [0.91, 0.99, 1.13], highs: [1.06, 1.02, 0.94], vignette: 0.37, grain: 0.018, fringe: 0.005 },
  flare: 0.9, sunTint: 0xfff4dc, glint: 0xfffbe6,
};

// ---- 24 April 2024, 10:32 am NZST: "Beginning Of The Swarm" (22:32 UTC on the 23rd, in the level's account). The only
// morning flight in the story: mid-autumn, the sun about thirty degrees up and still climbing, on the other side of the
// frame from the afternoon flights, so the light and the shadows fall the other way. Cool, clear light with a little
// mist left lying on the sea; the mist and the fair weather are the game's choice.
const SWARM: Day = {
  key: 'hf_l1w', seed: 27, sun: [100, 70], disc: [6.6, '#fffef4'],
  sky: [[0, '#0c3f98'], [0.35, '#2b74cc'], [0.6, '#7ab6e6'], [0.8, '#c2ddf0'], [1, '#eef0e8']],
  sunRGB: '255,248,228', glow: [140, 0.3, 48, 0.58], rays: 1.3, cirrus: [12, '255,255,255'],
  sea: [[0, '#d4e6ec'], [0.05, '#6aaed2'], [0.2, '#2376b8'], [0.6, '#12559c'], [1, '#0a3874']], swell: ['236,246,252', 'rgba(8,36,88,.2)'],
  glitter: (k) => `rgba(255,${253 - k * 22},${238 - k * 40},${0.9 - k * 0.5})`, bank: 'rgba(250,250,246,.7)',
  haze: ['rgba(196,214,230,.36)', 'rgba(226,234,238,.7)'], mist: 'rgba(240,244,244,.42)', grassDark: 'rgba(14,74,44,.24)', grassLight: 'rgba(222,246,150,.22)',
  slope: [[0, 'rgba(250,246,180,.22)'], [0.4, 'rgba(30,60,50,.03)'], [1, 'rgba(6,36,52,.34)']], cliff: [[0, 'rgba(255,240,200,.16)'], [0.4, 'rgba(40,50,80,.2)'], [1, 'rgba(20,30,70,.42)']],
  shadow: [-0.62, -0.2, 0.5, '#06201e'], thing: [[0, 'rgba(255,246,214,.3)'], [0.4, 'rgba(10,26,44,.04)'], [1, 'rgba(10,24,48,.36)']],
  tone: { shade: '#b4c6de', down: [[0, 'rgba(255,255,250,.95)'], [0.42, 'rgba(250,250,240,.2)'], [0.7, 'rgba(124,146,190,.26)'], [1, 'rgba(88,112,166,.6)']], across: [[0, 'rgba(255,244,214,.4)'], [0.4, 'rgba(255,244,214,0)'], [1, 'rgba(60,84,150,.24)']] },
  grade: { threshold: 0.89, bloom: 0.44, exposure: 1.0, contrast: 1.12, saturation: 1.12, shadows: [0.9, 0.98, 1.16], highs: [1.04, 1.02, 0.97], vignette: 0.38, grain: 0.018, fringe: 0.005 },
  flare: 0.9, sunTint: 0xfff6e0, glint: 0xfffbea, glintBox: [5, -2],
};

// ---- 14 November 2026, 6:30 pm NZDT: "The Mountain God Rises", Electron's hundredth launch. The level's source gives
// the hour (05:30 UTC in the list of Electron launches), and the level's own words are "the early evening light": late
// spring, an hour and a half before sunset, the sun some sixteen degrees up. Gold on everything that faces it, and
// shadows three times as long as what throws them. The fair weather is the game's choice.
const HUNDRED: Day = {
  key: 'hf_l1h', seed: 100, sun: [180, 90], disc: [7.2, '#fff4cc'],
  sky: [[0, '#0b2874'], [0.3, '#2553a8'], [0.47, '#5a86c4'], [0.57, '#9aa9c6'], [0.625, '#e8bd90'], [0.656, '#ffcc88'], [0.74, '#e6b488'], [1, '#a98a8c']],
  sunRGB: '255,204,130', glow: [130, 0.3, 44, 0.6], rays: 1.25, cirrus: [20, '255,220,180'],
  sea: [[0, '#ffe2b0'], [0.05, '#a2b0be'], [0.2, '#3f76ac'], [0.6, '#1d4f8c'], [1, '#103468']], swell: ['255,236,204', 'rgba(10,28,76,.22)'],
  glitter: (k) => `rgba(255,${244 - k * 40},${196 - k * 66},${0.95 - k * 0.5})`, bank: 'rgba(255,214,170,.5)',
  haze: ['rgba(255,214,170,.3)', 'rgba(255,226,190,.62)'], mist: 'rgba(255,226,180,.4)', grassDark: 'rgba(18,60,36,.25)', grassLight: 'rgba(255,232,120,.24)',
  slope: [[0, 'rgba(255,214,110,.28)'], [0.35, 'rgba(110,90,60,.07)'], [1, 'rgba(8,28,46,.4)']], cliff: [[0, 'rgba(44,34,56,.32)'], [0.5, 'rgba(255,196,120,.1)'], [1, 'rgba(255,208,140,.42)']],
  shadow: [1.0, -0.26, 0.5, '#081e24'], thing: [[0, 'rgba(14,22,50,.4)'], [0.6, 'rgba(14,22,50,.1)'], [1, 'rgba(255,206,130,.42)']],
  tone: { shade: '#b0a6c0', down: [[0, 'rgba(255,244,222,.85)'], [0.4, 'rgba(255,226,186,.25)'], [0.72, 'rgba(255,176,120,.4)'], [1, 'rgba(214,130,110,.62)']], across: [[0, 'rgba(60,64,130,.28)'], [0.6, 'rgba(255,214,160,0)'], [1, 'rgba(255,214,140,.5)']] },
  grade: { threshold: 0.87, bloom: 0.48, exposure: 1.0, contrast: 1.12, saturation: 1.15, shadows: [0.9, 0.97, 1.15], highs: [1.08, 1.01, 0.91], vignette: 0.4, grain: 0.019, fringe: 0.005 },
  flare: 0.95, sunTint: 0xffe2b0, glint: 0xffecc0, glintBox: [14, -2],
};

// ---- Launch Complex 1 after sunset: the same drawing in the dark, under the pad's floodlights (evening.ts). Where the
// lamps stand is the game's choice; the hangar, the sheep and the fence are the plain drawing's own.
const PAD: Pad = {
  site: 'site_mahia', hz: HZ, draw: (c, part) => drawSite(c, false, part), far: 4, land: 2, things: 8,
  ground(t: C2) {
    const q = rng(19); for (let i = 0; i < 1500; i++) { const x = q() * 218, y = 98 + q() * 52, k = q(), far = (y - 98) / 52; line(t, x, y, x + (q() - 0.5) * (0.8 + far), y - 0.4 - q() * (0.6 + far), k < 0.5 ? 'rgba(20,52,34,.26)' : 'rgba(232,246,150,.2)', 0.2 + far * 0.2); } // pasture, coarser toward us
    for (let i = 0; i < 26; i++) { const y = 108 + q() * 40; line(t, 222 + (y - 108) * 0.1 + q() * 3, y, 256 - q() * 4, y + (q() - 0.5) * 2.4, 'rgba(96,72,44,.22)', 0.3 + q() * 0.4); } // the beds of the papa cliffs
  },
  crest(c: C2) { c.beginPath(); c.moveTo(0, 104); c.quadraticCurveTo(60, 96, 110, 100); c.lineTo(214, 100); c.quadraticCurveTo(250, 100, 262, 108); },
  // floodlights on the vehicle and its apron, the hangar's own lamps, and a little left over for the sheep
  pools: [[156, 62, 56, 66, 1], [160, 102, 66, 9, 1], [78, 94, 25, 10, 0.9], [34, 108, 26, 7, 0.34]],
  floods: [[120, 36], [196, 36]], reds: [[120, 12.4], [196, 12.4]], warm: [[71, 91.4], [93, 88.6]],
  apron: [132, 192, 99.1],
};

// ---- 19 September 2023, 6:55 pm NZST: "We Will Never Desert You", the first act of Paschen's Law (06:55 UTC in the
// level's account; New Zealand was still on standard time). Four days before the equinox the sun sets at Māhia a few
// minutes after six, so the count ran out some fifty minutes into dusk: stars overhead, a band of orange where the sun
// went. The new moon had been on 15 September, so a four-day-old crescent stood above the afterglow, leaning the way it
// does in the southern sky. Where it and the afterglow sit in the frame, and the clear weather, are the game's choice.
const DESERT: Eve = {
  key: 'hf_l1d', seed: 31, west: 110,
  sky: [[0, '#040818'], [0.26, '#0a1440'], [0.46, '#1c2a6c'], [0.56, '#40407f'], [0.61, '#8e5484'], [0.64, '#dc7a5e'], [0.658, '#f8aa68'], [0.7, '#93608a'], [0.79, '#2a2c6a'], [1, '#0a0e30']],
  glow: [[140, '255,130,90', 0.36], [54, '255,176,120', 0.46], [16, '255,220,170', 0.5]], cold: 'rgba(12,18,66,.66)', stars: 130, moon: [129, 60, 0.7, -1.3],
  bars: 16, bar: 'rgba(34,28,74,.62)', ember: '255,150,100',
  sea: [[0, '#ea9c70'], [0.04, '#7c5884'], [0.16, '#2c3274'], [0.5, '#131a4c'], [1, '#080c28']], swell: '180,170,230',
  path: (k) => `rgba(255,${186 - k * 60},${128 - k * 40},${0.85 - k * 0.55})`, pathW: 5, mist: 'rgba(255,160,120,.36)',
  far: '#2a2458', dark: 'rgba(10,14,46,.86)', darkThing: 'rgba(10,12,44,.82)', rim: 'rgba(255,160,130,.45)', spill: 1.1,
  tone: { shade: '#3a3866', down: [[0, 'rgba(58,54,110,.94)'], [0.55, 'rgba(48,42,92,.92)'], [0.85, 'rgba(150,80,106,.9)'], [1, 'rgba(232,132,100,.9)']], across: [[0, 'rgba(255,140,100,.3)'], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(16,18,66,.4)']] },
  grade: { threshold: 0.72, bloom: 0.6, exposure: 1.04, contrast: 1.1, saturation: 1.14, shadows: [0.88, 0.94, 1.2], highs: [1.08, 1.0, 0.92], vignette: 0.46, grain: 0.024, fringe: 0.005 },
  glint: 0xffa878, glintW: 10, lift: 0.32, twilight: true, limb: 0x9a86c8, air: 0xb8a0e0,
};

export const lc1Looks: Record<string, Look> = {
  'lc1-test': look(TEST), 'lc1-still': look(STILL), 'lc1-business': look(BUSINESS),
  'lc1-desert': evening(PAD, DESERT), 'lc1-moongod': look(MOONGOD),
  'lc1-swarm': look(SWARM),
  'lc1-hundred': look(HUNDRED),
};
