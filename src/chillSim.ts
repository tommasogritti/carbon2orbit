/**
 * The model behind the `chill-down` mechanic (scenes/ChillDown.ts): pure TypeScript with no Phaser, so a level's numbers
 * can be run headless (the bot here is the one the scene uses under ?auto=1).
 *
 * A system is one or more lines, each a run of pipe from a storage tank to a tank under test, with five on/off valves
 * (supply, drain, fill, vent, press) and one flow valve the player meters. Up to three tests are worked on it, in the
 * order the level's `acts` give:
 *
 *  - `lineup`  a functional test: command the valves into the loading line-up. A valve takes a moment to travel, a
 *              `sticky` one ignores its first command, and liquid let into a line whose drain is open goes down the drain.
 *  - `chill`   a cryogenic test (a chilldown): meter liquid into a warm line. What goes in boils, the vapour is the line's pressure,
 *              and the relief valve lifts at 1. The colder the line, the more flow it takes; the tank at the far end is
 *              warm again when the liquid first reaches it. Each lift trips the flow valve shut and vents some of the store.
 *  - `press`   a pressure test: raise the pressure a step at a time and hold each step. A leak shows as a sag below the
 *              step and a sniffer reading at one joint, and grows faster the higher the pressure; a joint is only worked
 *              on once its line has been vented right down, to the safe mark. Left alone, the joint lets go.
 *
 * Every number is a game value, in the model's own units: pressure is a share of the relief setting (chill) or of the
 * test pressure (press); `chill`, `tank` and `level` run from 0 to 1.
 */
export type Valve = 'supply' | 'drain' | 'fill' | 'vent' | 'press';
export type Act = 'lineup' | 'chill' | 'press';
export const VALVES: Valve[] = ['supply', 'drain', 'fill', 'vent', 'press'];
/** The loading line-up: what a functional test has to leave behind it. */
export const LINEUP: Record<Valve, boolean> = { supply: true, drain: false, fill: true, vent: true, press: false };

export interface LineDef {
  key: string; name: string; short: string;
  /** Normal boiling point in °C, and the colour the panel gives the fluid. */ boil: number; color: number;
  /** Pressure made by a unit of boil-off; chill of the line and of the tank per second at unit heat; how warm the tank is to the first liquid (0 to 1); fill per second at full flow into a cold tank. */
  gain: number; cool: number; tankCool: number; warm: number; fill: number;
  /** Store used per second at full flow. */ use: number;
  /** Valves open at the start of a line-up, and valves that ignore their first command. */ open?: Valve[]; sticky?: Valve[];
}
export interface Params {
  acts?: Act[]; lines: LineDef[];
  /** Notches on the flow valve; seconds a valve takes to travel; share of the store a relief lift vents, and that an open drain takes per second. */
  notches?: number; travel?: number; liftLoss?: number; drainLoss?: number;
  /** Pressure steps; seconds each is held; the band a step is held within; the pressure a joint may be worked at. */
  steps?: number; hold?: number; band?: number; safe?: number; joints?: string[];
  /** Leaks: [line, joint, the step it opens at, seconds into that step's hold, growth per second]. */
  leaks?: [number, number, number, number, number?][];
  /** Stars and failure: seconds for three stars, seconds allowed, joints that may let go. */
  par?: number; limit?: number; maxBursts?: number;
}
export interface V { open: boolean; want: boolean; t: number; stuck: boolean }
export interface Line {
  d: LineDef; v: Record<Valve, V>;
  q: number; chill: number; tank: number; level: number; p: number; store: number; lift: number; loaded: boolean; near: boolean; spilling: boolean;
  set: number; pp: number; held: number; holdT: number; leak?: { joint: number; sev: number; grow: number }; fixed: number[]; busy: number; mended: number;
}
export type Ev = { kind: 'act'; act: Act | 'done' } | { kind: 'stuck' | 'moved'; line: number; valve: Valve } | { kind: 'spill' | 'near' | 'liquid' | 'lift' | 'loaded' | 'held' | 'burst' | 'empty'; line: number } | { kind: 'leak' | 'fixed' | 'wasted'; line: number; joint: number };
export interface Sim {
  p: Required<Omit<Params, 'leaks' | 'lines'>> & { lines: LineDef[]; leaks: NonNullable<Params['leaks']> };
  lines: Line[]; act: Act | 'done'; ai: number; t: number; actT: number; settle: number; failed?: 'empty' | 'bursts' | 'time';
  lifts: number; bursts: number; spills: number; wasted: number; sprung: boolean[]; ev: Ev[]; botT: number;
}
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const smooth = (u: number) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
export const strikes = (s: Sim) => s.lifts + s.bursts + s.spills;

