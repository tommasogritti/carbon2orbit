// Carbon to Orbit leaderboard: a Cloudflare Worker in front of a D1 (SQLite) database.
//   GET  /scores?season=0.2&limit=20   -> { season, scores: [{ name, score, stars, levels, at }] }
//   POST /scores  { season, version, name, score, stars, levels, eggs, secrets, people } -> { ok, rank, best }
// One row per (season, name): a submission only replaces it when the score is higher.
import { validate, SEASON_RE } from './rules.js';

const cors = (origin) => ({ 'access-control-allow-origin': origin, vary: 'Origin', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' });
const json = (data, status, origin) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors(origin) },
});

/** ALLOWED_ORIGIN is "*" or a comma-separated list; an entry "*.host" allows any https subdomain of host. */
function allowOrigin(origin, allowed) {
  if (allowed.trim() === '*') return '*';
  const list = allowed.split(',').map((s) => s.trim()).filter(Boolean);
  const ok = origin && list.some((a) => (a.startsWith('*.') ? origin.startsWith('https://') && origin.endsWith(a.slice(1)) : origin === a));
  return ok ? origin : list[0];
}

/**
 * POST /events, sent by the game as a beacon: { season, level, event: start|finish|fail, stars }. Adds one to that
 * day's total. Nothing that identifies a player is sent or stored. A browser beacon from a site that is not allowed is
 * refused; the reply has no body, since beacons ignore it.
 */
const EVENTS = new Set(['start', 'finish', 'fail']);
async function countEvent(request, env) {
  const from = request.headers.get('origin');
  const allowed = env.ALLOWED_ORIGIN || '*';
  if (from && allowed.trim() !== '*' && allowOrigin(from, allowed) !== from) return new Response(null, { status: 403 });
  const text = await request.text();
  if (text.length > 300) return new Response(null, { status: 413 });
  let b; try { b = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
  const stars = Number.isInteger(b?.stars) ? b.stars : 0;
  if (!SEASON_RE.test(b?.season || '') || !/^[a-z0-9-]{1,48}$/.test(b?.level || '') || !EVENTS.has(b?.event) || stars < 0 || stars > 3) return new Response(null, { status: 400 });
  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare('INSERT INTO plays (day, season, level, event, stars, n) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(day, season, level, event, stars) DO UPDATE SET n = n + 1')
    .bind(day, b.season, b.level, b.event, b.event === 'finish' ? stars : 0).run();
  return new Response(null, { status: 204 });
}

export default {
  async fetch(request, env) {
    const origin = allowOrigin(request.headers.get('origin'), env.ALLOWED_ORIGIN || '*');
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) }); // a 204 may not carry a body
    if (url.pathname.replace(/\/$/, '') === '/events' && request.method === 'POST') return countEvent(request, env);
    if (url.pathname.replace(/\/$/, '') !== '/scores') return json({ error: 'not found' }, 404, origin);

    if (request.method === 'GET') {
      const season = url.searchParams.get('season') || '';
      if (!SEASON_RE.test(season)) return json({ error: 'bad season' }, 400, origin);
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
      const { results } = await env.DB.prepare('SELECT name, score, stars, levels, at FROM scores WHERE season = ? ORDER BY score DESC, at ASC LIMIT ?').bind(season, limit).all();
      return json({ season, scores: results }, 200, origin);
    }

    if (request.method === 'POST') {
      const text = await request.text();
      if (text.length > 1000) return json({ error: 'too large' }, 413, origin);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'bad json' }, 400, origin); }
      const v = validate(body);
      if (!v.ok) return json({ error: v.error }, 400, origin);
      const e = v.entry, at = new Date().toISOString();
      await env.DB.prepare(
        'INSERT INTO scores (season, name, score, stars, levels, version, at) VALUES (?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(season, name) DO UPDATE SET score = excluded.score, stars = excluded.stars, levels = excluded.levels, version = excluded.version, at = excluded.at WHERE excluded.score > scores.score',
      ).bind(e.season, e.name, e.score, e.stars, e.levels, e.version, at).run();
      const best = await env.DB.prepare('SELECT score FROM scores WHERE season = ? AND name = ?').bind(e.season, e.name).first('score');
      const rank = await env.DB.prepare('SELECT COUNT(*) + 1 AS r FROM scores WHERE season = ? AND score > ?').bind(e.season, best).first('r');
      return json({ ok: true, rank, best }, 200, origin);
    }
    return json({ error: 'method not allowed' }, 405, origin);
  },
};
