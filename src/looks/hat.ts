import Phaser from 'phaser';
import { D, S, C2, lg, rg, el } from '../art';
import { walkHall, setHall, CAGE, rib } from '../scenes/HatTrick';
import { texAt, soft, add, halo, sheet } from '../hifi';
import type { Look } from '../hifi';

// ------------------------------------------------------------------ Eating the Hat: the two rooms of the Neutron announcement video
// The light is the video's own (Rocket Lab, "Introducing Neutron", 1 March 2021, read from its frames). The walk is in a
// bright white factory hall under rows of ceiling panels, with no window and no hour to it: an even, cool, shadowless
// light, a polished floor that mirrors the racks, a little dust in the air. The dinner is on a dark stage: the ribbed
// mock-up of the fairing lit along its ribs, blue lights on the floor round its base, a soft white key on the man at the
// table and nothing else. Both rooms are the plain drawings (`walkHall`, `setHall`), redrawn in their parts: the hall
// and its things lit by Light2D, the lamps on a layer of their own that the bloom catches. Every word is on the HUD.

const mirrorBelow = (c: C2, src: HTMLCanvasElement, y: number, alpha: number, k = 0.5) => { // rows just above y appear just below it
  c.save(); c.beginPath(); c.rect(0, y, 320, 180 - y); c.clip(); c.globalAlpha = alpha;
  c.translate(0, y); c.scale(1, -k); c.translate(0, -y); c.drawImage(src, 0, 0, 320, 180); c.restore();
};

