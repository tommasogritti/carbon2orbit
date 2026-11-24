import Phaser from 'phaser';
import { D, S, C2, el, line, lg, rg, rng, drawMap, MAPW, MAPH, nz, us } from '../art';
import { texAt, soft, add, halo, sheet } from '../hifi';
import type { Look } from '../hifi';

// ------------------------------------------------------------------ The world map: the Pacific by day, from orbit
// The map is not one day of the story, so its light is the game's choice: the plain map's own daylight, with the sun
// high in the north-west. It is drawn the way a satellite sees it. No photograph is used: the land is worked out point
// by point, the first time the map is shown, from the plain map's own coastlines. Each point gets a height (noise,
// raised into ranges where the real ones stand: the Southern Alps, the Rockies, the Sierra, the Appalachians), a
// climate (wet west of the Alps and dry in their lee, desert in the American south-west, red earth behind the
// Australian coast), a colour from the two, and the shade its slope takes from the sun. The sea is deep and nearly
// black-blue, paler over the shelves round the land and turquoise in the shallows; cloud drifts over all of it.
// The map is read constantly, so every name, pin, node and tag is as it was: names and pins are the plain drawing's
// own (`drawMap`, in parts), at full sharpness, and the grade leaves colour fringing and heavy bloom out.
const W = MAPW, H = MAPH, SEA0 = 150;
const CITIES = [nz(174.76, -36.85), nz(174.78, -41.29), nz(170.5, -45.87), nz(168.35, -46.41), us(-118.2, 33.8), us(-74, 40.7)];
const SITES = [nz(177.87, -39.26), nz(175.82, -36.6), nz(172.75, -43.8), us(-75.45, 37.9), us(-89.6, 30.4)]; // Māhia, Great Mercury, Kaitorete, Wallops, Stennis

type V3 = [number, number, number];
const cl = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x), ss = (a: number, b: number, x: number) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** Smooth noise, summed over `oct` octaves, each twice as fine; it repeats every `px` by `py` cells, so a tile can be cut from it. */
function fbmOf(seed: number) {
  const r = rng(seed), t = new Float32Array(65536); for (let i = 0; i < 65536; i++) t[i] = r();
  return (x: number, y: number, oct = 5, px = 256, py = 256) => {
    let s = 0, amp = 0.5, tot = 0;
    for (let o = 0; o < oct; o++) {
      const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, fx = u * u * (3 - 2 * u), fy = v * v * (3 - 2 * v);
      const x0 = (((xi % px) + px) % px) & 255, x1 = ((((xi + 1) % px) + px) % px) & 255, y0 = ((((yi % py) + py) % py) + o * 37) & 255, y1 = (((((yi + 1) % py) + py) % py) + o * 37) & 255;
      const a = t[(y0 << 8) | x0], b = t[(y0 << 8) | x1], c = t[(y1 << 8) | x0], d = t[(y1 << 8) | x1];
      s += amp * (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy); tot += amp; amp *= 0.5; x *= 2; y *= 2; px *= 2; py *= 2;
    }
    return s / tot;
  };
}
/** A field blurred three times with a box `rad` wide: near enough a Gaussian, and quick. The edges of the map repeat outward. */
function blurred(src: Float32Array, w: number, h: number, rad: number) {
  let a = Float32Array.from(src), b = new Float32Array(w * h);
  const pass = (from: Float32Array, to: Float32Array, n: number, step: number, lines: number, stride: number) => {
    for (let l = 0; l < lines; l++) {
      const o = l * stride, at = (i: number) => from[o + (i < 0 ? 0 : i >= n ? n - 1 : i) * step]; let sum = 0;
      for (let i = -rad; i <= rad; i++) sum += at(i);
      for (let i = 0; i < n; i++) { to[o + i * step] = sum / (rad * 2 + 1); sum += at(i + rad + 1) - at(i - rad); }
    }
  };
  for (let k = 0; k < 3; k++) { pass(a, b, w, 1, h, w); pass(b, a, h, w, w, 1); }
  return a;
}
/** How far a point is from the stretch a→b, and which side of it it lies on (positive to the right of the way from a to b). */
function seg(x: number, y: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dy = b[1] - a[1], t = cl(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)), d = Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
  return dx * (y - a[1]) - dy * (x - a[0]) > 0 ? d : -d;
}
const bell = (d: number, w: number) => Math.exp(-(d * d) / (w * w));

