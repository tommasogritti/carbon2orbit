import Phaser from 'phaser';
import { S, C2, el, line, lg, rng } from '../art';
import { ameliaYard, ameliaBasin } from '../scenes/FitOut';
import { texAt, soft, add, halo, sheet } from '../hifi';
import type { Look } from '../hifi';
import { puffy, CloudTone } from './flight';

// ------------------------------------------------------------------ Return On Investment: Bollinger's yard at Amelia, Louisiana, 2025 to 2026
// The fit-out runs from July 2025 into 2026, so no one hour is true of it and no source gives one: the light is the
// game's choice. It follows the plain yard, whose sun stands low over the cypress on the far bank in a pale, warm sky: a
// Gulf-coast afternoon, wet air, cumulus building inland, the sun far enough down to lie on the brown water in a road
// and to be crossed by whatever hangs from the crane. Act two is the same hour seen from above, so the sun is up and to
// the right of the picture and every shadow falls down and to the left. The shed, the quay, the gantry, the cypress with
// their moss, the pelican and the water are the plain drawings' own (`ameliaYard`, `ameliaBasin`), relit; the hull, the
// loads, the trolley and the hook are the scene's, lit by Light2D.
const SUN = [250, 58], QX = 120, WY = 136, BX = 218, HL = 176, GY = 24; // the plain yard's own sun; where its quay ends, its water lies, its hull floats and its gantry runs
const TONE: CloudTone = { shade: '#c2c8d4', down: [[0, 'rgba(255,252,240,.95)'], [0.42, 'rgba(255,244,222,.2)'], [0.7, 'rgba(150,150,176,.26)'], [1, 'rgba(120,122,160,.5)']], across: [[0, 'rgba(70,90,140,.2)'], [0.6, 'rgba(255,236,200,0)'], [1, 'rgba(255,226,170,.5)']] };
const GRADE = { threshold: 0.86, bloom: 0.46, exposure: 1.0, contrast: 1.1, saturation: 1.12, shadows: [0.9, 0.97, 1.1] as [number, number, number], highs: [1.08, 1.02, 0.92] as [number, number, number], vignette: 0.4, grain: 0.02, fringe: 0.004 };
const bird = (c: C2) => { c.beginPath(); c.moveTo(0.3, 0.5); c.quadraticCurveTo(1.6, 0.3, 2.5, 1.7); c.quadraticCurveTo(3.4, 0.3, 4.7, 0.5); c.strokeStyle = '#fbfaf2'; c.lineWidth = 0.45; c.stroke(); };
/** One part of a plain drawing on a sheet of its own, with a wash laid over only what was drawn. */
const washed = (draw: (t: C2) => void, wash: (t: C2) => void, res = 4) => (c: C2) => { c.drawImage(sheet(320, 180, res, (t) => { draw(t); t.setTransform(res, 0, 0, res, 0, 0); t.globalCompositeOperation = 'source-atop'; wash(t); }), 0, 0, 320, 180); };

