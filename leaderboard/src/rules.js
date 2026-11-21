// The leaderboard's rules, shared by the game (which computes a score), the Cloudflare Worker (which checks it)
// and the dev server's stand-in. Single source of truth: change points here and bump the game's minor version,
// because scores are only comparable within one season.

/** Points for each thing a player can earn. */
export const POINTS = { star: 100, egg: 150, secret: 250, person: 50 };

export const scoreOf = ({ stars = 0, eggs = 0, secrets = 0, people = 0 }) =>
  stars * POINTS.star + eggs * POINTS.egg + secrets * POINTS.secret + people * POINTS.person;

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
  const { season, version, stars, levels, eggs, secrets, people, score } = body;
  const name = cleanName(body.name);
  if (!name) return { ok: false, error: 'name must be 1 to 16 letters, digits or spaces' };
  if (typeof season !== 'string' || !SEASON_RE.test(season)) return { ok: false, error: 'bad season' };
  if (typeof version !== 'string' || !version.startsWith(season + '.') || version.length > 20) return { ok: false, error: 'version does not match season' };
  if (!int(levels, 200) || !int(stars, levels * 3) || !int(eggs, 200) || !int(secrets, 50) || !int(people, 100)) return { ok: false, error: 'impossible tally' };
  if (score !== scoreOf({ stars, eggs, secrets, people })) return { ok: false, error: 'score does not match tally' };
  return { ok: true, entry: { season, version, name, score, stars, levels } };
}
