import Phaser from 'phaser';
import { D, S, C2, el, line, lg, rng } from '../art';
import { street } from '../backdrops';
import { texAt, soft, add, halo, sheet, relight } from '../hifi';
import type { Look } from '../hifi';

// ------------------------------------------------------------------ Princes Street Sprint: Dunedin, about 2000, at night
// No source gives the hour of the sprint, so the light is the game's choice, and it keeps the plain street's: night,
// under the street lamps, with the crowd behind the barriers. The plain tile (`street` in backdrops.ts) is taken apart
// so that the buildings can slide past more slowly than the kerb: the sky and the hills round the harbour stand still,
// the buildings go by at under half speed, and the lamps, bunting, crowd, barriers and road at full speed, as before.
// The road is wet, which is also the game's choice: it gives the lamps something to lie in.
const LAMPS = [47, 157, 269], PPM = 6, FAR = 0.45; // lamp heads in the tile; world units per metre (as the scene's); how fast the buildings pass

function sky(c: C2) {
  const r = rng(29);
  c.fillStyle = lg(c, 0, 0, 0, 132, [0, '#02040e'], [0.45, '#08102a'], [0.8, '#172452'], [1, '#3b3560']); c.fillRect(0, 0, 320, 132);
  soft(c, 6); for (let i = 0; i < 22; i++) el(c, 30 + i * 13 + r() * 14, 60 - i * 2.2 + (r() - 0.5) * 16, 12 + r() * 14, 4 + r() * 5, `rgba(120,130,210,${0.03 + r() * 0.03})`); soft(c, 0);
  for (let i = 0; i < 230; i++) { const x = r() * 320, y = r() * 96, s = r(), q = r() * (1 - y / 110); c.globalAlpha = 0.25 + q * 0.75; const d = s > 0.97 ? 0.5 : 0.12 + s * 0.2; el(c, x, y, d, d, s > 0.9 ? '#ffd9a8' : s > 0.8 ? '#a8ccff' : '#ffffff'); }
  c.globalAlpha = 1;
  soft(c, 3); for (let i = 0; i < 9; i++) { const x = r() * 340 - 10, y = 46 + r() * 40, rx = 24 + r() * 40; el(c, x, y, rx, 1.6 + r() * 2.4, 'rgba(8,12,34,.6)'); el(c, x + 3, y + 1.6, rx * 0.9, 1 + r(), 'rgba(196,130,110,.14)'); } soft(c, 0); // low cloud, lit from underneath by the town
  // the hills that stand round the town, with the lights of the houses on them
  c.beginPath(); c.moveTo(0, 132); for (let x = 0; x <= 320; x += 8) c.lineTo(x, 80 - 9 * Math.sin(x * 0.018 + 1) - 5 * Math.sin(x * 0.047) - 3 * Math.sin(x * 0.11)); c.lineTo(320, 132); c.closePath(); c.fillStyle = lg(c, 0, 62, 0, 132, [0, '#0a1024'], [1, '#141a3a']); c.fill();
  for (let i = 0; i < 150; i++) { const x = r() * 320, y = 84 + r() * r() * 40; el(c, x, y, 0.22, 0.22, r() < 0.7 ? `rgba(255,214,150,${0.3 + r() * 0.6})` : `rgba(190,220,255,${0.3 + r() * 0.5})`); }
  c.fillStyle = lg(c, 0, 96, 0, 132, [0, 'rgba(255,170,110,0)'], [1, 'rgba(255,170,110,.2)']); c.fillRect(0, 96, 320, 36); // sodium light in the air over the street
}
function buildings(c: C2) {
  c.drawImage(sheet(320, 132, 3, (t) => {
    street(t, 2); t.globalCompositeOperation = 'source-atop';
    t.fillStyle = lg(t, 0, 36, 0, 130, [0, 'rgba(2,4,16,.5)'], [0.6, 'rgba(6,8,26,.2)'], [1, 'rgba(255,160,90,.2)']); t.fillRect(0, 0, 320, 132); // dark above the lamps, and warm where their light reaches the walls
    const r = rng(8); for (let i = 0; i < 60; i++) { const x = r() * 320, y = 44 + r() * 80; line(t, x, y, x, y + 4 + r() * 10, 'rgba(0,0,10,.18)', 0.4); } // rain-streaked stone
  }), 0, 0, 320, 132);
}
/** The kerb and the road, at full speed: lamps, bunting, the crowd and the barriers under the lamps, and a wet road with the lamps lying in it. */
function kerb(c: C2) {
  const r = rng(13), pool = (m: C2, x: number, y: number, rx: number, ry: number, a: number) => { m.save(); m.translate(x, y); m.scale(rx, ry); const g = m.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.6, `rgba(255,255,255,${a * 0.6})`); g.addColorStop(1, 'rgba(255,255,255,0)'); m.fillStyle = g; m.fillRect(-1, -1, 2, 2); m.restore(); };
  relight(c, sheet(320, 180, D, (t) => street(t, 16)), 320, 180, 'rgba(4,6,18,.5)', (m) => { for (const x of LAMPS) pool(m, x, 142, 46, 16, 0.9); });
  for (let i = 0; i < 420; i++) { const x = r() * 320, y = 133 + r() * 43; line(c, x, y, x + 0.6 + r() * 1.6, y, `rgba(190,200,230,${0.03 + r() * 0.07})`, 0.2); } // the grain of wet asphalt
  soft(c, 1.2); add(c, () => { for (const x of LAMPS) { c.fillStyle = lg(c, 0, 131, 0, 176, [0, 'rgba(255,214,140,.34)'], [0.5, 'rgba(255,190,110,.12)'], [1, 'rgba(255,190,110,0)']); c.fillRect(x - 2.2, 131, 4.4, 45); for (let k = 0; k < 7; k++) { const y = 134 + k * 5 + r() * 2; c.fillStyle = `rgba(255,214,150,${0.2 - k * 0.022})`; c.fillRect(x - 7 - r() * 5, y, 14 + r() * 10, 0.5); } } }); soft(c, 0);
  relight(c, sheet(320, 180, D, (t) => street(t, 8)), 320, 180, 'rgba(4,6,20,.46)', (m) => { for (const x of LAMPS) { pool(m, x, 116, 44, 22, 1); } });
  soft(c, 2); add(c, () => { for (const x of LAMPS) { c.fillStyle = lg(c, 0, 95, 0, 130, [0, 'rgba(255,226,160,.24)'], [1, 'rgba(255,226,160,0)']); c.beginPath(); c.moveTo(x - 2, 95); c.lineTo(x + 2, 95); c.lineTo(x + 26, 130); c.lineTo(x - 26, 130); c.closePath(); c.fill(); } }); soft(c, 0); // light coming down through damp air
  street(c, 4);
  for (const x of LAMPS) { halo(c, x, 94.6, 12, '255,232,170', 0.9); el(c, x, 94.6, 2, 0.9, '#fffbe6'); }
}

