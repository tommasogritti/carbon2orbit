import Phaser from 'phaser';
import { D, S, C2, el, line, lg, rg, rng, cloud } from '../art';
import { texAt, soft, halo } from '../hifi';
import type { HiFi } from '../hifi';
import { fxSet } from '../hifiFx';

// ------------------------------------------------------------------ what every launch-control look shares
// A launch look (mercury.ts, lc1.ts) paints its own sky, site and clouds for the day it flew. The way up is the same from
// any pad: the plume and its heat, the dust at the pad, glitter on the sea under the sun, the lens, then the sky going
// black, the stars, and the edge of the Earth curving away. That part lives here, and reads the scene's `state`.
// On WebGL the plume is drawn by a shader (hifiFx.ts): a pencil of flame with shock diamonds at the pad, swelling into a
// pale bell as the air thins. The sun throws shafts that the vehicle and the tower cut into, ignition and lift-off send a
// pressure wave across the picture, and the picture shakes with the engines near the ground and with the air at Max-Q.

function stars(c: C2) {
  const r = rng(5);
  soft(c, 6); for (let i = 0; i < 26; i++) el(c, 40 + i * 10 + r() * 14, 150 - i * 4.6 + (r() - 0.5) * 22, 14 + r() * 16, 5 + r() * 6, `rgba(${120 + r() * 60},${120 + r() * 50},${220},${0.035 + r() * 0.04})`); soft(c, 0); // the Milky Way, faintly
  for (let i = 0; i < 620; i++) { const x = r() * 320, y = r() * 180, s = r(), q = r(); c.globalAlpha = 0.3 + q * 0.7; el(c, x, y, s > 0.97 ? 0.6 : 0.13 + s * 0.2, s > 0.97 ? 0.6 : 0.13 + s * 0.2, s > 0.9 ? '#ffd9a8' : s > 0.8 ? '#a8ccff' : '#ffffff'); if (s > 0.97) { c.globalAlpha = 0.5; line(c, x - 2, y, x + 2, y, '#ffffff', 0.12); line(c, x, y - 2, x, y + 2, '#ffffff', 0.12); } }
  c.globalAlpha = 1;
}
function limb(c: C2) {
  // the edge of the Earth from the edge of space: ocean, cloud bands, and the thin blue line of the air
  const cx = 200, cy = 830, R = 800, r = rng(31);
  c.save(); c.shadowColor = 'rgba(90,180,255,.95)'; c.shadowBlur = 90; el(c, cx, cy, R, R, '#2f86e6'); c.shadowBlur = 26; c.shadowColor = 'rgba(170,225,255,.9)'; el(c, cx, cy, R, R, '#2f86e6'); c.restore();
  c.save(); el(c, cx, cy, R, R); c.clip();
  c.fillStyle = rg(c, cx, cy, R - 96, R, [0, '#0c2f6e'], [0.55, '#1756a6'], [0.9, '#3f97e6'], [1, '#bfe6ff']); c.fillRect(0, 0, 400, 130);
  soft(c, 1.2); for (let i = 0; i < 9; i++) { const x = r() * 400, y = 58 + r() * 66; c.beginPath(); for (let k = 0; k < 10; k++) { const t = (k / 10) * 6.283, d = 12 + r() * 22; k ? c.lineTo(x + Math.cos(t) * d * 2, y + Math.sin(t) * d * 0.5) : c.moveTo(x + Math.cos(t) * d * 2, y + Math.sin(t) * d * 0.5); } c.closePath(); c.fillStyle = i % 2 ? 'rgba(70,140,90,.8)' : 'rgba(136,160,104,.8)'; c.fill(); }
  soft(c, 2); for (let i = 0; i < 70; i++) el(c, r() * 400, 36 + r() * 94, 12 + r() * 34, 1.2 + r() * 2.8, `rgba(255,255,255,${0.25 + r() * 0.4})`); soft(c, 0);
  halo(c, 250, 70, 70, '255,250,230', 0.35); // the sun's glint off the Pacific
  c.restore();
  c.save(); c.beginPath(); c.arc(cx, cy, R, Math.PI * 1.3, Math.PI * 1.7); c.strokeStyle = 'rgba(214,240,255,.95)'; c.lineWidth = 0.9; c.stroke(); c.restore();
}
function air(c: C2) { // the planet below, seen from the edge of space: the glow of the air along a horizon that has begun to curve
  const cy = 2460, R = 2400, top = (x: number) => cy - Math.sqrt(R * R - (x - 160) ** 2), r = rng(12);
  c.fillStyle = rg(c, 160, cy, R, R + 14, [0, 'rgba(214,240,255,.95)'], [0.07, 'rgba(120,190,255,.8)'], [0.3, 'rgba(50,120,235,.36)'], [1, 'rgba(30,80,200,0)']); c.fillRect(0, 0, 320, 80);
  c.fillStyle = rg(c, 160, cy, R - 26, R, [0, '#0a2a62'], [0.7, '#1858aa'], [1, '#74baf2']); c.beginPath(); c.arc(160, cy, R, 0, 6.3); c.fill();
  soft(c, 1.4); for (let i = 0; i < 40; i++) { const x = r() * 320; el(c, x, top(x) + 2 + r() * r() * 16, 8 + r() * 26, 0.5 + r() * 1.3, `rgba(255,255,255,${0.16 + r() * 0.3})`); } soft(c, 0);
}
/** Space, the same over every pad: call from a launch look's `build`, and spread `SPACE` into its `swap`. */
export function spaceTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('hf_fl_stars')) return;
  texAt(scene, 'hf_fl_stars', 320, 180, D, stars); texAt(scene, 'hf_fl_limb', 400, 130, D, limb); texAt(scene, 'hf_fl_air', 320, 80, 2, air);
}
export const SPACE = { stars: 'hf_fl_stars', earthlimb: 'hf_fl_limb' };

