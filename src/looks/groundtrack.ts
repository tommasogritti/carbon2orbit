import Phaser from 'phaser';
import { D, S, C2, el, lg, rg, rng } from '../art';
import { worldmap } from '../backdrops';
import { texAt, soft, sheet } from '../hifi';
import type { Look } from '../hifi';
import { spaceTextures, SPACE } from './flight';

// ------------------------------------------------------------------ Outback Delivery: the ground track, 27 February 2025
// A map has no sky, but the Earth on it has a day and a night, and the level's own account fixes them: the capsule was
// set on its way home at 1:52 pm UTC on 27 February 2025. At that minute the Sun stood over the Atlantic (about 25° west,
// 8° south), so Africa and the Americas were in daylight and Australia was a little after midnight: the capsule came
// down on Koonibba in the dark. The look draws that: the plain map (`worldmap`, the same sea, land, ice and grid) with
// the line between day and night across it, the towns alight on the night side, weather drifting over it and the Sun's
// glint on the ocean under it. The line moves west with the game's clock, and when the game skips its days of waiting it
// comes to rest where it was at the hour of the release. (The hour the level starts at, and the weather, are the game's.)
// The track, the markers and the spacecraft stay in the world, so they glow like a wall display; every word is on the HUD.
const MX = 10, MY = 30, MW = 300, MH = 112, L0 = -30, DEG = Math.PI / 180;
const DECL = -8.5, START = 150, PASS = -13; // the Sun's latitude that day; its longitude when the level opens (the game's) and when the last pass begins (12° before the release)
const X = (lon: number) => MX + ((((lon - L0) % 360) + 360) % 360) * (MW / 360), Y = (lat: number) => MY + (90 - lat) * (MH / 180);
/** How high the Sun stands (the cosine of its distance from overhead) at a place, when it is overhead at longitude `sun`. */
const sunUp = (lon: number, lat: number, sun: number) => Math.sin(lat * DEG) * Math.sin(DECL * DEG) + Math.cos(lat * DEG) * Math.cos(DECL * DEG) * Math.cos((lon - sun) * DEG);
// towns big enough to see from orbit, by longitude and latitude (the map's coasts are rough, so a few are nudged inland)
const TOWNS: number[][] = [[0, 51.5], [2.3, 48.9], [-3.7, 40.4], [12.5, 42], [13.4, 52.5], [37.6, 55.8], [29, 40.6], [31.2, 29], [4, 8], [28, -26.2], [36.8, -1.3], [16, -4.3], [51.4, 35.7], [46.7, 24.7], [68, 26], [74, 19.5], [77.2, 28.6], [77.6, 13.6], [88.2, 23], [100.5, 14.5], [103, 3], [107, -6], [106.7, 11.6], [114, 23.4], [120.6, 31.2], [116.4, 39.9], [127, 37.6], [139.4, 36], [135.5, 35], [116.4, -32], [138.6, -34.4], [145, -37.4], [150.6, -33.6], [152.4, -27.5], [175.4, -37.4], [-122.4, 45], [-121.4, 37.8], [-117, 34.1], [-99.1, 21], [-96.8, 32.8], [-87.6, 41.9], [-79.4, 43.7], [-75, 40.4], [-80.4, 27], [-74.1, 4.7], [-76, -12], [-70.4, -33.4], [-58.6, -34], [-47, -23.2], [-44, -22]];

