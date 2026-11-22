import Phaser from 'phaser';
import { D, S, C2, tex, rr, el, line, poly, lg, rg, rng, cloud } from '../art';
import { HX } from '../core';
import { factory } from '../backdrops';
import { texAt, paintNormals, soft, add, halo, sheet, relight, mirrorStrip } from '../hifi';
import type { HiFi, Look } from '../hifi';

// ------------------------------------------------------------------ Rosie the Robot: the Auckland factory on a spring morning
// Rosie was unveiled on 13 November 2019. No source gives an hour, so the light is the game's choice, and it follows the
// plain backdrop, whose roller door already stands "open to an Auckland morning": a low sun comes in through the door and
// down through the roof lights in long shafts, across a white hall that is otherwise lit by its own strip lights, the
// cure oven, the clean room and Rosie's clock. Everything on the wall is still there, drawn by the same code (`factory`
// in backdrops.ts); the doorway is now a hole, with the morning outside on layers of its own behind it.
const WALL = 760, FRONT = 1236, SKY = 350, OUT = 420;
const ROOF = [118, 268, 424, 572, 706], SLANT = 46;          // roof lights, and how far their shafts lean on the way down
const TUBES = [24, 108, 192, 276, 360, 444, 528, 612, 696]; // the strip lights of the plain backdrop
const DOOR = [9, 41, 62, 96];

