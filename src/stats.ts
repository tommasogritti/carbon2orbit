// Anonymous play counts for the public game: one beacon when a level starts, and one when it ends.
// It carries only the season, the level id, what happened and the stars, never a name, an id or a cookie, so nobody
// can be followed from one visit to the next. The leaderboard Worker adds one to a daily total (leaderboard/README.md).
// Nothing is sent from the dev server, in developer mode (the callers check), during bot runs and recordings, or when
// the browser asks sites not to track it.
import { SEASON } from './version';

const BASE = ((import.meta.env.VITE_LEADERBOARD_URL as string | undefined) || '').replace(/\/$/, '');
const q = new URLSearchParams(location.search);
const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
const off = !BASE || import.meta.env.DEV || q.has('auto') || q.has('rec') || nav.doNotTrack === '1' || nav.globalPrivacyControl === true;

export type PlayEvent = 'start' | 'finish' | 'fail';

export function count(event: PlayEvent, level: string, stars = 0) {
  if (off) return;
  const body = JSON.stringify({ season: SEASON, level, event, stars: event === 'finish' ? stars : 0 });
  try {
    // text/plain keeps it a simple request (no preflight); the beacon survives the page closing.
    if (nav.sendBeacon?.(`${BASE}/events`, new Blob([body], { type: 'text/plain' }))) return;
    void fetch(`${BASE}/events`, { method: 'POST', body, keepalive: true, mode: 'no-cors', headers: { 'content-type': 'text/plain' } }).catch(() => {});
  } catch { /* counting must never break the game */ }
}