/** How a cloud takes the light: its shadow colour, then the wash from crown to base, then from the side away from the sun to the side toward it. */
export interface CloudTone { shade: string; down: [number, string][]; across: [number, string][] }
export const NOON: CloudTone = {
  shade: '#c6d8ec',
  down: [[0, 'rgba(255,255,255,.95)'], [0.42, 'rgba(255,255,255,.15)'], [0.7, 'rgba(120,150,196,.25)'], [1, 'rgba(84,116,170,.62)']],
  across: [[0, 'rgba(70,100,160,.18)'], [0.6, 'rgba(255,250,228,0)'], [1, 'rgba(255,248,220,.34)']],
};
/** A cloud of the plain shape, lit by the day's sun. */
export const puffy = (seed: number, tone = NOON) => (c: C2, w: number, h: number) => {
  cloud(c, w, h, seed, tone.shade); c.globalCompositeOperation = 'source-atop';
  c.fillStyle = lg(c, 0, 0, 0, h, ...tone.down); c.fillRect(0, 0, w, h);
  c.fillStyle = lg(c, 0, 0, w, 0, ...tone.across); c.fillRect(0, 0, w, h);
};

/** The day's numbers for the way up: where the sun is on screen, where its glitter lies on the sea (relative to the ground line), and how big the plume is. */
export interface Ascent { sun: [number, number]; glint: { x: number; y0: number; y1: number; tint?: number; /** Half its width (26 unless given). */ w?: number }; flare?: number; sunTint?: number; plume?: number; padTint?: number; /** The sun is too far down to come back into view on the way up (a night launch). */ sunless?: boolean; /** A tint for the glow of the air along the horizon, where the ground below is in the dark. */ airTint?: number; /** The lens streak at the pad (none by day; in space every flight has one). */ streak?: number; /** How strongly the light of the day shows on the vehicle (1 unless given: less for an afterglow). */ shine?: number }
type Puff = Phaser.GameObjects.Image; type Emit = Phaser.GameObjects.Particles.ParticleEmitter;
/**
 * Light on black carbon. The vehicle's own drawing, kept only where a polished cylinder throws the light back: a hard
 * strip down the side the sun is on and a little sky along the other (`sh`), or the tail, where the plume lights it (`ug`).
 */
