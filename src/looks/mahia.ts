import Phaser from 'phaser';
import { S, C2, tex, rr, el, line, poly, lg, rg, rng } from '../art';
import { HX, W } from '../core';
import { mahiaFar, mahiaMid } from '../backdrops';
import { texAt, paintNormals, soft, add, halo, sheet, relight } from '../hifi';
import type { HiFi, Look, LightDef } from '../hifi';

// ------------------------------------------------------------------ Road to Māhia: 26 September 2016, in wild weather
// The level's own account: Launch Complex 1 "officially opened on 26 September 2016, in wild weather". So the road to it is
// driven on a spring day of squalls off Hawke Bay: a low slate sky torn open in one place, the sun coming through the tear
// in shafts and travelling over the land in patches, rain that comes and goes on the wind, a steel sea with white on it.
// The long white cloud, Mokotahi, the dolphin, the boat, Portland Island and its light, and everything along the road from
// Wairoa to the range are the plain drawings' own (`mahiaFar`, `mahiaMid`).
const SKY = 380, FAR = 520, MID = 760, GAP = [236, 30], HZ = 101;
const sun: LightDef[] = [{ x: 0, y: 122, r: 150, color: 0xffe2a0, i: 0.8 }, { x: 0, y: 122, r: 130, color: 0xffe2a0, i: 0.6 }]; // patches of sun crossing the ground

