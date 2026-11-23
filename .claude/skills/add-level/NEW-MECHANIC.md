# Building a new mechanic

Reached from the add-level skill when a chapter needs a kind of play the game does not have. Build it to be **reusable**: a second level should be able to use it with different params and art, with no change to the scene.

1. **Create the scene** in `src/scenes/<Name>.ts`, modelled on the closest existing one (`Ride.ts`, `OrbitOps.ts`, `DualCount.ts` and `ArcLab.ts` are the reusable examples). It receives `{ def }` in `init`, reads everything about the level from `def.params`, and ends with one call to `finish()`.
2. **Register it**: add the mechanic id to `SCENE_FOR` in `src/core.ts` and to the `mechanic` union in `src/content.ts`, add the class to the scene list in `src/main.ts`, and give it a label in `PLAY` in `scripts/readme-levels.mjs` (the README's level table; `npm run readme` stops on a mechanic without one).
3. **Keep the art swappable.** Put anything that changes from one setting to another (backdrop keys, music, goal prop, hazard names) in a theme table inside the scene, like `THEMES` in `src/scenes/Platform.ts`, and select it from `params.theme`.
4. **Follow the scene conventions** in the architecture doc: `held` / `just` for input, the update delta for time, `help()` for the controls panel, and a bot under `?auto=1` that reaches three stars.
5. **Document the params** in a new subsection of `docs/PROJECT_SPEC.md` §10, in the same form as §10.1a, and add the mechanic to the table in `docs/ARCHITECTURE.md`.

Done when a throwaway second level, using only different params, plays correctly and its bot reaches three stars. Delete the throwaway level before committing.
