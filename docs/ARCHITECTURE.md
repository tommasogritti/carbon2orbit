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
| `scripts/readme-levels.mjs` | `npm run readme`: writes the README's level table and the level counts from `src/content.ts`; `-- --check` fails when they are out of date. |
| `src/creators.ts` | The YouTube creators of the Q2 2024 and Q1 2026 interviews (Mrs. Iglesias, who leads the Q1 2026 level, among them): portraits, chips and the cast drawings. |
| `src/art.ts`, `src/backdrops.ts` | All textures. `art.ts` has the drawing helpers, characters, rockets, map; `backdrops.ts` has level backdrops, enemies, power-up bubbles. |
| `src/hifi.ts`, `src/hifiLooks.ts`, `src/looks/` | The optional hi-fi layer: parallax depth, lighting, reflections and a post pass (`hifi.ts`), the list of looks (`hifiLooks.ts`) and one file per look (`looks/`). See [The hi-fi layer](#the-hi-fi-layer). |
| `src/audio.ts` | `snd.*` one-shot effects, `loop(kind)` continuous sounds, `music.play(song)`. |
| `src/soundtracks.ts` | The three alternative soundtracks (`T` in the game): for each, a tune for every song name plus the instruments that play it. `audio.ts` holds the default score and the switch. |
| `src/leaderboard.ts`, `src/version.ts` | Score, the leaderboard card, the game version and season. |
| `src/contributors.ts` | The list of contributors, the repository link and the credits card (`C`, or Credits in the footer). |
| `src/stats.ts` | Anonymous play counts: a beacon to the leaderboard Worker's `POST /events` when a level starts (Map's Start button) and ends (`finish()`). |
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
| `slot-finder` | `SlotFinder.ts` | Slide and stretch one meeting across several half-hidden diaries, send invitations, and fit the follow-up work in before a release time | §10.14 |
| `hat-trick` | `HatTrick.ts` | Act one: stay in a moving camera frame while gathering things to wear and carry. Act two: a dish made by hand at a table: steer scissors along cut lines, pulse a blender in time, pour to a line against a lag, taste | §10.15 |
| `fit-out` | `FitOut.ts` | Act one: a gantry crane with a swinging load sets a list of things on their marks on a hull that trims as the weight goes on. Act two: hold the fitted hull in a series of boxes on its thrusters, against wind | §10.16 |
| `hotfire`, `heli-catch`, `orbit-raise`, `sprint`, `fault-finder`, `splashdown`, `cruise`, `countdown-race` | one file each | Single-purpose mini-games | §10.2 to §10.8 |

The first six, `edit-bay`, `slot-finder`, `hat-trick` and `fit-out` are **reusable**: a second level can use them with different params and art. A level can also be told in several acts: `params.then = { mechanic, params, intro?, how? }` hands a successful act to the next scene, and nothing is saved until the last act ends.

## Conventions every scene follows

- **Units.** The world is 320 × 180 units, rendered at 1280 × 720 (`D = 4` texture pixels per unit, `S = 1 / D`). Call `cam(this)` for a single-screen scene. Draw textures with `tex(scene, key, w, h, fn)` in units; place them with `img()`; write text with `T()`.
- **Scrolling scenes** zoom the camera by `D`, so a HUD object pinned with scroll factor 0 must be wrapped in `fix()`.
- **Input** comes from `held(key)` and `just(key)` in `core.ts`, never from Phaser's keyboard plugin. Keys are `left right up down a b` (arrows or WASD, Space or Z, Enter or X), which is also what the touch pad sends.
- **Time** comes from the `update(time, delta)` delta or scene timers, never from the wall clock: the controls panel pauses and resumes scenes at any moment, and the player can run a level at ×0.5 to ×4.
- **Ending.** Call `finish(scene, def, { success, stars, title, text, egg?, secret? })` exactly once. It saves, shows the result card with "what really happened", and returns to the map.
- **Controls panel.** Give the scene a `help()` method returning `{ title, rows: [keys, does][], note? }`, reflecting the level and the phase. Simple scenes can use an entry in `CONTROLS` in `core.ts` instead.
- **Hints (optional).** A hard puzzle can give the scene a `hint()` method returning the next hint for where the player is, `{ title, text, cost? }`, or `undefined` when none is left; it may charge for each hint in the level's own currency (the flight 13 investigation charges a day, the slot finder half an hour of clock). The 💡 button and `I` appear only in scenes that have one. Every level also gets the ⌂ button and `Esc`, which ask, then return to the map without saving the run.
- **A bot.** When the page has `?auto=1`, the scene plays itself to a three-star finish. This is how a level is shown to be winnable; `&fast=6` runs it six times faster.
- **Starting a scene.** Always pass data to `scene.start(key, data)`. Phaser reuses the previous data when none is given.

