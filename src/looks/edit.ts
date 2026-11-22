import Phaser from 'phaser';
import { D, S, C2, rr, el, line, lg, rg, rng, OUT } from '../art';
import { roomQ2 } from '../scenes/EditBay';
import { texAt, soft, add, halo, sheet, relight } from '../hifi';
import type { Look } from '../hifi';

// ------------------------------------------------------------------ Four channels, one call: the edit desk
// The edit desk is a role the game invents, so it has no real room and no real hour. The clocks on its wall run from
// early afternoon in Los Angeles to past midnight in Amsterdam, and the plain backdrop settles it as a creator's desk
// late in the evening: a dark room, acoustic foam, a ring light, a strip of coloured LEDs. That is the light kept here
// (the game's choice, for both acts): no daylight, only the room's own lamps and its screens. The foam is shaded wedge
// by wedge from the ring light and the LED strip, the lamps glow and breathe, the strip follows the voice under the
// cursor, and each channel's lamp says how its upload is going. The room, the panels and everything drawn on them (the
// waveform, the lanes, the clock hands) stay in the world and glow; every word and every face is on the HUD camera.
const RING = [262, 100], STRIP = 81.9, LX = 4, LY = 85, LW = 202, LH = 22.6, CLX = 228, CLY = 151;
const hue = (k: number) => (k < 0.5 ? [255 + (138 - 255) * k * 2, 61 + (92 - 61) * k * 2, 110 + (255 - 110) * k * 2] : [138 + (63 - 138) * (k * 2 - 1), 92 + (208 - 92) * (k * 2 - 1), 255]); // the strip, pink to violet to cyan, as drawn

