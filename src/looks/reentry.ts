import Phaser from 'phaser';
import { D, S, C2, el, line, lg, rg, rng } from '../art';
import { texAt, soft, add, halo } from '../hifi';
import type { Grade, Look } from '../hifi';
import { spaceTextures, SPACE, puffy, CloudTone } from './flight';

// ------------------------------------------------------------------ Return To Sender: from the edge of space to the Pacific, 20 November 2020
// The level's own account gives the hour: Electron lifted off at 3:20 pm New Zealand time, and the stage was in the water
// thirteen minutes later. So this is a late-spring afternoon downrange of Māhia, the sun still high and on the north-west
// side: a hard white point in a black sky at 78 km, then the same sun in a deep blue one, then on the water under it.
// The fair weather and the scattered cumulus are the plain level's own (no source gives the sea state): kept, and lit.
// Space is the launch looks' space (flight.ts). The stage, the two parachutes and the recovery ship are the plain
// drawings, lit for real: the sun from one side, the Earth's light from underneath, and through the wall the stage's own
// shock layer, which is the brightest thing in the sky while it lasts. (Up where the fall starts there is no air: the stars are steady.)
const SUN = [182, 38], BX = 112, DEG = Math.PI / 180;
const TONE: CloudTone = { shade: '#bccde4', down: [[0, 'rgba(255,254,246,.95)'], [0.42, 'rgba(255,250,236,.18)'], [0.7, 'rgba(124,146,192,.26)'], [1, 'rgba(88,112,168,.62)']], across: [[0, 'rgba(64,92,152,.22)'], [0.6, 'rgba(255,246,222,0)'], [1, 'rgba(255,240,204,.42)']] };
const GRADE: Grade = { threshold: 0.8, bloom: 0.62, exposure: 1.04, contrast: 1.1, saturation: 1.12, shadows: [0.86, 0.95, 1.2], highs: [1.08, 1.0, 0.9], vignette: 0.5, grain: 0.028, fringe: 0.006 };