function sheenTex(scene: Phaser.Scene, key: string, kind: 'sh' | 'ug') {
  const k = `hf_fl_${kind}_${key}`; if (scene.textures.exists(k)) return k;
  const src = scene.textures.get(key).getSourceImage() as HTMLCanvasElement, w = src.width / D, h = src.height / D;
  texAt(scene, k, w, h, D, (c) => {
    c.drawImage(src, 0, 0, w, h); c.globalCompositeOperation = 'source-in';
    c.fillStyle = kind === 'sh' ? lg(c, 1, 0, 7, 0, [0, 'rgba(150,190,255,.2)'], [0.16, 'rgba(150,190,255,0)'], [0.52, 'rgba(255,255,255,0)'], [0.7, 'rgba(255,255,255,.6)'], [0.8, 'rgba(255,255,255,.18)'], [1, 'rgba(255,255,255,.05)']) : lg(c, 0, h - 20, 0, h, [0, 'rgba(255,140,50,0)'], [0.7, 'rgba(255,160,70,.4)'], [1, 'rgba(255,200,120,.9)']);
    c.fillRect(0, 0, w, h);
  });
  return k;
}
interface Sheen { src: Puff; key: string; sh: Puff; ug?: Puff }
let o: { a: Ascent; pad: Puff; plume: Puff; core: Puff; jet?: Puff; sheen: Sheen[]; was: { burn: number; alt: number; up: number }; glint: Emit; trail: Emit; dust: Emit; flares: Puff[]; twinkle: Puff[]; night: Phaser.GameObjects.Rectangle; sun: Puff; air: Puff } | undefined;
const GHOSTS = [[0.5, 1.2, 0x9fd0ff, 0.2], [0.95, 0.5, 0xffe2b0, 0.3], [1.5, 2.2, 0x8fffd8, 0.1], [2.1, 3.6, 0xffb0a0, 0.08]];