## The hi-fi layer

Any level can opt into a cinematic look without changing how it plays. `going-public` was the first: Long Beach at first light through a glass wall, with every object and word the plain backdrop had. There is one engine (`src/hifi.ts`) for every kind of scene; a scene uses the parts that fit it.

- **Opting in.** The scene names a look, the same way it picks its plain art. A platform theme: `hifi: '<name>'` in `THEMES` (`Platform.ts`). Launch control: by site, in `SITE_LOOK` (`Launch.ts`), or by level in `LEVEL_LOOK` where flights from one site each have their own light (Launch Complex 1: `src/looks/lc1.ts` is one site drawing and a `Day` of sun, sky and colour per flight). The hot-fire stand: `LOOK` in `Hotfire.ts`; the fault finder: `LOOK` in `FaultFinder.ts`; the two counts: `LOOK`, by theme, in `DualCount.ts`; the countdown race: `LOOK` in `CountdownRace.ts`; the edit bay and the slot finder: `hifi: '<name>'` in their `THEMES` (`EditBay.ts`, `SlotFinder.ts`); the hat trick: `hifi: { walk, table }` in its `THEMES` (`HatTrick.ts`), one look per act. A ride theme: `hifi: '<name>'` in `THEMES` (`Ride.ts`). A look is an entry in `LOOKS` (`src/hifiLooks.ts`), written in its own file in `src/looks/` (`listing`, the first, is still in `hifiLooks.ts`): its layers or redrawn textures, tile set, lights, colour grade, and its own moving parts. A scene without a look renders exactly as before.
- **What every scene calls.** `hifi(scene, look, world?)` first in `create()`; it returns nothing when there is no look or the player chose standard graphics, so every later call is `hf?.…`. Last, `ready({...})`. The layer steps itself on the scene's `postupdate` event and cleans up on `shutdown`.

  | Scene | `world` | Hooks it uses |
  | --- | --- | --- |
  | Platform | `{ LW, TS, ground, plats }` | `backdrop()` in place of the plain layers, `tiles`, `actor(sprite)` for enemies and running mates, `glow(sprite, tint)` for pickups, `flare(sprite)` for things that give off light (vents, dropper arms, the goal), `tag()` for scene props a look restyles (Māhia's drifting clouds), `ready({ hero, solids, props, deco })` |
  | Launch control (single screen) | none | `key('sky_day')` for each texture the look may have redrawn (`Look.swap`), `tag({ sky, ground, rocket, … })` so the look can slip its own sprites between the scene's, `set({ alt, base, burn, … })` each step, `ready({ hud, lateHud: true })` |
  | Hot-fire (single screen) | none | `backdrop()` (layers marked `lit` are lit by Light2D), `shade(engine)`, `tag({ glow, flame, engine })`, `set({ pc, on })` each step, `ready({ hud, lateHud: true })` |
  | Fault finder (single screen, all interface) | none | `key('bg_review')`; the room, the panels and the trace graphics stay in the world, so the post pass makes a glowing wall display of them, and every word goes to the HUD camera: `tag({ room, screen, traces })`, `set({ phase, cx, cy, run, prog, shown, bad, wrong })` each step, `ready({ hud, lateHud: true })` |
  | Two counts (single screen: two pad pictures over two consoles) | none | `key('site_mahia')`, `key('site_wallops')`; the pictures, the panels and the call lights stay in the world, every word goes to the HUD camera: `tag({ top, desk0, sky0, site0, flame0, rocket0, cover0, frame0, …, calls })`, `set({ l0, h0, r0, s0, c0, u0, … })` each step (daylight, local hour, the day's two ends, the call that is up and how late it is), `ready({ hud, lateHud: true })`. The look lays the room over the pictures as a bezel, so whatever leaves a display goes behind its housing |
  | Countdown race (single screen: a job board beside one pad picture) | none | `key('site_mahia')`; as the two counts: `tag({ sky, stars, site, vent, flame, rocket, cover, frame, top, list, rows })`, `set({ l, h, r, s, w0, w1, late })` each step (daylight, the local hour, the day's two ends, what each crew is doing), `ready({ hud, lateHud: true })` |
  | Edit bay (single screen, all interface, two acts) | none | `key('eb_room_<theme>')`, `key('eb_clock')`; the room, the panels, the clocks and the one graphics object (waveform, lanes, clock hands) stay in the world; every word and every face goes to the HUD camera: `tag({ room, top, tape, lanes, tray, g, clock0… })`, `set({ mode, amp, q, vel, cuts, render, s0…, p0… })` each step, `ready({ hud, lateHud: true })` |
  | Slot finder (single screen, all interface) | none | `key('sf_room_<theme>')`; as the edit bay: `tag({ room, top, grid, g, msg })`, `set({ now, st, bx, bw, nx, yes, no, chats, soon })` each step (the look's window keeps the level's clock), `ready({ hud, lateHud: true })` |
  | Hat trick (single screen, two acts, two looks) | none | `backdrop()`: each act's room as layers drawn from the plain room's parts (`walkHall`, `setHall`: hall, things, lamps), the things lit; `shade()` the props, the table and its plate, glass and jar; `actor(peter)` (lit, a normal map per walk frame); `tag({ peter, carry, prop0…, item0…, table, plate, glass, jar, cap, g })` (the close-up at the table is drawn into `g`, in the world); `set({ act, x, y, fx, fw, step, pulse, heat, fill, tilt, reach, got })` each step; `ready({ hud, lateHud: true })`, the viewfinder and every word on the HUD |
  | Map (scrolling, its own HUD camera) | `{ LW: MAPW, ownHud: true }` | `key('map')` and `key('cloud1')`…; `tag({ map, cloud0…, marker, ring })`; `glow(node)` for open nodes; `set({ moving })` each step; `ready()`. The scene keeps its own HUD camera (`ownHud`), and in hi-fi draws the trails once into a render texture, with a soft light under each open one |
  | Title (single screen) | none | `key('sky_night')`, `key('stars')`, `key('earthlimb')`; `shade(rocket body)`; `tag({ sky, stars, earth, star, smoke, flame, rocket })`; `set({ x, y, on })` each step (the look's `heroLight` is the plume); `ready({ hud })` with every word and mark |
  | Ride (scrolling, no tiles) | `{ LW, height, gaps }` | `backdrop()`; the look draws the ground itself from `world.height` and the scene hides its plain one; `glow(item)`, `tag({ bike })`, `set({ x, y, v, air, thr, rot })` each step, `ready({ props: [bike], deco })` |
  | Splashdown (single screen) | none | `key('stars')`, `key('sky_day')`, `key('earthlimb')`, `key('cloud1')`…, `key('sea')`; `shade()` the stage, the canopy and the ship; `tag({ stars, sky, sea, ship, ks, boo })` (the look adds its lit edges to the `boo` container); `set({ km, day, hot, th, chute, v, seaY, x, y, down })` each step; `ready({ hud })` |
  | Helicopter catch (single screen) | none | `key('sky_day')`, `key('cloud1')`…, `key('sea')`; `shade()` the stage, the canopy, the ship and the helicopter's body; `tag({ sky, sea, ship, boo, heli })` (the look's rotor disc, beacon and glint ride in the `heli` container); `set({ caught, wet, bx, kx, ky })` each step; `ready({ hud })` |
  | Orbit raising (single screen, a diagram) | none | `key('stars')`, `key('earth')`, `key('moon')`; the orbit graphics stay in the world and the apogee bar gets a graphics of its own on the HUD; `shade(craft)`; `tag({ stars, orbit, earth, moon, craft })`, and `tag({ sat })` when CAPSTONE is released; `set({ x, y, rot, fired, done })` each step; `ready({ hud })` with the panel, the bar and every word |
  | Orbit operations (single screen, a map) | none | a theme's `hifi: '<name>'` in `THEMES` (`OrbitOps.ts`); `key('stars')`, `key(theme.map)`; the map, the target, the track graphics and the spacecraft stay in the world; `tag({ stars, map, craft })`; `set({ t, phasing, lit, x, y, rot, dir, cap, cx, cy, calt })` each step; `ready({ hud })` with every panel and word (the look sends the map's own name to the HUD with `hud()`) |
  | Cruise (single screen, a diagram) | none | `key('stars')`, `key('earth')`, `key('mars')`; the route, the gates and the spacecraft stay in the world; `shade()` Blue and Gold; `tag({ stars, sun, earth, mars, blue, gold })`; `set({ x, y, rot, main, next, started, won })` each step; `ready({ hud })` with the panel and every word |
  | Street sprint (single screen, one tile scrolled fast) | none | `key('street')`: the look's own tile keeps the kerb and the road and leaves the sky and the buildings out, so they can pass more slowly behind it; `tag({ street, flag, car, bike })`, `set({ dist, v, thr })` each step, `ready({ hud })` |
  | Launch control after sunset | none | As launch control. A dusk or night flight names its evening in `EVE_LOOK` (`Launch.ts`): `src/looks/evening.ts` puts the site's plain drawing in the dark under its own lamps (a `Pad`) with a sky for the hour (an `Eve`), and the scene leaves its dusk and night tints off. A dusk or night flight without one keeps the plain look. |
  | Platform, test positions | as Platform | `tag({ fire0, fire1 })` for the stands and `set({ fire0, fire1 })` each step, so a look can light the place while an engine burns (`src/looks/stennis.ts`) |

- **The HUD stays out of the post pass** on a camera of its own. A scene that already has a HUD camera (the map) says `ownHud` in its `world`, and the layer adds none. A scrolling scene's HUD is found by scroll factor 0. A single-screen scene has no scroll factors, so it names its HUD: `ready({ hud: [...] })`, and `lateHud: true` when whatever it adds later is HUD too.
- **Scene state.** `hf.set({...})` hands the look the numbers it animates from (altitude, throttle, chamber pressure); the look reads `hf.state` in `step()`. This keeps looks out of the scene's fields. A scene with no hero sprite gives the lead's place as `x`, `y`, and the look's `heroLight` follows that. The looks that are out in space share their sky and their Earth (`deepSky()`, `earthLit()`, `earthShade()`, `clouds` in `src/looks/cislunar.ts`). What every launch look shares on the way up (plume, pad dust, glitter, lens, the sky going black, stars, the Earth's edge) is `src/looks/flight.ts`: `spaceTextures()`, `SPACE`, `ascentLive()`, `ascentStep()`. What a half-size pad picture on a console does round the clock (two skies crossing over with the scene's daylight, sunrise and moonrise in frame, floodlights after dark, a lift-off that lights the pad) is `src/looks/padview.ts`: `padTextures()`, `padView()`, `padStep()`. `hf.heat(x, y, r, amount)` bends the picture over a flame; `hf.power(i, k)` turns one of the look's lights up or down.
- **Art.** Still drawn in code, lazily, the first time a level uses the look (`Look.build`). `texAt()` draws a texture at any resolution: far layers are drawn coarse on purpose, which reads as depth of field. To keep every object and word, a look redraws the plain backdrop with the plain backdrop's own function, in parts: `parts()` (`art.ts`) lets one function draw only its shell, its things, or what gives off light, in the same order as before (`workshop`, `listing`, `factory`, `mahiaFar`, `rideFar`, `drawSite`, `drawWallops`, `drawStand`, `review`, `drawMap`, `roomQ2`, `roomQ1`, `worldmap`; `planet` and `mars` take the direction of their light instead). `relight()` then puts a drawing in the dark and brings it back under each lamp; `sheet()` is a scratch canvas; `mirrorStrip()` makes a floor reflection. A look keeps its glass and its room on separate layers so light shafts fall between them and never wash out text.
- **Lighting.** Phaser's Light2D pipeline on the ground, the hero, enemies and props, when the look gives an `ambient`. Normal maps are generated: `bevelNormals()` from a texture's outline, `paintNormals()` by hand for tiles. Lights that belong to a backdrop layer give that layer's width (`w`) and ride with it. `Look.flares` gives a light to the scene's own things by texture (a welding arm's arc); `Look.deco` lights the standing props. A look may move its own lights in `step()` by changing their `x` (the sun patches crossing Māhia). Phaser lights ten at a time, the nearest to the camera: keep to that on any one screen.
- **The hero** of a platform level is drawn by a stand-in image that copies the physics sprite each step and adds squash, stretch, lean and dust. Enemies get a shadow, a floor reflection (`Look.mirror`) and a rocking walk by rotation only. Nothing here may scale or move a physics body: that is what keeps the bot's run identical.
- **Post pass.** One `PostFXPipeline` on the play camera: thresholded bloom at half size, split-tone grade, vignette, grain, a little lens fringing, and heat shimmer where the look asks for it.
- **Fallbacks.** Without WebGL the layers, shadows, reflections and animation stay, and lighting and the post pass are skipped. Players choose high or standard graphics with `G` or the HD/SD button (`hifiOn()` in `src/core.ts`, remembered, high by default). The map and the title screen rebuild at once; inside a level the game asks whether to restart the level now, or keeps the new choice for the next level started). `?hifi=0` turns the layer off for one visit; `?renderer=canvas` forces the Canvas renderer to check the fallback.
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
| Free play (`P`, ☰, footer switch or `?free=1`) | Every node open and a list to pick from (`showPicker` in `src/scenes/Map.ts`); `finish()` and the cards save nothing while `free.on` (`src/core.ts`) |
| Developer mode (footer switch or `?dev=1`, dev server only) | Every node open; `K` skips a level. `DEV` in `src/core.ts` is false in a production build, and the switch is removed |
| `?hifi=0`, `?renderer=canvas` | Play a hi-fi level with the plain look; force the Canvas renderer |
| `window.__g2o` | Test hooks: `game`, `save`, `LEVELS`, `scene()`, `go(id)`, `last`, `closeCard()` |

Test in a visible browser tab: a hidden tab pauses the game loop.
