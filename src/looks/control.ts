import Phaser from 'phaser';
import { D, S, C2, tex, rr, el, line, poly, lg, rg, rng } from '../art';
import { HX } from '../core';
import { control, MC } from '../backdrops';
import { texAt, paintNormals, soft, add, halo, sheet, relight, mirrorStrip } from '../hifi';
import type { HiFi, Look } from '../hifi';

// ------------------------------------------------------------------ No Time Toulouse: 21 June 2024, before a winter dawn
// Lift-off was at 6:13 a.m. NZST on the morning of the June solstice. In Auckland astronomical twilight began at 6:00,
// nautical twilight at 6:32 and the sun rose at 7:33; the Moon, 99.5% lit, was low in the south-west and set at 6:40
// (timeanddate.com). So the street is still night: stars, the Moon over the houses, the faintest grey in the east behind
// the building, sodium-free white street lights and the headlights of the staff arriving. Inside, the entry portal glows
// white, reception and the Oculus are lit, and the sunken gallery is near darkness lit by red strips and big screens, as
// the architects describe it. Every object and word is the plain drawing's own (`control` in backdrops.ts).
const WALL = 760, SKY = 360, FAR = 520;
const LAMPS = [34.5, 112.5, 194.5];

/** Where the light falls on the plain drawing: under each street lamp, in the lit rooms, round the screens. */
function pools(m: C2) {
  const blob = (x: number, y: number, rx: number, ry: number, a: number) => { m.save(); m.translate(x, y); m.scale(1, ry / rx); m.fillStyle = rg(m, 0, 0, 0, rx, [0, `rgba(0,0,0,${a})`], [0.55, `rgba(0,0,0,${a * 0.6})`], [1, 'rgba(0,0,0,0)']); m.fillRect(-rx, -rx, rx * 2, rx * 2); m.restore(); };
  for (const x of LAMPS) blob(x, 118, 30, 44, 0.85);
  const [p0, p1] = MC.portal; m.fillStyle = 'rgba(0,0,0,.9)'; m.fillRect(p0, 0, p1 - p0 + 30, 144); // the portal and reception are lit
  blob(MC.model, 80, 60, 80, 0.9); blob(MC.oculus, 70, 54, 80, 0.95);
  const [g0] = MC.gallery; for (const x of [g0 + 35, g0 + 101]) blob(x, 58, 44, 34, 0.75); blob(g0 + 20, 136, 40, 14, 0.5); // the gallery's screens, and its red steps
  const [w0] = MC.glass; blob(w0 + 70, 50, 70, 40, 0.8); blob(w0 + 70, 110, 70, 22, 0.55); // the big wall in mission control, and the consoles
  blob(222, 130, 16, 10, 0.4); // the gate post
}
const dark = (c: C2) => { const [p0] = MC.portal, [g0] = MC.gallery; return lg(c, 0, 0, WALL, 0, [0, 'rgba(4,8,26,.78)'], [(p0 - 4) / WALL, 'rgba(4,8,26,.74)'], [p0 / WALL, 'rgba(8,10,24,.42)'], [g0 / WALL, 'rgba(8,10,24,.42)'], [(g0 + 4) / WALL, 'rgba(0,0,6,.7)'], [1, 'rgba(0,0,10,.62)']); };

