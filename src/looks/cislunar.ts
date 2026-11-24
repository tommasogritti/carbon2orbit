import Phaser from 'phaser';
import { D, S, C2, el, line, lg, rg, rng, planet } from '../art';
import { texAt, soft, add, halo } from '../hifi';
import type { Look } from '../hifi';
import { fxSet } from '../hifiFx';

// ------------------------------------------------------------------ CAPSTONE to the Moon: between the Earth and the Moon, 28 June to 4 July 2022
// This is space, and a diagram of it (the Earth, the Moon and the orbits are not to scale), so there is no hour and no
// weather: only where the Sun is. The Moon was new on 29 June 2022 (the calendar's fact, not one of the level's sources),
// the day after launch, so all that week the Sun stood on the Moon's side of the Earth, the Moon a thin evening crescent
// from the ground. The look takes its light from that: the Sun is out of frame beyond the Moon, up and to the right,
// and both worlds are lit from there, with their night sides toward the lower left. How far round it stands on this
// flat diagram is the game's choice. No air, so the stars do not twinkle; what moves is Photon, its engine and the
// Earth's weather turning under it. The Earth and the Moon are the plain drawings (`planet`), given that sun.
const SUN = [0.82, -0.57], EX = 70, EY = 122, ER = 14 * 0.85, MX = 262, MY = 46;