function sky(c: C2) {
  const [gx, gy] = GAP, r = rng(17);
  c.fillStyle = lg(c, 0, 0, 0, HZ, [0, '#222c42'], [0.5, '#3f4c66'], [0.84, '#7f8c9e'], [1, '#bcc4c8']); c.fillRect(0, 0, SKY, HZ);
  halo(c, gx, gy, 80, '255,236,190', 0.42); halo(c, gx, gy, 26, '255,248,226', 0.85); // the sun, behind the tear
  soft(c, 5);
  for (let i = 0; i < 90; i++) { // the cloud deck: heavy overhead, breaking toward the horizon, and open round the tear
    const x = r() * (SKY + 40) - 20, y = r() * r() * 84, rx = 18 + r() * 40, ry = 4 + r() * 9, d = Math.hypot(x - gx, (y - gy) * 2.2); if (d < 30) continue;
    const near = Math.max(0, 1 - d / 120), k = y / 84;
    el(c, x, y, rx, ry, `rgba(${22 + k * 60 + near * 30},${28 + k * 62 + near * 24},${46 + k * 60},${0.5 + r() * 0.3})`);
    if (near > 0.2) el(c, x + (gx - x) * 0.08, y + ry * 0.5, rx * 0.8, ry * 0.4, `rgba(255,${214 + near * 30},${150 + near * 50},${near * 0.5})`); // lit edges facing the sun
  }
  soft(c, 0);
  add(c, () => { for (let i = 0; i < 11; i++) { const a = 0.5 + i * 0.2 + r() * 0.06, w = 0.03 + r() * 0.03, len = 150; c.fillStyle = rg(c, gx, gy, 8, len, [0, 'rgba(255,238,190,.15)'], [0.6, 'rgba(255,238,190,.05)'], [1, 'rgba(255,238,190,0)']); c.beginPath(); c.moveTo(gx, gy); c.arc(gx, gy, len, a - w, a + w); c.closePath(); c.fill(); } }); // shafts
  c.fillStyle = lg(c, 0, HZ, 0, 180, [0, '#93a6ac'], [0.06, '#3f6880'], [0.4, '#264c68'], [1, '#142e48']); c.fillRect(0, HZ, SKY, 80);
  soft(c, 4); for (const [x, w] of [[52, 46], [338, 40]]) { c.fillStyle = lg(c, 0, 52, 0, HZ + 2, [0, 'rgba(34,44,66,0)'], [1, 'rgba(34,44,66,.62)']); c.beginPath(); c.moveTo(x, 50); c.lineTo(x + w, 50); c.lineTo(x + w - 22, HZ + 2); c.lineTo(x - 22, HZ + 2); c.closePath(); c.fill(); } soft(c, 0); // squalls out in the bay
  add(c, () => { c.save(); c.translate(gx + 8, HZ + 9); c.scale(1, 0.14); c.fillStyle = rg(c, 0, 0, 0, 74, [0, 'rgba(255,232,170,.55)'], [1, 'rgba(255,232,170,0)']); c.fillRect(-80, -80, 160, 160); c.restore(); }); // where the shafts land on the water
  for (let i = 0; i < 260; i++) { const k = r() ** 1.4, y = HZ + 1.2 + k * 77, x = r() * (SKY + 8) - 4; line(c, x, y, x + 2 + k * 10, y + (r() - 0.5) * 0.4, `rgba(10,28,46,${0.14 + r() * 0.2})`, 0.3 + k * 0.5); }
  for (let i = 0; i < 230; i++) { const k = r() ** 1.3, y = HZ + 1.4 + k * 76, x = r() * SKY, lit = Math.max(0, 1 - Math.abs(x - gx - 8) / 70); line(c, x, y, x + 1 + k * 5.4, y, `rgba(${240 + lit * 15},${246 - lit * 6},${250 - lit * 60},${0.3 + r() * 0.45})`, 0.3 + k * 0.4); } // white horses
  c.fillStyle = lg(c, 0, HZ - 6, 0, HZ + 5, [0, 'rgba(200,210,214,0)'], [0.6, 'rgba(200,210,214,.5)'], [1, 'rgba(200,210,214,0)']); c.fillRect(0, HZ - 6, SKY, 11);
}
function far(c: C2) {
  c.drawImage(sheet(FAR, 180, 3, (t) => { // the long white cloud, under the deck now: grey beneath, and gold where it faces the tear
    mahiaFar(t, 4); t.setTransform(3, 0, 0, 3, 0, 0); t.globalCompositeOperation = 'source-atop';
    t.fillStyle = lg(t, 0, 20, 0, 58, [0, 'rgba(226,230,236,.2)'], [0.5, 'rgba(70,82,104,.5)'], [1, 'rgba(40,50,72,.72)']); t.fillRect(0, 0, FAR, 180);
    t.fillStyle = lg(t, 120, 0, 380, 0, [0, 'rgba(255,226,160,0)'], [1, 'rgba(255,226,160,.5)']); t.fillRect(0, 0, FAR, 180);
  }), 0, 0, FAR, 180);
  c.drawImage(sheet(FAR, 180, 3, (t) => { mahiaFar(t, 2); t.setTransform(3, 0, 0, 3, 0, 0); t.globalCompositeOperation = 'source-atop'; t.fillStyle = lg(t, 0, 60, 0, 112, [0, 'rgba(92,108,128,.5)'], [1, 'rgba(120,138,152,.42)']); t.fillRect(0, 0, FAR, 180); }), 0, 0, FAR, 180); // land and boats, greyed by rain in the air
}
function mid(c: C2) {
  // the road from Wairoa to the range: under cloud, except where the sun has found it
  relight(c, sheet(MID, 180, 4, mahiaMid), MID, 180, 'rgba(18,32,56,.54)', (m) => { for (const [x, y, rx, ry, a] of [[404, 120, 84, 30, 0.95], [706, 112, 70, 30, 0.9], [80, 120, 44, 20, 0.5]]) { m.save(); m.translate(x, y); m.scale(1, ry / rx); m.fillStyle = rg(m, 0, 0, 0, rx, [0, `rgba(0,0,0,${a})`], [0.6, `rgba(0,0,0,${a * 0.6})`], [1, 'rgba(0,0,0,0)']); m.fillRect(-rx, -rx, rx * 2, rx * 2); m.restore(); } });
  c.globalCompositeOperation = 'source-atop'; soft(c, 3); for (const [x, y, rx, ry] of [[404, 120, 70, 22], [706, 112, 58, 22]]) el(c, x, y, rx, ry, 'rgba(255,226,150,.16)'); soft(c, 0);
  const r = rng(6); for (let i = 0; i < 900; i++) { const x = r() * MID, y = 92 + r() * 46; line(c, x, y, x - 0.9 - r() * 0.8, y - 0.5 - r() * 0.8, r() < 0.5 ? 'rgba(14,60,40,.2)' : 'rgba(200,236,150,.16)', 0.25); } // grass laid over by the wind
  c.globalCompositeOperation = 'source-over';
}
function tiles(scene: Phaser.Scene) {
  // wet turf on dark soil, and a rock ledge with moss on it
  tex(scene, 't_hf_mahia', 16, 16, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 16, [0, '#7a5433'], [1, '#432c1b']); c.fillRect(0, 0, 16, 16);
    const r = rng(3); for (let i = 0; i < 11; i++) el(c, r() * 16, 7 + r() * 9, 0.6 + r(), 0.5 + r() * 0.5, 'rgba(40,22,10,.5)'); for (let i = 0; i < 3; i++) { const x = r() * 16, y = 8 + r() * 7; el(c, x, y, 1.1, 0.8, '#7f7a70', 'rgba(0,0,0,.35)', 0.2); el(c, x - 0.3, y - 0.3, 0.4, 0.25, 'rgba(255,255,255,.3)'); }
    for (const x of [3, 9.5, 13]) { c.beginPath(); c.moveTo(x, 5); c.quadraticCurveTo(x + 1.2, 8, x - 0.6, 11); c.strokeStyle = 'rgba(30,16,8,.5)'; c.lineWidth = 0.3; c.stroke(); } // roots
    c.fillStyle = lg(c, 0, 0, 0, 5.4, [0, '#86cc62'], [0.5, '#4f9c4c'], [1, '#2c6c3a']); c.beginPath(); c.moveTo(0, 0); c.lineTo(16, 0); c.lineTo(16, 4.2); for (let x = 16; x >= 0; x -= 2) c.quadraticCurveTo(x - 1, 6.6, x - 2, 4.2); c.closePath(); c.fill();
    for (let i = 0; i < 16; i++) { const x = r() * 16; line(c, x, 1.6, x - 0.5 - r() * 0.6, -0.1 + r() * 0.6, i % 3 ? '#b6e88a' : '#e2f6b8', 0.3); } for (let i = 0; i < 6; i++) el(c, r() * 16, 0.8 + r() * 2.4, 0.18, 0.18, 'rgba(255,255,255,.7)'); // rain on the grass
  });
  tex(scene, 't_hf_mahia_fill', 16, 16, (c) => { c.fillStyle = '#4c3421'; c.fillRect(0, 0, 16, 16); const r = rng(8); for (let i = 0; i < 12; i++) el(c, r() * 16, r() * 16, 0.6 + r(), 0.5 + r() * 0.5, 'rgba(26,14,6,.5)'); for (let i = 0; i < 3; i++) el(c, r() * 16, r() * 16, 1.2, 0.9, '#6f6a60', 'rgba(0,0,0,.35)', 0.2); line(c, 0, 9, 16, 9.6, 'rgba(120,96,60,.2)', 0.4); });
  tex(scene, 'p_hf_mahia', 16, 6, (c) => { c.fillStyle = lg(c, 0, 0, 0, 6, [0, '#b4bac4'], [0.4, '#7c8492'], [1, '#474d5c']); c.beginPath(); c.roundRect(0, 0.6, 16, 5, 1.6); c.fill(); line(c, 4, 3.2, 7, 4.2, 'rgba(0,0,0,.35)', 0.3); line(c, 10, 2.8, 12.4, 4.6, 'rgba(0,0,0,.3)', 0.25); line(c, 1, 5.3, 15, 5.3, 'rgba(0,0,0,.3)', 0.3); c.fillStyle = lg(c, 0, 0, 0, 2, [0, '#8ed068'], [1, '#3f8a46']); c.beginPath(); c.roundRect(0, 0, 16, 1.9, 0.8); c.fill(); for (const x of [2, 6.4, 11, 14]) line(c, x, 1.2, x - 0.6, -0.2, '#c2ee96', 0.3); });
  paintNormals(scene, 't_hf_mahia', (c) => { c.fillStyle = '#80e0b0'; c.fillRect(0, 0, 16, 1.4); c.fillStyle = '#80a8f4'; c.fillRect(0, 1.4, 16, 3.6); });
  paintNormals(scene, 'p_hf_mahia', (c) => { c.fillStyle = '#80e0b0'; c.fillRect(0, 0, 16, 1.2); c.fillStyle = '#80a0f0'; c.fillRect(0, 1.2, 16, 3.2); c.fillStyle = '#8030c0'; c.fillRect(0, 4.4, 16, 1.6); });
}

