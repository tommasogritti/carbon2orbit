import Phaser from 'phaser';
import { S, C2, tex, rr, el, line, lg, rg, rng } from '../art';
import { HX } from '../core';
import { stennisFar, stennisMid } from '../backdrops';
import { texAt, paintNormals, soft, add, halo, sheet } from '../hifi';
import type { Look, LightDef } from '../hifi';
import { fxSet } from '../hifiFx';

// ------------------------------------------------------------------ Archimedes and the tank: a Gulf-coast afternoon
// The level runs from Mississippi to Virginia and from 2024 to 2026, so no one hour is true of it, and no source gives
// one: the light is the game's choice. It follows the plain backdrop, whose sun stands high in the west over "towering
// afternoon cumulus": a summer afternoon on the Gulf coast (Rocket Lab announced the first Archimedes hot fire at
// Stennis in August 2024), the sun past its height, thunderheads building inland with gold on their sunward side, and
// bright haze lying on the water. The pine line, the LOX barge, the skipjack, the gulls and everything from the
// Stennis gate to Launch Complex 3 are the plain drawings' own (`stennisFar`, `stennisMid`).
const SKY = 380, FAR = 520, MID = 760, HZ = 110, SUN = [74, 30];
/** The two test positions, filled in from the scene's own stands (`fire0`, `fire1`), then the lamps that belong to things on the middle layer. */
const fire: LightDef[] = [0, 1].map(() => ({ x: -400, y: 104, r: 180, color: 0x78acff, i: 0.85, flicker: 0.14 }));

