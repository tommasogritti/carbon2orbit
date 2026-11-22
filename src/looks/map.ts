import Phaser from 'phaser';
import { D, S, C2, el, line, lg, rg, rng, drawMap, MAPW, MAPH, nz, us } from '../art';
import { texAt, soft, add, halo, sheet } from '../hifi';
import type { Look } from '../hifi';
import { puffy } from './flight';

// ------------------------------------------------------------------ The world map: the Pacific by day, from high above
// The map is not one day of the story, so its light is the game's choice: the plain map's own daylight, with the sun
// high in the north-west. What changes is depth. The sea is a layer of its own, with a sheen, a slow swell and glitter;
// the land stands on it and throws a shadow, lit on the side toward the sun; the cities and the launch sites carry small
// lights; clouds drag their shadows across both; the trails and the open nodes glow; the marker walks in a pool of light.
// The map is read constantly, so every name, pin, node and tag is as it was: land, names and pins are the plain
// drawing's own (`drawMap`, in parts), at full sharpness, and the grade leaves colour fringing and heavy bloom out.
const W = MAPW, H = MAPH, SEA0 = 150;
const CITIES = [nz(174.76, -36.85), nz(174.78, -41.29), nz(170.5, -45.87), nz(168.35, -46.41), us(-118.2, 33.8), us(-74, 40.7)];
const SITES = [nz(177.87, -39.26), nz(175.82, -36.6), nz(172.75, -43.8), us(-75.45, 37.9), us(-89.6, 30.4)]; // Māhia, Great Mercury, Kaitorete, Wallops, Stennis

