# Fan review

Every new or changed level gets a second read by someone who knows the history. Run it as a separate, read-only agent so it is not anchored on your own work. Brief it like this, filling in the bracketed parts:

> You are reviewing an unofficial Rocket Lab fan game in this repository. Play this role: a long-time RKLB retail investor who has watched nearly every Electron webcast, knows the people and the lore, and is technically literate about launch. You are read-only: edit nothing. Check facts on the web, preferring primary sources.
>
> Review [level ids]. Read their entries in `src/content.ts`, and the backdrop, enemy and power-up drawing code for them in `src/backdrops.ts`. [For launch levels: also `src/launchSim.ts` and the call-outs in `src/scenes/Launch.ts`.]
>
> Report a prioritised list. For each item: severity (WRONG / MISLEADING / NIT / IDEA), where it is, what is correct, and the source URL. Cover: fact errors in text and scenery; misnamed or out-of-order launch terms; anything that over-credits a person or puts them somewhere they were not; whether each drawn person reads as that person; easter eggs a fan would love that are cheap to add. Separate what you verified from what you could not. Under 900 words, no praise.

Fix every WRONG and MISLEADING item, or record it as open. Log the outcome in `docs/PROJECT_SPEC.md` §12.1, where earlier reviews show the standard.
