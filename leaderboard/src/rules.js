// The leaderboard's rules, shared by the game (which computes a score), the Cloudflare Worker (which checks it)
// and the dev server's stand-in. Single source of truth: change points here and bump the game's minor version,
// because scores are only comparable within one season.

/** Points for each thing a player can earn. */
export const POINTS = { star: 100, egg: 150, secret: 250, person: 50 };

/**
 * How game speed scales a level's points. A level is worth stars × 100 at normal speed. Played faster it is worth
 * more (×1.5 at double speed, ×2 at four times), played slower it is worth less (×0.5 at half speed).
 * `avg` is the average speed over the whole level.
 */
export const SPEED_MIN = 0.5, SPEED_MAX = 2;
export const speedFactor = (avg) => Math.round(Math.min(SPEED_MAX, Math.max(SPEED_MIN, avg < 1 ? avg : 1 + 0.5 * Math.log2(avg))) * 100) / 100;
export const levelPoints = (stars, avg) => Math.round(stars * POINTS.star * speedFactor(avg));

/** `points` is the sum of every level's best points (stars × 100, scaled by speed). */
export const scoreOf = ({ points = 0, eggs = 0, secrets = 0, people = 0 }) =>
  points + eggs * POINTS.egg + secrets * POINTS.secret + people * POINTS.person;

/** A season is the major.minor of the game version, for example "0.2". */
export const SEASON_RE = /^\d+\.\d+$/;

/** Names are 1 to 16 characters: letters, digits, spaces, dots, dashes and underscores. */
export function cleanName(raw) {
  const s = String(raw ?? '').normalize('NFKC').replace(/[^\p{L}\p{N} ._-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return s.length ? s : null;
}

const int = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;

/**
 * Check a submitted score. Returns { ok: true, entry } or { ok: false, error }.
 * The game is client-side, so this cannot stop a determined cheat; it stops accidents and lazy tampering:
 * the total must equal the sum of its parts, and the parts must be possible.
 */
export function validate(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'bad request' };
  const { season, version, stars, levels, eggs, secrets, people, score, points } = body;
  const name = cleanName(body.name);
  if (!name) return { ok: false, error: 'name must be 1 to 16 letters, digits or spaces' };
  if (typeof season !== 'string' || !SEASON_RE.test(season)) return { ok: false, error: 'bad season' };
  if (typeof version !== 'string' || !version.startsWith(season + '.') || version.length > 20) return { ok: false, error: 'version does not match season' };
  if (!int(levels, 200) || !int(stars, levels * 3) || !int(eggs, 200) || !int(secrets, 50) || !int(people, 100)) return { ok: false, error: 'impossible tally' };
  // level points must be what those stars could earn between the slowest and the fastest speed
  if (!int(points, 1e6) || points < stars * POINTS.star * SPEED_MIN - levels || points > stars * POINTS.star * SPEED_MAX + levels) return { ok: false, error: 'impossible level points' };
  if (score !== scoreOf({ points, eggs, secrets, people })) return { ok: false, error: 'score does not match tally' };
  return { ok: true, entry: { season, version, name, score, stars, levels } };
}