function sky(c: C2) {
  const [sx, sy] = SUN, r = rng(23);
  c.fillStyle = lg(c, 0, 0, 0, 138, [0, '#4a8fcc'], [0.42, '#93c0de'], [0.78, '#e4dcbc'], [1, '#f6dea6']); c.fillRect(0, 0, 320, 140);
  soft(c, 2); for (let i = 0; i < 12; i++) { const x = r() * 330 - 5, y = 22 + r() * 40, len = 30 + r() * 60; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len * 0.5, y - 3 - r() * 3, x + len, y - r() * 5); c.strokeStyle = `rgba(255,252,240,${0.08 + r() * 0.12})`; c.lineWidth = 0.8 + r() * 1.4; c.stroke(); } soft(c, 0); // thin high cloud
  soft(c, 0.8); for (const [x, y, w, seed, a] of [[84, 66, 76, 2, 0.85], [150, 80, 50, 6, 0.7], [20, 74, 60, 1, 0.6]]) { c.globalAlpha = a; c.drawImage(sheet(w, w * 0.34, 3, (t) => puffy(seed, TONE)(t, w, w * 0.34)), x, y, w, w * 0.34); } c.globalAlpha = 1; soft(c, 0); // cumulus building inland, a long way off
  halo(c, sx, sy, 120, '255,236,190', 0.34); halo(c, sx, sy, 42, '255,246,220', 0.6);
  add(c, () => { for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.283 + r() * 0.2, len = 40 + r() * 60, w = 0.03 + r() * 0.03; c.fillStyle = lg(c, sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len, [0, 'rgba(255,244,214,.09)'], [1, 'rgba(255,244,214,0)']); c.beginPath(); c.moveTo(sx, sy); c.arc(sx, sy, len, a - w, a + w); c.closePath(); c.fill(); } });
  el(c, sx, sy, 6, 6, '#fffdf0'); halo(c, sx, sy, 15, '255,255,246', 0.95);
  c.fillStyle = lg(c, 0, 92, 0, 138, [0, 'rgba(255,232,186,0)'], [1, 'rgba(255,232,186,.42)']); c.fillRect(0, 92, 320, 46); // the wet air lying on the land
}
function water(c: C2) { // the water in front of the hull, as the plain overlay is: murky, giving back the pale sky far out, with the sun's road down it
  const r = rng(9), sx = SUN[0] - (QX - 2);
  c.fillStyle = lg(c, 0, 0, 0, 46, [0, 'rgba(214,202,146,.6)'], [0.1, 'rgba(126,132,90,.68)'], [0.36, 'rgba(74,88,62,.86)'], [1, 'rgba(34,44,38,.97)']); c.fillRect(0, 0, 204, 46);
  for (let i = 0; i < 16; i++) { const k = r() ** 1.3, y = 2 + k * 42, x = r() * 210 - 6; line(c, x, y, x + 10 + k * 30, y, `rgba(14,26,22,${0.1 + r() * 0.12})`, 0.5 + k * 0.9); } // the backs of a slow swell
  for (let i = 0; i < 70; i++) { const k = r() ** 1.4, y = 0.8 + k * 44, x = r() * 204, l = 2 + k * 10; line(c, x, y, x + l, y, `rgba(232,236,200,${0.08 + r() * 0.2})`, 0.25 + k * 0.25); }
  for (let i = 0; i < 190; i++) { const k = r(), y = 0.4 + k * k * 45, hw = 3 + y * 0.6, x = sx + (r() - 0.5) * 2 * hw; line(c, x - 0.5 - r() * 2.2, y, x + 0.5 + r() * 2.2, y, `rgba(255,${246 - k * 30},${206 - k * 66},${0.85 - k * 0.5})`, 0.34); } // the sun's road
  halo(c, sx, 1, 34, '255,240,200', 0.26); line(c, 0, 0.3, 204, 0.3, 'rgba(246,240,212,.6)', 0.4);
}
function reeds(c: C2) { // cattails at the water's edge, close to the lens and out of focus
  const r = rng(6); soft(c, 1.5);
  for (let i = 0; i < 20; i++) { const x = 6 + r() * 46, lean = (r() - 0.6) * 14, h = 26 + r() * 26; c.beginPath(); c.moveTo(x, 60); c.quadraticCurveTo(x + lean * 0.3, 60 - h * 0.6, x + lean, 60 - h); c.strokeStyle = i % 5 === 0 ? 'rgba(150,170,90,.85)' : 'rgba(14,30,20,.95)'; c.lineWidth = 1.2; c.stroke(); if (i % 4 === 1) el(c, x + lean, 60 - h + 3, 1.3, 4, 'rgba(60,38,22,.95)'); }
  soft(c, 0);
}