function room(c: C2) {
  const r = rng(6);
  // the wall: every foam tile a block of wedges, lit by the ring light and from the strip, dark everywhere else
  c.fillStyle = '#07060e'; c.fillRect(0, 0, 320, 180);
  for (let y = 0; y < 180; y += 10) for (let x = 0; x < 320; x += 10) {
    const odd = (x / 10 + y / 10) % 2, dx = x + 5 - RING[0], dy = y + 5 - RING[1], ring = Math.max(0, 1 - Math.hypot(dx, dy) / 120) ** 2, st = Math.max(0, 1 - Math.abs(y + 5 - STRIP) / 52) ** 1.6, h = hue(x / 320), k = 0.36 + r() * 0.1;
    const base = odd ? [56, 30, 52] : [36, 26, 46], col = base.map((v, i) => Math.min(255, v * (k + ring * 1.0 + st * 0.7) + ring * [44, 36, 28][i] + st * h[i] * 0.3));
    rr(c, x + 0.4, y + 0.4, 9.2, 9.2, 1, `rgb(${col.map(Math.round).join(',')})`);
    const up = y + 5 > STRIP ? -1 : 1, lit = Math.min(0.7, 0.06 + ring * 0.6 + st * 0.5); // the strip lights the wedges' near faces; the ring light, the faces turned to it
    for (let i = 0; i < 3; i++) { const wy = y + 2.4 + i * 2.6; line(c, x + 1.4, wy + up * 0.5, x + 8.6, wy + up * 0.5, `rgba(${Math.round(160 + st * (h[0] - 160))},${Math.round(150 + st * (h[1] - 150))},${Math.round(170 + st * (h[2] - 170))},${lit * 0.5})`, 0.5); line(c, x + 1.4, wy - up * 0.5, x + 8.6, wy - up * 0.5, 'rgba(0,0,0,.4)', 0.7); }
  }
  c.fillStyle = rg(c, 160, 96, 70, 230, [0, 'rgba(0,0,0,0)'], [1, 'rgba(2,2,8,.62)']); c.fillRect(0, 0, 320, 180); // the corners of the room fall away
  // the shelf the microphone stands on, and what the lamps do to the air
  c.fillStyle = lg(c, 0, 176.4, 0, 180, [0, '#2a2438'], [1, '#0e0c16']); c.fillRect(206, 176.4, 114, 3.6); line(c, 206, 176.5, 320, 176.5, 'rgba(255,236,214,.28)', 0.3);
  halo(c, RING[0], RING[1], 86, '255,236,214', 0.22);
  add(c, () => { for (let x = 0; x < 320; x += 4) { const h = hue(x / 320); c.fillStyle = lg(c, 0, STRIP - 16, 0, STRIP + 16, [0, `rgba(${h.map(Math.round).join(',')},0)`], [0.5, `rgba(${h.map(Math.round).join(',')},.3)`], [1, `rgba(${h.map(Math.round).join(',')},0)`]); c.fillRect(x, STRIP - 16, 4, 32); } });
  // the ring light's stand, then the plain drawing's own things (bezels, sticky notes, the microphone), found by the lamps
  line(c, RING[0], RING[1] + 23, RING[0], 177, '#15131f', 1.3); line(c, RING[0] + 0.5, RING[1] + 23, RING[0] + 0.5, 177, 'rgba(255,236,214,.2)', 0.25); rr(c, RING[0] - 6, 175.4, 12, 1.6, 0.6, '#1c1a28');
  relight(c, sheet(320, 180, D, (t) => roomQ2(t, 2)), 320, 180, 'rgba(4,4,12,.45)', (m) => { m.fillStyle = rg(m, RING[0], RING[1], 10, 110, [0, 'rgba(0,0,0,.9)'], [1, 'rgba(0,0,0,0)']); m.fillRect(0, 0, 320, 180); m.fillStyle = lg(m, 0, STRIP - 14, 0, STRIP + 14, [0, 'rgba(0,0,0,0)'], [0.5, 'rgba(0,0,0,.6)'], [1, 'rgba(0,0,0,0)']); m.fillRect(0, STRIP - 14, 320, 28); m.fillStyle = rg(m, 312, 152, 2, 22, [0, 'rgba(0,0,0,.8)'], [1, 'rgba(0,0,0,0)']); m.fillRect(290, 130, 30, 50); });
  line(c, 314.2, 141, 314.2, 149, 'rgba(255,236,214,.5)', 0.3); line(c, 310, 140.4, 314, 140.4, 'rgba(255,236,214,.4)', 0.3); // the microphone's edge, to the ring light
  roomQ2(c, 4); // the lamps themselves at full brightness: these are what the bloom catches
  c.beginPath(); c.arc(RING[0], RING[1], 22, 0, Math.PI * 2); c.strokeStyle = 'rgba(255,250,240,.3)'; c.lineWidth = 1.5; c.stroke();
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; el(c, RING[0] + Math.cos(a) * 22, RING[1] + Math.sin(a) * 22, 0.36, 0.36, 'rgba(255,255,255,.7)'); } // its ring of LEDs
  for (let x = 1; x < 320; x += 2.4) { const h = hue(x / 320); rr(c, x, STRIP - 0.45, 1.3, 0.9, 0.3, `rgb(${h.map((v) => Math.round(v + (255 - v) * 0.45)).join(',')})`); } // the strip's own diodes
}
function clock(c: C2) { // the plain clock face, with a rim that catches the ring light and a little depth under the glass
  el(c, 11, 11, 10.6, 10.6, '#0b0c12'); el(c, 11, 11, 10.4, 10.4, undefined, 'rgba(255,236,214,.5)', 0.3);
  el(c, 11, 11, 9.6, 9.6, lg(c, 0, 1, 0, 21, [0, '#f4f1e8'], [1, '#d8d2c2']), OUT, 0.5);
  c.save(); c.beginPath(); c.arc(11, 11, 9.4, 0, Math.PI * 2); c.clip(); c.fillStyle = rg(c, 11, 12.4, 6.6, 10.6, [0, 'rgba(60,50,40,0)'], [1, 'rgba(60,50,40,.34)']); c.fillRect(0, 0, 22, 22); c.restore();
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; line(c, 11 + Math.sin(a) * 7.8, 11 - Math.cos(a) * 7.8, 11 + Math.sin(a) * (k % 3 ? 8.7 : 9.1), 11 - Math.cos(a) * (k % 3 ? 8.7 : 9.1), '#3a3c48', k % 3 ? 0.35 : 0.7); }
}
const rim = (w: number, h: number) => (c: C2) => { soft(c, 3); rr(c, 8, 8, w, h, 4, undefined, 'rgba(255,255,255,.9)', 2.2); soft(c, 0); }; // the light a screen throws round its own edge

