import Phaser from 'phaser';
import { D, S, C2, rr, el, line, poly, lg, rg, rng } from '../art';
import { review } from '../backdrops';
import { texAt, soft, add, halo, sheet, relight } from '../hifi';
import type { Look } from '../hifi';

// ------------------------------------------------------------------ Pics Or It Didn't Happen: the review room, Auckland, July 2020
// The level runs from day 3 to day 27 of an investigation, so it has no one hour, and the plain backdrop has no window to
// show one: it is mission control with the lights down and the consoles live. That is the light kept here (the game's
// choice): a dark room lit only by what is on its screens. The telemetry and the bench are the level, so the look makes
// them a wall display: its traces glow, a refresh band crosses it, its light falls on the desks and the floor below, and
// its rim says how the hunt is going. The consoles and the cold coffee are the plain drawing's own (`review`), relit.
// A fault-finder scene keeps its room, panels and traces in the world and every word on the HUD camera.
const SCREEN = [4, 20, 312, 116], MON = [0, 1, 2, 3, 4, 5, 6].map((i) => 112 + i * 30), HARNESS = [213, 106];
const hue = (i: number) => (i % 3 ? 0x7fd0ff : 0xff8a70);

function room(c: C2) {
  const r = rng(13), [sx, sy, sw, sh] = SCREEN;
  // the wall: acoustic panels in the dark, and the housings the three displays sit in
  c.fillStyle = lg(c, 0, 0, 0, 146, [0, '#05070f'], [0.7, '#0b1020'], [1, '#111a30']); c.fillRect(0, 0, 320, 146);
  for (let x = 0; x < 320; x += 20) for (let y = 0; y < 146; y += 18) { rr(c, x + 0.4, y + 0.4, 19.2, 17.2, 0.6, `rgba(120,150,220,${0.012 + r() * 0.02})`); line(c, x + 0.6, y + 0.7, x + 19.4, y + 0.7, 'rgba(160,190,255,.05)', 0.25); }
  for (const [x, y, w, h] of [[sx, sy, sw, sh], [4, 4, 196, 14], [204, 4, 112, 14]]) {
    rr(c, x - 2.4, y - 2.4, w + 4.8, h + 4.8, 4.6, lg(c, 0, y - 2.4, 0, y + h + 2.4, [0, '#2a3350'], [0.5, '#141a2e'], [1, '#0a0e1c']), 'rgba(0,0,0,.7)', 0.4);
    rr(c, x - 0.8, y - 0.8, w + 1.6, h + 1.6, 3.4, '#03050b'); line(c, x + 2, y - 2, x + w - 2, y - 2, 'rgba(170,196,255,.3)', 0.3);
  }
  for (const x of [60, 160, 260]) { rr(c, x - 3, 138.4, 6, 7.6, 0.4, '#141a2e'); rr(c, x - 5, 144.6, 10, 1.6, 0.4, '#1c2440'); } // the brackets the big display stands on
  add(c, () => { c.fillStyle = lg(c, 0, 137, 0, 150, [0, 'rgba(110,170,255,.18)'], [1, 'rgba(110,170,255,0)']); c.fillRect(0, 137, 320, 13); }); // its light, spilling down the wall under it
  // the floor: carpet tiles running away from us, and the displays lying in it as a sheen
  c.fillStyle = lg(c, 0, 146, 0, 180, [0, '#0e1730'], [0.4, '#0a1022'], [1, '#05070f']); c.fillRect(0, 146, 320, 34);
  for (let x = -300; x < 640; x += 26) line(c, 160 + (x - 160) * 0.42, 146, x, 180, 'rgba(140,170,240,.06)', 0.4);
  for (const y of [149.5, 155, 163, 173]) line(c, 0, y, 320, y, 'rgba(140,170,240,.05)', 0.3 + (y - 146) * 0.01);
  line(c, 0, 146, 320, 146, 'rgba(127,208,255,.5)', 0.5); halo(c, 160, 146, 150, '90,150,255', 0.1);
  soft(c, 2); MON.forEach((x, i) => el(c, x + 10, 174, 13, 3.4, i % 3 ? 'rgba(127,208,255,.16)' : 'rgba(255,138,112,.14)')); soft(c, 0);
  // the consoles and the coffee, as drawn before: dark, and found by the light of their own screens
  relight(c, sheet(320, 180, D, (t) => {
    review(t, 2);
    for (const x of MON) { rr(t, x - 1, 168.4, 13, 2.2, 0.4, '#1a2238', 'rgba(0,0,0,.5)', 0.2); for (let k = 0; k < 5; k++) rr(t, x + k * 2.4, 168.9, 1.8, 0.5, 0.1, 'rgba(190,214,255,.5)'); el(t, x + 17, 169.4, 1.5, 0.9, '#1a2238', 'rgba(170,196,255,.3)', 0.2); } // a keyboard and a mouse at each
  }), 320, 180, 'rgba(2,4,12,.62)', (m) => { for (const x of MON) { m.save(); m.translate(x + 10, 162); m.scale(1, 0.7); m.fillStyle = rg(m, 0, 0, 0, 22, [0, 'rgba(0,0,0,.95)'], [0.6, 'rgba(0,0,0,.5)'], [1, 'rgba(0,0,0,0)']); m.fillRect(-22, -22, 44, 44); m.restore(); } });
  review(c, 4); // the screens themselves, and their glow, at full brightness
  MON.forEach((x, i) => { halo(c, x + 10, 158, 16, i % 3 ? '127,208,255' : '255,138,112', 0.3); line(c, x + 2.2, 154.2, x + 17.8, 154.2, 'rgba(255,255,255,.5)', 0.2); });
  // close to the lens and out of focus: the backs of the chairs along the console row
  soft(c, 1.8); for (const x of [150, 212, 300]) { rr(c, x - 8, 172, 16, 12, 3, 'rgba(2,3,8,.96)'); rr(c, x - 9.4, 176, 2, 6, 1, 'rgba(2,3,8,.96)'); rr(c, x + 7.4, 176, 2, 6, 1, 'rgba(2,3,8,.96)'); line(c, x - 6, 172.6, x + 6, 172.6, 'rgba(127,208,255,.3)', 0.4); } soft(c, 0);
}
function lines(c: C2) { for (let y = 0; y < 116; y += 1) { c.fillStyle = 'rgba(0,4,14,.5)'; c.fillRect(0, y + 0.5, 312, 0.5); } } // the display's own rows
function glass(c: C2) { // the room, faintly, in the glass of the display
  c.save(); rr(c, 0, 0, 312, 116, 3); c.clip();
  for (const [x, w, a] of [[30, 20, 0.05], [58, 5, 0.07], [214, 34, 0.035], [258, 4, 0.06]]) poly(c, [x, 116, x + w, 116, x + w + 46, 0, x + 46, 0], `rgba(190,214,255,${a})`);
  c.fillStyle = lg(c, 0, 0, 0, 30, [0, 'rgba(190,214,255,.07)'], [1, 'rgba(190,214,255,0)']); c.fillRect(0, 0, 312, 30);
  c.fillStyle = rg(c, 156, 58, 60, 190, [0, 'rgba(0,0,0,0)'], [1, 'rgba(0,2,10,.5)']); c.fillRect(0, 0, 312, 116); c.restore();
}
function rim(c: C2) { soft(c, 3); rr(c, 8, 8, 316, 120, 4, undefined, 'rgba(255,255,255,.9)', 2.2); soft(c, 0); } // the light the display throws round its own edge

