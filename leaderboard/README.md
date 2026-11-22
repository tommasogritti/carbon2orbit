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
npx wrangler dev
```

## API

| Request | Reply |
| --- | --- |
| `GET /scores?season=0.2&limit=20` | `{ season, scores: [{ name, score, stars, levels, at }] }`, best first |
| `POST /scores` with `{ season, version, name, score, points, stars, levels, eggs, secrets, people }` | `{ ok, rank, best }`, or `{ error }` with status 400 |
| `POST /events` with `{ season, level, event, stars }` (`event` is `start`, `finish` or `fail`), sent by the game as a beacon | empty 204; adds one to that day's row in `plays` |

## Play counts

The game counts, without identifying anyone, how often each level is started, finished (with how many stars) and failed (`src/stats.ts`; nothing is sent in developer mode, during bot runs, or when the browser sends Do Not Track or Global Privacy Control). There is no public endpoint for reading them: open the database's console in the Cloudflare dashboard (D1 → carbon2orbit-leaderboard → Console) and run, for example:

```sql
-- starts, finishes and fails per level this season
SELECT level, SUM(CASE WHEN event='start' THEN n END) AS starts, SUM(CASE WHEN event='finish' THEN n END) AS finishes, SUM(CASE WHEN event='fail' THEN n END) AS fails FROM plays WHERE season = '0.5' GROUP BY level ORDER BY starts DESC;
-- levels started per day
SELECT day, SUM(n) AS starts FROM plays WHERE event = 'start' GROUP BY day ORDER BY day DESC;
```

Counts are per event, not per person: one player retrying a level five times is five starts.
