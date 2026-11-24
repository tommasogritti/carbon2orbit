import Phaser from 'phaser';
import { S, C2, el, line, poly, lg, rg, rng } from '../art';
import { HX, W } from '../core';
import { rideFar, rideMid } from '../backdrops';
import { texAt, soft, add, halo, sheet } from '../hifi';
import type { HiFi, Look } from '../hifi';

// ------------------------------------------------------------------ Go Find the Launch Site: the far end of the Māhia Peninsula
// No source gives the hour or the weather of the ride, so the look keeps the fair day of the plain backdrop and takes its
// light from what the chapter is about: the open ocean to the east. The sun stands over that ocean, still on the morning
// side, so the track is ridden toward the light: glitter on the water, slopes that face the sea lit and the others in
// shade, long grass rim-lit along every crest. Clouds, the mainland, Portland Island, the boats, the woolshed, the ute at
// END OF ROAD and the headland are the plain drawings' own (`rideFar`, `rideMid`); the ground is drawn from the same heights.
const SKY = 400, FAR = 520, MID = 760, SUN = [304, 44], HZ = 100;

function sky(c: C2) {
  const [sx, sy] = SUN, r = rng(5);
  c.fillStyle = lg(c, 0, 0, 0, 104, [0, '#1558bc'], [0.45, '#4a94e0'], [0.82, '#8fc4ee'], [1, '#c4e2f6']); c.fillRect(0, 0, SKY, 104);
  soft(c, 2); for (let i = 0; i < 14; i++) { const x = r() * SKY, y = 6 + r() * 40, len = 30 + r() * 70; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len / 2, y - 4, x + len, y - 2 - r() * 5); c.strokeStyle = `rgba(255,255,255,${0.08 + r() * 0.12})`; c.lineWidth = 0.8 + r() * 1.4; c.stroke(); } soft(c, 0);
  halo(c, sx, sy, 90, '255,246,220', 0.24); halo(c, sx, sy, 34, '255,250,236', 0.6); el(c, sx, sy, 6, 6, '#fffef6'); halo(c, sx, sy, 14, '255,255,248', 0.9);
  c.fillStyle = lg(c, 0, HZ, 0, 180, [0, '#b9e0f2'], [0.05, '#4c9fd2'], [0.3, '#1c70b8'], [1, '#0b3d82']); c.fillRect(0, HZ, SKY, 80);
  for (let i = 0; i < 300; i++) { const k = r() ** 1.5, y = HZ + 1 + k * 78, x = r() * (SKY + 10) - 5; line(c, x, y, x + 2 + k * 13, y, `rgba(${k < 0.35 ? '236,248,255' : '170,216,246'},${0.08 + r() * 0.2})`, 0.2 + k * 0.4); }
  for (let i = 0; i < 300; i++) { const k = r(), y = HZ + 0.5 + k * k * 76, hw = 4 + (y - HZ) * 0.7, x = sx + (r() - 0.5) * 2 * hw; line(c, x - 0.6 - r() * 2.4, y, x + 0.6 + r() * 2.4, y, `rgba(255,${250 - k * 26},${226 - k * 46},${0.9 - k * 0.55})`, 0.36); } // the sun's road on the water
  halo(c, sx, HZ + 2, 40, '255,244,214', 0.26);
  c.fillStyle = lg(c, 0, HZ - 8, 0, HZ + 6, [0, 'rgba(228,242,252,0)'], [0.6, 'rgba(228,242,252,.3)'], [1, 'rgba(228,242,252,0)']); c.fillRect(0, HZ - 8, SKY, 14);
}
function far(c: C2) {
  // the plain far layer's clouds, lit from the sun's side, and its land and boats, paled by the sea air between
  c.drawImage(sheet(FAR, 180, 3, (t) => {
    rideFar(t, 4); t.globalCompositeOperation = 'source-atop'; t.fillStyle = 'rgba(255,255,255,.55)'; t.fillRect(0, 0, FAR, 180);
    for (const [x, y, w] of [[40, 22, 120], [210, 40, 80], [330, 18, 130]]) { const h = w * 0.24; t.fillStyle = lg(t, 0, y + h * 0.45, 0, y + h * 0.92, [0, 'rgba(110,140,190,0)'], [1, 'rgba(110,140,190,.36)']); t.fillRect(x - 4, y, w + 8, h + 2); } // each of the plain layer's three clouds: bright crown, shaded base
    t.fillStyle = lg(t, 0, 0, FAR, 0, [0, 'rgba(255,248,220,0)'], [1, 'rgba(255,244,206,.3)']); t.fillRect(0, 0, FAR, 180);
  }), 0, 0, FAR, 180);
  c.drawImage(sheet(FAR, 180, 3, (t) => { rideFar(t, 2); t.globalCompositeOperation = 'source-atop'; t.fillStyle = lg(t, 0, 72, 0, 112, [0, 'rgba(190,220,242,.26)'], [1, 'rgba(206,230,246,.5)']); t.fillRect(0, 0, FAR, 180); }), 0, 0, FAR, 180);
}
function mid(c: C2) {
  c.drawImage(sheet(MID, 180, 4, (t) => {
    rideMid(t); t.globalCompositeOperation = 'source-atop';
    const r = rng(9); for (let i = 0; i < 1400; i++) { const x = r() * MID, y = 96 + r() * 84, k = r(); line(t, x, y, x + (r() - 0.3) * 1.4, y - 0.6 - r(), k < 0.5 ? 'rgba(20,80,44,.16)' : 'rgba(214,240,150,.16)', 0.25); } // pasture
    soft(t, 4); for (const [x, y, w] of [[90, 140, 60], [330, 150, 90], [520, 132, 50], [690, 160, 70]]) el(t, x, y, w, 9, 'rgba(8,40,50,.26)'); soft(t, 0);                                                                    // cloud shadows
    t.fillStyle = lg(t, 0, 92, 0, 180, [0, 'rgba(255,246,186,.26)'], [0.3, 'rgba(255,246,186,0)'], [1, 'rgba(8,44,52,.3)']); t.fillRect(0, 0, MID, 180);                                                                       // crests in the sun
    t.fillStyle = 'rgba(176,210,238,.2)'; t.fillRect(0, 0, MID, 180);                                                                                                                                                         // a little air in front of it
  }), 0, 0, MID, 180);
}
function flax(c: C2) { // harakeke, close to the lens and out of focus
  const r = rng(3); soft(c, 1.6);
  for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + (i - 7.5) * 0.13 + (r() - 0.5) * 0.1, len = 18 + r() * 14, ex = 36 + Math.cos(a) * len, ey = 44 + Math.sin(a) * len; c.beginPath(); c.moveTo(36 + (i - 7.5) * 0.5, 44); c.quadraticCurveTo(36 + Math.cos(a) * len * 0.5, 44 + Math.sin(a) * len * 0.7, ex, ey); c.strokeStyle = i % 4 === 0 ? 'rgba(120,170,80,.9)' : 'rgba(10,36,24,.95)'; c.lineWidth = 2 - i * 0.03; c.stroke(); }
  soft(c, 0);
}
const hill = ['#a6dc76', '#7cc45c', '#d2ea9c', '#5fae52'];
/** One stretch of the ground, 256 units wide from x0: a grass hillside under the scene's own height line, lit by its slope. */
function ground(c: C2, x0: number, hf: HiFi, strip: HTMLCanvasElement, TOP: number, TALL: number, RES: number) {
  const h = hf.world.height!, r = rng(101 + x0), CW = 256, y = (x: number) => h(x) - TOP, gone = (x: number) => h(x) > 180;
  for (let px = 0; px < CW * RES; px++) {
    const x = x0 + px / RES; if (gone(x)) continue;
    const d = (h(x + 1) - h(x - 1)) / 2, lit = gone(x + 1) || gone(x - 1) ? 0 : ((d * 0.6 + 0.8) / Math.hypot(1, d) - 0.8) * 2.2; // how squarely this bit of slope faces the sun over the sea
    c.drawImage(strip, px / RES, y(x), 1 / RES + 0.02, TALL);
    const a = lit > 0 ? Math.min(0.45, lit) : Math.min(0.5, -lit * 1.5), ink = lit > 0 ? '255,246,168' : '6,34,50'; // strongest along the crest, fading down the face
    for (const [d0, d1, k] of [[0, 14, 1], [14, 34, 0.6], [34, 62, 0.3]]) { c.fillStyle = `rgba(${ink},${a * k})`; c.fillRect(px / RES, y(x) + d0, 1 / RES + 0.02, d1 - d0); }
  }
  c.globalCompositeOperation = 'source-atop'; soft(c, 5); { const q = rng(77); for (let i = 0; i < hf.world.LW / 16; i++) { const x = q() * hf.world.LW, d = 12 + q() * 80, rx = 12 + q() * 20, ry = 4 + q() * 6; if (x < x0 - 60 || x > x0 + CW + 60 || gone(x)) continue; el(c, x - x0, y(x) + d, rx, ry, i % 2 ? 'rgba(20,70,44,.22)' : 'rgba(190,226,120,.16)'); } } soft(c, 0); // one list for the whole ride, so a patch that straddles two stretches is drawn the same in both c.globalCompositeOperation = 'source-over'; // the patchwork of a grazed hillside
  const run = (off: (x: number) => number, col: string, lw: number, keep: (x: number) => boolean = () => true) => { // a line that follows the ground, broken at the gullies
    let pen = false; c.beginPath(); for (let x = x0 - 2; x <= x0 + CW + 2; x += 2) { if (gone(x) || !keep(x)) { pen = false; continue; } pen ? c.lineTo(x - x0, y(x) + off(x)) : c.moveTo(x - x0, y(x) + off(x)); pen = true; } c.strokeStyle = col; c.lineWidth = lw; c.stroke();
  };
  for (const d of [8, 16, 25, 36, 49, 63]) { const k = (x: number) => Math.sin(x * 0.013 + d * 1.7) > -0.25; run((x) => d + 1.3 * Math.sin(x * 0.07 + d), 'rgba(16,58,36,.3)', 0.5, k); run((x) => d + 0.7 + 1.3 * Math.sin(x * 0.07 + d), 'rgba(196,232,130,.16)', 0.35, k); } // sheep tracks across the face of the hill
  for (let i = 0; i < 70; i++) { const x = x0 + r() * CW, d = 4 + r() * r() * 74; if (gone(x) || gone(x + 3) || gone(x - 3)) continue; const tx = x - x0, ty = y(x) + d; for (let k = -2; k <= 2; k++) line(c, tx, ty, tx + k * 0.7 + 0.5, ty - 2 - r() * 1.6, i % 3 ? 'rgba(206,222,132,.5)' : 'rgba(24,74,40,.5)', 0.3); } // tussock
  for (let i = 0; i < 7; i++) { const x = x0 + r() * CW, d = 10 + r() * 60; if (gone(x) || gone(x + 4) || gone(x - 4)) continue; const tx = x - x0, ty = y(x) + d, rx = 1.2 + r() * 1.6; el(c, tx, ty + 0.5, rx + 0.4, rx * 0.4, 'rgba(8,36,30,.4)'); el(c, tx, ty, rx, rx * 0.55, '#8f8c7c'); el(c, tx + rx * 0.25, ty - rx * 0.15, rx * 0.5, rx * 0.22, 'rgba(240,236,214,.6)'); } // papa showing through
  run(() => 1.3, '#93cf68', 2.6); run(() => 0.55, '#b08a55', 1.1); run(() => 1.05, 'rgba(70,46,24,.5)', 0.3); run(() => 0.05, 'rgba(250,240,190,.8)', 0.3); // the crest in the sun, and the worn line where the bike goes
  for (let x = x0; x < x0 + CW; x += 0.5 + r() * 0.8) { const k = r(); if (gone(x) || gone(x + 1.5) || gone(x - 1.5)) continue; line(c, x - x0, y(x) + 1.6, x - x0 + 0.5 + r() * 0.6, y(x) + 0.5 - k * 1.1, hill[Math.floor(r() * 4)], 0.28); } // long grass along the edge, leaning with the wind
  for (const [a, b] of hf.world.gaps || []) { // a gully: papa walls, shade, and the sea in the bottom of it
    if (b < x0 || a > x0 + CW) continue;
    const la = y(a - 0.6), lb = y(b + 0.6), ax = a - x0, bx = b - x0, sea = 180 - 14 - TOP;
    poly(c, [ax, la, bx, lb, bx, TALL, ax, TALL], lg(c, 0, Math.min(la, lb), 0, sea, [0, '#2c4438'], [0.5, '#182c2e'], [1, '#0c1c2a']));
    for (const [wx, dir, top] of [[ax, 1, la], [bx, -1, lb]]) { poly(c, [wx, top, wx + dir * 5, top + 7, wx + dir * 3.4, sea, wx, sea], lg(c, 0, top, 0, sea, [0, '#d8cca6'], [1, '#7c7258'])); for (let k = top + 4; k < sea; k += 5) line(c, wx, k, wx + dir * 3.6, k + 1.2, 'rgba(70,56,34,.35)', 0.3); }
    c.fillStyle = lg(c, 0, sea, 0, TALL, [0, '#4f9fe0'], [0.3, '#2468b4'], [1, '#123c7a']); c.fillRect(ax, sea, bx - ax, TALL - sea); line(c, ax, sea + 0.3, bx, sea + 0.3, 'rgba(236,248,255,.85)', 0.6); for (let k = 0; k < 6; k++) line(c, ax + 3 + r() * (bx - ax - 12), sea + 2 + r() * 8, ax + 9 + r() * (bx - ax - 12), sea + 2 + r() * 8, 'rgba(200,232,255,.35)', 0.3);
  }
}