/** The coasts as two soft fields, one unit to the cell: `near` (the land's own edge, a few units either way) and `far` (the shelf out to sea, and how far inland a place is). 0.5 is the shore. */
let coast: { near: Float32Array; far: Float32Array } | undefined;
function coasts() {
  if (coast) return coast;
  const cv = sheet(W, H, 1, (t) => drawMap(t, W, H, 8)), d = cv.getContext('2d')!.getImageData(0, 0, W, H).data, m = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = d[i * 4 + 3] / 255;
  return (coast = { near: blurred(m, W, H, 2), far: blurred(m, W, H, 9) });
}
const at = (f: Float32Array, x: number, y: number) => { // a field, read between its cells
  x = x < 0 ? 0 : x > W - 1.001 ? W - 1.001 : x; y = y < 0 ? 0 : y > H - 1.001 ? H - 1.001 : y;
  const xi = x | 0, yi = y | 0, u = x - xi, v = y - yi, i = yi * W + xi;
  return f[i] + (f[i + 1] - f[i]) * u + (f[i + W] - f[i]) * v + (f[i] - f[i + 1] - f[i + W] + f[i + W + 1]) * u * v;
};

// the ranges, as the stretches they run along, and the lakes big enough to see from up here: [x, y, half its width, half its height]
const ALPS = [nz(167.3, -45.5), nz(172.7, -41.8)], AXIAL = [nz(175.3, -41.1), nz(177.9, -37.9)], VOLCANOES = [nz(175.57, -39.28), nz(174.06, -39.3), nz(175.65, -39.16)];
const ROCKIES = [us(-105.5, 32), us(-114, 49)], SIERRA = [us(-118.3, 35.3), us(-121.6, 48.9)], APPALACHIANS = [us(-84.3, 34.6), us(-71, 44.5)], DIVIDE = [[30, 186], [31, 300]];
const LAKES = [[...nz(175.9, -38.8), 2.1, 2.6], [...us(-87, 44), 3.4, 9.6], [...us(-112.5, 41.1), 1.6, 2.4], [...us(-81.2, 27), 1.5, 1.7], [...nz(168.6, -45.1), 1.2, 3], [...nz(170.5, -43.9), 0.9, 1.9]]; // Taupō, Michigan, the Great Salt Lake, Okeechobee, Wakatipu, Pukaki
const FOREST: V3 = [30, 62, 38], BUSH: V3 = [54, 90, 48], PASTURE: V3 = [112, 136, 64], CROP: V3 = [146, 150, 84], TAWNY: V3 = [160, 146, 96], DESERT: V3 = [188, 162, 118], RED: V3 = [180, 108, 64], ROCK: V3 = [112, 104, 96], SNOW: V3 = [240, 244, 248], SAND: V3 = [218, 206, 168], HAZE: V3 = [150, 186, 226], LAKE: V3 = [16, 54, 104];

