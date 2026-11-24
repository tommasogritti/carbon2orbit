import Phaser from 'phaser';
import { D, S, C2, rr, poly, lg, rg } from '../art';
import { texAt, soft } from '../hifi';
import type { Look } from '../hifi';
import { fxSet } from '../hifiFx';
import { roomFor } from './review';

// ------------------------------------------------------------------ Paschen's Law, act two: the laboratory, autumn 2023
// The review runs from 19 September to the findings of 8 November 2023, so the act has no one hour, and the plain scene
// has no window to show one: it uses the review room of flight 13. That is kept (the game's choice, as there): a dark
// room lit by what is on its displays. The plot is the experiment, so the look makes an instrument of it: its curve and
// its danger band glow behind glass, a bar of light follows the pressure down, and its rim says where the experiment
// stands. The arc is the set piece. On WebGL a shader strikes it, again and again along a new path, where the plain scene
// draws a zigzag; it lights the room, bends the air, catches the exposure out and draws a streak through the lens.
// An arc-lab scene keeps its room, panels and plot in the world and every word on the HUD camera.
const HEAD = [4, 4, 312, 16], LIST = [4, 24, 110, 100], PANEL = [118, 24, 198, 100], SW = [4, 128, 312, 30], PLOT = [122, 34, 186, 84], MON = [0, 1, 2, 3, 4, 5, 6].map((i) => 112 + i * 30);

function lines(c: C2) { for (let y = 0; y < PLOT[3]; y += 1) { c.fillStyle = 'rgba(0,4,14,.5)'; c.fillRect(0, y + 0.5, PLOT[2], 0.5); } } // the display's own rows
function glass(c: C2) { // the room, faintly, in the glass of the display
  const [, , w, h] = PLOT; c.save(); rr(c, 0, 0, w, h, 1.5); c.clip();
  for (const [x, bw, a] of [[18, 14, 0.05], [38, 4, 0.07], [128, 22, 0.035]]) poly(c, [x, h, x + bw, h, x + bw + 34, 0, x + 34, 0], `rgba(190,214,255,${a})`);
  c.fillStyle = lg(c, 0, 0, 0, 22, [0, 'rgba(190,214,255,.07)'], [1, 'rgba(190,214,255,0)']); c.fillRect(0, 0, w, 22);
  c.fillStyle = rg(c, w / 2, h / 2, 40, 120, [0, 'rgba(0,0,0,0)'], [1, 'rgba(0,2,10,.5)']); c.fillRect(0, 0, w, h); c.restore();
}
function rim(c: C2) { soft(c, 3); rr(c, 8, 8, PANEL[2] + 4, PANEL[3] + 4, 4, undefined, 'rgba(255,255,255,.9)', 2.2); soft(c, 0); } // the light the display throws round its own edge
function bar(c: C2) { c.fillStyle = lg(c, 0, 0, 12, 0, [0, 'rgba(200,226,255,0)'], [0.5, 'rgba(200,226,255,.5)'], [1, 'rgba(200,226,255,0)']); c.fillRect(0, 0, 12, PLOT[3]); }

