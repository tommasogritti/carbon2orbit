import Phaser from 'phaser';
import { D, S, C2, el, lg, rg, rng } from '../art';
import { mars } from '../backdrops';
import { texAt, soft, add } from '../hifi';
import type { Look } from '../hifi';
import { fxSet } from '../hifiFx';
import { deepSky, earthLit, earthShade, clouds, night, plume, glint } from './cislunar';

// ------------------------------------------------------------------ ESCAPADE: from the Earth out to Sun–Earth L2 and away to Mars, November 2025 to November 2026
// Deep space, and a diagram of it (the level says so: not to scale), so there is no hour and no weather, only the Sun.
// The geometry gives its place: L2 is the point a million miles out on the far side of the Earth from the Sun, so with
// L2 on the right the Sun is off the left edge, where the plain backdrop already has its glow. Everything is lit from
// there: the Earth's day side faces left and its night side, with its towns, faces L2; Blue and Gold show the Sun on one
// side and the Earth's blue on the other as they pass under it; Mars, an emblem of where they are going rather than a
// place on this map, is given the same Sun. No air, so no star twinkles. The Earth and Mars are the plain drawings
// (`planet`, `mars`) with that light; the sky is the one behind the Moon transfer, seen another way up.
const SUN = [-1, 0.04], EX = 78, EY = 100, ERAD = (9 * 2.9 * 14) / 40; // the Earth's radius on screen

function mars2(c: C2) {
  mars(c, [-2.8, 0.3]);
  c.save(); el(c, 10, 10, 6.4, 6.4); c.clip();
  c.fillStyle = rg(c, 10, 10, 4.4, 6.4, [0, 'rgba(255,190,150,0)'], [1, 'rgba(255,190,150,.34)']); c.fillRect(3, 3, 14, 14); // dust in a thin air, toward the limb
  night(c, 10, 10, 6.4, 0.6, '10,3,4', [-1, 0.1]);
  c.restore();
}
function sunward(c: C2) { // the Sun is off the left edge: its rays across the frame, and the zodiacal light, the dust of the planets' plane glowing along it
  const r = rng(11), sx = -8, sy = 100;
  add(c, () => {
    for (let i = 0; i < 16; i++) { const a = -0.62 + i * 0.083 + r() * 0.03, len = 110 + r() * 110, w = 0.008 + r() * 0.014; c.fillStyle = rg(c, sx, sy, 8, len, [0, 'rgba(255,236,196,.07)'], [1, 'rgba(255,236,196,0)']); c.beginPath(); c.moveTo(sx, sy); c.arc(sx, sy, len, a - w, a + w); c.closePath(); c.fill(); }
    c.save(); c.translate(sx, sy); c.scale(1, 0.13); c.fillStyle = rg(c, 0, 0, 0, 230, [0, 'rgba(255,226,180,.2)'], [0.4, 'rgba(255,214,170,.07)'], [1, 'rgba(255,214,170,0)']); c.fillRect(0, -240, 240, 480); c.restore();
    c.fillStyle = lg(c, 0, 0, 170, 0, [0, 'rgba(236,244,255,.5)'], [1, 'rgba(236,244,255,0)']); c.fillRect(0, sy - 0.3, 170, 0.6);
  });
}
function ring(c: C2) { soft(c, 1); el(c, 16, 16, 12, 12, undefined, 'rgba(255,255,255,.9)', 1.4); soft(c, 0); }

type Im = Phaser.GameObjects.Image; type Em = Phaser.GameObjects.Particles.ParticleEmitter;
let o: { weather: Phaser.GameObjects.TileSprite; glare: Im; plume: Im; jet?: Im; flash: Im; lamp?: Phaser.GameObjects.Light; trails: Em[]; glints: Im[]; ping: Im; next: number; won: number; burn: number } | undefined;

