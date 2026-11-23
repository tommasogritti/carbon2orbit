// Anonymous play counts for the public game: one beacon when a level starts, and one when it ends.
// It carries only the season, the level id, what happened and the stars, never a name, an id or a cookie, so nobody
// can be followed from one visit to the next. The leaderboard Worker adds one to a daily total for the country the
// request came from (leaderboard/README.md); it never reads the IP address.
// To count a day's players without an id, the browser keeps one thing: the date it was last counted. Its first level
// start of a day says so (`first: 1`), and the Worker adds one to that day's players.
// Nothing is sent from the dev server, in developer mode (the callers check), during bot runs and recordings, or when
// the browser asks sites not to track it.
import { SEASON } from './version';

const BASE = ((import.meta.env.VITE_LEADERBOARD_URL as string | undefined) || '').replace(/\/$/, '');
const q = new URLSearchParams(location.search);
const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
const off = !BASE || import.meta.env.DEV || q.has('auto') || q.has('rec') || nav.doNotTrack === '1' || nav.globalPrivacyControl === true;

export type PlayEvent = 'start' | 'finish' | 'fail';

const DAY_KEY = 'carbon-to-orbit-counted';
let counted = ''; // the UTC day this page was last counted, for browsers that refuse storage
/** True for this browser's first level start of the UTC day. Only the date is stored, the same for everyone that day. */
function firstToday(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  try { counted = localStorage.getItem(DAY_KEY) || counted; } catch { /* private mode */ }
  if (counted === today) return false;
  counted = today;
  try { localStorage.setItem(DAY_KEY, today); } catch { /* private mode: counted once per page load */ }
  return true;
}

export function count(event: PlayEvent, level: string, stars = 0) {
  if (off) return;
  const body = JSON.stringify({ season: SEASON, level, event, stars: event === 'finish' ? stars : 0, ...(event === 'start' && firstToday() ? { first: 1 } : {}) });
  try {
    // text/plain keeps it a simple request (no preflight); the beacon survives the page closing.
    if (nav.sendBeacon?.(`${BASE}/events`, new Blob([body], { type: 'text/plain' }))) return;
    void fetch(`${BASE}/events`, { method: 'POST', body, keepalive: true, mode: 'no-cors', headers: { 'content-type': 'text/plain' } }).catch(() => {});
  } catch { /* counting must never break the game */ }
}
