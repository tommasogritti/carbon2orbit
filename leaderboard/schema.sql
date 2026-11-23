CREATE TABLE IF NOT EXISTS scores (
  season  TEXT    NOT NULL,   -- major.minor of the game version: scores compare only within a season
  name    TEXT    NOT NULL,
  score   INTEGER NOT NULL,
  stars   INTEGER NOT NULL,
  levels  INTEGER NOT NULL,
  version TEXT    NOT NULL,   -- exact game version that produced the score
  at      TEXT    NOT NULL,   -- ISO time of the best score
  PRIMARY KEY (season, name)
);
CREATE INDEX IF NOT EXISTS scores_by_rank ON scores (season, score DESC, at ASC);

-- Anonymous play counts: one row per day, season, country, level, event and stars, holding how many times it happened.
-- (A database made before countries were counted has a `plays` table instead: see migrate-country.sql.)
CREATE TABLE IF NOT EXISTS plays_by_country (
  day     TEXT    NOT NULL,   -- UTC date, YYYY-MM-DD
  season  TEXT    NOT NULL,
  country TEXT    NOT NULL,   -- two letters as Cloudflare reports them, XX when unknown, empty for counts from before countries were recorded
  level   TEXT    NOT NULL,   -- level id
  event   TEXT    NOT NULL,   -- start, finish or fail
  stars   INTEGER NOT NULL,   -- 1 to 3 for finish, 0 otherwise
  n       INTEGER NOT NULL,
  PRIMARY KEY (day, season, country, level, event, stars)
);

-- Anonymous players per day: how many browsers started their first level of that UTC day, by country.
CREATE TABLE IF NOT EXISTS players (
  day     TEXT    NOT NULL,   -- UTC date, YYYY-MM-DD
  country TEXT    NOT NULL,
  n       INTEGER NOT NULL,
  PRIMARY KEY (day, country)
);