/** The sky over the street: deep night overhead, the faintest grey low in the east, stars, and the Moon going down in the south-west. */
function sky(c: C2) {
  c.fillStyle = lg(c, 0, 0, 0, 150, [0, '#02030e'], [0.5, '#070d26'], [0.8, '#122044'], [1, '#22335c']); c.fillRect(0, 0, SKY, 180);
  c.fillStyle = lg(c, SKY * 0.4, 0, SKY, 0, [0, 'rgba(60,90,140,0)'], [1, 'rgba(70,104,150,.28)']); c.fillRect(0, 80, SKY, 70); // the east, behind the building: not yet dawn
  const r = rng(71); for (let i = 0; i < 260; i++) { const x = r() * SKY, y = r() * 120, s = r(); c.globalAlpha = (0.25 + r() * 0.75) * Math.max(0, 1 - y / 135); el(c, x, y, s > 0.95 ? 0.55 : 0.14 + s * 0.2, s > 0.95 ? 0.55 : 0.14 + s * 0.2, s > 0.9 ? '#ffe2b8' : s > 0.8 ? '#bcd4ff' : '#ffffff'); } c.globalAlpha = 1;
  const [mx, my, mr] = MC.moon, x = mx * (SKY / 236) * 0.6 + 6;
  halo(c, x, my, mr * 7, '200,214,255', 0.22); halo(c, x, my, mr * 2.2, '236,240,255', 0.4);
  el(c, x, my, mr, mr, rg(c, x - 2, my - 2, 1, mr, [0, '#fdfdf6'], [0.8, '#e6e4d8'], [1, '#cbc8ba'])); for (const [dx, dy, q] of [[-2.6, -1.4, 2.2], [1.8, 2, 1.6], [3, -2.6, 1.1], [-0.6, 3.6, 1.2]]) el(c, x + dx, my + dy, q, q * 0.8, 'rgba(150,150,140,.3)');
  soft(c, 2); for (const [cx, cy, w] of [[x + 30, my + 10, 60], [x - 10, my + 22, 40], [200, 70, 70], [290, 96, 80]]) el(c, cx, cy, w / 2, 2, 'rgba(120,140,190,.16)'); soft(c, 0); // thin high cloud, lit by the Moon
}
/** Maungarei and the houses under it, drawn by the plain backdrop, a little softened, in moonlight. */
function far(c: C2) {
  const src = sheet(WALL, 180, 2, (t) => control(t, 32)), k = FAR / WALL;
  c.save(); c.scale(k, 1); soft(c, 0.6); c.drawImage(src, 0, 0, WALL, 180); soft(c, 0); c.restore();
  c.fillStyle = lg(c, 0, 80, 0, 130, [0, 'rgba(20,30,60,0)'], [1, 'rgba(20,30,60,.35)']); c.fillRect(0, 80, FAR, 60); // night air between here and the hill
  add(c, () => { const r = rng(9); for (let i = 0; i < 18; i++) { const x = r() * MC.street * k, y = 118 + r() * 8; c.fillStyle = i % 3 ? 'rgba(255,207,122,.9)' : 'rgba(190,224,255,.8)'; c.fillRect(x, y, 1.2, 0.9); halo(c, x, y, 3, '255,200,120', 0.15); } }); // more kitchens with the light on
}
/** The street and the building's shell, in the dark, and where the lamps and rooms light them. */
function wall(c: C2) {
  relight(c, sheet(WALL, 180, D, (t) => control(t, 2)), WALL, 180, dark(c), pools);
}
/** Everything on the street and on the walls, on its own layer in front of the light, and what gives off light at full brightness. */
function room(c: C2) {
  relight(c, sheet(WALL, 180, D, (t) => control(t, 4)), WALL, 180, dark(c), pools);
  control(c, 8); // lamps, windows, the motto, the strips and the screens at their own brightness: what the bloom catches
  for (const x of LAMPS) halo(c, x, 62, 18, '225,236,255', 0.35);
  const [p0, p1] = MC.portal; halo(c, (p0 + p1) / 2, 60, 40, '220,236,255', 0.16);
  halo(c, MC.oculus, 40, 40, '255,232,190', 0.3);
  const [g0, g1] = MC.gallery; for (const x of [g0 + 35, g0 + 101]) halo(c, x, 57, 34, '120,180,255', 0.18);
  add(c, () => { c.fillStyle = lg(c, 0, 118, 0, 144, [0, 'rgba(255,40,40,0)'], [1, 'rgba(255,40,40,.2)']); c.fillRect(g0, 118, g1 - g0, 26); }); // the red ribbon, on the dark floor
  const [w0] = MC.glass; halo(c, w0 + 34, 48, 30, '200,220,255', 0.16); halo(c, w0 + 72, 48, 26, '124,240,138', 0.12);
}
function tiles(scene: Phaser.Scene) {
  // a polished dark floor that holds a reflection, with the red LED ribbon of the plain one; and a stair landing lit red at its riser
  tex(scene, 't_hf_control', 16, 16, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 16, [0, '#2c3140'], [0.2, '#1a1d28'], [1, '#0c0e14']); c.fillRect(0, 0, 16, 16); c.fillStyle = '#6a7288'; c.fillRect(0, 0, 16, 0.5);
    c.fillStyle = '#ff3a3a'; c.fillRect(0, 1.1, 16, 0.6); c.fillStyle = 'rgba(255,60,60,.3)'; c.fillRect(0, 1.7, 16, 1.6);
    c.fillStyle = lg(c, 0, 3.2, 0, 10, [0, 'rgba(160,190,255,.08)'], [1, 'rgba(160,190,255,0)']); c.fillRect(0, 3.2, 16, 6.8);
    line(c, 0, 9.4, 16, 9.4, 'rgba(0,0,0,.4)', 0.4); line(c, 8, 9.4, 8, 16, 'rgba(0,0,0,.35)', 0.4);
  });
  tex(scene, 't_hf_control_fill', 16, 16, (c) => { c.fillStyle = '#0b0c12'; c.fillRect(0, 0, 16, 16); line(c, 0, 8, 16, 8, 'rgba(255,255,255,.04)', 0.4); line(c, 4, 0, 4, 8, 'rgba(255,255,255,.04)', 0.4); line(c, 12, 8, 12, 16, 'rgba(255,255,255,.04)', 0.4); });
  tex(scene, 'p_hf_control', 16, 6, (c) => { c.fillStyle = lg(c, 0, 0, 0, 4.6, [0, '#7c86a0'], [0.3, '#3a4054'], [1, '#161924']); c.fillRect(0, 0, 16, 4.6); c.fillStyle = '#ff3a3a'; c.fillRect(0, 3.6, 16, 1); c.fillStyle = 'rgba(255,80,80,.5)'; c.fillRect(0, 4.6, 16, 1.2); });
  paintNormals(scene, 't_hf_control', (c) => { c.fillStyle = '#80e0b0'; c.fillRect(0, 0, 16, 0.8); c.fillStyle = '#80a8f4'; c.fillRect(0, 0.8, 16, 2.4); });
  paintNormals(scene, 'p_hf_control', (c) => { c.fillStyle = '#80e0b0'; c.fillRect(0, 0, 16, 1); c.fillStyle = '#80a0f0'; c.fillRect(0, 1, 16, 3.6); c.fillStyle = '#8030c0'; c.fillRect(0, 4.6, 16, 1.4); });
}

