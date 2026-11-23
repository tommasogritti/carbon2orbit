// The private view of the anonymous play counts: who played each day, by country and by level.
//   GET /stats                                   -> the page (stats.html); it holds no numbers itself
//   GET /stats.json?from=YYYY-MM-DD&to=YYYY-MM-DD -> the numbers, only with "Authorization: Bearer <STATS_TOKEN>"
// Both answer 404 until the STATS_TOKEN secret is set (leaderboard/README.md), so a copy without one shows nothing.
import page from './stats.html';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex, nofollow',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};
const reply = (data, status) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });

/** Compares two strings by their SHA-256 digests, taking the same time whether or not they match. */
async function same(a, b) {
  const enc = new TextEncoder();
  const [x, y] = (await Promise.all([a, b].map((s) => crypto.subtle.digest('SHA-256', enc.encode(s))))).map((d) => new Uint8Array(d));
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

const sum = (event, stars) => `SUM(CASE WHEN event = '${event}'${stars ? ` AND stars = ${stars}` : ''} THEN n ELSE 0 END)`;

export async function stats(request, env, url, path) {
  if (!env.STATS_TOKEN) return reply({ error: 'not found' }, 404);
  if (request.method !== 'GET') return reply({ error: 'method not allowed' }, 405);
  if (path === '/stats') return new Response(page, { headers: PAGE_HEADERS });

  const given = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!given || !(await same(given, env.STATS_TOKEN))) return reply({ error: 'unauthorised' }, 401);

  const today = new Date().toISOString().slice(0, 10);
  const to = url.searchParams.get('to') || today;
  const from = url.searchParams.get('from') || new Date(Date.parse(to) - 29 * 864e5).toISOString().slice(0, 10);
  if (!DAY_RE.test(from) || !DAY_RE.test(to) || from > to) return reply({ error: 'bad range' }, 400);

  let found;
  try { found = await env.DB.batch([
    env.DB.prepare(`SELECT day, country, ${sum('start')} AS starts, ${sum('finish')} AS finishes, ${sum('fail')} AS fails FROM plays_by_country WHERE day BETWEEN ?1 AND ?2 GROUP BY day, country`).bind(from, to),
    env.DB.prepare('SELECT day, country, n FROM players WHERE day BETWEEN ?1 AND ?2').bind(from, to),
    env.DB.prepare(`SELECT level, country, ${sum('start')} AS starts, ${sum('finish')} AS finishes, ${sum('fail')} AS fails, ${sum('finish', 1)} AS s1, ${sum('finish', 2)} AS s2, ${sum('finish', 3)} AS s3 FROM plays_by_country WHERE day BETWEEN ?1 AND ?2 GROUP BY level, country`).bind(from, to),
    env.DB.prepare('SELECT MIN(day) AS day FROM plays_by_country'),
    env.DB.prepare('SELECT MIN(day) AS day FROM players'),
  ]); } catch { return reply({ error: 'the play-count tables are missing: run migrate-country.sql (leaderboard/README.md)' }, 503); }
  const [plays, players, levels, first, playersFrom] = found;

  // One row per day and country, with that day's players beside its plays.
  const rows = new Map();
  const row = (day, country) => {
    const k = `${day} ${country}`;
    if (!rows.has(k)) rows.set(k, { day, country, players: 0, starts: 0, finishes: 0, fails: 0 });
    return rows.get(k);
  };
  for (const p of plays.results) Object.assign(row(p.day, p.country), { starts: p.starts, finishes: p.finishes, fails: p.fails });
  for (const p of players.results) row(p.day, p.country).players = p.n;

  return reply({
    from, to, today,
    first: first.results[0]?.day || null,             // the first day with any count
    playersFrom: playersFrom.results[0]?.day || null, // the first day players were counted (plays go back further)
    days: [...rows.values()].sort((a, b) => a.day.localeCompare(b.day) || a.country.localeCompare(b.country)),
    levels: levels.results,
  }, 200);
}
