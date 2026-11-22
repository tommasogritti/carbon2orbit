# Architecture

How Carbon to Orbit is put together, for people and agents about to change it. What to build and why lives in [PROJECT_SPEC.md](PROJECT_SPEC.md); this file is how the code works today. To add or change a level, follow [the add-level skill](../.claude/skills/add-level/SKILL.md).

## The shape of it

A static, client-only web game: Vite + TypeScript + Phaser 3, no server and no build-time content pipeline. Three ideas explain most of the code.

1. **A level is data.** Every node on the map is a `LevelDef` in `src/content.ts`: story text, sources, map position, and `mechanic` + `params`. The mechanic names a scene; the params tell that scene what to be.
2. **A mechanic is a scene.** Each kind of play is one file in `src/scenes/`, a Phaser scene that receives `{ def }`, plays it from `def.params`, and ends by calling `finish()`. Scenes know nothing about the map or each other.
3. **All art and sound are code.** Textures are drawn with the Canvas 2D API at boot (`src/art.ts`, `src/backdrops.ts`); sound effects and music are synthesised with Web Audio (`src/audio.ts`). The repository ships no sprite sheets and no audio files, so a contributor needs only a text editor.

```
index.html ─ src/main.ts ─ Boot ─┬─ Title ── Map ──(Enter on a node)── intro card ── <mechanic scene> ── finish() ── result card ─┐
                                 │            ▲                                                                                  │
                                 │            └──────────────────────────────── back to the map ─────────────────────────────────┘
                                 └─ ?level=<id> jumps straight to that level's scene
```

## Files