type Em = Phaser.GameObjects.Particles.ParticleEmitter;
let o: { rain: Em; sea: Phaser.GameObjects.TileSprite[] } | undefined;
export const mahiaLook: Look = {
  build(scene) {
    texAt(scene, 'hf_mh_sky', SKY, 180, 2, sky); texAt(scene, 'hf_mh_far', FAR, 180, 3, far); texAt(scene, 'hf_mh_mid', MID, 180, 4, mid);
    texAt(scene, 'hf_mh_shaft', 120, 110, 1, (c) => { soft(c, 3); for (const [x0, x1, a] of [[40, 54, 0.5], [58, 66, 0.4], [70, 84, 0.34]]) { c.fillStyle = lg(c, 0, 0, 0, 110, [0, `rgba(255,236,186,${a})`], [0.7, `rgba(255,236,186,${a * 0.4})`], [1, 'rgba(255,236,186,0)']); c.beginPath(); c.moveTo(x0, 0); c.lineTo(x1, 0); c.lineTo(x1 * 1.7 - 46, 110); c.lineTo(x0 * 1.7 - 60, 110); c.closePath(); c.fill(); } soft(c, 0); });
    texAt(scene, 'hf_mh_rain', 2, 12, 4, (c) => { c.fillStyle = lg(c, 0, 0, 0, 12, [0, 'rgba(220,232,246,0)'], [1, 'rgba(220,232,246,.9)']); c.fillRect(0.8, 0, 0.4, 12); });
    texAt(scene, 'hf_mh_scud', 200, 44, 1, (c) => { const r = rng(4); soft(c, 6); for (let i = 0; i < 16; i++) el(c, 30 + r() * 140, 12 + r() * 16, 20 + r() * 26, 6 + r() * 7, `rgba(18,24,38,${0.3 + r() * 0.3})`); soft(c, 0); });
    texAt(scene, 'hf_mh_water', 32, 30, 4, (c) => { c.fillStyle = lg(c, 0, 0, 0, 30, [0, '#6f96a8'], [0.12, '#2f5f7c'], [1, '#12283e']); c.fillRect(0, 2, 32, 28); c.beginPath(); c.moveTo(0, 2.4); for (let x = 0; x <= 32; x += 4) c.quadraticCurveTo(x + 2, x % 8 ? 0.4 : 3.6, x + 4, 2.4); c.lineTo(32, 6); c.lineTo(0, 6); c.closePath(); c.fillStyle = '#4f7f96'; c.fill(); c.beginPath(); c.moveTo(0, 2.4); for (let x = 0; x <= 32; x += 4) c.quadraticCurveTo(x + 2, x % 8 ? 0.4 : 3.6, x + 4, 2.4); c.strokeStyle = 'rgba(240,248,255,.9)'; c.lineWidth = 0.5; c.stroke(); for (const [x, y, w] of [[3, 8, 7], [16, 12, 9], [8, 18, 6], [22, 22, 8], [1, 25, 5]]) line(c, x, y, x + w, y, 'rgba(200,226,244,.3)', 0.35); });
    texAt(scene, 'hf_mh_toetoe', 72, 50, 1.5, (c) => { const r = rng(9); soft(c, 1.5); for (let i = 0; i < 18; i++) { const a = -Math.PI / 2 - 0.25 + (i - 9) * 0.11 + (r() - 0.5) * 0.1, len = 20 + r() * 16, ex = 40 + Math.cos(a) * len - 6, ey = 48 + Math.sin(a) * len; c.beginPath(); c.moveTo(40 + (i - 9) * 0.5, 48); c.quadraticCurveTo(40 + Math.cos(a) * len * 0.5, 48 + Math.sin(a) * len * 0.8, ex, ey); c.strokeStyle = i % 5 === 0 ? 'rgba(206,196,150,.85)' : 'rgba(8,24,22,.95)'; c.lineWidth = 1.9 - i * 0.03; c.stroke(); if (i % 5 === 0) el(c, ex - 1, ey, 2.6, 1.1, 'rgba(226,216,176,.8)'); } soft(c, 0); }); // toetoe, bent by the wind
    tiles(scene);
  },
  layers: [{ key: 'hf_mh_sky', w: SKY }, { key: 'hf_mh_far', w: FAR }, { key: 'hf_mh_mid', w: MID }],
  tiles: 'hf_mahia',
  ambient: 0x9aa3b8,
  lights: sun,
  heroLight: { r: 66, color: 0xeef4ff, i: 0.26 },
  deco: true, mirror: 0, pit: null,
  grade: { threshold: 0.84, bloom: 0.42, exposure: 1.02, contrast: 1.14, saturation: 1.0, shadows: [0.84, 0.96, 1.14], highs: [1.1, 1.03, 0.9], vignette: 0.5, grain: 0.028, fringe: 0.006 },
  live(hf) {
    const s = hf.scene, LW = hf.world.LW, [gx, gy] = GAP, r = rng(31), cam = s.cameras.main, tw = (targets: object, cfg: object) => s.tweens.add({ targets, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', ...cfg });
    for (let i = 0; i < 5; i++) (hf.tags['cloud' + i] as Phaser.GameObjects.Image | undefined)?.setTint(0x6c7890).setAlpha(0.85); // the scene's own drifting clouds, as scud under the deck
    [[-56, 0.3], [-18, 0.24], [18, 0.2]].forEach(([dx, a], i) => tw(hf.on(SKY, gx + dx, gy - 2, 'hf_mh_shaft').setOrigin(0.5, 0).setBlendMode('ADD').setDepth(-9.9).setAlpha(a * 0.5), { alpha: a, duration: 3000 + i * 900 }));
    for (let i = 0; i < 12; i++) { const k = r(), g = hf.on(SKY, gx + 8 + (r() - 0.5) * 110, HZ + 5 + k * 9, 'puff').setScale(S * (0.12 + k * 0.14)).setTint(0xfff0c0).setBlendMode('ADD').setDepth(-9.9); s.tweens.add({ targets: g, alpha: 0, duration: 240 + r() * 500, yoyo: true, repeat: -1, delay: r() * 500 }); } // glitter where the light lands
    tw(hf.on(FAR, 463, 76, 'puff').setScale(S * 0.9).setTint(0xfff2c0).setBlendMode('ADD').setDepth(-9.3).setAlpha(0), { alpha: 1, duration: 1500, hold: 200 }); // Portland Island light
    // the sea in the gaps of the road, heaving
    const sea = hf.pits().map(([x0, x1]) => s.add.tileSprite(x0, 150, (x1 - x0) * 4, 30 * 4, 'hf_mh_water').setOrigin(0).setScale(S).setDepth(0.6));
    for (const [x0, x1] of hf.pits()) s.add.particles((x0 + x1) / 2, 153, 'puff', { x: { min: -(x1 - x0) / 2, max: (x1 - x0) / 2 }, speedY: { min: -46, max: -14 }, speedX: { min: -30, max: 4 }, gravityY: 120, lifespan: { min: 400, max: 800 }, scale: { start: S * 0.16, end: S * 0.05 }, alpha: { start: 0.8, end: 0 }, tint: 0xeaf4ff, frequency: 90 }).setDepth(0.7);
    // weather: rain on the wind, torn cloud going over low, and grass seed and leaves blown through
    const rain = s.add.particles(0, 0, 'hf_mh_rain', { x: { onEmit: () => cam.worldView.x - 10 + Math.random() * (W + 90) } as any, y: -14, speedX: { min: -110, max: -80 }, speedY: { min: 330, max: 420 }, rotate: 14, lifespan: 560, scale: S, alpha: { min: 0.25, max: 0.6 }, frequency: 7, quantity: 2 }).setDepth(6.5);
    s.add.particles(0, 0, 'puff', { x: { onEmit: () => cam.worldView.x + W + 10 } as any, y: { min: 30, max: 150 }, speedX: { min: -190, max: -110 }, speedY: { min: -16, max: 24 }, lifespan: { min: 1800, max: 2600 }, scale: { min: S * 0.06, max: S * 0.14 }, alpha: { start: 0.8, end: 0.2 }, tint: [0xd8e8b0, 0xb6d890, 0xe8dcc0], frequency: 150 }).setDepth(6.4);
    for (let i = 0; i < 4; i++) { const sc = s.add.image(HX * 0.4 + i * 330 + 60, -6 + (i % 2) * 8, 'hf_mh_scud').setScrollFactor(0.6, 1).setDepth(7.5).setAlpha(0.6).setScale(1.3 + (i % 3) * 0.3, 1); s.tweens.add({ targets: sc, x: sc.x - 420, duration: 26000 + i * 3000, repeat: -1 }); }
    const f = 1.4; for (let x = 90; x < LW * f; x += 230 + r() * 260) s.add.image(HX * (1 - f) + x, 190 + r() * 6, 'hf_mh_toetoe').setOrigin(0.5, 1).setScale((1 / 1.5) * (0.8 + r() * 0.4)).setScrollFactor(f, 1).setDepth(8);
    o = { rain, sea };
  },
  step(hf, dt) {
    if (!o) return;
    const t = hf.t, LW = hf.world.LW, span = LW + 400;
    sun[0].x = ((t * 16 + 260) % span) - 200; sun[1].x = ((t * 16 + 260 + span * 0.52) % span) - 200; // the sun patches travel with the cloud, left to right
    o.rain.frequency = 5 + 16 * (0.5 + 0.5 * Math.sin(t * 0.33 + 1)); // squalls come through and ease
    hf.rays(hf.wx(SKY, GAP[0]), GAP[1], 0.3, 0xffecc0, 40, 1.0); // the tear in the cloud: its shafts are cut by the scud going over and by whatever stands on the skyline
    for (const w of o.sea) { w.tilePositionX += 26 * dt * 4; w.y = 150 + Math.sin(t * 1.7 + w.x) * 1.1; }
  },
};
