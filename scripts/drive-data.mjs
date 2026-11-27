// Builds src/drive/stages.json, the real road from Wairoa to Launch Complex 1 for the Road to Māhia drive (spec §10.23).
//
// Sources, fetched once into a cache folder and then read from it:
//   - the road, buildings, trees, power poles, water, bush, beaches, cliffs, the coastline and the old railway:
//     OpenStreetMap, © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright), through the
//     Overpass API. The data this script writes is a derived database and is under the ODbL too (see src/drive/README.md).
//   - the ground's height: the LINZ NZ 8 m Digital Elevation Model (2012), CC BY 4.0, through the OpenTopoData API.
//
// Usage: node scripts/drive-data.mjs [--cache <folder>]   (default cache: .drive-cache, which git ignores)
// With a full cache nothing is fetched. Fetching respects the public APIs' limits (one request a second), and takes ~10 min.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const CACHE = args.includes('--cache') ? args[args.indexOf('--cache') + 1] : '.drive-cache';
const OUT = 'src/drive/stages.json';
fs.mkdirSync(CACHE, { recursive: true });
const UA = { 'User-Agent': 'carbon2orbit-drive-data (open-source fan game)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The stretches of road that are driven, by kilometre from the start at Wairoa's old lighthouse. */
const STAGES = [
  { id: 'wairoa', name: 'Wairoa', way: 'State Highway 2 · Wairoa Bridge', km: [0.0, 1.1], dem: 'srtm30m' }, // the LINZ tile over Wairoa is a flat fill at 20 m
  { id: 'sh2', name: 'Tāhaenui', way: 'State Highway 2', km: [25.8, 26.65] },
  { id: 'blowhole', name: 'The Blowhole', way: 'Nūhaka–Ōpoutama Road', km: [38.3, 39.2] },
  { id: 'mahia', name: 'Māhia Beach', way: 'Ormond Drive · Mahia East Coast Road', km: [46.8, 47.75] },
  { id: 'eastcoast', name: 'The east coast', way: 'Mahia East Coast Road', km: [52.7, 53.55] },
  { id: 'onenui', name: 'Onenui Station', way: 'The farm road to the pad · Onenui Station', km: [82.4, 83.4] },
];
const START = [-39.03348, 177.42215], END = [-39.2615, 177.8652]; // Marine Parade, 300 m east of the lighthouse; the pad
const ORIGIN = [-39.03278, 177.41876];                              // the old Portland Island lighthouse, Wairoa
const R = 6371000, RAD = Math.PI / 180, COS0 = Math.cos(ORIGIN[0] * RAD);
const X = (lat, lon) => [(lon - ORIGIN[1]) * RAD * R * COS0, -(lat - ORIGIN[0]) * RAD * R]; // metres east, metres south

// ------------------------------------------------------------------ fetching, cached
async function cached(name, fn) {
  const f = path.join(CACHE, name);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  const v = await fn(); fs.writeFileSync(f, JSON.stringify(v)); return v;
}
async function overpass(q) {
  for (let i = 0; i < 8; i++) {
    try {
      const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q) });
      if (r.ok) return (await r.json()).elements;
    } catch { /* retry */ }
    await sleep(8000 * (i + 1));
  }
  throw new Error('Overpass would not answer');
}
async function elevations(pts, dataset = 'nzdem8m') {
  const out = [];
  for (let i = 0; i < pts.length; i += 100) {
    const url = `https://api.opentopodata.org/v1/${dataset}?locations=` + pts.slice(i, i + 100).map(([a, b]) => `${a.toFixed(6)},${b.toFixed(6)}`).join('|');
    for (let k = 0; ; k++) {
      try { const r = await fetch(url, { headers: UA }); if (r.ok) { out.push(...(await r.json()).results.map((x) => x.elevation)); break; } } catch { /* retry */ }
      if (k > 6) throw new Error('OpenTopoData would not answer'); await sleep(3000);
    }
    await sleep(1050);
  }
  return out;
}

