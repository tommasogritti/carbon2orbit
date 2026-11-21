// Score, and the leaderboard card. The board is online when a Cloudflare Worker is configured (see leaderboard/README.md);
// without one the card still shows your own score. In `npm run dev` a local stand-in answers at /__lb.
import { save, showCard, DEV } from './core';
import { ALL, BONUS, PEOPLE } from './content';
import { VERSION, SEASON } from './version';
import { POINTS, scoreOf, cleanName } from '../leaderboard/src/rules.js';

export interface Entry { name: string; score: number; stars: number; levels: number; at: string }
const BASE = ((import.meta.env.VITE_LEADERBOARD_URL as string | undefined) || (import.meta.env.DEV ? '/__lb' : '')).replace(/\/$/, '');
export const online = !!BASE;
const NAME_KEY = 'carbon-to-orbit-name';
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** What the player has earned so far, and what it is worth. */
export function tally() {
  const playable = ALL().filter((d) => d.mechanic && d.status !== 'announced');
  const done = playable.filter((d) => save.done[d.id]);
  const t = { stars: done.reduce((n, d) => n + save.done[d.id], 0), levels: done.length, eggs: Object.keys(save.eggs).length, secrets: Object.keys(save.unlocks).length, people: Object.keys(save.met).length };
  const max = scoreOf({ stars: playable.length * 3, eggs: ALL().filter((d) => d.egg).length, secrets: BONUS.length, people: PEOPLE.length });
  return { ...t, score: scoreOf(t) as number, max: max as number, of: playable.length };
}
export async function top(limit = 15): Promise<Entry[]> {
  const r = await fetch(`${BASE}/scores?season=${SEASON}&limit=${limit}`);
  if (!r.ok) throw new Error('leaderboard ' + r.status);
  return (await r.json()).scores;
}
export async function submit(name: string): Promise<{ ok?: boolean; rank?: number; best?: number; error?: string }> {
  const t = tally();
  const r = await fetch(`${BASE}/scores`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ season: SEASON, version: VERSION, name, score: t.score, stars: t.stars, levels: t.levels, eggs: t.eggs, secrets: t.secrets, people: t.people }) });
  return r.json();
}

/** The leaderboard card: your score and how it is made up, the season's best, and a way to put your name on it. */
export function showBoard(note = '') {
  const t = tally();
  let name = ''; try { name = localStorage.getItem(NAME_KEY) || ''; } catch { /* private mode */ }
  const canSubmit = online && !DEV && t.score > 0;
  const why = !online ? 'No online leaderboard is configured for this copy of the game, so this is your own score only.' : DEV ? 'Developer mode is on, so scores are not submitted.' : t.score === 0 ? 'Finish a level to get on the board.' : 'Only the name you type and your score are sent.';
  const parts = `${t.stars} ★ × ${POINTS.star} · ${t.eggs} easter eggs × ${POINTS.egg} · ${t.secrets} secrets × ${POINTS.secret} · ${t.people} people met × ${POINTS.person}`;
  showCard(
    `<div class="kicker">LEADERBOARD · SEASON ${SEASON} <span class="src">(game v${VERSION})</span></div><h1>${t.score.toLocaleString('en-NZ')} points</h1>` +
    `<p>${t.levels} of ${t.of} levels played, out of a possible ${t.max.toLocaleString('en-NZ')} points.<br><span class="src">${parts}</span></p>` +
    (note ? `<p class="fact unlock">${esc(note)}</p>` : '') +
    `<div id="lb-rows" class="board">${online ? '<p class="src">Loading the board…</p>' : ''}</div>` +
    (canSubmit ? `<p class="lb-name"><label>Name on the board <input id="lb-name" maxlength="16" autocomplete="off" spellcheck="false" value="${esc(name)}"></label></p>` : '') +
    `<p class="src">${why} Scores only compare within a season: each new season of levels starts a fresh board.</p>`,
    [...(canSubmit ? [{ label: 'Submit my score', fn: () => {
      const clean = cleanName(name) as string | null;
      if (!clean) return showBoard('Type a name first: 1 to 16 letters, digits or spaces.');
      try { localStorage.setItem(NAME_KEY, clean); } catch { /* private mode */ }
      submit(clean).then((r) => showBoard(r.ok ? `Submitted as ${clean}. You are number ${r.rank} this season${r.best! > t.score ? ` (your best is ${r.best})` : ''}.` : 'Not accepted: ' + (r.error || 'unknown error')), () => showBoard('The leaderboard could not be reached. Your score is safe on this device.'));
    } }] : []), { label: 'Back to the map', fn: () => {}, alt: canSubmit }],
  );
  document.getElementById('lb-name')?.addEventListener('input', (e) => { name = (e.target as HTMLInputElement).value; });
  if (online) top().then((rows) => {
    const box = document.getElementById('lb-rows'); if (!box) return;
    const mine = cleanName(name);
    box.innerHTML = rows.length ? `<table>${rows.map((r, i) => `<tr class="${r.name === mine ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.score.toLocaleString('en-NZ')}</td><td>${r.stars} ★ · ${r.levels} levels</td></tr>`).join('')}</table>` : '<p class="src">Nobody is on the board for this season yet.</p>';
  }, () => { const box = document.getElementById('lb-rows'); if (box) box.innerHTML = '<p class="src">The leaderboard could not be reached.</p>'; });
}
