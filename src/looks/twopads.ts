import Phaser from 'phaser';
import { D, C2, rr, line, poly, lg, rng } from '../art';
import { texAt, soft } from '../hifi';
import type { Look } from '../hifi';
import { MAHIA, WALLOPS, padTextures, padView, padStep, Pad, View } from './padview';

// ------------------------------------------------------------------ Two Hemispheres: two pads, each under its own sky
// The level's own times set the light. "HASTE A La Vista" left Launch Complex 2 at 06:00 UTC on 24 November 2024, which
// is one o'clock in the morning at Wallops: night, the pad under floodlights. The moon was a day past last quarter, so
// by the calendar it came up out of the Atlantic about half an hour before lift-off (worked out from the phase, not
// taken from a source). "Ice AIS Baby" left Launch Complex 1 at 03:55 UTC on the 25th, 4:55 pm at Māhia in late spring:
// the sun about a third of the way up and behind the viewer. In between the level's clock runs a day past in seconds,
// and each picture follows its own local time: gold toward sunset, the pink band opposite it, stars, first light.
// The weather (fair, a little high cloud) and which way each camera looks (out to sea) are the game's choice.
// The pictures, the panels and the call lights stay in the world, as two wall displays over two consoles; the words are HUD.
const X0 = [3, 161], WY = 24, WW = 156, WH = 80, PADS: Record<string, Pad> = { hf_pv_mahia_day: MAHIA, hf_pv_wallops_day: WALLOPS };

function room(c: C2) {
  const r = rng(5);
  // the wall of the control room: acoustic panels in the dark, and the housings of the two displays and the consoles under them
  c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#060912'], [0.6, '#0a0f1e'], [1, '#0d1428']); c.fillRect(0, 0, 320, 180);
  for (let x = 0; x < 320; x += 20) for (let y = 0; y < 180; y += 18) { rr(c, x + 0.4, y + 0.4, 19.2, 17.2, 0.6, `rgba(120,150,220,${0.012 + r() * 0.02})`); line(c, x + 0.6, y + 0.7, x + 19.4, y + 0.7, 'rgba(160,190,255,.05)', 0.25); }
  const housing = (x: number, y: number, w: number, h: number) => { rr(c, x - 1.8, y - 1.8, w + 3.6, h + 3.6, 4.2, lg(c, 0, y - 2, 0, y + h + 2, [0, '#2c3654'], [0.5, '#151b30'], [1, '#0a0e1c']), 'rgba(0,0,0,.7)', 0.4); rr(c, x - 0.6, y - 0.6, w + 1.2, h + 1.2, 3.2, '#03050b'); line(c, x + 3, y - 1.5, x + w - 3, y - 1.5, 'rgba(176,200,255,.34)', 0.25); };
  housing(4, 4, 312, 16);
  for (const x of X0) { housing(x, WY, WW, WH); housing(x, 106, WW, 70); }
  c.globalCompositeOperation = 'destination-out'; for (const x of X0) rr(c, x, WY, WW, WH, 2, '#000'); c.globalCompositeOperation = 'source-over';
  // the glass of each display: a shadow just inside its frame, and the room faintly in it
  for (const x of X0) {
    c.save(); rr(c, x, WY, WW, WH, 2); c.clip();
    c.fillStyle = lg(c, 0, WY, 0, WY + 12, [0, 'rgba(0,3,12,.55)'], [1, 'rgba(0,3,12,0)']); c.fillRect(x, WY, WW, 12);
    c.fillStyle = lg(c, 0, WY + WH - 5, 0, WY + WH, [0, 'rgba(0,3,12,0)'], [1, 'rgba(0,3,12,.4)']); c.fillRect(x, WY + WH - 5, WW, 5);
    for (const [e, d] of [[x, 1], [x + WW, -1]]) { c.fillStyle = lg(c, e, 0, e + d * 6, 0, [0, 'rgba(0,3,12,.4)'], [1, 'rgba(0,3,12,0)']); c.fillRect(Math.min(e, e + d * 6), WY, 6, WH); }
    for (const [dx, w, a] of [[18, 16, 0.03], [42, 4, 0.045], [112, 22, 0.022]]) poly(c, [x + dx, WY + WH, x + dx + w, WY + WH, x + dx + w + 34, WY, x + dx + 34, WY], `rgba(200,220,255,${a})`);
    c.restore(); rr(c, x, WY, WW, WH, 2, undefined, 'rgba(190,210,255,.22)', 0.3);
  }
}
const rim = (w: number, h: number) => (c: C2) => { soft(c, 3); rr(c, 8, 8, w, h, 4, undefined, 'rgba(255,255,255,.9)', 2.2); soft(c, 0); }; // the light a panel throws round its own edge

