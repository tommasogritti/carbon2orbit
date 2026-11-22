import Phaser from 'phaser';
import { D, S, C2, el, line, lg, rg, rng } from '../art';
import { texAt, soft, add, halo } from '../hifi';
import type { Look } from '../hifi';
import { puffy, CloudTone } from './flight';

// ------------------------------------------------------------------ There And Back Again: the Pacific off Māhia, the morning of 3 May 2022
// Electron left at 22:49 UTC on 2 May (the list of Electron launches, the level's source), which is 10:49 on the morning
// of 3 May in New Zealand, and the stage was under its parachute about a quarter of an hour later. Late autumn at 39°
// south: the sun is in the north-east and only a third of the way up the sky, so it stands in the frame, where the plain
// sky already has it, with a road of light on the water under it and the recovery ship lying in that road. The fair
// weather and the four cumulus are the plain level's (no source in the level gives the sky that morning): kept, and lit.
// The helicopter, the stage, its parachute and the ship are the plain drawings, lit for real from the sun's side.
const SUN = [236, 78], SEA = 152;
const TONE: CloudTone = { shade: '#b4c4dc', down: [[0, 'rgba(255,253,244,.95)'], [0.42, 'rgba(255,248,232,.2)'], [0.7, 'rgba(126,142,186,.28)'], [1, 'rgba(92,106,160,.6)']], across: [[0, 'rgba(60,84,144,.24)'], [0.6, 'rgba(255,242,214,0)'], [1, 'rgba(255,236,196,.46)']] };