/** Deep space, for any look that is out in it (the Mars cruise uses it too): the stars, and the Milky Way through the point (mx, my) at the angle `rot`. */
export const deepSky = (seed: number, mx: number, my: number, rot: number) => (c: C2) => {
  const r = rng(seed);
  c.fillStyle = '#020308'; c.fillRect(0, 0, 320, 180);
  c.fillStyle = rg(c, 220, 60, 4, 140, [0, 'rgba(110,90,200,.13)'], [1, 'rgba(110,90,200,0)']); c.fillRect(0, 0, 320, 180); // the plain sky's violet cloud, kept
  c.save(); c.translate(mx, my); c.rotate(rot); // the Milky Way: glow, dust lanes, its crowd of faint stars
  soft(c, 9); for (let i = 0; i < 46; i++) { const x = -230 + i * 10 + r() * 10, k = 1 - Math.abs(i - 23) / 34; el(c, x, (r() - 0.5) * 16, 16 + r() * 18, (5 + r() * 9) * k, `rgba(${110 + r() * 70},${120 + r() * 50},${220 + r() * 30},${0.016 + r() * 0.026})`); }
  for (let i = 0; i < 12; i++) el(c, -160 + r() * 320, (r() - 0.5) * 12, 10 + r() * 16, 3 + r() * 4, `rgba(255,${170 + r() * 50},${150 + r() * 40},${0.025 + r() * 0.03})`);
  soft(c, 4); for (let i = 0; i < 18; i++) el(c, -190 + r() * 380, (r() - 0.5) * 9, 10 + r() * 22, 1 + r() * 2.2, 'rgba(2,3,10,.36)'); soft(c, 0);
  for (let i = 0; i < 1000; i++) { const x = -240 + r() * 480, y = (r() + r() + r() - 1.5) * 20; c.globalAlpha = 0.15 + r() * 0.5; el(c, x, y, 0.1 + r() * 0.14, 0.1 + r() * 0.14, r() < 0.2 ? '#ffd9a8' : '#dfe8ff'); }
  c.globalAlpha = 1; c.restore();
  for (let i = 0; i < 520; i++) { const x = r() * 320, y = r() * 180, s = r(), q = r(); c.globalAlpha = 0.3 + q * 0.7; el(c, x, y, s > 0.975 ? 0.55 : 0.12 + s * 0.2, s > 0.975 ? 0.55 : 0.12 + s * 0.2, s > 0.9 ? '#ffd9a8' : s > 0.8 ? '#a8ccff' : '#ffffff'); if (s > 0.975) { c.globalAlpha = 0.5; line(c, x - 2.2, y, x + 2.2, y, '#ffffff', 0.12); line(c, x, y - 2.2, x, y + 2.2, '#ffffff', 0.12); } }
  c.globalAlpha = 1;
};
/** The night side of a world lit from `sun`, laid over the plain drawing of it: `k` is how dark the dark gets. */
export function night(c: C2, cx: number, cy: number, r: number, k: number, tint: string, sun = SUN) {
  const [sx, sy] = sun;
  c.fillStyle = lg(c, cx - sx * r * 0.8, cy - sy * r * 0.8, cx - sx * r * 0.05, cy - sy * r * 0.05, [0, `rgba(${tint},${k})`], [0.5, `rgba(${tint},${k * 0.75})`], [1, `rgba(${tint},0)`]); c.fillRect(cx - r - 1, cy - r - 1, r * 2 + 2, r * 2 + 2);
}
/** The plain Earth (`planet`), lit from `sun`, with its air. */
export const earthLit = (sun = SUN) => (c: C2) => {
  const cx = 20, cy = 20, r = 14, [sx, sy] = sun;
  halo(c, cx + sx * 2, cy + sy * 2, 21, '90,170,255', 0.5); // the air, seen edge-on all the way round, brighter toward the Sun
  planet(c, cx, cy, r, 'earth', [sx * 0.4, sy * 0.4]);
  c.save(); el(c, cx, cy, r, r); c.clip();
  c.fillStyle = rg(c, cx, cy, r * 0.72, r, [0, 'rgba(150,210,255,0)'], [1, 'rgba(150,210,255,.42)']); c.fillRect(cx - r, cy - r, r * 2, r * 2); // the air thickening toward the limb
  halo(c, cx + sx * r * 0.42, cy + sy * r * 0.42, r * 0.5, '255,250,236', 0.34); // the Sun's glint off the ocean
  c.restore();
};
export function clouds(c: C2) { // weather for the Earth to turn under: bands and a few spirals, drawn to wrap from one side to the other
  const r = rng(19); soft(c, 0.5);
  for (let i = 0; i < 46; i++) { const x = r() * 60, y = 2 + r() * 24, w = 2 + r() * 6, h = 0.3 + r() * 0.8, a = 0.3 + r() * 0.45; for (const dx of [-60, 0, 60]) el(c, x + dx, y, w, h, `rgba(255,255,255,${a})`); }
  for (let i = 0; i < 5; i++) { const x = r() * 60, y = 5 + r() * 18; for (const dx of [-60, 0, 60]) { c.beginPath(); c.arc(x + dx, y, 1.6 + r() * 1.4, r() * 6, r() * 6 + 4); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 0.6; c.stroke(); } }
  soft(c, 0);
}
export const earthShade = (sun = SUN) => (c: C2) => { // what goes over the turning cloud: the night, the towns in it, and the bright line of air on the sunward limb
  const cx = 20, cy = 20, r = 14, [sx, sy] = sun, q = rng(40);
  c.save(); el(c, cx, cy, r + 0.1, r + 0.1); c.clip();
  night(c, cx, cy, r, 0.9, '2,4,14', sun);
  for (let i = 0; i < 60; i++) { const a = q() * 6.283, d = Math.sqrt(q()) * r * 0.94, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if ((x - cx) * sx + (y - cy) * sy < -r * 0.5) halo(c, x, y, 0.5 + q() * 0.7, '255,206,140', 0.5 + q() * 0.4); }
  c.restore();
  const a0 = Math.atan2(sy, sx); c.beginPath(); c.arc(cx, cy, r + 0.15, a0 - 1.5, a0 + 1.5); c.strokeStyle = lg(c, cx - sx * r, cy - sy * r, cx + sx * r, cy + sy * r, [0, 'rgba(190,230,255,0)'], [0.5, 'rgba(190,230,255,.25)'], [1, 'rgba(226,244,255,.95)']); c.lineWidth = 0.5; c.stroke();
};
function moon(c: C2) {
  const cx = 15, cy = 15, r = 10, [sx, sy] = SUN, q = rng(8);
  halo(c, cx + sx * 1.5, cy + sy * 1.5, 14.5, '226,230,255', 0.3);
  planet(c, cx, cy, r, 'moon', [sx * 0.4, sy * 0.4]);
  c.save(); el(c, cx, cy, r, r); c.clip();
  for (let i = 0; i < 26; i++) { const a = q() * 6.283, d = Math.sqrt(q()) * r * 0.92, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, k = 0.25 + q() * 0.6; el(c, x - sx * k * 0.3, y - sy * k * 0.3, k, k, 'rgba(60,64,84,.5)'); c.beginPath(); c.arc(x, y, k, Math.atan2(-sy, -sx) - 1.2, Math.atan2(-sy, -sx) + 1.2); c.strokeStyle = 'rgba(250,250,244,.55)'; c.lineWidth = 0.18; c.stroke(); } // small craters: shadow under the sunward rim, light on the far one
  c.fillStyle = rg(c, cx, cy, r * 0.6, r, [0, 'rgba(40,44,64,0)'], [1, 'rgba(40,44,64,.3)']); c.fillRect(cx - r, cy - r, r * 2, r * 2);
  night(c, cx, cy, r, 0.82, '3,4,12');
  c.restore();
}
function glare(c: C2) { // the Sun is out of frame, up and to the right: what reaches the lens is its glare and a streak
  add(c, () => { c.fillStyle = rg(c, 216, -16, 0, 152, [0, 'rgba(255,236,204,.34)'], [0.3, 'rgba(255,214,170,.12)'], [1, 'rgba(255,200,150,0)']); c.fillRect(0, 0, 200, 140); const r = rng(4); for (let i = 0; i < 9; i++) { const a = Math.PI * (0.56 + i * 0.045 + r() * 0.02), len = 70 + r() * 80, w = 0.008 + r() * 0.012; c.fillStyle = rg(c, 216, -16, 10, len, [0, 'rgba(255,236,204,.07)'], [1, 'rgba(255,236,204,0)']); c.beginPath(); c.moveTo(216, -16); c.arc(216, -16, len, a - w, a + w); c.closePath(); c.fill(); } });
}
export function plume(c: C2) { soft(c, 0.8); c.fillStyle = lg(c, 0, 0, 0, 22, [0, 'rgba(255,255,255,.95)'], [0.25, 'rgba(184,220,255,.7)'], [1, 'rgba(110,168,255,0)']); c.beginPath(); c.moveTo(3, 0); c.lineTo(5, 0); c.lineTo(7.4, 22); c.lineTo(0.6, 22); c.closePath(); c.fill(); soft(c, 0); } // HyperCurie in vacuum: a pale cone that spreads at once
export function glint(c: C2) { add(c, () => { for (const [dx, dy] of [[1, 0], [0, 1]]) { c.fillStyle = lg(c, 8 - dx * 8, 8 - dy * 8, 8 + dx * 8, 8 + dy * 8, [0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,.95)'], [1, 'rgba(255,255,255,0)']); c.fillRect(dx ? 0 : 7.7, dy ? 0 : 7.7, dx ? 16 : 0.6, dy ? 16 : 0.6); } }); halo(c, 8, 8, 2.4, '255,255,255', 1); }

type Im = Phaser.GameObjects.Image; type Em = Phaser.GameObjects.Particles.ParticleEmitter;
let o: { weather: Phaser.GameObjects.TileSprite; plume: Im; jet?: Im; flash: Im; trail: Em; lamp?: Phaser.GameObjects.Light; glint: Im; satGlint: Im; fired: number; hot: number } | undefined;

export const cislunarLook: Look = {
  build(scene) {
    texAt(scene, 'hf_cl_sky', 320, 180, D, deepSky(23, 124, 92, 0.52)); texAt(scene, 'hf_cl_earth', 40, 40, D, earthLit()); texAt(scene, 'hf_cl_moon', 30, 30, D, moon); texAt(scene, 'hf_cl_clouds', 60, 28, 8, clouds); texAt(scene, 'hf_cl_shade', 40, 40, 8, earthShade());
    texAt(scene, 'hf_cl_glare', 200, 140, 1, glare); texAt(scene, 'hf_cl_plume', 8, 22, D, plume); texAt(scene, 'hf_cl_glint', 16, 16, D, glint);
  },
  layers: [],
  swap: { stars: 'hf_cl_sky', earth: 'hf_cl_earth', moon: 'hf_cl_moon' },
  ambient: 0x565e80,
  lights: [
    { x: 470, y: -150, r: 700, color: 0xfff2dc, i: 1.5 },  // the Sun, far off beyond the Moon
    { x: EX, y: EY, r: 74, color: 0x5fa0ff, i: 1.2 },      // the Earth's own light on anything passing close
  ],
  grade: { threshold: 0.7, bloom: 0.7, exposure: 1.05, contrast: 1.1, saturation: 1.14, shadows: [0.86, 0.94, 1.2], highs: [1.06, 1.0, 0.92], vignette: 0.5, grain: 0.028, fringe: 0.006, streak: 0.1 },
  live(hf) {
    const s = hf.scene;
    const puff = (x: number, y: number, kx: number, ky: number, tint: number, a: number) => s.add.image(x, y, 'puff').setScale(S * kx, S * ky).setTint(tint).setBlendMode('ADD').setAlpha(a);
    hf.above(s.add.image(320, 0, 'hf_cl_glare').setOrigin(1, 0).setBlendMode('ADD'), 'stars');
    for (const [k, size, tint, a] of [[0.36, 1.2, 0x9fd0ff, 0.07], [0.62, 0.5, 0xffe2b0, 0.12], [1.1, 2.6, 0xffc8a0, 0.035]]) hf.above(puff(320 - 190 * k, -10 + 120 * k, size, size, tint, a), 'stars'); // the lens, strung from the Sun through the middle of the frame
    // the Earth turns: weather sliding across the disc, under the night and the lit limb
    const disc = s.make.graphics({}, false).fillStyle(0xffffff).fillCircle(EX, EY, ER);
    const weather = hf.above(s.add.tileSprite(EX, EY, ER * 2, ER * 2, 'hf_cl_clouds').setTileScale(1 / 8).setAlpha(0.8).setMask(disc.createGeometryMask()), 'earth');
    hf.tag({ weather }); hf.above(s.add.image(EX, EY, 'hf_cl_shade').setScale(0.85 / 8), 'weather');
    // Photon: the way it has come, its engine when it fires, and the Sun on its panels now and then
    const trail = hf.below(s.add.particles(0, 0, 'puff', { lifespan: 1500, scale: { start: S * 0.16, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: 0x9fc8ff, blendMode: 'ADD', frequency: 22 }), 'craft');
    const pl = hf.below(s.add.image(0, 0, 'hf_cl_plume').setOrigin(0.5, 0).setScale(S * 1.5, S * 1.3).setBlendMode('ADD').setAlpha(0), 'craft'), flash = hf.below(puff(0, 0, 3, 3, 0xb8dcff, 0), 'craft');
    const jet = hf.fx('plume', 0, 0, 20, 26)?.setOrigin(0.5, 0).setVisible(false); if (jet) { hf.below(jet, 'craft'); (hf.tags.burn as Em | undefined)?.setVisible(false); } // on WebGL the shader's flame: in a vacuum, a pale bell that opens at once
    const gl = s.add.image(0, 0, 'hf_cl_glint').setScale(S * 0.9).setBlendMode('ADD').setAlpha(0), satGlint = s.add.image(0, 0, 'hf_cl_glint').setScale(S * 0.7).setBlendMode('ADD').setAlpha(0);
    const lamp = hf.gl ? s.lights.addLight(0, 0, 60, 0xb8dcff, 0) : undefined;
    o = { weather, plume: pl, jet, flash, trail, lamp, glint: gl, satGlint, fired: hf.state.fired || 0, hot: 0 };
  },
  step(hf, dt) {
    if (!o) return;
    const st = hf.state, t = hf.t, h = st.rot - Math.PI / 2, bx = st.x - Math.cos(h) * 3.2, by = st.y - Math.sin(h) * 3.2, fl = 0.85 + 0.15 * Math.sin(t * 67) * Math.sin(t * 41);
    o.weather.tilePositionX -= dt * 5;
    if (st.fired > o.fired) { o.hot = 1; hf.flash(0.18); } o.fired = st.fired; o.hot = Math.max(0, o.hot - dt * 1.7); // a burn: the engine lights, and everything near it for a moment
    const k = o.hot * o.hot; hf.streak(0.1 + 0.3 * o.hot); // the lens streaks through the flame while it lasts; the Earth is too broad a light for it
    if (o.jet) { o.jet.setPosition(bx, by).setRotation(st.rot).setVisible(o.hot > 0.02).setAlpha(Math.min(1, o.hot * 2)); fxSet(o.jet, o.hot, 1, 9, 3); }
    o.plume.setPosition(bx, by).setRotation(st.rot).setAlpha(o.jet ? 0 : Math.min(1, o.hot * 1.6) * fl).setScale(S * (0.9 + 0.4 * o.hot), S * (0.4 + 0.5 * o.hot));
    o.flash.setPosition(bx, by).setAlpha(k * (o.jet ? 0.22 : 0.55)).setScale(S * (1.2 + 1.6 * k));
    o.lamp?.setPosition(bx, by).setIntensity(3 * o.hot * fl);
    o.trail.setPosition(st.x, st.y); o.trail.emitting = !st.done;
    o.glint.setPosition(st.x + 1.5, st.y - 1.5).setAlpha(Math.max(0, Math.sin(t * 0.9 + st.x * 0.02)) ** 8 * 0.9).setRotation(t * 0.3); // a panel catching the Sun as the stage turns
    const sat = hf.tags.sat as Phaser.GameObjects.Rectangle | undefined; // CAPSTONE, on its own at last
    if (sat?.active) o.satGlint.setPosition(sat.x, sat.y).setAlpha(0.6 + 0.4 * Math.sin(t * 5)).setRotation(t * 0.5);
  },
};
