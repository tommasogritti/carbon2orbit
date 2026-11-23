-- Upgrade a leaderboard database made before countries and players were counted (it has a `plays` table).
-- Run it before deploying the Worker that writes the new tables:
--   npx wrangler d1 execute carbon2orbit-leaderboard --remote --file=migrate-country.sql
-- It is safe to run again: run it once more after the deploy, to carry over any play counted in between.
-- A new database needs only schema.sql.

CREATE TABLE IF NOT EXISTS plays_by_country (
  day     TEXT    NOT NULL,
  season  TEXT    NOT NULL,
  country TEXT    NOT NULL,
  level   TEXT    NOT NULL,
  event   TEXT    NOT NULL,
  stars   INTEGER NOT NULL,
  n       INTEGER NOT NULL,
  PRIMARY KEY (day, season, country, level, event, stars)
);

CREATE TABLE IF NOT EXISTS players (
  day     TEXT    NOT NULL,
  country TEXT    NOT NULL,
  n       INTEGER NOT NULL,
  PRIMARY KEY (day, country)
);

-- The old totals, under the empty country ("not recorded"). The Worker never writes that country, so replacing
-- these rows on a second run changes nothing else. The `plays` table itself is left as it was.
INSERT OR REPLACE INTO plays_by_country (day, season, country, level, event, stars, n)
  SELECT day, season, '', level, event, stars, n FROM plays;
