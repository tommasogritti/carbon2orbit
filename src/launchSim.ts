// Pure launch physics, shared by the Launch scene and scripts/launch-sim.mjs (tuning). No Phaser in here.
// SI units and mission seconds throughout; the scene plays it back time-compressed.
// A point mass in a plane around a round, non-rotating Earth: gravity, thrust along the body axis, drag,
// an exponential atmosphere. Stage masses are chosen to reproduce the published thrust and specific impulse
// and the timeline heard on the webcasts (MECO near T+2:30, SECO near T+9:00); they are not official figures.

export const MU = 3.986004418e14, RE = 6371e3, G0 = 9.80665, HSCALE = 7200;
/** Free molecular heating below which a fairing is normally let go, W/m². */
export const FMH_LIMIT = 1135;
const DEG = Math.PI / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
/** Seconds to leave between MECO and separation, and between separation and stage-2 ignition. Electron takes about three. */
export const GAP = 2.5;

export interface StageDef { thrustVac: number; thrustSL: number; isp: number; prop: number; dry: number }
export interface Vehicle {
  stages: StageDef[];
  payload: number; // everything above the last stage, kg
  fairing: number;
  cdA: number; // drag coefficient times frontal area, m²
  dartCdA?: number; // boosted dart, once it has left the booster
  qLimit: number; // dynamic pressure the structure is rated for, Pa
  qaLimit: number; // Q-alpha limit, Pa·rad
  minThrottle: number;
  unguided?: boolean; // fin-stabilised: weathercocks into the relative wind after leaving the rail
  rail?: number; // m
  battery?: [number, number]; // stage 2: seconds of full-throttle pumping in the first packs, and in the pack that stays
  battMass?: number; // the two packs dropped at hot-swap
  suborbital?: boolean; // HASTE: stage 2 cuts off on a speed, coasts, and releases a test article on the way down
}

export const VEHICLES: Record<string, Vehicle> = {
  // 6.5 m (Beck's figure), 60 kg, 15 cm across: a hybrid booster (peak about 6.9 kN for about 14.5 s, roughly 100 kN·s) under a non-propulsive
  // instrument dart. Unguided: aimed with the launch rail. Propellant and dart masses are estimates.
  'atea-1': {
    stages: [{ thrustVac: 6900, thrustSL: 6700, isp: 255, prop: 40, dry: 14 }], payload: 6, fairing: 0,
    cdA: 0.0093, dartCdA: 0.00075, qLimit: 1e9, qaLimit: 1e9, minThrottle: 1, unguided: true, rail: 8,
  },
  // Nine sea-level Rutherfords (224 kN at lift-off, 311 s), one vacuum Rutherford (25.8 kN, 343 s), Curie kick stage.
  electron: {
    stages: [
      { thrustVac: 234e3, thrustSL: 224e3, isp: 311, prop: 11400, dry: 1000 },
      { thrustVac: 25.8e3, thrustSL: 25.8e3, isp: 343, prop: 3150, dry: 230 },
      { thrustVac: 120, thrustSL: 120, isp: 320, prop: 22, dry: 40 },
    ],
    payload: 180, fairing: 44, cdA: 0.45, qLimit: 23.5e3, qaLimit: 2500, minThrottle: 0.6,
    battery: [245, 200], battMass: 40,
  },
};
// HASTE (Hypersonic Accelerator Suborbital Test Electron): the same two stages under a heavier load, flown on a
// suborbital arc. The payload figure covers the modified kick stage and the test article; it is a game value
// inside the published "up to 700 kg".
VEHICLES.haste = { ...VEHICLES.electron, stages: VEHICLES.electron.stages.slice(0, 2), payload: 560, suborbital: true };

export interface Sim {
  v: Vehicle; t: number; x: number; y: number; vx: number; vy: number;
  r: number; alt: number; vr: number; vt: number; speed: number; down: number; // derived
  stage: number; prop: number; m: number; lit: boolean; held: boolean; throttle: number; pitch: number; prograde: boolean;
  fairing: boolean; batt: number; swapped: boolean; starved: boolean; dart: boolean; released: boolean; retro?: boolean;
  q: number; alpha: number; stress: number; g: number; fmh: number; heat: number; wind: number;
  maxQ: number; apogee: number; ev: Record<string, number>; fail?: string;
}
const CUT = ['meco', 'seco', 'kico'];