function sky(c: C2) {
  const [sx, sy] = SUN, r = rng(31);
  c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#0e469e'], [0.34, '#2f7ccc'], [0.62, '#6fb0e4'], [0.8, '#a4cfee'], [0.86, '#c6dfee'], [1, '#c6dfee']); c.fillRect(0, 0, 320, 180);
  soft(c, 2.2); for (let i = 0; i < 16; i++) { const x = r() * 340 - 10, y = 6 + r() * 84, len = 26 + r() * 70; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len * 0.5, y - 3 - r() * 4, x + len, y - 1 - r() * 6); c.strokeStyle = `rgba(255,252,244,${0.07 + r() * 0.13})`; c.lineWidth = 0.8 + r() * 1.7; c.stroke(); } soft(c, 0); // high cirrus
  soft(c, 1.4); for (let i = 0; i < 26; i++) { const x = r() * 330 - 5, w = 8 + r() * 20, near = Math.max(0, 1 - Math.abs(x - sx) / 150); el(c, x, SEA - 1.5 - r() * 3, w, 1.6 + r() * 2.6, `rgba(${214 + near * 36},${226 + near * 18},${240 - near * 8},${0.4 + r() * 0.3})`); } soft(c, 0); // cloud tops standing on the horizon, a long way off
  halo(c, sx, sy, 120, '255,244,214', 0.16); halo(c, sx, sy, 26, '255,248,228', 0.4);
  add(c, () => { for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.283 + r() * 0.2, len = 34 + r() * 50, w = 0.03 + r() * 0.03; c.fillStyle = rg(c, sx, sy, 4, len, [0, 'rgba(255,244,214,.07)'], [1, 'rgba(255,244,214,0)']); c.beginPath(); c.moveTo(sx, sy); c.arc(sx, sy, len, a - w, a + w); c.closePath(); c.fill(); } });
  el(c, sx, sy, 5, 5, '#fffdf0'); halo(c, sx, sy, 11, '255,255,250', 0.9);
  c.fillStyle = lg(c, 0, SEA - 12, 0, SEA + 2, [0, 'rgba(226,236,240,0)'], [1, 'rgba(230,238,240,.4)']); c.fillRect(0, SEA - 12, 320, 14); // the haze the sea air makes of the horizon
}
function sea(c: C2) {
  const r = rng(77), sx = SUN[0];
  c.fillStyle = lg(c, 0, 0, 0, 30, [0, '#8cbcdc'], [0.07, '#3f8acc'], [0.4, '#1d5fac'], [1, '#0a3474']); c.fillRect(0, 0, 320, 30);
  for (let i = 0; i < 46; i++) { const k = r() ** 1.4, y = 1.4 + k * 28, x = r() * 340 - 10, len = 10 + k * 44; line(c, x, y, x + len, y, `rgba(6,28,80,${0.1 + r() * 0.14})`, 0.5 + k * 1.3); } // the backs of the swells
  for (let i = 0; i < 200; i++) { const k = r() ** 1.5, y = 0.7 + k * 29, x = r() * 336 - 8, len = 1.6 + k * 13; line(c, x, y, x + len, y, `rgba(226,242,255,${0.08 + r() * 0.22})`, 0.2 + k * 0.4); }
  for (let i = 0; i < 300; i++) { const k = r(), y = 0.4 + k * k * 29, hw = 3 + y * 0.8, x = sx + (r() - 0.5) * 2 * hw; line(c, x - 0.5 - r() * 2.4, y, x + 0.5 + r() * 2.4, y, `rgba(255,${250 - k * 26},${224 - k * 48},${0.92 - k * 0.5})`, 0.36); } // the sun's road
  halo(c, sx, 1.5, 44, '255,244,214', 0.3);
  line(c, 0, 0.3, 320, 0.3, 'rgba(240,248,255,.6)', 0.5);
}
function swell(c: C2) { const r = rng(5); for (let i = 0; i < 70; i++) { const k = r() ** 1.3, y = 1 + k * 26, x = r() * 150, len = 2 + k * 9; line(c, x, y, x + len, y, `rgba(236,248,255,${0.2 + r() * 0.4})`, 0.2 + k * 0.35); } } // crests that travel
function rays(c: C2) { add(c, () => { const r = rng(6); for (let i = 0; i < 20; i++) { const a = (i / 20) * 6.283 + r() * 0.2, len = 44 + r() * 36, w = 0.03 + r() * 0.035; c.fillStyle = rg(c, 80, 80, 6, len, [0, 'rgba(255,246,220,.1)'], [1, 'rgba(255,246,220,0)']); c.beginPath(); c.moveTo(80, 80); c.arc(80, 80, len, a - w, a + w); c.closePath(); c.fill(); } }); }
function wisp(c: C2) { const r = rng(14); soft(c, 5); for (let i = 0; i < 16; i++) el(c, 30 + r() * 160, 14 + r() * 22, 16 + r() * 30, 3 + r() * 6, `rgba(255,255,255,${0.14 + r() * 0.18})`); soft(c, 0); } // a shred of cloud close to the lens
function ring(c: C2) { soft(c, 1.2); el(c, 40, 10, 34, 6.5, undefined, 'rgba(255,255,255,.95)', 2.2); el(c, 40, 10, 24, 4.2, undefined, 'rgba(255,255,255,.5)', 1.2); soft(c, 0); }
function disc(c: C2) { c.fillStyle = rg(c, 36, 3, 4, 36, [0, 'rgba(20,22,30,.0)'], [0.6, 'rgba(20,22,30,.16)'], [0.96, 'rgba(20,22,30,.3)'], [1, 'rgba(20,22,30,0)']); c.save(); c.translate(0, 3); c.scale(1, 0.07); c.translate(0, -3); c.fillRect(0, -40, 72, 86); c.restore(); } // the blades, too fast to see as blades

type Im = Phaser.GameObjects.Image; type Em = Phaser.GameObjects.Particles.ParticleEmitter;
let o: { glitter: Em; mirror: Im; foam: Im; swells: Phaser.GameObjects.TileSprite[]; ping: Im; sparks: Em; ring: Im; mist: Em; wake: Em; caught: number; wet: number } | undefined;