export function newSim(params: Params): Sim {
  const p = { acts: ['lineup', 'chill', 'press'] as Act[], notches: 8, travel: 0.45, liftLoss: 0.09, drainLoss: 0.04, steps: 4, hold: 3, band: 0.03, safe: 0.08, joints: ['Flange 1', 'Flange 2', 'Flange 3', 'Flange 4', 'Quick disconnect'], leaks: [], par: 210, limit: 480, maxBursts: 3, ...params };
  const first = p.acts[0];
  const lines = p.lines.map((d): Line => {
    const v = {} as Record<Valve, V>;
    for (const k of VALVES) { const open = first === 'lineup' ? !!d.open?.includes(k) : LINEUP[k]; v[k] = { open, want: open, t: 0, stuck: first === 'lineup' && !!d.sticky?.includes(k) }; }
    return { d, v, q: 0, chill: 0, tank: 0, level: 0, p: 0, store: 1, lift: 0, loaded: false, near: false, spilling: false, set: 0, pp: 0, held: 0, holdT: 0, fixed: [], busy: 0, mended: 0 };
  });
  const s: Sim = { p, lines, act: first, ai: 0, t: 0, actT: 0, settle: 0, lifts: 0, bursts: 0, spills: 0, wasted: 0, sprung: p.leaks.map(() => false), ev: [], botT: 0 };
  enter(s, first);
  return s;
}
/** What an act finds when it begins: the sequencer sets the valves a person would not be asked to. */
function enter(s: Sim, act: Act | 'done') {
  s.act = act; s.actT = 0; s.settle = 0; s.ev.push({ kind: 'act', act });
  const put = (l: Line, k: Valve, open: boolean) => { l.v[k].open = l.v[k].want = open; l.v[k].t = 0; l.v[k].stuck = false; };
  for (const l of s.lines) {
    if (act === 'chill') for (const k of VALVES) put(l, k, LINEUP[k]);
    if (act === 'press') { l.q = 0; l.p = 0; put(l, 'supply', false); put(l, 'drain', false); put(l, 'fill', true); put(l, 'vent', false); put(l, 'press', false); l.chill = l.tank = 1; }
    if (act === 'done') { put(l, 'press', false); put(l, 'vent', true); l.set = 0; }
  }
}
export const lineupOk = (l: Line) => VALVES.every((k) => l.v[k].open === LINEUP[k] && !l.v[k].t);
/** How warm the metal is that the flow meets, 0 to about 1.1: the line while it chills, then the tank as the liquid reaches it. */
export function warmth(l: Line) { return Math.max(0, 1 - l.chill) + 0.1 + l.d.warm * (1 - l.tank) * smooth((l.chill - 0.9) / 0.1); }
/** The pressure this line would settle at with the flow valve on notch `n`. */
export const settles = (s: Sim, l: Line, n: number) => (n / s.p.notches) * warmth(l) * l.d.gain;
/** The wall temperature of the line in °C, from ambient to the fluid's boiling point. */
export const wallC = (l: Line, amb = 20) => amb + (l.d.boil - amb) * clamp(l.chill, 0, 1);