function derive(s: Sim) {
  s.r = Math.hypot(s.x, s.y); s.alt = s.r - RE;
  const ux = s.x / s.r, uy = s.y / s.r;
  s.vr = s.vx * ux + s.vy * uy; s.vt = s.vx * uy - s.vy * ux;
  s.speed = Math.hypot(s.vx, s.vy); s.down = Math.atan2(s.x, s.y) * RE;
}

/** A vehicle standing on the pad, held down, engines off. `elev` is the rail elevation for unguided rockets. */
export function newSim(v: Vehicle, elev = 90 * DEG): Sim {
  const m = v.stages.reduce((a, st) => a + st.prop + st.dry, 0) + v.payload + v.fairing;
  const s: Sim = {
    v, t: 0, x: 0, y: RE, vx: 0, vy: 0, r: RE, alt: 0, vr: 0, vt: 0, speed: 0, down: 0,
    stage: 0, prop: v.stages[0].prop, m, lit: false, held: true, throttle: 1, pitch: elev, prograde: false,
    fairing: v.fairing > 0, batt: 1, swapped: false, starved: false, dart: false, released: false,
    q: 0, alpha: 0, stress: 0, g: 0, fmh: 0, heat: 0, wind: 0, maxQ: 0, apogee: 0, ev: {},
  };
  return s;
}

function step1(s: Sim, h: number) {
  const v = s.v, st = v.stages[s.stage];
  const md = (st.thrustVac / (st.isp * G0)) * s.throttle;
  if (s.held) { // engines may already be running against the hold-downs
    if (s.lit) { const d = Math.min(s.prop, md * h); s.prop -= d; s.m -= d; }
    return;
  }
  s.t += h;
  const pr = s.alt < 160e3 ? Math.exp(-Math.max(0, s.alt) / HSCALE) : 0, rho = 1.225 * pr;
  const ux = s.x / s.r, uy = s.y / s.r, tx = uy, ty = -ux; // local up, and downrange
  const w = s.wind * Math.min(3, 1 + Math.max(0, s.alt) / 4000);
  const ar = s.vr, at = s.vt - w, va = Math.hypot(ar, at); // air-relative velocity
  s.q = 0.5 * rho * va * va; s.fmh = s.q * va; if (s.q > s.maxQ) { s.maxQ = s.q; s.ev.maxq = s.t; }
  const gam = Math.atan2(ar, at);
  if (v.unguided && Math.hypot(s.x, s.y - RE) > (v.rail || 0)) s.pitch = gam;
  if (s.prograde) s.pitch = Math.atan2(s.vr, s.vt) + (s.retro ? Math.PI : 0); // a kick stage holds itself along the velocity vector, or against it to come down
  s.alpha = va > 30 ? Math.atan2(Math.sin(s.pitch - gam), Math.cos(s.pitch - gam)) : 0;
  let F = 0;
  if (s.lit) {
    if (v.battery && s.stage === 1 && !s.starved) {
      s.batt -= (s.throttle * h) / v.battery[s.swapped ? 1 : 0];
      if (s.batt <= 0) { s.batt = 0; s.starved = true; s.ev.starved = s.t; } // the electric pumps stop: no pumps, no thrust
    }
    if (!s.starved) {
      F = (st.thrustVac - (st.thrustVac - st.thrustSL) * pr) * s.throttle;
      s.prop -= md * h; s.m -= md * h;
      if (s.prop <= 0) { s.prop = 0; s.lit = false; s.ev[CUT[s.stage]] = s.t; }
    }
  }
  const aT = F / s.m, aD = va > 1 ? (s.q * (s.dart && v.dartCdA ? v.dartCdA : v.cdA)) / s.m / va : 0;
  const nr = aT * Math.sin(s.pitch) - aD * ar, nt = aT * Math.cos(s.pitch) - aD * at; // everything but gravity
  s.g = Math.hypot(nr, nt) / G0;
  const g = MU / (s.r * s.r);
  s.vx += (nr * ux + nt * tx - g * ux) * h; s.vy += (nr * uy + nt * ty - g * uy) * h;
  s.x += s.vx * h; s.y += s.vy * h;
  derive(s);
  if (s.alt < 0 && s.t < 6 && !s.ev.meco) { s.x = 0; s.y = RE; s.vx = 0; s.vy = 0; derive(s); } // not enough thrust to leave the pad yet
  else if (s.alt <= 0 && s.vr < 0) { s.ev.impact = s.t; s.fail = s.fail || 'impact'; }
  // structure: too much dynamic pressure, or flying sideways into it (Q-alpha)
  const over = Math.max(0, s.q / v.qLimit - 1), overA = Math.max(0, (s.q * Math.abs(s.alpha)) / v.qaLimit - 1);
  s.stress += (over * 1.6 + overA * 0.25) * h;
  if (s.stress >= 1 && !s.fail) s.fail = 'breakup';
  // a payload with no fairing in thick, fast air cooks
  if (!s.fairing && v.fairing > 0 && s.fmh > FMH_LIMIT && !(v.suborbital && s.ev.seco !== undefined)) { s.heat += ((s.fmh / FMH_LIMIT - 1) * h) / 20; if (s.heat >= 1 && !s.fail) s.fail = 'heating'; }
  if (s.alt > s.apogee) s.apogee = s.alt;
}