/** Where the sun lands: under each roof light, and inside the door. */
function pools(m: C2) {
  const blob = (x: number, y: number, rx: number, ry: number, a: number) => { m.save(); m.translate(x, y); m.scale(1, ry / rx); m.fillStyle = rg(m, 0, 0, 0, rx, [0, `rgba(0,0,0,${a})`], [0.55, `rgba(0,0,0,${a * 0.6})`], [1, 'rgba(0,0,0,0)']); m.fillRect(-rx, -rx, rx * 2, rx * 2); m.restore(); };
  for (const x of ROOF) blob(x + SLANT * 0.72, 108, 40, 46, 0.95);
  for (const x of TUBES) blob(x + 20, 56, 46, 40, 0.5);
  blob(84, 112, 44, 40, 0.9); blob(306, 92, 30, 30, 0.6); blob(733, 40, 30, 20, 0.7);
}
const glazing = (c: C2) => { for (const x of ROOF) { c.fillStyle = lg(c, 0, 0, 0, 16, [0, '#fffbe8'], [1, '#ffe6b4']); c.beginPath(); c.moveTo(x - 4, 1.6); c.lineTo(x + 30, 1.6); c.lineTo(x + 34, 16); c.lineTo(x, 16); c.closePath(); c.fill(); for (let k = 1; k < 4; k++) line(c, x - 4 + k * 8.5, 1.6, x + k * 8.5, 16, 'rgba(120,130,150,.6)', 0.4); } };
/** The hall at full brightness: insulated wall panels, steel portal frames, the roof with its lights, the crane rail. */
function shell(c: C2) {
  const r = rng(91);
  c.fillStyle = lg(c, 0, 16, 0, 144, [0, '#b9c3d2'], [0.6, '#c9d1dc'], [1, '#a9b3c2']); c.fillRect(0, 16, WALL, 128);
  for (let x = 0; x < WALL; x += 19) { line(c, x, 18, x, 138, 'rgba(60,80,110,.13)', 0.5); line(c, x + 0.5, 18, x + 0.5, 138, 'rgba(255,255,255,.4)', 0.25); } // panel joints
  line(c, 0, 78, WALL, 78, 'rgba(60,80,110,.12)', 0.5); line(c, 0, 78.5, WALL, 78.5, 'rgba(255,255,255,.35)', 0.25);
  for (let i = 0; i < 60; i++) { const x = r() * WALL, y = 22 + r() * 110; rr(c, x, y, 5 + r() * 12, 0.3, 0, 'rgba(255,255,255,.22)'); } // the sheen of coated steel
  for (let x = 76; x < WALL; x += 152) { // portal frames: an I-section column with a hazard wrap at its foot
    c.fillStyle = lg(c, x - 4, 0, x + 4, 0, [0, '#f2f5f9'], [0.25, '#b4bfce'], [0.5, '#8591a4'], [1, '#aab4c3']); c.fillRect(x - 4, 16, 8, 124);
    rr(c, x - 4, 16, 1.2, 124, 0, '#e8edf3'); rr(c, x + 2.8, 16, 1.2, 124, 0, '#727e92');
    for (let y = 118; y < 138; y += 5) { poly(c, [x - 4, y, x + 4, y + 2.5, x + 4, y + 5, x - 4, y + 2.5], '#f2d14a'); poly(c, [x - 4, y + 2.5, x + 4, y + 5, x + 4, y + 7.5, x - 4, y + 5], '#23262f'); }
    rr(c, x - 6, 138, 12, 3, 0.3, '#727e92');
  }
  rr(c, 0, 138, WALL, 6, 0, '#8f99a8'); rr(c, 0, 137.4, WALL, 0.8, 0, '#4d9be8'); line(c, 0, 138.4, WALL, 138.4, 'rgba(255,255,255,.4)', 0.25);
  // the roof: dark sheeting, pale trusses, the lights let into it, and the crane rail the length of the building
  rr(c, 0, 0, WALL, 17, 0, lg(c, 0, 0, 0, 17, [0, '#5a657a'], [1, '#7c879b']));
  glazing(c);
  for (let x = 0; x < WALL; x += 36) { for (const [a, b] of [[x, x + 18], [x + 36, x + 18]]) { line(c, a, 17, b, 3, '#c0c9d6', 1.3); line(c, a, 16.6, b, 2.6, 'rgba(255,255,255,.55)', 0.3); } el(c, x + 18, 3, 1.5, 1.5, '#d5dce6'); el(c, x, 17, 1.5, 1.5, '#d5dce6'); }
  rr(c, 0, 16.2, WALL, 2.2, 0, lg(c, 0, 16.2, 0, 18.4, [0, '#dfe5ee'], [1, '#8f9aad'])); rr(c, 0, 0, WALL, 1.6, 0, '#aeb8c8');
  rr(c, 0, 9, WALL, 2.6, 0.6, lg(c, 0, 9, 0, 11.6, [0, '#ffe98a'], [0.4, '#f2d14a'], [1, '#b8921c']), 'rgba(11,12,18,.8)', 0.25);
  for (let x = 30; x < WALL; x += 76) rr(c, x, 11.4, 2.4, 5.2, 0, '#8f9aad'); // the brackets the rail hangs from
  for (const x of TUBES) { for (const dx of [6, 34]) line(c, x + dx, 18, x + dx, 21, '#8f9aad', 0.4); rr(c, x - 1, 20.4, 42, 2.6, 0.8, '#aab4c3', 'rgba(60,70,90,.5)', 0.25); }
}
function wall(c: C2) {
  // what is under the floor, seen through the gaps: the cable trench, with its trays and runs of cable
  c.fillStyle = lg(c, 0, 144, 0, 180, [0, '#222a3a'], [1, '#0a0d16']); c.fillRect(0, 144, WALL, 36);
  for (let x = 6; x < WALL; x += 44) rr(c, x, 144, 2.6, 36, 0, '#131824');
  for (const [y, col] of [[151, '#f28c28'], [154.4, '#3f7fd0'], [157.4, '#3f7fd0'], [163, '#8b93a7'], [169, '#23262f']] as [number, string][]) rr(c, 0, y, WALL, 1.5, 0.7, col);
  c.fillStyle = lg(c, 0, 144, 0, 176, [0, 'rgba(6,8,16,.35)'], [1, 'rgba(6,8,16,.85)']); c.fillRect(0, 144, WALL, 36);
  relight(c, sheet(WALL, 144, D, shell), WALL, 144, lg(c, 0, 0, 0, 144, [0, 'rgba(26,36,74,.66)'], [0.4, 'rgba(32,44,82,.46)'], [1, 'rgba(32,44,82,.52)']), pools);
  glazing(c); for (const x of ROOF) halo(c, x + 15, 9, 30, '255,236,190', 0.4); // the roof lights themselves stay bright
  for (const x of ROOF) add(c, () => { c.fillStyle = lg(c, 0, 70, 0, 138, [0, 'rgba(255,214,150,0)'], [0.6, 'rgba(255,214,150,.2)'], [1, 'rgba(255,214,150,.3)']); c.beginPath(); c.moveTo(x + SLANT * 0.4, 70); c.lineTo(x + SLANT * 0.4 + 34, 70); c.lineTo(x + SLANT + 36, 138); c.lineTo(x + SLANT - 2, 138); c.closePath(); c.fill(); }); // the patch of sun each roof light lays on the wall
  const [dx, dy, dw, dh] = DOOR; c.clearRect(dx, dy, dw, dh); // the doorway: the morning shows through from the layers behind
  add(c, () => { for (const [x, d] of [[dx, -1], [dx + dw, 1]]) { c.fillStyle = lg(c, x, 0, x + d * 30, 0, [0, 'rgba(255,226,170,.34)'], [1, 'rgba(255,226,170,0)']); c.fillRect(Math.min(x, x + d * 30), 36, 30, 104); } });
}
/** Everything on the wall and the floor, on its own layer in front of the shafts: in the hall's soft shade, and in full colour where the sun or a lamp finds it. */
function room(c: C2) {
  relight(c, sheet(WALL, 180, D, (t) => factory(t, 2)), WALL, 180, lg(c, 0, 16, 0, 144, [0, 'rgba(26,36,76,.4)'], [1, 'rgba(30,40,80,.26)']), pools);
  for (const x of TUBES) rr(c, x, 21, 40, 2, 1, '#ffffff'); // the strip lights
  factory(c, 8); // the cure oven and Rosie's clock at their own brightness: these are what the bloom catches
  halo(c, 306, 92, 30, '255,160,70', 0.34); halo(c, 733, 37, 28, '124,240,138', 0.24); halo(c, 614, 80, 44, '120,180,255', 0.16);
  const [dx, dy, dw, dh] = DOOR; add(c, () => { c.fillStyle = lg(c, 0, dy + dh - 40, 0, dy + dh, [0, 'rgba(255,236,196,0)'], [1, 'rgba(255,236,196,.3)']); c.fillRect(dx, dy + dh - 40, dw, 40); }); // glare off the apron outside
}
// ---- outside the door: the plain view's own sky, cloud, volcanic cone, street and road, a little after sunrise
function sky(c: C2) {
  c.fillStyle = lg(c, 0, 30, 0, 140, [0, '#3f8fdc'], [0.5, '#9fd0f2'], [0.8, '#ffe9c4'], [1, '#ffd9a0']); c.fillRect(0, 0, 140, 180);
  halo(c, 86, 110, 70, '255,226,160', 0.6); halo(c, 86, 110, 20, '255,246,214', 0.9); el(c, 86, 110, 5, 5, '#fffdf0');
  soft(c, 1.6); for (const [x, y, w] of [[18, 70, 40], [70, 62, 54], [40, 86, 60], [104, 78, 36]]) { el(c, x, y, w / 2, 1.6, 'rgba(255,255,255,.5)'); el(c, x + 3, y + 1.2, w / 2.4, 1, 'rgba(255,190,130,.5)'); } soft(c, 0);
}
function outside(c: C2) {
  c.save(); c.translate(20, 52); cloud(c, 34, 9, 3, '#e8d2c8'); c.restore();
  poly(c, [0, 122, 9, 118, 22, 104, 30, 100, 38, 104, 50, 116, 71, 120, 120, 124, 120, 140, 0, 140], lg(c, 0, 100, 0, 126, [0, '#7fa06c'], [1, '#4f7f58'])); // the volcanic cone: the isthmus is built on them
  poly(c, [30, 100, 38, 104, 50, 116, 60, 118, 44, 119, 34, 108], 'rgba(255,214,140,.5)'); line(c, 22, 104, 30, 100, 'rgba(255,236,190,.8)', 0.4); line(c, 30, 100, 38, 104, 'rgba(255,236,190,.9)', 0.4); // its sunward flank
  poly(c, [0, 127, 9, 126, 71, 122, 120, 121, 120, 140, 0, 140], lg(c, 0, 122, 0, 138, [0, '#8fbf7c'], [1, '#5f9a62']));
  for (let i = 0; i < 17; i++) { const x = 11 + i * 6.6 - 13.2, y = 124 - (i % 3), h = 5 + (i % 3); rr(c, x, y, 4.4, h, 0.2, i % 2 ? '#e8e2d4' : '#cfdcf0'); rr(c, x + 3.2, y, 1.2, h, 0, 'rgba(255,214,150,.8)'); poly(c, [x - 0.4, y, x + 2.2, y - 1.8, x + 4.8, y], i % 3 ? '#8a5a4a' : '#5b6275'); rr(c, x + 0.8, y + 1.6, 1.2, 1.2, 0, 'rgba(255,230,150,.9)'); } // the street, its east walls in the sun
  rr(c, 0, 132, 120, 8, 0, lg(c, 0, 132, 0, 140, [0, '#6f7890'], [1, '#4a5066'])); for (let x = 2; x < 120; x += 9) rr(c, x, 134.2, 4, 0.5, 0, 'rgba(255,255,255,.6)');
  add(c, () => { c.fillStyle = lg(c, 0, 96, 0, 136, [0, 'rgba(255,214,150,0)'], [1, 'rgba(255,214,150,.16)']); c.fillRect(0, 90, 120, 50); }); // morning haze
}
function shaft(c: C2) { // sun through a roof light, leaning with the morning
  soft(c, 3);
  for (const [in0, in1, a] of [[4, 34, 0.42], [10, 28, 0.5]]) { c.fillStyle = lg(c, 0, 0, 0, 124, [0, `rgba(255,224,170,${a})`], [0.6, `rgba(255,214,150,${a * 0.5})`], [1, 'rgba(255,214,150,0)']); c.beginPath(); c.moveTo(in0 + 4, 0); c.lineTo(in1 + 4, 0); c.lineTo(in1 + SLANT + 12, 124); c.lineTo(in0 + SLANT - 4, 124); c.closePath(); c.fill(); }
  soft(c, 0);
}
function front(c: C2) {
  // out of focus and close to the lens: a roof beam, cable drops, and the hooks of the chain hoists
  soft(c, 2.5);
  const ink = 'rgba(26,32,48,.94)', r = rng(53); rr(c, -10, -4, FRONT + 20, 8, 0, ink); rr(c, -10, 3.2, FRONT + 20, 1, 0, 'rgba(242,209,74,.75)');
  for (let x = 60; x < FRONT; x += 120 + r() * 130) {
    if (r() < 0.5) { const drop = 12 + r() * 8; line(c, x, 3, x, drop, ink, 0.9); rr(c, x - 3, drop, 6, 5, 1, 'rgba(242,170,60,.9)'); c.beginPath(); c.arc(x, drop + 8, 2.4, -0.9, Math.PI * 1.15); c.strokeStyle = ink; c.lineWidth = 1.3; c.stroke(); }
    else { c.beginPath(); c.moveTo(x, 3); c.quadraticCurveTo(x + 30, 12 + r() * 8, x + 62, 3); c.strokeStyle = ink; c.lineWidth = 1.1; c.stroke(); }
  }
  soft(c, 0);
}
function crane(c: C2) { // the travelling crane on its rail: end carriage, hoist and hook
  rr(c, 2, 0, 30, 4.4, 0.8, lg(c, 0, 0, 0, 4.4, [0, '#ffe98a'], [1, '#c8961c']), 'rgba(11,12,18,.8)', 0.3); for (const x of [6, 28]) el(c, x, 1, 1.5, 1.5, '#4a5066', 'rgba(11,12,18,.8)', 0.25);
  rr(c, 12, 4.4, 10, 4.6, 0.6, '#5b6275', 'rgba(11,12,18,.8)', 0.3); line(c, 17, 9, 17, 12.4, '#23262f', 0.5); rr(c, 15, 12.2, 4, 2.6, 0.5, '#f28c28', 'rgba(11,12,18,.8)', 0.25);
  c.beginPath(); c.arc(17, 16.4, 1.5, -0.9, Math.PI * 1.15); c.strokeStyle = '#23262f'; c.lineWidth = 0.7; c.stroke(); el(c, 4, 4.9, 0.7, 0.7, '#ff5a3c');
}
function tiles(scene: Phaser.Scene) {
  // a sealed white floor that holds a reflection, with the blue walkway line of the plain one; and a steel mezzanine deck with a yellow nosing
  tex(scene, 't_hf_factory', 16, 16, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 16, [0, '#b4bece'], [0.2, '#929db0'], [1, '#667186']); c.fillRect(0, 0, 16, 16); c.fillStyle = '#e4e9f0'; c.fillRect(0, 0, 16, 0.7);
    c.fillStyle = '#4d9be8'; c.fillRect(0, 2.2, 16, 1); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(0, 2.2, 16, 0.25);
    c.fillStyle = lg(c, 0, 3.2, 0, 10, [0, 'rgba(255,255,255,.14)'], [1, 'rgba(255,255,255,0)']); c.fillRect(0, 3.2, 16, 6.8);
    line(c, 0, 9.4, 16, 9.4, 'rgba(40,56,84,.28)', 0.4); line(c, 0, 9.8, 16, 9.8, 'rgba(255,255,255,.2)', 0.25); line(c, 8, 9.4, 8, 16, 'rgba(40,56,84,.24)', 0.4);
    const r = rng(19); for (let i = 0; i < 10; i++) el(c, r() * 16, 4 + r() * 12, 0.3, 0.3, 'rgba(255,255,255,.4)');
  });
  tex(scene, 't_hf_factory_fill', 16, 16, (c) => { c.fillStyle = '#5c677c'; c.fillRect(0, 0, 16, 16); line(c, 0, 8, 16, 8, 'rgba(30,44,70,.3)', 0.4); line(c, 4, 0, 4, 8, 'rgba(30,44,70,.3)', 0.4); line(c, 12, 8, 12, 16, 'rgba(30,44,70,.3)', 0.4); line(c, 0, 8.5, 16, 8.5, 'rgba(255,255,255,.12)', 0.3); });
  tex(scene, 'p_hf_factory', 16, 6, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 4.6, [0, '#f4f6fa'], [0.3, '#b9c2d0'], [1, '#6f7a8e']); c.fillRect(0, 0, 16, 4.6); c.fillStyle = lg(c, 0, 0, 0, 1, [0, '#ffe98a'], [1, '#e0b828']); c.fillRect(0, 0, 16, 1);
    for (let x = 1; x < 16; x += 3) { line(c, x, 1.6, x + 1.6, 4.2, 'rgba(30,40,60,.4)', 0.3); line(c, x + 0.4, 1.6, x + 2, 4.2, 'rgba(255,255,255,.3)', 0.2); }
    c.fillStyle = '#3a4258'; c.fillRect(0, 4.6, 16, 1.4); rr(c, 1, 4.9, 1.4, 1.1, 0.2, '#5b6275'); rr(c, 13.6, 4.9, 1.4, 1.1, 0.2, '#5b6275');
  });
  paintNormals(scene, 't_hf_factory', (c) => { c.fillStyle = '#80e0b0'; c.fillRect(0, 0, 16, 0.8); c.fillStyle = '#80a8f4'; c.fillRect(0, 0.8, 16, 2.4); });
  paintNormals(scene, 'p_hf_factory', (c) => { c.fillStyle = '#80e0b0'; c.fillRect(0, 0, 16, 1); c.fillStyle = '#80a0f0'; c.fillRect(0, 1, 16, 3.6); c.fillStyle = '#8030c0'; c.fillRect(0, 4.6, 16, 1.4); });
}