type Im = Phaser.GameObjects.Image;
let o: { ring: Im; strip: Im; voice: Im; rims: Im[]; lamps: Im[]; heads: Im[]; cut: Im; sweep: Im; cuts: number; flash: number } | undefined;
export const editLook: Look = {
  build(scene) {
    texAt(scene, 'hf_eb_room', 320, 180, D, room); texAt(scene, 'hf_eb_clock', 22, 22, D, clock);
    texAt(scene, 'hf_eb_strip', 320, 36, 1, (c) => { for (let x = 0; x < 320; x += 4) { const h = hue(x / 320).map(Math.round).join(','); c.fillStyle = lg(c, 0, 0, 0, 36, [0, `rgba(${h},0)`], [0.5, `rgba(${h},.8)`], [1, `rgba(${h},0)`]); c.fillRect(x, 0, 4, 36); } });
    texAt(scene, 'hf_eb_rtape', 328, 77, 2, rim(312, 61)); texAt(scene, 'hf_eb_rlane', 218, 110.4, 2, rim(LW, LH * 4 + 4)); texAt(scene, 'hf_eb_rtray', 122, 50, 2, rim(106, 34));
    texAt(scene, 'hf_eb_lines', 308, 58, D, (c) => { for (let y = 0; y < 58; y += 1) { c.fillStyle = 'rgba(0,4,14,.5)'; c.fillRect(0, y + 0.5, 308, 0.5); } });
    texAt(scene, 'hf_eb_sweep', 308, 12, 1, (c) => { c.fillStyle = lg(c, 0, 0, 0, 12, [0, 'rgba(160,210,255,0)'], [0.8, 'rgba(160,210,255,.04)'], [1, 'rgba(200,230,255,.09)']); c.fillRect(0, 0, 308, 12); });
    texAt(scene, 'hf_eb_shadow', 30, 30, 2, (c) => { c.fillStyle = rg(c, 15, 16.5, 7, 14, [0, 'rgba(0,0,6,.7)'], [1, 'rgba(0,0,6,0)']); c.fillRect(0, 0, 30, 30); });
  },
  layers: [],
  swap: { 'eb_room_q2-2024': 'hf_eb_room', eb_clock: 'hf_eb_clock' },
  grade: { threshold: 0.8, bloom: 0.6, exposure: 1.04, contrast: 1.08, saturation: 1.12, shadows: [0.92, 0.9, 1.16], highs: [1.06, 1.0, 0.94], vignette: 0.4, grain: 0.024, fringe: 0.002 },
  live(hf) {
    const s = hf.scene, wall = <T extends Phaser.GameObjects.GameObject>(q: T) => hf.above(q, 'room');
    const puff = (x: number, y: number, kx: number, ky: number, tint: number) => s.add.image(x, y, 'puff').setScale(S * kx, S * ky).setTint(tint).setBlendMode('ADD').setAlpha(0);
    // on the wall, behind the screens: each clock's shadow, the lamps' glow, the light each screen throws round itself, dust in the ring light
    for (let i = 0; i < 3; i++) wall(s.add.image(CLX + i * 34, CLY, 'hf_eb_shadow').setScale(0.5));
    const rims = [[4, 20, 'hf_eb_rtape'], [LX, LY - 3, 'hf_eb_rlane'], [210, LY - 3, 'hf_eb_rtray']].map(([x, y, k]) => wall(s.add.image((x as number) - 8, (y as number) - 8, k as string).setOrigin(0).setScale(0.5).setBlendMode('ADD').setAlpha(0)));
    const strip = wall(s.add.image(0, STRIP - 9, 'hf_eb_strip').setOrigin(0).setScale(1, 0.5).setBlendMode('ADD').setAlpha(0)), voice = wall(puff(160, STRIP, 12, 1.1, 0xffffff)), ring = wall(puff(RING[0], RING[1], 5, 5, 0xffeeda));
    wall(s.add.particles(0, 0, 'puff', { x: { min: 208, max: 318 }, y: { min: 118, max: 178 }, lifespan: { min: 4000, max: 8000 }, speedX: { min: -2, max: 2 }, speedY: { min: -3, max: 1 }, scale: { min: S * 0.03, max: S * 0.09 }, alpha: { values: [0, 0.6, 0.35, 0.6, 0] } as any, tint: 0xffeeda, blendMode: 'ADD', frequency: 260, advance: 5000 }));
    // on the screens, over what is drawn there: the tape display's rows and its refresh band, a flash where the blade falls, each channel's lamp and the bright head of its upload
    s.add.image(6, 21, 'hf_eb_lines').setOrigin(0).setScale(1 / D).setAlpha(0.22).setDepth(2.4);
    const sweep = s.add.image(6, 21, 'hf_eb_sweep').setOrigin(0).setBlendMode('ADD').setDepth(2.4); s.tweens.add({ targets: sweep, y: 67, duration: 5200, repeat: -1 });
    const cut = puff(160, 57, 1.2, 5.4, 0xffffff).setDepth(2.5);
    const lamps = [0, 1, 2, 3].map((i) => puff(LX + LW - 13, LY + i * LH + 3.3, 1.9, 0.9, 0xff4a3a).setDepth(2.5)), heads = [0, 1, 2, 3].map((i) => puff(0, LY + i * LH + 16.1, 0.7, 0.7, 0xffe98a).setDepth(2.5));
    o = { ring, strip, voice, rims, lamps, heads, cut, sweep, cuts: hf.state.cuts || 0, flash: 0 };
  },
  step(hf, dt) {
    if (!o) return;
    const st = hf.state, t = hf.t, amp = st.amp || 0;
    o.ring.setAlpha(0.3 + 0.03 * Math.sin(t * 2.3) + 0.02 * Math.sin(t * 17));
    o.strip.setAlpha(0.42 + 0.1 * Math.sin(t * 0.9) + 0.3 * amp); // the strip breathes, and follows the voice under the cursor: red for a creator's question, blue for a guest's answer
    o.voice.setTint(st.q === 1 ? 0xff7a5a : 0x6fa8ff).setAlpha(st.q ? 0.14 + 0.4 * amp : 0);
    if (st.cuts > o.cuts) o.flash = 1; o.cuts = st.cuts; o.flash = Math.max(0, o.flash - dt * 2.4); o.cut.setAlpha(st.mode ? 0 : o.flash * 0.9);
    let stall = 0, live = 0, up = 0;
    for (let i = 0; i < 4; i++) {
      const k = st['s' + i], p = st['p' + i] || 0; if (k === 2) stall = 1; if (k >= 5) live++; if (k === 1) up++;
      o.lamps[i].setTint(k === 5 ? 0xff4a3a : 0xff8a3a).setAlpha(k >= 5 ? 0.3 + 0.12 * Math.sin(t * 3 + i) : k === 2 ? 0.2 + 0.2 * Math.sin(t * 15) : 0); // LIVE: the red lamp; stalled: it flickers amber
      o.heads[i].setX(LX + 23 + (LW - 30) * p).setAlpha(k === 1 ? 0.55 + 0.25 * Math.sin(t * 9 + i) : 0);
    }
    o.rims[0].setTint(st.mode ? (st.render > 0 && st.render < 1 ? 0x8fe8a0 : 0x5f9cff) : st.q === 1 ? 0xff8a70 : 0x5f9cff).setAlpha(0.26 + 0.06 * Math.sin(t * 1.3) + (st.mode ? 0.3 * st.render * (st.render < 1 ? 1 : 0) : Math.min(0.2, st.vel / 900)));
    o.rims[1].setTint(stall ? 0xff5a3c : live === 4 ? 0x7cf08a : 0x5f9cff).setAlpha(stall ? 0.45 + 0.3 * Math.sin(t * 15) : 0.24 + 0.08 * up + 0.05 * Math.sin(t * 1.1));
    o.rims[2].setTint(0xffe98a).setAlpha(0.16 + 0.04 * Math.sin(t * 1.7));
  },
};