/** Advance by dt mission seconds. */
export function step(s: Sim, dt: number): void {
  const max = s.lit || s.alt < 160e3 ? 0.05 : 1;
  const n = Math.max(1, Math.ceil(dt / max));
  for (let i = 0; i < n && !s.fail; i++) step1(s, dt / n);
}

// ---------- commands ----------
export function ignite(s: Sim) { if (s.held && !s.lit) { s.lit = true; s.ev.ignition = s.t; } }
export function release(s: Sim) { if (s.held) { s.held = false; s.ev.liftoff = s.t; } }
export function cutoff(s: Sim) { if (s.lit && !s.held) { s.lit = false; s.ev[CUT[s.stage]] = s.t; } }
/** What the "go" key would do right now, if anything. */
export function nextGo(s: Sim): string | undefined {
  const v = s.v;
  if (s.fail) return;
  if (s.held) return s.lit ? 'liftoff' : 'ignition';
  if (v.unguided) return !s.lit && !s.dart ? 'dart' : undefined;
  if (s.stage === 0) return s.lit ? undefined : 'sep';
  if (s.stage === 1) {
    if (!s.lit) return s.ev.seco === undefined ? 'ses' : !v.suborbital || s.released ? undefined : s.fairing ? 'fairing' : 'release';
    return s.fairing ? 'fairing' : !s.swapped ? 'swap' : undefined;
  }
}
/** Perform the next sequence event. Returns its name, with "!" appended when it was done too hastily. */
export function go(s: Sim): string | undefined {
  const e = nextGo(s), v = s.v;
  if (!e) return;
  let rushed = false;
  if (e === 'ignition') ignite(s);
  else if (e === 'liftoff') release(s);
  else if (e === 'dart') { s.dart = true; s.m -= v.stages[0].dry; s.ev.dart = s.t; }
  else if (e === 'sep') {
    rushed = s.t - s.ev.meco < GAP; // thrust has not tailed off: the stages can recontact
    s.m -= v.stages[0].dry + s.prop; s.stage = 1; s.prop = v.stages[1].prop; s.batt = 1; s.ev.sep = s.t;
  } else if (e === 'ses') { rushed = s.t - s.ev.sep < GAP; s.lit = true; s.ev.ses = s.t; }
  else if (e === 'fairing') { s.fairing = false; s.m -= v.fairing; s.ev.fairing = s.t; }
  else if (e === 'release') { s.released = true; s.ev.release = s.t; }
  else if (e === 'swap') { s.swapped = true; s.batt = 1; s.starved = false; s.m -= v.battMass || 0; s.ev.swap = s.t; }
  if (rushed) s.stress = Math.min(0.99, s.stress + 0.3);
  return e + (rushed ? '!' : '');
}
/** Stage 2 hands over to the kick stage, which holds itself prograde. */
export function kickSep(s: Sim) {
  const v = s.v, st = v.stages[1];
  if (s.stage !== 1 || !v.stages[2]) return;
  s.m = v.stages[2].prop + v.stages[2].dry + v.payload; s.stage = 2; s.prop = v.stages[2].prop; s.lit = false; s.prograde = true; s.throttle = 1; s.ev.kicksep = s.t;
  void st;
}

