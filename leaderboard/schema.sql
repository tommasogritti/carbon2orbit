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
