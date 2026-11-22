import Phaser from 'phaser';
import { D, S, C2, el, line, lg, rng } from '../art';
import { texAt, soft, add, halo, sheet, relight } from '../hifi';
import type { Grade, Look } from '../hifi';
import { spaceTextures, SPACE, puffy, ascentLive, ascentStep, CloudTone } from './flight';

// ------------------------------------------------------------------ launch control after sunset: what every evening look shares
// A flight that left at dusk or at night gets the site's plain drawing in the dark and under its own lamps, and a sky for
// the hour it flew: an `Eve`. A site says where its lamps are (`Pad`); the sky, the sea, the relighting, the red lights,
// the oxygen boiling off in the floodlights and the plume lighting the ground are the same from any pad, and live here.
// What moves on the way up is shared with the daytime looks (flight.ts).

/** A launch site after dark: its plain drawing by parts, and the lamps that light it. Coordinates are the site drawing's (ground line at y = 100). */
export interface Pad {
  /** The site's texture name in the scene, and its horizon. */
  site: string; hz: number;
  draw(c: C2, part: number): void; /** Parts of `draw`: distant land (silhouettes), the land, what stands on it. */ far: number; land: number; things: number;
  /** Extra grain on the land, drawn before it is put in the dark. */
  ground?(t: C2): void;
  /** The skyline of the land, stroked with the last of the light. */
  crest(c: C2): void;
  /** Pools of lamplight: x, y, radius across, radius down, strength. The first two are the floodlights on the vehicle and its apron. */
  pools: number[][];
  /** Floodlight heads, red obstruction lights, and warm working lamps. */
  floods: number[][]; reds: number[][]; warm: number[][];
  /** The apron's lit edge: x0, x1, y. */
  apron: number[];
}
/** One evening: the sky for the hour, and how dark the ground has got. */
export interface Eve {
  key: string; seed: number; /** Where on the horizon the sun went down (screen x). */ west: number;
  sky: [number, string][]; glow: [number, string, number][]; cold: string; stars: number; milky?: boolean; /** A crescent moon: x, y, and which way its lit edge is turned (the offset of its dark side). */ moon?: number[];
  bars: number; bar: string; ember: string;
  sea: [number, string][]; swell: string; path?: (k: number) => string; pathW?: number; mist: string;
  far: string; dark: string; darkThing: string; rim: string; spill: number;
  tone: CloudTone; grade: Grade; glint: number; glintW?: number; /** How strongly the plume lights the ground at lift-off. */ lift: number;
  /** The sun is close enough under the horizon that the vehicle climbs back into its light: the exhaust shines, high up. */
  twilight?: boolean; /** What the dark does to the Earth's edge and the glow of the air, seen from the top of the climb. */ limb: number; air: number;
}

const sky = (e: Eve, hs: number) => (c: C2) => {
  const r = rng(e.seed), gx = e.west;
  c.fillStyle = lg(c, 0, 0, 0, 180, ...e.sky); c.fillRect(0, 0, 320, 180);
  if (e.milky) { soft(c, 7); for (let i = 0; i < 30; i++) el(c, 92 + i * 4.6 + r() * 12, 2 + i * 3.5 + (r() - 0.5) * 16, 12 + r() * 16, 5 + r() * 6, `rgba(${110 + r() * 50},${120 + r() * 40},210,${0.03 + r() * 0.035})`); soft(c, 0); } // the Milky Way, climbing
  for (let i = 0; i < e.stars; i++) { const x = r() * 320, y = r() * (hs - 3), s = r(), q = r() * (1 - y / (hs + 10)), d = s > 0.975 ? 0.5 : 0.12 + s * 0.2; c.globalAlpha = 0.2 + q * 0.8; el(c, x, y, d, d, s > 0.9 ? '#ffd9a8' : s > 0.8 ? '#a8ccff' : '#ffffff'); } // fewer and fainter toward the horizon
  c.globalAlpha = 1;
  for (const [rad, rgb, a] of e.glow) halo(c, gx, hs + 2, rad, rgb, a);
  const cold = (x0: number, x1: number) => { c.fillStyle = lg(c, x0, 0, x1, 0, [0, e.cold], [1, e.cold.replace(/[\d.]+\)$/, '0)')]); c.fillRect(Math.min(x0, x1), hs - 52, Math.abs(x1 - x0), 56); };
  cold(gx < 160 ? 320 : 0, gx < 160 ? gx + 40 : gx - 40); // away from where the sun went down, the horizon is already cold
  soft(c, 2.4);
  for (let i = 0; i < e.bars; i++) { // bars of stratus low over the afterglow: dark against it, the nearest still lit from below
    const x = r() * 340 - 10, y = hs - 36 + r() * 34, rx = 18 + r() * 46, ry = 0.7 + r() * 1.7, near = Math.max(0, 1 - Math.hypot(x - gx, (y - hs) * 3) / 170);
    el(c, x, y - ry * 0.5, rx, ry, e.bar); el(c, x + 2, y + ry * 0.4, rx * 0.9, ry * 0.6, `rgba(${e.ember},${near * 0.6})`);
  }
  soft(c, 0);
  if (e.moon) { // a thin crescent, its lit edge turned toward the sun, the rest of the disc in earthshine
    const [mx, my, dx, dy] = e.moon, R = 3.3;
    halo(c, mx, my, 24, '200,212,255', 0.16); el(c, mx, my, R, R, 'rgba(92,104,150,.55)');
    c.drawImage(sheet(12, 12, D * 2, (m) => { el(m, 6, 6, R, R, '#fff6e0'); m.globalCompositeOperation = 'destination-out'; el(m, 6 + dx, 6 + dy, R * 1.04, R * 1.04, '#000'); }), mx - 6, my - 6, 12, 12);
  }
};