type Im = Phaser.GameObjects.Image;
let o: { rim: Im; sweep: Im; cursor: Im; hot: Im; wrong: number; flash: number; sx: number; sy: number } | undefined;
export const reviewLook: Look = {
  build(scene) {
    texAt(scene, 'hf_rv_room', 320, 180, D, room); texAt(scene, 'hf_rv_lines', 312, 116, D, lines); texAt(scene, 'hf_rv_glass', 312, 116, 2, glass); texAt(scene, 'hf_rv_rim', 332, 136, 2, rim);
    texAt(scene, 'hf_rv_sweep', 312, 14, 1, (c) => { c.fillStyle = lg(c, 0, 0, 0, 14, [0, 'rgba(160,210,255,0)'], [0.8, 'rgba(160,210,255,.1)'], [1, 'rgba(200,230,255,.2)']); c.fillRect(0, 0, 312, 14); });
  },
  layers: [],
  swap: { bg_review: 'hf_rv_room' },
  grade: { threshold: 0.5, bloom: 0.8, exposure: 1.05, contrast: 1.1, saturation: 1.14, shadows: [0.84, 0.95, 1.22], highs: [1.04, 1.0, 0.95], vignette: 0.5, grain: 0.03, fringe: 0.006 },
  live(hf) {
    const s = hf.scene, [sx, sy] = SCREEN, cam = s.cameras.main, tw = (targets: object, cfg: object) => s.tweens.add({ targets, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', ...cfg });
    const puff = (x: number, y: number, kx: number, ky: number, tint: number, a: number) => s.add.image(x, y, 'puff').setScale(S * kx, S * ky).setTint(tint).setBlendMode('ADD').setAlpha(a);
    const rimGlow = hf.below(s.add.image(sx - 10, sy - 10, 'hf_rv_rim').setOrigin(0).setScale(0.5).setBlendMode('ADD').setTint(0x5f9cff).setAlpha(0.5), 'screen');
    MON.forEach((x, i) => { // each console: its screen breathing and now and then redrawing, and a status light on the desk
      tw(hf.below(puff(x + 10, 158, 2.6, 1.7, hue(i), 0.3), 'screen'), { alpha: 0.55, duration: 900 + ((i * 370) % 1100) });
      tw(hf.below(puff(x + 21, 166.4, 0.22, 0.22, i % 2 ? 0x7cf08a : 0xffb347, 0.9), 'screen'), { alpha: 0.1, duration: 400 + i * 130 });
    });
    // the display's glass, over everything drawn on it: its rows, a refresh band travelling down, the room mirrored faintly
    hf.above(s.add.image(sx, sy, 'hf_rv_glass').setOrigin(0).setScale(0.5), 'traces'); hf.above(s.add.image(sx, sy, 'hf_rv_lines').setOrigin(0).setScale(1 / D).setAlpha(0.3), 'traces');
    const sweep = hf.above(s.add.image(sx, sy, 'hf_rv_sweep').setOrigin(0).setBlendMode('ADD'), 'traces'); s.tweens.add({ targets: sweep, y: sy + 102, duration: 5200, repeat: -1 });
    const cursor = hf.above(puff(0, 0, 1.3, 2.4, 0xffe98a, 0), 'traces'), hot = hf.above(puff(0, 0, 3, 7, 0xff5a3c, 0), 'traces');
    o = { rim: rimGlow, sweep, cursor, hot, wrong: hf.state.wrong || 0, flash: 0, sx: cam.scrollX, sy: cam.scrollY };
  },
  step(hf, dt) {
    if (!o) return;
    const st = hf.state, t = hf.t, run = st.run, k = run >= 0 ? st.prog : 0;
    if (st.wrong > o.wrong) { o.wrong = st.wrong; o.flash = 1; } o.flash = Math.max(0, o.flash - dt * 1.6); // a false lead: the rim goes red and fades
    // the rim: steady blue while reading, amber while a test runs, red and pulsing once the fault shows itself, green when the trace is found
    const tint = o.flash > 0.05 ? 0xff5a3c : st.shown ? 0xff5a3c : run >= 0 ? 0xffb347 : st.phase === 3 ? 0x7cf08a : 0x5f9cff;
    o.rim.setTint(tint).setAlpha(o.flash > 0.05 ? 0.4 + 0.6 * o.flash : st.shown ? 0.55 + 0.3 * Math.sin(t * 6) : run >= 0 ? 0.5 + 0.3 * k : 0.42 + 0.08 * Math.sin(t * 1.3));
    o.cursor.setPosition(st.cx, st.cy).setAlpha(st.phase === 1 ? 0.3 + 0.1 * Math.sin(t * 5) : 0);
    o.hot.setPosition(136 + st.bad * 30, 62).setAlpha(st.phase === 2 && (st.shown || run === 3) ? (st.shown ? 0.34 + 0.12 * Math.sin(t * 9) : 0.3 * k) : 0); // the connection that gives itself away
    // on the bench: the three hot tests bend the air over the harness, and the shaker shakes it (the words, on their own camera, hold still)
    hf.heat(HARNESS[0], HARNESS[1], 60, run > 0 ? 0.25 + 0.5 * k : 0);
    if (hf.gl) hf.scene.cameras.main.setScroll(o.sx + (run === 0 ? Math.sin(t * 83) * 0.3 : 0), o.sy + (run === 0 ? Math.sin(t * 97 + 1) * 0.22 : 0));
  },
};
