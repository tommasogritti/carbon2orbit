// One stretch of the road to Māhia, made ready to drive and to draw: the road as a line with everything the truck needs
// to know (its height, width, surface, curvature), and the textures the renderer reads (src/gfx3d/drive.ts): a distance
// field round the road with the ground under it, what covers the ground, and every thing that stands near the road,
// gathered into a grid. The road, buildings, trees, poles, water, bush and coast come from OpenStreetMap and the ground
// from the LINZ elevation model (src/drive/stages.json, made by scripts/drive-data.mjs); the fences, marker posts,
// bush, flax, toetoe and signs are placed here, by rule, where such things stand on roads like these.
import type { DriveTex } from '../gfx3d/engine';

export interface StageRaw {
  id: string; name: string; road: string; km: [number, number]; len: number; o: [number, number];
  dem: { x0: number; z0: number; step: number; nx: number; nz: number; h: string };
  polys: Record<string, number[][]>; lines: Record<string, number[][]>;
  bld: number[][]; trees: number[][]; poles: number[][];
}
export interface Data { origin: [number, number]; total: number; credit: string; region: { x0: number; z0: number; step: number; nx: number; nz: number; h: string }; stages: any[] }

const dec = (s: string) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; };
const i16 = (s: string) => new Int16Array(dec(s)), u8 = (s: string) => new Uint8Array(dec(s));
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** A small seeded random, so every visit grows the same trees in the same places. */
function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
const hash = (x: number, z: number) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };
/** Smooth value noise, 0..1. */
function vnoise(x: number, z: number) { const i = Math.floor(x), j = Math.floor(z), u = x - i, v = z - j, a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1), su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v); return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv; }

/** The road of one stage, every 4 m, in the stage's frame (x east, z south, metres from where the truck starts). */
export class Track {
  n: number; s0: number; x: Float32Array; z: Float32Array; y: Float32Array; w: Float32Array; k: Uint8Array;
  tx: Float32Array; tz: Float32Array; kap: Float32Array; centre: Uint8Array; len: number;
  bridge: [number, number] = [1, 0];
  constructor(r: any, len: number) {
    this.n = r.n; this.s0 = r.s0; this.len = len;
    const X = i16(r.x), Z = i16(r.z), Y = i16(r.y), W = u8(r.w), K = u8(r.k), n = this.n;
    this.x = Float32Array.from(X, (v) => v / 10); this.z = Float32Array.from(Z, (v) => v / 10); this.y = Float32Array.from(Y, (v) => v / 10);
    this.w = Float32Array.from(W, (v) => v / 10); this.k = Uint8Array.from(K);
    // smooth the line a little: the map's points are a few metres apart and a truck does not turn at a corner
    for (let pass = 0; pass < 3; pass++) for (let i = 1; i + 1 < n; i++) { this.x[i] = (this.x[i - 1] + 2 * this.x[i] + this.x[i + 1]) / 4; this.z[i] = (this.z[i - 1] + 2 * this.z[i] + this.z[i + 1]) / 4; }
    // re-space it: exactly 4 m apart along the smoothed line
    const ax: number[] = [this.x[0]], az: number[] = [this.z[0]]; let acc = 0;
    for (let i = 0; i + 1 < n; i++) { const dx = this.x[i + 1] - this.x[i], dz = this.z[i + 1] - this.z[i], L = Math.hypot(dx, dz); let u = 0; while (acc + L - u >= 4) { u += 4 - acc; acc = 0; ax.push(this.x[i] + (dx * u) / L); az.push(this.z[i] + (dz * u) / L); } acc += L - u; }
    let m = ax.length; const ri = (j: number) => Math.min(n - 1, Math.round((j * (n - 1)) / (m - 1)));
    const y = new Float32Array(m), w = new Float32Array(m), k = new Uint8Array(m);
    for (let j = 0; j < m; j++) { const i = ri(j); y[j] = this.y[i]; w[j] = this.w[i]; k[j] = this.k[i]; }
    // widths change over 40 m, not at a point
    const w2 = Float32Array.from(w); for (let j = 0; j < m; j++) { let a = 0, c = 0; for (let q = -5; q <= 5; q++) { const jj = clamp(j + q, 0, m - 1); a += w[jj]; c++; } w2[j] = a / c; }
    this.n = m; this.x = Float32Array.from(ax); this.z = Float32Array.from(az); this.y = y; this.w = w2; this.k = k;
    // the origin moves with the smoothing: keep s = 0 where the truck starts (the point nearest the stage origin)
    let best = 0, bd = Infinity; for (let j = 0; j < m; j++) { const d = Math.hypot(this.x[j], this.z[j]); if (d < bd) { bd = d; best = j; } }
    this.s0 = -best * 4;
    // the first stretch starts where the route does: give it a run-up behind, straight on from its first bearing
    if (best < 30) {
      const k = 30 - best, ux = this.x[1] - this.x[0], uz = this.z[1] - this.z[0], L = Math.hypot(ux, uz) || 1;
      const nx = Float32Array.from({ length: k }, (_, i) => this.x[0] - (ux / L) * 4 * (k - i)), nz = Float32Array.from({ length: k }, (_, i) => this.z[0] - (uz / L) * 4 * (k - i));
      const cat = (a: Float32Array, b: Float32Array) => { const o = new Float32Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; };
      this.x = cat(nx, this.x); this.z = cat(nz, this.z); this.y = cat(new Float32Array(k).fill(this.y[0]), this.y); this.w = cat(new Float32Array(k).fill(this.w[0]), this.w);
      const kk = new Uint8Array(k + this.k.length); kk.fill(this.k[0] & ~2, 0, k); kk.set(this.k, k); this.k = kk; this.n += k; this.s0 -= k * 4; m += k;
    }
    this.tx = new Float32Array(m); this.tz = new Float32Array(m); this.kap = new Float32Array(m); this.centre = new Uint8Array(m);
    for (let j = 0; j < m; j++) { const a = Math.max(0, j - 1), b = Math.min(m - 1, j + 1), dx = this.x[b] - this.x[a], dz = this.z[b] - this.z[a], L = Math.hypot(dx, dz) || 1; this.tx[j] = dx / L; this.tz[j] = dz / L; }
    for (let j = 0; j < m; j++) { const a = Math.max(0, j - 3), b = Math.min(m - 1, j + 3); const h0 = Math.atan2(this.tz[a], this.tx[a]), h1 = Math.atan2(this.tz[b], this.tx[b]); let dh = h1 - h0; dh = ((dh + Math.PI * 3) % (Math.PI * 2)) - Math.PI; this.kap[j] = dh / Math.max(4, (b - a) * 4); }
    { const k0 = Float32Array.from(this.kap); for (let j = 0; j < m; j++) { let a = 0, c = 0; for (let q = -6; q <= 6; q++) { const jj = clamp(j + q, 0, m - 1), w = Math.exp(-(q * q) / 12); a += k0[jj] * w; c += w; } this.kap[j] = a / c; } }   // a bend's curvature builds over tens of metres
    // the centre line: dashed, with a no-overtaking line on the side of whichever traffic cannot see far enough ahead, round a
    // bend or over a rise (bit 2: the truck's way, drawn left of the centre; bit 4: the other way, drawn right of it)
    const blind = (j: number, dir: number) => { for (let q = 0; q <= 32; q++) { const jj = clamp(j + dir * q, 0, m - 1); if (Math.abs(this.kap[jj]) > 1 / 320 && !(this.k[jj] & 16)) return true; } for (let q = 0; q <= 25; q += 5) { const a = clamp(j + dir * q, 0, m - 1), b = clamp(j + dir * (q + 10), 0, m - 1), c = clamp(j + dir * (q + 20), 0, m - 1); if (this.y[b] - (this.y[a] + this.y[c]) / 2 > 1.2) return true; } return false; };
    for (let j = 0; j < m; j++) { if (!(this.k[j] & 4)) continue; this.centre[j] = 1 | (blind(j, 1) ? 2 : 0) | (blind(j, -1) ? 4 : 0); }
    // the bridge: the longest run of bridge on the stage is drawn as a bridge; anything shorter is a culvert under the road
    let run = 0, bs = -1, best2: [number, number] = [1, 0];
    for (let j = 0; j <= m; j++) { const on = j < m && this.k[j] & 2; if (on) { if (run === 0) bs = j; run++; } else { if (run * 4 > best2[1] - best2[0] && run >= 4) best2 = [this.s0 + bs * 4 - 6, this.s0 + (bs + run) * 4 + 6]; run = 0; } }
    this.bridge = best2;
    for (let j = 0; j < m; j++) { const s = this.s0 + j * 4; if ((this.k[j] & 2) && !(s > best2[0] && s < best2[1])) this.k[j] &= ~2; }
  }
  /** Index and fraction along the table for a distance s. */
  at(s: number) { const f = clamp((s - this.s0) / 4, 0, this.n - 1.0001), i = Math.floor(f); return [i, f - i] as const; }
  lerp(a: Float32Array, s: number) { const [i, f] = this.at(s); return a[i] * (1 - f) + a[i + 1] * f; }
  /** A point at distance s along the road and d to its right (metres). */
  pos(s: number, d: number): [number, number] { const [i, f] = this.at(s); const x = this.x[i] * (1 - f) + this.x[i + 1] * f, z = this.z[i] * (1 - f) + this.z[i + 1] * f, tx = this.tx[i] * (1 - f) + this.tx[i + 1] * f, tz = this.tz[i] * (1 - f) + this.tz[i + 1] * f, L = Math.hypot(tx, tz) || 1; return [x - (tz / L) * d, z + (tx / L) * d]; }
  head(s: number) { const [i, f] = this.at(s); return Math.atan2(this.tz[i] * (1 - f) + this.tz[i + 1] * f, this.tx[i] * (1 - f) + this.tx[i + 1] * f); }
  width(s: number) { return this.lerp(this.w, s); }
  kind(s: number) { return this.k[this.at(s)[0]]; }
  curv(s: number) { return this.lerp(this.kap, s); }
  height(s: number) { return this.lerp(this.y, s); }
  grade(s: number) { return (this.height(s + 6) - this.height(s - 6)) / 12; }
}