const lamps = (p: Pad, m: C2, k: number, dim = 1) => {
  for (const [x, y, rx, ry, a0] of p.pools) { const a = a0 * dim; m.save(); m.translate(x, y); m.scale(rx * k, ry * k); const g = m.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.55, `rgba(255,255,255,${a * 0.8})`); g.addColorStop(1, 'rgba(255,255,255,0)'); m.fillStyle = g; m.fillRect(-1, -1, 2, 2); m.restore(); }
};

/** The site: the plain drawing's sea, land and everything standing on it, in the dark and under its lamps. */
const site = (p: Pad, e: Eve) => (c: C2) => {
  const r = rng(e.seed + 4), gx = e.west, hz = p.hz, [fx, fy] = [p.pools[0][0], p.pools[0][1]];
  c.fillStyle = lg(c, 0, hz, 0, 150, ...e.sea); c.fillRect(0, hz, 320, 150 - hz);
  for (let i = 0; i < 280; i++) { const k = r() ** 1.5, y = hz + 0.8 + k * (149 - hz), x = r() * 336 - 8, len = 1.6 + k * 13; line(c, x, y, x + len, y, `rgba(${e.swell},${0.05 + r() * 0.14})`, 0.2 + k * 0.4); } // swell, closer together toward the horizon
  if (e.path) for (let i = 0; i < 300; i++) { const k = r(), y = hz + 0.4 + k * k * 44, hw = (e.pathW ?? 6) + (y - hz) * 1.2, x = gx + (r() - 0.5) * 2 * hw; line(c, x - 0.5 - r() * 2.6, y, x + 0.5 + r() * 2.6, y, e.path(k), 0.34); } // the last light lying on the water
  if (p.far) c.drawImage(sheet(320, 150, D, (t) => { p.draw(t, p.far); t.globalCompositeOperation = 'source-atop'; t.fillStyle = e.far; t.fillRect(0, 0, 320, 150); }), 0, 0, 320, 150);
  c.fillStyle = lg(c, 0, hz - 5, 0, hz + 4, [0, 'rgba(0,0,0,0)'], [0.6, e.mist], [1, 'rgba(0,0,0,0)']); c.fillRect(0, hz - 5, 320, 9);
  // the land: dark, with the floodlights' spill round the apron
  relight(c, sheet(320, 150, D, (t) => { p.draw(t, p.land); t.globalCompositeOperation = 'source-atop'; p.ground?.(t); }), 320, 150, e.dark, (m) => lamps(p, m, e.spill, 0.72));
  p.crest(c); c.strokeStyle = e.rim; c.lineWidth = 0.3; c.stroke();
  // what stands on it
  relight(c, sheet(320, 150, D, (t) => p.draw(t, p.things)), 320, 150, e.darkThing, (m) => lamps(p, m, 1));
  // the light itself: beams in the sea air, the lamp heads, warm working lamps, red lights on everything tall
  soft(c, 1.4); add(c, () => { for (const [x, y] of p.floods) { const d = x < fx ? 1 : -1; for (const [q, a] of [[1, 0.13], [0.55, 0.12]]) { c.fillStyle = lg(c, x, y, fx, y + 16, [0, `rgba(196,220,255,${a})`], [0.75, `rgba(196,220,255,${a * 0.5})`], [1, 'rgba(196,220,255,0)']); c.beginPath(); c.moveTo(x, y); c.lineTo(fx - d * 2, fy + 4 - 50 * q); c.lineTo(fx + d * 4, fy + 4 + 30 * q); c.closePath(); c.fill(); } } }); soft(c, 0);
  halo(c, fx, 90, 36, '190,214,255', 0.2); line(c, p.apron[0], p.apron[2], p.apron[1], p.apron[2], 'rgba(226,238,255,.7)', 0.25);
  for (const [x, y] of p.floods) { halo(c, x, y, 9, '214,232,255', 0.95); el(c, x, y, 0.9, 0.7, '#ffffff'); line(c, x - 5, y, x + 5, y, 'rgba(230,240,255,.5)', 0.16); }
  for (const [x, y] of p.warm) { halo(c, x, y, 7, '255,196,120', 0.7); el(c, x, y, 0.5, 0.4, '#fff2d8'); }
  for (const [x, y] of p.reds) { halo(c, x, y, 3.4, '255,70,50', 0.9); el(c, x, y, 0.45, 0.45, '#ffb0a0'); }
};