// ---------- orbit ----------
export interface Orbit { ap: number; pe: number; ecc: number; a: number; period: number; tAp: number; nu: number; bound: boolean }
/** Osculating orbit from the current state. Apogee and perigee are altitudes; tAp is the time to the next apogee. */
export function orbit(s: Sim): Orbit {
  const e = (s.speed * s.speed) / 2 - MU / s.r, hm = s.r * s.vt;
  const ecc = Math.sqrt(Math.max(0, 1 + (2 * e * hm * hm) / (MU * MU)));
  if (e >= 0) return { ap: Infinity, pe: (hm * hm) / MU / (1 + ecc) - RE, ecc, a: Infinity, period: Infinity, tAp: Infinity, nu: 0, bound: false };
  const a = -MU / (2 * e), period = 2 * Math.PI * Math.sqrt((a * a * a) / MU);
  let nu = ecc > 1e-6 ? Math.acos(clamp(((a * (1 - ecc * ecc)) / s.r - 1) / ecc, -1, 1)) : 0;
  if (s.vr < 0) nu = 2 * Math.PI - nu;
  const E = 2 * Math.atan2(Math.sqrt(1 - ecc) * Math.sin(nu / 2), Math.sqrt(1 + ecc) * Math.cos(nu / 2));
  let M = E - ecc * Math.sin(E); if (M < 0) M += 2 * Math.PI;
  let tAp = ((Math.PI - M) / (2 * Math.PI)) * period; if (tAp < 0) tAp += period;
  return { ap: a * (1 + ecc) - RE, pe: a * (1 - ecc) - RE, ecc, a, period, tAp, nu, bound: true };
}
export const vCirc = (alt: number) => Math.sqrt(MU / (RE + alt));

// ---------- guidance ----------
/** Stage 2 puts the stack into hp × ha: cut off level at hp with apogee at ha; the kick stage circularises there. */
/** Suborbital missions instead cut off level at hp on a speed (vCut) and release the test article at relAlt on the way down. */
export interface Mission { hp: number; ha: number; vCut?: number; relAlt?: number }
export const vInject = (m: Mission) => { if (m.vCut) return m.vCut; const rp = RE + m.hp, ra = RE + m.ha; return Math.sqrt(MU * (2 / rp - 2 / (rp + ra))); };

/** Closed-loop stage-2 steering: the pitch that arrives level at the injection altitude when the burn ends. */
export function guide(s: Sim, m: Mission): number {
  const st = s.v.stages[1], ve = st.isp * G0, thr = Math.max(s.throttle, s.v.minThrottle);
  const dv = Math.max(0, vInject(m) - s.vt) / Math.max(0.6, Math.cos(s.pitch));
  const T = Math.max(14, (s.m / ((st.thrustVac / ve) * thr)) * (1 - Math.exp(-dv / ve))); // time to go
  const c0 = (6 * (RE + m.hp - s.r)) / (T * T) - (4 * s.vr) / T; // vertical acceleration wanted now
  const geff = MU / (s.r * s.r) - (s.vt * s.vt) / s.r;
  return Math.asin(clamp((c0 + geff) / ((st.thrustVac * thr) / s.m), -0.45, 0.82));
}

export interface RefPt { t: number; alt: number; down: number; pitch: number; speed: number }
export interface Ref { kick: number; pts: RefPt[]; ev: Record<string, number>; margin: number; maxQ: number; ok: boolean; ap: number; pe: number }
function refPitch(ref: Ref, alt: number) {
  const p = ref.pts; let i = 1;
  while (i < p.length - 1 && p[i].alt < alt && p[i].t < (ref.ev.meco ?? 1e9)) i++;
  const a = p[i - 1], b = p[i], f = clamp((alt - a.alt) / (b.alt - a.alt || 1), 0, 1);
  return a.pitch + (b.pitch - a.pitch) * f;
}
/**
 * The pitch the flight director asks for. Stage 1: straight up, a small pitch kick, then a gravity turn (nose on the
 * velocity vector, so no angle of attack). With a reference flight it steers gently back to that profile, never asking
 * for more angle of attack than the Q-alpha limit allows. Stage 2: closed-loop guidance.
 */
