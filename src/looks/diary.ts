import Phaser from 'phaser';
import { D, S, C2, rr, el, line, poly, lg, rg, rng } from '../art';
import { roomQ1 } from '../scenes/SlotFinder';
import { texAt, soft, add, halo, sheet } from '../hifi';
import type { Look } from '../hifi';

// ------------------------------------------------------------------ Seven diaries, one slot: the organiser's desk, round the clock
// Nothing published says where this desk is or what it looks like: the plain backdrop is a room drawn for the game, with
// "no particular city" in its window at dusk. The level itself is a clock, though: it runs from 3 p.m. on Thursday 7 May
// 2026 to the release at 3 p.m. on Friday, and every time in it is Pacific time. So here the window keeps the level's
// clock (the game's choice; no source says she was on Pacific time): a clear afternoon, the plain drawing's own dusk at
// sunset (about ten to eight in early May on that coast), the city's lights through the night, first light about six and
// Friday's daylight after it. The room follows the window: daylight on the shelf, then only the screens and the phone.
// The room, the panels and the grid stay in the world and glow; every word and every face is on the HUD camera.
const WX = 210, WY = 128, WW = 56, WH = 48, RISE = 6, SET = 19.85;

/** One of the room drawing's parts on a sheet of its own, cut to the window. */
const pane = (part: number) => (c: C2) => { c.drawImage(sheet(320, 180, 8, (t) => roomQ1(t, part)), WX * 8, WY * 8, WW * 8, WH * 8, 0, 0, WW, WH); };
const mullions = (c: C2, x: number, y: number) => { line(c, x + WW / 2, y, x + WW / 2, y + WH, '#3a3226', 1.2); line(c, x, y + WH / 2, x + WW, y + WH / 2, '#3a3226', 1.2); line(c, x + WW / 2 - 0.5, y, x + WW / 2 - 0.5, y + WH, 'rgba(255,226,180,.25)', 0.2); }; // the plain window's bars
function room(c: C2) {
  const r = rng(3);
  // the wall: the plain wallpaper, with the light of the window on it and the corners falling away
  roomQ1(c, 1);
  for (let x = 0; x < 320; x += 16) { line(c, x - 3.2, 0, x - 3.2, 180, 'rgba(255,255,255,.03)', 0.3); line(c, x + 3.2, 0, x + 3.2, 180, 'rgba(0,0,0,.2)', 0.3); for (let y = 6; y < 180; y += 12) el(c, x + 8, y + (x % 32 ? 0 : 6), 0.5, 0.9, 'rgba(255,255,255,.03)'); } // the stripes' edges, and a small figure between them
  for (let i = 0; i < 500; i++) el(c, r() * 320, r() * 180, 0.15 + r() * 0.3, 0.15 + r() * 0.3, `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.02 + r() * 0.04})`);
  c.fillStyle = rg(c, 200, 110, 60, 240, [0, 'rgba(0,0,0,0)'], [1, 'rgba(2,3,10,.6)']); c.fillRect(0, 0, 320, 180);
  rr(c, WX - 3.4, WY - 3.4, WW + 6.8, WH + 6.8, 2, 'rgba(0,0,0,.35)'); // the window's reveal
  // the shelf and what stands on it: their shadows on the wall, then the plain drawing's own things
  soft(c, 1.4); rr(c, 271, 163, 49, 5, 1, 'rgba(0,0,0,.5)'); rr(c, 276.4, 130, 14, 31, 1, 'rgba(0,0,0,.4)'); rr(c, 296.4, 138, 14, 23, 2, 'rgba(0,0,0,.4)'); rr(c, 312, 152, 6, 9, 1, 'rgba(0,0,0,.4)'); soft(c, 0);
  roomQ1(c, 2); roomQ1(c, 28); mullions(c, WX, WY); // the view at dusk, as drawn, under the look's own skies
  line(c, 270.4, 160.3, 317.6, 160.3, 'rgba(255,226,180,.5)', 0.3); line(c, 274.4, 128.4, 274.4, 159.6, 'rgba(255,240,214,.5)', 0.3); line(c, 310.3, 150.6, 310.3, 159.6, 'rgba(255,214,190,.5)', 0.3); // the edges turned to the window
  c.fillStyle = lg(c, WX - 1.6, 0, WX + 1, 0, [0, 'rgba(255,226,180,.3)'], [1, 'rgba(255,226,180,0)']); c.fillRect(WX - 1.6, WY - 1.6, 1.6, WH + 3.2);
}
function nightSky(c: C2) {
  const r = rng(9);
  c.fillStyle = lg(c, 0, 0, 0, WH, [0, '#050818'], [0.6, '#0e1736'], [0.86, '#28305c'], [1, '#4a4468']); c.fillRect(0, 0, WW, WH);
  for (let i = 0; i < 34; i++) { const y = r() * r() * 30; c.globalAlpha = (0.25 + r() * 0.6) * (1 - y / 36); el(c, r() * WW, y, 0.07 + r() * 0.1, 0.07 + r() * 0.1, '#ffffff'); } // few stars: it is a city sky c.globalAlpha = 1;
  halo(c, WW / 2, WH + 4, 34, '255,170,110', 0.22); // the city's own light on the air above it
}
function daySky(c: C2) {
  const r = rng(14);
  c.fillStyle = lg(c, 0, 0, 0, WH, [0, '#2f6fc4'], [0.5, '#6aa6e0'], [0.82, '#b4d2ea'], [1, '#dfe6e8']); c.fillRect(0, 0, WW, WH);
  soft(c, 6); for (let i = 0; i < 9; i++) { const x = r() * WW, y = 4 + r() * 22; el(c, x, y, 5 + r() * 9, 0.7 + r() * 1.1, `rgba(255,255,255,${0.16 + r() * 0.26})`); } soft(c, 0);
}
/** The city by day: the plain drawing's silhouette, given faces, floors and the haze of distance. Night and dusk are a tint over it. */
function cityDay(c: C2) {
  pane(8)(c); c.globalCompositeOperation = 'source-atop';
  c.fillStyle = lg(c, 0, 10, 0, WH, [0, '#6f7ea2'], [1, '#56638a']); c.fillRect(0, 0, WW, WH);
  for (let y = 12; y < WH; y += 1.5) line(c, 0, y, WW, y, 'rgba(30,40,70,.2)', 0.3); for (let x = 0; x < WW; x += 1.4) line(c, x, 10, x, WH, 'rgba(30,40,70,.1)', 0.25);
  c.fillStyle = lg(c, 0, 0, WW, 0, [0, 'rgba(255,250,236,.3)'], [0.5, 'rgba(255,250,236,.04)'], [1, 'rgba(20,30,60,.22)']); c.fillRect(0, 0, WW, WH);
  c.fillStyle = lg(c, 0, WH - 16, 0, WH, [0, 'rgba(214,226,240,0)'], [1, 'rgba(214,226,240,.5)']); c.fillRect(0, 0, WW, WH);
  c.globalCompositeOperation = 'source-over';
}
function cityLights(c: C2) {
  const r = rng(27);
  pane(16)(c);
  for (let i = 0; i < 60; i++) { const x = r() * WW, y = WH - 1 - r() * r() * 30; el(c, x, y, 0.2, 0.2, r() < 0.6 ? '#ffe9a0' : r() < 0.5 ? '#ffb86a' : '#bfe0ff'); }
  for (let i = 0; i < 12; i++) halo(c, r() * WW, WH - 1 - r() * 6, 2.4, '255,200,130', 0.5); // street lights, down where the streets are
  for (const x of [9, 33.5, 47.5]) { el(c, x, WH - [30, 36, 26][[9, 33.5, 47.5].indexOf(x)] - 0.6, 0.3, 0.3, '#ff5a4a'); } // a red light on each tall roof
}
const glass = (c: C2) => { // the room faintly in the glass, and the bars over it
  for (const [x, w, a] of [[8, 7, 0.05], [20, 2, 0.07], [38, 10, 0.035]]) poly(c, [x, WH, x + w, WH, x + w + 16, 0, x + 16, 0], `rgba(220,232,255,${a})`);
  c.fillStyle = lg(c, 0, 0, 0, 7, [0, 'rgba(0,0,10,.4)'], [1, 'rgba(0,0,10,0)']); c.fillRect(0, 0, WW, 7); c.fillStyle = lg(c, 0, 0, 5, 0, [0, 'rgba(0,0,10,.35)'], [1, 'rgba(0,0,10,0)']); c.fillRect(0, 0, 5, WH);
  mullions(c, 0, 0);
};
const rim = (w: number, h: number) => (c: C2) => { soft(c, 3); rr(c, 8, 8, w, h, 4, undefined, 'rgba(255,255,255,.9)', 2.2); soft(c, 0); }; // the light a screen throws round its own edge