/** A thunderhead: a stack of rounded heads under an anvil, gold toward the sun and blue-grey away from it, its foot lost in the haze. */
function tower(c: C2, x: number, base: number, w: number, h: number, seed: number) {
  const r = rng(seed), W2 = w * 2.6, H2 = h * 1.3, cx = w * 1.3, by = h * 1.25;
  c.drawImage(sheet(W2, H2, 2, (t) => {
    for (let i = 0; i < 54; i++) { const k = r(), rad = w * 0.5 * (1 - k * 0.5) * (0.45 + r() * 0.55); el(t, cx + (r() - 0.5) * w * (1.1 - k * 0.6), by - k * h * 0.94, rad, rad * 0.78, '#fff'); }
    el(t, cx + w * 0.1, by - h, w * 0.86, h * 0.075, '#fff'); el(t, cx + w * 0.3, by - h * 0.94, w * 0.62, h * 0.06, '#fff'); // the anvil, drawn out downwind
    t.globalCompositeOperation = 'source-atop';
    t.fillStyle = lg(t, 0, by - h * 1.08, 0, by, [0, '#fff8e6'], [0.3, '#f0e6dc'], [0.62, '#a9b8d2'], [1, '#8499be']); t.fillRect(0, 0, W2, H2);
    for (let i = 0; i < 34; i++) { const k = r(); el(t, cx + (r() - 0.25) * w * 0.9 * (1 - k * 0.5), by - k * h * 0.9, w * (0.1 + r() * 0.1), w * 0.06, `rgba(76,98,148,${0.1 + r() * 0.16})`); } // the hollows between the heads
    for (let i = 0; i < 26; i++) { const k = r(); el(t, cx - w * (0.5 - k * 0.2) + r() * w * 0.3, by - k * h * 0.9, w * 0.12, w * 0.05, `rgba(255,240,206,${0.2 + r() * 0.3})`); } // and their sunward shoulders
    t.fillStyle = lg(t, cx - w, 0, cx + w, 0, [0, 'rgba(255,226,170,.5)'], [0.45, 'rgba(255,226,170,0)'], [1, 'rgba(56,80,140,.36)']); t.fillRect(0, 0, W2, H2);
    t.globalCompositeOperation = 'destination-in'; t.fillStyle = lg(t, 0, by - h * 0.3, 0, by - 2, [0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']); t.fillRect(0, 0, W2, H2);
  }), x - cx, base - by, W2, H2);
}
function sky(c: C2) {
  const [sx, sy] = SUN, r = rng(61);
  c.fillStyle = lg(c, 0, 0, 0, HZ + 4, [0, '#1857b4'], [0.4, '#4b98dc'], [0.74, '#a6d2ee'], [0.92, '#f0e4c6'], [1, '#ffe6b8']); c.fillRect(0, 0, SKY, 180);
  soft(c, 2); for (let i = 0; i < 12; i++) { const x = r() * SKY, y = 6 + r() * 34, len = 30 + r() * 60; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len * 0.5, y - 3 - r() * 3, x + len, y - r() * 5); c.strokeStyle = `rgba(255,255,255,${0.07 + r() * 0.12})`; c.lineWidth = 0.8 + r() * 1.4; c.stroke(); } // the thin high cloud that goes ahead of a storm
  halo(c, sx, sy, 110, '255,240,200', 0.26); halo(c, sx, sy, 40, '255,248,224', 0.55);
  soft(c, 1.6); tower(c, 222, HZ + 2, 58, 90, 5); tower(c, 336, HZ + 2, 44, 60, 9); tower(c, 132, HZ + 2, 30, 40, 13); soft(c, 0);
  add(c, () => { for (let i = 0; i < 16; i++) { const a = -0.3 + i * 0.2 + r() * 0.08, len = 60 + r() * 80, w = 0.03 + r() * 0.035; c.fillStyle = rg(c, sx, sy, 5, len, [0, 'rgba(255,244,214,.1)'], [1, 'rgba(255,244,214,0)']); c.beginPath(); c.moveTo(sx, sy); c.arc(sx, sy, len, a - w, a + w); c.closePath(); c.fill(); } });
  el(c, sx, sy, 6.4, 6.4, '#fffdf0'); halo(c, sx, sy, 16, '255,255,246', 0.95);
  c.fillStyle = lg(c, 0, HZ - 16, 0, HZ + 6, [0, 'rgba(255,236,196,0)'], [0.7, 'rgba(255,236,196,.3)'], [1, 'rgba(255,236,196,.2)']); c.fillRect(0, HZ - 16, SKY, 22); // the haze of a wet afternoon
}
function far(c: C2) {
  const r = rng(77), wash = (part: number, fn: (t: C2) => void) => c.drawImage(sheet(FAR, 180, 3, (t) => { stennisFar(t, part); t.setTransform(3, 0, 0, 3, 0, 0); t.globalCompositeOperation = 'source-atop'; fn(t); }), 0, 0, FAR, 180);
  wash(4, (t) => { // the plain backdrop's own cumulus: bright crowns, blue-grey bases, warm on the side toward the sun
    t.fillStyle = lg(t, 0, 20, 0, 84, [0, 'rgba(255,252,240,.6)'], [0.45, 'rgba(255,240,210,.1)'], [0.75, 'rgba(110,134,184,.4)'], [1, 'rgba(84,108,164,.6)']); t.fillRect(0, 0, FAR, 110);
    t.fillStyle = lg(t, 0, 0, FAR, 0, [0, 'rgba(255,226,166,.34)'], [0.5, 'rgba(255,226,166,.06)'], [1, 'rgba(70,92,150,.2)']); t.fillRect(0, 0, FAR, 110);
  });
  wash(8, (t) => { // the water: the haze laid on it far out, the sun's road across it, deeper toward us
    t.fillStyle = lg(t, 0, HZ, 0, 180, [0, 'rgba(255,236,200,.62)'], [0.1, 'rgba(150,196,214,.24)'], [0.45, 'rgba(20,70,110,.1)'], [1, 'rgba(6,34,70,.46)']); t.fillRect(0, HZ, FAR, 70);
    for (let i = 0; i < 240; i++) { const k = r(), y = HZ + 0.6 + k * k * 60, hw = 5 + (y - HZ) * 0.9, x = 92 + (r() - 0.5) * 2 * hw; line(t, x - 0.6 - r() * 2.4, y, x + 0.6 + r() * 2.4, y, `rgba(255,${250 - k * 26},${226 - k * 50},${0.85 - k * 0.5})`, 0.34); }
    for (let i = 0; i < 160; i++) { const k = r() ** 1.4, y = HZ + 1 + k * 66, x = r() * FAR; line(t, x, y, x + 2 + k * 9, y, `rgba(8,40,76,${0.1 + r() * 0.16})`, 0.3 + k * 0.4); }
  });
  wash(2, (t) => { t.fillStyle = lg(t, 0, 92, 0, 128, [0, 'rgba(255,230,184,.2)'], [0.6, 'rgba(200,220,232,.14)'], [1, 'rgba(214,226,232,.04)']); t.fillRect(0, 0, FAR, 180); t.fillStyle = lg(t, 0, 0, FAR, 0, [0, 'rgba(255,220,150,.16)'], [1, 'rgba(60,90,150,.12)']); t.fillRect(0, 0, FAR, 180); }); // pines, shores and boats, pale with the wet air between
  c.fillStyle = lg(c, 0, HZ - 5, 0, HZ + 7, [0, 'rgba(255,238,204,0)'], [0.5, 'rgba(255,238,204,.3)'], [1, 'rgba(255,238,204,0)']); c.fillRect(0, HZ - 5, FAR, 12);
}
function mid(c: C2, scene: Phaser.Scene) {
  // everything from the Stennis gate to Launch Complex 3, under a sun over the left shoulder: warm above, cool in its own shade, and a shadow laid out to the right
  const things = sheet(MID, 180, 4, (t) => stennisMid(t, scene, 2));
  const shade = sheet(MID, 180, 2, (t) => { t.transform(1, 0, -0.5, -0.11, 138 * 0.5, 138 * 1.11); t.drawImage(things, 0, 0, MID, 180); t.globalCompositeOperation = 'source-in'; t.fillStyle = '#0b2a26'; t.fillRect(-600, -600, MID + 1200, 1200); });
  c.drawImage(sheet(MID, 180, 4, (t) => {
    stennisMid(t, scene, 1); t.globalCompositeOperation = 'source-atop';
    const q = rng(15); for (let i = 0; i < 1300; i++) { const x = q() * MID, y = 122 + q() * 22, sand = x > 560 || (x > 420 && q() < (x - 420) / 140); line(t, x, y, x + (q() - 0.5) * 1.2, y - 0.5 - q() * 1.3, sand ? (q() < 0.5 ? 'rgba(120,104,60,.2)' : 'rgba(255,248,214,.26)') : q() < 0.5 ? 'rgba(22,84,44,.24)' : 'rgba(226,246,140,.24)', 0.24); } // mown grass, then dune sand
    t.fillStyle = lg(t, 0, 122, 0, 144, [0, 'rgba(255,236,170,.24)'], [0.5, 'rgba(255,236,170,.04)'], [1, 'rgba(10,40,50,.2)']); t.fillRect(0, 120, MID, 26);
    soft(t, 0.8); t.globalAlpha = 0.42; t.drawImage(shade, 0, 0, MID, 180); t.globalAlpha = 1; soft(t, 0);
  }), 0, 0, MID, 180);
  c.drawImage(sheet(MID, 180, 4, (t) => { t.drawImage(things, 0, 0, MID, 180); t.globalCompositeOperation = 'source-atop'; t.fillStyle = lg(t, 0, 4, 0, 140, [0, 'rgba(255,230,176,.24)'], [0.45, 'rgba(255,230,176,.02)'], [1, 'rgba(18,34,84,.26)']); t.fillRect(0, 0, MID, 180); }), 0, 0, MID, 180);
  halo(c, 228, 90, 9, '255,196,110', 0.7); halo(c, 513, 126, 14, '127,208,255', 0.3); halo(c, 577, 114, 10, '124,240,138', 0.4); // the flare stack, January's leak, the inspection beam on the new dome
}
function tiles(scene: Phaser.Scene) {
  // a concrete apron in the sun: a bright arris, form joints, weather stains and whatever grows in the cracks; and a steel grating with a yellow nosing
  tex(scene, 't_hf_stennis', 16, 16, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 16, [0, '#cbc6bc'], [0.2, '#aaa7a2'], [1, '#807e82']); c.fillRect(0, 0, 16, 16); c.fillStyle = '#f6ecd4'; c.fillRect(0, 0, 16, 0.7);
    c.fillStyle = lg(c, 0, 0.7, 0, 5.4, [0, 'rgba(255,238,200,.32)'], [1, 'rgba(255,238,200,0)']); c.fillRect(0, 0.7, 16, 4.7);
    line(c, 0, 8, 16, 8, 'rgba(30,30,40,.22)', 0.4); line(c, 0, 8.45, 16, 8.45, 'rgba(255,255,255,.14)', 0.25); line(c, 9, 0.8, 9, 8, 'rgba(30,30,40,.18)', 0.4); line(c, 4, 8, 4, 16, 'rgba(30,30,40,.18)', 0.4);
    const r = rng(27); for (let i = 0; i < 16; i++) el(c, r() * 16, 2 + r() * 14, 0.3 + r() * 0.5, 0.25 + r() * 0.3, `rgba(50,52,60,${0.1 + r() * 0.2})`);
    for (const x of [2.4, 12.8]) { c.beginPath(); c.moveTo(x, 1.2); c.quadraticCurveTo(x + 0.6, 4, x - 0.3, 7.6); c.strokeStyle = 'rgba(96,64,40,.22)'; c.lineWidth = 0.32; c.stroke(); el(c, x, 1.2, 0.3, 0.3, 'rgba(40,40,48,.5)'); } // rust weeping from a tie hole
    for (let i = 0; i < 4; i++) { const x = 1.5 + r() * 13; line(c, x, 0.9, x - 0.7, 0, '#7fb45e', 0.4); line(c, x, 0.9, x + 0.8, 0.1, '#a9d078', 0.4); }
  });
  tex(scene, 't_hf_stennis_fill', 16, 16, (c) => { c.fillStyle = '#75747a'; c.fillRect(0, 0, 16, 16); line(c, 0, 8, 16, 8, 'rgba(20,20,30,.22)', 0.4); line(c, 6, 0, 6, 8, 'rgba(20,20,30,.2)', 0.4); line(c, 12, 8, 12, 16, 'rgba(20,20,30,.2)', 0.4); line(c, 0, 8.45, 16, 8.45, 'rgba(255,255,255,.08)', 0.25); const r = rng(8); for (let i = 0; i < 9; i++) el(c, r() * 16, r() * 16, 0.5 + r() * 0.6, 0.3 + r() * 0.4, 'rgba(40,40,50,.2)'); });
  tex(scene, 'p_hf_stennis', 16, 6, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 4.4, [0, '#c2cad6'], [0.3, '#8791a4'], [1, '#4a5268']); c.fillRect(0, 0, 16, 4.4); for (let x = 0.6; x < 16; x += 2) { rr(c, x, 1.3, 1, 2.2, 0.2, 'rgba(10,12,20,.6)'); line(c, x + 1.1, 1.3, x + 1.1, 3.5, 'rgba(255,255,255,.24)', 0.18); }
    c.fillStyle = lg(c, 0, 0, 0, 0.9, [0, '#ffe98a'], [1, '#e0b828']); c.fillRect(0, 0, 16, 0.9); c.fillStyle = '#262a38'; c.fillRect(0, 4.4, 16, 1.6); rr(c, 1, 4.8, 1.4, 1.1, 0.2, '#5b6275'); rr(c, 13.6, 4.8, 1.4, 1.1, 0.2, '#5b6275');
  });
  paintNormals(scene, 't_hf_stennis', (c) => { c.fillStyle = '#80e0b0'; c.fillRect(0, 0, 16, 0.9); c.fillStyle = '#80a8f4'; c.fillRect(0, 0.9, 16, 2); });
  paintNormals(scene, 'p_hf_stennis', (c) => { c.fillStyle = '#80e0b0'; c.fillRect(0, 0, 16, 0.9); c.fillStyle = '#80a0f0'; c.fillRect(0, 0.9, 16, 3.5); c.fillStyle = '#8030c0'; c.fillRect(0, 4.4, 16, 1.6); });
}