export function cue(s: Sim, m: Mission, ref?: Ref, kick = ref ? ref.kick : 5 * DEG): number {
  if (s.stage >= 1) return s.ev.seco !== undefined ? Math.atan2(s.vr, s.vt) : guide(s, m); // after cutoff: hold the nose on the velocity vector
  if (s.alt < 150) return Math.PI / 2;
  const prog = Math.PI / 2 - kick * clamp((s.alt - 150) / 1350, 0, 1);
  const gam = Math.atan2(s.vr, s.vt);
  if (s.alt < 1500) return prog;
  if (!ref) return Math.min(prog, gam);
  const lead = Math.min(12 * DEG, (0.55 * s.v.qaLimit) / Math.max(1, s.q));
  return gam + clamp(refPitch(ref, s.alt) - gam, -lead, lead);
}
/** Autopilot hands on the continuous controls: the throttle bucket through Max-Q, and pitch on the cue. */
export function pilot(s: Sim, m: Mission, dt: number, ref?: Ref, kick?: number) {
  const v = s.v;
  const want = s.stage === 0 ? clamp(1 - ((s.q / v.qLimit - 0.8) / 0.14) * (1 - v.minThrottle), v.minThrottle, 1) : 1;
  s.throttle += clamp(want - s.throttle, -0.5 * dt, 0.5 * dt);
  s.pitch += clamp(cue(s, m, ref, kick) - s.pitch, -4 * DEG * dt, 4 * DEG * dt);
}
/** When the autopilot would press "go" (sequence event) or "cut" (engine cutoff). */
export function botEvent(s: Sim, m: Mission): 'go' | 'cut' | undefined {
  if (s.held || s.fail) return;
  if (s.stage === 0 && !s.lit && s.t - s.ev.meco > GAP + 0.5) return 'go';
  if (s.stage === 1 && !s.lit && s.ev.seco === undefined && s.t - s.ev.sep > GAP + 0.5) return 'go';
  if (s.stage === 1 && s.lit) {
    if (s.fairing && s.fmh < FMH_LIMIT * 0.95) return 'go';
    if (!s.fairing && !s.swapped && s.batt < 0.04) return 'go';
    if (m.vCut ? s.vt >= m.vCut : orbit(s).ap >= m.ha) return 'cut';
  }
  if (s.stage === 1 && !s.lit && s.ev.seco !== undefined && s.v.suborbital && !s.released) {
    if (s.fairing) return s.fmh < FMH_LIMIT * 0.95 ? 'go' : undefined;
    if (s.vr < 0 && s.alt <= (m.relAlt ?? 90e3)) return 'go';
  }
}
function flyRef(v: Vehicle, m: Mission, kick: number): Ref {
  const s = newSim(v); ignite(s); release(s);
  const pts: RefPt[] = [], dt = 0.05; let n = 0;
  while (s.t < 1500 && !s.fail && (v.suborbital ? !s.released : s.ev.seco === undefined)) {
    const e = botEvent(s, m); if (e === 'go') go(s); else if (e === 'cut') cutoff(s);
    pilot(s, m, dt, undefined, kick); step(s, dt);
    if (n++ % 20 === 0) pts.push({ t: s.t, alt: s.alt, down: s.down, pitch: s.pitch, speed: s.speed });
  }
  const o = orbit(s);
  return { kick, pts, ev: { ...s.ev }, margin: s.prop / v.stages[1].prop, maxQ: s.maxQ, ap: o.ap, pe: o.pe, ok: v.suborbital ? !s.fail && s.released && s.prop > 0 : !s.fail && s.prop > 0 && o.pe > m.hp - 40e3 };
}
/** The nominal flight for this mission: the pitch kick that leaves the most stage-2 propellant. */
export function reference(v: Vehicle, m: Mission): Ref {
  let best: Ref | undefined;
  for (let k = 2; k <= 11; k += 0.5) { const r = flyRef(v, m, k * DEG); if (r.ok && (!best || r.margin > best.margin)) best = r; }
  if (!best) throw new Error('no reference flight reaches orbit');
  return best;
}

// ---------- unguided sounding rocket ----------
export interface Ballistic { apogee: number; range: number; pts: { alt: number; down: number }[]; burnout: number }
/** Fly an unguided rocket from the rail to impact. `late` is how long after burnout the dart is released. */
export function ballistic(v: Vehicle, elev: number, wind: number, late = 0.15): Ballistic {
  const s = newSim(v, elev); s.wind = wind; ignite(s); release(s);
  const pts: { alt: number; down: number }[] = []; let n = 0;
  while (s.t < 900 && s.ev.impact === undefined) {
    if (!s.lit && !s.dart && s.t - s.ev.meco >= late) go(s);
    step(s, s.lit || s.alt < 30e3 ? 0.02 : 0.25);
    if (n++ % 25 === 0) pts.push({ alt: s.alt, down: s.down });
  }
  return { apogee: s.apogee, range: s.down, pts, burnout: s.ev.meco };
}

/** Altitude of the reference flight at a given distance downrange: the centre line of the range-safety corridor. */
export function refAlt(ref: Ref, down: number): number {
  const p = ref.pts; let i = 1;
  while (i < p.length - 1 && p[i].down < down) i++;
  const a = p[i - 1], b = p[i], f = clamp((down - a.down) / (b.down - a.down || 1), 0, 1);
  return a.alt + (b.alt - a.alt) * f;
}
/** Half-width of the corridor an autonomous flight termination system would enforce here (a game value). */
export const corridor = (alt: number) => 3000 + 0.13 * Math.max(0, alt);