/** Point in polygon, for flat arrays of decimetres. */
function inPoly(x: number, z: number, p: number[]) { let c = false; for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) { const xi = p[i] / 10, zi = p[i + 1] / 10, xj = p[j] / 10, zj = p[j + 1] / 10; if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; }
/** Segments of a set of flat lines (decimetres), in metres. */
function segsOf(lines: number[][]) { const s: number[] = []; for (const l of lines) for (let i = 0; i + 3 < l.length; i += 2) s.push(l[i] / 10, l[i + 1] / 10, l[i + 2] / 10, l[i + 3] / 10); return Float32Array.from(s); }
/** Nearest segment, fast: a coarse grid whose cells list every segment that can be nearest to some point inside them. */
class NearField {
  C: number; cs: number; lists: Int32Array[] = []; far: Float32Array;
  constructor(public seg: Float32Array, public x0: number, public z0: number, size: number, maxR: number, C = 96) {
    this.C = C; this.cs = size / C; this.far = new Float32Array(C * C);
    const nS = seg.length / 4, diag = this.cs * Math.SQRT2;
    const dseg = (x: number, z: number, i: number) => { const ax = seg[i], az = seg[i + 1], bx = seg[i + 2] - ax, bz = seg[i + 3] - az, l2 = bx * bx + bz * bz || 1, t = clamp(((x - ax) * bx + (z - az) * bz) / l2, 0, 1); return Math.hypot(x - ax - bx * t, z - az - bz * t); };
    const tmp = new Float32Array(nS);
    for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) {
      const x = x0 + (i + 0.5) * this.cs, z = z0 + (j + 0.5) * this.cs; let m = Infinity;
      for (let k = 0; k < nS; k++) { const d = dseg(x, z, k * 4); tmp[k] = d; if (d < m) m = d; }
      this.far[j * C + i] = m;
      if (m - diag > maxR) { this.lists.push(new Int32Array(0)); continue; }
      const L: number[] = []; for (let k = 0; k < nS; k++) if (tmp[k] <= m + diag) L.push(k * 4);
      this.lists.push(Int32Array.from(L));
    }
  }
  near(x: number, z: number, r: number) {
    const i = clamp(Math.floor((x - this.x0) / this.cs), 0, this.C - 1), j = clamp(Math.floor((z - this.z0) / this.cs), 0, this.C - 1), L = this.lists[j * this.C + i], s = this.seg;
    let bi = -1, bd = r, bt = 0;
    for (let q = 0; q < L.length; q++) { const k = L[q], ax = s[k], az = s[k + 1], bx = s[k + 2] - ax, bz = s[k + 3] - az, l2 = bx * bx + bz * bz || 1, t = clamp(((x - ax) * bx + (z - az) * bz) / l2, 0, 1), d = Math.hypot(x - ax - bx * t, z - az - bz * t); if (d < bd) { bd = d; bi = k; bt = t; } }
    return { i: bi, d: bd, t: bt };
  }
}
/** Cubic B-spline over a grid with gaps: smooth ground from 25 m samples. */
function sampler(h: Float32Array, nx: number, nz: number, x0: number, z0: number, step: number) {
  const at = (i: number, j: number) => h[clamp(j, 0, nz - 1) * nx + clamp(i, 0, nx - 1)];
  const B = (t: number) => { const t2 = t * t, t3 = t2 * t; return [(1 - 3 * t + 3 * t2 - t3) / 6, (4 - 6 * t2 + 3 * t3) / 6, (1 + 3 * t + 3 * t2 - 3 * t3) / 6, t3 / 6]; };
  return (x: number, z: number) => {
    const fx = (x - x0) / step, fz = (z - z0) / step, i = Math.floor(fx), j = Math.floor(fz), bx = B(fx - i), bz = B(fz - j);
    let v = 0; for (let b = 0; b < 4; b++) for (let a = 0; a < 4; a++) v += at(i + a - 1, j + b - 1) * bx[a] * bz[b];
    return v;
  };
}

export interface Thing { k: number; x: number; z: number; y: number; a: number; b: number; c: number; d: number }
export interface Stage { raw: any; track: Track; tex: DriveTex; ground: (x: number, z: number) => number; things: Thing[]; egg?: [number, number]; blueprint?: [number, number]; cattle?: number; pad?: [number, number, number, number]; curves: [sign: number, apex: number, advisory: number][] }

