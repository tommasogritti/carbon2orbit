---
name: add-level
description: Add or update a level in Carbon to Orbit. Use when asked to add, change or fix a level, story card, person to meet, easter egg, enemy, power-up, backdrop, to give a level the hi-fi (cinematic) graphics, or to build a new kind of gameplay (mechanic).
---

# Add or update a level

A level here is a **chapter**: one real moment in Rocket Lab's history, told through play. Every chapter must be true, must look like its own place, and must give the player something no other chapter does.

How the code works is in [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md). Read it once before the first step.

## Steps

1. **Research the chapter.** Find what happened, when, where and who, from primary sources (Rocket Lab's own pages, filings, Wikipedia with its citations, established space press). Look up anything recent instead of trusting memory. Done when every fact you intend to put on screen has a source URL, and each thing you could not confirm is written down as open.

2. **Decide how it plays.** Read the level table in `docs/PROJECT_SPEC.md` §9 and the mechanics table in the architecture doc. Reuse a mechanic when the chapter fits it; build a new one when the story is better served by a kind of play the game lacks (then follow [NEW-MECHANIC.md](NEW-MECHANIC.md)). Done when you can say in one sentence what the player does here that they do in no other level.

3. **Write the level as data.** Add a `LevelDef` to `LEVELS` in `src/content.ts`, in story order, following a neighbouring level of the same mechanic. Place it on the map with the `nz()` or `us()` projection in `src/art.ts`. Done when `intro`, `how`, `fact`, `after`, `egg`, `sources` and `params` are filled, and `after` says what really happened.

   **A level about a Rocket Lab mission gets its patch.** Find the mission's page on rocketlabcorp.com/missions/launches (the address does not always match the mission name: search the launches list by name). The patch is the page's `/assets/Uploads/…` image, usually with "Patch" in its name; the site answers scripts with 403 but serves the image itself to `curl`. Save it 256 px tall as `src/assets/patches/<level id>.png` (`sips -s format png --resampleHeight 256 <download> --out <file>`) and add the level to `src/assets/patches/patches.json` with the mission name and page. A level with two missions lists two files. Done when the level's opening card shows the patch with its credit and source link.

4. **Give the chapter its own world.** Draw what the level needs in `src/backdrops.ts` or `src/art.ts` with the canvas helpers:
   - a backdrop built from things that were really there, read left to right as a walk through the chapter (a platform theme can also take the cinematic hi-fi look: follow [HIFI.md](HIFI.md));
   - on platform levels: enemies and power-ups that belong to this chapter, each explained by a fact, and each power-up changing how the character looks as well as what they can do;
   - an easter egg with a sourced fact, and on exploratory levels a hidden blueprint that unlocks a secret node (`unlocks`, plus an entry in `BONUS`).
   Done when a screenshot of the level could not be mistaken for any other level.

5. **Make it winnable and explain itself.** Run `?level=<id>&auto=1` in a visible browser tab and read `window.__g2o.last`. Open the controls panel with `H` at each phase. Done when the bot finishes with three stars, existing levels of the same mechanic still do, `npm run build` passes (and `npm run sim` for launch changes), and the panel lists every key the level uses.

6. **Have a fan check it.** Run the review in [FAN-REVIEW.md](FAN-REVIEW.md) with a separate read-only agent and apply what it finds. Done when every WRONG and MISLEADING finding is fixed or recorded as open in spec §12.1.

7. **Record it.** Add or update the row in spec §9 and any new params in spec §10. Run `npm run readme`: it rewrites the README's level table and the level counts (README badge, About text in `index.html`) from `src/content.ts`; a new mechanic first needs its label in `PLAY` in `scripts/readme-levels.mjs`. Done when `npm run readme -- --check` passes and the new level has its row in the README. Bump the minor version in `package.json`, because new levels start a new leaderboard season. Commit with a message that names the level.

## Rules

- **Fan project.** Official Rocket Lab mission patches are the one piece of Rocket Lab artwork the repository carries, each credited and linked to its source. Every other photo must be freely licensed and credited in `public/assets/photos/CREDITS.md`; Rocket Lab's logos, photos and video stay out, and video is linked, never copied.
- **Real people.** Show them in their public role, state facts with sources, and write no speech for them. A person appears as a guest lead (`hero`), a running mate (`params.buddy`) or someone to meet (`PEOPLE`); Peter Beck remains the main character. Draw a new character to the likeness rules in spec §7.0.
- **Where sources disagree,** say less on screen and list the question as open in spec §12.1.
- **Launch control** is written for players who know the vocabulary. Keep terms, sequence and timings true to the webcasts; game-only limits are documented as such in spec §10.2c.

## Updating an existing level

Start at step 1 for any fact you change, then steps 5 to 7. A text-only fix still needs its source and a build.
