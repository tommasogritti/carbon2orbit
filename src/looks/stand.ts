import Phaser from 'phaser';
import { D, S, C2, el, line, poly, rr, lg, rg, rng, drawStand } from '../art';
import { texAt, soft, add, halo } from '../hifi';
import type { HiFi, Look } from '../hifi';
import { fxSet } from '../hifiFx';

// ------------------------------------------------------------------ Rutherford hot-fire: the Auckland test stand at night
// The plain backdrop is a night scene (stars over dark hills, one floodlight on the stand), and that is the light kept
// here: a moonless sky, a single cold floodlight, and then the engine, which out-shines everything while it runs. The
// stand, the battery cart, the cable and the two tanks are the plain drawing's own (`drawStand`, part 2), now lit for
// real: Light2D with a normal map made from their outlines, and a light at the plume whose strength is chamber pressure.
const X = 108, NOZZLE = 80, DEFLECT = 121, GROUND = 134; // the engine's column, where the plume starts, where it meets the deflector

function sky(c: C2) {
  const r = rng(12);
  c.fillStyle = lg(c, 0, 0, 0, 140, [0, '#04060f'], [0.55, '#0b1430'], [0.86, '#1b2850'], [1, '#34406a']); c.fillRect(0, 0, 320, 140);
  soft(c, 7); for (let i = 0; i < 22; i++) el(c, 20 + i * 14 + r() * 12, 14 + i * 3.6 + (r() - 0.5) * 20, 16 + r() * 16, 6 + r() * 6, `rgba(${120 + r() * 50},${126 + r() * 40},230,${0.03 + r() * 0.035})`); soft(c, 0); // the Milky Way
  for (let i = 0; i < 520; i++) { const x = r() * 320, y = r() * r() * 128, s = r(); c.globalAlpha = (0.3 + r() * 0.7) * (1 - y / 150); el(c, x, y, s > 0.97 ? 0.55 : 0.12 + s * 0.2, s > 0.97 ? 0.55 : 0.12 + s * 0.2, s > 0.9 ? '#ffd9a8' : s > 0.8 ? '#a8ccff' : '#ffffff'); }
  c.globalAlpha = 1;
  halo(c, 286, 132, 90, '255,170,110', 0.2); // the city, over the hills
  { const pts = [0, 140]; for (let x = 0; x <= 320; x += 5) pts.push(x, 106 - 7 * Math.sin(x * 0.019 + 2) - 4 * Math.sin(x * 0.047) - 2 * Math.sin(x * 0.13)); pts.push(320, 140); poly(c, pts, '#131d3e'); } // a farther range
  poly(c, [0, 132, 50, 112, 110, 124, 180, 108, 260, 122, 320, 112, 320, 140, 0, 140], '#080e22'); // the plain backdrop's hills
  for (let x = 0; x < 320; x += 1.6) { const k = x < 50 ? 132 - (x / 50) * 20 : x < 110 ? 112 + ((x - 50) / 60) * 12 : x < 180 ? 124 - ((x - 110) / 70) * 16 : x < 260 ? 108 + ((x - 180) / 80) * 14 : 122 - ((x - 260) / 60) * 10; if (r() < 0.6) el(c, x, k + 0.2, 0.9 + r() * 1.1, 1 + r() * 1.6, '#080e22'); } // bush along the ridge
  for (const [x, y] of [[36, 126], [228, 124], [300, 121]]) { el(c, x, y, 0.4, 0.4, '#ffd9a0'); halo(c, x, y, 4, '255,210,150', 0.5); } // a farm or two
  c.fillStyle = lg(c, 0, 118, 0, 140, [0, 'rgba(60,80,140,0)'], [1, 'rgba(60,80,140,.28)']); c.fillRect(0, 118, 320, 22); // ground mist
}
function apron(c: C2) {
  // the concrete apron: slabs in perspective, a scorch under the deflector, tyre marks, last night's rain
  const r = rng(21);
  c.fillStyle = lg(c, 0, 0, 0, 46, [0, '#8e94a8'], [0.25, '#7a8096'], [1, '#585d72']); c.fillRect(0, 0, 320, 46);
  for (let x = -260; x < 600; x += 34) line(c, x, 46, 160 + (x - 160) * 0.34, 0, 'rgba(20,22,34,.4)', 0.4);
  for (const y of [5, 13, 26]) line(c, 0, y, 320, y, 'rgba(20,22,34,.34)', 0.3 + y * 0.012);
  for (let i = 0; i < 420; i++) { const y = r() * 46; el(c, r() * 320, y, 0.2 + r() * 0.5, 0.12 + r() * 0.2, `rgba(${r() < 0.5 ? '255,255,255' : '10,12,22'},${0.05 + r() * 0.1})`); }
  c.fillStyle = rg(c, X, 4, 2, 62, [0, 'rgba(8,8,12,.75)'], [0.4, 'rgba(8,8,12,.4)'], [1, 'rgba(8,8,12,0)']); c.save(); c.translate(X, 4); c.scale(1, 0.34); c.translate(-X, -4); c.fillRect(X - 70, -60, 140, 130); c.restore();
  for (let i = 0; i < 16; i++) { const a = Math.PI * (0.06 + r() * 0.88), len = 16 + r() * 30; line(c, X, 3, X + Math.cos(a) * len * 1.7, 3 + Math.sin(a) * len * 0.5, 'rgba(8,8,12,.3)', 0.4 + r() * 0.5); }
  for (const [x0, x1] of [[14, 96], [20, 100]]) { c.beginPath(); c.moveTo(x0, 6); c.quadraticCurveTo(60, 20, x1 + 120, 46); c.strokeStyle = 'rgba(14,16,26,.3)'; c.lineWidth = 1.5; c.stroke(); } // where the battery cart was wheeled in
  soft(c, 0.6); for (const [x, y, w, h] of [[226, 14, 22, 2.4], [62, 30, 30, 3.4], [156, 36, 26, 3], [276, 34, 18, 2.2]]) el(c, x, y, w, h, 'rgba(18,24,48,.5)', 'rgba(190,206,255,.16)', 0.3); soft(c, 0);
  line(c, 0, 0.5, 320, 0.5, 'rgba(210,220,255,.4)', 0.5); for (let x = 2; x < 320; x += 12) rr(c, x, 1.6, 7, 1.1, 0, 'rgba(240,200,60,.6)'); // the keep-out line
}
function things(c: C2) {
  drawStand(c, 2);
  // weathering the plain drawing does not have: rain streaks down the tanks, soot up the legs and the deflector, frost at the LOX tank's waist
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = lg(c, 0, 60, 0, 134, [0, 'rgba(20,16,14,0)'], [1, 'rgba(20,16,14,.42)']); c.fillRect(54, 60, 108, 74);
  const r = rng(2); for (let i = 0; i < 26; i++) { const x = 176 + r() * 36, y = 72 + r() * 30; line(c, x, y, x + 0.3, y + 6 + r() * 22, 'rgba(40,46,70,.16)', 0.4); }
  c.fillStyle = lg(c, 0, 96, 0, 122, [0, 'rgba(235,245,255,0)'], [0.5, 'rgba(235,245,255,.6)'], [1, 'rgba(235,245,255,0)']); c.fillRect(176, 96, 18, 26);
  c.globalCompositeOperation = 'source-over';
}
function diamonds(c: C2) { // shock diamonds: the plume is over-expanded at sea level, and shows it
  add(c, () => { for (let i = 0; i < 5; i++) { const y = 4 + i * 8.4, w = 5.4 - i * 0.7, a = 0.95 - i * 0.17; c.fillStyle = rg(c, 8, y, 0, w, [0, `rgba(255,255,255,${a})`], [0.35, `rgba(190,225,255,${a * 0.7})`], [1, 'rgba(255,170,90,0)']); c.save(); c.translate(8, y); c.scale(1, 0.62); c.translate(-8, -y); c.fillRect(0, y - w, 16, w * 2); c.restore(); } });
}
function core(c: C2) { soft(c, 1.2); c.fillStyle = lg(c, 0, 0, 0, 44, [0, 'rgba(255,255,255,.95)'], [0.3, 'rgba(200,228,255,.7)'], [0.7, 'rgba(255,190,110,.35)'], [1, 'rgba(255,150,70,0)']); c.beginPath(); c.moveTo(4, 0); c.lineTo(12, 0); c.lineTo(15, 44); c.lineTo(1, 44); c.closePath(); c.fill(); soft(c, 0); }
function cone(c: C2) { soft(c, 4); c.fillStyle = lg(c, 0, 0, 0, 130, [0, 'rgba(220,232,255,.5)'], [0.5, 'rgba(220,232,255,.16)'], [1, 'rgba(220,232,255,0)']); c.beginPath(); c.moveTo(74, 0); c.lineTo(86, 0); c.lineTo(150, 130); c.lineTo(10, 130); c.closePath(); c.fill(); soft(c, 0); }