const N = 1024, CELL = 6;
/** Lay one stage out: this takes a few hundred milliseconds, so the scene does it while the picture is faded out. */
export function buildStage(data: Data, idx: number, atlas?: TexImageSource): Stage {
  const raw = data.stages[idx], track = new Track(raw.road, raw.len), id = raw.id as string;
  const rand = rng(1234 + idx * 7919);
  // the box: the road and 560 m round it
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < track.n; i++) { x0 = Math.min(x0, track.x[i]); z0 = Math.min(z0, track.z[i]); x1 = Math.max(x1, track.x[i]); z1 = Math.max(z1, track.z[i]); }
  const size = Math.max(x1 - x0, z1 - z0) + 1120; const bx = (x0 + x1) / 2 - size / 2, bz = (z0 + z1) / 2 - size / 2, px = size / N, px_ = px;
  // ---- the ground: the elevation model, smoothed, with the sea bed laid under the coast
  const D = raw.dem, dh = i16(D.h), dem = new Float32Array(D.nx * D.nz), seaD = new Uint8Array(D.nx * D.nz);
  for (let i = 0; i < dh.length; i++) { const v = dh[i]; if (v === -32768) { seaD[i] = 1; dem[i] = -3; } else dem[i] = v / 10; }
  const demAt = sampler(dem, D.nx, D.nz, D.x0, D.z0, D.step);
  // Wairoa's road heights come from its own ground (the elevation tile there is a flat fill, see scripts/drive-data.mjs)
  if (id === 'wairoa') { const raw2 = Float32Array.from({ length: track.n }, (_, j) => Math.max(demAt(track.x[j], track.z[j]), 2.5)); for (let j = 0; j < track.n; j++) { let a = 0, c = 0; for (let q = -6; q <= 6; q++) { const jj = clamp(j + q, 0, track.n - 1), w = Math.exp(-(q * q) / 18); a += raw2[jj] * w; c += w; } track.y[j] = a / c; } }
  // a bridge's deck runs straight from one abutment to the other, clear of the water
  if (track.bridge[0] < track.bridge[1]) { const [ja] = track.at(track.bridge[0] - 4), [jb] = track.at(track.bridge[1] + 4), ya = track.y[ja], yb = track.y[jb]; for (let j = ja; j <= jb; j++) { const u = (j - ja) / Math.max(1, jb - ja); track.y[j] = Math.max(ya + (yb - ya) * u, 5.5) + Math.sin(u * Math.PI) * 0.6; } }
  const seaAt = (x: number, z: number) => { const i = clamp(Math.round((x - D.x0) / D.step), 0, D.nx - 1), j = clamp(Math.round((z - D.z0) / D.step), 0, D.nz - 1); return seaD[j * D.nx + i] === 1; };
  const coast = segsOf(raw.lines.coast || []), cg = new NearField(coast, bx, bz, size, 280);
  // the road's distance field
  const rs: number[] = []; for (let i = 0; i + 1 < track.n; i++) rs.push(track.x[i], track.z[i], track.x[i + 1], track.z[i + 1]);
  const rg = new NearField(Float32Array.from(rs), bx, bz, size, 170);
  // far from the road only the side and the rough distance matter: a coarse field from every fifth point
  const CN = 72, coarse = new Float32Array(CN * CN * 2);
  for (let j = 0; j < CN; j++) for (let i = 0; i < CN; i++) {
    const x = bx + ((i + 0.5) * size) / CN, z = bz + ((j + 0.5) * size) / CN; let bd = Infinity, bs = 0, bdd = 0;
    for (let q = 0; q < track.n; q += 5) { const dx = x - track.x[q], dz = z - track.z[q], d2 = dx * dx + dz * dz; if (d2 < bd) { bd = d2; bs = track.s0 + q * 4; bdd = dx * -track.tz[q] + dz * track.tx[q]; } }
    coarse[(j * CN + i) * 2] = Math.sign(bdd || 1) * Math.sqrt(bd); coarse[(j * CN + i) * 2 + 1] = bs;
  }
  const coarseAt = (x: number, z: number, c: number) => { const fi = clamp(((x - bx) / size) * CN - 0.5, 0, CN - 1.001), fj = clamp(((z - bz) / size) * CN - 0.5, 0, CN - 1.001), i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j, A = (a: number, b: number) => coarse[(b * CN + a) * 2 + c]; return A(i, j) * (1 - u) * (1 - v) + A(i + 1, j) * u * (1 - v) + A(i, j + 1) * (1 - u) * v + A(i + 1, j + 1) * u * v; };
  // what covers the ground: polygons drawn into masks
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d', { willReadFrequently: true })!;
  const layer = (polys: number[][] | undefined, blur = 0) => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, N, N); g.filter = blur ? `blur(${blur}px)` : 'none'; g.fillStyle = '#fff';
    g.setTransform(1 / px, 0, 0, 1 / px, -bx / px, -bz / px);
    for (const p of polys || []) { if (p.length < 6) continue; g.beginPath(); g.moveTo(p[0] / 10, p[1] / 10); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i] / 10, p[i + 1] / 10); g.closePath(); g.fill('evenodd'); }
    const d = g.getImageData(0, 0, N, N).data, o = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) o[i] = d[i * 4 + 3]; return o;
  };
  const strokes = (lines: number[][] | undefined, w: number, blur: number) => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, N, N); g.filter = blur ? `blur(${blur}px)` : 'none'; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
    g.setTransform(1 / px, 0, 0, 1 / px, -bx / px, -bz / px); g.lineWidth = w;
    for (const p of lines || []) { g.beginPath(); g.moveTo(p[0] / 10, p[1] / 10); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i] / 10, p[i + 1] / 10); g.stroke(); }
    const d = g.getImageData(0, 0, N, N).data, o = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) o[i] = d[i * 4 + 3]; return o;
  };
  const water = layer(raw.polys.water, 2), wood = layer(raw.polys.wood, 1.5), scrub = layer([...(raw.polys.scrub || []), ...(raw.polys.wet || [])], 1.5), sand = layer(raw.polys.sand, 2);
  const town = layer(raw.polys.town || [], 3), farm = layer(raw.polys.farm, 3), cliff = strokes(raw.lines.cliff, 16, 3);
  const railSegs = segsOf(raw.lines.rail || []), railG = new NearField(railSegs, bx, bz, size, 12);
  const road = new Float32Array(N * N * 4), mask = new Uint8Array(N * N * 4), mask2 = new Uint8Array(N * N * 4), groundBase = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = bx + (i + 0.5) * px, z = bz + (j + 0.5) * px, o = (j * N + i) * 4, k = j * N + i;
    // the road: nearest point, how far to its right, how far along
    const r = rg.near(x, z, 150);
    let d = 400, s = 0, ry = 0;
    if (r.i >= 0) {
      const sg = rg.seg, ax = sg[r.i], az = sg[r.i + 1], ex = sg[r.i + 2] - ax, ez = sg[r.i + 3] - az, seg = r.i / 4;
      s = track.s0 + (seg + r.t) * 4; const L = Math.hypot(ex, ez) || 1;
      d = (x - ax - ex * r.t) * (-ez / L) + (z - az - ez * r.t) * (ex / L);
      ry = track.height(s);
      if ((seg === 0 && r.t <= 0) || (seg >= track.n - 2 && r.t >= 1)) d = Math.sign(d || 1) * Math.max(Math.abs(d), Math.hypot(x - ax - ex * r.t, z - az - ez * r.t) + 30); // past the ends: no road
    } else { d = coarseAt(x, z, 0); d = Math.sign(d) * Math.max(Math.abs(d), 150); s = coarseAt(x, z, 1); ry = track.height(s); }
    // land or sea: the coastline where the map has one near, the elevation model's gaps where it has not
    let h = demAt(x, z), sea = false;
    const c = cg.near(x, z, 260);
    if (c.i >= 0) { const sg = cg.seg, ax = sg[c.i], az = sg[c.i + 1], ex = sg[c.i + 2] - ax, ez = sg[c.i + 3] - az; const side = (x - ax) * ez - (z - az) * ex; sea = side < 0; // land on the left of a coastline, as the map draws it (north up)
      if (sea) h = Math.min(h, -(0.35 + 0.045 * c.d) * (1 + 0.4 * hash(x * 0.01, z * 0.01))); else if (h < 0.4) h = 0.4 + c.d * 0.04;
    } else if (seaAt(x, z)) { sea = true; h = Math.min(h, -4); }
    const wa = water[k] / 255; if (wa > 0) h = h * (1 - wa) + Math.min(h, -0.9) * wa;
    h = Math.max(h, -30);
    // hummocks in the paddocks, too small for the elevation model
    const land = sstep(0.2, 3.0, h); h += ((vnoise(x / 23, z / 23) - 0.5) * 0.55 + (vnoise(x / 5.3 + 7.1, z / 5.3 + 3.3) - 0.5) * 0.12) * land;
    groundBase[k] = h;
    // the road cut and filled into it: a crowned carriageway, a shoulder, then a batter to the hillside, steeper in a cutting
    let gt = h;
    const kind = track.kind(s), w2 = track.width(s) / 2, ad = Math.abs(d);
    if (!((kind & 2) && s > track.bridge[0] && s < track.bridge[1]) && ad < 160) {
      const gravel = kind & 1 ? 1 : 0, townK = kind & 16 ? 1 : 0;
      const yr = ry + 0.05 - 0.025 * Math.min(ad, w2) * (1 - gravel * 0.5) + gravel * 0.04 * (1 - Math.min(ad / w2, 1) ** 2);
      const sh = w2 + (gravel ? 0.5 : 0.9) + townK * 1.9, e = Math.max(ad - sh, 0), dy = h - yr;
      gt = yr + (dy > 0 ? Math.min(dy, e * 1.35 + e * e * 0.03) : Math.max(dy, -(e * 0.62 + e * e * 0.012)));
      gt = gt + (h - gt) * sstep(10, 36, e);                                     // the batters meet the hillside within a few tens of metres
      if (!townK && dy > 0.1) gt -= 0.3 * Math.exp(-(((ad - sh - 1.0) / 0.8) ** 2)) * sstep(0.1, 0.6, dy);   // the water table on the high side
    }
    road[o] = d; road[o + 1] = s; road[o + 2] = h; road[o + 3] = gt;
    mask[o] = Math.max(water[k], sea ? 255 : 0); mask[o + 1] = wood[k]; mask[o + 2] = scrub[k]; mask[o + 3] = sand[k];
    // the old railway: signed distance from its centre line (so the two rails stay sharp), 0..255 for -8..8 m; 0 where there is none
    const rr = railSegs.length ? railG.near(x, z, 8) : { i: -1, d: 9, t: 0 };
    let rv = 0; if (rr.i >= 0) { const sg = railG.seg, ex = sg[rr.i + 2] - sg[rr.i], ez = sg[rr.i + 3] - sg[rr.i + 1], side = (x - sg[rr.i]) * ez - (z - sg[rr.i + 1]) * ex >= 0 ? 1 : -1; rv = clamp(Math.round(((side * rr.d) / 8 * 0.5 + 0.5) * 254) + 1, 1, 255); }
    mask2[o] = town[k]; mask2[o + 1] = farm[k]; mask2[o + 2] = cliff[k]; mask2[o + 3] = rv;
  }
  // ---- at the range: the pad's hard standing, levelled, and the road ending beside it (LC-1A, where the map puts it)
  let padAt: [number, number, number, number] | undefined;
  if (id === 'onenui') {
    const [px, pz] = toLocal(data, raw, -39.26153, 177.86515); let bs = 0, bd = Infinity;
    for (let q = 0; q < track.n; q++) { const d = Math.hypot(track.x[q] - px, track.z[q] - pz); if (d < bd) { bd = d; bs = track.s0 + q * 4; } }
    const hd = track.head(bs - 20), c = Math.cos(hd), sn = Math.sin(hd), py = track.height(bs - 30) + 0.1;
    padAt = [px, py, pz, hd]; track.len = Math.min(track.len, bs - 34);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = bx + (i + 0.5) * px_, z = bz + (j + 0.5) * px_, dx = x - px, dz = z - pz, u = dx * c + dz * sn, v = -dx * sn + dz * c;
      const e = Math.max(Math.max(-u - 100, u - 52), Math.max(-v - 50, v - 34)); if (e > 16) continue;
      const w = 1 - sstep(0, 16, e), o = (j * N + i) * 4; road[o + 3] = road[o + 3] * (1 - w) + py * w; road[o + 2] = road[o + 2] * (1 - w) + py * w;
    }
  }
  // ---- the ground at a point, exactly as the renderer has it: for standing things on, and for the truck's wheels
  const tex = (a: Float32Array | Uint8Array, x: number, z: number, ch: number, stride = 4) => { const fi = clamp((x - bx) / px - 0.5, 0, N - 1.001), fj = clamp((z - bz) / px - 0.5, 0, N - 1.001), i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j; const A = (ii: number, jj: number) => a[(jj * N + ii) * stride + ch]; return A(i, j) * (1 - u) * (1 - v) + A(i + 1, j) * u * (1 - v) + A(i, j + 1) * (1 - u) * v + A(i + 1, j + 1) * u * v; };
  const ground = (x: number, z: number) => tex(road, x, z, 3);
  const maskAt = (x: number, z: number, ch: number) => tex(mask, x, z, ch) / 255, mask2At = (x: number, z: number, ch: number) => tex(mask2, x, z, ch) / 255;
  const nearRoad = (x: number, z: number) => Math.abs(tex(road, x, z, 0));

  // ---- the things that stand by the road
  const things: Thing[] = [];
  const add = (t: Thing) => { things.push(t); return t; };
  const isTown = id === 'wairoa' || id === 'mahia';
  // buildings, from the map
  for (const b of raw.bld) {
    let [cx, cz, hx, hz, a, kind, lv] = [b[0] / 10, b[1] / 10, b[2] / 10, b[3] / 10, b[4] / 1000, b[5], b[6]];
    const dr = nearRoad(cx, cz), s = tex(road, cx, cz, 1), w2 = track.width(s) / 2;
    if (dr < Math.max(hx, hz) * 0.7 + w2 + 1.2) continue;                       // the map's outline overlaps the road: it is drawn a little out
    if (maskAt(cx, cz, 0) > 0.5 || groundBase[clamp(Math.floor((cz - bz) / px), 0, N - 1) * N + clamp(Math.floor((cx - bx) / px), 0, N - 1)] < 0.3) continue;
    const area = hx * hz * 4;
    let k = kind === 5 ? 4 : kind === 3 ? 3 : kind === 2 || area > 420 || area < 22 ? 2 : 1;
    if (id === 'wairoa' && kind === 0 && dr < 34 && area > 110) k = 3;
    const y = ground(cx, cz) - 0.15;
    if (k === 3) {                                                             // turn it so its verandah faces the road
      const [i] = track.at(s), dx = track.x[i] - cx, dz = track.z[i] - cz, L = Math.hypot(dx, dz) || 1, want = [dx / L, dz / L];
      let best = a, bd = -2, bh = [hx, hz];
      for (let q = 0; q < 4; q++) { const aa = a + (q * Math.PI) / 2, zx = -Math.sin(aa), zz = Math.cos(aa), dt = zx * want[0] + zz * want[1]; if (dt > bd) { bd = dt; best = aa; bh = q % 2 ? [hz, hx] : [hx, hz]; } }
      a = best; [hx, hz] = bh as [number, number];
    }
    const wall = k === 1 ? (lv >= 2 ? 5.3 : 2.6 + rand() * 0.3) : lv;
    add({ k, x: cx, z: cz, y, a, b: hx, c: hz, d: k === 4 ? 0 : wall });
    if (k === 1 && !isTown && rand() < 0.6) { const ox = (hx + 1.8) * (rand() < 0.5 ? -1 : 1), oz = (hz - 1.2) * (rand() < 0.5 ? -1 : 1), tx = cx + ox * Math.cos(a) - oz * Math.sin(a), tz = cz + ox * Math.sin(a) + oz * Math.cos(a); add({ k: 12, x: tx, z: tz, y: ground(tx, tz) - 0.1, a: 0, b: 0, c: 0, d: 0 }); }
  }
  // trees: the map's own (Wairoa's streets and riverbank), then bush, scrub and shelter where the map says there is some
  const tree = (x: number, z: number, sp: number, hgt: number, cr: number) => add({ k: 6, x, z, y: ground(x, z) - 0.3, a: rand() * 6.28, b: hgt, c: cr, d: sp });
  for (const t of raw.trees) {
    const x = t[0] / 10, z = t[1] / 10; if (nearRoad(x, z) < track.width(tex(road, x, z, 1)) / 2 + 1.5) continue;
    const r = rand(), riverside = maskAt(x, z, 0) > 0.05 || nearRoad(x, z) < 22;
    if (id === 'wairoa' && riverside && r < 0.4) tree(x, z, 2, 22 + rand() * 9, 4.5 + rand() * 1.5);   // Norfolk Island pines, the town's landmark by the river
    else if (id === 'wairoa' && r < 0.25 && nearRoad(x, z) < 14) tree(x, z, 5, 3.5 + rand() * 2, 2.2);   // young palms in the planting along the highway
    else tree(x, z, 3, 8 + rand() * 8, 4 + rand() * 3);
  }
  const R2 = 470;
  for (let zz = bz; zz < bz + size; zz += 6.5) for (let xx = bx; xx < bx + size; xx += 6.5) {
    const x = xx + (hash(xx, zz) - 0.5) * 5.5, z = zz + (hash(zz, xx) - 0.5) * 5.5, dr = nearRoad(x, z);
    if (dr > R2) continue;
    const w2 = track.width(tex(road, x, z, 1)) / 2; if (dr < w2 + 2.2) continue;
    const wo = maskAt(x, z, 1), sc = maskAt(x, z, 2), gb = ground(x, z);
    if (maskAt(x, z, 0) > 0.3 || gb < 0.6) continue;
    const h = hash(x * 3.1, z * 1.7);
    if (wo > 0.5 && h < 0.85) { const r = rand(); r < 0.45 ? tree(x, z, 0, 18 + rand() * 12, 3.5 + rand() * 2) : r < 0.65 ? tree(x, z, 1, 12 + rand() * 6, 5 + rand() * 2.5) : tree(x, z, 3, 9 + rand() * 7, 3.5 + rand() * 2.5); continue; }
    if (sc > 0.5 && h < 0.94) {                                                   // scrub: kānuka in a continuous canopy of overlapping crowns, gorse in lower mounds
      const r = rand(), k = vnoise(x / 40, z / 40), ox = (rand() - 0.5) * 3.4, oz = (rand() - 0.5) * 3.4;
      if (r < 0.22 + 0.3 * k) tree(x + ox, z + oz, 7, 1.6 + rand() * 1.2, 1.7 + rand() * 0.9); else tree(x + ox, z + oz, 6, 3.4 + rand() * 4.2 * (0.6 + 0.6 * k), 2.6 + rand() * 1.4);
      continue;
    }
    // pasture: now and then a cabbage tree, and on the coast flax and toetoe on the banks
    const fm = mask2At(x, z, 1), tn = mask2At(x, z, 0);
    if (tn > 0.5 && !isTown) continue;
    if (tn > 0.5 && h < 0.08) { tree(x, z, rand() < 0.5 ? 3 : 4, 6 + rand() * 6, 3 + rand() * 2); continue; }
    const wetish = vnoise(x / 90, z / 90);                                       // cabbage trees stand in the damper hollows, now and then
    if (h < 0.0011 * (0.3 + 1.7 * wetish * wetish) && dr > w2 + 6) { tree(x, z, 4, 5 + rand() * 4, 0); continue; }
    if (h > 0.9992 && dr > 30) { const r = rand(), n = r < 0.5 ? 3 : 1; for (let q = 0; q < n; q++) tree(x + (rand() - 0.5) * 9, z + (rand() - 0.5) * 9, r < 0.6 ? 1 : 0, 12 + rand() * 8, 5 + rand() * 2); continue; }   // a macrocarpa or a few pines for shelter
  }
  // the verges: flax and toetoe on the banks, more of them by the sea; driftwood on the beaches
  const stepS = 3;
  const sStart = track.s0 + 8, sEnd = track.s0 + (track.n - 1) * 4 - 8;
  const coastal = id === 'blowhole' || id === 'eastcoast' || id === 'mahia';
  for (let s = sStart; s < sEnd; s += stepS) for (const side of [-1, 1]) {
    const w2 = track.width(s) / 2, kind = track.kind(s); if (kind & 16) continue;
    const h = hash(s * 0.37 + side, side * 3.3 + idx);
    const dd = w2 + 2.2 + hash(s, side) * 7.5, [x, z] = track.pos(s, side * dd), gb = ground(x, z), ry = track.height(s);
    if (maskAt(x, z, 0) > 0.2 || gb < 0.3) continue;
    const bank = Math.abs(gb - ry) > 0.8 || maskAt(x, z, 2) > 0.3;
    if (h < (coastal ? 0.16 : 0.05) * (bank ? 1.6 : 1)) add({ k: hash(s, 7) < 0.55 ? 10 : 11, x, z, y: gb - 0.15, a: hash(s, 3) * 6.28, b: 2.3 + hash(s, 5) * 1.2, c: 0, d: 0 });
  }
  if (coastal) for (let i = 0; i < 260; i++) {
    const x = bx + rand() * size, z = bz + rand() * size, g0 = ground(x, z);
    if (maskAt(x, z, 3) < 0.4 && !(g0 > 0.5 && g0 < 2.2 && maskAt(x + 6, z, 0) + maskAt(x - 6, z, 0) + maskAt(x, z + 6, 0) + maskAt(x, z - 6, 0) > 0.5)) continue;
    if (nearRoad(x, z) > 500 || g0 < 0.45 || g0 > 3.5) continue;
    add({ k: 13, x, z, y: g0 - 0.12, a: rand() * 6.28, b: 1.2 + rand() * 3.5, c: rand() * 0.3, d: 0 });
  }
  // power poles and their wires, from the map
  for (const p of raw.poles) { const x = p[0] / 10, z = p[1] / 10; if (nearRoad(x, z) < track.width(tex(road, x, z, 1)) / 2 + 0.8) continue; add({ k: 5, x, z, y: ground(x, z) - 0.4, a: hash(x, z) * 3.14, b: 9.5 + hash(z, x) * 1.5, c: 0, d: 0 }); }
  for (const l of raw.lines.power || []) for (let i = 0; i + 3 < l.length; i += 2) {
    const ax = l[i] / 10, az = l[i + 1] / 10, ex = l[i + 2] / 10, ez = l[i + 3] / 10, L = Math.hypot(ex - ax, ez - az); if (L < 8 || L > 140) continue;
    if (Math.min(nearRoad(ax, az), nearRoad(ex, ez)) > 450) continue;
    add({ k: 20, x: ax, z: az, y: ground(ax, az) + 9.3, a: ex, b: ez, c: ground(ex, ez) + 9.3, d: 0.3 + L * 0.011 });
  }
  // fences along the paddocks, with marker posts at the seal's edge on the open road
  const fenced = id === 'sh2' || id === 'blowhole' || id === 'eastcoast' || id === 'mahia';
  for (const side of [-1, 1]) {
    let prev: [number, number, number] | null = null, gap = 0;
    for (let s = sStart; s < sEnd; s += 5) {
      const w2 = track.width(s) / 2, kind = track.kind(s), off = w2 + 3.4 + 0.6 * Math.sin(s * 0.013 + side);
      const [x, z] = track.pos(s, side * off), gb = ground(x, z), ry = track.height(s);
      const ok = fenced && !(kind & 16) && !(kind & 2) && gb > 0.5 && maskAt(x, z, 0) < 0.1 && maskAt(x, z, 3) < 0.3 && maskAt(x, z, 1) < 0.4 && mask2At(x, z, 0) < 0.4 && Math.abs(gb - ry) < 2.6 && maskAt(x, z, 2) < 0.5 && hash(Math.floor(s / 180), side + idx) > 0.18;
      if (gap > 0) gap--;
      if (ok && gap === 0 && hash(s, side * 9) < 0.012) gap = 2;                 // a gateway
      if (ok && gap === 0) { add({ k: 8, x, z, y: gb - 0.25, a: 0, b: 0, c: 0, d: 0 }); if (prev) add({ k: 21, x: prev[0], z: prev[1], y: prev[2], a: x, b: z, c: gb - 0.2, d: 6 }); prev = [x, z, gb - 0.2]; }
      else prev = null;
    }
  }
  for (const l of raw.lines.fence || []) {                                      // the station's own fences
    const P: number[] = []; for (let i = 0; i + 3 < l.length; i += 2) { const ax = l[i] / 10, az = l[i + 1] / 10, ex = l[i + 2] / 10, ez = l[i + 3] / 10, L = Math.hypot(ex - ax, ez - az); for (let u = 0; u < L; u += 5) P.push(ax + ((ex - ax) * u) / L, az + ((ez - az) * u) / L); }
    let prev: [number, number, number] | null = null;
    for (let i = 0; i < P.length; i += 2) { const x = P[i], z = P[i + 1]; if (nearRoad(x, z) > 480 || nearRoad(x, z) < track.width(tex(road, x, z, 1)) / 2 + 1.0) { prev = null; continue; } const gb = ground(x, z); add({ k: 8, x, z, y: gb - 0.25, a: 0, b: 0, c: 0, d: 0 }); if (prev) add({ k: 21, x: prev[0], z: prev[1], y: prev[2], a: x, b: z, c: gb - 0.2, d: 6 }); prev = [x, z, gb - 0.2]; }
  }
  if (id !== 'onenui' && id !== 'wairoa') for (let s = sStart; s < sEnd; ) {        // edge marker posts: white reflectors on the left of the road, yellow on the right
    const tight = Math.abs(track.curv(s)) > 1 / 280, w2 = track.width(s) / 2;
    for (const side of [-1, 1]) { const [x, z] = track.pos(s + (side > 0 ? 0 : 8), side * (w2 + 1.05)); add({ k: 7, x, z, y: ground(x, z) - 0.2, a: track.head(s) + Math.PI / 2, b: side > 0 ? 1 : 0, c: 0, d: 0 }); }
    s += tight ? 25 : 50;
  }
  // signs: bends ahead, the town limits, one-lane bridges, the station's gate
  const curves: [number, number, number][] = [];
  for (let s = sStart + 60; s < sEnd - 20; s += 4) {
    const k0 = track.curv(s), kind = track.kind(s); if (kind & 16) continue;
    let peak = 0, at = s; for (let q = 0; q < 120; q += 4) { const kk = track.curv(s + q); if (Math.abs(kk) > Math.abs(peak)) { peak = kk; at = s + q; } }
    if (Math.abs(peak) < 1 / 160 || Math.abs(k0) > 1 / 400) continue;
    const adv = clamp(Math.round(Math.sqrt((0.22 * 9.81) / Math.abs(peak)) * 3.6 / 10) * 10 - 5, 25, 85), right = peak > 0;
    const w2 = track.width(s) / 2, [x, z] = track.pos(s, -(w2 + 1.6));
    add({ k: 9, x, z, y: ground(x, z) - 0.2, a: track.head(s) + Math.PI / 2, b: 0.42, c: 0.42, d: 64 + (right ? 1 : 0) });
    const [x2, z2] = track.pos(s + 0.3, -(w2 + 1.62)); add({ k: 9, x: x2, z: z2, y: ground(x2, z2) - 0.2 - 0.62, a: track.head(s) + Math.PI / 2, b: 0.3, c: 0.17, d: 8 + (adv - 25) / 10 });
    // chevron boards round the outside of the bend
    for (let q = -18; q <= 18; q += 18) { const ss = at + q, ww = track.width(ss) / 2, side = right ? -1 : 1, [cx, cz] = track.pos(ss, side * (ww + 1.9)); add({ k: 9, x: cx, z: cz, y: ground(cx, cz) - 0.6, a: track.head(ss) + Math.PI / 2, b: 0.6, c: 0.3, d: right ? 3 : 2 }); }
    curves.push([s, at, adv]);
    s += 260;
  }
  for (let s = sStart + 4; s < sEnd; s += 4) if ((track.kind(s) & 32) && !(track.kind(s - 4) & 32) && !(track.kind(s) & 16)) { const [x, z] = track.pos(s, -(track.width(s) / 2 + 1.7)); add({ k: 9, x, z, y: ground(x, z) - 0.2, a: track.head(s) + Math.PI / 2, b: 0.32, c: 0.32, d: 4 }); }
  if (track.bridge[0] < track.bridge[1] && track.width((track.bridge[0] + track.bridge[1]) / 2) < 5) { const s = track.bridge[0] - 110; if (s > sStart) { const [x, z] = track.pos(s, -(track.width(s) / 2 + 1.7)); add({ k: 9, x, z, y: ground(x, z) - 0.2, a: track.head(s) + Math.PI / 2, b: 0.6, c: 0.45, d: 7 }); } }
  let cattle: number | undefined, egg: [number, number] | undefined, blueprint: [number, number] | undefined, pad: [number, number, number, number] | undefined;
  if (id === 'onenui') {
    cattle = 110; const w2 = track.width(cattle) / 2, [x, z] = track.pos(cattle, 0);
    add({ k: 15, x, z, y: track.height(cattle) + 0.02, a: track.head(cattle) + Math.PI / 2, b: w2 + 0.4, c: 0, d: 0 });
    for (const side of [-1, 1]) { const [gx, gz] = track.pos(cattle + 3, side * (w2 + 1.3)); add({ k: 14, x: gx, z: gz, y: ground(gx, gz) - 0.15, a: track.head(cattle) + (side > 0 ? 0 : Math.PI), b: 0, c: 0, d: 0 }); }
    const [sx, sz] = track.pos(cattle - 14, -(w2 + 2.4)); add({ k: 9, x: sx, z: sz, y: ground(sx, sz) - 0.2, a: track.head(cattle) + Math.PI / 2, b: 0.9, c: 0.45, d: 6 });
    // the pad, where the map puts LC-1A, and the road's end beside it
    pad = padAt;
  }
  if (id === 'sh2') { const s = 520, [x, z] = track.pos(s, 7.6); egg = [x, z]; add({ k: 17, x, z, y: ground(x, z) + 1.1, a: track.head(s) - Math.PI / 2, b: 0, c: 0, d: 0 }); add({ k: 8, x, z, y: ground(x, z) - 0.25, a: 0, b: 0, c: 0, d: 0 }); }
  if (id === 'mahia') { const s = 430, w2 = track.width(s) / 2, [x, z] = track.pos(s, -(w2 + 0.45)); blueprint = [s, -(w2 + 0.45)]; add({ k: 18, x, z, y: ground(x, z) + 0.02, a: track.head(s) + 0.4, b: 0, c: 0, d: 0 }); }

  if (padAt) { const [px, , pz, hd] = padAt, c = Math.cos(hd), sn = Math.sin(hd); for (let i = things.length - 1; i >= 0; i--) { const t = things[i], dx = t.x - px, dz = t.z - pz, u = dx * c + dz * sn, v = -dx * sn + dz * c; if (u > -110 && u < 60 && v > -58 && v < 42 && t.k !== 9 && t.k !== 15 && t.k !== 14) things.splice(i, 1); } }   // the hard standing is clear
  // ---- what stands, as heights over the ground (lowest leaf or eave in red, inverted; top in green; solid in blue), for
  // shadows and for the shade under trees: a coarse picture of the things, which the renderer marches like the hills
  g.setTransform(1, 0, 0, 1, 0, 0); g.filter = 'none'; g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
  g.globalCompositeOperation = 'lighten'; g.setTransform(1 / px, 0, 0, 1 / px, -bx / px, -bz / px);
  const col = (bot: number, top: number, solid: number) => `rgb(${255 - clamp(Math.round(bot / 0.25), 0, 255)},${clamp(Math.round(top / 0.25), 0, 255)},${solid})`;
  for (const t of things) {
    if (t.k <= 4) {
      const top = t.k === 4 ? 12.8 : t.k === 3 ? 3.6 * Math.max(1, t.d) + 0.7 : t.k === 2 ? 3.2 + Math.min(t.b, t.c) * 0.22 : t.d + Math.min(t.b, t.c) * 0.42 + 0.3;
      g.save(); g.translate(t.x, t.z); g.rotate(t.a); g.fillStyle = col(0, top, 255);
      if (t.k === 4) { g.beginPath(); g.arc(0, 0, 2.2, 0, 7); g.fill(); } else g.fillRect(-t.b - 0.3, -t.c - 0.3, 2 * t.b + 0.6, 2 * t.c + 0.6);
      if (t.k === 3) { g.fillStyle = col(3.1, 3.4, 255); g.fillRect(-t.b, t.c, 2 * t.b, 2.9); }
      g.restore();
    } else if (t.k === 6) {
      const sp = t.d, h = t.b, r = sp === 4 ? 1.3 : sp === 5 ? t.c * 0.8 : t.c * 0.88;
      const bot = h * ([0.45, 0.1, 0.2, 0.25, 0.75, 0.8, 0.1, 0.1][sp] ?? 0.2);
      g.fillStyle = col(bot, h, sp >= 6 ? 210 : sp === 4 || sp === 5 ? 120 : 190); g.beginPath(); g.arc(t.x, t.z, r, 0, 7); g.fill();
    } else if (t.k === 10 || t.k === 11) { g.fillStyle = col(0, t.k === 10 ? t.b : 1.8, 150); g.beginPath(); g.arc(t.x, t.z, 0.9, 0, 7); g.fill(); }
    else if (t.k === 12) { g.fillStyle = col(0, 2.3, 255); g.beginPath(); g.arc(t.x, t.z, 1.6, 0, 7); g.fill(); }
  }
  g.globalCompositeOperation = 'source-over';
  const od = g.getImageData(0, 0, N, N).data;
  g.setTransform(1, 0, 0, 1, 0, 0); g.filter = 'blur(3px)'; g.drawImage(cv, 0, 0); g.filter = 'none';
  const ob = g.getImageData(0, 0, N, N).data, occ = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) { occ[i * 4] = od[i * 4]; occ[i * 4 + 1] = od[i * 4 + 1]; occ[i * 4 + 2] = od[i * 4 + 2]; occ[i * 4 + 3] = ob[i * 4 + 1]; }
  let hmax = 0; for (let i = 0; i < N * N; i++) hmax = Math.max(hmax, road[i * 4 + 3] + od[i * 4 + 1] * 0.25);
  // ---- the grid: every cell lists what may stand in it
  const cells = Math.ceil(size / CELL), grid = new Float32Array(cells * cells * 8), fill = new Uint8Array(cells * cells);
  let dropped = 0;
  const put = (ci: number, cj: number, id1: number) => { if (ci < 0 || cj < 0 || ci >= cells || cj >= cells) return; const c = cj * cells + ci; if (fill[c] >= 8) { dropped++; return; } const slot = fill[c]++; const k = slot < 4 ? (cj * cells * 2 + ci * 2) * 4 + slot : (cj * cells * 2 + ci * 2 + 1) * 4 + slot - 4; grid[k] = id1; };
  const bound = (t: Thing) => t.k <= 3 ? Math.hypot(t.b, t.c) + 1.2 : t.k === 4 ? 2.6 : t.k === 5 ? 1.4 : t.k === 6 ? Math.max(t.c, t.d === 4 ? 2.0 : 1.0) + 0.4 : t.k === 9 ? Math.max(t.b, 0.5) + 0.2 : t.k === 10 || t.k === 11 ? 1.4 : t.k === 13 ? t.b + 0.4 : t.k === 15 ? t.b + 0.6 : t.k === 14 ? 4.2 : 0.4;
  // the big things first, so a full cell drops a post rather than a house
  const order = things.map((t, i) => i).sort((a, b) => (things[b].k === 20 || things[b].k === 21 ? -1 : bound(things[b])) - (things[a].k === 20 || things[a].k === 21 ? -1 : bound(things[a])));
  for (const i of order) {
    const t = things[i];
    if (t.k === 20 || t.k === 21) { const L = Math.hypot(t.a - t.x, t.b - t.z), n = Math.ceil(L / 2) + 1, w = t.k === 20 ? 1.0 : 0.2; const seen = new Set<number>(); for (let q = 0; q <= n; q++) { const u = q / n, x = t.x + (t.a - t.x) * u, z = t.z + (t.b - t.z) * u; for (const [ox, oz] of [[-w, -w], [w, -w], [-w, w], [w, w]]) { const ci = Math.floor((x + ox - bx) / CELL), cj = Math.floor((z + oz - bz) / CELL), key = cj * cells + ci; if (!seen.has(key)) { seen.add(key); put(ci, cj, i + 1); } } } continue; }
    const r = bound(t), a0 = Math.floor((t.x - r - bx) / CELL), a1 = Math.floor((t.x + r - bx) / CELL), b0 = Math.floor((t.z - r - bz) / CELL), b1 = Math.floor((t.z + r - bz) / CELL);
    for (let cj = b0; cj <= b1; cj++) for (let ci = a0; ci <= a1; ci++) put(ci, cj, i + 1);
  }
  if (dropped) console.info(`drive ${id}: ${dropped} cell entries dropped (cells full)`);
  const rows = Math.max(1, Math.ceil(things.length / 2048)), objs = new Float32Array(4096 * rows * 4);
  things.forEach((t, i) => { const o = ((Math.floor(i / 2048) * 4096) + (i % 2048) * 2) * 4; objs.set([t.x, t.z, t.y, t.k, t.a, t.b, t.c, t.d], o); });
  // ---- the road's table
  const prof = new Float32Array(track.n * 4); for (let j = 0; j < track.n; j++) prof.set([track.w[j], track.k[j], track.centre[j], track.y[j]], j * 4);
  // ---- the region: the far hills and coasts
  const RG = data.region, rh = i16(RG.h), reg = new Float32Array(RG.nx * RG.nz); for (let i = 0; i < rh.length; i++) reg[i] = rh[i] === -32768 ? -12 : rh[i] / 10;
  const ox = raw.o[0], oz = raw.o[1];
  const texs: DriveTex = {
    road, mask, mask2, occ, n: N, prof, hmax: Math.max(hmax, 650), rows: track.n, grid, cells, objs, objRows: rows, region: { h: reg, nx: RG.nx, nz: RG.nz }, atlas,
    box: [bx, bz, 1 / size, size], profU: [track.s0 - 2, 1 / (track.n * 4), track.n, track.len], gridU: [bx, bz, CELL, cells],
    reg: [RG.x0 - ox, RG.z0 - oz, 1 / (RG.nx * RG.step), 1 / (RG.nz * RG.step)],
  };
  return { raw, track, tex: texs, ground, things, egg, blueprint, cattle, pad, curves };
}
/** Latitude and longitude to the stage's metres (the same projection as scripts/drive-data.mjs). */
export function toLocal(data: Data, raw: any, lat: number, lon: number): [number, number] {
  const R = 6371000, RAD = Math.PI / 180, [la0, lo0] = data.origin;
  return [(lon - lo0) * RAD * R * Math.cos(la0 * RAD) - raw.o[0], -(lat - la0) * RAD * R - raw.o[1]];
}