let rail: Phaser.GameObjects.Image | undefined, rail0 = 0;
export const factoryLook: Look = {
  build(scene) {
    texAt(scene, 'hf_fc_sky', 140, 180, 2, sky); texAt(scene, 'hf_fc_out', 120, 180, 3, outside);
    texAt(scene, 'hf_fc_wall', WALL, 180, D, wall); texAt(scene, 'hf_fc_room', WALL, 180, D, room);
    texAt(scene, 'hf_fc_refl', WALL, 22, 1, (c) => { c.fillStyle = lg(c, 0, 0, 0, 22, [0, '#ffe6b4'], [1, '#9fd0f2']); c.fillRect(DOOR[0], 0, DOOR[2], 22); mirrorStrip(c, scene, ['hf_fc_wall', 'hf_fc_room'], WALL, 22); });
    texAt(scene, 'hf_fc_shaft', 100, 124, 1, shaft); texAt(scene, 'hf_fc_front', FRONT, 36, 1.5, front); texAt(scene, 'hf_fc_crane', 34, 19, D, crane);
    texAt(scene, 'hf_fc_tube', 56, 12, 2, (c) => { halo(c, 28, 6, 26, '226,238,255', 0.4); rr(c, 8, 5, 40, 2, 1, '#ffffff'); });
    texAt(scene, 'hf_fc_bird', 5, 2.4, D, (c) => { c.beginPath(); c.moveTo(0.3, 0.5); c.quadraticCurveTo(1.6, 0.3, 2.5, 1.7); c.quadraticCurveTo(3.4, 0.3, 4.7, 0.5); c.strokeStyle = '#2a2438'; c.lineWidth = 0.45; c.stroke(); });
    tiles(scene);
  },
  layers: [{ key: 'hf_fc_sky', w: SKY }, { key: 'hf_fc_out', w: OUT }, { key: 'hf_fc_wall', w: WALL, depth: -6 }, { key: 'hf_fc_room', w: WALL, depth: -5 }, { key: 'hf_fc_front', w: FRONT, depth: 8, y: -1 }],
  tiles: 'hf_factory',
  ambient: 0x7c849e,
  lights: [
    { x: 44, y: 132, r: 130, color: 0xffe2b0, i: 0.6, w: WALL },                                                    // the morning, in at the door
    ...ROOF.map((x) => ({ x: x + SLANT + 14, y: 136, r: 104, color: 0xffd9a0, i: 0.62, w: WALL })),                  // sun on the floor under each roof light
    { x: 306, y: 104, r: 84, color: 0xff9a40, i: 0.55, w: WALL, flicker: 0.07 },                                    // the cure oven
    { x: 614, y: 112, r: 90, color: 0x9fd0ff, i: 0.3, w: WALL },                                                    // the clean room
    { x: 733, y: 60, r: 70, color: 0x7cf08a, i: 0.3, w: WALL, flicker: 0.03 },                                      // Rosie's clock
  ],
  heroLight: { r: 60, color: 0xfff4e0, i: 0.2 },
  flares: {
    trimmer: { dx: 0, dy: 28.4, color: 0xffb070, r: 80, i: 0.8, size: 1.7, arc: true },                              // a trimming head, biting
    rosie: { dx: -17, dy: -28.7, color: 0xcfe8ff, r: 96, i: 0.9, size: 2.2, arc: true },                              // Rosie's spindle on the stage in her grip
  },
  deco: true,
  mirror: 0.26,
  reflect: { key: 'hf_fc_refl', w: WALL, alpha: 0.3 },
  motes: { tint: 0xffe8c4, count: 130 },
  grade: { threshold: 0.9, bloom: 0.36, exposure: 0.96, contrast: 1.14, saturation: 1.1, shadows: [0.88, 0.96, 1.14], highs: [1.07, 1.01, 0.93], vignette: 0.42, grain: 0.02, fringe: 0.005 },
  live(hf) {
    const s = hf.scene, tw = (targets: object, cfg: object) => s.tweens.add({ targets, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', ...cfg });
    const lit = (x: number, y: number, sx: number, sy: number, tint: number, a: number) => hf.on(WALL, x, y, 'puff').setScale(S * sx, S * sy).setTint(tint).setBlendMode('ADD').setDepth(-4.7).setAlpha(a);
    // the sun through the roof lights: shafts in the dusty air behind the things on the wall, and again, faintly, in front of the play
    ROOF.forEach((x, i) => {
      tw(hf.on(WALL, x - 4, 17, 'hf_fc_shaft').setOrigin(0).setBlendMode('ADD').setDepth(-5.5).setAlpha(0.34), { alpha: 0.6, duration: 2800 + i * 460 });
      if (i % 2 === 0) tw(hf.on(WALL, x - 14, 17, 'hf_fc_shaft').setOrigin(0).setBlendMode('ADD').setDepth(7.5).setAlpha(0.03).setScale(1.25, 1), { alpha: 0.08, duration: 3600 + i * 300 });
    });
    tw(hf.on(WALL, 2, 44, 'hf_fc_shaft').setOrigin(0).setBlendMode('ADD').setDepth(-5.5).setAlpha(0.3).setScale(1.5, 0.76), { alpha: 0.5, duration: 3200 }); // and in at the door
    TUBES.forEach((x) => hf.on(WALL, x + 20, 22, 'hf_fc_tube').setBlendMode('ADD').setDepth(-5.4).setAlpha(0.8));
    tw(lit(306, 92, 3.2, 3.2, 0xff9a40, 0.3), { alpha: 0.55, duration: 1500 });                                    // the oven, breathing
    tw(lit(733, 36.6, 4.4, 1.6, 0x7cf08a, 0.14), { alpha: 0.3, duration: 1000 });                                  // the clock that matters
    tw(lit(614, 84, 5, 6, 0x8fc4ff, 0.08), { alpha: 0.16, duration: 2600 });                                       // the clean room's own light
    tw(lit(40, 92, 5, 8, 0xffe6b8, 0.08).setDepth(-5.4), { alpha: 0.16, duration: 4200 });                                        // the glare of the morning in the doorway
    for (let i = 0; i < 3; i++) { const b = hf.on(SKY, -12 - i * 9, 66 + i * 7, 'hf_fc_bird').setDepth(-9.8).setAlpha(0.8); s.tweens.add({ targets: b, x: b.x + 150, duration: 30000, repeat: -1, delay: i * 800 }); s.tweens.add({ targets: b, scaleY: -b.scaleY * 0.4, duration: 220 + i * 23, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
    // the overhead crane, working its way up and down the hall
    rail0 = 120; rail = hf.on(WALL, rail0, 9.6, 'hf_fc_crane').setOrigin(0.5, 0).setDepth(-4.6);
    beacon = lit(rail0 - 13, 14.5, 0.5, 0.5, 0xff5a3c, 0.9).setDepth(-4.5); tw(beacon, { alpha: 0.1, duration: 420 });
    // the cable trench: a status light or two down in each gap
    for (const [x0, x1] of hf.pits()) for (const k of [0.3, 0.7]) tw(s.add.image(x0 + (x1 - x0) * k, 158 + k * 8, 'puff').setScale(S * 0.3).setTint(k < 0.5 ? 0x7cf08a : 0xffb347).setBlendMode('ADD').setDepth(0.65), { alpha: 0.1, duration: 500 + k * 900 });
  },
  step(hf: HiFi) { // out along the rail and back, easing at each end
    if (!rail) return;
    const x = HX * (1 - hf.f(WALL)) + rail0 + 250 * (0.5 - 0.5 * Math.cos(hf.t * 0.11));
    rail.setX(x); beacon?.setX(x - 13);
  },
};
let beacon: Phaser.GameObjects.Image | undefined;