type Img = Phaser.GameObjects.Image; type Em = Phaser.GameObjects.Particles.ParticleEmitter;
let o: { fires: { x: number; y: number; lv: number; on: number; core: Img; splash: Img; cells: Img[]; steam: Em; jet?: Img }[]; water: Phaser.GameObjects.TileSprite[] } | undefined;
export const stennisLook: Look = {
  build(scene) {
    texAt(scene, 'hf_st_sky', SKY, 180, 2, sky); texAt(scene, 'hf_st_far', FAR, 180, 3, far); texAt(scene, 'hf_st_mid', MID, 180, 4, (c) => mid(c, scene));
    texAt(scene, 'hf_st_shaft', 150, 100, 1, (c) => { soft(c, 3); for (const [x0, x1, a] of [[20, 34, 0.42], [44, 52, 0.32], [60, 78, 0.3]]) { c.fillStyle = lg(c, 0, 0, 0, 100, [0, `rgba(255,240,200,${a})`], [0.7, `rgba(255,240,200,${a * 0.4})`], [1, 'rgba(255,240,200,0)']); c.beginPath(); c.moveTo(x0, 0); c.lineTo(x1, 0); c.lineTo(x1 * 1.6 + 30, 100); c.lineTo(x0 * 1.6 + 16, 100); c.closePath(); c.fill(); } soft(c, 0); });
    texAt(scene, 'hf_st_water', 32, 30, 4, (c) => { c.fillStyle = lg(c, 0, 0, 0, 30, [0, '#9fcad0'], [0.1, '#3f8098'], [1, '#123850']); c.fillRect(0, 1.6, 32, 28.4); c.beginPath(); c.moveTo(0, 1.8); for (let x = 0; x <= 32; x += 8) c.quadraticCurveTo(x + 4, x % 16 ? 1 : 2.6, x + 8, 1.8); c.strokeStyle = 'rgba(255,250,230,.85)'; c.lineWidth = 0.4; c.stroke(); for (const [x, y, w] of [[3, 6, 8], [17, 10, 10], [7, 16, 7], [22, 21, 8], [1, 25, 5]]) line(c, x, y, x + w, y, 'rgba(214,236,240,.3)', 0.35); for (const [x, y] of [[12, 4.4], [26, 7.4], [6, 11]]) line(c, x, y, x + 2.4, y, 'rgba(255,246,214,.7)', 0.3); });
    texAt(scene, 'hf_st_bough', 96, 44, 1.5, (c) => { // a longleaf pine bough, close to the lens: long needles in tufts
      const r = rng(21), ink = 'rgba(10,30,24,.95)'; soft(c, 1.6);
      c.beginPath(); c.moveTo(0, 2); c.quadraticCurveTo(40, 4, 92, 22); c.strokeStyle = 'rgba(30,20,14,.95)'; c.lineWidth = 2.4; c.stroke();
      for (let i = 0; i < 9; i++) { const k = (i + 0.5) / 9, bx = 92 * k, by = 2 + 20 * k * k + (i % 2 ? 3 : 0); for (let n = 0; n < 16; n++) { const a = 0.5 + (n / 15) * 2.1 + (r() - 0.5) * 0.2, len = 10 + r() * 8; line(c, bx, by, bx + Math.cos(a) * len, by + Math.sin(a) * len, n % 5 === 0 ? 'rgba(120,150,70,.8)' : ink, 0.55); } }
      soft(c, 0);
    });
    texAt(scene, 'hf_st_oats', 60, 46, 1.5, (c) => { const r = rng(4); soft(c, 1.5); for (let i = 0; i < 16; i++) { const x = 8 + r() * 44, lean = (r() - 0.3) * 16, h = 22 + r() * 20; c.beginPath(); c.moveTo(x, 46); c.quadraticCurveTo(x + lean * 0.3, 46 - h * 0.6, x + lean, 46 - h); c.strokeStyle = i % 4 === 0 ? 'rgba(214,190,120,.9)' : 'rgba(26,36,22,.95)'; c.lineWidth = 1.1; c.stroke(); if (i % 4 === 0) el(c, x + lean + 1.4, 46 - h + 1.4, 2.6, 1.3, 'rgba(232,210,140,.85)'); } soft(c, 0); }); // sea oats on the dune, bending
    texAt(scene, 'hf_st_gull', 5, 2.4, 4, (c) => { c.beginPath(); c.moveTo(0.3, 0.5); c.quadraticCurveTo(1.6, 0.3, 2.5, 1.7); c.quadraticCurveTo(3.4, 0.3, 4.7, 0.5); c.strokeStyle = '#f6f4ec'; c.lineWidth = 0.45; c.stroke(); });
    tiles(scene);
  },
  layers: [{ key: 'hf_st_sky', w: SKY }, { key: 'hf_st_far', w: FAR }, { key: 'hf_st_mid', w: MID }],
  tiles: 'hf_stennis',
  ambient: 0xa6a4ac,
  lights: [
    ...fire,
    ...[40, 250, 470, 690, 910, 1130, 1320].map((x) => ({ x, y: 128, r: 150, color: 0xffe4b0, i: 0.46 })), // the afternoon lying on the apron
    { x: 228, y: 96, r: 70, color: 0xffb060, i: 0.5, w: MID, flicker: 0.2 },                               // the flare stack
    { x: 513, y: 128, r: 60, color: 0x7fd0ff, i: 0.4, w: MID },                                            // water still running out of January's tank
    { x: 577, y: 116, r: 60, color: 0x7cf08a, i: 0.34, w: MID, flicker: 0.08 },                            // the beam inspecting the new dome
  ],
  heroLight: { r: 66, color: 0xfff0d2, i: 0.26, dx: -16, dy: -20 },
  flares: {
    cryoline: { dx: 0, dy: 10, color: 0xcfeaff, r: 0, i: 0, size: 1.5 },        // frost smoking off a cryogenic line
    lc3: { dx: -31, dy: -79.4, color: 0xff4030, r: 0, i: 0, size: 0.45 },        // the light on a lightning mast
  },
  deco: true, mirror: 0, pit: null,
  motes: { tint: 0xfff0c8, count: 70 },
  grade: { threshold: 0.86, bloom: 0.44, exposure: 1.0, contrast: 1.12, saturation: 1.12, shadows: [0.9, 0.97, 1.14], highs: [1.08, 1.02, 0.92], vignette: 0.4, grain: 0.02, fringe: 0.005 },
  live(hf) {
    const s = hf.scene, LW = hf.world.LW, r = rng(41), [sx, sy] = SUN, tw = (targets: object, cfg: object) => s.tweens.add({ targets, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', ...cfg });
    const lit = (w: number, x: number, y: number, sx2: number, sy2: number, tint: number, a: number, depth: number) => hf.on(w, x, y, 'puff').setScale(S * sx2, S * sy2).setTint(tint).setBlendMode('ADD').setDepth(depth).setAlpha(a);
    // the sun: shafts between the cloud tops, and its road on the water
    [[-10, 0.16], [26, 0.12]].forEach(([dx, a], i) => tw(hf.on(SKY, sx + dx, sy + 4, 'hf_st_shaft').setOrigin(0.2, 0).setBlendMode('ADD').setDepth(-9.9).setAlpha(a * 0.5), { alpha: a, duration: 3400 + i * 900 }));
    for (let i = 0; i < 14; i++) { const k = r(), g = lit(FAR, 92 + (r() - 0.5) * (12 + k * 60), HZ + 2 + k * 30, 0.1 + k * 0.14, 0.1 + k * 0.14, 0xfff4d0, 1, -9.4); s.tweens.add({ targets: g, alpha: 0, duration: 240 + r() * 520, yoyo: true, repeat: -1, delay: r() * 500 }); }
    // things on the middle layer that are alight or alive: the flare stack, the leak, the inspection beam, cold air falling off the LOX sphere
    tw(lit(MID, 228, 89.5, 0.9, 1.5, 0xffb060, 0.9, -8.9), { scaleY: S * 1.1, alpha: 0.55, duration: 110 });
    tw(lit(MID, 513, 126, 1.4, 2.2, 0x7fd0ff, 0.2, -8.9), { alpha: 0.5, duration: 900 }); tw(lit(MID, 577, 114, 1.2, 1.8, 0x7cf08a, 0.25, -8.9), { alpha: 0.7, duration: 420 });
    const fm = hf.f(MID); s.add.particles(HX * (1 - fm) + 166, 128, 'puff', { x: { min: -11, max: 11 }, speedY: { min: 3, max: 8 }, speedX: { min: 1, max: 5 }, lifespan: { min: 1600, max: 2600 }, scale: { start: S * 0.2, end: S * 0.9 }, alpha: { start: 0.3, end: 0 }, tint: 0xf2f8ff, frequency: 190, advance: 2000 }).setScrollFactor(fm, 1).setDepth(-8.9);
    for (let i = 0; i < 4; i++) { const b = hf.on(FAR, 400 + i * 16, 50 + ((i * 7) % 5) * 5, 'hf_st_gull').setDepth(-9.3).setAlpha(0.9); s.tweens.add({ targets: b, x: b.x + 90, y: b.y - 8, duration: 26000 + i * 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); s.tweens.add({ targets: b, scaleY: -b.scaleY * 0.4, duration: 230 + i * 19, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); } // gulls working the Atlantic end
    // the canal and the bays in the gaps of the apron
    const water = hf.pits().map(([x0, x1]) => s.add.tileSprite(x0, 150, (x1 - x0) * 4, 30 * 4, 'hf_st_water').setOrigin(0).setScale(S).setDepth(0.6));
    // close to the lens: pine boughs over the Stennis end, sea oats along the dunes at the Wallops end
    const f = 1.35, at = (x: number, y: number, key: string, k: number) => s.add.image(HX * (1 - f) + x, y, key).setScale(k / 1.5).setScrollFactor(f, 1).setDepth(8);
    for (const [x, k, flip] of [[40, 1.3, 0], [250, 1.1, 1], [470, 1.2, 0], [640, 0.9, 1]]) at(x, -6, 'hf_st_bough', k).setOrigin(0, 0).setFlipX(!!flip);
    for (let x = LW * f * 0.74; x < LW * f + 60; x += 120 + r() * 150) at(x, 190 + r() * 5, 'hf_st_oats', 0.9 + r() * 0.5).setOrigin(0.5, 1);
    // the test positions: the plume's own light, shock cells standing in it, the splash in the trench, steam rolling out either side
    const fires = [0, 1].flatMap((i) => {
      const st = hf.tags['fire' + i] as Img | undefined; if (!st) return []; hf.shade(st);
      const x = st.x, y = st.y, glow = (dy: number, w: number, h: number, tint: number) => s.add.image(x, y + dy, 'puff').setScale(S * w, S * h).setTint(tint).setBlendMode('ADD').setDepth(3.1).setAlpha(0);
      fire[i].x = x; fire[i].y = y - 30;
      // on WebGL the flame is the shader's: methane burning clean and blue, shock diamonds standing in it, cut off by the trench
      const jet = hf.fx('plume', x, y - 54, 76, 112)?.setOrigin(0.5, 0).setDepth(3).setVisible(false); if (jet) (hf.tags['flame' + i] as Em | undefined)?.setVisible(false);
      return [{ x, y, lv: 0, on: 0, jet, core: glow(-30, 2.4, 7, 0x5f98ff), splash: glow(-2, 8, 2.2, 0x86b2ff), cells: [0, 1, 2, 3].map((n) => glow(-48 + n * 10, 0.9, 0.55, 0xa8d0ff)),
        steam: s.add.particles(x, y - 3, 'puff', { speedX: { min: -70, max: 70 }, speedY: { min: -30, max: -6 }, lifespan: { min: 700, max: 1300 }, scale: { start: S * 0.5, end: S * 2.4 }, alpha: { start: 0.13, end: 0 }, tint: 0xc8dcff, frequency: 34, emitting: false }).setDepth(2.5) }];
    });
    o = { fires, water };
  },
  step(hf, dt) {
    if (!o) return;
    const t = hf.t, view = hf.scene.cameras.main.worldView; let hot = 0, hx = 0, hy = 0;
    o.fires.forEach((f, i) => { // a test position lights its surroundings for the second it burns
      const on = hf.state['fire' + i] ? 1 : 0, fl = 0.86 + 0.14 * Math.sin(t * 57 + i) * Math.sin(t * 31), near = Phaser.Math.Clamp(1.3 - Math.abs(f.x - view.centerX) / 190, 0, 1); // how much of it reaches the lens
      f.lv += (on - f.lv) * Math.min(1, dt * (on ? 22 : 9)); hf.power(i, f.lv);
      f.core.setAlpha(f.jet ? 0 : f.lv * 0.3 * fl); f.splash.setAlpha(f.lv * 0.34 * fl).setScale(S * (7 + fl * 2), S * 2.2);
      f.cells.forEach((c, n) => c.setAlpha(f.jet ? 0 : f.lv * (0.5 - n * 0.1) * fl).setScale(S * (0.9 + 0.16 * Math.sin(t * 43 + n * 2)), S * 0.5));
      if (f.jet) { f.jet.setVisible(f.lv > 0.02).setAlpha(Math.min(1, f.lv * 1.4)); fxSet(f.jet, 0.5 + 0.5 * f.lv, 0, 54 / 112, i * 7.3, 1.3, 1.7, 1); }
      if (on && !f.on && near > 0) { hf.shock(f.x, f.y - 6, 0.55 * near); hf.flash(0.16 * near); } // ignition: the air takes the blow, and the eye the light
      if (on) hf.shake(0.36 * near); f.on = on;
      f.steam.emitting = !!on; if (f.lv > hot) { hot = f.lv; hx = f.x; hy = f.y - 24; }
    });
    hf.heat(hx, hy, 46, hot * (o.fires[0]?.jet ? 0.5 : 0.9)); // the shader's flame has its own turbulence
    hf.rays(hf.wx(SKY, SUN[0]), SUN[1], 0.2, 0xfff0d0, 34); // the afternoon sun: the stands, the tower and the pines cut into its shafts
    for (const w of o.water) { w.tilePositionX += 9 * dt * 4; w.y = 150 + Math.sin(t * 1.1 + w.x) * 0.5; }
  },
};