function sky(c: C2) { // the afternoon sky as the stage falls into it: deep overhead, pale along a horizon still a long way down
  const [sx, sy] = SUN, r = rng(20);
  c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#0c3f9c'], [0.36, '#2f7cd4'], [0.72, '#7dbdee'], [0.92, '#c2e2f8'], [1, '#e2f2fc']); c.fillRect(0, 0, 320, 180);
  soft(c, 2.2); for (let i = 0; i < 12; i++) { const x = r() * 340 - 10, y = 10 + r() * 100, len = 30 + r() * 70; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len * 0.5, y - 3 - r() * 4, x + len, y - 1 - r() * 6); c.strokeStyle = `rgba(255,255,255,${0.07 + r() * 0.12})`; c.lineWidth = 0.8 + r() * 1.6; c.stroke(); } soft(c, 0); // high cirrus
  halo(c, sx, sy, 140, '255,250,232', 0.2); halo(c, sx, sy, 34, '255,252,240', 0.34);
}
function sun(c: C2) { // the sun itself: a hard point, its glare, and the streak a lens draws through it
  const x = 60, y = 60, r = rng(3);
  halo(c, x, y, 58, '255,240,214', 0.22); halo(c, x, y, 22, '255,248,230', 0.7);
  add(c, () => { for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.283 + r() * 0.3, len = 22 + r() * 34, w = 0.02 + r() * 0.03; c.fillStyle = rg(c, x, y, 2, len, [0, 'rgba(255,246,224,.28)'], [1, 'rgba(255,246,224,0)']); c.beginPath(); c.moveTo(x, y); c.arc(x, y, len, a - w, a + w); c.closePath(); c.fill(); } });
  add(c, () => { c.fillStyle = lg(c, 0, 0, 120, 0, [0, 'rgba(200,226,255,0)'], [0.5, 'rgba(236,244,255,.8)'], [1, 'rgba(200,226,255,0)']); c.fillRect(0, y - 0.4, 120, 0.8); });
  el(c, x, y, 3.4, 3.4, '#ffffff'); halo(c, x, y, 9, '255,255,255', 1);
}
function sea(c: C2) { // the Pacific in the afternoon: a long swell, and the sun lying on it in a broad patch (it is too high for a road)
  const r = rng(77), sx = SUN[0];
  c.fillStyle = lg(c, 0, 0, 0, 30, [0, '#63addf'], [0.1, '#2f7fca'], [0.5, '#1a59a6'], [1, '#0b3270']); c.fillRect(0, 0, 320, 30);
  for (let i = 0; i < 60; i++) { const k = r() ** 1.4, y = 1 + k * 28, x = r() * 340 - 10, len = 10 + k * 40; line(c, x, y, x + len, y, `rgba(6,30,84,${0.1 + r() * 0.14})`, 0.5 + k * 1.2); }
  for (let i = 0; i < 190; i++) { const k = r() ** 1.5, y = 0.7 + k * 29, x = r() * 336 - 8, len = 1.6 + k * 13; line(c, x, y, x + len, y, `rgba(224,242,255,${0.08 + r() * 0.22})`, 0.2 + k * 0.4); }
  for (let i = 0; i < 260; i++) { const k = r(), y = 0.5 + k * 29, hw = 12 + y * 1.5, x = sx + (r() + r() - 1) * hw; line(c, x - 0.5 - r() * 2.4, y, x + 0.5 + r() * 2.4, y, `rgba(255,${252 - k * 16},${232 - k * 36},${0.8 - k * 0.4})`, 0.34); }
  halo(c, sx, 2, 46, '255,250,230', 0.22);
  line(c, 0, 0.3, 320, 0.3, 'rgba(236,248,255,.7)', 0.5);
}
function haze(c: C2) { c.fillStyle = lg(c, 0, 0, 0, 22, [0, 'rgba(232,244,252,0)'], [0.8, 'rgba(232,244,252,.3)'], [1, 'rgba(240,248,254,.5)']); c.fillRect(0, 0, 320, 22); halo(c, SUN[0], 22, 60, '255,250,232', 0.2); } // the air lying on the horizon
function veil(c: C2) { const r = rng(9); soft(c, 5); for (let i = 0; i < 22; i++) el(c, 30 + r() * 180, 18 + r() * 34, 16 + r() * 30, 5 + r() * 9, `rgba(255,255,255,${0.16 + r() * 0.2})`); soft(c, 0); } // a bank of cloud to fall through, out of focus
function shock(c: C2) { // the shock layer: air that cannot get out of the way, standing off the engines and streaming back along the stage
  const path = () => { c.beginPath(); c.moveTo(8, 6); c.quadraticCurveTo(36, 150, 64, 6); };
  add(c, () => {
    c.save(); path(); c.closePath(); c.clip(); c.fillStyle = lg(c, 0, 20, 0, 80, [0, 'rgba(255,120,60,0)'], [0.7, 'rgba(255,150,80,.2)'], [1, 'rgba(255,230,200,.55)']); c.fillRect(0, 0, 72, 84); c.restore();
    for (const [w, b, col] of [[9, 5, 'rgba(255,104,48,.4)'], [4.4, 2.4, 'rgba(255,176,104,.62)'], [1.5, 0.8, 'rgba(255,244,226,.98)']] as [number, number, string][]) { soft(c, b); path(); c.strokeStyle = col; c.lineWidth = w; c.stroke(); }
    soft(c, 0);
  });
  c.globalCompositeOperation = 'destination-in'; c.fillStyle = lg(c, 0, 8, 0, 72, [0, 'rgba(0,0,0,0)'], [0.5, 'rgba(0,0,0,.45)'], [1, 'rgba(0,0,0,1)']); c.fillRect(0, 0, 72, 84); c.globalCompositeOperation = 'source-over';
}
function wake(c: C2) { soft(c, 3); c.fillStyle = lg(c, 0, 140, 0, 0, [0, 'rgba(255,214,160,.75)'], [0.25, 'rgba(255,140,70,.4)'], [0.6, 'rgba(255,96,44,.16)'], [1, 'rgba(255,90,40,0)']); c.beginPath(); c.moveTo(12, 140); c.lineTo(36, 140); c.lineTo(29, 0); c.lineTo(19, 0); c.closePath(); c.fill(); soft(c, 0); } // the glowing wake it leaves up its own track
function ring(c: C2) { soft(c, 1.2); el(c, 40, 10, 34, 6.5, undefined, 'rgba(255,255,255,.95)', 2.2); el(c, 40, 10, 24, 4.2, undefined, 'rgba(255,255,255,.5)', 1.2); soft(c, 0); } // foam, spreading from where it went in
/** What the light does to the stage's own edge and to its hot end: drawn over the plain stage's outline, so nothing of it is lost. */
const onStage = (scene: Phaser.Scene, fn: (c: C2) => void) => (c: C2) => { fn(c); c.globalCompositeOperation = 'destination-in'; c.drawImage(scene.textures.get('electron_s1').getSourceImage() as HTMLCanvasElement, 0, 0, 8, 58); c.globalCompositeOperation = 'source-over'; };
const rim = (c: C2) => { c.fillStyle = lg(c, 4.6, 0, 7, 0, [0, 'rgba(255,255,255,0)'], [0.75, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,.95)']); c.fillRect(4.6, 0, 3.4, 58); };
const ember = (c: C2) => { c.fillStyle = lg(c, 0, 30, 0, 58, [0, 'rgba(255,90,30,0)'], [0.6, 'rgba(255,120,50,.55)'], [1, 'rgba(255,224,170,.95)']); c.fillRect(0, 30, 8, 28); };

type Im = Phaser.GameObjects.Image; type Em = Phaser.GameObjects.Particles.ParticleEmitter;
const VEILS: [number, number, number][] = [[10.4, 28, 0], [8.6, 96, 1], [6.3, 34, 0], [4.9, 120, 1], [3.4, 40, 0], [2.6, 88, 1]]; // each bank: its height in km, how fast it passes, and whether it passes in front
let o: { sun: Im; ghosts: Im[]; shock: Im; wake: Im; streams: Em; embers: Em; streaks: Em; rimR: Im; rimL: Im; hot: Im; haze: Im; glitter: Em; mirror: Im; foam: Im; veils: Im[]; ksGlow: Im; ring: Im; mist: Em; down: boolean } | undefined;
const mix = (a: number, b: number, k: number) => a + (b - a) * k, rgb = (a: number, b: number, k: number) => (Math.round(mix((a >> 16) & 255, (b >> 16) & 255, k)) << 16) | (Math.round(mix((a >> 8) & 255, (b >> 8) & 255, k)) << 8) | Math.round(mix(a & 255, b & 255, k));

export const reentryLook: Look = {
  build(scene) {
    spaceTextures(scene);
    texAt(scene, 'hf_re_sky', 320, 180, D, sky); texAt(scene, 'hf_re_sun', 120, 120, D, sun); texAt(scene, 'hf_re_sea', 320, 30, D, sea); texAt(scene, 'hf_re_haze', 320, 22, 1, haze); texAt(scene, 'hf_re_veil', 240, 70, 0.5, veil);
    texAt(scene, 'hf_re_cloud1', 70, 24, D, puffy(1, TONE)); texAt(scene, 'hf_re_cloud2', 100, 30, D, puffy(2, TONE)); texAt(scene, 'hf_re_cloud3', 46, 16, D, puffy(6, TONE));
    texAt(scene, 'hf_re_shock', 72, 84, 2, shock); texAt(scene, 'hf_re_wake', 48, 140, 1, wake); texAt(scene, 'hf_re_ring', 80, 20, 2, ring);
    texAt(scene, 'hf_re_rim', 8, 58, D, onStage(scene, rim)); texAt(scene, 'hf_re_hot', 8, 58, D, onStage(scene, ember));
  },
  layers: [],
  swap: { ...SPACE, sky_day: 'hf_re_sky', sea: 'hf_re_sea', cloud1: 'hf_re_cloud1', cloud2: 'hf_re_cloud2', cloud3: 'hf_re_cloud3' },
  ambient: 0x969cb8,
  lights: [
    { x: BX, y: 116, r: 110, color: 0xff8a3c, i: 3.2 },                 // the shock layer under the engines: turned up and down with the heating
    { x: SUN[0] + 60, y: SUN[1] - 50, r: 330, color: 0xfff2d8, i: 1.3 }, // the sun, high on the right
    { x: 120, y: 250, r: 260, color: 0x4f8fff, i: 1.2 },                 // the Earth's own light, from underneath
  ],
  grade: GRADE,
  live(hf) {
    const s = hf.scene, [sx, sy] = SUN, boo = hf.tags.boo as Phaser.GameObjects.Container;
    const puff = (x: number, y: number, kx: number, ky: number, tint: number, a: number) => s.add.image(x, y, 'puff').setScale(S * kx, S * ky).setTint(tint).setBlendMode('ADD').setAlpha(a);
    const sunIm = hf.above(s.add.image(sx, sy, 'hf_re_sun').setScale(1 / D).setBlendMode('ADD'), 'sky');
    const ghosts = [[0.36, 1.5, 0x9fd0ff, 0.12], [0.62, 0.6, 0xffe2b0, 0.2], [0.9, 2.4, 0x8fffd8, 0.07], [1.2, 4, 0xffb0a0, 0.05]].map(([k, size, tint, a]) => hf.above(puff(sx + (BX - sx) * k * 1.6, sy + (84 - sy) * k * 1.6, size, size, tint, a), 'sky')); // the lens, strung from the sun through the stage
    // banks of cloud on the way down: some behind the stage and some between it and the lens
    const veils = VEILS.map(([, , front], i) => { const v = s.add.image(40 + ((i * 97) % 240), -200, 'hf_re_veil').setScale(2 * (front ? 1.5 : 1), 2 * (front ? 1.3 : 0.9)).setAlpha(front ? 0.2 : 0.4).setFlipX(i % 2 === 0); return front ? v : hf.below(v, 'sea'); });
    // the sea: haze on the horizon, glitter that moves, and the ship's own reflection
    const hz = hf.above(s.add.image(0, 300, 'hf_re_haze').setOrigin(0, 1), 'sea');
    const glitter = hf.above(s.add.particles(0, 300, 'puff', { x: { min: sx - 46, max: sx + 46 }, y: { min: 1, max: 27 }, lifespan: { min: 180, max: 460 }, scale: { start: S * 0.15, end: 0 }, alpha: { start: 1, end: 0 }, tint: 0xfffbe6, blendMode: 'ADD', frequency: 22, emitting: false }), 'sea');
    const ship = hf.tags.ship as Im;
    const mirror = hf.below(s.add.image(0, 300, 'ship').setScale(ship.scaleX, ship.scaleY * 0.8).setOrigin(0.5, 0).setFlipY(true).setAlpha(0.2).setTint(0x8fb8e6), 'ship'), foam = hf.below(s.add.image(0, 300, 'puff').setScale(S * 8.6, S * 0.5).setAlpha(0.5), 'ship');
    // the wall: the wake first, then the stage, then the shock standing off its engines, the streamers and what burns off
    const wk = hf.below(s.add.image(BX, 84, 'hf_re_wake').setOrigin(0.5, 1).setBlendMode('ADD').setAlpha(0), 'boo');
    const rimR = s.add.image(0, 0, 'hf_re_rim').setScale(S * 0.74).setBlendMode('ADD').setTint(0xfff0d0), rimL = s.add.image(0, 0, 'hf_re_rim').setScale(S * 0.74).setBlendMode('ADD').setTint(0x7fb0ff).setFlipX(true), hot = s.add.image(0, 0, 'hf_re_hot').setScale(S * 0.74).setBlendMode('ADD').setAlpha(0);
    boo.add([rimR, rimL, hot]);
    const sh = hf.below(s.add.image(BX, 84, 'hf_re_shock').setOrigin(0.5, 78 / 84).setScale(0.5).setBlendMode('ADD').setAlpha(0), 'boo'); // behind the stage, so its dark shape still reads against the glow
    const streams = hf.below(s.add.particles(BX, 84, 'puff', { x: { min: -9, max: 9 }, speedY: { min: -300, max: -170 }, speedX: { min: -22, max: 22 }, lifespan: { min: 240, max: 520 }, scaleX: { start: S * 0.14, end: S * 0.05 }, scaleY: { start: S * 1.1, end: S * 0.5 }, alpha: { start: 0.8, end: 0 }, color: [0xffffff, 0xffd89a, 0xff7a34, 0x8a2a0c], blendMode: 'ADD', frequency: 13, emitting: false } as any), 'boo');
    const embers = s.add.particles(BX, 84, 'puff', { x: { min: -4, max: 4 }, speedY: { min: -250, max: -110 }, speedX: { min: -46, max: 46 }, lifespan: { min: 500, max: 1200 }, scale: { start: S * 0.1, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffe2b0, 0xff9a4a], blendMode: 'ADD', frequency: 30, emitting: false });
    const streaks = s.add.particles(0, 0, 'puff', { x: { min: 0, max: 320 }, y: 196, speedY: { min: -900, max: -560 }, lifespan: 420, scaleX: S * 0.035, scaleY: { min: S * 1.4, max: S * 3 }, alpha: { start: 0.34, end: 0 }, tint: 0xffffff, frequency: 26, emitting: false } as any); // thicker air going past
    const ksGlow = hf.below(puff(0, 0, 0.5, 1.1, 0xbfdcff, 0), 'ks');
    const rg2 = s.add.image(BX, 300, 'hf_re_ring').setScale(0.1).setAlpha(0), mist = s.add.particles(BX, 152, 'puff', { speedY: { min: -70, max: -14 }, speedX: { min: -44, max: 44 }, gravityY: 60, lifespan: { min: 900, max: 1900 }, scale: { start: S * 0.5, end: S * 2.2 }, alpha: { start: 0.42, end: 0 }, tint: 0xeef6ff, emitting: false });
    Object.assign(GRADE, { threshold: 0.8, bloom: 0.62, vignette: 0.5, saturation: 1.12 });
    o = { sun: sunIm, ghosts, shock: sh, wake: wk, streams, embers, streaks, rimR, rimL, hot, haze: hz, glitter, mirror, foam, veils, ksGlow, ring: rg2, mist, down: false };
  },
  step(hf) {
    if (!o) return;
    const st = hf.state, s = hf.scene, t = hf.t, day = st.day || 0, hot = st.hot || 0, km = st.km, fl = 0.86 + 0.14 * Math.sin(t * 59) * Math.sin(t * 37), th = st.th * DEG, up = Math.abs(Math.cos(th));
    // the light: black sky and a hard sun, then the day; the shock layer while it lasts
    Object.assign(GRADE, { threshold: mix(0.8, 0.9, day), bloom: mix(0.62, 0.44, day) + hot * 0.12, vignette: mix(0.5, 0.36, day), saturation: mix(1.12, 1.18, day) });
    if (hf.gl) s.lights.setAmbientColor(rgb(0x969cb8, 0xc8d0e2, day));
    hf.power(0, hot * fl); hf.power(2, 1 - 0.55 * day);
    o.sun.setAlpha(1 - 0.4 * day).setScale((1 + 0.03 * Math.sin(t * 1.3)) / D); o.ghosts.forEach((g, i) => g.setAlpha([0.12, 0.2, 0.07, 0.05][i] * (1 - 0.75 * day)));
    // the stage: a lit edge on whichever side faces the sun, the Earth's blue on the other, and its hot end
    const facing = Math.cos(th) * 0.74 - Math.sin(th) * 0.67; // how squarely the stage's right-hand side faces the sun
    o.rimR.setAlpha(Phaser.Math.Clamp(facing > 0 ? facing * 0.9 : -facing * 0.3 * (1 - day), 0, 1)).setTint(facing > 0 ? 0xfff0d0 : 0x7fb0ff);
    o.rimL.setAlpha(Phaser.Math.Clamp(facing < 0 ? -facing * 0.9 : facing * 0.3 * (1 - day), 0, 1)).setTint(facing < 0 ? 0xfff0d0 : 0x7fb0ff);
    o.hot.setAlpha(hot * (0.5 + 0.4 * up) * fl);
    // the wall
    const ex = st.x, ey = st.y + 3 + 19 * up; // the lowest point of the stage, whichever way up it is
    o.shock.setPosition(ex, ey + 3).setAlpha(hot * fl).setScale(0.5 * (1.5 - 0.5 * up) * (0.96 + 0.08 * fl), 0.5 * (0.7 + 0.3 * up));
    o.wake.setPosition(ex, ey).setAlpha(hot * 0.5 * fl).setScale(0.5 + 0.5 * (1 - up), 0.84 + 0.1 * Math.sin(t * 23));
    o.streams.setPosition(ex, ey - 2); o.streams.emitting = hot > 0.2; o.embers.setPosition(st.x, st.y); o.embers.emitting = hot > 0.3;
    hf.heat(st.x, st.y - 46, 32, hot * 0.6); // over the wake, clear of the stage: its attitude has to read
    o.streaks.emitting = km < 30 && st.chute < 2 && st.v > 140 && !st.down; o.streaks.setAlpha(Phaser.Math.Clamp(st.v / 900, 0.25, 1) * (st.chute ? 0.6 : 1));
    // cloud, on the way through
    VEILS.forEach(([base, rate], i) => { const y = 84 + (km - base) * rate; o!.veils[i].setY(y).setVisible(y > -90 && y < 270); });
    // the sea coming up, and the ship on it
    const ship = hf.tags.ship as Im, seaY = st.seaY;
    o.haze.setY(seaY + 1.5); o.glitter.setPosition(0, seaY).emitting = seaY < 186;
    o.mirror.setPosition(ship.x, ship.y + 8.2).setVisible(seaY < 186); o.foam.setPosition(ship.x - 2, ship.y + 8.4).setAlpha(0.42 + 0.14 * Math.sin(t * 2.3));
    // the kick stage, still burning for orbit
    const ks = hf.tags.ks as Phaser.GameObjects.Container; if (ks.active) o.ksGlow.setPosition(ks.x, ks.y + 6.4).setAlpha(ks.alpha * 0.7 * fl); else o.ksGlow.setAlpha(0);
    if (st.down && !o.down) { // into the water: spray that hangs, and a ring of foam going out
      o.down = true; o.mist.explode(30); o.ring.setPosition(BX, seaY + 3).setAlpha(0.95);
      s.tweens.add({ targets: o.ring, scaleX: 1.1, scaleY: 0.8, alpha: 0, duration: 2400, ease: 'Quad.easeOut' });
    }
  },
};
