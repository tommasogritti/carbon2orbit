// Writes the README's level table and the level counts (README badge and the About text in index.html) from
// src/content.ts, so they always match the game. `npm run readme` rewrites them; `npm run readme -- --check` only
// reports, and exits 1 when either file is out of date. Bundles content.ts on the fly, like scripts/launch-sim.mjs.
import { build } from 'vite';
import { pathToFileURL } from 'node:url';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = mkdtempSync(join(tmpdir(), 'readme-'));
await build({ logLevel: 'silent', build: { lib: { entry: 'src/content.ts', formats: ['es'], fileName: 'content' }, outDir: out, emptyOutDir: false } });
const { LEVELS, BONUS, PEOPLE, CHARACTERS } = await import(pathToFileURL(join(out, 'content.js')).href);

// What the player does, per mechanic. A new mechanic must be added here, or the script stops.
const PLAY = {
  platform: 'Platform', launch: 'Launch control', ride: 'Mini-game: off-road ride', hotfire: 'Mini-game: engine hot-fire',
  'heli-catch': 'Mini-game: helicopter catch', 'orbit-raise': 'Mini-game: orbit raising', sprint: 'Mini-game: street sprint',
  'fault-finder': 'Mini-game: failure investigation', splashdown: 'Mini-game: capsule recovery', cruise: 'Mini-game: cruise to Mars',
  'countdown-race': 'Mini-game: race the count', 'orbit-ops': 'Mini-game: spacecraft burns', 'dual-count': 'Mini-game: two launch counts',
  'arc-lab': 'Mini-game: lab experiment', 'edit-bay': 'Mini-game: edit an interview', 'slot-finder': 'Mini-game: find a meeting slot',
  'hat-trick': 'Mini-game: blend and eat a hat', 'fit-out': 'Mini-game: shipyard crane and thruster trial', sandbar: 'Mini-game: a party against the tide',
};
const PLAYABLE = new Set(['platform', 'launch', 'minigame']);
const clean = (s) => String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\|/g, '\\|');
const year = (d) => (/^\d{4}(-\d\d){0,2}$/.test(d) ? d.slice(0, 4) : clean(d).replace(/-/g, '–'));
const where = (p) => clean(p || '').split(' · ')[0];
const person = (id) => CHARACTERS.find((c) => c.id === id)?.name ?? id;
const title = (id) => clean([...LEVELS, ...BONUS, ...PEOPLE].find((l) => l.id === id)?.title ?? id);

// every mechanic a level uses, including the acts it hands on to (params.then)
const mechanics = (l) => { const m = []; let p = l; while (p) { if (p.mechanic) m.push(p.mechanic); p = p.params?.then ?? p.then; } return m; };
const play = (l) => {
  if (!PLAYABLE.has(l.kind)) return 'Story card';
  const m = mechanics(l);
  for (const k of m) if (!PLAY[k]) throw new Error(`scripts/readme-levels.mjs: add a PLAY label for the mechanic "${k}"`);
  const labels = [...new Set(m.map((k) => PLAY[k]))];
  return labels.length > 1 ? `${labels[0]}, then ${labels.slice(1).map((s) => s.replace('Mini-game: ', '')).join(', then ')}` : labels[0];
};
const notes = (l) => [
  l.hero && `played as ${person(l.hero)}`,
  l.params?.buddy && `with ${person(l.params.buddy)} as a running mate`,
  l.status === 'announced' && 'locked until it flies',
].filter(Boolean).join('; ');

const rows = LEVELS.map((l, i) => `| ${i + 1} | ${clean(l.title)}${notes(l) ? ` (${notes(l)})` : ''} | ${year(l.date)} | ${where(l.place)} | ${play(l)} |`);
const secrets = BONUS.map((l) => `| ${clean(l.title)} | ${PLAYABLE.has(l.kind) ? play(l) : 'Story card'} | ${title(l.parent)} |`);
const people = PEOPLE.map((l) => `| ${clean(l.title)} | ${year(l.date)} | ${title(l.parent)} |`);
const table = [
  `All ${LEVELS.length} stops on the map, in story order:`, '',
  '| # | Level | Year | Where | Play |', '| --- | --- | --- | --- | --- |', ...rows, '',
  'Secrets, unlocked by finding a hidden blueprint:', '',
  '| Secret | Play | Found in |', '| --- | --- | --- |', ...secrets, '',
  'People to meet, on small nodes beside the path:', '',
  '| Person | Year | Beside |', '| --- | --- | --- |', ...people,
].join('\n');

const playable = [...LEVELS, ...BONUS].filter((l) => l.mechanic && l.status !== 'announced'); // the same rule as tally() in src/leaderboard.ts, so it matches the title screen
const kinds = new Set(playable.flatMap(mechanics)).size;
const badge = `\`${playable.length} playable levels\` · \`${kinds} kinds of play\` · \`every fact sourced\` · \`art and sound made in code\``;

const check = process.argv.includes('--check');
let stale = [];
const update = (file, edit) => { const was = readFileSync(file, 'utf8'), now = edit(was); if (now !== was) { stale.push(file); if (!check) writeFileSync(file, now); } };
const between = (s, tag, body) => {
  const re = new RegExp(`(<!-- ${tag}:start[^>]*-->\\n)[\\s\\S]*?(\\n<!-- ${tag}:end -->)`);
  if (!re.test(s)) throw new Error(`README.md is missing the <!-- ${tag}:start --> / <!-- ${tag}:end --> markers`);
  return s.replace(re, `$1${body}$2`);
};
update('README.md', (s) => between(between(s, 'levels', table), 'counts', badge));
update('index.html', (s) => s.replace(/with \d+ playable levels and \d+ kinds of play/, `with ${playable.length} playable levels and ${kinds} kinds of play`));

if (check && stale.length) { console.error(`Out of date: ${stale.join(', ')}. Run npm run readme.`); process.exit(1); }
console.log(check ? 'README.md and index.html match the levels.' : stale.length ? `Updated ${stale.join(', ')}.` : 'Already up to date.');
console.log(`${LEVELS.length} map stops, ${playable.length} playable levels, ${kinds} kinds of play, ${BONUS.length} secrets, ${PEOPLE.length} people.`);
