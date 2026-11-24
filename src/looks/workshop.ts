import Phaser from 'phaser';
import { D, S, C2, tex, rr, el, line, poly, lg, rg, rng } from '../art';
import { workshop } from '../backdrops';
import { texAt, paintNormals, soft, add, halo, sheet, relight, mirrorStrip } from '../hifi';
import type { HiFi, Look } from '../hifi';

// ------------------------------------------------------------------ The Rocket Bike: the appliance works after hours
// The chapter is a night shift nobody is paid for: the level's own wall clock says twenty to midnight, the windows show
// the Southern Cross, and the intro says "after hours the workshop becomes a propulsion lab". So the works is dark, and
// what light there is comes from the pendant lamps over each bay, a few fluorescent tubes left on (one of them failing),
// the moon through the windows, a CRT, the welding arms and the street lamp outside the roller door.
// Everything on the wall is still there, drawn by the same code (`workshop` in backdrops.ts), now found by those lamps.
const WALL = 760, FRONT = 1236;
const LAMPS = [60, 208, 266, 304, 362, 498, 660], COOL = 498;                                  // the pendant lamps of the plain backdrop
const TUBES: [number, number][] = [[118, 0.9], [250, 0.5], [432, 1], [560, 0.8], [694, 0.6]], FLICK = 2; // fluorescent fittings on the truss, and how bright each is
const WINS: number[][] = [[18, 34, 54, 50], [318, 40, 50, 40], [574, 44, 34, 44]];
let tube: Phaser.GameObjects.Image | undefined, tubeLamp = -1;