function sea(c: C2) {
  const r = rng(21);
  // space, with the Milky Way laid across it, and the thin bright line of the air
  c.fillStyle = lg(c, 0, 0, 0, SEA0, [0, '#020309'], [0.5, '#070c26'], [0.8, '#163a80'], [0.95, '#3a84d6'], [1, '#7fc0f4']); c.fillRect(0, 0, W, SEA0);
  c.fillStyle = rg(c, 620, 40, 5, 170, [0, 'rgba(120,80,200,.24)'], [1, 'rgba(120,80,200,0)']); c.fillRect(0, 0, W, SEA0);
  soft(c, 7); for (let i = 0; i < 44; i++) el(c, i * 20 + r() * 20, 64 - i * 1.1 + (r() - 0.5) * 26, 18 + r() * 20, 5 + r() * 7, `rgba(${130 + r() * 60},${130 + r() * 50},230,${0.03 + r() * 0.04})`); soft(c, 0);
  for (let i = 0; i < 900; i++) { const x = r() * W, y = r() * 112, s = r(); c.globalAlpha = (0.3 + r() * 0.7) * (1 - (y / 124) ** 2); el(c, x, y, s > 0.975 ? 0.6 : 0.14 + s * 0.2, s > 0.975 ? 0.6 : 0.14 + s * 0.2, s > 0.9 ? '#ffd9a8' : s > 0.8 ? '#a8ccff' : '#ffffff'); }
  c.globalAlpha = 1;
  // the ocean: deep toward the south, a sheen where the sun stands over it, slow darker water where the currents run
  c.fillStyle = lg(c, 0, SEA0, 0, H, [0, '#3f8fdc'], [0.12, '#2468bc'], [0.5, '#17509c'], [1, '#0c3070']); c.fillRect(0, SEA0, W, H - SEA0);
  soft(c, 14); for (let i = 0; i < 26; i++) el(c, r() * W, 190 + r() * 250, 40 + r() * 80, 8 + r() * 16, i % 2 ? 'rgba(8,30,84,.2)' : 'rgba(80,160,236,.12)'); soft(c, 0);
  add(c, () => { c.save(); c.translate(330, 250); c.rotate(-0.16); c.scale(1, 0.34); c.fillStyle = rg(c, 0, 0, 0, 260, [0, 'rgba(190,226,255,.3)'], [0.5, 'rgba(150,206,255,.12)'], [1, 'rgba(150,206,255,0)']); c.fillRect(-260, -260, 520, 520); c.restore(); });
  for (let k = 1; k < 9; k++) { const y = SEA0 + 14 + k * 34; c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(W / 2, y + 16, W, y); c.strokeStyle = 'rgba(190,220,255,.05)'; c.lineWidth = 0.4; c.stroke(); } // parallels
  for (let k = 0; k < 13; k++) { const x = 20 + k * 70; c.beginPath(); c.moveTo(x, SEA0 + 4); c.quadraticCurveTo(x + (x - W / 2) * 0.06, 300, x + (x - W / 2) * 0.1, H); c.strokeStyle = 'rgba(190,220,255,.045)'; c.lineWidth = 0.4; c.stroke(); } // meridians
  for (let i = 0; i < 620; i++) { const x = r() * W, y = 165 + r() * (H - 165), l = 3 + r() * 7; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 0.9, x + l, y); c.strokeStyle = `rgba(170,212,255,${0.08 + r() * 0.2})`; c.lineWidth = 0.35; c.stroke(); }
  c.fillStyle = lg(c, 0, SEA0 - 12, 0, SEA0 + 14, [0, 'rgba(190,225,255,0)'], [0.46, 'rgba(206,234,255,.62)'], [0.54, 'rgba(206,234,255,.5)'], [1, 'rgba(190,225,255,0)']); c.fillRect(0, SEA0 - 12, W, 26);
  c.fillStyle = rg(c, W / 2, 300, 250, 560, [0, 'rgba(2,8,30,0)'], [1, 'rgba(2,8,30,.4)']); c.fillRect(0, SEA0, W, H - SEA0); // the edges of the chart fall away
}
/** The land and everything written on the map, standing on the sea: shallows, a cast shadow, relief, then the plain drawing's names and pins untouched. */
function land(c: C2) {
  const k = 2, solid = sheet(W, H, k, (t) => { drawMap(t, W, H, 8); t.globalCompositeOperation = 'source-in'; t.fillStyle = '#fff'; t.fillRect(0, 0, W, H); }); // the land's own outline
  const edge = (dx: number, dy: number, col: string) => sheet(W, H, k, (t) => { t.drawImage(solid, 0, 0, W, H); t.globalCompositeOperation = 'destination-out'; t.drawImage(solid, dx, dy, W, H); t.globalCompositeOperation = 'source-in'; t.fillStyle = col; t.fillRect(0, 0, W, H); });
  c.drawImage(sheet(W, H, k, (t) => { drawMap(t, W, H, 16); t.globalCompositeOperation = 'source-atop'; t.fillStyle = 'rgba(70,220,214,.3)'; t.fillRect(0, 0, W, H); }), 0, 0, W, H); // shallows, turning turquoise
  c.save(); c.globalAlpha = 0.5; soft(c, 2.2); c.drawImage(sheet(W, H, k, (t) => { t.drawImage(solid, 0, 0, W, H); t.globalCompositeOperation = 'source-in'; t.fillStyle = '#031030'; t.fillRect(0, 0, W, H); }), 2.4, 3, W, H); soft(c, 0); c.restore(); // the shadow the land lays on the water
  c.drawImage(sheet(W, H, D, (t) => {
    drawMap(t, W, H, 8); t.globalCompositeOperation = 'source-atop';
    const r = rng(77); for (let i = 0; i < 5200; i++) { const x = r() * W, y = 160 + r() * 260, q = r(); el(t, x, y, 0.5 + r() * 1.6, 0.3 + r() * 0.8, q < 0.5 ? 'rgba(10,50,30,.07)' : 'rgba(255,250,200,.06)'); } // ground cover: it only lands where there is land
    t.fillStyle = lg(t, 0, 160, 300, 420, [0, 'rgba(255,246,200,.16)'], [0.5, 'rgba(255,246,200,0)'], [1, 'rgba(6,30,50,.2)']); t.fillRect(0, 0, 330, H);       // Aotearoa: lit from the north-west
    t.fillStyle = lg(t, 560, 180, 780, 330, [0, 'rgba(255,246,200,.16)'], [0.5, 'rgba(255,246,200,0)'], [1, 'rgba(40,30,20,.18)']); t.fillRect(540, 0, 320, H);  // and America
    soft(t, 0.5); t.drawImage(edge(1.6, 1.8, 'rgba(255,252,224,.55)'), 0, 0, W, H); t.drawImage(edge(-1.8, -2, 'rgba(4,24,40,.42)'), 0, 0, W, H); soft(t, 0); // a bright shore toward the sun, a dark one away from it
  }), 0, 0, W, H);
  drawMap(c, W, H, 2); drawMap(c, W, H, 4); // the Moon and Mars, and every name, pin and the compass, exactly as the plain map has them
}
function swell(c: C2) { // a tile of the sea's surface: long soft crests
  const r = rng(5);
  for (let i = 0; i < 40; i++) { const x = r() * 128, y = r() * 64, l = 6 + r() * 14; for (const o of [0, 128, -128]) { c.beginPath(); c.moveTo(x + o, y); c.quadraticCurveTo(x + o + l / 2, y - 1.2, x + o + l, y); c.strokeStyle = `rgba(200,230,255,${0.1 + r() * 0.16})`; c.lineWidth = 0.4; c.stroke(); } }
}

