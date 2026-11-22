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