type Im = Phaser.GameObjects.Image;
let o: { room: Im; day: Im; dusk: Im; city: Im; lights: Im; sun: Im; spill: Im; phone: Im; rims: Im[]; block: Im; yes: number; no: number; chats: number; flash: number; bad: number; buzz: number } | undefined;
const mix = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k), rgb = (c: number[]) => Phaser.Display.Color.GetColor(Math.min(255, c[0]), Math.min(255, c[1]), Math.min(255, c[2])), sat = (v: number) => Phaser.Math.Clamp(v, 0, 1);
export const diaryLook: Look = {
  build(scene) {
    texAt(scene, 'hf_sf_room', 320, 180, D, room);
    texAt(scene, 'hf_sf_night', WW, WH, 8, nightSky); texAt(scene, 'hf_sf_day', WW, WH, 8, daySky); texAt(scene, 'hf_sf_dusk', WW, WH, 8, pane(4)); texAt(scene, 'hf_sf_city', WW, WH, 8, cityDay); texAt(scene, 'hf_sf_lights', WW, WH, 8, cityLights); texAt(scene, 'hf_sf_glass', WW, WH, 8, glass);
    texAt(scene, 'hf_sf_spill', 130, 80, 1, (c) => { soft(c, 4); add(c, () => { c.fillStyle = rg(c, 34, 46, 4, 62, [0, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']); c.fillRect(0, 0, 130, 80); c.fillStyle = lg(c, 60, 0, 130, 0, [0, 'rgba(255,255,255,.34)'], [1, 'rgba(255,255,255,0)']); c.beginPath(); c.moveTo(58, 22); c.lineTo(130, 40); c.lineTo(130, 80); c.lineTo(58, 70); c.closePath(); c.fill(); }); soft(c, 0); }); // the window's light on the wall round it, and across the shelf
    texAt(scene, 'hf_sf_rgrid', 328, 120, 2, rim(312, 104)); texAt(scene, 'hf_sf_rmsg', 218, 65, 2, rim(202, 49));
    texAt(scene, 'hf_sf_lines', 312, 104, D, (c) => { for (let y = 0; y < 104; y += 1) { c.fillStyle = 'rgba(0,4,14,.5)'; c.fillRect(0, y + 0.5, 312, 0.5); } });
  },
  layers: [],
  swap: { 'sf_room_q1-2026': 'hf_sf_room' },
  grade: { threshold: 0.82, bloom: 0.55, exposure: 1.04, contrast: 1.08, saturation: 1.1, shadows: [0.9, 0.95, 1.16], highs: [1.06, 1.0, 0.94], vignette: 0.38, grain: 0.022, fringe: 0.002 },
  live(hf) {
    const s = hf.scene, wall = <T extends Phaser.GameObjects.GameObject>(q: T) => hf.above(q, 'room');
    const puff = (x: number, y: number, kx: number, ky: number, tint: number) => s.add.image(x, y, 'puff').setScale(S * kx, S * ky).setTint(tint).setBlendMode('ADD').setAlpha(0);
    const win = (key: string) => s.add.image(WX, WY, key).setOrigin(0).setScale(1 / 8);
    // in the window, back to front (each is slipped in just over the room, so the last made is the furthest back): the glass, the city's lights, the city, the sun, the dusk the plain room has, the day, the night
    wall(win('hf_sf_glass')); const lights = wall(win('hf_sf_lights')), city = wall(win('hf_sf_city')), sun = wall(puff(0, 0, 0.5, 0.5, 0xfff2d0)), dusk = wall(win('hf_sf_dusk')), day = wall(win('hf_sf_day')); wall(win('hf_sf_night'));
    // on the wall: the window's light, the phone's screen, steam off the mug, and the light each panel throws round itself
    const spill = wall(s.add.image(WX - 30, WY - 20, 'hf_sf_spill').setOrigin(0).setBlendMode('ADD').setAlpha(0)), phone = puff(301, 148, 1.5, 2, 0xdfe8ff);
    s.add.particles(313, 149.6, 'puff', { x: { min: -1.4, max: 1.4 }, speedY: { min: -5, max: -2.4 }, speedX: { min: -0.8, max: 1.6 }, lifespan: { min: 1600, max: 2600 }, scale: { start: S * 0.05, end: S * 0.22 }, alpha: { start: 0.22, end: 0 }, tint: 0xe8ecf8, frequency: 260, advance: 2000 });
    const rims = [[4, 20, 'hf_sf_rgrid'], [4, 127, 'hf_sf_rmsg']].map(([x, y, k]) => wall(s.add.image((x as number) - 8, (y as number) - 8, k as string).setOrigin(0).setScale(0.5).setBlendMode('ADD').setAlpha(0)));
    // on the grid, over what is drawn there: the display's rows, and the light of the meeting block
    s.add.image(4, 20, 'hf_sf_lines').setOrigin(0).setScale(1 / D).setAlpha(0.16).setDepth(2.4);
    const block = puff(0, 76, 1, 6.4, 0xffe98a).setDepth(2.5);
    o = { room: hf.tags.room as Im, day, dusk, city, lights, sun, spill, phone, rims, block, yes: 0, no: 0, chats: hf.state.chats || 0, flash: 0, bad: 0, buzz: 0 };
  },
  step(hf, dt) {
    if (!o) return;
    const st = hf.state, t = hf.t, h = ((st.now % 24) + 24) % 24, ph = st.st;
    // the window, by the level's clock
    const L = sat(Math.min(h - (RISE - 0.5), SET + 0.5 - h)), set = sat(Math.min((h - (SET - 1.7)) / 1.7, (SET + 0.9 - h) / 0.9)), rise = sat(Math.min((h - (RISE - 0.8)) / 0.8, (RISE + 1.4 - h) / 1.4)), glow = Math.max(set, rise), dark = 1 - L;
    o.day.setAlpha(L); o.dusk.setAlpha(glow).setFlipX(rise > set); // the plain drawing's dusk, and the same sky the other way round for the dawn
    o.city.setTint(rgb(mix(mix([34, 30, 64], [255, 255, 255], L), [58, 36, 72], glow * 0.85)));
    o.lights.setAlpha(sat(dark * 1.4 + glow * 0.5) * (h > 0.5 && h < RISE ? 0.6 : 1) * (0.94 + 0.06 * Math.sin(t * 5)));
    const up = Math.sin(((h - RISE) / (SET - RISE)) * Math.PI), sx = WX + WW * (0.29 + 0.42 * sat((h - RISE) / (SET - RISE))); // the sun crosses from left to right, as it does in a window that faces south, and is low enough to see only near either end of the day
    o.sun.setPosition(sx, WY + WH - 6 - up * 70).setAlpha(up > 0 && up < 0.62 ? sat(up * 6) * sat((0.62 - up) * 8) : 0).setTint(rgb(mix([255, 190, 120], [255, 250, 236], sat(up * 2.4))));
    // the room, by the window: daylight on the wall and the shelf, gold at either end of the day, and by night only the screens
    o.room.setTint(rgb(mix(mix([150, 160, 205], [255, 255, 255], L), [255, 220, 190], glow * 0.5)));
    o.spill.setTint(rgb(mix([255, 250, 240], [255, 170, 110], glow))).setAlpha(0.5 * L + 0.3 * glow);
    if (st.chats > o.chats || st.yes + st.no > o.yes + o.no) o.buzz = 1; o.chats = st.chats; o.buzz = Math.max(0, o.buzz - dt * 2.6); // the phone lights up for the group chat and for every reply
    o.phone.setAlpha(0.08 + 0.14 * dark + 0.3 * o.buzz);
    // the grid: its rim says how the hunt is going
    if (st.no > o.no) o.bad = 1; if (ph === 3 && st.yes > o.yes) o.flash = 1; o.yes = st.yes; o.no = st.no; o.bad = Math.max(0, o.bad - dt * 1.2); o.flash = Math.max(0, o.flash - dt * 0.8);
    const tint = o.bad > 0.05 ? 0xff5a3c : ph === 4 ? 0xff4a3a : ph === 3 || ph === 5 ? 0x7cf08a : ph === 1 ? 0xffb347 : ph === 2 ? 0xffe98a : 0x5f9cff;
    o.rims[0].setTint(tint).setAlpha(o.bad > 0.05 ? 0.3 + 0.5 * o.bad : ph === 4 ? 0.4 + 0.25 * Math.sin(t * 5) : ph === 1 ? 0.36 + 0.14 * Math.sin(t * 9) : 0.24 + 0.05 * Math.sin(t * 1.3) + 0.4 * o.flash);
    o.rims[1].setTint(0xffe98a).setAlpha(0.16 + 0.04 * Math.sin(t * 1.7));
    o.block.setPosition(st.bx + st.bw / 2, 76).setScale(S * Math.max(0.6, st.bw / 9), S * 5.6).setTint(ph >= 3 ? 0x7cf08a : st.soon ? 0xff6a50 : 0xffe98a).setAlpha(0.1 + 0.03 * Math.sin(t * 3) + 0.2 * o.flash);
  },
};