/** The faces of the road signs, drawn once: eight across, four down, 128 px each. */
export function signAtlas(): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d')!;
  const cell = (i: number, fn: (x: CanvasRenderingContext2D) => void) => { g.save(); g.translate((i % 8) * 128, Math.floor(i / 8) * 128); fn(g); g.restore(); };
  const Y = '#f2c200', K = '#111';
  const diamond = (x: CanvasRenderingContext2D, fn: () => void) => { x.fillStyle = '#ddd'; x.fillRect(0, 0, 128, 128); x.fillStyle = Y; x.fillRect(5, 5, 118, 118); x.strokeStyle = K; x.lineWidth = 5; x.strokeRect(10, 10, 108, 108); x.save(); x.translate(64, 64); x.rotate(-Math.PI / 4); fn(); x.restore(); };
  // 0, 1: a bend ahead (drawn upright: the board is turned 45° on its post); the arrow turns the way the road does
  for (const [i, dir] of [[0, -1], [1, 1]] as const) cell(i, (x) => diamond(x, () => { x.strokeStyle = K; x.lineWidth = 11; x.lineCap = 'butt'; x.beginPath(); x.moveTo(0, 34); x.lineTo(0, -2); x.quadraticCurveTo(0, -20, dir * 20, -24); x.stroke(); x.fillStyle = K; x.beginPath(); x.moveTo(dir * 36, -26); x.lineTo(dir * 16, -40); x.lineTo(dir * 16, -10); x.fill(); }));
  // 2, 3: chevron boards
  // 2, 3: a chevron board (W20-1): four black chevrons on yellow, pointing the way the road turns; the board is twice as wide as it is tall
  for (const [i, dir] of [[2, -1], [3, 1]] as const) cell(i, (x) => { x.fillStyle = Y; x.fillRect(0, 0, 128, 128); x.strokeStyle = K; x.lineWidth = 3; x.strokeRect(2, 2, 124, 124); x.fillStyle = K; for (let c = 0; c < 4; c++) { const cx = 16 + c * 32, w = 9, t = 7; x.beginPath(); x.moveTo(cx - dir * w, 16); x.lineTo(cx + dir * w, 64); x.lineTo(cx - dir * w, 112); x.lineTo(cx - dir * w + dir * t, 112); x.lineTo(cx + dir * w + dir * t, 64); x.lineTo(cx - dir * w + dir * t, 16); x.fill(); } });
  // 4: 50 km/h
  cell(4, (x) => { x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.strokeStyle = '#c8102e'; x.lineWidth = 13; x.beginPath(); x.arc(64, 64, 54, 0, 7); x.stroke(); x.fillStyle = K; x.font = 'bold 52px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('50', 64, 68); });
  // 6: the station's gate (two cells' worth of text on one board)
  cell(6, (x) => { x.fillStyle = '#f4f1e8'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#1d3b2a'; x.lineWidth = 5; x.strokeRect(5, 5, 118, 118); x.fillStyle = '#1d3b2a'; x.textAlign = 'center'; x.font = 'bold 22px Arial, sans-serif'; x.fillText('ONENUI', 64, 52); x.font = 'bold 15px Arial, sans-serif'; x.fillText('STATION', 64, 72); x.font = '11px Arial, sans-serif'; x.fillText('TAWAPATA SOUTH', 64, 96); });
  // 7: a one-lane bridge ahead, black on yellow
  cell(7, (x) => { x.fillStyle = Y; x.fillRect(0, 0, 128, 128); x.strokeStyle = K; x.lineWidth = 5; x.strokeRect(5, 5, 118, 118); x.fillStyle = K; x.textAlign = 'center'; x.font = 'bold 30px Arial, sans-serif'; x.fillText('ONE', 64, 42); x.fillText('LANE', 64, 76); x.fillText('BRIDGE', 64, 110); });
  // 8..14: the speed a bend should be taken at, on a plate under its sign
  for (let i = 0; i < 7; i++) cell(8 + i, (x) => { x.fillStyle = Y; x.fillRect(0, 0, 128, 128); x.strokeStyle = K; x.lineWidth = 6; x.strokeRect(6, 6, 116, 116); x.fillStyle = K; x.font = 'bold 76px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(25 + i * 10), 64, 70); });
  return c;
}
