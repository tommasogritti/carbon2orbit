import { defineConfig } from 'vite';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validate, SEASON_RE } from './leaderboard/src/rules.js';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const LB_FILE = join('recordings', 'leaderboard-dev.json');

// Dev-only: `?rec=<name>` records the game canvas and posts the clip here; it is saved to recordings/<name>.webm.
// Offline music renders are posted here too, and saved as recordings/<name>.wav.
export default defineConfig({
  define: { __VERSION__: JSON.stringify(pkg.version) },
  plugins: [{
    // Dev-only stand-in for the Cloudflare leaderboard (leaderboard/src/worker.js): same API and rules, rows kept in a local file.
    name: 'leaderboard-dev',
    apply: 'serve',
    configureServer(server) {
      const load = (): any[] => (existsSync(LB_FILE) ? JSON.parse(readFileSync(LB_FILE, 'utf8')) : []);
      server.middlewares.use('/__lb/scores', (req, res) => {
        const send = (status: number, data: unknown) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(data)); };
        const url = new URL(req.url || '', 'http://x');
        if (req.method === 'GET') {
          const season = url.searchParams.get('season') || '';
          if (!SEASON_RE.test(season)) return send(400, { error: 'bad season' });
          const rows = load().filter((r) => r.season === season).sort((a, b) => b.score - a.score || a.at.localeCompare(b.at)).slice(0, Number(url.searchParams.get('limit')) || 20);
          return send(200, { season, scores: rows.map(({ name, score, stars, levels, at }) => ({ name, score, stars, levels, at })) });
        }
        if (req.method !== 'POST') return send(405, { error: 'method not allowed' });
        let text = '';
        req.on('data', (c) => (text += c));
        req.on('end', () => {
          let body: unknown; try { body = JSON.parse(text); } catch { return send(400, { error: 'bad json' }); }
          const v = validate(body);
          if (!v.ok) return send(400, { error: v.error });
          const rows = load(), e = v.entry, old = rows.find((r) => r.season === e.season && r.name === e.name);
          if (!old) rows.push({ ...e, at: new Date().toISOString() }); else if (e.score > old.score) Object.assign(old, e, { at: new Date().toISOString() });
          mkdirSync('recordings', { recursive: true }); writeFileSync(LB_FILE, JSON.stringify(rows, null, 1));
          const best = (old && old.score > e.score ? old : e).score;
          send(200, { ok: true, best, rank: rows.filter((r) => r.season === e.season && r.score > best).length + 1 });
        });
      });
    },
  }, {
    name: 'gameplay-recorder',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__rec', (req, res) => {
        const q = new URL(req.url || '', 'http://x').searchParams, name = (q.get('name') || 'clip').replace(/[^a-z0-9-]/gi, '');
        const ext = q.get('ext') === 'wav' ? '.wav' : '.webm'; // .wav is an offline music render (__g2o.renderMusic)
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => { mkdirSync('recordings', { recursive: true }); writeFileSync(join('recordings', name + ext), Buffer.concat(chunks)); res.end('ok'); });
      });
    },
  }],
});