/** Where light reaches: the pool under each lamp and tube, the moon's patch below each window, the street lamp at the door. */
function pools(m: C2) {
  const blob = (x: number, y: number, rx: number, ry: number, a: number) => { m.save(); m.translate(x, y); m.scale(1, ry / rx); m.fillStyle = rg(m, 0, 0, 0, rx, [0, `rgba(0,0,0,${a})`], [0.5, `rgba(0,0,0,${a * 0.6})`], [1, 'rgba(0,0,0,0)']); m.fillRect(-rx, -rx, rx * 2, rx * 2); m.restore(); };
  for (const x of LAMPS) blob(x, 94, 48, 68, 0.95);
  for (const [x, on] of TUBES) blob(x, 42, 62, 46, on * 0.5);
  for (const [x, y, w, h] of WINS) blob(x + w / 2 + 16, y + h + 30, 36, 44, 0.4);
  blob(744, 108, 36, 54, 0.7); blob(543, 108, 18, 16, 0.5);
}
/** The shell at working brightness: brick, a painted dado, pilasters, conduit, the roof trusses, the duct and the light fittings. */
function shell(c: C2) {
  const r = rng(77);
  c.fillStyle = lg(c, 0, 16, 0, 144, [0, '#585d76'], [0.55, '#666b84'], [1, '#4e526a']); c.fillRect(0, 16, WALL, 128);
  for (let y = 18.4, row = 0; y < 139; y += 4.6, row++) for (let x = row % 2 ? -5 : 0; x < WALL; x += 10) {
    const k = r(); rr(c, x + 0.3, y + 0.3, 9.4, 4, 0.3, k < 0.1 ? 'rgba(168,100,80,.5)' : k < 0.28 ? 'rgba(36,40,60,.34)' : k < 0.5 ? 'rgba(196,200,224,.13)' : 'rgba(126,92,88,.22)');
    if (k > 0.93) line(c, x + 1, y + 0.7, x + 8, y + 0.7, 'rgba(255,255,255,.12)', 0.25);
  }
  c.fillStyle = 'rgba(52,104,98,.6)'; c.fillRect(0, 106, WALL, 34); line(c, 0, 106, WALL, 106, 'rgba(232,226,200,.55)', 0.8); // the dado every works had
  for (let i = 0; i < 34; i++) { const x = r() * WALL, y = 20 + r() * 70; c.fillStyle = lg(c, 0, y, 0, y + 30 + r() * 40, [0, 'rgba(18,20,34,.22)'], [1, 'rgba(18,20,34,0)']); c.fillRect(x, y, 0.8 + r() * 2.2, 70); } // years of drips
  for (const x of [126, 288, 452, 618]) { rr(c, x - 5, 16, 10, 128, 0, lg(c, x - 5, 0, x + 5, 0, [0, '#8a90a8'], [0.3, '#6a7088'], [1, '#3c4058'])); rr(c, x - 6.4, 136, 12.8, 8, 0.4, '#4a4e66'); }
  line(c, 0, 29, WALL, 29, '#3a3f56', 0.9); line(c, 0, 28.6, WALL, 28.6, 'rgba(255,255,255,.14)', 0.25); // conduit, with a drop to each switch
  for (const x of [108, 300, 470, 612]) { rr(c, x - 2, 27, 4, 4, 0.5, '#4a5068'); line(c, x, 31, x, 92, '#3a3f56', 0.7); rr(c, x - 2.2, 92, 4.4, 6, 0.6, '#c8ccd8', 'rgba(0,0,0,.4)', 0.25); }
  rr(c, 0, 139, WALL, 5, 0, '#2c3044'); line(c, 0, 139.2, WALL, 139.2, 'rgba(255,255,255,.18)', 0.3);
  // the roof: trusses with gusset plates, the extraction duct, a cable tray, and the tube fittings on their chains
  rr(c, 0, 0, WALL, 17, 0, '#1e2234');
  for (let x = 0; x < WALL; x += 38) { for (const [a, b] of [[x, x + 19], [x + 38, x + 19]]) { line(c, a, 16, b, 2.6, '#4f5876', 1.4); line(c, a, 15.6, b, 2.2, 'rgba(190,205,250,.22)', 0.3); } el(c, x + 19, 2.6, 1.7, 1.7, '#5c6688'); el(c, x, 16, 1.7, 1.7, '#5c6688'); }
  rr(c, 0, 0, WALL, 2.6, 0, '#56607f'); rr(c, 0, 15.4, WALL, 3.2, 0, lg(c, 0, 15.4, 0, 18.6, [0, '#707a9a'], [1, '#353c58']));
  rr(c, 96, 7.2, 250, 6.8, 3.4, lg(c, 0, 7.2, 0, 14, [0, '#b4bed6'], [0.3, '#7f89a2'], [1, '#3d4458'])); line(c, 100, 8.2, 342, 8.2, 'rgba(255,255,255,.35)', 0.3);
  for (let x = 110; x < 340; x += 38) rr(c, x, 6.4, 2.2, 8.6, 0, '#2a2f42'); for (const x of [150, 264]) for (let k = 0; k < 4; k++) line(c, x + k * 1.6, 12.6, x + k * 1.6 + 1, 13.6, 'rgba(0,0,0,.45)', 0.4);
  rr(c, 392, 9.4, 330, 1.8, 0, '#5a627c'); for (let x = 400; x < 716; x += 44) { line(c, x, 2.6, x, 9.4, '#3a4058', 0.5); c.beginPath(); c.moveTo(x + 4, 11.2); c.quadraticCurveTo(x + 22, 13.6 + r() * 2.4, x + 40, 11.2); c.strokeStyle = '#161927'; c.lineWidth = 0.6; c.stroke(); }
  for (const [x] of TUBES) { for (const dx of [-13, 13]) line(c, x + dx, 16, x + dx, 19, '#2a2f42', 0.4); rr(c, x - 18, 18.8, 36, 2.4, 0.6, '#8a92aa', 'rgba(0,0,0,.4)', 0.25); }
}
function wall(c: C2) {
  // what is under the floor, seen through the service pits: footings and two runs of pipe
  c.fillStyle = lg(c, 0, 144, 0, 180, [0, '#0c0e18'], [1, '#040508']); c.fillRect(0, 144, WALL, 36);
  for (let x = 8; x < WALL; x += 52) rr(c, x, 144, 3.4, 36, 0, '#08090f');
  for (const y of [153, 162]) rr(c, 0, y, WALL, 2.4, 1.2, lg(c, 0, y, 0, y + 2.4, [0, '#3a4257'], [1, '#12151f']));
  relight(c, sheet(WALL, 180, D, shell), WALL, 180, lg(c, 0, 0, 0, 144, [0, 'rgba(4,5,14,.9)'], [1, 'rgba(6,8,20,.8)']), pools);
  for (const [x, y, w, h] of WINS) add(c, () => { c.fillStyle = rg(c, x + w / 2, y + h / 2, 10, 58, [0, 'rgba(110,140,255,.20)'], [1, 'rgba(110,140,255,0)']); c.fillRect(x - 40, y - 34, w + 80, h + 68); }); // moonlight on the brick round each window
}
/** Everything in the works, on its own layer in front of the moonlight: in the dark, and in its true colours under the lamps. */
function room(c: C2) {
  relight(c, sheet(WALL, 180, D, (t) => workshop(t, 2)), WALL, 180, lg(c, 0, 16, 0, 144, [0, 'rgba(6,8,22,.8)'], [1, 'rgba(8,10,24,.68)']), pools);
  workshop(c, 4); // the night in the windows, the CRT's trace and the street outside the door, at their own brightness
  halo(c, 543, 106, 26, '79,224,122', 0.3); halo(c, 387, 116, 16, '255,170,80', 0.35); halo(c, 750, 106, 30, '255,225,160', 0.4); halo(c, 60, 46, 12, '240,240,255', 0.3);
  for (const [x, y, w, h] of WINS) add(c, () => { c.fillStyle = lg(c, 0, y, 0, y + h, [0, 'rgba(80,110,220,.10)'], [1, 'rgba(120,160,255,.26)']); c.fillRect(x, y, w, h); });
}
function moon(c: C2) { // moonlight through a window, falling across the floor
  soft(c, 3);
  for (const [a, k] of [[0, 0.5], [8, 0.4]]) { c.fillStyle = lg(c, 0, 0, 0, 104, [0, `rgba(150,180,255,${k})`], [0.6, `rgba(130,160,255,${k * 0.45})`], [1, 'rgba(130,160,255,0)']); c.beginPath(); c.moveTo(6 + a, 4); c.lineTo(30 + a, 4); c.lineTo(74 + a, 104); c.lineTo(34 + a, 104); c.closePath(); c.fill(); }
  soft(c, 0);
}
function cone(c: C2) { // the beam under a pendant lamp
  soft(c, 3.5);
  c.fillStyle = lg(c, 0, 0, 0, 116, [0, 'rgba(255,255,255,.6)'], [0.25, 'rgba(255,255,255,.3)'], [1, 'rgba(255,255,255,0)']); c.beginPath(); c.moveTo(45, 2); c.lineTo(55, 2); c.lineTo(96, 116); c.lineTo(4, 116); c.closePath(); c.fill();
  soft(c, 0); halo(c, 50, 4, 16, '255,255,255', 0.8);
}
function front(c: C2) {
  // out of focus and close to the lens: a roof beam, chain hoists with their hooks, and slack cable
  soft(c, 2.5);
  const ink = 'rgba(3,4,9,.96)', r = rng(29); rr(c, -10, -4, FRONT + 20, 8.2, 0, ink);
  for (let x = 46; x < FRONT; x += 110 + r() * 120) {
    if (r() < 0.55) { const drop = 15 + r() * 11; for (let y = 4; y < drop; y += 2.3) el(c, x, y, 0.9, 1.3, undefined, ink, 0.7); rr(c, x - 2.2, drop - 0.6, 4.4, 3.4, 1, ink); c.beginPath(); c.arc(x, drop + 5, 2.6, -0.9, Math.PI * 1.15); c.strokeStyle = ink; c.lineWidth = 1.3; c.stroke(); }
    else { c.beginPath(); c.moveTo(x, 3); c.quadraticCurveTo(x + 32, 15 + r() * 9, x + 66, 3); c.strokeStyle = ink; c.lineWidth = 1.1; c.stroke(); }
  }
  soft(c, 0);
}
function tiles(scene: Phaser.Scene) {
  // a sealed concrete floor, worn where people walk, with the hazard edge the plain floor has; and a timber bench shelf on steel angle
  tex(scene, 't_hf_workshop', 16, 16, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 16, [0, '#687086'], [0.16, '#4d5469'], [1, '#383d50']); c.fillRect(0, 0, 16, 16);
    c.fillStyle = '#c0c8dc'; c.fillRect(0, 0, 16, 0.7);
    for (let i = 0; i < 4; i++) { poly(c, [i * 4, 0.7, i * 4 + 2, 0.7, i * 4 + 1, 2.3, i * 4 - 1, 2.3], '#eec23e'); poly(c, [i * 4 + 2, 0.7, i * 4 + 4, 0.7, i * 4 + 3, 2.3, i * 4 + 1, 2.3], '#1b1d29'); }
    c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(0, 2.3, 16, 0.4); c.fillStyle = lg(c, 0, 2.7, 0, 9, [0, 'rgba(220,228,255,.14)'], [1, 'rgba(220,228,255,0)']); c.fillRect(0, 2.7, 16, 6.3);
    line(c, 0, 9.4, 16, 9.4, 'rgba(0,0,0,.28)', 0.4); line(c, 0, 9.8, 16, 9.8, 'rgba(255,255,255,.05)', 0.25); line(c, 8, 2.7, 8, 9.4, 'rgba(0,0,0,.22)', 0.35); line(c, 3, 9.4, 3, 16, 'rgba(0,0,0,.22)', 0.35); line(c, 12, 9.4, 12, 16, 'rgba(0,0,0,.22)', 0.35);
    const r = rng(9); for (let i = 0; i < 18; i++) el(c, r() * 16, 3 + r() * 13, 0.25, 0.25, `rgba(255,255,255,${0.05 + r() * 0.1})`); el(c, 11, 5.6, 2.4, 0.8, 'rgba(0,0,0,.16)');
  });
  tex(scene, 't_hf_workshop_fill', 16, 16, (c) => { c.fillStyle = '#2d3142'; c.fillRect(0, 0, 16, 16); line(c, 0, 8, 16, 8, 'rgba(0,0,0,.3)', 0.4); line(c, 5, 0, 5, 8, 'rgba(0,0,0,.3)', 0.4); line(c, 11, 8, 11, 16, 'rgba(0,0,0,.3)', 0.4); line(c, 0, 8.5, 16, 8.5, 'rgba(255,255,255,.05)', 0.3); const r = rng(4); for (let i = 0; i < 9; i++) el(c, r() * 16, r() * 16, 0.3, 0.3, 'rgba(255,255,255,.06)'); });
  tex(scene, 'p_hf_workshop', 16, 6, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 4, [0, '#e2b078'], [0.25, '#b88450'], [1, '#7c5230']); c.fillRect(0, 0, 16, 4); line(c, 0, 0.3, 16, 0.3, '#f6d6a4', 0.4);
    for (const [x0, x1, y] of [[1, 9, 1.4], [6, 15, 2.3], [0, 6, 3.1]]) line(c, x0, y, x1, y + 0.2, 'rgba(80,46,20,.45)', 0.22); el(c, 12.4, 1.5, 0.7, 0.4, 'rgba(70,40,18,.5)');
    c.fillStyle = lg(c, 0, 4, 0, 5.2, [0, '#5c6480'], [1, '#2a2f44']); c.fillRect(0, 4, 16, 1.2); rr(c, 1, 4.6, 1.5, 1.4, 0.2, '#3a4058'); rr(c, 13.5, 4.6, 1.5, 1.4, 0.2, '#3a4058');
  });
  paintNormals(scene, 't_hf_workshop', (c) => { c.fillStyle = '#80e0b0'; c.fillRect(0, 0, 16, 0.8); c.fillStyle = '#80a8f4'; c.fillRect(0, 0.8, 16, 1.6); });
  paintNormals(scene, 'p_hf_workshop', (c) => { c.fillStyle = '#80e0b0'; c.fillRect(0, 0, 16, 0.8); c.fillStyle = '#80a0f0'; c.fillRect(0, 0.8, 16, 3.2); c.fillStyle = '#8030c0'; c.fillRect(0, 4, 16, 2); });
}