type Img = Phaser.GameObjects.Image;
let o: { far: Phaser.GameObjects.TileSprite; beam: Img; lamp: Img; jet: Img; gate: Img; wind: Phaser.GameObjects.Particles.ParticleEmitter; sx: number; sy: number } | undefined;
const GRADE = { threshold: 0.66, bloom: 0.72, exposure: 1.06, contrast: 1.12, saturation: 1.12, shadows: [0.86, 0.94, 1.2] as [number, number, number], highs: [1.1, 1.0, 0.88] as [number, number, number], vignette: 0.55, grain: 0.03, fringe: 0.006 };
export const sprintLook: Look = {
  build(scene) {
    texAt(scene, 'hf_sp_sky', 320, 132, 2, sky); texAt(scene, 'hf_sp_far', 320, 132, 3, buildings); texAt(scene, 'hf_sp_street', 320, 180, D, kerb);
    texAt(scene, 'hf_sp_beam', 60, 16, 2, (c) => { soft(c, 1.5); c.fillStyle = lg(c, 0, 0, 60, 0, [0, 'rgba(255,244,210,.5)'], [1, 'rgba(255,244,210,0)']); c.beginPath(); c.moveTo(0, 6.4); c.lineTo(60, 0); c.lineTo(60, 16); c.lineTo(0, 9.6); c.closePath(); c.fill(); soft(c, 0); });
  },
  layers: [],
  swap: { street: 'hf_sp_street' },
  grade: GRADE,
  live(hf) {
    const s = hf.scene, cam = s.cameras.main, r = rng(3), puff = (size: number, tint: number) => s.add.image(0, 0, 'puff').setScale(S * size).setTint(tint).setBlendMode('ADD').setAlpha(0);
    hf.below(s.add.image(0, 0, 'hf_sp_sky').setOrigin(0).setScale(0.5), 'street');
    const far = hf.below(s.add.tileSprite(0, 0, 320 * 3, 132 * 3, 'hf_sp_far').setOrigin(0).setScale(1 / 3), 'street');
    for (let i = 0; i < 10; i++) { const t = hf.below(puff(0.1 + r() * 0.08, 0xdfe8ff).setPosition(r() * 320, r() * 40), 'street'); s.tweens.add({ targets: t, alpha: { from: 0.9, to: 0.1 }, duration: 500 + r() * 1400, yoyo: true, repeat: -1 }); }
    // the crowd's cameras going off along the barriers
    const flashes = [0, 1, 2, 3].map(() => hf.above(puff(0.9, 0xffffff), 'street'));
    s.time.addEvent({ delay: 170, loop: true, callback: () => { const f = flashes[Math.floor(Math.random() * 4)]; f.setPosition(Math.random() * 320, 116 + Math.random() * 6).setAlpha(1).setScale(S * (0.5 + Math.random() * 0.7)); s.tweens.add({ targets: f, alpha: 0, duration: 130 }); } });
    // the sports car's headlamp and its beam on the wet road, the bike's steam catching the lamps, the finish under its own light
    const beam = hf.above(s.add.image(0, 0, 'hf_sp_beam').setOrigin(0, 0.5).setScale(0.5).setBlendMode('ADD'), 'car'), lamp = hf.above(puff(1.1, 0xfff0c8), 'car');
    const jet = hf.below(puff(3, 0xdfe8ff), 'bike'), gate = hf.below(puff(7, 0xffe6b0), 'flag');
    const wind = hf.above(s.add.particles(0, 0, 'puff', { x: 330, y: { min: 100, max: 178 }, speedX: { min: -900, max: -600 }, lifespan: 600, scaleX: { min: S * 1.2, max: S * 2.6 }, scaleY: S * 0.035, alpha: { start: 0.5, end: 0 }, tint: 0xcfdcff, blendMode: 'ADD', frequency: 40, emitting: false }), 'bike'); // the air going past
    o = { far, beam, lamp, jet, gate, wind, sx: cam.scrollX, sy: cam.scrollY };
  },
  step(hf) {
    if (!o) return;
    const st = hf.state, t = hf.t, v = st.v || 0, thr = st.thr || 0, car = hf.tags.car as Img, flag = hf.tags.flag as Img, bike = hf.tags.bike as Phaser.GameObjects.Container;
    o.far.tilePositionX = (st.dist || 0) * PPM * 3 * FAR;
    const cx = car.x + 24, cy = car.y - 7.4; o.lamp.setPosition(cx, cy).setAlpha(car.visible ? 0.95 : 0); o.beam.setPosition(cx, cy + 2).setAlpha(car.visible ? 0.6 : 0);
    o.jet.setPosition(bike.x - 30, bike.y - 12).setAlpha(thr * (0.26 + 0.06 * Math.sin(t * 47))).setScale(S * 5, S * 2.2);
    o.gate.setPosition(flag.x, flag.y - 52).setAlpha(flag.visible ? 0.3 : 0);
    o.wind.emitting = v > 16; o.wind.frequency = Math.max(8, 70 - v * 1.4);
    GRADE.fringe = 0.006 + Math.min(0.009, v * 0.0002); // the faster it goes, the less the lens keeps up
    if (hf.gl) hf.scene.cameras.main.setScroll(o.sx + Math.sin(t * 67) * 0.16 * thr, o.sy + Math.sin(t * 83 + 1) * 0.2 * thr); // the valve open shakes the picture; the read-outs, on their own camera, stay still
  },
};