function map(c: C2) {
  const r = rng(61), land = sheet(MW, MH, D, (t) => worldmap(t, 2));
  worldmap(c, 1);
  soft(c, 6); for (let i = 0; i < 26; i++) el(c, r() * MW, 8 + r() * 86, 14 + r() * 30, 5 + r() * 9, i % 3 ? 'rgba(6,24,70,.2)' : 'rgba(70,150,220,.1)'); soft(c, 0); // deeps and shallows
  c.globalAlpha = 0.42; c.drawImage(sheet(MW, MH, 2, (t) => { soft(t, 5); t.drawImage(land, 0, 0, MW, MH); soft(t, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = '#58c4ea'; t.fillRect(0, 0, MW, MH); }), 0, 0, MW, MH); c.globalAlpha = 1; // the shelf water round every coast
  c.drawImage(sheet(MW, MH, D, (t) => {
    t.drawImage(land, 0, 0, MW, MH); t.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 3600; i++) { const x = r() * MW, y = r() * MH; t.fillStyle = r() < 0.5 ? `rgba(30,50,20,${0.05 + r() * 0.1})` : `rgba(255,250,210,${0.04 + r() * 0.08})`; t.fillRect(x, y, 0.3 + r() * 0.7, 0.3 + r() * 0.5); } // the grain of the land
    soft(t, 2.2); const px = (lon: number) => X(lon) - MX, py = (lat: number) => Y(lat) - MY;
    for (const pts of [[-70, -50, -71, -30, -74, -14, -78, 0, -75, 8], [-128, 56, -118, 46, -110, 38, -105, 30, -100, 20], [70, 37, 80, 31, 90, 28, 99, 27], [5, 45, 14, 47, 26, 46, 44, 42], [60, 52, 60, 66], [146, -37, 150, -32, 152, -26], [30, -14, 36, -2, 39, 10], [100, 50, 120, 56, 140, 62]]) { // the great ranges: a shaded flank and a lit one
      for (const [dx, col] of [[0.4, 'rgba(60,40,24,.2)'], [-0.3, 'rgba(255,246,214,.16)']] as [number, string][]) { t.beginPath(); for (let i = 0; i < pts.length; i += 2) i ? t.lineTo(px(pts[i]) + dx, py(pts[i + 1]) + dx) : t.moveTo(px(pts[i]) + dx, py(pts[i + 1]) + dx); t.strokeStyle = col; t.lineWidth = 1.1; t.stroke(); }
    }
    soft(t, 0);
    t.fillStyle = lg(t, 0, 0, 0, py(52), [0, 'rgba(240,246,250,.75)'], [0.6, 'rgba(240,246,250,.3)'], [1, 'rgba(240,246,250,0)']); t.fillRect(0, 0, MW, py(52)); // snow, north of the forests
    t.fillStyle = lg(t, 0, 0, 0, MH, [0, 'rgba(255,250,220,.1)'], [1, 'rgba(10,20,40,.16)']); t.fillRect(0, 0, MW, MH);
  }), 0, 0, MW, MH);
  worldmap(c, 8);
}
/** A strip of the whole Earth with the Sun overhead at its middle, to slide along the map: `fn` gives each point its colour from how high the Sun is there. */
const band = (fn: (up: number, d: Uint8ClampedArray, i: number) => void) => (c: C2) => {
  const w = MW * 2, h = MH * 2, im = c.createImageData(w, h), d = im.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) fn(sunUp(((x + 0.5) / w) * 360 - 180, 90 - ((y + 0.5) / h) * 180, 0), d, (y * w + x) * 4);
  c.putImageData(im, 0, 0);
};
const night = band((up, d, i) => { const k = Phaser.Math.SmoothStep(-up, -0.1, 0.16), tw = Math.max(0, 1 - Math.abs(up + 0.01) / 0.1); d[i] = 5 + 90 * tw; d[i + 1] = 11 + 40 * tw; d[i + 2] = 36 + 6 * tw; d[i + 3] = 255 * k * (0.74 - 0.16 * tw); }); // the dark, with a warm edge where the Sun is on the horizon
const day = band((up, d, i) => { const g = Math.max(0, up) ** 110; d[i] = 255; d[i + 1] = 246; d[i + 2] = 224; d[i + 3] = 255 * (g * 0.3 + Math.max(0, up) * 0.04); });       // the Sun's glint on the water under it
function weather(c: C2) { // cloud to drift over the map: the storm tracks of both hemispheres and the belt along the equator, drawn to wrap
  const r = rng(27); soft(c, 1.3);
  for (let i = 0; i < 150; i++) { const zone = i % 3, lat = zone === 0 ? 46 + (r() - 0.5) * 26 : zone === 1 ? -48 + (r() - 0.5) * 24 : 4 + (r() - 0.5) * 16, x = r() * MW, y = (90 - lat) * (MH / 180), w = 3 + r() * 11, h = 0.5 + r() * 1.5, a = 0.12 + r() * 0.24; for (const dx of [-MW, 0, MW]) { c.save(); c.translate(x + dx, y); c.rotate((zone === 2 ? 0 : zone ? 0.3 : -0.3) + (r() - 0.5) * 0.3); el(c, 0, 0, w, h, `rgba(255,255,255,${a})`); c.restore(); } }
  soft(c, 0);
}
function glass(c: C2) { // the map is a display on a wall: its edges fall away into its housing, and the room shows faintly in it
  c.fillStyle = rg(c, MW / 2, MH / 2, 70, 190, [0, 'rgba(0,0,0,0)'], [1, 'rgba(0,4,14,.5)']); c.fillRect(0, 0, MW, MH);
  for (const [x, w, a] of [[40, 22, 0.035], [70, 5, 0.05], [208, 30, 0.028]]) { c.beginPath(); c.moveTo(x, MH); c.lineTo(x + w, MH); c.lineTo(x + w + 44, 0); c.lineTo(x + 44, 0); c.closePath(); c.fillStyle = `rgba(190,214,255,${a})`; c.fill(); }
}
function rim(c: C2) { soft(c, 3); c.strokeStyle = 'rgba(120,180,255,.9)'; c.lineWidth = 2; c.strokeRect(8, 8, MW, MH); soft(c, 0); }
const label = (lit: boolean) => (c: C2) => { c.translate(-116.7, -67.6); worldmap(c, 4); if (!lit) return; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#ffe9c4'; c.fillRect(0, 0, 400, 100); }; // the map's one name: as the plain map writes it, and again in a colour that reads by night

type Im = Phaser.GameObjects.Image; type Tile = Phaser.GameObjects.TileSprite; type Em = Phaser.GameObjects.Particles.ParticleEmitter;
let o: { night: Tile; day: Tile; weather: Tile; towns: Im[]; names: Im[]; shadow: Im; plume: Im; fire: Im; trail: Em; rim: Im; lon: number; lon0: number; t0: number; from: number; waiting: boolean } | undefined;

export const groundtrackLook: Look = {
  build(scene) {
    spaceTextures(scene);
    texAt(scene, 'hf_od_map', MW, MH, D, map); texAt(scene, 'hf_od_night', MW, MH, 2, night); texAt(scene, 'hf_od_day', MW, MH, 2, day); texAt(scene, 'hf_od_weather', MW, MH, 2, weather);
    texAt(scene, 'hf_od_glass', MW, MH, 1, glass); texAt(scene, 'hf_od_rim', MW + 16, MH + 16, 1, rim); texAt(scene, 'hf_od_label', 40, 8, D, label(false)); texAt(scene, 'hf_od_label_n', 40, 8, D, label(true));
  },
  layers: [],
  swap: { stars: SPACE.stars, worldmap: 'hf_od_map' },
  grade: { threshold: 0.8, bloom: 0.55, exposure: 1.04, contrast: 1.08, saturation: 1.14, shadows: [0.88, 0.96, 1.16], highs: [1.05, 1.0, 0.94], vignette: 0.42, grain: 0.022, fringe: 0.004 },
  live(hf) {
    const s = hf.scene, r = rng(5);
    const puff = (x: number, y: number, kx: number, ky: number, tint: number, a: number) => s.add.image(x, y, 'puff').setScale(S * kx, S * ky).setTint(tint).setBlendMode('ADD').setAlpha(a);
    const strip = (key: string, a: number) => s.add.tileSprite(MX, MY, MW, MH, key).setOrigin(0).setTileScale(0.5).setAlpha(a);
    const rimIm = hf.below(s.add.image(MX - 8, MY - 8, 'hf_od_rim').setOrigin(0).setBlendMode('ADD').setAlpha(0.4), 'map');
    // over the map, in this order: weather, the night, the towns in it, the Sun's glint, the glass, and the map's name
    const wx = hf.above(strip('hf_od_weather', 0.8), 'map'); hf.tag({ top: wx });
    const lay = <T extends Phaser.GameObjects.GameObject>(q: T) => { hf.above(q, 'top'); hf.tag({ top: q }); return q; };
    const nt = lay(strip('hf_od_night', 1));
    const towns = TOWNS.map(([lon, lat]) => lay(puff(X(lon), Y(lat), 0.1 + r() * 0.1, 0.1 + r() * 0.1, r() < 0.3 ? 0xffe2b0 : 0xffc070, 0)));
    const dy = lay(strip('hf_od_day', 1).setBlendMode('ADD'));
    lay(s.add.image(MX, MY, 'hf_od_glass').setOrigin(0));
    const names = ['hf_od_label', 'hf_od_label_n'].map((k) => s.add.image(MX + 116.7, MY + 67.6, k).setOrigin(0).setScale(1 / D)); hf.hud(...names);
    // the spacecraft: the shadow that says it is above the map, its engine, and the capsule's fire on the way down
    const shadow = hf.below(s.add.image(0, 0, 'hf_shadow').setScale(0.3, 0.6).setAlpha(0.7), 'craft'), plume = hf.below(puff(0, 0, 0.8, 0.8, 0xffc27a, 0), 'craft');
    const fire = puff(0, 0, 0.7, 0.7, 0xffd9a0, 0), trail = s.add.particles(0, 0, 'puff', { lifespan: { min: 500, max: 1100 }, speed: { min: 0, max: 5 }, scale: { start: S * 0.2, end: 0 }, alpha: { start: 0.9, end: 0 }, color: [0xffffff, 0xffd27a, 0xff7a34], blendMode: 'ADD', frequency: 16, emitting: false });
    o = { night: nt, day: dy, weather: wx, towns, names, shadow, plume, fire, trail, rim: rimIm, lon: START, lon0: START, t0: hf.state.t || 0, from: START, waiting: false };
  },
  step(hf, dt) {
    if (!o) return;
    const st = hf.state, t = hf.t, fl = 0.85 + 0.15 * Math.sin(t * 61) * Math.sin(t * 37);
    // where the Sun is: moving west with the clock; through the days of waiting it goes round to where it stood when the last pass began
    let dim = 0;
    if (st.phasing > 0) { if (!o.waiting) { o.waiting = true; o.from = PASS + (((o.lon - PASS) % 360) + 360) % 360 + 360; } const k = Phaser.Math.Clamp(st.phasing / 2.6, 0, 1); o.lon = PASS + (o.from - PASS) * k * k * (3 - 2 * k); dim = Math.sin(Math.PI * k); }
    else { if (o.waiting) { o.waiting = false; o.lon0 = PASS; o.t0 = st.t; } o.lon = o.lon0 - ((st.t - o.t0) * 360) / 86400; }
    const shift = -(((((o.lon - L0) % 360) + 360) % 360) * (MW / 360) - MW / 2) * 2;
    o.night.tilePositionX = shift; o.day.tilePositionX = shift; o.night.setAlpha(1 - 0.5 * dim); o.day.setAlpha(1 - dim);
    o.weather.tilePositionX -= dt * (0.5 + 30 * dim);
    for (let i = 0; i < TOWNS.length; i++) o.towns[i].setAlpha(Phaser.Math.Clamp(-sunUp(TOWNS[i][0], TOWNS[i][1], o.lon) * 7 - 0.3, 0, 1) * (1 - dim) * (0.75 + 0.25 * Math.sin(t * (1.3 + (i % 7) * 0.4) + i)));
    const dusk = Phaser.Math.Clamp(0.5 - sunUp(134, -25, o.lon) * 6, 0, 1) * (1 - 0.5 * dim); o.names[0].setAlpha(1 - dusk); o.names[1].setAlpha(dusk * 0.9);
    // the spacecraft and its engine; the capsule, alight between 110 and 30 km
    const dark = sunUp(L0 + ((st.x - MX) * 360) / MW, 90 - ((st.y - MY) * 180) / MH, o.lon) < 0;
    o.shadow.setPosition(st.x + 1.6, st.y + 2.2).setVisible(!dark);
    o.plume.setPosition(st.x - Math.cos(st.rot) * 4 * st.dir, st.y - Math.sin(st.rot) * 4 * st.dir).setAlpha(st.lit ? 0.8 * fl : 0).setScale(S * (0.7 + 0.5 * fl));
    o.rim.setAlpha(0.34 + 0.06 * Math.sin(t * 1.3) + (st.lit ? 0.14 : 0));
    const hot = st.cap ? Phaser.Math.Clamp((110 - st.calt) / 30, 0, 1) * Phaser.Math.Clamp((st.calt - 24) / 14, 0, 1) : 0;
    o.fire.setPosition(st.cx, st.cy).setAlpha(hot * fl).setScale(S * (0.5 + 0.7 * hot)); o.trail.setPosition(st.cx, st.cy); o.trail.emitting = hot > 0.15;
  },
};