| Path | What it holds |
| --- | --- |
| `src/content.ts` | Every level, bonus node, person and character. The `LevelDef` type is the schema. |
| `src/core.ts` | Shared runtime: units and camera helpers, input, save, DOM cards, the controls panel, `finish()`, `SCENE_FOR` (mechanic id → scene key), developer mode. |
| `src/scenes/Map.ts` | The world map: trails, navigation, intro cards (`openLevel`). |
| `src/scenes/Title.ts` | The title screen. |
| `src/scenes/<Mechanic>.ts` | One scene per mechanic (table below). |
| `src/launchSim.ts` | The launch physics, pure TypeScript with no Phaser, shared by `Launch.ts` and `scripts/launch-sim.mjs`. |
| `src/creators.ts` | The four YouTube creators of the Q2 2024 interview: portraits, chips and the cast drawing. |
| `src/art.ts`, `src/backdrops.ts` | All textures. `art.ts` has the drawing helpers, characters, rockets, map; `backdrops.ts` has level backdrops, enemies, power-up bubbles. |
| `src/hifi.ts`, `src/hifiLooks.ts` | The optional hi-fi layer: parallax depth, lighting, reflections and a post pass (`hifi.ts`), and the looks that use it (`hifiLooks.ts`). See [The hi-fi layer](#the-hi-fi-layer). |
| `src/audio.ts` | `snd.*` one-shot effects, `loop(kind)` continuous sounds, `music.play(song)`. |
| `src/soundtracks.ts` | The three alternative soundtracks (`T` in the game): for each, a tune for every song name plus the instruments that play it. `audio.ts` holds the default score and the switch. |
| `src/leaderboard.ts`, `src/version.ts` | Score, the leaderboard card, the game version and season. |
| `src/contributors.ts` | The list of contributors, the repository link and the credits card (`C`, or Credits in the footer). |
| `leaderboard/` | The optional Cloudflare Worker and the scoring rules it shares with the game. |
| `public/assets/photos/` | Freely licensed photos for story cards, with `CREDITS.md`. |
| `docs/PROJECT_SPEC.md` | The brief: requirements, the level table (§9), each mechanic's params (§10), the fan-review log (§12.1). |

## Mechanics

`mechanic` on a level picks the scene through `SCENE_FOR` in `src/core.ts`. Params for each are documented in the spec section listed.

| Mechanic | Scene file | What the player does | Spec |
| --- | --- | --- | --- |
| `platform` | `Platform.ts` | Run, jump, collect parts, reach a goal; enemies, power-ups, a hidden blueprint | §10.1a |
| `launch` | `Launch.ts` + `launchSim.ts` | Call the count, fly pitch and throttle, command the sequence, reach orbit; also sounding rockets, kick-stage plans, payload deployment, suborbital flights | §10.1, §10.2c |
| `ride` | `Ride.ts` | Side-on riding over terrain | §10.9 |
| `orbit-ops` | `OrbitOps.ts` | Spacecraft burns on a ground-track map | §10.10 |
| `dual-count` | `DualCount.ts` | Two launch consoles against one clock | §10.11 |
| `arc-lab` | `ArcLab.ts` | Set conditions, run an experiment | §10.12 |
| `edit-bay` | `EditBay.ts` | Cut a recording into parts, send each to the right channel, schedule uploads before release times | §10.13 |
| `hotfire`, `heli-catch`, `orbit-raise`, `sprint`, `fault-finder`, `splashdown`, `cruise`, `countdown-race` | one file each | Single-purpose mini-games | §10.2 to §10.8 |

The first six, and `edit-bay`, are **reusable**: a second level can use them with different params and art. A level can also be told in several acts: `params.then = { mechanic, params, intro?, how? }` hands a successful act to the next scene, and nothing is saved until the last act ends.

## Conventions every scene follows

- **Units.** The world is 320 × 180 units, rendered at 1280 × 720 (`D = 4` texture pixels per unit, `S = 1 / D`). Call `cam(this)` for a single-screen scene. Draw textures with `tex(scene, key, w, h, fn)` in units; place them with `img()`; write text with `T()`.
- **Scrolling scenes** zoom the camera by `D`, so a HUD object pinned with scroll factor 0 must be wrapped in `fix()`.
- **Input** comes from `held(key)` and `just(key)` in `core.ts`, never from Phaser's keyboard plugin. Keys are `left right up down a b` (arrows or WASD, Space or Z, Enter or X), which is also what the touch pad sends.
- **Time** comes from the `update(time, delta)` delta or scene timers, never from the wall clock: the controls panel pauses and resumes scenes at any moment, and the player can run a level at ×0.5 to ×4.
- **Ending.** Call `finish(scene, def, { success, stars, title, text, egg?, secret? })` exactly once. It saves, shows the result card with "what really happened", and returns to the map.
- **Controls panel.** Give the scene a `help()` method returning `{ title, rows: [keys, does][], note? }`, reflecting the level and the phase. Simple scenes can use an entry in `CONTROLS` in `core.ts` instead.
- **A bot.** When the page has `?auto=1`, the scene plays itself to a three-star finish. This is how a level is shown to be winnable; `&fast=6` runs it six times faster.
- **Starting a scene.** Always pass data to `scene.start(key, data)`. Phaser reuses the previous data when none is given.

## The hi-fi layer

A scrolling level can opt into a cinematic look without changing how it plays. `going-public` is the first: Long Beach at first light through a glass wall, with every object and word the plain backdrop had.

- **Opting in.** A platform theme names a look: `hifi: '<name>'` in `THEMES` (`Platform.ts`). A look is an entry in `LOOKS` (`src/hifiLooks.ts`): its parallax layers, tile set, lights, colour grade, and its own moving parts. The engine is `src/hifi.ts`. A theme without a look renders exactly as before.
- **What the scene calls.** `hifi(scene, look, world)` first in `create()`, then `backdrop()` in place of the plain layers, `tiles` for the tile set, `actor(sprite)` for each enemy and running mate, `glow(sprite, tint)` for pickups and sparks, and `ready({ hero, solids, props })` last. The layer steps itself on the scene's `postupdate` event and cleans up on `shutdown`.
- **Art.** Still drawn in code, lazily, the first time a level uses the look. `texAt()` draws a texture at any resolution: far layers are drawn coarse on purpose, which reads as depth of field. A look keeps its glass and its room on separate layers so light shafts fall between them and never wash out text.
- **Lighting.** Phaser's Light2D pipeline on the ground, the hero, enemies and props. Normal maps are generated: `bevelNormals()` from a texture's outline, `paintNormals()` by hand for tiles. Lights that belong to a backdrop layer give that layer's width (`w`) and ride with it.
- **The hero** is drawn by a stand-in image that copies the physics sprite each step and adds squash, stretch, lean and dust. Enemies get a shadow, a floor reflection and a rocking walk by rotation only. Nothing here may scale or move a physics body: that is what keeps the bot's run identical.
- **Post pass.** One `PostFXPipeline` on the play camera: thresholded bloom at half size, split-tone grade, vignette, grain, a little lens fringing. The HUD moves to a second camera so the pass never touches it: `ready()` sends everything with scroll factor 0 there.
- **Fallbacks.** Without WebGL the layers, shadows, reflections and animation stay, and lighting and the post pass are skipped. Players choose high or standard graphics with `G` or the HD/SD button (`hifiOn()` in `src/core.ts`, remembered, high by default; the choice applies from the next start of a level). `?hifi=0` turns the layer off for one visit; `?renderer=canvas` forces the Canvas renderer to check the fallback.
- **Budget.** The look must hold the display's refresh rate at 1280 × 720: measure frame intervals over 20 s or more with the level running, and compare with `?hifi=0`.

## Cards and text

Story, intro, result, leaderboard and controls are DOM cards over the canvas (`showCard(html, buttons, photo?)` in `core.ts`), so long text, links and photos stay crisp and selectable. Enter confirms the first button. While a card is open, game input is off.

## Save, score and version

- **Save** is one `localStorage` object (`carbon-to-orbit-save`): stars per level, easter eggs found, secrets unlocked, people met, where the marker stands.
- **Game speed.** `+` and `−` change how many game steps each screen frame takes while a level is running (`speed()` in `core.ts`, applied by the loop wrapper in `main.ts`). Every step is still a normal 60 Hz step, so a scene needs no changes to support it.
- **Score** is derived from the save by `tally()` in `src/leaderboard.ts`, using the points in `leaderboard/src/rules.js`. `finish()` records each level's best points: stars × 100, scaled by the average speed of that run (`speedFactor`).
- **Version** comes from `package.json` (`VERSION`); its major.minor is the **season**. Scores are only comparable within a season, so bump the minor version whenever levels are added or points change.
- **Leaderboard** is optional. With `VITE_LEADERBOARD_URL` set, the card reads and writes a Cloudflare Worker ([leaderboard/README.md](../leaderboard/README.md)); `npm run dev` serves a stand-in at `/__lb`; with neither, the card shows only your own score.

## Rules the code enforces by convention

- **Fan project.** Official mission patches are in `src/assets/patches/`, listed with their mission and source page in `patches.json`; `patchImg()` shows them on a level's cards with a credit and link, and the launch scene puts the first one on the fairing. No other Rocket Lab logos or media are committed: official photos appear only from a player's own files in the git-ignored `src/assets/official/`. `?clean=1` leaves both out.
- **Facts carry sources.** Every level lists `sources`; text about real people states facts, never invented speech.
- **Peter Beck is the main character.** Another person leads a level through `hero`, or joins as a running mate through `params.buddy` (spec §7.0a).

## Testing and tools

| Command or URL | Use |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Type-check and build; must pass before a commit |
| `npm run sim` | Fly the launch physics headless with the autopilot and print timelines and margins |
| `?level=<id>` | Jump straight into a level |
| `?level=<id>&auto=1` | Let the bot play it; `window.__g2o.last` holds the result |
| Developer mode (footer switch or `?dev=1`) | Every node open; `K` skips a level |
| `?hifi=0`, `?renderer=canvas` | Play a hi-fi level with the plain look; force the Canvas renderer |
| `window.__g2o` | Test hooks: `game`, `save`, `LEVELS`, `scene()`, `go(id)`, `last`, `closeCard()` |

Test in a visible browser tab: a hidden tab pauses the game loop.