/** Command an on/off valve to its other position (a functional test). */
export function command(s: Sim, i: number, k: Valve) {
  const l = s.lines[i], v = l.v[k];
  if (s.act !== 'lineup' || v.t > 0) return false;
  v.want = !v.open; v.t = s.p.travel; return true;
}
/** Open or close the flow valve a notch. */
export function throttle(s: Sim, i: number, d: number) {
  const l = s.lines[i];
  if (s.act !== 'chill' || l.loaded || l.lift > 0) return false;
  const q = clamp(l.q + d, 0, s.p.notches); if (q === l.q) return false;
  l.q = q; return true;
}
/** Raise the pressure a step (d = 1) or vent down a step (d = -1). Up is refused until the present step has been held. */
export function pressure(s: Sim, i: number, d: number): true | 'hold' | 'top' | 'bottom' | 'busy' | 'leak' {
  const l = s.lines[i];
  if (s.act !== 'press' || l.busy > 0) return 'busy';
  if (d > 0) { if (l.set >= s.p.steps) return 'top'; if (l.set > l.held) return l.leak ? 'leak' : 'hold'; l.set++; l.holdT = 0; return true; }
  if (l.set <= 0) return 'bottom';
  l.set--; l.holdT = 0; return true;
}
/** Work on a joint: only with the line at or below the safe mark. */
export function tighten(s: Sim, i: number, joint: number): true | 'pressure' | 'busy' {
  const l = s.lines[i];
  if (s.act !== 'press' || l.busy > 0) return 'busy';
  if (l.pp > s.p.safe) return 'pressure';
  l.busy = 0.7;
  if (l.leak && l.leak.joint === joint) { l.leak = undefined; l.fixed.push(joint); l.mended = 2; l.holdT = 0; s.ev.push({ kind: 'fixed', line: i, joint }); }
  else { s.wasted++; s.ev.push({ kind: 'wasted', line: i, joint }); }
  return true;
}

export function step(s: Sim, dt: number) {
  if (s.act === 'done' || s.failed) return;
  s.t += dt; s.actT += dt;
  const P = s.p;
  s.lines.forEach((l, i) => {
    for (const k of VALVES) { const v = l.v[k]; if (v.t > 0 && (v.t -= dt) <= 0) { v.t = 0; if (v.stuck) { v.stuck = false; v.want = v.open; s.ev.push({ kind: 'stuck', line: i, valve: k }); } else { v.open = v.want; s.ev.push({ kind: 'moved', line: i, valve: k }); } } }
    l.lift = Math.max(0, l.lift - dt); l.busy = Math.max(0, l.busy - dt); l.mended = Math.max(0, l.mended - dt);
    if (s.act === 'lineup') {
      const spill = l.v.supply.open && l.v.drain.open;
      if (spill) { l.store = Math.max(0, l.store - P.drainLoss * dt); if (!l.spilling) { s.spills++; s.ev.push({ kind: 'spill', line: i }); } }
      l.spilling = spill;
    } else if (s.act === 'chill') {
      const f = l.q / P.notches, w = warmth(l), heat = f * w, arrive = smooth((l.chill - 0.9) / 0.1);
      const was = l.chill;
      if (l.chill < 1) l.chill = Math.min(1, l.chill + heat * l.d.cool * dt);
      if (arrive > 0 && !l.loaded) { l.tank = Math.min(1, l.tank + f * (1.05 - l.tank) * arrive * l.d.tankCool * dt); l.level = Math.min(1, l.level + f * arrive * l.d.fill * Math.pow(l.tank, 1.5) * dt); }
      l.store = Math.max(0, l.store - f * l.d.use * dt);
      l.p += ((heat * l.d.gain - l.p) / 1.1) * dt;
      if (!l.near && l.chill >= 0.8) { l.near = true; s.ev.push({ kind: 'near', line: i }); }
      if (was < 1 && l.chill >= 1) s.ev.push({ kind: 'liquid', line: i });
      if (l.p >= 1) { s.lifts++; l.lift = 1.6; l.q = 0; l.p = 0.5; l.store = Math.max(0, l.store - P.liftLoss); s.ev.push({ kind: 'lift', line: i }); }
      if (!l.loaded && l.level >= 1) { l.loaded = true; l.q = 0; s.ev.push({ kind: 'loaded', line: i }); }
      if (!l.loaded && l.store <= 0 && !s.failed) { s.failed = 'empty'; s.ev.push({ kind: 'empty', line: i }); }
    } else {
      const pt = l.set / P.steps, sag = l.leak ? 0.05 + 0.1 * l.leak.sev : 0;
      l.pp += ((Math.max(0, pt - sag) - l.pp) / (l.pp > pt ? 0.6 : 0.9)) * dt;
      if (l.leak) {
        l.leak.sev += l.leak.grow * (0.25 + l.pp) * dt;
        if (l.leak.sev >= 1) { s.bursts++; l.fixed.push(l.leak.joint); l.leak = undefined; l.set = 0; l.holdT = 0; l.busy = 2.5; s.ev.push({ kind: 'burst', line: i }); if (s.bursts >= P.maxBursts) s.failed = 'bursts'; }
      } else if (l.set > l.held && Math.abs(l.pp - pt) < P.band) {
        l.holdT += dt;
        const k = P.leaks.findIndex(([li, , st, after], n) => !s.sprung[n] && li === i && st === l.set && l.holdT >= after);
        if (k >= 0) { s.sprung[k] = true; l.leak = { joint: P.leaks[k][1], sev: 0, grow: P.leaks[k][4] ?? 0.057 }; l.holdT = 0; s.ev.push({ kind: 'leak', line: i, joint: P.leaks[k][1] }); }
        else if (l.holdT >= P.hold) { l.held = l.set; l.holdT = 0; s.ev.push({ kind: 'held', line: i }); }
      }
    }
  });
  if (!s.failed && s.t > P.limit) s.failed = 'time';
  if (s.failed) return;
  const done = s.act === 'lineup' ? s.lines.every(lineupOk) : s.act === 'chill' ? s.lines.every((l) => l.loaded) : s.lines.every((l) => l.held >= P.steps && !l.leak);
  s.settle = done ? s.settle + dt : 0;
  if (s.settle > 0.8) { s.ai++; enter(s, P.acts[s.ai] || 'done'); }
}
/** Stars for a finished run: three inside par with at most one strike, two with at most three. */
export function stars(s: Sim) { const k = strikes(s); return k <= 1 && s.t <= s.p.par ? 3 : k <= 3 ? 2 : 1; }

