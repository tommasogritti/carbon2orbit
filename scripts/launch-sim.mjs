// Tuning harness: bundles src/launchSim.ts on the fly and flies it with the autopilot.
import { build } from 'vite';
import { pathToFileURL } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const out = mkdtempSync(join(tmpdir(), 'sim-'));
await build({ logLevel: 'silent', build: { lib: { entry: 'src/launchSim.ts', formats: ['es'], fileName: 'sim' }, outDir: out, emptyOutDir: false } });
const S = await import(pathToFileURL(join(out, 'sim.js')).href);
const DEG = Math.PI / 180, km = (m) => (m / 1000).toFixed(0), clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// ---- Electron ----
const E = S.VEHICLES.electron;
function fly(m, { ref, bucket = true, sloppy = 0, kick = true } = {}) {
  const s = S.newSim(E); S.ignite(s); S.step(s, 2); S.release(s);
  const dt = 0.05; let err = 0, peakG = 0;
  while (s.t < 900 && !s.fail && s.ev.seco === undefined) {
    const e = S.botEvent(s, m); if (e === 'go') S.go(s); else if (e === 'cut') S.cutoff(s);
    const thr = s.throttle; S.pilot(s, m, dt, ref); if (!bucket) s.throttle = 1; void thr;
    if (sloppy) { err = sloppy * DEG * Math.sin(s.t / 7); s.pitch += err * dt * 0.6; } // a wandering hand on the stick
    S.step(s, dt); peakG = Math.max(peakG, s.g);
  }
  const o = S.orbit(s);
  const row = { fail: s.fail, maxQ_kPa: (s.maxQ / 1000).toFixed(1), stress: s.stress.toFixed(2), meco: clock(s.ev.meco ?? 0), fairing: clock(s.ev.fairing ?? 0), swap: clock(s.ev.swap ?? 0), seco: clock(s.ev.seco ?? 0), ap: km(o.ap), pe: km(o.pe), prop2: ((s.prop / E.stages[1].prop) * 100).toFixed(1) + '%', peakG: peakG.toFixed(1) };
  if (kick && !s.fail && o.ap > 150e3) {
    S.kickSep(s);
    let o2 = S.orbit(s);
    const need = S.vCirc(o2.ap) - Math.sqrt(S.MU * (2 / (S.RE + o2.ap) - 1 / o2.a)), burn = need / (E.stages[2].thrustVac / s.m);
    while (S.orbit(s).tAp > burn / 2 && s.t < 9000) S.step(s, 1);
    s.lit = true; const t0 = s.t;
    while (s.lit && s.t < 9000) { S.step(s, 0.5); o2 = S.orbit(s); if (o2.pe >= Math.min(o2.ap - 2e3, m.ha)) S.cutoff(s); }
    row.kick = `${need.toFixed(0)} m/s, ${(s.t - t0).toFixed(0)} s burn → ${km(o2.ap)} × ${km(o2.pe)} km, Curie prop left ${((s.prop / E.stages[2].prop) * 100).toFixed(0)}%`;
  }
  return row;
}
for (const [name, m] of [['500 km', { hp: 250e3, ha: 500e3 }], ['575 km', { hp: 250e3, ha: 575e3 }], ['test 300x500', { hp: 300e3, ha: 500e3 }]]) {
  const ref = S.reference(E, m);
  console.log(`\nElectron → ${name}: reference kick ${(ref.kick / DEG).toFixed(2)}°, margin ${(ref.margin * 100).toFixed(1)}%, maxQ ${(ref.maxQ / 1000).toFixed(1)} kPa, MECO ${clock(ref.ev.meco)} at ${km(ref.pts.find((p) => p.t >= ref.ev.meco).alt)} km, SECO ${clock(ref.ev.seco)}`);
  console.log('  autopilot      ', fly(m, { ref }));
  console.log('  no bucket      ', fly(m, { ref, bucket: false, kick: false }));
  console.log('  sloppy 4°      ', fly(m, { ref, sloppy: 4 }));
  console.log('  sloppy 10°     ', fly(m, { ref, sloppy: 10 }));
}

// ---- Ātea-1 ----
const A = S.VEHICLES['atea-1'];
console.log('\nĀtea-1: apogee / range (km) by rail elevation and wind (m/s, + = tailwind)');
for (const w of [-4, -2, 0, 2, 4]) console.log(`  wind ${String(w).padStart(2)}:`, [74, 78, 80, 82, 84, 86, 88].map((el) => { const b = S.ballistic(A, el * DEG, w); return `${el}° ${km(b.apogee)}/${km(b.range)}`; }).join('  '));
console.log('  dart released late, 84°, calm:', [0.15, 0.5, 1, 2].map((l) => `${l}s ${km(S.ballistic(A, 84 * DEG, 0, l).apogee)}`).join('  '), ' burnout', S.ballistic(A, 84 * DEG, 0).burnout.toFixed(1), 's');

// ---- more Electron missions flown in the game ----
for (const [name, m] of [['It\'s Business Time 210x500', { hp: 210e3, ha: 500e3 }], ['LC-2 250x550', { hp: 250e3, ha: 550e3 }]]) {
  const ref = S.reference(E, m);
  console.log(`\nElectron → ${name}: margin ${(ref.margin * 100).toFixed(1)}%`, fly(m, { ref }));
}

// ---- HASTE: suborbital, cut off on speed, release the test article on the way down ----
const Hv = S.VEHICLES.haste;
for (const m of [{ hp: 140e3, ha: 140e3, vCut: 6000, relAlt: 90e3 }]) {
  const ref = S.reference(Hv, m);
  const s = S.newSim(Hv); S.ignite(s); S.step(s, 2); S.release(s);
  let minFpa = 0;
  while (s.t < 1500 && !s.fail && !s.released) { const e = S.botEvent(s, m); if (e === 'go') S.go(s); else if (e === 'cut') S.cutoff(s); S.pilot(s, m, 0.05, ref); S.step(s, 0.05); minFpa = Math.atan2(s.vr, s.vt) / DEG; }
  console.log(`\nHASTE → level at ${km(m.hp)} km, SECO at ${m.vCut} m/s, release at ${km(m.relAlt)} km: reference kick ${(ref.kick / DEG).toFixed(1)}°, margin ${(ref.margin * 100).toFixed(1)}%`);
  console.log('  autopilot      ', { fail: s.fail, maxQ_kPa: (s.maxQ / 1000).toFixed(1), stress: s.stress.toFixed(2), meco: clock(s.ev.meco ?? 0), fairing: clock(s.ev.fairing ?? 0), swap: s.ev.swap ? clock(s.ev.swap) : 'none', seco: clock(s.ev.seco ?? 0), secoAlt: km(ref.pts.find((p) => p.t >= ref.ev.seco).alt), release: clock(s.ev.release ?? 0), relAlt: (s.alt / 1000).toFixed(1), relSpeed: s.speed.toFixed(0), fpa: minFpa.toFixed(1), down: km(s.down), heat: s.heat.toFixed(2) });
  if (s.fail || !s.released) { console.error('HASTE autopilot failed'); process.exitCode = 1; }
}
