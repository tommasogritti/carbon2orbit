import { C2, line, rng, drawWallops } from '../art';
import type { Look } from '../hifi';
import { evening, Eve, Pad } from './evening';

// ------------------------------------------------------------------ Launch Complex 2, Wallops Island: after dark
// Both Electrons in the story that leave Virginia leave it after sunset, so the site is one drawing (`drawWallops`, the
// plain one's code) under floodlights, and each flight brings its own evening: an `Eve` below, from the hour it flew.
// The island, Pad 0A and its water tower, the LC-2 sign, the tanks, the flag and the plovers are the plain drawing's
// own; the lamps that light them are the look's. Which way the camera looks is the game's choice (the plain dusk sky
// already has the afterglow in frame); so are the floodlights' places and the clear weather, which no source gives.
const LC2: Pad = {
  site: 'site_wallops', hz: 80, draw: drawWallops, far: 0, land: 2, things: 8,
  ground(t: C2) {
    const q = rng(19); for (let i = 0; i < 900; i++) { const x = q() * 320, y = 98 + q() * 24, k = q(); line(t, x, y, x + 1 + q() * 3.4, y + (q() - 0.5) * 0.5, k < 0.5 ? 'rgba(92,80,48,.22)' : 'rgba(255,246,214,.2)', 0.22); } // wind ripples in the sand
    for (let i = 0; i < 260; i++) { const x = q() * 320, y = 100 + q() * 16; line(t, x, y, x + (q() - 0.5) * 1.3, y - 0.8 - q() * 1.5, 'rgba(70,104,58,.5)', 0.2); } // beach grass
  },
  crest(c: C2) { c.beginPath(); c.moveTo(0, 100); c.quadraticCurveTo(40, 97, 90, 99); c.lineTo(246, 99); c.quadraticCurveTo(290, 100, 320, 104); },
  // floodlights on the vehicle and its apron, a lamp over the LC-2 sign, the flag's own light, the working lights at Pad 0A and up its water tower, and a little on the plovers
  pools: [[156, 70, 50, 54, 1], [158, 100, 62, 9, 1], [106, 95, 13, 9, 0.95], [284, 89, 9, 12, 0.95], [46, 92, 24, 9, 0.8], [62, 96, 16, 70, 0.45], [62, 10, 12, 10, 0.4], [226, 109, 12, 5, 0.5], [300, 110, 6, 4, 0.4]],
  floods: [[124, 52], [194, 52]], reds: [[62, 4.6], [34, 30.4], [46, 30.4], [74, 30.4], [84, 30.4], [124, 40.4], [194, 40.4]], warm: [[45, 85.4], [31, 94], [106.5, 88.6], [284, 100]],
  apron: [118, 202, 97.7],
};

// ---- 24 January 2023, 6:00 pm EST: "Virginia Is For Launch Lovers". The level's own account: lift-off "about 45 minutes
// after sunset". At 38° north in January that puts the sun eight or nine degrees down: the first stars are out overhead,
// and one band of orange is left along the horizon where it set. The new moon had been on 21 January (the day before the
// Lunar New Year), so a three-day-old crescent hung over the afterglow; where it sits in the frame is the game's choice.
// A rocket leaving then climbs back into sunlight some sixty kilometres up, where its exhaust lights up against the dark
// sky; NASA had told the East Coast it might see the launch. How that glow is drawn here is the game's own.
const DUSK: Eve = {
  key: 'hf_w2d', seed: 23, west: 214,
  sky: [[0, '#050920'], [0.26, '#0e1848'], [0.44, '#232c74'], [0.54, '#51408a'], [0.6, '#a65580'], [0.63, '#e97c56'], [0.648, '#ffb46a'], [0.69, '#9a6488'], [0.78, '#2e3070'], [1, '#0b1034']],
  glow: [[150, '255,140,90', 0.4], [60, '255,186,120', 0.5], [18, '255,226,170', 0.6]], cold: 'rgba(16,20,74,.62)', stars: 90, moon: [198, 54, -0.5, -1.4],
  bars: 22, bar: 'rgba(40,30,76,.62)', ember: '255,150,100',
  sea: [[0, '#f0a070'], [0.04, '#8a5c84'], [0.16, '#34377a'], [0.5, '#161d52'], [1, '#090d2c']], swell: '190,170,230',
  path: (k) => `rgba(255,${190 - k * 60},${130 - k * 40},${0.85 - k * 0.55})`, mist: 'rgba(255,170,120,.4)',
  far: '#2a2458', dark: 'rgba(14,14,52,.84)', darkThing: 'rgba(12,12,48,.8)', rim: 'rgba(255,170,130,.5)', spill: 1.15,
  tone: { shade: '#3a3866', down: [[0, 'rgba(58,54,110,.94)'], [0.55, 'rgba(48,42,92,.92)'], [0.85, 'rgba(150,80,106,.9)'], [1, 'rgba(232,132,100,.9)']], across: [[0, 'rgba(16,18,66,.4)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(255,140,100,.3)']] },
  grade: { threshold: 0.72, bloom: 0.6, exposure: 1.04, contrast: 1.1, saturation: 1.14, shadows: [0.88, 0.94, 1.2], highs: [1.08, 1.0, 0.92], vignette: 0.46, grain: 0.024, fringe: 0.005 },
  glint: 0xffb080, glintW: 20, lift: 0.3, twilight: true, limb: 0x9a86c8, air: 0xb8a0e0,
};

export const wallopsLooks: Record<string, Look> = { 'wallops-dusk': evening(LC2, DUSK) };