// ------------------------------------------------------------------ the route: a shortest path over the roads that lead there
const dist = (a, b) => { const la = (a[0] + b[0]) / 2 * RAD; return R * Math.hypot((b[0] - a[0]) * RAD, (b[1] - a[1]) * RAD * Math.cos(la)); };
async function route() {
  const roads = await cached('roads.json', () => overpass('[out:json][timeout:90];(way["highway"]["name"~"Nuhaka|Nūhaka|Ormond|Mahia East Coast"](-39.35,177.3,-38.95,178.05);way["highway"~"trunk|primary|tertiary"](-39.075,177.40,-39.00,177.86);way["highway"](-39.268,177.855,-39.228,177.885););out geom tags;'));
  const ways = roads.filter((e) => e.type === 'way' && e.geometry && e.tags?.highway && !['footway', 'steps', 'path'].includes(e.tags.highway));
  const key = (p) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`, pt = (k) => k.split(',').map(Number);
  const G = new Map(), add = (a, b, w, id) => { if (!G.has(a)) G.set(a, []); G.get(a).push([b, w, id]); };
  for (const w of ways) for (let i = 0; i + 1 < w.geometry.length; i++) { const a = key(w.geometry[i]), b = key(w.geometry[i + 1]), d = dist(pt(a), pt(b)); add(a, b, d, w.id); add(b, a, d, w.id); }
  const ends = ways.flatMap((w) => [key(w.geometry[0]), key(w.geometry.at(-1))]);
  for (const a of ends) for (const b of ends) if (a !== b && dist(pt(a), pt(b)) < 70) { add(a, b, dist(pt(a), pt(b)) * 1.5, 0); add(b, a, dist(pt(a), pt(b)) * 1.5, 0); } // short bridges the map leaves out
  const near = (p) => [...G.keys()].reduce((m, k) => (dist(pt(k), p) < dist(pt(m), p) ? k : m));
  const s = near(START), t = near(END), D = new Map([[s, 0]]), P = new Map(), q = [[0, s]];
  while (q.length) {
    q.sort((a, b) => a[0] - b[0]); const [d, u] = q.shift(); if (u === t) break; if (d > D.get(u)) continue;
    for (const [v, w, id] of G.get(u)) if (d + w < (D.get(v) ?? Infinity)) { D.set(v, d + w); P.set(v, [u, id]); q.push([d + w, v]); }
  }
  const nodes = [t], ids = []; while (nodes.at(-1) !== s) { const [u, id] = P.get(nodes.at(-1)); nodes.push(u); ids.push(id); }
  nodes.reverse(); ids.reverse();
  const byId = new Map(ways.map((w) => [w.id, w])), tags = [];
  for (const id of ids) tags.push(id ? byId.get(id)?.tags || {} : tags.at(-1) || {}); // a short link the map leaves out is the road either side of it
  return { pts: nodes.map(pt), tags };
}

// ------------------------------------------------------------------ helpers
const b64 = (ta) => Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength).toString('base64');
const dm = (v) => Math.round(v * 10);
/** Resample a polyline (with a value per segment) every `step` metres; returns points and the segment each falls in. */
function resample(P, step) {
  const out = [{ p: P[0], seg: 0, s: 0 }]; let acc = 0, s = 0;
  for (let i = 0; i + 1 < P.length; i++) {
    const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); let u = 0;
    while (acc + (L - u) >= step) { u += step - acc; acc = 0; s += step; out.push({ p: [a[0] + (b[0] - a[0]) * (u / L), a[1] + (b[1] - a[1]) * (u / L)], seg: i, s }); }
    acc += L - u;
  }
  return out;
}
/** The rectangle of least area round a footprint: centre, half sizes, angle. */
function minRect(pts) {
  let best = null;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]), c = Math.cos(a), s = Math.sin(a);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of pts) { const u = x * c + z * s, v = -x * s + z * c; x0 = Math.min(x0, u); x1 = Math.max(x1, u); z0 = Math.min(z0, v); z1 = Math.max(z1, v); }
    const A = (x1 - x0) * (z1 - z0);
    if (!best || A < best.A) { const u = (x0 + x1) / 2, v = (z0 + z1) / 2; best = { A, cx: u * c - v * s, cz: u * s + v * c, hx: (x1 - x0) / 2, hz: (z1 - z0) / 2, a }; }
  }
  return best;
}
const ring = (g, o) => g.map((p) => { const [x, z] = X(p.lat, p.lon); return [x - o[0], z - o[1]]; });
const flat = (r) => r.flatMap(([x, z]) => [dm(x), dm(z)]);

// ------------------------------------------------------------------ build
const { pts, tags } = await route();
const G = pts.map(([la, lo]) => X(la, lo));
const along = resample(G, 4);
const total = along.at(-1).s;
console.log(`route ${(total / 1000).toFixed(2)} km, ${pts.length} nodes`);
// the ground under the road, every 25 m, smoothed: what the road climbs and falls
const prof25 = resample(G, 25);
// every 25 m along the road in metres, turned back into latitude and longitude for the elevation service
const toLL = ([x, z]) => [ORIGIN[0] - z / (RAD * R), ORIGIN[1] + x / (RAD * R * COS0)];
const profEl = await cached('profile-m.json', async () => ({ el: await elevations(prof25.map((r) => toLL(r.p))) }));
const el = profEl.el;
const elAt = (s) => { const i = Math.min(el.length - 2, Math.max(0, Math.floor(s / 25))), f = s / 25 - i; return el[i] * (1 - f) + el[i + 1] * f; };

const region = await cached('region.json', async () => {
  const la0 = -39.30, la1 = -38.96, lo0 = 177.36, lo1 = 178.02, S2 = 450, slat = S2 / R / RAD, slon = slat / Math.cos(-39.13 * RAD);
  const nx = Math.floor((lo1 - lo0) / slon) + 1, ny = Math.floor((la1 - la0) / slat) + 1, grid = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) grid.push([la0 + j * slat, lo0 + i * slon]);
  const el = await elevations(grid);
  // the LINZ tile over Wairoa is a flat fill at 20 m: take SRTM there (its zero is the sea and the river)
  const bad = grid.map((p, i) => [p, i]).filter(([[la, lo], i]) => lo < 177.56 && la > -39.08 && el[i] !== null && el[i] > 19.6 && el[i] < 20.4);
  const fix = await elevations(bad.map(([p]) => p), 'srtm30m'); bad.forEach(([, i], k) => (el[i] = fix[k] !== null && fix[k] > 0.5 ? fix[k] : null));
  return { la0, lo0, slat, slon, nx, ny, el };
});
/** Put a lat/lon grid onto the game's metres: a grid aligned with east and south, nearest-sampled. */
function regrid(g, x0, z0, step, nx, nz) {
  const h = new Int16Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * step, z = z0 + j * step, lat = ORIGIN[0] - z / (RAD * R), lon = ORIGIN[1] + x / (RAD * R * COS0);
    const fi = (lon - g.lo0) / g.slon, fj = (lat - g.la0) / g.slat, i0 = Math.floor(fi), j0 = Math.floor(fj);
    let v = -32768;
    if (i0 >= 0 && j0 >= 0 && i0 + 1 < g.nx && j0 + 1 < g.ny) {
      const at = (a, b) => g.el[(j0 + b) * g.nx + i0 + a], c = [at(0, 0), at(1, 0), at(0, 1), at(1, 1)];
      if (c.every((e) => e !== null)) { const u = fi - i0, w = fj - j0; v = dm(c[0] * (1 - u) * (1 - w) + c[1] * u * (1 - w) + c[2] * (1 - u) * w + c[3] * u * w); }
      else if (c.some((e) => e !== null)) { const k = c.filter((e) => e !== null); v = dm(k.reduce((a, b) => a + b, 0) / k.length * 0.5); }
    }
    h[j * nx + i] = v;
  }
  return h;
}
const RX = X(region.la0 + region.ny * region.slat, region.lo0), RS = 300; // north-west corner; 300 m cells
const RNX = Math.ceil((X(region.la0, region.lo0 + region.nx * region.slon)[0] - RX[0]) / RS), RNZ = Math.ceil((X(region.la0, region.lo0)[1] - RX[1]) / RS);
const out = { origin: ORIGIN, total: Math.round(total), credit: 'Road, buildings, trees, poles, water, bush and coast: © OpenStreetMap contributors (ODbL, openstreetmap.org/copyright). Ground: sourced from the LINZ Data Service (NZ 8 m DEM, 2012) and licensed for reuse under CC BY 4.0, via OpenTopoData; at Wairoa, SRTM (NASA, public domain).', region: { x0: Math.round(RX[0]), z0: Math.round(RX[1]), step: RS, nx: RNX, nz: RNZ, h: b64(regrid(region, Math.round(RX[0]), Math.round(RX[1]), RS, RNX, RNZ)) }, stages: [] };

for (const st of STAGES) {
  const a = st.km[0] * 1000, b = Math.min(total, st.km[1] * 1000), pre = Math.min(a, 160), post = Math.min(total - b, 160);
  const seg = along.filter((r) => r.s >= a - pre && r.s <= b + post);
  const o = seg.find((r) => r.s >= a).p; // the stage's origin: where the truck starts
  const box = seg.reduce((m, r) => [Math.min(m[0], r.p[0]), Math.min(m[1], r.p[1]), Math.max(m[2], r.p[0]), Math.max(m[3], r.p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
  const M = 520, x0 = Math.floor((box[0] - M) / 25) * 25, z0 = Math.floor((box[1] - M) / 25) * 25, nx = Math.ceil((box[2] + M - x0) / 25) + 1, nz = Math.ceil((box[3] + M - z0) / 25) + 1;
  const g = await cached(`dem-${st.id}.json`, async () => {
    const ll = (x, z) => [ORIGIN[0] - z / (RAD * R), ORIGIN[1] + x / (RAD * R * COS0)], [la0, lo0] = ll(x0, z0 + nz * 25), [la1, lo1] = ll(x0 + nx * 25, z0), slat = 25 / (RAD * R), slon = slat / COS0;
    const gx = Math.ceil((lo1 - lo0) / slon) + 1, gy = Math.ceil((la1 - la0) / slat) + 1, grid = [];
    for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) grid.push([la0 + j * slat, lo0 + i * slon]);
    return { la0, lo0, slat, slon, nx: gx, ny: gy, el: await elevations(grid, st.dem), src: st.dem || 'nzdem8m' };
  });
  if (g.src === 'srtm30m') g.el = g.el.map((e) => (e === null || e <= 0.5 ? null : e)); // SRTM (used where the LINZ tile is a flat fill, at Wairoa) has no gaps over water: its zero is the river
  const dem = regrid(g, x0, z0, 25, nx, nz).map((v) => v); // metres east and south of the stage's origin come later
  // the road: every 4 m, its line, its height (smoothed), and what kind of road it is there
  const road = { n: seg.length, s0: seg[0].s - a, x: [], z: [], y: [], w: [], k: [] };
  for (const r of seg) {
    const t = tags[r.seg] || {}, hw = t.highway || '', surf = t.surface || '', bridge = t.bridge === 'yes';
    let y = 0, wt = 0; for (let k = -60; k <= 60; k += 5) { const w = Math.exp(-(k * k) / (2 * 28 * 28)); y += elAt(Math.max(0, Math.min(total, r.s + k))) * w; wt += w; }
    const oneLane = t.lanes === '1';
    const width = oneLane ? 4.2 : hw === 'trunk' ? (st.id === 'wairoa' ? 9.6 : 7.4) : hw === 'tertiary' ? 6.6 : surf === 'gravel' ? 4.6 : hw === 'service' ? 4.4 : 6.0;
    // kind bits: 1 gravel, 2 bridge, 4 centre line, 8 edge lines, 16 kerbs and footpaths, 32 a 50 km/h zone, 64 concrete
    const kind = (surf === 'gravel' || (hw === 'service' && surf !== 'concrete') ? 1 : 0) | (bridge ? 2 : 0) | ((['trunk', 'tertiary'].includes(hw) || t.name === 'Ormond Drive') && !oneLane ? 4 : 0) | (surf === 'gravel' || hw === 'service' || surf === 'concrete' ? 0 : 8) | (st.id === 'wairoa' ? 16 : 0) | (t.maxspeed === '50' || st.id === 'wairoa' ? 32 : 0) | (surf === 'concrete' ? 64 : 0);
    road.x.push(dm(r.p[0] - o[0])); road.z.push(dm(r.p[1] - o[1])); road.y.push(dm(y / wt)); road.w.push(Math.round(width * 10)); road.k.push(kind);
  }
  // what the map holds round it
  const raw = await cached(`feats-${st.id}.json`, async () => {
    const ll = (x, z) => [ORIGIN[0] - z / (RAD * R), ORIGIN[1] + x / (RAD * R * COS0)], [s1, w1] = ll(x0, z0 + nz * 25), [n1, e1] = ll(x0 + nx * 25, z0), bb = `${s1},${w1},${n1},${e1}`;
    return overpass(`[out:json][timeout:90];(way["building"](${bb});way["natural"](${bb});relation["natural"="water"](${bb});way["landuse"](${bb});way["waterway"](${bb});way["leisure"](${bb});way["barrier"](${bb});way["power"](${bb});node["power"="pole"](${bb});node["natural"="tree"](${bb});way["railway"](${bb});way["man_made"](${bb}););out geom tags;`);
  });
  const near = (x, z) => { let m = Infinity; for (let i = 0; i < seg.length; i += 3) m = Math.min(m, Math.hypot(seg[i].p[0] - o[0] - x, seg[i].p[1] - o[1] - z)); return m; };
  const polys = { water: [], wood: [], scrub: [], sand: [], grass: [], farm: [], town: [], wet: [] }, lines = { coast: [], cliff: [], rail: [], fence: [], power: [], river: [] }, bld = [], trees = [], poles = [];
  for (const e of raw) {
    const t = e.tags || {};
    if (e.type === 'node') { const [x, z] = X(e.lat, e.lon), p = [x - o[0], z - o[1]]; if (near(...p) > 700) continue; if (t.natural === 'tree') trees.push([dm(p[0]), dm(p[1])]); if (t.power === 'pole') poles.push([dm(p[0]), dm(p[1])]); continue; }
    const geoms = e.type === 'relation' ? (e.members || []).filter((m) => m.role === 'outer' && m.geometry).map((m) => m.geometry) : e.geometry ? [e.geometry] : [];
    for (const gm of geoms) {
      const r = ring(gm, o), closed = gm.length > 3 && gm[0].lat === gm.at(-1).lat && gm[0].lon === gm.at(-1).lon;
      if (t.building) {
        if (st.id === 'onenui' && near(r[0][0], r[0][1]) < 2000) continue; // the range as it is today: the game draws it as it was in 2016
        const c = r.reduce((m, p) => [m[0] + p[0] / r.length, m[1] + p[1] / r.length], [0, 0]); if (near(...c) > 420) continue;
        const m = minRect(r); if (!m || m.hx < 1 || m.hz < 1) continue;
        const kind = ['house', 'detached', 'residential', 'bungalow'].includes(t.building) ? 1 : ['shed', 'garage', 'farm_auxiliary', 'barn', 'industrial', 'hangar'].includes(t.building) ? 2 : ['retail', 'commercial', 'school', 'church', 'public', 'civic'].includes(t.building) ? 3 : t.man_made === 'lighthouse' ? 5 : 0;
        bld.push([dm(m.cx), dm(m.cz), dm(m.hx), dm(m.hz), Math.round(m.a * 1000), kind, t.man_made === 'lighthouse' ? 1 : +(t['building:levels'] || 1)]);
        continue;
      }
      const n = t.natural, lu = t.landuse;
      const P = closed ? polys : null;
      if (P && (n === 'water' || lu === 'reservoir' || lu === 'basin' || t.waterway === 'riverbank')) P.water.push(flat(r));
      else if (P && (n === 'wood' || lu === 'forest')) P.wood.push(flat(r));
      else if (P && (n === 'scrub' || n === 'heath')) P.scrub.push(flat(r));
      else if (P && (n === 'wetland' || n === 'mud')) P.wet.push(flat(r));
      else if (P && (n === 'beach' || n === 'sand')) P.sand.push(flat(r));
      else if (P && ['grass', 'recreation_ground', 'cemetery', 'village_green'].includes(lu) || P && ['park', 'pitch', 'golf_course'].includes(t.leisure)) P.grass.push(flat(r));
      else if (P && ['farmland', 'meadow', 'farmyard'].includes(lu)) P.farm.push(flat(r));
      else if (P && ['residential', 'retail', 'commercial', 'industrial'].includes(lu)) P.town.push(flat(r));
      if (n === 'coastline') lines.coast.push(flat(r));
      else if (n === 'cliff') lines.cliff.push(flat(r));
      else if (t.railway) lines.rail.push(flat(r));
      else if (t.barrier === 'fence') lines.fence.push(flat(r));
      else if (t.power === 'minor_line' || t.power === 'line') lines.power.push(flat(r));
      else if (t.waterway === 'river' || t.waterway === 'stream') lines.river.push(flat(r));
    }
  }
  out.stages.push({ ...st, len: Math.round(b - a), o: [Math.round(o[0] * 10) / 10, Math.round(o[1] * 10) / 10], road: { ...road, x: b64(Int16Array.from(road.x)), z: b64(Int16Array.from(road.z)), y: b64(Int16Array.from(road.y)), w: b64(Uint8Array.from(road.w)), k: b64(Uint8Array.from(road.k)) }, dem: { x0: Math.round(x0 - o[0]), z0: Math.round(z0 - o[1]), step: 25, nx, nz, h: b64(dem) }, polys, lines, bld, trees, poles });
  console.log(`${st.id}: ${seg.length} road points, ${bld.length} buildings, ${trees.length} trees, ${poles.length} poles, dem ${nx}x${nz}`);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`wrote ${OUT}: ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
