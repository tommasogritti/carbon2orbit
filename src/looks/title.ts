import Phaser from 'phaser';
import { D, S, C2, el, line, lg, rg, rng } from '../art';
import { texAt, soft, add, halo } from '../hifi';
import type { Look } from '../hifi';
import { spaceTextures, SPACE } from './flight';
import { fxSet } from '../hifiFx';

// ------------------------------------------------------------------ The title screen: an Electron climbing into an orbital sunrise
// The title is no one day of the story, so its light is the game's choice: the moment a rocket climbing out of the
// Earth's shadow meets the sun coming over the limb. The Milky Way stands behind the name, the air glows along the edge
// of the Earth with an aurora low on the night side, and the rocket is lit for real: its own plume from below, earthshine
// from underneath, the sun from the right. Every word on the screen is on the HUD camera, exactly as it was.
const SUN = [126, 41]; // where the sun stands on the limb, measured from the middle of the Earth drawing and from its top
const DIR = [-Math.sin((24 * Math.PI) / 180), Math.cos((24 * Math.PI) / 180)]; // the way the exhaust leaves a rocket leaning 24°

function sky(c: C2) {
  const r = rng(17);
  c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#020309'], [0.5, '#060a1e'], [0.8, '#0e1a44'], [1, '#1c3470']); c.fillRect(0, 0, 320, 180);
  // the Milky Way, from the lower left to the upper right: glow, then dust lanes, then its crowd of faint stars
  c.save(); c.translate(160, 78); c.rotate(-0.42);
  soft(c, 9); for (let i = 0; i < 44; i++) { const x = -210 + i * 9.6 + r() * 10, k = 1 - Math.abs(i - 22) / 30; el(c, x, (r() - 0.5) * 16, 16 + r() * 18, (5 + r() * 9) * k, `rgba(${110 + r() * 70},${120 + r() * 50},${220 + r() * 30},${0.035 + r() * 0.05})`); }
  for (let i = 0; i < 12; i++) el(c, -140 + r() * 280, (r() - 0.5) * 12, 10 + r() * 16, 3 + r() * 4, `rgba(255,${170 + r() * 50},${150 + r() * 40},${0.03 + r() * 0.03})`);
  soft(c, 4); for (let i = 0; i < 16; i++) el(c, -170 + r() * 340, (r() - 0.5) * 9, 10 + r() * 22, 1 + r() * 2.2, 'rgba(2,3,10,.34)'); soft(c, 0);
  for (let i = 0; i < 900; i++) { const x = -220 + r() * 440, y = (r() + r() + r() - 1.5) * 20; c.globalAlpha = 0.15 + r() * 0.5; el(c, x, y, 0.1 + r() * 0.14, 0.1 + r() * 0.14, r() < 0.2 ? '#ffd9a8' : '#dfe8ff'); }
  c.globalAlpha = 1; c.restore();
  soft(c, 12); el(c, 262, 44, 52, 26, 'rgba(120,70,200,.10)'); el(c, 52, 120, 60, 24, 'rgba(40,120,200,.10)'); soft(c, 0); // two faint nebulae
  c.fillStyle = lg(c, 0, 110, 0, 180, [0, 'rgba(60,110,220,0)'], [1, 'rgba(60,110,220,.22)']); c.fillRect(0, 110, 320, 70); // the planet's own light, coming up from below
}
function sun(c: C2) { // the sun on the edge of the Earth: a hard point, its glare, and the streak a lens draws through it
  const x = 80, y = 80, r = rng(3);
  halo(c, x, y, 78, '255,214,160', 0.3); halo(c, x, y, 30, '255,236,200', 0.7);
  add(c, () => { for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283 + r() * 0.3, len = 26 + r() * 44, w = 0.02 + r() * 0.03; c.fillStyle = rg(c, x, y, 2, len, [0, 'rgba(255,240,210,.3)'], [1, 'rgba(255,240,210,0)']); c.beginPath(); c.moveTo(x, y); c.arc(x, y, len, a - w, a + w); c.closePath(); c.fill(); } });
  add(c, () => { c.fillStyle = lg(c, 0, 0, 160, 0, [0, 'rgba(190,220,255,0)'], [0.5, 'rgba(230,240,255,.85)'], [1, 'rgba(190,220,255,0)']); c.fillRect(0, y - 0.45, 160, 0.9); });
  el(c, x, y, 3.2, 3.2, '#ffffff'); halo(c, x, y, 9, '255,255,255', 1);
}
function crescent(c: C2) { // the air along the limb, burning where the sun comes through it (the same circle as the Earth drawing)
  const cx = 200, cy = 830, R = 800, sx = 200 + SUN[0];
  for (const [w, a, col] of [[5, 0.16, '255,150,90'], [2.2, 0.4, '255,214,160'], [0.8, 0.95, '255,250,236']] as [number, number, string][]) {
    c.beginPath(); c.arc(cx, cy, R + w * 0.3, Math.PI * 1.3, Math.PI * 1.7);
    c.strokeStyle = lg(c, sx - 150, 0, sx + 70, 0, [0, `rgba(${col},0)`], [0.68, `rgba(${col},${a})`], [1, `rgba(${col},0)`]); c.lineWidth = w; soft(c, w * 0.5); c.stroke();
  }
  soft(c, 0);
}
function night(c: C2) { // the side of the Earth the sun has not reached yet (the same circle as the Earth drawing)
  const cx = 200, cy = 830, R = 800.6, sx = 200 + SUN[0];
  c.save(); el(c, cx, cy, R, R); c.clip();
  c.fillStyle = lg(c, sx - 300, 0, sx + 40, 0, [0, 'rgba(2,5,18,.9)'], [0.55, 'rgba(3,8,26,.78)'], [0.86, 'rgba(8,16,44,.4)'], [1, 'rgba(20,30,70,.05)']); c.fillRect(0, 0, 400, 130);
  c.fillStyle = lg(c, 0, 30, 0, 130, [0, 'rgba(2,5,18,0)'], [1, 'rgba(2,5,18,.5)']); c.fillRect(0, 0, 400, 130);
  const r = rng(40); for (let i = 0; i < 70; i++) { const x = 20 + r() * 250, y = 52 + r() * 70; halo(c, x, y, 0.8 + r() * 1.4, '255,206,140', 0.5 + r() * 0.4); } // towns, on the land still in the dark
  c.restore();
}
function aurora(c: C2) { // the southern lights, low over the night side: curtains of green with a red fringe
  const r = rng(6);
  soft(c, 1.6);
  for (let i = 0; i < 46; i++) { const x = 6 + i * 2.4 + r() * 2, h = 8 + r() * 14 * Math.sin((i / 46) * Math.PI), y = 30 - Math.sin(i * 0.22) * 3 - (i / 46) * 5; c.fillStyle = lg(c, 0, y - h, 0, y, [0, 'rgba(255,90,140,0)'], [0.25, 'rgba(255,90,140,.16)'], [0.6, 'rgba(90,255,170,.42)'], [1, 'rgba(90,255,170,0)']); c.fillRect(x, y - h, 1.8 + r() * 1.6, h); }
  soft(c, 0);
}
function glint(c: C2) { add(c, () => { for (const [dx, dy] of [[1, 0], [0, 1]]) { c.fillStyle = lg(c, 8 - dx * 8, 8 - dy * 8, 8 + dx * 8, 8 + dy * 8, [0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,.95)'], [1, 'rgba(255,255,255,0)']); c.fillRect(dx ? 0 : 7.7, dy ? 0 : 7.7, dx ? 16 : 0.6, dy ? 16 : 0.6); } }); line(c, 8, 8, 8, 8, '#fff', 0.1); }

type Im = Phaser.GameObjects.Image;
let o: { sun: Im; rays: Im; dark: Im; arc: Im; aur: Im; plume: Im; core: Im; wash: Im; jet?: Im; glint: Im; ghosts: Im[]; embers: Phaser.GameObjects.Particles.ParticleEmitter } | undefined;
export const titleLook: Look = {
  build(scene) {
    texAt(scene, 'hf_tt_sky', 320, 180, D, sky); texAt(scene, 'hf_tt_sun', 160, 160, D, sun); texAt(scene, 'hf_tt_arc', 400, 60, D, crescent); texAt(scene, 'hf_tt_aurora', 124, 36, 2, aurora); texAt(scene, 'hf_tt_glint', 16, 16, D, glint); texAt(scene, 'hf_tt_night', 400, 130, 2, night);
    spaceTextures(scene);
  },
  layers: [],
  swap: { ...SPACE, sky_night: 'hf_tt_sky' },
  ambient: 0x56608c,
  lights: [
    { x: 150, y: 210, r: 230, color: 0x4f8fff, i: 1.3 },   // earthshine, from underneath
    { x: 300, y: 150, r: 320, color: 0xffe2b0, i: 1.0 },   // the sun, low on the right
  ],
  heroLight: { r: 78, color: 0xffa24a, i: 2.4, dx: DIR[0] * 10, dy: DIR[1] * 10 }, // the plume, lighting the rocket that makes it
  grade: { threshold: 0.8, bloom: 0.55, exposure: 1.04, contrast: 1.1, saturation: 1.12, shadows: [0.86, 0.95, 1.2], highs: [1.08, 1.0, 0.9], vignette: 0.5, grain: 0.028, fringe: 0.006, streak: 0.4 },
  live(hf) {
    const s = hf.scene, r = rng(8), tw = (targets: object, cfg: object) => s.tweens.add({ targets, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', ...cfg });
    const puff = (x: number, y: number, kx: number, ky: number, tint: number, a: number) => s.add.image(x, y, 'puff').setScale(S * kx, S * ky).setTint(tint).setBlendMode('ADD').setAlpha(a);
    // behind the Earth: the sun, so the limb cuts it in half; in front of it: the lit air, and the aurora on the dark side
    const sunIm = hf.below(s.add.image(0, 0, 'hf_tt_sun').setScale(1 / D).setBlendMode('ADD'), 'earth'), rays = hf.below(s.add.image(0, 0, 'hf_tt_sun').setScale(1.5 / D).setBlendMode('ADD').setAlpha(0.3), 'earth');
    const dark = hf.above(s.add.image(0, 0, 'hf_tt_night').setOrigin(0.5, 0).setScale(0.5), 'earth'); hf.tag({ dark });
    const arc = hf.above(s.add.image(0, 0, 'hf_tt_arc').setOrigin(0.5, 0).setScale(1 / D).setBlendMode('ADD'), 'earth'), aur = hf.above(s.add.image(0, 0, 'hf_tt_aurora').setOrigin(0, 1).setScale(0.5).setBlendMode('ADD').setAlpha(0.4), 'earth');
    tw(aur, { alpha: 0.7, scaleY: 0.58, duration: 4600 }); tw(rays, { alpha: 0.5, angle: 5, duration: 5200 });
    const ghosts = [[0.34, 1.6, 0x9fd0ff, 0.12], [0.6, 0.6, 0xffe2b0, 0.2], [0.94, 2.6, 0x8fffd8, 0.07], [1.3, 4.2, 0xffb0a0, 0.05]].map(([, k, tint, a]) => hf.above(puff(0, 0, k, k, tint, a), 'earth')); // the lens, strung from the sun through the middle of the frame
    for (let i = 0; i < 18; i++) tw(hf.above(puff(r() * 320, r() * 120, 0.14 + r() * 0.2, 0.14 + r() * 0.2, r() < 0.3 ? 0xffe2c0 : 0xdfe8ff, 0.95), 'stars'), { alpha: 0.1, duration: 400 + r() * 1600 }); // stars that twinkle
    const shoot = hf.above(puff(-20, -20, 0.5, 0.12, 0xffffff, 0), 'stars').setRotation(0.5); // now and then, a meteor
    s.time.addEvent({ delay: 6800, loop: true, callback: () => { const x = 40 + Math.random() * 200, y = 8 + Math.random() * 50; shoot.setPosition(x, y).setAlpha(0.9).setScale(S * 0.3, S * 0.1); s.tweens.add({ targets: shoot, x: x + 60, y: y + 32, alpha: 0, scaleX: S * 2.4, duration: 620, ease: 'Quad.easeOut' }); } });
    // the Humanity Star flares as its mirrors catch the sun
    const gl = hf.above(s.add.image(0, 0, 'hf_tt_glint').setScale(S * 1.2).setBlendMode('ADD'), 'star'); tw(gl, { alpha: 0.1, angle: 20, duration: 300 });
    // the rocket: a white-hot core at the nozzles, the plume's glow round it, its light washing back over the smoke, and embers falling behind
    const wash = hf.below(puff(0, 0, 9, 9, 0xff8a3a, 0), 'flame'), plume = hf.above(puff(0, 0, 3, 5.4, 0xffb060, 0), 'flame').setRotation((24 * Math.PI) / 180), core = hf.above(puff(0, 0, 1, 1.6, 0xfff4e0, 0), 'flame').setRotation((24 * Math.PI) / 180);
    const embers = hf.above(s.add.particles(0, 0, 'puff', { speed: { min: 30, max: 90 }, angle: { min: 100, max: 128 }, lifespan: { min: 500, max: 1300 }, scale: { start: S * 0.1, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffd9a0, 0xff9a4a], blendMode: 'ADD', frequency: 34, emitting: false }), 'flame');
    (hf.tags.smoke as Phaser.GameObjects.Particles.ParticleEmitter | undefined)?.setParticleTint(0x8a84a0); // the trail, warmed by the sunrise it is climbing into
    // on WebGL the flame is the shader's (hifiFx.ts), shock diamonds and all
    const jet = hf.fx('plume', 0, 0, 40, 76)?.setOrigin(0.5, 0).setRotation((24 * Math.PI) / 180);
    if (jet) { hf.above(jet, 'flame'); (hf.tags.flame as Phaser.GameObjects.Particles.ParticleEmitter | undefined)?.setVisible(false); }
    o = { sun: sunIm, rays, dark, arc, aur, plume, core, wash, jet, glint: gl, ghosts, embers };
  },
  step(hf) {
    if (!o) return;
    const st = hf.state, t = hf.t, e = hf.tags.earth as Im, hs = hf.tags.star as Im, fl = 0.88 + 0.12 * Math.sin(t * 57) * Math.sin(t * 33), on = st.on || 0;
    const sx = e.x + SUN[0], sy = e.y + SUN[1] - 4;
    o.sun.setPosition(sx, sy); o.rays.setPosition(sx, sy); o.arc.setPosition(e.x, e.y); o.dark.setPosition(e.x, e.y); o.aur.setPosition(e.x - 196, e.y + 44);
    o.ghosts.forEach((g, i) => { const k = [0.34, 0.6, 0.94, 1.3][i]; g.setPosition(sx + (160 - sx) * k * 2, sy + (90 - sy) * k * 2); });
    hf.power(1, 0.9 + 0.1 * Math.sin(t * 0.7));
    o.glint.setPosition(hs.x, hs.y);
    const tx = st.x + DIR[0] * 8, ty = st.y + DIR[1] * 8;
    o.plume.setPosition(tx, ty).setAlpha(on * (o.jet ? 0.26 : 0.64) * fl); o.core.setPosition(st.x + DIR[0] * 2.4, st.y + DIR[1] * 2.4).setAlpha(o.jet ? 0 : on * fl);
    if (o.jet) { o.jet.setPosition(st.x + DIR[0] * 1.2, st.y + DIR[1] * 1.2).setVisible(on > 0); fxSet(o.jet, on, 0.1, 9, 0, 1); }
    hf.rays(sx, sy, 0.5, 0xffe2b8, 30); // the sun's shafts, cut off below by the edge of the Earth o.wash.setPosition(tx + DIR[0] * 10, ty + DIR[1] * 10).setAlpha(on * 0.17 * fl);
    o.embers.setPosition(tx, ty); o.embers.emitting = on > 0;
    if (o.jet) hf.heat(tx + DIR[0] * 34, ty + DIR[1] * 34, 34, on * 0.45); else hf.heat(tx + DIR[0] * 12, ty + DIR[1] * 12, 34, on * 0.9); // the shader's flame has its own turbulence: the hot air trails behind it
  },
};
