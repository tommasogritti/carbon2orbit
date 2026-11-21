declare const __VERSION__: string;
/** The game's version, from package.json. Shown on the title screen and sent with leaderboard scores. */
export const VERSION: string = __VERSION__;
/**
 * A season is the major.minor of the version. Scores are only comparable within one season, because levels and
 * scoring change between them: bump the minor version whenever levels are added or points change.
 */
export const SEASON = VERSION.split('.').slice(0, 2).join('.');