type Im = Phaser.GameObjects.Image; type Em = Phaser.GameObjects.Particles.ParticleEmitter;
let o: { rip: Phaser.GameObjects.TileSprite; beacon: Im; weld: Im; foam: Im; splash: Em; sparks: Em; got: number; knocks: number } | undefined;
export const yardLook: Look = {
  build(scene) {
    texAt(scene, 'hf_yd_sky', 320, 180, 2, sky);
    texAt(scene, 'hf_yd_bank', 320, 180, 3, (c) => { // the far bank: pale with the wet air between, warm on the side toward the sun, and the light coming through under the crowns
      washed((t) => ameliaYard(t, 2), (t) => { t.fillStyle = lg(t, 0, 70, 0, 138, [0, 'rgba(255,236,190,.3)'], [0.6, 'rgba(228,232,212,.22)'], [1, 'rgba(228,232,212,.06)']); t.fillRect(0, 0, 320, 180); t.fillStyle = lg(t, 100, 0, 320, 0, [0, 'rgba(50,80,110,.16)'], [1, 'rgba(255,222,156,.24)']); t.fillRect(0, 0, 320, 180); }, 3)(c);
      halo(c, SUN[0], 110, 64, '255,236,190', 0.26); ameliaYard(c, 4);
    });
    texAt(scene, 'hf_yd_yard', 320, 180, 4, washed((t) => ameliaYard(t, 8), (t) => { t.fillStyle = lg(t, 0, 0, QX, 0, [0, 'rgba(24,34,70,.2)'], [0.6, 'rgba(24,34,70,.04)'], [1, 'rgba(255,228,170,.2)']); t.fillRect(0, 0, 320, 180); t.fillStyle = lg(t, 0, 126, 0, 150, [0, 'rgba(255,236,190,.26)'], [0.3, 'rgba(255,236,190,0)'], [1, 'rgba(10,20,40,.2)']); t.fillRect(0, 120, 320, 60); })); // the shed in its own shade, the quay's edge in the sun
    texAt(scene, 'hf_yd_gantry', 320, 180, 4, washed((t) => ameliaYard(t, 16), (t) => { t.fillStyle = lg(t, 0, 0, 320, 0, [0, 'rgba(60,40,10,.22)'], [0.5, 'rgba(60,40,10,.04)'], [1, 'rgba(255,246,206,.3)']); t.fillRect(0, 0, 320, 180); t.fillStyle = lg(t, 0, GY - 7, 0, GY + 5, [0, 'rgba(255,255,236,.3)'], [0.3, 'rgba(255,255,236,0)'], [1, 'rgba(60,40,10,.2)']); t.fillRect(0, GY - 7, 320, 12); }));
    texAt(scene, 'hf_yd_water', 204, 46, 4, water); texAt(scene, 'hf_yd_reeds', 58, 60, 1.5, reeds); texAt(scene, 'hf_yd_bird', 5, 2.4, 4, bird);
    texAt(scene, 'hf_yd_rip', 102, 46, 2, (c) => { const r = rng(15); for (let i = 0; i < 46; i++) { const k = r() ** 1.3, y = 1 + k * 44, x = r() * 102, l = 2 + k * 8; for (const dx of [-102, 0, 102]) line(c, x + dx, y, x + dx + l, y, `rgba(240,240,206,${0.2 + r() * 0.4})`, 0.2 + k * 0.3); } });
  },
  layers: [{ key: 'hf_yd_sky', w: 320 }, { key: 'hf_yd_bank', w: 320 }, { key: 'hf_yd_yard', w: 320 }, { key: 'hf_yd_gantry', w: 320 }],
  swap: { fo_water: 'hf_yd_water' },
  ambient: 0x9c9eae,
  lights: [
    { x: 360, y: 10, r: 460, color: 0xffe2b0, i: 1.15 },   // the sun, low on the right
    { x: -40, y: 40, r: 320, color: 0x9fc0ff, i: 0.45 },   // the sky, on everything's other side
    { x: BX, y: 196, r: 190, color: 0xa0a870, i: 0.5 },    // the brown water, giving a little back from underneath
  ],
  motes: { tint: 0xfff0c8, count: 36 },
  grade: GRADE,
  live(hf) {
    const s = hf.scene, [sx, sy] = SUN, tw = (targets: object, cfg: object) => s.tweens.add({ targets, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', ...cfg });
    const puff = (x: number, y: number, kx: number, ky: number, tint: number, a: number, depth: number) => s.add.image(x, y, 'puff').setScale(S * kx, S * ky).setTint(tint).setBlendMode('ADD').setAlpha(a).setDepth(depth);
    tw(puff(sx, sy, 3.4, 3.4, 0xfff2d0, 0.22, -9.9), { alpha: 0.34, scale: S * 3.9, duration: 2600 });
    for (let i = 0; i < 3; i++) { const b = s.add.image(-20 - i * 13, 84 + i * 5, 'hf_yd_bird').setScale(0.25).setDepth(-9.4).setAlpha(0.9); s.tweens.add({ targets: b, x: b.x + 380, y: b.y - 10, duration: 46000, repeat: -1, delay: i * 700 }); s.tweens.add({ targets: b, scaleY: -b.scaleY * 0.4, duration: 250 + i * 21, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); } // egrets, going home across the marsh
    const weld = puff(41, 118, 1.5, 1.5, 0xbfe0ff, 0, -8.4); // somebody welding inside the shed
    // the water in front of the hull: ripples that travel, glitter on the sun's road, and the line where it meets the steel
    const rip = s.add.tileSprite(QX - 2, WY, 204 * 2, 46 * 2, 'hf_yd_rip').setOrigin(0).setScale(0.5).setBlendMode('ADD').setAlpha(0.4).setDepth(3.05);
    s.add.particles(0, WY, 'puff', { x: { min: sx - 22, max: sx + 22 }, y: { min: 1, max: 40 }, lifespan: { min: 180, max: 460 }, scale: { start: S * 0.15, end: 0 }, alpha: { start: 1, end: 0 }, tint: 0xfff0c8, blendMode: 'ADD', frequency: 34 }).setDepth(3.1);
    const foam = s.add.image(BX, WY + 0.6, 'puff').setScale(S * 46, S * 0.3).setAlpha(0.3).setDepth(3.06);
    s.add.image(300, 184, 'hf_yd_reeds').setOrigin(0.5, 1).setScale(1 / 1.5).setDepth(8); s.add.image(262, 188, 'hf_yd_reeds').setOrigin(0.5, 1).setScale(0.8 / 1.5).setFlipX(true).setDepth(8);
    // the crane's beacon, and what a load does when it lands or hits something
    const beacon = puff(0, GY + 1, 0.7, 0.7, 0xffb347, 0, 6.1);
    const splash = s.add.particles(0, 0, 'puff', { speedX: { min: -26, max: 26 }, speedY: { min: -22, max: -4 }, gravityY: 70, lifespan: { min: 500, max: 1000 }, scale: { start: S * 0.2, end: S * 0.9 }, alpha: { start: 0.5, end: 0 }, tint: 0xe6ecc8, emitting: false }).setDepth(3.2);
    const sparks = s.add.particles(0, 0, 'puff', { speed: { min: 30, max: 110 }, gravityY: 220, lifespan: { min: 200, max: 520 }, scale: { start: S * 0.1, end: 0 }, tint: [0xffe08a, 0xffb347], blendMode: 'ADD', emitting: false }).setDepth(6.2);
    o = { rip, beacon, weld, foam, splash, sparks, got: hf.state.got || 0, knocks: hf.state.knocks || 0 };
  },
  step(hf, dt) {
    if (!o) return;
    const st = hf.state, t = hf.t, busy = Math.abs(st.v || 0) > 1;
    o.rip.tilePositionX += dt * 10; o.foam.setY((st.deck || 123.5) + 12.6 + 0.2 * Math.sin(t * 1.3)).setAlpha(0.26 + 0.08 * Math.sin(t * 2.1));
    o.beacon.setX(st.tx).setAlpha(Math.sin(t * (busy ? 14 : 3.4)) > 0.2 ? 0.9 : 0.12); // quicker while the trolley travels
    o.weld.setAlpha(Math.max(0, Math.sin(t * 0.7)) > 0.6 ? 0.25 + 0.6 * Math.abs(Math.sin(t * 47) * Math.sin(t * 29)) : 0);
    if (st.got > o.got) { o.splash.explode(9, BX - HL / 2 + 6, WY + 0.6); o.splash.explode(9, BX + HL / 2 - 6, WY + 0.6); } o.got = st.got; // she settles a little deeper: water pushed out at both ends
    if (st.knocks > o.knocks) o.sparks.explode(12, st.x, st.y + 4); o.knocks = st.knocks;
    hf.rays(SUN[0], SUN[1], 0.24, 0xfff0d0, 32); // the sun's shafts: a load crossing it on the hook cuts into them
  },
};

// ------------------------------------------------------------------ the thruster trial: the basin beside the yard, from above
const QEDGE = 40, BANK = 36;
function basinWater(c: C2) {
  const r = rng(71);
  c.fillStyle = lg(c, 60, 180, 300, 20, [0, '#3c4b3a'], [0.5, '#55654a'], [1, '#6f7c56']); c.fillRect(0, 0, 320, 180); // brighter toward the sun
  soft(c, 7); for (let i = 0; i < 30; i++) el(c, QEDGE + r() * 280, BANK + r() * 144, 14 + r() * 30, 5 + r() * 10, i % 3 ? `rgba(160,156,104,${0.05 + r() * 0.07})` : `rgba(16,30,28,${0.08 + r() * 0.08})`); soft(c, 0); // silt, carried slowly
  c.globalAlpha = 0.55; c.drawImage(sheet(320, 180, 4, (t) => { ameliaBasin(t, 1); t.globalCompositeOperation = 'destination-out'; t.fillStyle = 'rgba(0,0,0,.72)'; t.fillRect(0, 0, 320, 180); }), 0, 0, 320, 180); c.globalAlpha = 1; // the plain water's own ripples, kept
  halo(c, 268, 66, 100, '255,240,196', 0.2); halo(c, 268, 66, 40, '255,246,214', 0.16); // the sun, lying on it
  c.fillStyle = lg(c, 0, BANK - 2, 0, BANK + 16, [0, 'rgba(8,22,18,.5)'], [1, 'rgba(8,22,18,0)']); c.fillRect(QEDGE, BANK - 2, 280, 18); // the far bank's trees shade the water under them
}
function basinLand(c: C2) {
  const things = sheet(320, 180, 4, (t) => ameliaBasin(t, 6));
  c.save(); c.globalAlpha = 0.3; soft(c, 1); c.drawImage(sheet(320, 180, 2, (t) => { t.drawImage(things, -1.6, 2.2, 320, 180); t.globalCompositeOperation = 'source-in'; t.fillStyle = '#06120e'; t.fillRect(0, 0, 320, 180); }), 0, 0, 320, 180); c.restore(); soft(c, 0); // everything on the land throws a short shadow, down and to the left
  washed((t) => t.drawImage(things, 0, 0, 320, 180), (t) => { t.fillStyle = lg(t, 0, 180, 320, 0, [0, 'rgba(14,24,50,.2)'], [0.5, 'rgba(14,24,50,0)'], [1, 'rgba(255,230,170,.24)']); t.fillRect(0, 0, 320, 180); })(c);
}
function swirl(c: C2) { const r = rng(5); for (let i = 0; i < 60; i++) { const x = r() * 128, y = r() * 128, l = 3 + r() * 8; for (const [dx, dy] of [[0, 0], [128, 0], [0, 128], [-128, 0], [0, -128]]) { c.beginPath(); c.moveTo(x + dx, y + dy); c.quadraticCurveTo(x + dx + l / 2, y + dy - 1, x + dx + l, y + dy); c.strokeStyle = `rgba(236,240,200,${0.3 + r() * 0.5})`; c.lineWidth = 0.35; c.stroke(); } } } // ripples seen from above, to drift on the wind
function cloud(c: C2) { const r = rng(2); soft(c, 6); for (let i = 0; i < 9; i++) el(c, 70 + r() * 60, 46 + r() * 28, 22 + r() * 22, 12 + r() * 10, 'rgba(4,12,16,.5)'); soft(c, 0); }
function ring(c: C2) { soft(c, 0.8); el(c, 20, 20, 16, 16, undefined, 'rgba(255,255,255,.9)', 1.2); soft(c, 0); }

let b: { rips: Phaser.GameObjects.TileSprite[]; shade: Im; foam: Em; gust: Em; ping: Im; si: number; knocks: number; bx: number; by: number; wa: number } | undefined;
export const basinLook: Look = {
  build(scene) {
    texAt(scene, 'hf_bs_water', 320, 180, 3, basinWater); texAt(scene, 'hf_bs_land', 320, 180, 4, basinLand);
    texAt(scene, 'hf_bs_rip', 128, 128, 2, swirl); texAt(scene, 'hf_bs_cloud', 200, 120, 0.5, cloud); texAt(scene, 'hf_bs_ring', 40, 40, 2, ring);
  },
  layers: [{ key: 'hf_bs_water', w: 320 }, { key: 'hf_bs_land', w: 320 }],
  ambient: 0x8e929e,
  lights: [
    { x: 430, y: -90, r: 640, color: 0xffe6bc, i: 1.2 },   // the sun, up and to the right
    { x: 60, y: 200, r: 260, color: 0x9fc0ff, i: 0.35 },   // the sky, from the other side
  ],
  grade: { ...GRADE, vignette: 0.44 },
  live(hf) {
    const s = hf.scene, barge = hf.tags.barge as Im, girder = hf.tags.girder as Im, r = rng(12);
    const mask = s.make.graphics({}, false).fillStyle(0xffffff).fillRect(QEDGE + 0.4, BANK - 2, 320 - QEDGE, 182 - BANK).createGeometryMask(); // the water only
    const rips = [0.2, 0.12].map((a, i) => s.add.tileSprite(QEDGE, BANK - 2, (320 - QEDGE) * 2, (182 - BANK) * 2, 'hf_bs_rip').setOrigin(0).setScale(0.5).setTileScale(1 + i * 0.6).setBlendMode('ADD').setAlpha(a).setDepth(0.2));
    for (let i = 0; i < 26; i++) { const g = s.add.image(268 + (r() + r() - 1) * 60, 66 + (r() + r() - 1) * 30, 'puff').setScale(S * (0.1 + r() * 0.16)).setTint(0xfff2cc).setBlendMode('ADD').setDepth(0.25); s.tweens.add({ targets: g, alpha: 0, duration: 220 + r() * 600, yoyo: true, repeat: -1, delay: r() * 700 }); } // glitter where the sun lies
    // shadows: the hull's on the water, the gantry's across the water and the hull, and a cloud's, crossing slowly
    const shade = s.add.image(0, 0, barge.texture.key).setScale(S).setTint(0x000000).setAlpha(0.3).setDepth(2.5).setMask(mask);
    s.add.image(girder.x - 2.2, girder.y + 3.6, 'fo_girder').setOrigin(0, 0.5).setScale(S).setTint(0x000000).setAlpha(0.18).setDepth(3.5);
    for (let i = 0; i < 2; i++) { const c = s.add.image(420 + i * 330, 70 + i * 60, 'hf_bs_cloud').setScale(2).setAlpha(0.26).setDepth(4.5); s.tweens.add({ targets: c, x: c.x - 900, y: c.y + 60, duration: 70000, repeat: -1, delay: i * 9000 }); }
    const foam = s.add.particles(0, 0, 'puff', { lifespan: { min: 500, max: 1100 }, scale: { start: S * 0.25, end: S * 1.1 }, alpha: { start: 0.4, end: 0 }, tint: 0xeef2d6, emitting: false }).setDepth(0.9).setMask(mask);
    const gust = s.add.particles(0, 0, 'puff', { x: { min: QEDGE, max: 320 }, y: { min: BANK, max: 180 }, lifespan: { min: 900, max: 1500 }, scaleX: { min: S * 0.9, max: S * 2 }, scaleY: S * 0.05, alpha: { values: [0, 0.4, 0] } as any, tint: 0xf2f4dc, blendMode: 'ADD', frequency: 200, emitting: false, rotate: { onEmit: () => b?.wa || 0 } as any }).setDepth(0.3).setMask(mask); // cat's paws: the wind, written on the water
    const ping = s.add.image(0, 0, 'hf_bs_ring').setBlendMode('ADD').setAlpha(0).setDepth(1.2);
    b = { rips, shade, foam, gust, ping, si: hf.state.si || 0, knocks: hf.state.knocks || 0, bx: hf.state.bx, by: hf.state.by, wa: 0 };
  },
  step(hf, dt) {
    if (!b) return;
    const st = hf.state, s = hf.scene, wm = Math.hypot(st.wx, st.wy), cs = Math.cos(st.hd), sn = Math.sin(st.hd);
    b.rips[0].tilePositionX -= (st.wx * 1.6 + 1.2) * dt * 2; b.rips[0].tilePositionY -= (st.wy * 1.6 + 0.5) * dt * 2; b.rips[1].tilePositionX -= (st.wx + 0.5) * dt * 2; b.rips[1].tilePositionY -= (st.wy - 0.8) * dt * 2; // the ripples run before the wind
    b.shade.setPosition(st.x - 2.4, st.y + 3.4).setRotation(st.hd);
    b.wa = Phaser.Math.RadToDeg(Math.atan2(st.wy, st.wx)); b.gust.emitting = wm > 0.6; b.gust.frequency = Math.max(40, 260 - wm * 60); b.gust.speedX = st.wx * 9; b.gust.speedY = st.wy * 9;
    for (const [u, v] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { // each corner's thruster churns the water it pushes
      const rx = (u * st.bl * cs - v * st.bw * sn) / 2, ry = (u * st.bl * sn + v * st.bw * cs) / 2, d = Math.hypot(rx, ry), tx = st.f0 + (-ry / d) * st.f2 * 0.8, ty = st.f1 + (rx / d) * st.f2 * 0.8, m = Math.hypot(tx, ty);
      if (m > 0.15 && Math.random() < m * 0.5) b.foam.emitParticleAt(st.x + rx * 0.92 - tx * 3, st.y + ry * 0.92 - ty * 3);
    }
    if (st.si > b.si) { b.ping.setPosition(b.bx, b.by).setAlpha(0.9).setScale(0.2).setTint(0x9fe6a0); s.tweens.add({ targets: b.ping, scale: 0.8, alpha: 0, duration: 800, ease: 'Quad.easeOut' }); hf.flash(0.06); } // a box held: a ring going out from it
    if (st.knocks > b.knocks) for (let i = 0; i < 10; i++) b.foam.emitParticleAt(QEDGE + 2, st.y + (Math.random() - 0.5) * 30); // against the quay: water thrown up along the wall
    b.si = st.si; b.knocks = st.knocks; b.bx = st.bx; b.by = st.by;
  },
};
