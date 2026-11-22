import Phaser from 'phaser';
import { D, S, C2, rr, line, poly, lg, rng } from '../art';
import { texAt, soft } from '../hifi';
import type { Look } from '../hifi';
import { MAHIA, padTextures, padView, padStep, View } from './padview';

// ------------------------------------------------------------------ VICTUS HAZE: Launch Complex 1 from the notice to the launch
// The level's own account gives both ends of the day: lift-off at 10:19 pm New Zealand time on 19 June 2026, 16 hours
// 42 minutes after the notice, which therefore arrived at 5:37 am. It is two days short of the winter solstice at 39°
// south, so the notice comes in the dark, the sun is up for under ten hours (about 7:20 to 5:00, by the calendar) and
// never climbs far, and the launch is a night launch under the pad's floodlights. The moon was four days old and had set
// by then (worked out from the phase, not taken from a source), so the sky over the sea is dark and the Milky Way is in
// it. The weather (fair) and which way the camera looks (out to sea, the sun rising in frame) are the game's choice.
// The picture, the panels and the job list stay in the world, as a wall display beside a job board; the words are HUD.
const RX = 164, RY = 26, PW = 152, PH = 90;

function room(c: C2) {
  const r = rng(8);
  c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#060912'], [0.6, '#0a0f1e'], [1, '#0d1428']); c.fillRect(0, 0, 320, 180);
  for (let x = 0; x < 320; x += 20) for (let y = 0; y < 180; y += 18) { rr(c, x + 0.4, y + 0.4, 19.2, 17.2, 0.6, `rgba(120,150,220,${0.012 + r() * 0.02})`); line(c, x + 0.6, y + 0.7, x + 19.4, y + 0.7, 'rgba(160,190,255,.05)', 0.25); } // acoustic panels in the dark
  const housing = (x: number, y: number, w: number, h: number) => { rr(c, x - 1.8, y - 1.8, w + 3.6, h + 3.6, 4.2, lg(c, 0, y - 2, 0, y + h + 2, [0, '#2c3654'], [0.5, '#151b30'], [1, '#0a0e1c']), 'rgba(0,0,0,.7)', 0.4); rr(c, x - 0.6, y - 0.6, w + 1.2, h + 1.2, 3.2, '#03050b'); line(c, x + 3, y - 1.5, x + w - 3, y - 1.5, 'rgba(176,200,255,.34)', 0.25); };
  housing(4, 4, 312, 18); housing(4, RY, 156, 150); housing(RX, RY, PW, PH);
  // the crews' desk under the display: a dark plate, a row for each crew
  rr(c, RX, RY + PH + 3, PW, 57, 3, lg(c, 0, RY + PH + 3, 0, 176, [0, '#0d1326'], [1, '#080c18']), 'rgba(150,176,240,.16)', 0.3);
  for (const y of [RY + 92.6, RY + 104.6]) rr(c, RX + 2, y, PW - 4, 9.6, 2, 'rgba(4,6,14,.6)', 'rgba(150,176,240,.1)', 0.25);
  c.globalCompositeOperation = 'destination-out'; rr(c, RX, RY, PW, PH, 2, '#000'); c.globalCompositeOperation = 'source-over';
  // the glass of the display: a shadow just inside its frame, and the room faintly in it
  c.save(); rr(c, RX, RY, PW, PH, 2); c.clip();
  c.fillStyle = lg(c, 0, RY, 0, RY + 12, [0, 'rgba(0,3,12,.5)'], [1, 'rgba(0,3,12,0)']); c.fillRect(RX, RY, PW, 12);
  c.fillStyle = lg(c, 0, RY + PH - 9, 0, RY + PH, [0, 'rgba(0,3,12,0)'], [1, 'rgba(0,3,12,.55)']); c.fillRect(RX, RY + PH - 9, PW, 9);
  for (const [e, d] of [[RX, 1], [RX + PW, -1]]) { c.fillStyle = lg(c, e, 0, e + d * 6, 0, [0, 'rgba(0,3,12,.4)'], [1, 'rgba(0,3,12,0)']); c.fillRect(Math.min(e, e + d * 6), RY, 6, PH); }
  for (const [dx, w, a] of [[16, 16, 0.03], [40, 4, 0.045], [108, 22, 0.022]]) poly(c, [RX + dx, RY + PH, RX + dx + w, RY + PH, RX + dx + w + 38, RY, RX + dx + 38, RY], `rgba(200,220,255,${a})`);
  c.restore(); rr(c, RX, RY, PW, PH, 2, undefined, 'rgba(190,210,255,.22)', 0.3);
}
const rim = (w: number, h: number) => (c: C2) => { soft(c, 3); rr(c, 8, 8, w, h, 4, undefined, 'rgba(255,255,255,.9)', 2.2); soft(c, 0); }; // the light a panel throws round its own edge