const lamps = [60, 208, 285, 362, 498, 660]; // lights on the floor: one per pendant, the close pair sharing one
export const workshopLook: Look = {
  build(scene) {
    texAt(scene, 'hf_ws_wall', WALL, 180, D, wall); texAt(scene, 'hf_ws_room', WALL, 180, D, room);
    texAt(scene, 'hf_ws_refl', WALL, 22, 1, (c) => mirrorStrip(c, scene, ['hf_ws_wall', 'hf_ws_room'], WALL, 22));
    texAt(scene, 'hf_ws_moon', 84, 104, 1, moon); texAt(scene, 'hf_ws_cone', 100, 118, 1, cone); texAt(scene, 'hf_ws_front', FRONT, 36, 1.5, front);
    texAt(scene, 'hf_ws_tube', 48, 12, 2, (c) => { halo(c, 24, 6, 22, '200,225,255', 0.5); rr(c, 7, 4.9, 34, 2.2, 1.1, '#f4f9ff'); });
    tiles(scene);
  },
  layers: [{ key: 'hf_ws_wall', w: WALL, depth: -6 }, { key: 'hf_ws_room', w: WALL, depth: -5 }, { key: 'hf_ws_front', w: FRONT, depth: 8, y: -1 }],
  tiles: 'hf_workshop',
  ambient: 0x4c5278,
  lights: [
    ...lamps.map((x) => ({ x, y: 120, r: 104, color: x === COOL ? 0xcfe0ff : 0xffca8a, i: x === 285 ? 0.95 : 0.8, w: WALL })),
    { x: 62, y: 138, r: 84, color: 0x7f9cff, i: 0.3, w: WALL }, { x: 362, y: 138, r: 80, color: 0x7f9cff, i: 0.22, w: WALL }, // the moon's patch under a window
    { x: 543, y: 112, r: 60, color: 0x4fe07a, i: 0.3, w: WALL, flicker: 0.12 },                                             // the CRT
    { x: TUBES[FLICK][0], y: 60, r: 130, color: 0xd8e8ff, i: 0.32, w: WALL },                                               // the tube that is on its way out
  ],
  heroLight: { r: 60, color: 0xfff0dc, i: 0.34 },
  flares: { welder: { dx: 1, dy: 29, color: 0xbfe0ff, r: 120, i: 1.2, size: 3.2, arc: true }, vent: { dx: 0, dy: -0.4, color: 0xff5a40, r: 0, i: 0, size: 1.5 } },
  deco: true,
  mirror: 0.2,
  reflect: { key: 'hf_ws_refl', w: WALL, alpha: 0.42 },
  motes: { tint: 0xffe2b8, count: 120 },
  grade: { threshold: 0.74, bloom: 0.55, exposure: 1.08, contrast: 1.14, saturation: 1.08, shadows: [0.84, 0.95, 1.18], highs: [1.08, 1.0, 0.9], vignette: 0.55, grain: 0.03, fringe: 0.006, streak: 0.22 }, // the streak: a welder's arc, a bulb, a star in the window
  live(hf) {
    const s = hf.scene, tw = (targets: object, cfg: object) => s.tweens.add({ targets, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', ...cfg });
    const lit = (x: number, y: number, sx: number, sy: number, tint: number, a: number) => hf.on(WALL, x, y, 'puff').setScale(S * sx, S * sy).setTint(tint).setBlendMode('ADD').setDepth(-4.7).setAlpha(a);
    WINS.forEach(([x, y, w], i) => tw(hf.on(WALL, x + w * 0.1, y + 2, 'hf_ws_moon').setOrigin(0).setBlendMode('ADD').setDepth(-5.5).setAlpha(0.6), { alpha: 0.95, duration: 4200 + i * 700 }));
    LAMPS.forEach((x, i) => { // each pendant: its beam in the dusty air, and the bulb itself
      const tint = x === COOL ? 0xcfe0ff : 0xffd49a;
      tw(hf.on(WALL, x, 32, 'hf_ws_cone').setOrigin(0.5, 0).setBlendMode('ADD').setDepth(-4.8).setAlpha(0.5).setTint(tint), { alpha: 0.66, duration: 2300 + i * 310 });
      lit(x, 33.6, 1.5, 0.8, tint, 0.95);
    });
    tubeLamp = (workshopLook.lights || []).length - 1; tube = undefined;
    TUBES.forEach(([x, on], i) => { const t = hf.on(WALL, x, 20, 'hf_ws_tube').setBlendMode('ADD').setDepth(-4.7).setAlpha(on); if (i === FLICK) tube = t; });
    tw(lit(543, 106, 2.4, 1.7, 0x4fe07a, 0.2), { alpha: 0.42, duration: 140 });                     // the CRT's scan
    tw(lit(387, 116.5, 1.6, 0.9, 0xffaa50, 0.25), { alpha: 0.6, duration: 1700 });                  // the oven on test
    tw(lit(750, 104.6, 1.3, 0.9, 0xffe6b0, 0.8), { alpha: 0.6, duration: 2600 });                   // the street lamp on Princes Street
    for (const [dx, dy] of [[14, 12], [14, 30], [8, 21], [20, 19], [31, 26], [39, 29]]) tw(lit(18 + dx, 34 + dy, 0.34, 0.34, 0xfff8dc, 0.9), { alpha: 0.25, duration: 500 + dx * 37 + dy * 11 }); // Crux and the Pointers twinkle
    for (const [x0, x1] of hf.pits()) s.add.particles((x0 + x1) / 2, 150, 'puff', { x: { min: -(x1 - x0) / 2 + 3, max: (x1 - x0) / 2 - 3 }, speedY: { min: -8, max: -3 }, lifespan: 4200, scale: { start: S * 0.5, end: S * 1.8 }, alpha: { start: 0.1, end: 0 }, tint: 0x9fb4e0, frequency: 520, advance: 3000 }).setDepth(0.65); // a breath of warm air out of each service pit
  },
  step(hf) { // a tired fluorescent tube: mostly on, with runs of stutter
    const t = hf.t, on = Math.sin(t * 0.9) > 0.55 && Math.sin(t * 37) * Math.sin(t * 23.3) > -0.1 ? 0.12 : 1;
    tube?.setAlpha(on); hf.power(tubeLamp, on);
  },
};