type Img = Phaser.GameObjects.Image;
let o: { p: Pad; e: Eve; reds: Img[]; vent: Phaser.GameObjects.Particles.ParticleEmitter; lamp: Img; lift: Img; high: Img } | undefined;

/** The look of one evening at one pad. */
export const evening = (p: Pad, e: Eve): Look => ({
  build(scene) {
    texAt(scene, e.key + '_sky', 320, 180, D, sky(e, p.hz + 36)); texAt(scene, e.key + '_site', 320, 150, D, site(p, e)); spaceTextures(scene);
    texAt(scene, e.key + '_cloud1', 70, 24, D, puffy(1, e.tone)); texAt(scene, e.key + '_cloud2', 100, 30, D, puffy(2, e.tone)); texAt(scene, e.key + '_cloud3', 46, 16, D, puffy(6, e.tone));
  },
  layers: [],
  swap: { ...SPACE, sky_dusk: e.key + '_sky', sky_night: e.key + '_sky', [p.site]: e.key + '_site', cloud1: e.key + '_cloud1', cloud2: e.key + '_cloud2', cloud3: e.key + '_cloud3' },
  grade: e.grade,
  live(hf) {
    ascentLive(hf, { sun: [e.west, p.hz + 40], glint: { x: e.west, y0: p.hz - 99, y1: p.hz - 84, tint: e.glint, w: e.glintW }, flare: 0, sunTint: e.twilight ? 0xff9a60 : 0x20406a, plume: 1.5, sunless: !e.twilight, airTint: e.air });
    (hf.tags.earth as Img | undefined)?.setTint(e.limb);
    const s = hf.scene, puff = (size: number, tint: number) => s.add.image(154, 0, 'puff').setScale(S * size).setTint(tint).setBlendMode('ADD').setAlpha(0);
    const reds = p.reds.map(([x], i) => { const b = hf.above(puff(i ? 0.45 : 0.7, 0xff4030).setX(x), 'ground'); s.tweens.add({ targets: b, alpha: { from: 1, to: 0.15 }, duration: 900, yoyo: true, repeat: -1, delay: (i % 3) * 300, ease: 'Sine.easeInOut' }); return b; }); // the red lights breathe
    const vent = hf.above(s.add.particles(0, 0, 'puff', { x: { min: 150.6, max: 152 }, y: { min: -46, max: -10 }, speedX: { min: -10, max: -3 }, speedY: { min: -2.5, max: 1.5 }, lifespan: { min: 1500, max: 2800 }, scale: { start: S * 0.16, end: S * 1.1 }, alpha: { start: 0.2, end: 0 }, tint: 0xcfdcff, frequency: 110, advance: 2500 }), 'ground'); // oxygen boiling off, lit by the floods
    const lamp = hf.above(puff(5, 0xbcd4ff), 'ground'), lift = hf.above(puff(17, 0xffa860), 'ground');
    const high = hf.below(puff(3, 0xcfe0ff), 'rocket');
    o = { p, e, reds, vent, lamp, lift, high };
  },
  step(hf) {
    ascentStep(hf); if (!o) return;
    const st = hf.state, low = Phaser.Math.Clamp(1 - st.alt / 5, 0, 1), on = st.base < 300;
    o.p.reds.forEach(([, y], i) => o!.reds[i].setY(st.base - 100 + y).setVisible(on));
    o.vent.setPosition(0, st.base).emitting = st.alt < 0.02 && st.burn === 0;
    o.lamp.setPosition(154, st.base - 34).setAlpha(0.1 * Phaser.Math.Clamp(1 - st.alt / 0.4, 0, 1)).setScale(S * 3.4, S * 7);   // the vehicle standing in its floodlights,
    o.lift.setPosition(st.rx, st.base - 4).setAlpha(st.up ? 0 : st.burn * low * o.e.lift * (0.92 + 0.08 * Math.sin(hf.t * 41))).setScale(S * 17, S * 9); // and then lighting the whole place itself
    // back in sunlight: thin exhaust spreading wide behind the vehicle and shining against a sky that is already dark
    const k = o.e.twilight ? Phaser.Math.Clamp((st.alt - 58) / 30, 0, 1) * st.burn : 0, wide = 4 + Math.min(5, st.alt / 40);
    o.high.setPosition(st.rx - 22 * Math.sin(st.rot), st.ry + 22 * Math.cos(st.rot)).setRotation(st.rot).setAlpha(k * 0.4).setScale(S * wide, S * wide * 2.2);
  },
});