type Im = Phaser.GameObjects.Image;
let o: { view: View; glass: Im; top: Im; list: Im; crew: Im[] } | undefined;
export const hazeLook: Look = {
  build(scene) {
    padTextures(scene, MAHIA);
    texAt(scene, 'hf_hz_room', 320, 180, D, room); texAt(scene, 'hf_hz_prim', PW + 16, PH + 16, 2, rim(PW, PH)); texAt(scene, 'hf_hz_lrim', 172, 166, 2, rim(156, 150)); texAt(scene, 'hf_hz_trim', 328, 34, 2, rim(312, 18));
  },
  layers: [],
  swap: { site_mahia: 'hf_pv_mahia_day' },
  grade: { threshold: 0.86, bloom: 0.55, exposure: 1.03, contrast: 1.08, saturation: 1.12, shadows: [0.9, 0.96, 1.14], highs: [1.05, 1.0, 0.94], vignette: 0.34, grain: 0.02, fringe: 0.004 },
  live(hf) {
    const s = hf.scene, t = hf.tags, world = new Set(Object.values(t)), words = s.children.list.filter((q) => !world.has(q));
    (t.stars as Im).setVisible(false); // the look's night sky has its own
    const view = padView(hf, MAHIA, { ox: RX - 4, oy: RY + 16, sky: 'sky', site: 'site', rocket: 'rocket', flame: 'flame' });
    s.add.image(0, 0, 'hf_hz_room').setOrigin(0).setScale(1 / D); // over the picture: whatever leaves the display goes behind its housing
    const glow = (x: number, y: number, key: string) => s.add.image(x - 8, y - 8, key).setOrigin(0).setScale(0.5).setBlendMode('ADD').setAlpha(0);
    const glass = glow(RX, RY, 'hf_hz_prim'), top = glow(4, 4, 'hf_hz_trim'), list = glow(4, RY, 'hf_hz_lrim');
    const crew = [0, 1].map((i) => s.add.image(RX + 76, RY + 97.4 + i * 12, 'puff').setScale(S * 9.4, S * 0.7).setBlendMode('ADD').setAlpha(0)); // each crew's row: green at work, amber and pulsing while a job waits for them
    for (const q of [t.top, t.list, t.rows, ...words]) s.children.bringToTop(q); // the panels sit on the wall, over its light; the words keep their order
    o = { view, glass, top, list, crew };
  },
  step(hf, dt) {
    if (!o) return;
    const st = hf.state, t = hf.t, v = o.view, b = padStep(v, hf, dt, st.l, st.h, st.r, st.s);
    o.glass.setTint(v.b > 0.05 ? 0xffb070 : 0x6f9cff).setAlpha(0.14 + 0.6 * v.b);
    o.top.setTint(st.late ? 0xff7a5a : 0xffe98a).setAlpha(0.2 + 0.05 * Math.sin(t * 1.1)); o.list.setTint(0x4f7fd0).setAlpha(0.2 + 0.04 * Math.sin(t * 1.3));
    o.crew.forEach((q, i) => { const w = st['w' + i]; q.setTint(w === 1 ? 0x58e08a : w === 0 ? 0xffb347 : 0x4f7fd0).setAlpha(w === 1 ? 0.22 : w === 0 ? 0.24 + 0.16 * Math.sin(t * 7) : 0.1); });
    hf.heat(v.rocket.x, v.rocket.y + 8, 16, b * 0.6);
  },
};
