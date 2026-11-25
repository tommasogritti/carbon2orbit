# Carbon to Orbit: notes for agents

An unofficial, open-source Rocket Lab fan game: Vite + TypeScript + Phaser 3, all art and sound generated in code, no server.

- **Adding or changing a level, card, person, enemy, power-up or mechanic:** follow `.claude/skills/add-level/SKILL.md`.
- **How the code works:** `docs/ARCHITECTURE.md`.
- **What to build and the rules it must meet:** `docs/PROJECT_SPEC.md` (level table §9, mechanic params §10, review log §12.1).

Before a commit: `npm run build` passes; `npm run readme -- --check` passes (run `npm run readme` after any change to levels, cards or people); the level's bot (`?level=<id>&auto=1`, in a visible tab) finishes with three stars; `npm run sim` passes when launch physics changed, and `npm run chill` when a `chill-down` level or its model changed.

Official Rocket Lab mission patches are committed, credited and linked to their source (how: the add-level skill); commit no other Rocket Lab logos, photos or video. Text about real people states sourced facts and no invented speech.