type Em = Phaser.GameObjects.Particles.ParticleEmitter;
let o: { shadow: Phaser.GameObjects.Image; roost: Em; air: number } | undefined;
export const farmLook: Look = {
  build(scene) {
    texAt(scene, 'hf_fm_sky', SKY, 180, 2, sky); texAt(scene, 'hf_fm_far', FAR, 180, 3, far); texAt(scene, 'hf_fm_mid', MID, 180, 4, mid); texAt(scene, 'hf_fm_flax', 72, 46, 1.5, flax);
    texAt(scene, 'hf_fm_rays', 160, 160, 1, (c) => add(c, () => { const r = rng(6); for (let i = 0; i < 20; i++) { const a = (i / 20) * 6.283 + r() * 0.2, len = 44 + r() * 36, w = 0.03 + r() * 0.035; c.fillStyle = rg(c, 80, 80, 5, len, [0, 'rgba(255,250,226,.22)'], [1, 'rgba(255,250,226,0)']); c.beginPath(); c.moveTo(80, 80); c.arc(80, 80, len, a - w, a + w); c.closePath(); c.fill(); } }));
    texAt(scene, 'hf_fm_bird', 10, 4, 4, (c) => { c.beginPath(); c.moveTo(0.4, 2.4); c.quadraticCurveTo(3, 0.2, 5, 2.4); c.quadraticCurveTo(7, 0.2, 9.6, 2.4); c.strokeStyle = '#f6f4ec'; c.lineWidth = 0.7; c.stroke(); el(c, 0.5, 2.4, 0.5, 0.4, '#15171f'); el(c, 9.5, 2.4, 0.5, 0.4, '#15171f'); });
  },
  layers: [{ key: 'hf_fm_sky', w: SKY }, { key: 'hf_fm_far', w: FAR }, { key: 'hf_fm_mid', w: MID }],
  ambient: 0xb4bcd2,
  heroLight: { r: 180, color: 0xfff0c0, i: 0.55, dx: 54, dy: -48 }, // the sun, ahead of the bike and above it
  mirror: 0,
  grade: { threshold: 0.86, bloom: 0.42, exposure: 1.02, contrast: 1.1, saturation: 1.16, shadows: [0.9, 1.0, 1.12], highs: [1.07, 1.02, 0.93], vignette: 0.38, grain: 0.018, fringe: 0.005 },
  live(hf) {
    const s = hf.scene, LW = hf.world.LW, [sx, sy] = SUN, TOP = 56, TALL = 128, RES = 3, r = rng(14);
    // the ground, a stretch at a time
    const strip = sheet(1, TALL, RES, (c) => { c.fillStyle = lg(c, 0, 0, 0, TALL, [0, '#86c85e'], [0.06, '#6fb556'], [0.3, '#579e4c'], [0.7, '#3f8244'], [1, '#2a6238']); c.fillRect(0, 0, 1, TALL); });
    for (let i = 0; i * 256 < LW; i++) { const key = `hf_fm_g${LW}_${i}`; if (!s.textures.exists(key)) texAt(s, key, 256, TALL, RES, (c) => ground(c, i * 256, hf, strip, TOP, TALL, RES)); s.add.image(i * 256, TOP, key).setOrigin(0).setScale(1 / RES).setDepth(0); }
    // the sun: rays that turn slowly, and the glitter under it
    s.tweens.add({ targets: hf.on(SKY, sx, sy, 'hf_fm_rays').setBlendMode('ADD').setDepth(-9.9).setAlpha(0.8), angle: 360, duration: 240000, repeat: -1 });
    for (let i = 0; i < 16; i++) { const k = r(), y = HZ + 1 + k * k * 50, g = hf.on(SKY, sx + (r() - 0.5) * (8 + (y - HZ) * 1.3), y, 'puff').setScale(S * (0.12 + k * 0.2)).setTint(0xfffbe6).setBlendMode('ADD').setDepth(-9.9); s.tweens.add({ targets: g, alpha: 0, duration: 200 + r() * 500, yoyo: true, repeat: -1, delay: r() * 600 }); }
    // gannets working the bay, and seed heads on the wind
    for (let i = 0; i < 5; i++) { const b = hf.on(FAR, -30 - i * 34, 40 + ((i * 13) % 5) * 7, 'hf_fm_bird').setDepth(-9.3).setScale(0.25 * (0.6 + (i % 3) * 0.2)); s.tweens.add({ targets: b, x: b.x + FAR + 220, duration: 60000 + i * 4000, repeat: -1 }); s.tweens.add({ targets: b, scaleY: -b.scaleY * 0.3, duration: 260 + i * 23, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); s.tweens.add({ targets: b, y: b.y + 8, duration: 5200 + i * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
    const cam = s.cameras.main;
    s.add.particles(0, 0, 'puff', { x: { onEmit: () => cam.worldView.x - 20 + Math.random() * (W + 80) } as any, y: { min: 20, max: 150 }, lifespan: { min: 4000, max: 7000 }, speedX: { min: -26, max: -8 }, speedY: { min: -4, max: 5 }, scale: { min: S * 0.04, max: S * 0.11 }, alpha: { values: [0, 0.9, 0.6, 0.9, 0] } as any, tint: 0xfff6d0, blendMode: 'ADD', frequency: 70, advance: 4000 }).setDepth(7);
    // harakeke close to the lens, sliding past faster than the track
    const f = 1.5; for (let x = 60; x < LW * f; x += 170 + r() * 240) s.add.image(HX * (1 - f) + x, 186 + r() * 6, 'hf_fm_flax').setOrigin(0.5, 1).setScale((1 / 1.5) * (0.8 + r() * 0.5)).setScrollFactor(f, 1).setDepth(8).setFlipX(r() < 0.5);
    // under and behind the bike: its shadow on the ground, and the dirt the back wheel throws
    const shadow = hf.below(s.add.image(0, 0, 'hf_shadow').setScale(0.75, 0.6).setDepth(3.9), 'bike');
    const roost = s.add.particles(0, 0, 'puff', { speedX: { min: -110, max: -30 }, speedY: { min: -70, max: -14 }, gravityY: 320, lifespan: { min: 300, max: 650 }, scale: { start: S * 0.13, end: S * 0.05 }, color: [0x7a5a34, 0x5a4022, 0x8fbf5c], frequency: 22, emitting: false }).setDepth(3.5);
    o = { shadow, roost, air: 0 };
  },
  step(hf) {
    if (!o) return;
    const st = hf.state, h = hf.world.height!, gy = h(st.x), over = gy > 180, gap = Math.max(0, gy - st.y);
    o.shadow.setVisible(!over).setPosition(st.x, gy + 0.6).setRotation(over ? 0 : Math.atan2(h(st.x + 2) - h(st.x - 2), 4)).setAlpha(0.8 / (1 + gap / 16)).setScale(0.75 * (1 - Math.min(0.4, gap / 90)), 0.6);
    o.roost.setPosition(st.x - 9 * Math.cos(st.rot), st.y - 1 - 9 * Math.sin(st.rot)); o.roost.emitting = !st.air && st.thr > 0 && st.v > 24;
    if (o.air && !st.air) hf.shake(0.3); o.air = st.air; // both wheels back on the hill
    hf.rays(hf.wx(SKY, SUN[0]), SUN[1], 0.22, 0xfff6dc, 30); // the sun over the open sea: the rider and the flax cut into its shafts as the track turns toward it
  },
};