type Im = Phaser.GameObjects.Image;
let o: { rim: Im; bar: Im; arc?: Im; corona: Im; wash: Im; was: number } | undefined;
export const labLook: Look = {
  build(scene) {
    texAt(scene, 'hf_lb_room', 320, 180, D, roomFor([HEAD, LIST, PANEL, SW], [], 159));
    texAt(scene, 'hf_lb_lines', PLOT[2], PLOT[3], D, lines); texAt(scene, 'hf_lb_glass', PLOT[2], PLOT[3], 2, glass); texAt(scene, 'hf_lb_rim', PANEL[2] + 20, PANEL[3] + 20, 2, rim); texAt(scene, 'hf_lb_bar', 12, PLOT[3], 2, bar);
  },
  layers: [],
  swap: { bg_review: 'hf_lb_room' },
  grade: { threshold: 0.5, bloom: 0.8, exposure: 1.05, contrast: 1.1, saturation: 1.14, shadows: [0.84, 0.95, 1.22], highs: [1.04, 1.0, 0.95], vignette: 0.5, grain: 0.03, fringe: 0.006 },
  live(hf) {
    const s = hf.scene, [px, py, pw, ph] = PLOT, tw = (targets: object, cfg: object) => s.tweens.add({ targets, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', ...cfg });
    const puff = (x: number, y: number, kx: number, ky: number, tint: number, a: number) => s.add.image(x, y, 'puff').setScale(S * kx, S * ky).setTint(tint).setBlendMode('ADD').setAlpha(a);
    const rimGlow = hf.below(s.add.image(PANEL[0] - 10, PANEL[1] - 10, 'hf_lb_rim').setOrigin(0).setScale(0.5).setBlendMode('ADD').setTint(0x5f9cff).setAlpha(0.5), 'plot');
    MON.forEach((x, i) => tw(hf.below(puff(x + 10, 166, 2.6, 1.4, i % 3 ? 0x7fd0ff : 0xff8a70, 0.16), 'plot'), { alpha: 0.34, duration: 900 + ((i * 370) % 1100) })); // the consoles under the bench, breathing
    // the plot's glass, over everything drawn on it: its rows, the room mirrored faintly, and a bar of light at the pressure it is reading
    hf.above(s.add.image(px, py, 'hf_lb_glass').setOrigin(0).setScale(0.5), 'traces'); hf.above(s.add.image(px, py, 'hf_lb_lines').setOrigin(0).setScale(1 / D).setAlpha(0.3), 'traces');
    const sweep = hf.above(s.add.image(0, py, 'hf_lb_bar').setOrigin(0.5, 0).setScale(0.5).setBlendMode('ADD').setAlpha(0), 'traces');
    // the arc: what it lights (the gas round it, the wall and the floor), then the arc itself
    const wash = hf.below(puff(px + pw / 2, py + ph / 2, 44, 30, 0xb9a8ff, 0), 'plot'), corona = hf.above(puff(0, 0, 3.4, 3.4, 0xc8b4ff, 0), 'traces');
    const arc = hf.fx('arc', 0, 0, 18, 24)?.setOrigin(0.5).setRotation(-0.6435).setVisible(false); // it lies along the plain scene's zigzag
    if (arc) { hf.above(arc, 'traces'); hf.tag({ arc }); } // with the tag up, the scene leaves its own zigzag out
    o = { rim: rimGlow, bar: sweep, arc, corona, wash, was: 0 };
  },
  step(hf) {
    if (!o) return;
    const st = hf.state, t = hf.t, a = Math.min(1, (st.arc || 0) / 0.4), run = st.sweep >= 0, fl = 0.8 + 0.2 * Math.sin(t * 71) * Math.sin(t * 43);
    if (st.arc > o.was + 0.2) hf.flash(st.arc > 0.7 ? 0.45 : 0.1); o.was = st.arc || 0; // struck: on a sweep it catches the exposure out, by hand it only spits
    // the rim: dim until the loom has a fault to find, blue when it has, amber while the pressure falls, the arc's own violet, green once the fix is proven
    const tint = a > 0.05 ? 0xc8b4ff : st.done ? 0x7cf08a : run ? 0xffb347 : st.live ? 0x5f9cff : 0x4a6090;
    o.rim.setTint(tint).setAlpha(a > 0.05 ? 0.5 + 0.5 * a * fl : run ? 0.5 + 0.3 * st.sweep : 0.42 + 0.08 * Math.sin(t * 1.3));
    o.bar.setX(st.x).setAlpha(run ? 0.5 : 0.16);
    const gas = st.gas ? 0xffc4e8 : 0xdfe6ff; // helium burns pink in a discharge; air and nitrogen, violet
    if (o.arc) { o.arc.setPosition(st.x, st.y).setVisible(a > 0.01).setTint(gas); fxSet(o.arc, a, 4); }
    o.corona.setPosition(st.x, st.y).setTint(st.gas ? 0xf0b0e0 : 0xc8b4ff).setAlpha(a * 0.55 * fl).setScale(S * (3 + a));
    o.wash.setAlpha(a * 0.16 * fl);
    hf.heat(st.x, st.y, 26, a * 0.5); hf.streak(0.7 * a);
  },
};