export const catchLook: Look = {
  build(scene) {
    texAt(scene, 'hf_ct_sky', 320, 180, D, sky); texAt(scene, 'hf_ct_sea', 320, 30, D, sea); texAt(scene, 'hf_ct_swell', 160, 28, 2, swell); texAt(scene, 'hf_ct_rays', 160, 160, 1, rays);
    texAt(scene, 'hf_ct_wisp', 220, 50, 0.5, wisp); texAt(scene, 'hf_ct_ring', 80, 20, 2, ring); texAt(scene, 'hf_ct_disc', 72, 6, D, disc);
    texAt(scene, 'hf_ct_cloud1', 70, 24, D, puffy(1, TONE)); texAt(scene, 'hf_ct_cloud2', 100, 30, D, puffy(2, TONE)); texAt(scene, 'hf_ct_cloud3', 46, 16, D, puffy(6, TONE));
  },
  layers: [],
  swap: { sky_day: 'hf_ct_sky', sea: 'hf_ct_sea', cloud1: 'hf_ct_cloud1', cloud2: 'hf_ct_cloud2', cloud3: 'hf_ct_cloud3' },
  ambient: 0xaab2c8,
  lights: [
    { x: SUN[0] + 70, y: SUN[1] - 46, r: 380, color: 0xfff0d2, i: 1.15 }, // the sun, low enough to light things from the side
    { x: 150, y: 214, r: 230, color: 0x5f9cff, i: 0.7 },                   // the sea, giving the sky's blue back from underneath
  ],
  grade: { threshold: 0.92, bloom: 0.42, exposure: 1.0, contrast: 1.12, saturation: 1.16, shadows: [0.9, 0.98, 1.14], highs: [1.07, 1.02, 0.93], vignette: 0.38, grain: 0.018, fringe: 0.005 },
  live(hf) {
    const s = hf.scene, [sx, sy] = SUN, r = rng(3), heli = hf.tags.heli as Phaser.GameObjects.Container, ship = hf.tags.ship as Im;
    const puff = (x: number, y: number, kx: number, ky: number, tint: number, a: number) => s.add.image(x, y, 'puff').setScale(S * kx, S * ky).setTint(tint).setBlendMode('ADD').setAlpha(a);
    // the sun: rays that turn slowly, a lens strung from it through the middle of the frame, and the glitter under it
    s.tweens.add({ targets: hf.above(s.add.image(sx, sy, 'hf_ct_rays').setBlendMode('ADD').setAlpha(0.7), 'sky'), angle: 360, duration: 260000, repeat: -1 });
    for (const [k, size, tint, a] of [[0.5, 1.1, 0x9fd0ff, 0.08], [0.95, 0.45, 0xffe2b0, 0.16], [1.5, 1.8, 0xbfe8ff, 0.035]]) hf.above(puff(sx + (160 - sx) * k * 2, sy + (90 - sy) * k * 2, size, size, tint, a), 'sky');
    const swells = [0.5, 0.3].map((a, i) => hf.above(s.add.tileSprite(0, SEA + 1 + i, 320, 28, 'hf_ct_swell').setOrigin(0).setTileScale(0.5).setAlpha(a).setBlendMode('ADD'), 'sea'));
    const glitter = hf.above(s.add.particles(0, SEA, 'puff', { x: { min: sx - 22, max: sx + 22 }, y: { min: 0.6, max: 26 }, lifespan: { min: 180, max: 460 }, scale: { start: S * 0.16, end: 0 }, alpha: { start: 1, end: 0 }, tint: 0xfff4d6, blendMode: 'ADD', frequency: 20 }), 'sea');
    // the ship: its reflection, and the water it pushes aside
    const mirror = hf.below(s.add.image(0, 0, 'ship').setScale(ship.scaleX, ship.scaleY * 0.8).setOrigin(0.5, 0).setFlipY(true).setAlpha(0.22).setTint(0x7fa8d8), 'ship'), foam = hf.below(s.add.image(0, 0, 'puff').setScale(S * 8.6, S * 0.5).setAlpha(0.5), 'ship');
    const wake = hf.below(s.add.particles(0, 0, 'puff', { x: { min: -30, max: 30 }, speedX: { min: -8, max: 8 }, speedY: { min: -1, max: 1 }, lifespan: { min: 900, max: 1800 }, scaleX: { start: S * 0.3, end: S * 1.2 }, scaleY: S * 0.12, alpha: { start: 0.5, end: 0 }, frequency: 120 } as any), 'ship');
    // the helicopter: the disc its blades make, a beacon under the tail, and the sun in the cockpit glass (all ride with it)
    const blades = s.add.image(-1.5, -9.6, 'hf_ct_disc').setScale(S * 0.84, S), beacon = puff(-21, -6.4, 0.5, 0.5, 0xff3a2a, 0), glint = puff(14.2, -1.4, 0.34, 0.34, 0xfff6dc, 0.8);
    heli.add([blades, beacon, glint]);
    s.tweens.add({ targets: beacon, alpha: 1, duration: 70, yoyo: true, hold: 60, repeat: -1, repeatDelay: 1100 }); s.tweens.add({ targets: glint, alpha: 0.25, scale: S * 0.2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // cloud close to the lens, crossing slowly
    for (let i = 0; i < 2; i++) { const w = s.add.image(-260 + i * 300, 40 + i * 66, 'hf_ct_wisp').setScale(2.6, 2.2).setAlpha(0.2).setFlipX(i === 1); s.tweens.add({ targets: w, x: w.x + 840, duration: 90000 + i * 30000, repeat: -1, delay: 0 }); }
    for (let i = 0; i < 10; i++) { const q = puff(r() * 320, SEA + 2 + r() * 24, 0.12 + r() * 0.2, 0.12, 0xffffff, 0.7); hf.above(q, 'sea'); s.tweens.add({ targets: q, alpha: 0, duration: 300 + r() * 900, yoyo: true, repeat: -1, delay: r() * 900 }); } // whitecaps, here and there
    // the catch and the splash
    const ping = puff(0, 0, 1, 1, 0xfff0b0, 0), sparks = s.add.particles(0, 0, 'puff', { speed: { min: 30, max: 110 }, gravityY: 160, lifespan: { min: 250, max: 600 }, scale: { start: S * 0.1, end: 0 }, tint: 0xffe08a, blendMode: 'ADD', emitting: false });
    const rg2 = hf.above(s.add.image(0, 0, 'hf_ct_ring').setScale(0.1).setAlpha(0), 'sea'), mist = s.add.particles(0, 0, 'puff', { speedY: { min: -64, max: -12 }, speedX: { min: -40, max: 40 }, gravityY: 60, lifespan: { min: 900, max: 1800 }, scale: { start: S * 0.45, end: S * 2 }, alpha: { start: 0.4, end: 0 }, tint: 0xeef6ff, emitting: false });
    o = { glitter, mirror, foam, swells, ping, sparks, ring: rg2, mist, wake, caught: 0, wet: 0 };
  },
  step(hf, dt) {
    if (!o) return;
    const st = hf.state, s = hf.scene, t = hf.t, ship = hf.tags.ship as Im;
    o.swells[0].tilePositionX += dt * 9; o.swells[1].tilePositionX -= dt * 5;
    o.mirror.setPosition(ship.x, ship.y + 8.2).setRotation(-ship.rotation); o.foam.setPosition(ship.x - 2, ship.y + 8.4).setAlpha(0.42 + 0.14 * Math.sin(t * 2.3)); o.wake.setPosition(ship.x, ship.y + 8.6);
    if (st.caught && !o.caught) { // the hook takes the line: a flash of the sun on it, and a shower off the cable
      o.ping.setPosition(st.kx, st.ky).setAlpha(0.95).setScale(S * 0.6); s.tweens.add({ targets: o.ping, alpha: 0, scale: S * 3.4, duration: 520, ease: 'Quad.easeOut' }); o.sparks.explode(14, st.kx, st.ky);
    }
    if (st.wet && !o.wet) { // into the sea: spray that hangs in the light, and foam going out
      o.mist.explode(26, st.bx, SEA + 1); o.ring.setPosition(st.bx, SEA + 2.4).setAlpha(0.95).setScale(0.1); s.tweens.add({ targets: o.ring, scaleX: 1, scaleY: 0.7, alpha: 0, duration: 2200, ease: 'Quad.easeOut' });
    }
    o.caught = st.caught; o.wet = st.wet;
  },
};