/** The land as a satellite has it, three points to the unit: only where the plain map has land, and with its coastline. */
function terrain() {
  const R = 3, w = W * R, h = H * R, cv = sheet(W, H, R, (t) => drawMap(t, W, H, 8)), cx = cv.getContext('2d')!, im = cx.getImageData(0, 0, w, h), d = im.data;
  const { near, far } = coasts(), n = fbmOf(77), hgt = new Float32Array(w * h), wet = new Float32Array(w * h), dry = new Float32Array(w * h), cap = new Float32Array(w * h);
  // what changes slowly across the land is worked out once to the unit, and read between the cells: how the noise is bent (so no ridge runs straight), the broad lie of the country, and how a range rises and falls along its length
  const bx = new Float32Array(W * H), by = new Float32Array(W * H), lie = new Float32Array(W * H), rise = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const j = y * W + x; if (far[j] < 0.02) continue;
    bx[j] = (n(x * 0.05 + 7, y * 0.05, 3) - 0.5) * 16; by[j] = (n(x * 0.05, y * 0.05 + 9, 3) - 0.5) * 16;
    lie[j] = n((x + bx[j]) * 0.045, (y + by[j]) * 0.045, 5); rise[j] = 0.55 + 0.9 * n(x * 0.07 + 3, y * 0.07 + 8, 2);
  }
  // first the lie of the land: how high each point stands, how much rain it gets, how red its earth is, whether its peaks keep their snow
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const i = py * w + px; if (!d[i * 4 + 3]) continue;
    const u = px / R, v = py / R, shore = cl((at(near, u, v) - 0.5) * 2.2), inland = cl((at(far, u, v) - 0.5) * 2.2);
    const wx = u + at(bx, u, v), wy = v + at(by, u, v), broad = at(lie, u, v), along = at(rise, u, v), mid = n(wx * 0.16 + 30, wy * 0.16, 4), fine = n(u * 0.7, v * 0.7 + 20, 3);
    const r0 = 1 - Math.abs(2 * n(wx * 0.3 + 40, wy * 0.3, 4) - 1), ridge = r0 * r0; // crest lines
    let range = 0, m = 0.5, red = 0, snow = 0, lake = false;
    if (u < 46) { // Australia: green along the coast, red earth behind the Divide
      range = 0.3 * bell(seg(u, v, DIVIDE[0], DIVIDE[1]), 3);
      m = 0.1 + 0.62 * ss(16, 35, u) + (broad - 0.5) * 0.3; red = 1;
    } else if (u < 340) { // Aotearoa: the rain comes from the west and falls on the Alps; the plains in their lee are dry
      const da = seg(u, v, ALPS[0], ALPS[1]), alps = bell(da - 1, 5.2); let cones = 0; for (const [x, y] of VOLCANOES) cones += bell(Math.hypot(u - x, v - y), 1.7);
      range = alps * along + 0.3 * bell(seg(u, v, AXIAL[0], AXIAL[1]), 3) * along + 0.8 * cones; snow = alps + cones * 1.4;
      m = 0.74 + (broad - 0.5) * 0.5 + (mid - 0.5) * 0.5 - 0.36 * ss(2, 9, da) * ss(28, 15, da);
    } else { // America: forest in the east and the north-west, farmland and plains between, desert in the south-west
      const lon = -124.7 + (u - 580) / 4.16, lat = 49 - (v - 195) / 5.2, rock = bell(seg(u, v, ROCKIES[0], ROCKIES[1]), 10), sierra = bell(seg(u, v, SIERRA[0], SIERRA[1]), 3.2);
      range = (0.78 * rock + 0.7 * sierra + 0.25 * bell(seg(u, v, APPALACHIANS[0], APPALACHIANS[1]), 4)) * along + 0.16 * ss(-100, -108, lon) * ss(-121, -116, lon); // and the basin and range between the two
      snow = 0.4 * rock * ss(36, 44, lat) + 0.4 * sierra * ss(36, 41, lat);
      m = Math.max(0.1 + 0.76 * ss(-106, -90, lon), 0.86 * ss(-119.5, -122.6, lon) * ss(38.5, 43.5, lat)) + (broad - 0.5) * 0.4 + (mid - 0.5) * 0.3 - 0.2 * bell(lon + 91, 7) * bell(lat - 41.5, 4.5); // the corn belt is paler than the forest round it
      red = ss(39, 33, lat) * ss(-99, -108, lon) * 0.8;
    }
    for (const [x, y, rx, ry] of LAKES) if (((u - x - 0.3 * rx * Math.sin(((v - y) / ry) * 2.2)) / rx) ** 2 + ((v - y) / ry) ** 2 < 0.55 + 0.5 * mid + 0.3 * fine) lake = true; // no lake is an ellipse
    hgt[i] = lake ? 0.02 : Math.pow(shore, 0.6) * (0.08 + 0.16 * broad + 0.1 * mid * inland + Math.min(1.1, range) * (0.12 + 0.78 * ridge)) + fine * 0.05;
    wet[i] = lake ? -1 : Math.max(0.01, m + (fine - 0.5) * 0.2); dry[i] = red; cap[i] = Math.min(1, snow * 1.3);
  }
  // then its colour, and the shade its slope takes from a sun in the north-west
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const i = py * w + px; if (!d[i * 4 + 3]) continue;
    const u = px / R, v = py / R, e = hgt[i], m = wet[i], k = e * 1.3, mottle = 0.9 + 0.2 * n(u * 2.4 + 9, v * 2.4, 2);
    let c: V3;
    if (m < 0) c = LAKE;
    else {
      c = mix(mix(DESERT, RED, dry[i]), TAWNY, ss(0.04, 0.34, m)); c = mix(c, CROP, ss(0.3, 0.5, m)); c = mix(c, PASTURE, ss(0.46, 0.64, m)); c = mix(c, BUSH, ss(0.62, 0.8, m)); c = mix(c, FOREST, ss(0.78, 1, m));
      c = mix(c, FOREST, 0.55 * ss(0.5, 0.7, m) * ss(0.16, 0.3, k) * (1 - ss(0.44, 0.58, k)));  // bush on the flanks of the ranges
      c = mix(c, ROCK, 0.8 * ss(0.44, 0.62, k));
      c = mix(c, SNOW, cap[i] * ss(0.6, 0.74, k));                                              // snow where the range is high and cold enough to keep it
      const slope = (hgt[i + 1] - hgt[i - 1] + hgt[i + w] - hgt[i - w]) * 9, lit = Math.max(0.46, Math.min(1.5, 0.94 + slope)) * mottle;
      c = mix(c, SAND, 0.5 * ss(0.16, 0.02, cl((at(near, u, v) - 0.5) * 2.2)));                 // the beach
      c = [c[0] * lit, c[1] * lit, c[2] * lit];
    }
    c = mix(c, HAZE, 0.3 * ss(236, 150, v));                                                    // toward the horizon there is more air in the way
    d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2];
  }
  cx.putImageData(im, 0, 0);
  return cv;
}
/** The ocean from orbit, one point to every two units (it is soft anyway): deep water, the shelves, the shallows, and the slow streaks of its currents. */
function ocean() {
  const w = W >> 1, h = H >> 1, cv = sheet(W, H, 0.5), cx = cv.getContext('2d')!, im = cx.createImageData(w, h), d = im.data, { near, far } = coasts(), n = fbmOf(21);
  const DEEP0: V3 = [9, 34, 86], DEEP1: V3 = [3, 13, 40], SHELF: V3 = [24, 86, 140], SHOAL: V3 = [78, 186, 184], BLOOM: V3 = [16, 70, 96];
  for (let py = SEA0 >> 1; py < h; py++) for (let px = 0; px < w; px++) {
    const x = px * 2, y = py * 2, i = (py * w + px) * 4, wx = x + (n(x * 0.012 + 3, y * 0.02, 3) - 0.5) * 120, wy = y + (n(x * 0.012, y * 0.02 + 5, 3) - 0.5) * 60;
    const flow = n(wx * 0.014, wy * 0.03, 4), patch = n(x * 0.05 + 11, y * 0.05, 4);
    let c = mix(DEEP0, DEEP1, ss(SEA0, H, y) * 0.9 + 0.1);
    c = mix(c, BLOOM, 0.5 * ss(0.5, 0.78, flow));                                               // currents, and what blooms in them
    const plateau = 0.42 * bell(Math.hypot((x - 196) / 64, (y - 372) / 30), 1) + 0.3 * bell(Math.hypot((x - 286) / 40, (y - 318) / 16), 1); // the Campbell Plateau and the Chatham Rise: Zealandia, just under the surface
    const shelf = cl(cl(at(far, x, y) * 2.3) * (0.55 + 0.9 * patch) + plateau * (0.5 + patch));
    c = mix(c, SHELF, 0.8 * shelf * shelf);
    c = mix(c, SHOAL, 0.85 * Math.pow(cl(at(near, x, y) * 2.2), 2.2));
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  cx.putImageData(im, 0, 0);
  return cv;
}

function sea(c: C2) {
  const r = rng(21);
  // space, with the Milky Way laid across it, and the thin bright line of the air
  c.fillStyle = lg(c, 0, 0, 0, SEA0, [0, '#020309'], [0.5, '#070c26'], [0.8, '#163a80'], [0.95, '#3a84d6'], [1, '#7fc0f4']); c.fillRect(0, 0, W, SEA0);
  c.fillStyle = rg(c, 620, 40, 5, 170, [0, 'rgba(120,80,200,.24)'], [1, 'rgba(120,80,200,0)']); c.fillRect(0, 0, W, SEA0);
  soft(c, 7); for (let i = 0; i < 44; i++) el(c, i * 20 + r() * 20, 64 - i * 1.1 + (r() - 0.5) * 26, 18 + r() * 20, 5 + r() * 7, `rgba(${130 + r() * 60},${130 + r() * 50},230,${0.03 + r() * 0.04})`); soft(c, 0);
  for (let i = 0; i < 900; i++) { const x = r() * W, y = r() * 112, s = r(); c.globalAlpha = (0.3 + r() * 0.7) * (1 - (y / 124) ** 2); el(c, x, y, s > 0.975 ? 0.6 : 0.14 + s * 0.2, s > 0.975 ? 0.6 : 0.14 + s * 0.2, s > 0.9 ? '#ffd9a8' : s > 0.8 ? '#a8ccff' : '#ffffff'); }
  c.globalAlpha = 1;
  // the ocean, then the air over it: thicker and bluer toward the horizon, and the sun's glint where it stands over the water
  c.drawImage(ocean(), 0, SEA0 >> 1, W >> 1, (H - SEA0) >> 1, 0, SEA0, W, H - SEA0);
  c.fillStyle = lg(c, 0, SEA0, 0, SEA0 + 110, [0, 'rgba(96,160,232,.62)'], [0.3, 'rgba(60,124,208,.3)'], [1, 'rgba(40,100,190,0)']); c.fillRect(0, SEA0, W, 110);
  add(c, () => { c.save(); c.translate(330, 250); c.rotate(-0.16); c.scale(1, 0.34); c.fillStyle = rg(c, 0, 0, 0, 260, [0, 'rgba(200,226,255,.3)'], [0.4, 'rgba(150,200,255,.12)'], [1, 'rgba(150,206,255,0)']); c.fillRect(-260, -260, 520, 520); c.restore(); });
  for (let k = 1; k < 9; k++) { const y = SEA0 + 14 + k * 34; c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(W / 2, y + 16, W, y); c.strokeStyle = 'rgba(190,220,255,.05)'; c.lineWidth = 0.4; c.stroke(); } // parallels
  for (let k = 0; k < 13; k++) { const x = 20 + k * 70; c.beginPath(); c.moveTo(x, SEA0 + 4); c.quadraticCurveTo(x + (x - W / 2) * 0.06, 300, x + (x - W / 2) * 0.1, H); c.strokeStyle = 'rgba(190,220,255,.045)'; c.lineWidth = 0.4; c.stroke(); } // meridians
  c.fillStyle = lg(c, 0, SEA0 - 12, 0, SEA0 + 14, [0, 'rgba(190,225,255,0)'], [0.46, 'rgba(206,234,255,.62)'], [0.54, 'rgba(206,234,255,.5)'], [1, 'rgba(190,225,255,0)']); c.fillRect(0, SEA0 - 12, W, 26);
  c.fillStyle = rg(c, W / 2, 300, 250, 560, [0, 'rgba(2,8,30,0)'], [1, 'rgba(2,8,30,.4)']); c.fillRect(0, SEA0, W, H - SEA0); // the edges of the chart fall away
}
/** The land and everything written on the map: the land as the satellite has it, a line of surf round it, then the plain drawing's names and pins untouched. */
function land(c: C2) {
  const surf = sheet(W, H, 2, (t) => { drawMap(t, W, H, 8); t.globalCompositeOperation = 'source-in'; t.fillStyle = 'rgba(226,246,250,.26)'; t.fillRect(0, 0, W, H); });
  for (const [dx, dy] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) c.drawImage(surf, dx, dy, W, H); // surf: a pale line just outside the shore
  c.drawImage(terrain(), 0, 0, W, H);
  // the two names the plain map writes in dark ink on pale land get a pale glow of their own shape under them, so they still read on forest and desert
  const ink = sheet(W, H, D, (t) => { t.beginPath(); t.rect(640, 236, 120, 14); t.rect(0, 222, 36, 10); t.clip(); drawMap(t, W, H, 4); t.globalCompositeOperation = 'source-in'; t.fillStyle = '#fff4d6'; t.fillRect(0, 0, W, H); });
  c.save(); c.shadowColor = 'rgba(255,244,214,.95)'; c.shadowBlur = 7; c.globalAlpha = 0.7; for (let i = 0; i < 4; i++) c.drawImage(ink, 0, 0, W, H); c.restore();
  drawMap(c, W, H, 2); drawMap(c, W, H, 4); // the Moon and Mars, and every name, pin and the compass, exactly as the plain map has them
}
/** A tile of thin high cloud, to drift over the sea. */
function veil(c: C2) {
  const w = 512, h = 256, im = c.createImageData(w, h), d = im.data, n = fbmOf(5);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const wx = x / 64 + (n(x / 128, y / 64 + 2, 2, 4, 4) - 0.5) * 1.4, a = ss(0.5, 0.8, n(wx, y / 32, 5, 8, 8)), i = (y * w + x) * 4;
    d[i] = 226; d[i + 1] = 238; d[i + 2] = 255; d[i + 3] = a * 150;
  }
  c.putImageData(im, 0, 0);
}
/** A cloud from above: a bank of cumulus with holes in it, brighter on the side toward the sun. */
const bank = (seed: number) => (c: C2, w: number, h: number) => {
  const pw = Math.ceil(w * D), ph = Math.ceil(h * D), im = c.createImageData(pw, ph), d = im.data, n = fbmOf(seed + 60);
  const dens = (u: number, v: number) => { const e = 1 - ((u / w - 0.5) * 2) ** 2 - ((v / h - 0.5) * 2) ** 2; return e <= 0 ? 0 : n(u * 0.11 + 5, v * 0.17, 5) * (0.5 + 0.85 * Math.sqrt(e)); };
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
    const u = x / D, v = y / D, q = dens(u, v), a = ss(0.44, 0.66, q), lit = cl(0.5 + (q - dens(u + 0.9, v + 1.1)) * 9), i = (y * pw + x) * 4; // thicker than its neighbour down-sun: it faces the sun
    d[i] = 196 + 59 * lit; d[i + 1] = 206 + 49 * lit; d[i + 2] = 226 + 29 * lit; d[i + 3] = a * 255;
  }
  c.putImageData(im, 0, 0);
};