type Em = Phaser.GameObjects.Particles.ParticleEmitter; type Im = Phaser.GameObjects.Image;
let o: { diamonds: Im; core: Im; flame?: Im; lit: boolean; splash: Im; pool: Im; jets: Em[]; smoke: Em; sparks: Em; sx: number; sy: number } | undefined;
export const standLook: Look = {
  build(scene) {
    texAt(scene, 'hf_st_sky', 320, 140, D, sky); texAt(scene, 'hf_st_apron', 320, 46, D, apron); texAt(scene, 'hf_st_things', 320, 180, D, things);
    texAt(scene, 'hf_st_diamonds', 16, 44, D, diamonds); texAt(scene, 'hf_st_core', 16, 44, D, core); texAt(scene, 'hf_st_cone', 160, 130, 1, cone);
  },
  layers: [{ key: 'hf_st_sky', w: 320 }, { key: 'hf_st_apron', w: 320, y: GROUND, lit: true }, { key: 'hf_st_things', w: 320, lit: true }],
  ambient: 0x39446e,
  lights: [
    { x: X, y: 108, r: 190, color: 0xff9440, i: 2.6 },                 // the plume: turned up and down with chamber pressure
    { x: X, y: 4, r: 150, color: 0xdce8ff, i: 1.0 },                   // the floodlight over the stand
    { x: 29, y: 104, r: 34, color: 0x7cf08a, i: 0.7, flicker: 0.1 },   // the battery cart's charge lights
    { x: 244, y: 150, r: 120, color: 0x7f9cff, i: 0.42 },               // sky light on the wet apron
  ],
  grade: { threshold: 0.6, bloom: 0.85, exposure: 1.06, contrast: 1.12, saturation: 1.1, shadows: [0.84, 0.95, 1.2], highs: [1.1, 1.0, 0.88], vignette: 0.6, grain: 0.034, fringe: 0.008 },
  live(hf) {
    const s = hf.scene, r = rng(4), puff = (x: number, y: number, kx: number, ky: number, tint: number, a: number) => s.add.image(x, y, 'puff').setScale(S * kx, S * ky).setTint(tint).setBlendMode('ADD').setAlpha(a);
    const lay = <T extends Phaser.GameObjects.GameObject>(q: T) => hf.below(q, 'glow');
    for (let i = 0; i < 12; i++) { const k = 0.09 + r() * 0.08, t = lay(puff(r() * 320, r() * 76, k, k, 0xdfe8ff, 0.9)); s.tweens.add({ targets: t, alpha: 0.1, duration: 500 + r() * 1400, yoyo: true, repeat: -1 }); }
    s.tweens.add({ targets: lay(s.add.image(X, 0, 'hf_st_cone').setOrigin(0.5, 0).setBlendMode('ADD').setAlpha(0.3)), alpha: 0.4, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    lay(puff(X, 3, 1.6, 0.8, 0xeef4ff, 0.95));
    lay(s.add.particles(0, 0, 'puff', { x: { min: X - 44, max: X + 44 }, y: { min: 10, max: 110 }, lifespan: { min: 3000, max: 6000 }, speedX: { min: -3, max: 6 }, speedY: { min: -3, max: 2 }, scale: { min: S * 0.03, max: S * 0.08 }, alpha: { values: [0, 0.7, 0.4, 0.7, 0] } as any, tint: 0xdce8ff, blendMode: 'ADD', frequency: 110, advance: 4000 })); // moths and dust in the floodlight
    lay(s.add.particles(185, 108, 'puff', { x: { min: -8, max: 8 }, speedY: { min: 5, max: 12 }, speedX: { min: -4, max: 5 }, lifespan: 2600, scale: { start: S * 0.3, end: S * 1.1 }, alpha: { start: 0.2, end: 0 }, tint: 0xdfeeff, frequency: 160, advance: 2000 })); // cold air pouring off the LOX tank
    const pool = lay(puff(X, 152, 5, 2.2, 0xff8a3a, 0));
    const smoke = lay(s.add.particles(X, GROUND - 2, 'puff', { x: { min: -30, max: 30 }, speedY: { min: -34, max: -12 }, speedX: { min: -14, max: 30 }, lifespan: { min: 1600, max: 3000 }, scale: { start: S * 0.7, end: S * 3 }, alpha: { start: 0.34, end: 0 }, color: [0xffb46a, 0xa0705a, 0x4a4f66, 0x2a2e40], frequency: 60, emitting: false }));
    const jet = (dir: number) => hf.above(s.add.particles(X + dir * 10, DEFLECT + 6, 'puff', { speedX: { min: dir * 60, max: dir * 150 }, speedY: { min: -22, max: 6 }, lifespan: { min: 260, max: 620 }, scale: { start: S * 0.5, end: S * 1.5 }, alpha: { start: 0.8, end: 0 }, color: [0xffffff, 0xffd890, 0xff7a2c, 0x7a2408], blendMode: 'ADD', frequency: 14, emitting: false }), 'flame');
    const jets = [jet(-1), jet(1)];
    const sparks = hf.above(s.add.particles(X, DEFLECT, 'puff', { speedX: { min: -130, max: 130 }, speedY: { min: -120, max: -20 }, gravityY: 260, lifespan: { min: 300, max: 800 }, scale: { start: S * 0.09, end: 0 }, tint: 0xffd27a, blendMode: 'ADD', frequency: 40, emitting: false }), 'flame');
    const splash = hf.above(puff(X, DEFLECT + 2, 4.4, 1.5, 0xffd9a0, 0), 'flame');
    const cr = hf.above(s.add.image(X, NOZZLE, 'hf_st_core').setOrigin(0.5, 0).setScale(S).setBlendMode('ADD').setAlpha(0), 'flame'), di = hf.above(s.add.image(X, NOZZLE + 1, 'hf_st_diamonds').setOrigin(0.5, 0).setScale(S).setBlendMode('ADD').setAlpha(0), 'flame');
    // on WebGL the flame is the shader's (hifiFx.ts): the same over-expanded jet, with diamonds that stand still while the gas tears through them
    const flame = hf.fx('plume', X, NOZZLE, 180, 120)?.setOrigin(0.5, 0).setVisible(false);
    if (flame) { hf.above(flame, 'flame'); (hf.tags.flame as Em | undefined)?.setVisible(false); }
    const cam = s.cameras.main; o = { diamonds: di, core: cr, flame, lit: false, splash, pool, jets, smoke, sparks, sx: cam.scrollX, sy: cam.scrollY };
  },
  step(hf) {
    if (!o) return;
    const p = hf.state.pc || 0, t = hf.t, fl = 0.86 + 0.14 * Math.sin(t * 61) * Math.sin(t * 37), hot = Phaser.Math.Clamp((p - 0.04) * 1.4, 0, 1);
    hf.power(0, hot * fl); hf.heat(X, 106, 52, hot * (o.flame ? 0.5 : 1)); // the shader's flame has its own turbulence
    o.core.setAlpha(o.flame ? 0 : hot * fl).setScale(S * (0.8 + 0.3 * p), S * (0.5 + 0.55 * p)); o.diamonds.setAlpha(o.flame ? 0 : hot * hot * fl).setScale(S * (0.9 + 0.2 * p), S * (0.55 + 0.5 * p));
    if (o.flame) { o.flame.setVisible(hot > 0).setAlpha(Math.min(1, hot * 2)); fxSet(o.flame, 0.4 + 0.6 * p, 0, (DEFLECT - NOZZLE) / 120, 0, 1, 0.9); }
    if (hot > 0 && !o.lit) { hf.shock(X, DEFLECT, 0.7); hf.flash(0.3); } // ignition: the air takes the blow before the eye has the light
    o.lit = hot > 0;
    o.splash.setAlpha(hot * 0.8 * fl); o.pool.setAlpha(hot * 0.3 * fl);
    for (const j of o.jets) { j.emitting = p > 0.25; j.frequency = 30 - 18 * p; }
    o.smoke.emitting = p > 0.08; o.sparks.emitting = p > 0.5;
    if (hf.gl) hf.scene.cameras.main.setScroll(o.sx + Math.sin(t * 71) * 0.22 * hot, o.sy + Math.sin(t * 89 + 1) * 0.3 * hot); // the ground shakes; the consoles, on their own camera, do not
  },
};
