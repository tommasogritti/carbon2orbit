import Phaser from 'phaser';
import { D, S, C2, el, line, poly, lg, rg, rng, cloud, drawSite } from '../art';
import { texAt, soft, add, halo, sheet } from '../hifi';
import type { HiFi, Look } from '../hifi';

// ------------------------------------------------------------------ Ātea-1: Great Mercury Island, 30 November 2009, 14:23
// The level's own account gives the time: 14:23 local, on the last day of spring, which on New Zealand summer time is a
// little over an hour after the sun's highest point. So this is hard early-afternoon light: a deep sky, a white sun, short
// shadows falling away from it, glitter on the water under it, and the shallows round the island showing turquoise.
// Launch control places its own backdrop, so this look has no layer stack: it redraws the textures the scene asks for
// (`swap`), by the same site code as the plain one (`drawSite`), and adds what moves from the scene's `state`.
const SUN = [208, 80], HZ = 82; // where the plain sky has its sun, moved clear of the consoles; the horizon of the site drawing

function sky(c: C2) {
  const [sx, sy] = SUN, r = rng(3);
  c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#083a94'], [0.3, '#1f6ac8'], [0.62, '#5ea6e4'], [0.86, '#a4d0f0'], [1, '#d0e9f8']); c.fillRect(0, 0, 320, 180);
  soft(c, 2.2); for (let i = 0; i < 16; i++) { const x = r() * 340 - 10, y = 8 + r() * 60, len = 26 + r() * 60; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len * 0.5, y - 3 - r() * 4, x + len, y - 1 - r() * 6); c.strokeStyle = `rgba(255,255,255,${0.08 + r() * 0.14})`; c.lineWidth = 0.8 + r() * 1.6; c.stroke(); } soft(c, 0); // mare's tails, very high
  halo(c, sx, sy, 120, '255,250,232', 0.26); halo(c, sx, sy, 42, '255,252,240', 0.6);
  add(c, () => { for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.283 + r() * 0.2, len = 30 + r() * 46, w = 0.035 + r() * 0.03; c.fillStyle = rg(c, sx, sy, 4, len, [0, 'rgba(255,252,236,.14)'], [1, 'rgba(255,252,236,0)']); c.beginPath(); c.moveTo(sx, sy); c.arc(sx, sy, len, a - w, a + w); c.closePath(); c.fill(); } });
  el(c, sx, sy, 6.6, 6.6, '#fffef8'); halo(c, sx, sy, 16, '255,255,250', 0.95);
}
/** The site: the plain drawing's sea, headlands, island and everything standing on it, under an afternoon sun. */
function site(c: C2) {
  const r = rng(7), sx = SUN[0];
  c.fillStyle = lg(c, 0, HZ, 0, 150, [0, '#a9d8ee'], [0.04, '#4b9fd0'], [0.2, '#186eb8'], [0.6, '#0d4e9a'], [1, '#08326e']); c.fillRect(0, HZ, 320, 68);
  soft(c, 3); for (const [x, y, w] of [[40, 96, 46], [262, 104, 54], [120, 138, 70], [300, 132, 40]]) el(c, x, y, w, 2.6 + (y - HZ) * 0.05, 'rgba(6,36,92,.24)'); soft(c, 0); // cloud shadows crossing the water
  for (let i = 0; i < 300; i++) { const k = r() ** 1.5, y = HZ + 0.8 + k * 67, x = r() * 336 - 8, len = 1.6 + k * 13; line(c, x, y, x + len, y, `rgba(${k < 0.35 ? '236,248,255' : '168,214,246'},${0.08 + r() * 0.2})`, 0.2 + k * 0.4); } // swell, closer together toward the horizon
  for (let i = 0; i < 260; i++) { const k = r(), y = HZ + 0.5 + k * k * 62, hw = 3 + (y - HZ) * 0.5, x = sx + (r() - 0.5) * 2 * hw; line(c, x - 0.5 - r() * 2.2, y, x + 0.5 + r() * 2.2, y, `rgba(255,${252 - k * 24},${232 - k * 44},${0.9 - k * 0.55})`, 0.34); } // the sun on the water
  halo(c, sx, HZ + 1.5, 44, '255,246,218', 0.26);
  // far: the Coromandel ranges eight kilometres off, then the plain drawing's two headlands, each paler with distance
  { const pts = [0, HZ]; for (let x = 0; x <= 320; x += 6) pts.push(x, HZ - 5.5 - 3 * Math.sin(x * 0.031 + 1) - 2 * Math.sin(x * 0.083) - (x > 110 && x < 215 ? -3.5 * Math.sin(((x - 110) / 105) * Math.PI) : 0)); pts.push(320, HZ); poly(c, pts, '#a6c6e2'); }
  c.drawImage(sheet(320, 150, D, (t) => { drawSite(t, true, 4); t.globalCompositeOperation = 'source-atop'; t.fillStyle = lg(t, 0, 72, 0, 85, [0, 'rgba(176,208,234,.30)'], [1, 'rgba(196,224,244,.66)']); t.fillRect(0, 0, 320, 150); }), 0, 0, 320, 150);
  c.fillStyle = lg(c, 0, HZ - 7, 0, HZ + 5, [0, 'rgba(226,242,252,0)'], [0.6, 'rgba(226,242,252,.34)'], [1, 'rgba(226,242,252,0)']); c.fillRect(0, HZ - 7, 320, 12); // sea haze along the horizon
  soft(c, 3); el(c, 163, 119.5, 136, 9.5, 'rgba(40,190,196,.42)'); el(c, 163, 121, 126, 5.5, 'rgba(120,232,220,.42)'); soft(c, 0); // the shallows
  // what stands on the island, and the shadow it throws away from the sun
  const things = sheet(320, 150, D, (t) => drawSite(t, true, 8));
  const shade = sheet(320, 150, D, (t) => { t.drawImage(things, 0, 0, 320, 150); t.globalCompositeOperation = 'source-in'; t.fillStyle = '#04201a'; t.fillRect(0, 0, 320, 150); });
  c.drawImage(sheet(320, 150, D, (t) => {
    drawSite(t, true, 2); t.globalCompositeOperation = 'source-atop';
    const q = rng(19); for (let i = 0; i < 900; i++) { const x = 40 + q() * 250, y = 86 + q() * 44, k = q(); line(t, x, y, x + (q() - 0.5) * 1.2, y - 0.5 - q() * 0.9, k < 0.5 ? 'rgba(18,84,44,.22)' : k < 0.85 ? 'rgba(214,246,150,.20)' : 'rgba(250,244,214,.25)', 0.22); } // pasture and dry sand
    t.fillStyle = lg(t, 70, 124, 240, 88, [0, 'rgba(8,44,48,.36)'], [0.5, 'rgba(8,44,48,0)'], [1, 'rgba(255,248,186,.30)']); t.fillRect(0, 0, 320, 150);                                          // the slope turned to the sun, and the one turned away
    t.fillStyle = lg(t, 0, 112, 0, 132, [0, 'rgba(255,255,240,0)'], [0.5, 'rgba(255,255,240,.25)'], [1, 'rgba(120,96,60,.30)']); t.fillRect(0, 108, 320, 30);                                      // dry sand above, wet sand at the water
    soft(t, 0.7); t.globalAlpha = 0.5; t.drawImage(shade, -3, 1.7, 320, 150); t.globalAlpha = 1; soft(t, 0);
  }), 0, 0, 320, 150);
  c.beginPath(); c.moveTo(40, 112.4); c.quadraticCurveTo(160, 134.6, 286, 114.4); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 0.55; c.stroke(); // the wash on the beach
  for (let i = 0; i < 40; i++) { const k = r(), x = 40 + k * 246, y = (1 - k) * (1 - k) * 112.4 + 2 * (1 - k) * k * 134.6 + k * k * 114.4 + 0.5 + r() * 1.4; line(c, x, y, x + 1.5 + r() * 3, y, 'rgba(255,255,255,.5)', 0.3); }
  c.drawImage(sheet(320, 150, D, (t) => { t.drawImage(things, 0, 0, 320, 150); t.globalCompositeOperation = 'source-atop'; t.fillStyle = lg(t, 0, 104, 30, 62, [0, 'rgba(6,30,34,.30)'], [0.55, 'rgba(6,30,34,0)'], [1, 'rgba(255,250,210,.30)']); t.fillRect(0, 0, 320, 150); }), 0, 0, 320, 150);
}
/** A cloud of the plain shape, lit from above: bright crown, blue-grey base. */
const puffy = (seed: number) => (c: C2, w: number, h: number) => {
  cloud(c, w, h, seed, '#c6d8ec'); c.globalCompositeOperation = 'source-atop';
  c.fillStyle = lg(c, 0, 0, 0, h, [0, 'rgba(255,255,255,.95)'], [0.42, 'rgba(255,255,255,.15)'], [0.7, 'rgba(120,150,196,.25)'], [1, 'rgba(84,116,170,.62)']); c.fillRect(0, 0, w, h);
  c.fillStyle = lg(c, 0, 0, w, 0, [0, 'rgba(70,100,160,.18)'], [0.6, 'rgba(255,250,228,0)'], [1, 'rgba(255,248,220,.34)']); c.fillRect(0, 0, w, h);
};
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

