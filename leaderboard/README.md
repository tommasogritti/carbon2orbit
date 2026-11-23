# Leaderboard

A small Cloudflare Worker with a D1 database. The game works without it: with no leaderboard configured, the board in the game shows only your own score.

## How scores work

- A score is `level points + easter eggs × 150 + secrets × 250 + people met × 50` (see `src/rules.js`, shared with the game). A level's points are its stars × 100, scaled by the average game speed it was played at: ×0.5 at half speed, ×1 at normal speed, ×1.5 at double, ×2 at four times. The best run of each level counts.
- Scores are grouped by **season**, the major.minor of the game version (`0.2.x` is season `0.2`). Levels and scoring change between seasons, so boards never mix them. Bump the minor version in `package.json` whenever levels are added or points change.
- One row per name per season; a new submission replaces it only if it is higher.
- The game runs in the browser, so a score cannot be proven. The Worker checks that the total matches its parts and that the parts are possible (level points must lie between what those stars earn at the slowest and the fastest speed). Treat the board as friendly, not as proof.

## Deploy

You need a Cloudflare account (the free plan is enough).

```bash
cd leaderboard
npx wrangler login
npx wrangler d1 create carbon2orbit-leaderboard        # copy the database_id into wrangler.toml
npx wrangler d1 execute carbon2orbit-leaderboard --remote --file=schema.sql
npx wrangler deploy                                    # prints the Worker's URL
```

Then tell the game where it is, in a `.env` file at the repository root, and rebuild:

```bash
VITE_LEADERBOARD_URL=https://carbon2orbit-leaderboard.<your-subdomain>.workers.dev
```

Set `ALLOWED_ORIGIN` in `wrangler.toml` to the sites that host the game (comma-separated; `*.host` allows its subdomains), and consider a Cloudflare rate-limiting rule on `POST /scores`.

### The public board

The public game's board runs at `https://lb.carbon2orbit.com`: Cloudflare builds and deploys this folder from `main` (Workers Builds, root directory `leaderboard`, deploy command `npx wrangler deploy`), and the game's Pages project sets `VITE_LEADERBOARD_URL=https://lb.carbon2orbit.com`. A fork deploying its own board changes `routes`, `ALLOWED_ORIGIN` and `database_id` in `wrangler.toml`.

## Local development

`npm run dev` at the repository root serves a stand-in at `/__lb/scores` that follows the same rules and keeps its rows in `recordings/leaderboard-dev.json`. To run the real Worker locally instead:

```bash
cd leaderboard
npx wrangler d1 execute carbon2orbit-leaderboard --local --file=schema.sql
npx wrangler dev --var STATS_TOKEN:local      # the stats page is then at http://localhost:8787/stats, token "local"
```

## API

| Request | Reply |
| --- | --- |
| `GET /scores?season=0.2&limit=20` | `{ season, scores: [{ name, score, stars, levels, at }] }`, best first |
| `POST /scores` with `{ season, version, name, score, points, stars, levels, eggs, secrets, people }` | `{ ok, rank, best }`, or `{ error }` with status 400 |
| `POST /events` with `{ season, level, event, stars, first? }` (`event` is `start`, `finish` or `fail`; `first: 1` on a browser's first start of the day), sent by the game as a beacon | empty 204; adds one to that day's row in `plays_by_country`, and for `first` to the day's `players` |
| `GET /stats` | the private stats page (see Play counts); 404 without a `STATS_TOKEN` secret |
| `GET /stats.json?from=2026-11-01&to=2026-11-23` with `Authorization: Bearer <STATS_TOKEN>` | `{ from, to, today, first, playersFrom, days: [{ day, country, players, starts, finishes, fails }], levels: [{ level, country, starts, finishes, fails, s1, s2, s3 }] }`; the last 30 days by default |

## Play counts

The game counts, without identifying anyone, how often each level is started, finished (with how many stars) and failed (`src/stats.ts`; nothing is sent in developer mode, during bot runs, or when the browser sends Do Not Track or Global Privacy Control). The Worker keeps:

- **`plays_by_country`**: a total per day, season, country, level, event and stars. The country is the two letters Cloudflare attaches to the request (`request.cf.country`; `XX` when it cannot tell). The IP address is never read or stored. Rows with an empty country are totals from before countries were recorded.
- **`players`**: a total per day and country of browsers that started their first level of that day. The game keeps only the date it was last counted (in `localStorage`) and marks its first start of a day with `first: 1`; no id is involved. Someone who plays on two devices, in a private window, or after clearing the site's data counts twice.

Days are UTC. Plays are per event, not per person: one player retrying a level five times is five starts.

### The stats page

`https://lb.carbon2orbit.com/stats` shows players and plays per day and country, and starts, finishes, fails and stars per level, for the last 7, 30 or 90 days or for all of them. It is private: the page holds no numbers, and `GET /stats.json` answers only to the token in the Worker's `STATS_TOKEN` secret. Until that secret is set, both addresses answer 404.

Set the token once (any long random string; `openssl rand -hex 24` makes one), then paste the same string into the page, which keeps it in that browser:

```bash
cd leaderboard
npx wrangler secret put STATS_TOKEN
```

To change it, run the command again with a new value; to switch the page off, `npx wrangler secret delete STATS_TOKEN`. The **Forget token** button removes it from the browser.

For visits (as opposed to plays), Cloudflare Web Analytics on the Pages project shows page views by day and country.

### Upgrading a database from before countries were counted

A database created before 23 November 2026 has a `plays` table and neither of the tables above. Create them and copy the old totals across **before** the new Worker is deployed (for the public board, before the pull request is merged, since Cloudflare deploys from `main`):

```bash
cd leaderboard
npx wrangler d1 execute carbon2orbit-leaderboard --remote --file=migrate-country.sql
```

The script only adds: it creates the two tables and copies `plays` into `plays_by_country` under the empty country. It is safe to run again, so run it once more after the deploy to carry over the plays counted in between. A Worker deployed before the script has run keeps counting into `plays`, so nothing is lost either way. Once the page shows the old totals, `plays` is no longer read and can be dropped.

### Queries

The same numbers can be read in the database's console in the Cloudflare dashboard (D1 → carbon2orbit-leaderboard → Console), for example:

```sql
-- players per day and country
SELECT day, country, n FROM players ORDER BY day DESC, n DESC;
-- starts, finishes and fails per level this season
SELECT level, SUM(CASE WHEN event='start' THEN n END) AS starts, SUM(CASE WHEN event='finish' THEN n END) AS finishes, SUM(CASE WHEN event='fail' THEN n END) AS fails FROM plays_by_country WHERE season = '0.9' GROUP BY level ORDER BY starts DESC;
```