type Im = Phaser.GameObjects.Image;
let o: { views: View[]; desk: Im[]; glass: Im[] } | undefined;
export const twopadsLook: Look = {
  build(scene) {
    padTextures(scene, MAHIA); padTextures(scene, WALLOPS);
    texAt(scene, 'hf_tp_room', 320, 180, D, room); texAt(scene, 'hf_tp_rim', WW + 16, 86, 2, rim(WW, 70)); texAt(scene, 'hf_tp_wrim', WW + 16, WH + 16, 2, rim(WW, WH));
  },
  layers: [],
  swap: { site_mahia: 'hf_pv_mahia_day', site_wallops: 'hf_pv_wallops_day' },
  grade: { threshold: 0.88, bloom: 0.5, exposure: 1.03, contrast: 1.08, saturation: 1.12, shadows: [0.9, 0.96, 1.14], highs: [1.05, 1.0, 0.94], vignette: 0.34, grain: 0.02, fringe: 0.004 },
  live(hf) {
    const s = hf.scene, t = hf.tags, world = new Set(Object.values(t)), words = s.children.list.filter((q) => !world.has(q));
    const views = [0, 1].map((i) => padView(hf, PADS[(t['site' + i] as Im).texture.key], { ox: X0[i] - 2, oy: 28, sky: 'sky' + i, site: 'site' + i, rocket: 'rocket' + i, flame: 'flame' + i }));
    s.add.image(0, 0, 'hf_tp_room').setOrigin(0).setScale(1 / D); // over the pictures: whatever leaves a display goes behind its housing
    const glass = X0.map((x) => s.add.image(x - 8, WY - 8, 'hf_tp_wrim').setOrigin(0).setScale(0.5).setBlendMode('ADD').setAlpha(0)), desk = X0.map((x) => s.add.image(x - 8, 98, 'hf_tp_rim').setOrigin(0).setScale(0.5).setBlendMode('ADD').setAlpha(0));
    for (const q of [t.top, t.desk0, t.desk1, ...words]) s.children.bringToTop(q); // the panels sit on the wall, over its light; the words (on the HUD camera, or over the panels where there is none) keep their order
    o = { views, desk, glass };
  },
  step(hf, dt) {
    if (!o) return;
    const st = hf.state, t = hf.t; let best = 0, at: View | undefined;
    o.views.forEach((v, i) => {
      const b = padStep(v, hf, dt, st['l' + i], st['h' + i], st['r' + i], st['s' + i]); if (b > best) { best = b; at = v; }
      // each console's rim: quiet blue, green and brightening while a GO waits for its answer, red and flashing for a NO-GO
      const c = st['c' + i], u = st['u' + i] || 0;
      o!.desk[i].setTint(c === 2 ? 0xff4a3a : c === 1 ? 0x58e08a : 0x4f7fd0).setAlpha(c === 2 ? 0.55 + 0.45 * Math.sin(t * 19) : c === 1 ? 0.4 + 0.5 * u : 0.2 + 0.04 * Math.sin(t * 1.3 + i));
      o!.glass[i].setTint(v.b > 0.05 ? 0xffb070 : 0x6f9cff).setAlpha(0.14 + 0.6 * v.b);
    });
    hf.heat(at ? at.rocket.x : 0, at ? at.rocket.y + 8 : 0, 16, best * 0.6);
  },
};