let o: { pad: Phaser.GameObjects.Image; plume: Phaser.GameObjects.Image; core: Phaser.GameObjects.Image; glint: Phaser.GameObjects.Particles.ParticleEmitter; trail: Phaser.GameObjects.Particles.ParticleEmitter; dust: Phaser.GameObjects.Particles.ParticleEmitter; flares: Phaser.GameObjects.Image[]; twinkle: Phaser.GameObjects.Image[]; night: Phaser.GameObjects.Rectangle; sun: Phaser.GameObjects.Image; air: Phaser.GameObjects.Image } | undefined;
export const mercuryLook: Look = {
  build(scene) {
    texAt(scene, 'hf_mc_sky', 320, 180, D, sky); texAt(scene, 'hf_mc_site', 320, 150, D, site); texAt(scene, 'hf_mc_stars', 320, 180, D, stars); texAt(scene, 'hf_mc_limb', 400, 130, D, limb);
    texAt(scene, 'hf_mc_air', 320, 80, 2, (c) => { // the planet below, seen from the edge of space: the glow of the air along a horizon that has begun to curve
      const cy = 2460, R = 2400, top = (x: number) => cy - Math.sqrt(R * R - (x - 160) ** 2), r = rng(12);
      c.fillStyle = rg(c, 160, cy, R, R + 14, [0, 'rgba(214,240,255,.95)'], [0.07, 'rgba(120,190,255,.8)'], [0.3, 'rgba(50,120,235,.36)'], [1, 'rgba(30,80,200,0)']); c.fillRect(0, 0, 320, 80);
      c.fillStyle = rg(c, 160, cy, R - 26, R, [0, '#0a2a62'], [0.7, '#1858aa'], [1, '#74baf2']); c.beginPath(); c.arc(160, cy, R, 0, 6.3); c.fill();
      soft(c, 1.4); for (let i = 0; i < 40; i++) { const x = r() * 320; el(c, x, top(x) + 2 + r() * r() * 16, 8 + r() * 26, 0.5 + r() * 1.3, `rgba(255,255,255,${0.16 + r() * 0.3})`); } soft(c, 0);
    });
    texAt(scene, 'hf_mc_cloud1', 70, 24, D, puffy(1)); texAt(scene, 'hf_mc_cloud2', 100, 30, D, puffy(2)); texAt(scene, 'hf_mc_cloud3', 46, 16, D, puffy(6));
  },
  layers: [],
  swap: { sky_day: 'hf_mc_sky', site_island: 'hf_mc_site', stars: 'hf_mc_stars', earthlimb: 'hf_mc_limb', cloud1: 'hf_mc_cloud1', cloud2: 'hf_mc_cloud2', cloud3: 'hf_mc_cloud3' },
  grade: { threshold: 0.9, bloom: 0.42, exposure: 1.0, contrast: 1.12, saturation: 1.16, shadows: [0.92, 1.0, 1.12], highs: [1.05, 1.02, 0.95], vignette: 0.36, grain: 0.018, fringe: 0.005 },
  live(hf) {
    const s = hf.scene, [sx, sy] = SUN, puff = (x: number, y: number, k: number, tint: number, a: number) => s.add.image(x, y, 'puff').setScale(S * k).setTint(tint).setBlendMode('ADD').setAlpha(a);
    // the lens: ghosts strung along the line from the sun through the middle of the frame
    const flares = ([[0.5, 1.2, 0x9fd0ff, 0.2], [0.95, 0.5, 0xffe2b0, 0.3], [1.5, 2.2, 0x8fffd8, 0.1], [2.1, 3.6, 0xffb0a0, 0.08]] as number[][]).map(([k, size, tint, a]) => hf.above(puff(sx + (160 - sx) * k * 2, sy + (90 - sy) * k * 2, size, tint, a), 'sky'));
    s.tweens.add({ targets: hf.above(puff(sx, sy, 2, 0xfff6dc, 0.26), 'sky'), scale: S * 2.4, alpha: 0.36, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // space is black by day too: the sky goes out as the air thins, and the sun stays, small and hard
    const night = hf.above(s.add.rectangle(0, 0, 320, 180, 0x02030a).setOrigin(0).setAlpha(0), 'dark'), sun = hf.above(puff(sx, sy, 1.5, 0xffffff, 0), 'stars');
    // stars that twinkle, once the sky is dark enough to show them
    const r = rng(8), twinkle = Array.from({ length: 14 }, () => hf.above(puff(r() * 320, r() * 150, 0.2 + r() * 0.2, 0xdfe8ff, 0), 'stars'));
    const glint = hf.above(s.add.particles(0, 0, 'puff', { x: { min: sx - 26, max: sx + 26 }, y: { min: -17, max: 30 }, lifespan: { min: 180, max: 420 }, scale: { start: S * 0.16, end: 0 }, alpha: { start: 1, end: 0 }, tint: 0xfffbe6, blendMode: 'ADD', frequency: 26 }), 'ground'); // the glitter moves
    const pad = hf.above(puff(0, 0, 4, 0xffa850, 0), 'ground'), dust = hf.above(s.add.particles(0, 0, 'puff', { speedX: { min: -120, max: 120 }, speedY: { min: -9, max: 2 }, lifespan: { min: 700, max: 1500 }, scale: { start: S * 0.5, end: S * 2.4 }, alpha: { start: 0.22, end: 0 }, color: [0xffc890, 0xe8d8b8, 0xf4f2ea], frequency: 30, emitting: false }), 'ground');
    const trail = hf.below(s.add.particles(0, 0, 'puff', { speedY: { min: 150, max: 230 }, speedX: { min: -10, max: 10 }, lifespan: { min: 700, max: 1300 }, scale: { start: S * 0.34, end: S * 1.7 }, alpha: { start: 0.34, end: 0 }, tint: 0xf4f2ea, frequency: 14, emitting: false }), 'rocket');
    const plume = hf.below(puff(0, 0, 2, 0xffb060, 0), 'rocket'), core = hf.below(puff(0, 0, 0.7, 0xfff4d8, 0), 'rocket');
    const air = hf.above(s.add.image(0, 190, 'hf_mc_air').setOrigin(0).setScale(0.5).setAlpha(0), 'stars');
    o = { pad, plume, core, glint, trail, dust, flares, twinkle, night, sun, air };
  },
  step(hf) {
    if (!o) return;
    const st = hf.state, rx = st.rx, low = Phaser.Math.Clamp(1 - st.alt / 0.5, 0, 1), day = Phaser.Math.Clamp(1 - (st.alt - 8) / 60, 0, 1), fl = 0.9 + 0.1 * Math.sin(hf.t * 53) * Math.sin(hf.t * 31);
    const tx = rx - 7 * Math.sin(st.rot), ty = st.ry + 7 * Math.cos(st.rot), burn = st.up ? 0 : st.burn; // the tail of the booster
    o.glint.setPosition(0, st.base).emitting = st.base < 200;
    o.pad.setPosition(rx, st.base + 1).setAlpha(burn * low * 0.5 * fl).setScale(S * 4.4, S * 1.5);
    o.dust.setPosition(rx, st.base).emitting = burn > 0 && st.alt < 0.3;
    o.plume.setPosition(tx, ty).setAlpha(burn * 0.6 * fl).setScale(S * (0.8 + fl), S * (1.5 + fl));
    o.core.setPosition(rx - 2 * Math.sin(st.rot), st.ry + 2 * Math.cos(st.rot)).setAlpha(burn * fl);
    o.trail.setPosition(tx, ty).emitting = burn > 0 && st.alt >= 0.25;    hf.heat(tx, ty + 6, 30, burn * 0.8);
    o.night.setAlpha(1 - day); o.sun.setAlpha(1 - day);
    o.air.setAlpha(1 - day).setY(142 - 34 * Phaser.Math.Clamp((st.alt - 30) / 70, 0, 1)); // the horizon drops away and curves as the dart climbs
    o.flares.forEach((f, i) => f.setAlpha([0.2, 0.3, 0.1, 0.08][i] * (0.4 + 0.6 * day)));
    o.twinkle.forEach((t, i) => t.setAlpha((1 - day) * (0.5 + 0.5 * Math.sin(hf.t * (2 + i * 0.37) + i))));
  },
};