type Im = Phaser.GameObjects.Image;
let o: { swell: Phaser.GameObjects.TileSprite[]; shades: [Im, Im][]; pool: Im; shadow: Im; dust: Phaser.GameObjects.Particles.ParticleEmitter; step: number } | undefined;
export const mapLook: Look = {
  build(scene) {
    texAt(scene, 'hf_mp_sea', W, H, 2, sea); texAt(scene, 'hf_mp_land', W, H, D, land); texAt(scene, 'hf_mp_swell', 128, 64, 2, swell);
    texAt(scene, 'hf_mp_cloud1', 70, 24, D, puffy(1)); texAt(scene, 'hf_mp_cloud2', 100, 30, D, puffy(2)); texAt(scene, 'hf_mp_cloud3', 46, 16, D, puffy(6));
    texAt(scene, 'hf_mp_ring', 12, 12, D, (c) => { el(c, 6, 6, 4.6, 4.6, undefined, 'rgba(255,255,255,.9)', 0.5); halo(c, 6, 6, 6, '255,255,255', 0.25); line(c, 6, 0.6, 6, 2.4, 'rgba(255,255,255,.7)', 0.3); });
  },
  layers: [],
  swap: { map: 'hf_mp_sea', cloud1: 'hf_mp_cloud1', cloud2: 'hf_mp_cloud2', cloud3: 'hf_mp_cloud3' },
  grade: { threshold: 0.86, bloom: 0.34, exposure: 1.0, contrast: 1.06, saturation: 1.1, shadows: [0.95, 0.98, 1.07], highs: [1.03, 1.01, 0.97], vignette: 0.3, grain: 0.012, fringe: 0 },
  live(hf) {
    const s = hf.scene, r = rng(9), tw = (targets: object, cfg: object) => s.tweens.add({ targets, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', ...cfg });
    const puff = (x: number, y: number, k: number, tint: number, a: number) => s.add.image(x, y, 'puff').setScale(S * k).setTint(tint).setBlendMode('ADD').setAlpha(a);
    // on the sea, under the land: two layers of swell drifting across each other, glitter, and the stars above it all
    (hf.tags.map as Im).setScale(0.5); // the sea is drawn at half the land's sharpness: it is the far layer
    const land = hf.above(s.add.image(0, 0, 'hf_mp_land').setOrigin(0).setScale(1 / D), 'map'); hf.tag({ land });
    const tile = (a: number) => hf.below(s.add.tileSprite(0, SEA0 + 8, W * 2, (H - SEA0 - 8) * 2, 'hf_mp_swell').setOrigin(0).setScale(0.5).setAlpha(a).setBlendMode('ADD'), 'land');
    const sw = [tile(0.5), tile(0.34)];
    hf.below(s.add.particles(0, 0, 'puff', { x: { min: 0, max: W }, y: { min: SEA0 + 14, max: H }, lifespan: { min: 500, max: 1300 }, scale: { start: S * 0.13, end: 0 }, alpha: { start: 0.75, end: 0 }, tint: 0xeaf6ff, blendMode: 'ADD', frequency: 6, advance: 1200 }), 'land');
    for (let i = 0; i < 26; i++) tw(hf.below(puff(r() * W, r() * 104, 0.16 + r() * 0.2, 0xdfe8ff, 0.9), 'land'), { alpha: 0.1, duration: 500 + r() * 1500 });
    tw(hf.below(s.add.rectangle(0, SEA0 - 3, W, 5, 0xbfe2ff, 0.16).setOrigin(0).setBlendMode('ADD'), 'land'), { alpha: 0.04, duration: 3600 }); // the air along the horizon, breathing
    // lights on the land: the cities warm and steady, the launch and test sites with a beacon that sweeps
    for (const [x, y] of CITIES) tw(hf.above(puff(x, y, 0.9, 0xffc878, 0.5), 'land'), { alpha: 0.26, duration: 1400 + r() * 900 });
    SITES.forEach(([x, y], i) => {
      tw(hf.above(puff(x, y, 0.8, 0x9fe6ff, 0.6), 'land'), { alpha: 0.2, duration: 700 + i * 90 });
      const ring = hf.above(s.add.image(x, y, 'hf_mp_ring').setScale(S * 0.3).setBlendMode('ADD').setAlpha(0.8), 'land');
      s.tweens.add({ targets: ring, scale: S * 1.5, alpha: 0, duration: 2600, repeat: -1, delay: i * 520, ease: 'Cubic.easeOut' });
    });
    // every cloud drags a shadow over sea and land, and loses a little of itself to the light
    const shades: [Im, Im][] = [];
    for (let i = 0; i < 7; i++) { const c = hf.tags['cloud' + i] as Im | undefined; if (!c) continue; shades.push([c, hf.above(s.add.image(c.x, c.y, c.texture.key).setTintFill(0x031030).setAlpha(0.13).setScale(c.scaleX * 1.06), 'land')]); }
    // the marker: a pool of warm light and a shadow at its feet, and dust where it walks
    const m = hf.tags.marker as Im, pool = puff(m.x, m.y, 3.4, 0xffe2a8, 0.3).setDepth(5.2), shadow = s.add.image(m.x, m.y, 'hf_shadow').setScale(0.3, 0.34).setDepth(5.4).setAlpha(0.8);
    const dust = s.add.particles(0, 0, 'puff', { speedX: { min: -8, max: 8 }, speedY: { min: -9, max: -2 }, lifespan: { min: 300, max: 560 }, scale: { start: S * 0.14, end: S * 0.42 }, alpha: { start: 0.4, end: 0 }, tint: 0xfff0d0, emitting: false }).setDepth(5.6);
    o = { swell: sw, shades, pool, shadow, dust, step: 0 };
  },
  step(hf, dt) {
    if (!o) return;
    const t = hf.t, m = hf.tags.marker as Im, moving = !!hf.state.moving;
    o.swell[0].tilePositionX += 5 * dt * 2; o.swell[0].tilePositionY = Math.sin(t * 0.3) * 6; o.swell[1].tilePositionX -= 3.4 * dt * 2; o.swell[1].tilePositionY = 40 + Math.cos(t * 0.23) * 8;
    for (const [c, sh] of o.shades) sh.setPosition(c.x + 7, c.y + 10);
    o.pool.setPosition(m.x, m.y - 8).setAlpha(moving ? 0.42 : 0.26 + 0.05 * Math.sin(t * 2.4)); o.shadow.setPosition(m.x, m.y + 0.4);
    if (moving) { o.step -= dt; if (o.step <= 0) { o.step = 0.09; o.dust.emitParticleAt(m.x, m.y, 1); } }
  },
};