type Im = Phaser.GameObjects.Image;
let o: { swell: Phaser.GameObjects.TileSprite[]; shades: [Im, Im][]; pool: Im; shadow: Im; dust: Phaser.GameObjects.Particles.ParticleEmitter; step: number } | undefined;
export const mapLook: Look = {
  build(scene) {
    texAt(scene, 'hf_mp_sea', W, H, 2, sea); texAt(scene, 'hf_mp_land', W, H, D, land); texAt(scene, 'hf_mp_swell', 256, 128, 2, veil);
    texAt(scene, 'hf_mp_cloud1', 70, 24, D, bank(1)); texAt(scene, 'hf_mp_cloud2', 100, 30, D, bank(2)); texAt(scene, 'hf_mp_cloud3', 46, 16, D, bank(6));
    texAt(scene, 'hf_mp_ring', 12, 12, D, (c) => { el(c, 6, 6, 4.6, 4.6, undefined, 'rgba(255,255,255,.9)', 0.5); halo(c, 6, 6, 6, '255,255,255', 0.25); line(c, 6, 0.6, 6, 2.4, 'rgba(255,255,255,.7)', 0.3); });
  },
  layers: [],
  swap: { map: 'hf_mp_sea', cloud1: 'hf_mp_cloud1', cloud2: 'hf_mp_cloud2', cloud3: 'hf_mp_cloud3' },
  grade: { threshold: 0.86, bloom: 0.34, exposure: 1.0, contrast: 1.06, saturation: 1.1, shadows: [0.95, 0.98, 1.07], highs: [1.03, 1.01, 0.97], vignette: 0.3, grain: 0.012, fringe: 0 },
  live(hf) {
    const s = hf.scene, r = rng(9), tw = (targets: object, cfg: object) => s.tweens.add({ targets, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', ...cfg });
    const puff = (x: number, y: number, k: number, tint: number, a: number) => s.add.image(x, y, 'puff').setScale(S * k).setTint(tint).setBlendMode('ADD').setAlpha(a);
    // on the sea, under the land: two veils of high cloud drifting across each other, a little glitter, and the stars above it all
    (hf.tags.map as Im).setScale(0.5); // the sea is drawn at half the land's sharpness: it is the far layer
    const land = hf.above(s.add.image(0, 0, 'hf_mp_land').setOrigin(0).setScale(1 / D), 'map'); hf.tag({ land });
    const tile = (a: number) => hf.below(s.add.tileSprite(0, SEA0 + 8, W * 2, (H - SEA0 - 8) * 2, 'hf_mp_swell').setOrigin(0).setScale(0.5).setAlpha(a).setBlendMode('ADD'), 'land');
    const sw = [tile(0.2), tile(0.13)];
    hf.below(s.add.particles(0, 0, 'puff', { x: { min: 0, max: W }, y: { min: SEA0 + 14, max: H }, lifespan: { min: 500, max: 1300 }, scale: { start: S * 0.1, end: 0 }, alpha: { start: 0.6, end: 0 }, tint: 0xeaf6ff, blendMode: 'ADD', frequency: 22, advance: 1200 }), 'land');
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
