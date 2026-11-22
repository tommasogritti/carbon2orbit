import Phaser from 'phaser';
import { D, S, C2, tex, rr, el, poly, line, lg, rg, rng } from './art';
import { HX } from './core';
import { listing } from './backdrops';
import { texAt, paintNormals, soft, add, halo } from './hifi';
import { workshopLook } from './looks/workshop';
import { mercuryLook } from './looks/mercury';
import { standLook } from './looks/stand';
import { farmLook } from './looks/farm';
import { mahiaLook } from './looks/mahia';
import { lc1Looks } from './looks/lc1';
import { factoryLook } from './looks/factory';
import { reviewLook } from './looks/review';
import { mapLook } from './looks/map';
import { titleLook } from './looks/title';
import { twopadsLook } from './looks/twopads';
import { hazeLook } from './looks/haze';
import { editLook } from './looks/edit';
import { diaryLook } from './looks/diary';
import type { HiFi, Look } from './hifi';

// The looks a level's theme can name (see hifi.ts). A look is the art and the numbers; the engine is shared.
// To give another level the treatment: write a Look in src/looks/, list it in LOOKS below, and name it from the scene
// (docs/ARCHITECTURE.md, "The hi-fi layer"; steps in .claude/skills/add-level/HIFI.md). `listing`, the first, lives here.


// ------------------------------------------------------------------ RKLB rings the bell: Long Beach at first light
// The bell rang at 9:30 a.m. in New York, which is 6:30 a.m. in Long Beach: a few minutes after sunrise on 25 August.
// So the headquarters gets a glass wall, and through it the harbour city at golden hour with its night lights still on.
// Everything that was on the wall before is still there, drawn by the same code (`listing`), now lit by the room.
const WALL = 760, SKY = 348, FAR = 420, MID = 518, NEAR = 640, FRONT = 1236;
const BAYS: [number, number][] = [[6, 196], [292, 498]], GLASS_TOP = 17, SILL = 130;
const beacons: number[][] = [], steam: number[][] = [];