export const cruiseLook: Look = {
  build(scene) {
    texAt(scene, 'hf_cr_sky', 320, 180, D, deepSky(47, 190, 84, -0.36)); texAt(scene, 'hf_cr_earth', 40, 40, D, earthLit(SUN)); texAt(scene, 'hf_cr_shade', 40, 40, 8, earthShade(SUN)); texAt(scene, 'hf_cr_clouds', 60, 28, 8, clouds);
    texAt(scene, 'hf_cr_mars', 20, 20, D, mars2); texAt(scene, 'hf_cr_sun', 240, 180, 1, sunward); texAt(scene, 'hf_cr_plume', 8, 22, D, plume); texAt(scene, 'hf_cr_glint', 16, 16, D, glint); texAt(scene, 'hf_cr_ring', 32, 32, 2, ring);
  },
  layers: [],
  swap: { stars: 'hf_cr_sky', earth: 'hf_cr_earth', mars: 'hf_cr_mars' },
  ambient: 0x565e80,
  lights: [
    { x: -330, y: 110, r: 900, color: 0xfff0d2, i: 1.6 },  // the Sun, off to the left
    { x: EX, y: EY, r: 62, color: 0x5fa0ff, i: 1.3 },      // the Earth's own light, on a spacecraft passing close under it
  ],
  grade: { threshold: 0.7, bloom: 0.68, exposure: 1.05, contrast: 1.1, saturation: 1.14, shadows: [0.86, 0.94, 1.2], highs: [1.07, 1.0, 0.91], vignette: 0.5, grain: 0.028, fringe: 0.006, streak: 0.1 },
  live(hf) {
    const s = hf.scene;
    const puff = (x: number, y: number, kx: number, ky: number, tint: number, a: number) => s.add.image(x, y, 'puff').setScale(S * kx, S * ky).setTint(tint).setBlendMode('ADD').setAlpha(a);
    const glare = hf.above(s.add.image(0, 0, 'hf_cr_sun').setOrigin(0).setBlendMode('ADD'), 'sun');
    for (const [x, size, tint, a] of [[70, 1.1, 0x9fd0ff, 0.06], [128, 0.45, 0xffe2b0, 0.11], [214, 2.2, 0xffc8a0, 0.03]]) hf.above(puff(x, 100 - x * 0.03, size, size, tint, a), 'sun'); // the lens, strung from the Sun across the frame
    // the Earth turns: weather under the night and the lit limb
    const disc = s.make.graphics({}, false).fillStyle(0xffffff).fillCircle(EX, EY, ERAD);
    const weather = hf.above(s.add.tileSprite(EX, EY, ERAD * 2, ERAD * 2, 'hf_cr_clouds').setTileScale(ERAD / 11.9 / 8).setAlpha(0.8).setMask(disc.createGeometryMask()), 'earth');
    hf.tag({ weather }); hf.above(s.add.image(EX, EY, 'hf_cr_shade').setScale((ERAD * 2) / 28 / 8), 'weather');
    // Blue and Gold: the road each has come, the Sun on their panels, and Blue's main engine
    const trails = ['blue', 'gold'].map((k, i) => hf.below(s.add.particles(0, 0, 'puff', { lifespan: 1300, scale: { start: S * 0.14, end: 0 }, alpha: { start: 0.55, end: 0 }, tint: i ? 0xffe08a : 0x9fc8ff, blendMode: 'ADD', frequency: 30, emitting: false }), k));
    const pl = hf.below(s.add.image(0, 0, 'hf_cr_plume').setOrigin(0.5, 0).setBlendMode('ADD').setAlpha(0), 'blue'), flash = hf.below(puff(0, 0, 2, 2, 0xb8dcff, 0), 'blue');
    const jet = hf.fx('plume', 0, 0, 18, 24)?.setOrigin(0.5, 0).setVisible(false); if (jet) { hf.below(jet, 'blue'); (hf.tags.flame as Em | undefined)?.setVisible(false); } // on WebGL the shader's flame: no air to hold it in, so a pale bell
    const glints = [0, 1].map(() => s.add.image(0, 0, 'hf_cr_glint').setScale(S * 0.8).setBlendMode('ADD').setAlpha(0));
    const ping = s.add.image(0, 0, 'hf_cr_ring').setBlendMode('ADD').setAlpha(0);
    const lamp = hf.gl ? s.lights.addLight(0, 0, 54, 0xb8dcff, 0) : undefined;
    o = { weather, glare, plume: pl, jet, flash, lamp, trails, glints, ping, next: hf.state.next || 0, won: 0, burn: 0 };
  },
  step(hf, dt) {
    if (!o) return;
    const st = hf.state, s = hf.scene, t = hf.t, fl = 0.85 + 0.15 * Math.sin(t * 67) * Math.sin(t * 41), blue = hf.tags.blue as Im, gold = hf.tags.gold as Im;
    o.weather.tilePositionX -= dt * 4; o.glare.setAlpha(0.9 + 0.1 * Math.sin(t * 0.6));
    if (st.main && o.burn < 0.05) hf.flash(0.14);
    o.burn += ((st.main ? 1 : 0) - o.burn) * Math.min(1, dt * 9); // the main engine comes up and dies away
    hf.streak(0.1 + 0.3 * o.burn); // the lens streaks through the flame while it burns
    const bx = st.x - Math.cos(st.rot) * 5.4, by = st.y - Math.sin(st.rot) * 5.4;
    if (o.jet) { o.jet.setPosition(bx, by).setRotation(st.rot + Math.PI / 2).setVisible(o.burn > 0.02).setAlpha(Math.min(1, o.burn * 2)); fxSet(o.jet, o.burn, 1, 9, 5); }
    o.plume.setPosition(bx, by).setRotation(st.rot + Math.PI / 2).setAlpha(o.jet ? 0 : Math.min(1, o.burn * 1.4) * fl).setScale(S * (0.9 + 0.4 * o.burn), S * (0.3 + 0.5 * o.burn));
    o.flash.setPosition(bx, by).setAlpha(o.burn * (o.jet ? 0.2 : 0.5) * fl).setScale(S * (1 + 1.2 * o.burn)); o.lamp?.setPosition(bx, by).setIntensity(2.6 * o.burn * fl);
    [blue, gold].forEach((c, i) => {
      o!.trails[i].setPosition(c.x, c.y); o!.trails[i].emitting = c.alpha > 0.5 && !!st.started && !st.won;
      o!.glints[i].setPosition(c.x, c.y).setAlpha(c.alpha * Math.max(0, Math.sin(t * 0.8 + i * 2.1 + c.x * 0.03)) ** 8 * 0.85).setRotation(t * 0.3 + i);
    });
    if (st.next > o.next || (st.won && !o.won)) { // through a gate, or away: a ring going out from where it happened
      const x = st.won ? 16 : st.x, y = st.won ? 16 : st.y; o.ping.setPosition(x, y).setAlpha(0.8).setScale(0.2).setTint(st.won ? 0xffb090 : 0x9fe6a0); s.tweens.add({ targets: o.ping, scale: 1.1, alpha: 0, duration: 700, ease: 'Quad.easeOut' });
    }
    o.next = st.next; o.won = st.won;
  },
};