function walkShell(scene: Phaser.Scene) {
  return (c: C2) => {
    walkHall(c, scene, 1);
    const things = sheet(320, 180, D, (t) => { walkHall(t, scene, 2); walkHall(t, scene, 4); });
    mirrorBelow(c, things, 124, 0.16, 0.45); // the epoxy floor: a soft mirror of the racks and the lamps
    c.fillStyle = lg(c, 0, 118, 0, 130, [0, 'rgba(70,78,96,0)'], [0.8, 'rgba(70,78,96,.18)'], [1, 'rgba(70,78,96,0)']); c.fillRect(0, 118, 320, 12); // where the wall meets the floor
    c.fillStyle = lg(c, 0, 124, 0, 180, [0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,.18)']); c.fillRect(0, 124, 320, 56); // the floor brightens towards the camera
    for (let x = 28; x < 320; x += 48) { c.fillStyle = rg(c, x, 150, 2, 40, [0, 'rgba(255,255,255,.22)'], [1, 'rgba(255,255,255,0)']); c.save(); c.translate(x, 150); c.scale(1, 0.2); c.translate(-x, -150); c.fillRect(x - 40, 110, 80, 80); c.restore(); } // each panel's sheen on the floor
  };
}
function walkLamps(scene: Phaser.Scene) {
  return (c: C2) => { walkHall(c, scene, 4); for (let x = 28; x < 320; x += 48) halo(c, x, 14.3, 26, '235,244,255', 0.5); };
}
function setShell(scene: Phaser.Scene) {
  return (c: C2) => {
    setHall(c, scene, 1);
    const lit = sheet(320, 180, D, (t) => { setHall(t, scene, 2); setHall(t, scene, 4); });
    mirrorBelow(c, lit, 150, 0.32, 0.4); // a black, polished stage floor
    soft(c, 6); for (const [x, y, w, h, a] of [[70, 60, 60, 30, 0.05], [250, 50, 70, 26, 0.05], [160, 120, 140, 26, 0.06]] as number[][]) el(c, x, y, w, h, `rgba(110,140,220,${a})`); soft(c, 0); // haze hanging in the hall
  };
}
function setLamps(scene: Phaser.Scene) {
  return (c: C2) => {
    setHall(c, scene, 4);
    for (const x of [44, 108, 212, 276]) halo(c, x, 150, 30, '70,130,255', 0.45);
    for (let i = 1; i < CAGE.ribs - 1; i++) { const k = -1 + (2 * i) / (CAGE.ribs - 1), [x, y] = rib(k, 0.32); halo(c, x, y, 10, '220,232,255', 0.12); }
  };
}
function key(c: C2) { soft(c, 5); c.fillStyle = lg(c, 0, 0, 0, 120, [0, 'rgba(255,246,232,.35)'], [1, 'rgba(255,246,232,0)']); c.beginPath(); c.moveTo(60, 0); c.lineTo(100, 0); c.lineTo(150, 120); c.lineTo(10, 120); c.closePath(); c.fill(); soft(c, 0); }

type Im = Phaser.GameObjects.Image;
export const hatWalkLook: Look = {
  build(scene) {
    texAt(scene, 'hf_hw_shell', 320, 180, D, walkShell(scene)); texAt(scene, 'hf_hw_things', 320, 180, D, (c) => walkHall(c, scene, 2)); texAt(scene, 'hf_hw_lamps', 320, 180, D, walkLamps(scene));
  },
  layers: [{ key: 'hf_hw_shell', w: 320 }, { key: 'hf_hw_things', w: 320, lit: true }, { key: 'hf_hw_lamps', w: 320, add: true, alpha: 0.85 }],
  ambient: 0xa9aec0,
  lights: [28, 76, 124, 172, 220, 268, 316].map((x) => ({ x, y: 22, r: 120, color: 0xf2f6ff, i: 0.75 })),
  heroLight: { r: 46, color: 0xffffff, i: 0.45, dy: -6 },
  motes: { tint: 0xffffff, count: 70 },
  grade: { threshold: 0.84, bloom: 0.42, exposure: 1.03, contrast: 1.05, saturation: 1.06, shadows: [0.95, 0.98, 1.07], highs: [1.02, 1.01, 0.98], vignette: 0.32, grain: 0.02, fringe: 0.003 },
  live(hf) {
    const s = hf.scene; // a glint that runs along each carbon stage now and then, as the camera passes
    const glints: Im[] = [86, 104].flatMap((y) => [6, 228].map((x) => s.add.image(x, y + 2, 'puff').setScale(S * 1.6, S * 0.35).setTint(0xffffff).setBlendMode('ADD').setAlpha(0)));
    glints.forEach((g, i) => s.tweens.add({ targets: g, x: g.x + 76, alpha: { from: 0, to: 0.5 }, duration: 2600, delay: i * 900, repeat: -1, repeatDelay: 3000, yoyo: false }));
  },
};

let o: { key: Im; strips: Im; motor: Im; warm: number } | undefined;
export const hatSetLook: Look = {
  build(scene) {
    texAt(scene, 'hf_hs_shell', 320, 180, D, setShell(scene)); texAt(scene, 'hf_hs_things', 320, 180, D, (c) => setHall(c, scene, 2)); texAt(scene, 'hf_hs_lamps', 320, 180, D, setLamps(scene));
    texAt(scene, 'hf_hs_key', 160, 120, 1, key);
  },
  layers: [{ key: 'hf_hs_shell', w: 320 }, { key: 'hf_hs_things', w: 320, lit: true }, { key: 'hf_hs_lamps', w: 320, add: true }],
  ambient: 0x4a5068,
  lights: [
    { x: 160, y: 40, r: 130, color: 0xfff2e2, i: 1.0 },   // the key light on the man at the table: warmed as he eats
    { x: 44, y: 150, r: 46, color: 0x3d7bff, i: 0.9 }, { x: 108, y: 150, r: 46, color: 0x3d7bff, i: 0.9 }, { x: 212, y: 150, r: 46, color: 0x3d7bff, i: 0.9 }, { x: 276, y: 150, r: 46, color: 0x3d7bff, i: 0.9 }, // the floor lights
    { x: 160, y: 70, r: 200, color: 0xbcd0ff, i: 0.25 },  // what the lit ribs throw back
  ],
  motes: { tint: 0xbcd0ff, count: 40 },
  grade: { threshold: 0.84, bloom: 0.6, exposure: 0.96, contrast: 1.12, saturation: 1.08, shadows: [0.84, 0.92, 1.22], highs: [1.04, 1.02, 1.0], vignette: 0.55, grain: 0.03, fringe: 0.005 },
  live(hf) {
    const s = hf.scene, back = <T extends Phaser.GameObjects.GameObject>(q: T) => hf.below(q, 'peter');
    const keyCone = back(s.add.image(160, 0, 'hf_hs_key').setOrigin(0.5, 0).setBlendMode('ADD').setAlpha(0.22));
    const strips = back(s.add.image(0, 0, 'hf_hs_lamps').setOrigin(0).setScale(1 / D).setBlendMode('ADD').setAlpha(0));
    s.tweens.add({ targets: strips, alpha: 0.18, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); // the ribs breathe
    back(s.add.particles(0, 0, 'puff', { x: { min: 20, max: 300 }, y: { min: 120, max: 160 }, lifespan: { min: 6000, max: 11000 }, speedX: { min: -3, max: 3 }, speedY: { min: -2, max: 0 }, scale: { min: S * 1.2, max: S * 3 }, alpha: { values: [0, 0.07, 0] } as any, tint: 0x4d7fff, blendMode: 'ADD', frequency: 500, advance: 8000 })); // low haze in the floor lights
    const motor = hf.above(s.add.image(198, 128, 'puff').setScale(S * 0.8).setTint(0x7cf08a).setBlendMode('ADD').setAlpha(0), 'jar');
    o = { key: keyCone, strips, motor, warm: 0 };
  },
  step(hf, dt) {
    if (!o) return;
    const st = hf.state, t = hf.t, run = (st.pulse || 0) > 0 ? 1 : 0, eat = st.reach || 0;
    o.warm += ((st.step >= 4 ? 1 : 0) - o.warm) * Math.min(1, dt * 1.5);
    hf.power(0, 1 + 0.15 * o.warm + run * 0.04 * Math.sin(t * 90)); // the blender's hum shakes the table, and the light on it
    o.key.setAlpha(0.2 + 0.08 * o.warm + 0.03 * eat).setTint(o.warm > 0.5 ? 0xffe8cc : 0xffffff);
    o.motor.setAlpha(run ? 0.6 + 0.3 * Math.sin(t * 40) : st.step === 2 ? 0.25 : 0).setTint((st.heat || 0) > 0.66 ? 0xff5a3c : 0x7cf08a);
    for (let i = 1; i <= 4; i++) hf.power(i, 1 + 0.06 * Math.sin(t * 0.7 + i));
  },
};