let car: Phaser.GameObjects.Image | undefined, beams: Phaser.GameObjects.Image[] = [];
export const controlLook: Look = {
  build(scene) {
    texAt(scene, 'hf_mc_sky', SKY, 180, 2, sky); texAt(scene, 'hf_mc_far', FAR, 180, 2, far);
    texAt(scene, 'hf_mc_wall', WALL, 180, D, wall); texAt(scene, 'hf_mc_room', WALL, 180, D, room);
    texAt(scene, 'hf_mc_refl', WALL, 22, 1, (c) => mirrorStrip(c, scene, ['hf_mc_wall', 'hf_mc_room'], WALL, 22));
    texAt(scene, 'hf_mc_car', 34, 14, D, (c) => { // a car pulling in: somebody else up before dawn for the count
      c.beginPath(); c.moveTo(1, 12); c.lineTo(1, 7); c.quadraticCurveTo(5, 5.2, 9, 5); c.quadraticCurveTo(11.6, 1, 17, 1); c.lineTo(23, 1.2); c.quadraticCurveTo(26, 4.6, 31, 5.4); c.lineTo(33, 12); c.closePath(); c.fillStyle = '#20263a'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = 0.35; c.stroke();
      poly(c, [11, 4.8, 16.4, 1.8, 22.4, 1.8, 25, 5], 'rgba(120,150,200,.3)'); for (const x of [7.4, 26]) { el(c, x, 12, 2.4, 2.4, '#07080c'); el(c, x, 12, 1, 1, '#4a5066'); }
      el(c, 32.4, 7.6, 1, 0.8, '#fff6dc'); el(c, 1.4, 7.6, 0.7, 0.7, '#ff3a2a');
    });
    texAt(scene, 'hf_mc_beam', 50, 12, 1, (c) => { c.fillStyle = lg(c, 0, 0, 50, 0, [0, 'rgba(255,246,220,.6)'], [1, 'rgba(255,246,220,0)']); c.beginPath(); c.moveTo(0, 5); c.lineTo(50, 0); c.lineTo(50, 12); c.lineTo(0, 7); c.closePath(); c.fill(); });
    tiles(scene);
  },
  layers: [{ key: 'hf_mc_sky', w: SKY }, { key: 'hf_mc_far', w: FAR }, { key: 'hf_mc_wall', w: WALL, depth: -6 }, { key: 'hf_mc_room', w: WALL, depth: -5 }],
  tiles: 'hf_control',
  ambient: 0x4a5272,
  lights: [
    ...LAMPS.map((x) => ({ x: x + 6, y: 120, r: 90, color: 0xdfe8ff, i: 0.85, w: WALL })),                    // the street lights
    { x: (MC.portal[0] + MC.portal[1]) / 2, y: 110, r: 120, color: 0xeaf2ff, i: 0.7, w: WALL },                  // the white portal
    { x: MC.model, y: 110, r: 110, color: 0xfff0dc, i: 0.6, w: WALL },                                          // reception
    { x: MC.oculus, y: 100, r: 100, color: 0xffe2b8, i: 0.6, w: WALL },                                         // the Oculus
    { x: MC.gallery[0] + 40, y: 140, r: 110, color: 0xff3030, i: 0.7, w: WALL, flicker: 0.03 },                  // the red ribbon in the gallery
    { x: MC.gallery[0] + 70, y: 70, r: 110, color: 0x7fb4ff, i: 0.45, w: WALL, flicker: 0.04 },                  // the gallery's screens
    { x: MC.glass[0] + 70, y: 90, r: 140, color: 0xbcd4ff, i: 0.55, w: WALL, flicker: 0.03 },                   // mission control's big wall
  ],
  heroLight: { r: 60, color: 0xe8eeff, i: 0.3 },
  flares: {
    mc_screen: { dx: 0, dy: 0, color: 0x6f94d0, r: 110, i: 0.5, size: 2.2 },          // the big screen over your console
    mc_desk: { dx: 0, dy: -42, color: 0x5cc06a, r: 60, i: 0.3, size: 1.2 },          // its three monitors
  },
  deco: true,
  mirror: 0.3,
  reflect: { key: 'hf_mc_refl', w: WALL, alpha: 0.32 },
  motes: { tint: 0xc8d4ff, count: 60 },
  grade: { threshold: 0.72, bloom: 0.55, exposure: 1.0, contrast: 1.12, saturation: 1.06, shadows: [0.86, 0.94, 1.2], highs: [1.06, 1.0, 0.95], vignette: 0.5, grain: 0.03, fringe: 0.006, streak: 0.2 }, // the streak: street lamps, headlights and the Moon
  live(hf) {
    const s = hf.scene, tw = (targets: object, cfg: object) => s.tweens.add({ targets, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', ...cfg });
    const lit = (x: number, y: number, sx: number, sy: number, tint: number, a: number) => hf.on(WALL, x, y, 'puff').setScale(S * sx, S * sy).setTint(tint).setBlendMode('ADD').setDepth(-4.7).setAlpha(a);
    // stars that twinkle, the Moon's glow breathing in thin cloud
    const r = rng(5); for (let i = 0; i < 14; i++) tw(hf.on(SKY, r() * SKY * 0.62, r() * 90, 'puff').setScale(S * (0.12 + r() * 0.1)).setBlendMode('ADD').setDepth(-9.8).setAlpha(0.2), { alpha: 0.9, duration: 700 + r() * 1800, delay: r() * 2000 });
    tw(hf.on(SKY, MC.moon[0] * (SKY / 236) * 0.6 + 6, MC.moon[1], 'puff').setScale(S * 5).setTint(0xdce6ff).setBlendMode('ADD').setDepth(-9.7).setAlpha(0.12), { alpha: 0.24, duration: 5200 });
    // the lamps, the motto, the screens and the red ribbon, glowing
    for (const x of LAMPS) tw(lit(x + 8.5, 61.6, 2.2, 1.2, 0xf0f6ff, 0.55), { alpha: 0.75, duration: 1900 + x * 3 });
    tw(lit(MC.portal[0] + 34, 50, 7, 2.4, 0xbfe0ff, 0.12), { alpha: 0.26, duration: 2600 });
    for (const x of [MC.gallery[0] + 35, MC.gallery[0] + 101]) tw(lit(x, 57, 6, 4.4, 0x7fb4ff, 0.1), { alpha: 0.2, duration: 900 + x });
    tw(lit(MC.gallery[0] + 60, 142, 12, 0.8, 0xff3030, 0.35), { alpha: 0.6, duration: 1400 });
    tw(lit(MC.glass[0] + 70, 48, 10, 5, 0xbcd4ff, 0.08), { alpha: 0.16, duration: 2000 });
    // a car pulling in along the street, headlights on, every so often
    car = hf.on(WALL, -40, 128, 'hf_mc_car').setOrigin(0, 0).setDepth(-4.9);
    beams = [hf.on(WALL, -6, 135, 'hf_mc_beam').setOrigin(0, 0.5).setBlendMode('ADD').setDepth(-4.85).setAlpha(0.7)];
  },
  step(hf: HiFi) { // the car drives in from the left and stops at the gate, waits, and the next one comes
    if (!car) return;
    const k = (hf.t % 16) / 16, x = k < 0.55 ? -40 + (k / 0.55) * 210 : 170, a = k > 0.85 ? (1 - k) / 0.15 : 1;
    const base = HX * (1 - hf.f(WALL));
    car.setX(base + x).setAlpha(a); beams[0].setX(base + x + 33).setAlpha(0.7 * a * (k < 0.7 ? 1 : 0.4));
  },
};