/** A launch look's `live`: the lens, the glitter, the pad and the plume, and the things that only show once the sky is dark. */
export function ascentLive(hf: HiFi, a: Ascent) {
  const s = hf.scene, [sx, sy] = a.sun, k = a.plume || 1, puff = (x: number, y: number, size: number, tint: number, al: number) => s.add.image(x, y, 'puff').setScale(S * size).setTint(tint).setBlendMode('ADD').setAlpha(al);
  // the lens: ghosts strung along the line from the sun through the middle of the frame
  const flares = GHOSTS.map(([q, size, tint, al]) => hf.above(puff(sx + (160 - sx) * q * 2, sy + (90 - sy) * q * 2, size, tint, al), 'sky'));
  s.tweens.add({ targets: hf.above(puff(sx, sy, 2, a.sunTint ?? 0xfff6dc, 0.26), 'sky'), scale: S * 2.4, alpha: 0.36, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  // space is black by day too: the sky goes out as the air thins, and the sun stays, small and hard
  const night = hf.above(s.add.rectangle(0, 0, 320, 180, 0x02030a).setOrigin(0).setAlpha(0), 'dark'), sun = hf.above(puff(sx, sy, 1.5, 0xffffff, 0), 'stars');
  // stars that twinkle, once the sky is dark enough to show them
  const r = rng(8), twinkle = Array.from({ length: 14 }, () => hf.above(puff(r() * 320, r() * 150, 0.2 + r() * 0.2, 0xdfe8ff, 0), 'stars'));
  const glint = hf.above(s.add.particles(0, 0, 'puff', { x: { min: a.glint.x - (a.glint.w ?? 26), max: a.glint.x + (a.glint.w ?? 26) }, y: { min: a.glint.y0, max: a.glint.y1 }, lifespan: { min: 180, max: 420 }, scale: { start: S * 0.16, end: 0 }, alpha: { start: 1, end: 0 }, tint: a.glint.tint ?? 0xfffbe6, blendMode: 'ADD', frequency: 26 }), 'ground'); // the glitter moves
  const pad = hf.above(puff(0, 0, 4, a.padTint ?? 0xffa850, 0), 'ground'), dust = hf.above(s.add.particles(0, 0, 'puff', { speedX: { min: -120 * k, max: 120 * k }, speedY: { min: -9 * k, max: 2 }, lifespan: { min: 700, max: 1500 }, scale: { start: S * 0.5 * k, end: S * 2.4 * k }, alpha: { start: 0.22, end: 0 }, color: [0xffc890, 0xe8d8b8, 0xf4f2ea], frequency: 30 / k, emitting: false }), 'ground');
  const trail = hf.below(s.add.particles(0, 0, 'puff', { speedY: { min: 150, max: 230 }, speedX: { min: -10, max: 10 }, lifespan: { min: 700, max: 1300 }, scale: { start: S * 0.34 * k, end: S * 1.7 * k }, alpha: { start: 0.34, end: 0 }, tint: 0xf4f2ea, frequency: 14, emitting: false }), 'rocket');
  const plume = hf.below(puff(0, 0, 2, 0xffb060, 0), 'rocket'), core = hf.below(puff(0, 0, 0.7, 0xfff4d8, 0), 'rocket');
  const airGlow = hf.above(s.add.image(0, 190, 'hf_fl_air').setOrigin(0).setScale(0.5).setAlpha(0), 'stars'); if (a.airTint !== undefined) airGlow.setTint(a.airTint);
  const jet = hf.fx('plume', 0, 0, 27 * k, 54 * k)?.setOrigin(0.5, 0); // the shader's plume takes the place of the scene's flame and of the look's own glow
  if (jet) { hf.below(jet, 'rocket'); for (const f of ['flame', 'flame2']) (hf.tags[f] as Emit | undefined)?.setVisible(false); }
  // the vehicle takes the light: each of its parts gets a sheen that rides on it, inside the scene's own container
  const rk = hf.tags.rocket as Phaser.GameObjects.Container | undefined, sheen: Sheen[] = [];
  for (const src of (rk?.list || []).filter((c): c is Puff => c instanceof Phaser.GameObjects.Image && /^(electron|atea)/.test(c.texture.key))) {
    const key = src.texture.key, sh = s.add.image(0, 0, sheenTex(s, key, 'sh')).setScale(S).setBlendMode('ADD').setTint(a.sunless ? 0xdce8ff : a.sunTint ?? 0xfff6dc).setFlipX(sx < 154), ug = /s1|atea/.test(key) ? s.add.image(0, 0, sheenTex(s, key, 'ug')).setScale(S).setBlendMode('ADD').setAlpha(0) : undefined;
    rk!.addAt(sh, rk!.getIndex(src) + 1); if (ug) rk!.addAt(ug, rk!.getIndex(sh) + 1);
    sheen.push({ src, key, sh, ug });
  }
  o = { a, pad, plume, core, jet, sheen, was: { burn: 0, alt: 0, up: 0 }, glint, trail, dust, flares, twinkle, night, sun, air: airGlow };
}
/** A launch look's `step`. */
export function ascentStep(hf: HiFi) {
  if (!o) return;
  const st = hf.state, rx = st.rx, k = o.a.plume || 1, fk = o.a.flare ?? 1, low = Phaser.Math.Clamp(1 - st.alt / 0.5, 0, 1), day = Phaser.Math.Clamp(1 - (st.alt - 8) / 60, 0, 1), fl = 0.9 + 0.1 * Math.sin(hf.t * 53) * Math.sin(hf.t * 31);
  const sin = Math.sin(st.rot), cos = Math.cos(st.rot), nz = st.nz || 0, live = st.burn || 0;
  const tx = rx - 7 * k * sin, ty = st.ry + 7 * k * cos, burn = st.up ? 0 : st.burn; // the tail of the booster
  o.glint.setPosition(0, st.base).emitting = st.base < 200;
  o.pad.setPosition(rx, st.base + 1).setAlpha(burn * low * 0.5 * fl).setScale(S * 4.4 * k, S * 1.5 * k);
  o.dust.setPosition(rx, st.base).emitting = burn > 0 && st.alt < 0.3;
  o.plume.setPosition(tx, ty).setAlpha(o.jet ? 0 : burn * 0.6 * fl).setScale(S * (0.8 + fl) * k, S * (1.5 + fl) * k);
  o.core.setPosition(rx - 2 * k * sin, st.ry + 2 * k * cos).setAlpha(burn * fl * (o.jet ? low : 1)).setScale(S * 0.7 * k);
  o.trail.setPosition(tx, ty).emitting = burn > 0 && st.alt >= 0.25 && !(o.jet && st.alt > 9); // above the weather the jet leaves no smoke to hang in the air
  if (o.jet) hf.heat(rx - 36 * k * sin, st.ry + 36 * k * cos, 34 * k, burn * 0.45); else hf.heat(tx, ty + 6, 30 * k, burn * 0.8); // the shader's flame has its own turbulence: the hot air is what trails behind it
  if (o.jet) { // the jet leaves whichever nozzle is burning, and the ground cuts it short until the vehicle has climbed clear of it
    const thin = st.up ? 1 : Phaser.Math.SmoothStep(st.alt, 5, 58), size = st.up ? 0.62 : 1;
    o.jet.setPosition(rx - nz * sin, st.ry + nz * cos).setRotation(st.rot).setScale((27 * k * size) / 4, (54 * k * size) / 4).setVisible(live > 0);
    fxSet(o.jet, live, thin, st.up ? 9 : (st.base - st.ry + 1.2) / (54 * k * Math.max(0.2, cos)), 0, 1);
  }
  const shine = o.a.sunless ? 0.4 * Phaser.Math.Clamp(1 - st.alt / 0.5, 0, 1) : (0.75 + 0.25 * (1 - day)) * (o.a.shine ?? 1); // by day the sun, harder still in space; after dark the pad's lamps, left behind with the pad
  o.sheen = o.sheen.filter((q) => {
    const src = q.src; if (!src.active) { q.sh.destroy(); q.ug?.destroy(); return false; }
    if (q.key !== src.texture.key) { q.key = src.texture.key; q.sh.setTexture(sheenTex(hf.scene, q.key, 'sh')); } // the fairing comes off, the stage flies on alone: the sheen follows the drawing
    q.sh.setOrigin(src.originX, src.originY).setPosition(src.x, src.y).setAlpha(shine); q.ug?.setOrigin(src.originX, src.originY).setPosition(src.x, src.y).setAlpha(burn * fl * 0.9);
    return true;
  });
  // what the engines do to the air: a wave at ignition and a bigger one at release, a glare, and a rumble that fades with height; then the air's own, at Max-Q
  const was = o.was;
  if (live > 0 && !was.burn && !st.up) { hf.shock(rx, st.base, 0.6); hf.flash(0.35); hf.shake(0.5); }
  if (st.alt > 0.002 && was.alt <= 0.002 && live > 0) { hf.shock(rx, st.base, 1); hf.flash(0.2); hf.shake(0.8); }
  if (st.up && !was.up) hf.flash(0.12);
  if (live > 0 && st.up && !was.burn) { hf.shock(rx - nz * sin, st.ry + nz * cos, 0.35); hf.flash(0.25); }
  hf.shake(Math.max(burn * 0.42 * Phaser.Math.Clamp(1 - st.alt / 1.6, 0, 1), 0.5 * Phaser.Math.Clamp(((st.q || 0) - 0.55) / 0.45, 0, 1)));
  o.was = { burn: live, alt: st.alt, up: st.up };
  hf.streak(Math.max(o.a.streak || 0, 0.6 * (1 - day)));                 // against a black sky the lens draws its streak through the sun and the flame
  // the sun's shafts by day; after dark the plume is the only sun there is, and throws its own through the smoke
  if (o.a.sunless) hf.rays(tx, ty, burn * low * 0.32, o.a.padTint ?? 0xffa850, 16, 0.9); else hf.rays(o.a.sun[0], o.a.sun[1], 0.22, o.a.sunTint ?? 0xfff6dc, 34);
  o.night.setAlpha(1 - day); o.sun.setAlpha(o.a.sunless ? 0 : 1 - day);
  o.air.setAlpha(1 - day).setY(142 - 34 * Phaser.Math.Clamp((st.alt - 30) / 70, 0, 1)); // the horizon drops away and curves as the rocket climbs
  o.flares.forEach((f, i) => f.setAlpha(GHOSTS[i][3] * fk * (0.4 + 0.6 * day)));
  o.twinkle.forEach((t, i) => t.setAlpha((1 - day) * (0.5 + 0.5 * Math.sin(hf.t * (2 + i * 0.37) + i))));
}
