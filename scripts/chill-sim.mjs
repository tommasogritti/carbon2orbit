// Tuning harness for the `chill-down` mechanic: bundles src/chillSim.ts and src/content.ts on the fly and plays every
// level that uses the mechanic headless, with the bot and with models of slow players. A level tuned against the bot
// alone can be one that nobody finishes (the first Chill Down was), so `npm run chill` fails unless the bot gets three
// stars AND every slow player finishes with store to spare, while a player who holds the valve wide open pays for it.
import { build } from 'vite';
import { pathToFileURL } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const out = mkdtempSync(join(tmpdir(), 'chill-'));
const lib = async (entry, name) => { await build({ logLevel: 'silent', build: { lib: { entry, formats: ['es'], fileName: name }, outDir: out, emptyOutDir: false } }); return import(pathToFileURL(join(out, name + '.js')).href); };
const { newSim, step, command, throttle, pressure, tighten, settles, stars, LINEUP, bot } = await lib('src/chillSim.ts', 'sim');
const { LEVELS, BONUS } = await lib('src/content.ts', 'content');

/**
 * One pair of hands: a key every `tap` seconds, acting on what was on screen `react` seconds ago, watching one line for
 * `dwell` seconds at a time. It opens the flow valve while the heading arrow is under `target` and closes it when the
 * arrow or the gauge is too high; it goes after a leak once its reading passes `notice`, by the keys a player needs
 * (cursor to the vent, vent, wait, cursor to the joint, re-make, cursor back). `naive` opens supplies before drains.
 */
function human({ tap, react, dwell, notice, target, naive }) {
  let wait = 0, line = 0, lineT = 0, plan = [];
  const hist = [];
  return (s, dt) => {
    hist.push(s.lines.map((l) => ({ p: l.p, head: settles(s, l, l.q), sev: l.leak ? l.leak.sev : -1 }))); if (hist.length > 600) hist.shift();
    const old = hist[Math.max(0, hist.length - 1 - Math.round(react * 60))];
    wait -= dt; lineT += dt; if (wait > 0) return;
    if (s.act === 'lineup') {
      for (let i = 0; i < s.lines.length; i++) for (const v of naive ? ['supply', 'drain', 'fill', 'vent', 'press'] : ['drain', 'supply', 'fill', 'vent', 'press']) { const x = s.lines[i].v[v]; if (x.t > 0) return; if (x.open !== LINEUP[v]) { command(s, i, v); wait = tap * 2; return; } }
    } else if (s.act === 'chill') {
      if (lineT > dwell || s.lines[line].loaded) { line = (line + 1) % s.lines.length; lineT = 0; wait = tap; return; }
      const l = s.lines[line], o = old[line]; if (l.loaded || l.lift > 0) return;
      if (o.p > 0.85 || o.head > 1) { throttle(s, line, -1); wait = tap; } else if (o.head < target) { throttle(s, line, 1); wait = tap; }
    } else if (s.act === 'press') {
      if (plan.length) { if (plan[0](s) !== 'wait') plan.shift(); wait = tap; return; }
      for (let i = 0; i < s.lines.length; i++) {
        const l = s.lines[i]; if (!l.leak || old[i].sev <= notice) continue;
        const j = l.leak.joint, keys = (n) => Array.from({ length: n }, () => () => 0); // cursor moves: PRESSURANT is item 6, VENT 5, the joints 0 to 4
        plan = [...keys(line !== i ? 1 : 0), () => { line = i; }, ...keys(1), (q) => { pressure(q, i, -1); }, (q) => (q.lines[i].pp > q.p.safe ? 'wait' : 0), ...keys(5 - j), (q) => { tighten(q, i, j); }, ...keys(6 - j)]; return;
      }
      if (lineT > dwell) { line = (line + 1) % s.lines.length; lineT = 0; wait = tap; return; }
      const l = s.lines[line]; if (!l.leak && l.busy <= 0 && l.set <= l.held && l.set < s.p.steps) { pressure(s, line, 1); wait = tap; }
    }
  };
}
/** Holds every flow valve wide open: the player the level is meant to punish. */
const rusher = (s, dt) => { if (s.act !== 'chill') return bot(s, dt); for (let i = 0; i < s.lines.length; i++) throttle(s, i, 1); };
const PLAYERS = {
  'careful, quick keys': () => human({ tap: 0.3, react: 0.4, dwell: 2, notice: 0.15, target: 0.75, naive: false }),
  'average': () => human({ tap: 0.5, react: 0.8, dwell: 3, notice: 0.3, target: 0.8, naive: true }),
  'average, greedy': () => human({ tap: 0.5, react: 0.8, dwell: 3, notice: 0.3, target: 0.95, naive: true }),
  'slow': () => human({ tap: 0.8, react: 1.2, dwell: 4, notice: 0.35, target: 0.8, naive: true }),
  'slow, greedy': () => human({ tap: 0.8, react: 1.5, dwell: 5, notice: 0.4, target: 0.95, naive: true }),
  'very slow': () => human({ tap: 1.2, react: 2, dwell: 6, notice: 0.45, target: 0.85, naive: true }),
};
function play(params, player) {
  const s = newSim(params), dt = 1 / 60;
  while (s.act !== 'done' && !s.failed) { player(s, dt); step(s, dt); s.ev.length = 0; }
  return { result: s.failed ? 'FAIL ' + s.failed : '★'.repeat(stars(s)), time: `${Math.floor(s.t / 60)}:${String(Math.floor(s.t % 60)).padStart(2, '0')}`, lifts: s.lifts, bursts: s.bursts, spills: s.spills, store: s.lines.map((l) => Math.round(l.store * 100) + '%').join(' '), s };
}
const acts = (l) => { const m = []; let p = l; while (p) { if (p.mechanic === 'chill-down') m.push(p.params); p = p.params?.then; } return m; };
let bad = 0;
for (const level of [...LEVELS, ...BONUS]) for (const params of acts(level)) {
  console.log(`\n${level.title}`);
  const rows = {}, b = play(params, bot), r = play(params, rusher);
  rows.bot = b; if (stars(b.s) < 3 || b.s.failed) { bad++; console.error('  ✗ the bot must finish with three stars'); }
  for (const [name, mk] of Object.entries(PLAYERS)) { const h = play(params, mk()); rows[name] = h; if (h.s.failed || Math.min(...h.s.lines.map((l) => l.store)) < 0.2) { bad++; console.error(`  ✗ “${name}” must finish with a fifth of the store left`); } }
  rows['rusher: valves wide open'] = r; if (!r.s.failed && Math.min(...r.s.lines.map((l) => l.store)) > 0.3) { bad++; console.error('  ✗ holding the valves wide open must cost most of the store'); }
  console.table(Object.fromEntries(Object.entries(rows).map(([k, { s, ...v }]) => [k, v])));
}
if (bad) { console.error(`\n${bad} check${bad > 1 ? 's' : ''} failed.`); process.exit(1); }
console.log('\nEvery chill-down level: the bot gets three stars, slow players finish, and rushing costs the store.');