function sky(c: C2) {
  const r = rng(11), hz = 112, sx = 120, sy = 93; // the sun starts behind the engine rack and crosses the second run of glass as you walk
  c.fillStyle = lg(c, 0, 0, 0, hz, [0, '#0c1230'], [0.3, '#27275f'], [0.56, '#66387a'], [0.76, '#b9506a'], [0.9, '#ee7a50'], [1, '#ffb46c']); c.fillRect(0, 0, SKY, hz);
  for (let i = 0; i < 70; i++) el(c, r() * SKY, r() * 52, 0.22 + r() * 0.2, 0.22 + r() * 0.2, `rgba(255,255,255,${0.12 + r() * 0.4})`);
  halo(c, sx, sy, 150, '255,160,100', 0.4); halo(c, sx, sy, 46, '255,206,140', 0.55);
  soft(c, 3);
  for (let i = 0; i < 26; i++) { // long clouds, dark on top and lit from below by the sun that has only just cleared the horizon
    const x = r() * SKY, y = 30 + r() * 68, rx = 16 + r() * 44, ry = 1 + r() * 2.6, near = Math.max(0, 1 - Math.hypot(x - sx, (y - sy) * 2) / 190);
    el(c, x, y - ry * 0.7, rx, ry, `rgba(${60 + near * 60},${44 + near * 30},${96 - near * 10},${0.5})`);
    el(c, x + 3, y + ry * 0.2, rx * 0.92, ry * 0.7, `rgba(255,${150 + near * 70},${120 + near * 40},${0.25 + near * 0.5})`);
  }
  soft(c, 0);
  el(c, sx, sy, 6.2, 6.2, '#fffdf0'); halo(c, sx, sy, 15, '255,246,220', 0.9);
  add(c, () => { c.fillStyle = lg(c, sx - 80, 0, sx + 80, 0, [0, 'rgba(255,230,190,0)'], [0.5, 'rgba(255,230,190,.75)'], [1, 'rgba(255,230,190,0)']); c.fillRect(sx - 80, sy - 0.5, 160, 1); }); // a lens streak through the sun
  c.fillStyle = lg(c, 0, hz, 0, 180, [0, '#f2a878'], [0.06, '#a65e7c'], [0.4, '#3a3166'], [1, '#12152e']); c.fillRect(0, hz, SKY, 180 - hz);
  for (let i = 0; i < 90; i++) { const k = r() * r(), y = hz + 0.6 + k * 36, hw = 3 + (y - hz) * 0.9, x = sx + (r() - 0.5) * 2 * hw; line(c, x - 1 - r() * 3, y, x + 1 + r() * 3, y, `rgba(255,${214 - k * 60},${160 - k * 40},${0.75 - k * 0.5})`, 0.5); } // the sun's path on the water
}
function far(c: C2) {
  const r = rng(23), hz = 112, pts = [0, hz];
  for (let x = 0; x <= FAR; x += 8) pts.push(x, hz - 5 - 4 * Math.sin(x * 0.021) - 3 * Math.sin(x * 0.057 + 1) - (x > 300 ? (x - 300) * 0.05 : 0)); // the Palos Verdes hills, far across the bay
  pts.push(FAR, hz); poly(c, pts, '#93587f');
  for (let x = -4; x < FAR; ) { // the downtown skyline, tallest around the middle
    const w = 5 + r() * 9, peak = Math.exp(-(((x - 330) / 60) ** 2)), h = 5 + r() * 9 + peak * (8 + r() * 16);
    rr(c, x, hz - h, w, h + 1, 0.3, r() < 0.5 ? '#6d4683' : '#7a4c86');
    for (let y = hz - h + 1.5; y < hz - 1.5; y += 2.4) for (let wx = x + 1; wx < x + w - 1; wx += 1.9) if (r() < 0.22) rr(c, wx, y, 0.8, 1, 0, 'rgba(255,214,150,.75)');
    x += w + (r() < 0.3 ? 2 + r() * 6 : 0.4);
  }
  { // a wheel on the waterfront
    const x = 58, y = hz - 12; el(c, x, y, 9, 9, undefined, '#5d3c76', 0.6); for (let i = 0; i < 12; i++) { const a = i * 0.5236; line(c, x, y, x + Math.cos(a) * 9, y + Math.sin(a) * 9, '#5d3c76', 0.3); el(c, x + Math.cos(a) * 9, y + Math.sin(a) * 9, 0.5, 0.5, i % 2 ? '#ffd9a0' : '#ff9ad0'); }
    line(c, x, y, x - 4, hz, '#5d3c76', 0.7); line(c, x, y, x + 4, hz, '#5d3c76', 0.7);
  }
  for (const x of [108, 127, 146, 196, 215, 234]) { // the port's ship-to-shore cranes, booms up
    const col = '#573770', y = hz; line(c, x, y, x, y - 15, col, 0.9); line(c, x + 7, y, x + 7, y - 15, col, 0.9); line(c, x - 1, y - 9, x + 8, y - 9, col, 0.7); line(c, x, y - 15, x + 7, y - 15, col, 0.9);
    line(c, x + 3.5, y - 15, x + 3.5, y - 21, col, 0.7); line(c, x + 7, y - 15, x + 13, y - 27, col, 0.8); line(c, x + 3.5, y - 21, x + 13, y - 27, col, 0.4); line(c, x + 3.5, y - 21, x - 3, y - 15, col, 0.4); line(c, x, y - 15, x - 4, y - 15, col, 0.8);
    el(c, x + 13, y - 27, 0.5, 0.5, '#ff6a5a'); beacons.push([FAR, x + 13, y - 27]);
  }
  { const x = 158, y = hz; poly(c, [x, y - 3.4, x + 34, y - 3.4, x + 31, y + 0.4, x + 2, y + 0.4], '#4d3166'); rr(c, x + 27, y - 8.4, 4, 5, 0.3, '#5d3c76'); for (let i = 0; i < 7; i++) for (let j = 0; j < 2; j++) rr(c, x + 3 + i * 3.3, y - 5.4 - j * 1.8, 3, 1.6, 0, ['#9a5a78', '#7a4c86', '#b06a70', '#6d4683'][(i + j * 3) % 4]); } // a container ship alongside
  c.save(); c.globalCompositeOperation = 'source-atop'; c.fillStyle = lg(c, 0, 76, 0, 114, [0, 'rgba(255,170,116,0)'], [1, 'rgba(255,170,116,.5)']); c.fillRect(0, 60, FAR, 60); c.restore(); // haze: the air between here and there
}
function mid(c: C2) {
  const r = rng(41), base = 142;
  for (let x = -8, n = 0; x < MID; n++) {
    const w = 18 + r() * 24, h = x > 70 && x < 300 ? 20 + r() * 15 : 38 + r() * 52, top = base - h, /* low roofs where the sun comes up, towers either side */ glass = n % 3 === 1, sunSide = x + w / 2 < 300 ? 1 : -1;
    if (glass) { c.fillStyle = sunSide > 0 ? lg(c, x, 0, x + w, 0, [0, '#3a2f66'], [0.6, '#8a4f7c'], [1, '#f09a70']) : lg(c, x, 0, x + w, 0, [0, '#f09a70'], [0.4, '#8a4f7c'], [1, '#3a2f66']); c.fillRect(x, top, w, h); for (let y = top + 3; y < base; y += 3) line(c, x, y, x + w, y, 'rgba(20,14,44,.35)', 0.35); for (let wx = x + 4; wx < x + w; wx += 4) line(c, wx, top, wx, base, 'rgba(20,14,44,.22)', 0.3); }
    else {
      c.fillStyle = lg(c, 0, top, 0, base, [0, '#3d3068'], [1, '#231c44']); c.fillRect(x, top, w, h);
      for (let y = top + 4; y < base - 4; y += 5.2) for (let wx = x + 2.4; wx < x + w - 2.6; wx += 3.6) { const k = r(); rr(c, wx, y, 2, 2.8, 0.2, k < 0.24 ? '#ffd590' : k < 0.3 ? '#ffb46a' : k < 0.34 ? '#9fe6ff' : 'rgba(255,150,120,.10)'); }
    }
    rr(c, sunSide > 0 ? x + w - 0.7 : x, top, 0.7, h, 0, 'rgba(255,176,120,.85)'); line(c, x, top + 0.2, x + w, top + 0.2, 'rgba(255,190,140,.5)', 0.4); // the low sun catches one edge and the parapet
    if (r() < 0.6) { const ax = x + 3 + r() * (w - 6); line(c, ax, top, ax, top - 8, '#231c44', 0.5); el(c, ax, top - 8, 0.6, 0.6, '#ff5a4a'); beacons.push([MID, ax, top - 8]); }
    if (r() < 0.45) { const tx = x + 2 + r() * (w - 9); rr(c, tx, top - 4.2, 5, 4.2, 0.6, '#2c2352'); poly(c, [tx - 0.4, top - 4.2, tx + 5.4, top - 4.2, tx + 2.5, top - 6.2], '#2c2352'); if (r() < 0.5) steam.push([tx + 2.5, top - 6]); } // rooftop water tank
    if (!glass && r() < 0.55) { // a neon sign down the corner: shapes only, no words
      const col = ['255,79,216', '63,240,255', '255,196,84'][n % 3], nx = sunSide > 0 ? x + 1.6 : x + w - 4, ny = top + 6, nh = 12 + r() * 10;
      rr(c, nx, ny, 2.4, nh, 1, undefined, `rgb(${col})`, 0.6); for (let y = ny + 2.4; y < ny + nh - 1.5; y += 2.6) el(c, nx + 1.2, y, 0.5, 0.5, `rgb(${col})`); halo(c, nx + 1.2, ny + nh / 2, nh * 0.9, col, 0.5);
    }
    if (r() < 0.3) { const bx = x + 2, by = top - 9, col = ['63,240,255', '255,79,216'][n % 2]; line(c, bx + 2, top, bx + 2, by + 7, '#231c44', 0.5); line(c, bx + 12, top, bx + 12, by + 7, '#231c44', 0.5); rr(c, bx, by, 14, 7, 0.5, lg(c, bx, by, bx + 14, by + 7, [0, `rgba(${col},.95)`], [1, 'rgba(120,90,255,.9)'])); halo(c, bx + 7, by + 3.5, 16, col, 0.45); } // a rooftop billboard, lit and blank
    x += w + (r() < 0.45 ? 3 + r() * 12 : 0);
  }
  c.save(); c.globalCompositeOperation = 'source-atop'; c.fillStyle = lg(c, 0, 92, 0, 140, [0, 'rgba(255,140,104,0)'], [1, 'rgba(255,140,104,.42)']); c.fillRect(0, 80, MID, 70); c.restore();
}
function near(c: C2) {
  const r = rng(57), ink = '#110d24', rim = 'rgba(255,160,104,.75)';
  const poles: number[] = [];
  for (let x = 30; x < NEAR; x += 54 + r() * 70) {
    if (r() < 0.36) { poles.push(x); continue; }
    const top = 40 + r() * 34, lean = (r() - 0.5) * 14, cx = x + lean; // a fan palm: a thin leaning trunk and a ragged crown
    c.beginPath(); c.moveTo(x, 150); c.quadraticCurveTo(x + lean * 0.2, 100, cx, top); c.strokeStyle = ink; c.lineWidth = 1.7; c.stroke();
    c.beginPath(); c.moveTo(x + 0.7, 150); c.quadraticCurveTo(x + lean * 0.2 + 0.7, 100, cx + 0.6, top); c.strokeStyle = rim; c.lineWidth = 0.3; c.stroke();
    for (let i = 0; i < 13; i++) {
      const a = -Math.PI * (0.02 + (i / 12) * 0.96), len = 11 + r() * 8, ex = cx + Math.cos(a) * len, ey = top + Math.sin(a) * len * 0.75 + 5 + Math.abs(Math.cos(a)) * 5, mx = cx + Math.cos(a) * len * 0.55, my = top + Math.sin(a) * len * 0.9 - 2;
      c.beginPath(); c.moveTo(cx, top); c.quadraticCurveTo(mx, my, ex, ey); c.strokeStyle = ink; c.lineWidth = 1.1; c.stroke();
      for (let k = 0.25; k < 1; k += 0.11) { const qx = (1 - k) * (1 - k) * cx + 2 * (1 - k) * k * mx + k * k * ex, qy = (1 - k) * (1 - k) * top + 2 * (1 - k) * k * my + k * k * ey; line(c, qx, qy, qx + Math.cos(a) * 1.2, qy + 3.6 * (1 - k * 0.4), ink, 0.45); }
      if (i > 6) { c.beginPath(); c.moveTo(cx, top - 0.4); c.quadraticCurveTo(mx, my - 0.5, ex, ey - 0.4); c.strokeStyle = rim; c.lineWidth = 0.22; c.stroke(); }
    }
    el(c, cx, top + 1, 2, 1.8, ink);
  }
  poles.forEach((x, i) => { // street lights still on, and the overhead wires of a Los Angeles street
    rr(c, x - 0.6, 62, 1.2, 90, 0.2, ink); line(c, x - 7, 68, x + 7, 68, ink, 1); line(c, x, 62, x + 9, 60, ink, 0.7); rr(c, x + 7.6, 59.6, 4, 1.4, 0.5, '#ffe6b8'); halo(c, x + 9.6, 61, 16, '255,214,150', 0.8);
    const nx = poles[i + 1] ?? NEAR + 40; for (const dy of [0, 2.2]) { c.beginPath(); c.moveTo(x - 6 + dy * 5, 68); c.quadraticCurveTo((x + nx) / 2, 82 + dy * 2, nx - 6 + dy * 5, 68); c.strokeStyle = ink; c.lineWidth = 0.3; c.stroke(); }
    if (i === 0) { c.beginPath(); c.moveTo(-20, 70); c.quadraticCurveTo(x / 2, 80, x - 6, 68); c.stroke(); }
  });
}
function wall(c: C2) {
  const solid = (x0: number, x1: number) => { c.fillStyle = lg(c, 0, 16, 0, 144, [0, '#1b2140'], [0.5, '#262d52'], [1, '#1a1f3c']); c.fillRect(x0, 16, x1 - x0, 128); for (let x = Math.ceil(x0 / 19) * 19; x < x1; x += 19) line(c, x, 17, x, SILL, 'rgba(0,0,0,.2)', 0.4); };
  // what is under the floor, seen through the funding gaps
  c.fillStyle = lg(c, 0, 144, 0, 180, [0, '#0d1022'], [1, '#04050a']); c.fillRect(0, 144, WALL, 36);
  for (let x = 12; x < WALL; x += 46) { rr(c, x, 144, 3, 36, 0, '#090b18'); line(c, x + 3, 150, x + 46, 176, 'rgba(60,70,110,.18)', 0.6); }
  solid(0, BAYS[0][0]); solid(BAYS[0][1], BAYS[1][0]); solid(BAYS[1][1], 566);
  for (const [x0, x1] of BAYS) {
    // glass: a smoky tint, heavier toward the ceiling, with the room faintly mirrored in it
    c.fillStyle = lg(c, 0, GLASS_TOP, 0, SILL, [0, 'rgba(12,16,42,.62)'], [0.42, 'rgba(16,20,50,.30)'], [0.62, 'rgba(16,20,50,.10)'], [1, 'rgba(16,20,50,.08)']); c.fillRect(x0, GLASS_TOP, x1 - x0, SILL - GLASS_TOP);
    c.save(); c.beginPath(); c.rect(x0, GLASS_TOP, x1 - x0, SILL - GLASS_TOP); c.clip();
    for (let x = x0 - 40; x < x1; x += 31) { poly(c, [x, SILL, x + 9, SILL, x + 62, GLASS_TOP, x + 53, GLASS_TOP], 'rgba(255,255,255,.035)'); poly(c, [x + 14, SILL, x + 16, SILL, x + 69, GLASS_TOP, x + 67, GLASS_TOP], 'rgba(255,255,255,.05)'); }
    c.restore();
    for (let x = x0 + 38; x < x1 - 8; x += 38) { rr(c, x - 0.6, GLASS_TOP, 1.2, SILL - GLASS_TOP, 0, '#0b0e1d'); line(c, x + 0.75, GLASS_TOP, x + 0.75, SILL, 'rgba(255,186,130,.5)', 0.25); } // mullions, each with a thread of sunrise down one side
    rr(c, x0, 61.4, x1 - x0, 1.2, 0, '#0b0e1d'); line(c, x0, 61.2, x1, 61.2, 'rgba(255,186,130,.35)', 0.25);
    for (const x of [x0, x1 - 3]) { c.fillStyle = lg(c, x, 0, x + 3, 0, [0, '#39426a'], [0.5, '#1c2242'], [1, '#0d1024']); c.fillRect(x, GLASS_TOP, 3, SILL - GLASS_TOP); }
    add(c, () => { for (const [x, d] of [[x0, -1], [x1, 1]]) { c.fillStyle = lg(c, x, 0, x + d * 26, 0, [0, 'rgba(255,150,96,.20)'], [1, 'rgba(255,150,96,0)']); c.fillRect(Math.min(x, x + d * 26), GLASS_TOP, 26, SILL - GLASS_TOP); } }); // daylight spilling onto the wall beside the glass
  }
  // the sill and skirting under the glass, and the ceiling with its trusses
  c.fillStyle = lg(c, 0, SILL, 0, 144, [0, '#2b3359'], [0.2, '#1a2040'], [1, '#12162e']); c.fillRect(0, SILL, 566, 14); line(c, 0, SILL + 0.2, 566, SILL + 0.2, 'rgba(255,190,140,.55)', 0.35); rr(c, 0, 138, 566, 6, 0, '#0e1228');
  rr(c, 0, 0, 566, 16, 0, '#0a0d1c'); for (let x = 0; x < 560; x += 40) { line(c, x, 15, x + 20, 3, '#333d62', 0.9); line(c, x + 20, 3, x + 40, 15, '#333d62', 0.9); } rr(c, 0, 14.4, 566, 2.6, 0, '#2a3358'); line(c, 0, 16.8, 566, 16.8, 'rgba(255,186,130,.3)', 0.3);
  c.fillStyle = lg(c, 0, 16, 0, 46, [0, 'rgba(4,5,14,.5)'], [1, 'rgba(4,5,14,0)']); c.fillRect(0, 16, 566, 30);
}
/** Everything in the room, on its own layer in front of the glass so the light shafts can fall between the two. */
function room(c: C2, scene: Phaser.Scene) {
  rr(c, 388, 33, 84, 35, 2, 'rgba(8,10,24,.8)', 'rgba(140,150,190,.5)', 0.4); // a dark plate behind the three clocks, so their labels read against the glass
  // the things in the room, drawn as before and then seated in the low light
  const tmp = document.createElement('canvas'); tmp.width = WALL * D; tmp.height = 180 * D; const t = tmp.getContext('2d')!; t.scale(D, D); t.lineJoin = 'round'; t.lineCap = 'round';
  listing(t, scene, 2);
  t.globalCompositeOperation = 'source-atop'; t.fillStyle = lg(t, 0, 20, 0, 144, [0, 'rgba(16,16,48,.50)'], [1, 'rgba(22,18,48,.26)']); t.fillRect(0, 0, WALL, 180);
  c.drawImage(tmp, 0, 0, WALL, 180);
  for (let x = 30; x < 540; x += 92) { // strip lights, and the air under them
    add(c, () => { c.fillStyle = lg(c, 0, 22, 0, 124, [0, 'rgba(200,225,255,.10)'], [1, 'rgba(200,225,255,0)']); c.beginPath(); c.moveTo(x, 22); c.lineTo(x + 44, 22); c.lineTo(x + 76, 124); c.lineTo(x - 32, 124); c.closePath(); c.fill(); });
    rr(c, x, 20, 44, 2.4, 1.2, '#f6faff'); halo(c, x + 22, 21, 26, '190,220,255', 0.35);
  }
  listing(c, scene, 4); // signs and screens at full brightness: these are what the bloom catches
  halo(c, 247, 74, 64, '90,200,255', 0.16); halo(c, 432, 102, 44, '120,230,170', 0.14); halo(c, 530, 58, 56, '255,220,120', 0.16); halo(c, 566, 84, 70, '110,170,255', 0.22);
}
/** The room mirrored into the top of the polished floor: the wall squeezed, flipped, softened and faded out with depth. */
function reflection(c: C2, scene: Phaser.Scene) {
  const h = 22;
  for (const [x0, x1] of BAYS) { c.fillStyle = lg(c, 0, 0, 0, h, [0, '#ffb070'], [0.3, '#c8607a'], [1, '#2a2a64']); c.fillRect(x0, 0, x1 - x0, h); } // the sunrise through the glass
  c.save(); c.translate(0, h); c.scale(1, -1); for (const key of ['hf_ls_wall', 'hf_ls_room']) c.drawImage(scene.textures.get(key).getSourceImage() as HTMLCanvasElement, 0, 40 * D, WALL * D, 104 * D, 0, 0, WALL, h); c.restore();
  c.globalCompositeOperation = 'destination-in'; c.fillStyle = lg(c, 0, 0, 0, h, [0, 'rgba(0,0,0,.95)'], [0.25, 'rgba(0,0,0,.5)'], [1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, WALL, h);
}
function shaft(c: C2) {
  soft(c, 3);
  for (const [in0, in1, a] of [[20, 44, 0.5], [26, 38, 0.6]]) { c.fillStyle = lg(c, 0, 0, 0, 124, [0, 'rgba(255,196,140,0)'], [0.12, `rgba(255,196,140,${a})`], [0.7, `rgba(255,170,120,${a * 0.45})`], [1, 'rgba(255,170,120,0)']); c.beginPath(); c.moveTo(in0 + 24, 0); c.lineTo(in1 + 24, 0); c.lineTo(in1 - 12, 124); c.lineTo(in0 - 16, 124); c.closePath(); c.fill(); }
  soft(c, 0);
}
function front(c: C2) {
  // out of focus and close to the lens: a roof beam, cable runs and pendant lamps that slide past faster than the room
  soft(c, 2.5);
  rr(c, -10, -4, FRONT + 20, 8.4, 0, 'rgba(3,4,10,.96)');
  const r = rng(71);
  for (let x = 20; x < 800; x += 90 + r() * 80) { // none further on: they would slide across the video wall's caption
    const drop = 9 + r() * 7; line(c, x, 3, x, drop, 'rgba(3,4,10,.95)', 0.9); poly(c, [x - 5, drop + 4, x + 5, drop + 4, x + 2.2, drop, x - 2.2, drop], 'rgba(3,4,10,.95)');
    halo(c, x, drop + 5, 15, '255,206,150', 0.5); el(c, x, drop + 4.6, 3.4, 1.2, 'rgba(255,236,200,.8)');
    c.beginPath(); c.moveTo(x + 14, 3); c.quadraticCurveTo(x + 40, 12 + r() * 6, x + 70, 3); c.strokeStyle = 'rgba(3,4,10,.9)'; c.lineWidth = 1; c.stroke();
  }
  soft(c, 0);
}
function tiles(scene: Phaser.Scene) {
  // polished epoxy floor on a concrete slab, with the hazard edge the factory floor had, and a steel catwalk
  tex(scene, 't_hf_listing', 16, 16, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 16, [0, '#4a5278'], [0.16, '#373e60'], [1, '#272c48']); c.fillRect(0, 0, 16, 16);
    c.fillStyle = '#a9b4d8'; c.fillRect(0, 0, 16, 0.7);
    for (let i = 0; i < 4; i++) poly(c, [i * 4, 0.7, i * 4 + 2, 0.7, i * 4 + 1, 2.1, i * 4 - 1, 2.1], '#f2c94a'); for (let i = 0; i < 4; i++) poly(c, [i * 4 + 2, 0.7, i * 4 + 4, 0.7, i * 4 + 3, 2.1, i * 4 + 1, 2.1], '#1a1c2a');
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 2.1, 16, 0.4); c.fillStyle = lg(c, 0, 2.5, 0, 9, [0, 'rgba(210,220,255,.16)'], [1, 'rgba(210,220,255,0)']); c.fillRect(0, 2.5, 16, 6.5);
    line(c, 0, 15.8, 16, 15.8, 'rgba(0,0,0,.3)', 0.4); line(c, 0.1, 2.5, 0.1, 16, 'rgba(0,0,0,.2)', 0.3);
    const r = rng(9); for (let i = 0; i < 16; i++) el(c, r() * 16, 3 + r() * 13, 0.25, 0.25, `rgba(255,255,255,${0.05 + r() * 0.1})`);
  });
  tex(scene, 't_hf_listing_fill', 16, 16, (c) => { c.fillStyle = '#222740'; c.fillRect(0, 0, 16, 16); line(c, 0, 8, 16, 8, 'rgba(0,0,0,.28)', 0.4); line(c, 5, 0, 5, 8, 'rgba(0,0,0,.28)', 0.4); line(c, 11, 8, 11, 16, 'rgba(0,0,0,.28)', 0.4); line(c, 0, 8.5, 16, 8.5, 'rgba(255,255,255,.05)', 0.3); for (const [x, y] of [[1.4, 1.4], [14.6, 9.4]]) el(c, x, y, 0.45, 0.45, 'rgba(0,0,0,.35)'); });
  tex(scene, 'p_hf_listing', 16, 6, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 3.6, [0, '#c6cfe8'], [0.2, '#7f8aae'], [1, '#4a5378']); c.fillRect(0, 0, 16, 3.6); c.fillStyle = '#1a1f38'; c.fillRect(0, 3.6, 16, 1.3);
    c.fillStyle = '#8fe9ff'; c.fillRect(0, 3.9, 16, 0.6); // an edge light under the deck
    for (let x = 1.5; x < 16; x += 3.2) line(c, x, 1.3, x + 1.2, 2.6, 'rgba(20,26,50,.35)', 0.3);
    rr(c, 1, 4.9, 1.4, 1.1, 0.2, '#2a3052'); rr(c, 13.6, 4.9, 1.4, 1.1, 0.2, '#2a3052');
  });
  // normals: flat faces, with the top edge turned up to the light and the underside turned down
  paintNormals(scene, 't_hf_listing', (c) => { c.fillStyle = '#80e0b0'; c.fillRect(0, 0, 16, 0.8); c.fillStyle = '#80a8f4'; c.fillRect(0, 0.8, 16, 1.6); });
  paintNormals(scene, 'p_hf_listing', (c) => { c.fillStyle = '#80e0b0'; c.fillRect(0, 0, 16, 0.8); c.fillStyle = '#80a0f0'; c.fillRect(0, 0.8, 16, 2.8); c.fillStyle = '#8030c0'; c.fillRect(0, 3.6, 16, 2.4); });
}
const listingLook: Look = {
  build(scene) {
    texAt(scene, 'hf_ls_sky', SKY, 180, 2, sky); texAt(scene, 'hf_ls_far', FAR, 120, 2, far); texAt(scene, 'hf_ls_mid', MID, 150, 3, mid); texAt(scene, 'hf_ls_near', NEAR, 150, 3, near);
    texAt(scene, 'hf_ls_wall', WALL, 180, D, wall); texAt(scene, 'hf_ls_room', WALL, 180, D, (c) => room(c, scene)); texAt(scene, 'hf_ls_refl', WALL, 22, 1, (c) => reflection(c, scene));
    texAt(scene, 'hf_ls_shaft', 72, 124, 1, shaft); texAt(scene, 'hf_ls_front', FRONT, 36, 1.5, front);
    texAt(scene, 'hf_ls_scan', 194, 12, 1, (c) => { c.fillStyle = lg(c, 0, 0, 0, 12, [0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,.16)'], [1, 'rgba(255,255,255,0)']); c.fillRect(0, 0, 194, 12); });
    texAt(scene, 'hf_ls_bird', 5, 2.4, D, (c) => { c.beginPath(); c.moveTo(0.3, 0.5); c.quadraticCurveTo(1.6, 0.3, 2.5, 1.7); c.quadraticCurveTo(3.4, 0.3, 4.7, 0.5); c.strokeStyle = '#1a1230'; c.lineWidth = 0.45; c.stroke(); });
    tiles(scene);
  },
  layers: [
    { key: 'hf_ls_sky', w: SKY }, { key: 'hf_ls_far', w: FAR }, { key: 'hf_ls_mid', w: MID }, { key: 'hf_ls_near', w: NEAR }, { key: 'hf_ls_wall', w: WALL, depth: -6 }, { key: 'hf_ls_room', w: WALL, depth: -5 },
    { key: 'hf_ls_front', w: FRONT, depth: 8, y: -1 },
  ],
  tiles: 'hf_listing',
  ambient: 0x8e90b8,
  lights: [
    { x: 70, y: 134, r: 120, color: 0xffa462, i: 0.42, w: WALL }, { x: 152, y: 134, r: 120, color: 0xffa462, i: 0.4, w: WALL }, // sunrise on the floor in front of the glass
    { x: 247, y: 100, r: 110, color: 0x5fd0ff, i: 0.5, w: WALL, flicker: 0.05 },                                              // mission control's screens
    { x: 338, y: 134, r: 120, color: 0xffa462, i: 0.4, w: WALL }, { x: 432, y: 112, r: 100, color: 0x8fe8b4, i: 0.36, w: WALL, flicker: 0.04 }, // the desk monitors
    { x: 530, y: 76, r: 110, color: 0xffd76a, i: 0.45, w: WALL, flicker: 0.03 },                                              // the RKLB board
    { x: 628, y: 112, r: 150, color: 0x6aa8ff, i: 0.6, w: WALL, flicker: 0.06 }, { x: 716, y: 112, r: 150, color: 0x7ab4ff, i: 0.55, w: WALL, flicker: 0.06 }, // the video wall
  ],
  heroLight: { r: 64, color: 0xfff0dc, i: 0.22 },
  reflect: { key: 'hf_ls_refl', w: WALL, alpha: 0.6 },
  motes: { tint: 0xffd2a0, count: 150 },
  grade: { threshold: 0.76, bloom: 0.55, exposure: 1.04, contrast: 1.08, saturation: 1.1, shadows: [0.9, 0.98, 1.14], highs: [1.06, 1.0, 0.92], vignette: 0.45, grain: 0.024, fringe: 0.006 },
  live(hf) {
    const s = hf.scene, tw = (targets: object, cfg: object) => s.tweens.add({ targets, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', ...cfg });
    // light through the glass: shafts that breathe a little, behind the play and again, faintly, in front of it
    [22, 68, 112, 150, 304, 352, 398, 446].forEach((x, i) => {
      const a = hf.on(WALL, x, 17, 'hf_ls_shaft').setOrigin(0).setBlendMode('ADD').setDepth(-5.5).setAlpha(0.3); tw(a, { alpha: 0.58, duration: 2600 + i * 430 });
      if (i % 2 === 0) { const b = hf.on(WALL, x - 10, 17, 'hf_ls_shaft').setOrigin(0).setBlendMode('ADD').setDepth(7.5).setAlpha(0.03).setScale(1.25, 1); tw(b, { alpha: 0.08, duration: 3400 + i * 300 }); }
    });
    // the screens are alive: the LIVE light, a scan band and the rocket's flame on the video wall, a satellite crossing mission control's map, the board's glow
    tw(hf.on(WALL, 576, 11, 'puff').setScale(S * 0.9).setTint(0xff4a3a).setBlendMode('ADD').setDepth(-4.8), { alpha: 0.1, duration: 600 });
    const scan = hf.on(WALL, 566.5, 24, 'hf_ls_scan').setOrigin(0).setBlendMode('ADD').setDepth(-4.8); s.tweens.add({ targets: scan, y: 130, duration: 4200, repeat: -1 });
    tw(hf.on(WALL, 650, 121, 'puff').setScale(S * 0.7, S * 1.3).setTint(0xffb060).setBlendMode('ADD').setDepth(-4.8), { scaleY: S * 0.8, alpha: 0.55, duration: 90 });
    tw(hf.on(WALL, 530, 59, 'puff').setScale(S * 5, S * 2.4).setTint(0xffe07a).setBlendMode('ADD').setDepth(-4.8).setAlpha(0.1), { alpha: 0.3, duration: 1300 });
    sat = hf.on(WALL, 212, 60, 'puff').setScale(S * 0.3).setTint(0xfff2a0).setBlendMode('ADD').setDepth(-4.8);
    for (const x of [421, 427]) tw(hf.on(WALL, x, 95, 'puff').setScale(S * 0.22).setTint(0x9dffb0).setBlendMode('ADD').setDepth(-4.8), { alpha: 0.2, duration: 500 + x });
    // outside: beacons blinking on the cranes and rooftops, steam off a few roofs, gulls over the harbour
    beacons.forEach(([w, x, y], i) => tw(hf.on(w, x, y, 'puff').setScale(S * (w === FAR ? 0.4 : 0.6)).setTint(0xff5a4a).setBlendMode('ADD').setDepth(w === FAR ? -9.4 : -8.9), { alpha: 0, duration: 700 + (i % 5) * 160, delay: i * 210 }));
    const fm = (MID - 320) / (hf.world.LW - 320);
    for (const [x, y] of steam.slice(0, 4)) s.add.particles(HX * (1 - fm) + x, y, 'puff', { speedY: { min: -9, max: -5 }, speedX: { min: 2, max: 6 }, lifespan: 3800, scale: { start: S * 0.25, end: S * 1.5 }, alpha: { start: 0.3, end: 0 }, tint: 0xffc0a0, frequency: 420, advance: 3000 }).setScrollFactor(fm, 1).setDepth(-8.9);
    for (let i = 0; i < 7; i++) { const b = hf.on(FAR, -20 - (i % 4) * 9 - i * 3, 58 + ((i * 7) % 5) * 4 + (i % 2) * 9, 'hf_ls_bird').setDepth(-9.3).setAlpha(0.85); s.tweens.add({ targets: b, x: b.x + FAR + 80, duration: 52000, repeat: -1, delay: 0 }); s.tweens.add({ targets: b, scaleY: -b.scaleY * 0.4, duration: 210 + i * 17, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
  },
  step(hf) { if (sat) { const x = (hf.t * 7) % 70; sat.setX(sat0(hf) + 212 + x).setY(60 + 9 * Math.sin(x * 0.09)); } },
};
let sat: Phaser.GameObjects.Image | undefined;
const sat0 = (hf: HiFi) => HX * (1 - (WALL - 320) / (hf.world.LW - 320));

export const LOOKS: Record<string, Look> = { listing: listingLook, workshop: workshopLook, mercury: mercuryLook, stand: standLook, farm: farmLook, mahia: mahiaLook, ...lc1Looks, factory: factoryLook, review: reviewLook, map: mapLook, title: titleLook,
  twopads: twopadsLook,
  haze: hazeLook,
  edit: editLook,
  diary: diaryLook,
};