/**
 * The bot: what a careful operator does, through the same commands the player has. It shuts drains before it opens
 * supplies, rides each line's pressure at about four fifths of the relief setting, eases back before the liquid reaches
 * the warm tank, and vents a line down before touching a joint. It sees a leak only once its reading would show.
 */
export function bot(s: Sim, dt: number) {
  s.botT += dt;
  if (s.act === 'lineup') {
    if (s.botT < 0.3) return;
    for (let i = 0; i < s.lines.length; i++) for (const k of ['drain', 'press', 'vent', 'fill', 'supply'] as Valve[]) { const v = s.lines[i].v[k]; if (v.t > 0) return; if (v.open !== LINEUP[k]) { command(s, i, k); s.botT = 0; return; } }
  } else if (s.act === 'chill') {
    if (s.botT < 0.14) return;
    for (let i = 0; i < s.lines.length; i++) {
      const l = s.lines[i]; if (l.loaded || l.lift > 0) continue;
      // near the tank, plan for the warmth the liquid is about to meet
      const ahead: Line = l.chill > 0.78 && l.chill < 1 ? { ...l, chill: 1 } : l;
      let n = 0; while (n < s.p.notches && Math.max(settles(s, l, n + 1), settles(s, ahead, n + 1)) <= 0.84) n++;
      if (n !== l.q) { throttle(s, i, n > l.q ? 1 : -1); s.botT = 0; return; }
    }
  } else if (s.act === 'press') {
    if (s.botT < 0.22) return;
    for (let i = 0; i < s.lines.length; i++) {
      const l = s.lines[i]; if (l.busy > 0) continue;
      if (l.leak && l.leak.sev > 0.12) {
        if (l.pp <= s.p.safe) { tighten(s, i, l.leak.joint); s.botT = 0; return; }
        if (l.set / s.p.steps > s.p.safe) { pressure(s, i, -1); s.botT = 0; return; }
        continue;
      }
      if (!l.leak && l.set <= l.held && l.set < s.p.steps) { pressure(s, i, 1); s.botT = 0; return; }
    }
  }
}
