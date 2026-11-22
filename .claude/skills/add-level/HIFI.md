# Give a level the hi-fi look

The hi-fi layer is a cinematic look any level can opt into: deep parallax with haze, Light2D lighting with generated normal maps, reflections, particles and one post pass (bloom, grade, vignette, grain, heat shimmer). How it works is "The hi-fi layer" in [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md). Read it, and the worked example for your kind of scene, before step 1:

| Scene | Worked example | Look |
| --- | --- | --- |
| Platform | `going-public` (indoors, dawn), `workshop` (indoors, night), `lc-1` (outdoors, storm), `factory` (indoors, a bright hall by day) | `listing` in `src/hifiLooks.ts`, `src/looks/workshop.ts`, `src/looks/mahia.ts`, `src/looks/factory.ts` |
| Launch control | `atea-1` (its own site), `its-a-test` (a site shared by many flights: one drawing, a `Day` of light per flight) | `src/looks/mercury.ts`, `src/looks/lc1.ts`; the way up is shared in `src/looks/flight.ts` |
| A single-screen mini-game | `rutherford`; `return-to-sender` (one fall through three lights: the look moves its own grade and ambient with the altitude) | `src/looks/stand.ts`, `src/looks/reentry.ts` |
| A scene that is all interface | `pics-or-it-didnt-happen` (panels and graphs stay in the world and glow; words go to the HUD), `four-channels` (the same, with a room lit by its own lamps and faces kept on the HUD), `seven-diaries` (a window that keeps the level's clock) | `src/looks/review.ts`, `src/looks/edit.ts`, `src/looks/diary.ts` |
| A pad seen on a console, round the clock | `two-hemispheres` (two pictures, each under its own local time; the room is a bezel laid over them), `victus-haze` (one picture, a winter day from before dawn to a night launch) | `src/looks/twopads.ts`, `src/looks/haze.ts`; the pad picture is shared in `src/looks/padview.ts` |
| Ride | `find-the-launch-site` | `src/looks/farm.ts` |
| The title screen | `Title.ts` (space redrawn, the rocket lit by Light2D, every word on the HUD camera) | `src/looks/title.ts` |
| The world map | `Map.ts` (sea and land on separate layers; names, pins, nodes and tags untouched) | `src/looks/map.ts` |

The look changes how a level looks, never what it says or how it plays.

## Steps

1. **Take the before shots.** Start the dev server, open `?level=<id>` in a visible Chrome tab and capture the game canvas at three fixed moments (start, middle, the level's set piece) with `__g2o.game.renderer.snapshot`, posted to `/__rec?ext=jpg&name=hifi-before-<id>-<moment>`. Done when the three files are in `recordings/`.

2. **Choose the light.** Pick a time of day and weather the chapter really had (`going-public` is dawn because the bell rang at 9:30 a.m. New York, 6:30 a.m. in Long Beach). Done when the choice has a source or follows from one.

3. **Write the look.** Write it in `src/looks/<name>.ts`, list it in `LOOKS` (`src/hifiLooks.ts`) and name it from the scene (a platform or ride theme's `hifi: '<name>'`; `SITE_LOOK` or `LEVEL_LOOK` in `Launch.ts`; `LOOK` in `Hotfire.ts`, `FaultFinder.ts`, `DualCount.ts` or `CountdownRace.ts`; a theme's `hifi: '<name>'` in `EditBay.ts` or `SlotFinder.ts`). Build the backdrop from the same drawing code as the plain one, so every object and word stays: give the plain function a `part` argument with `parts()` (`art.ts`) and draw its shell, its things and its lights separately, back to front. Keep text-bearing layers in front of light shafts. Done when the level's plain objects and text all appear in the after shot.

   **A scene the layer has not met yet** opts in with a few lines, never a second engine: call `hifi(this, LOOKS[…])` first in `create()`; ask for each backdrop texture through `hf.key()` so the look can redraw it; `hf.tag()` the objects a look needs to slot its own between; `hf.set()` the numbers the look animates from, each step; end `create()` with `hf.ready({ hud: [...] })`, naming everything that must stay crisp. Then add the scene to the table in the architecture doc.

4. **Prove it plays the same.** Run `?level=<id>&auto=1` and read `window.__g2o.last`: three stars, as before. Run one other level of the same mechanic the same way and confirm it is unchanged with no hi-fi objects alive. Done when both bots finish with three stars and `npm run build` passes.

5. **Prove it runs.** Measure `game.loop.actualFps` (or frame intervals) over 20 s or more with the player moving, with the look on and with `?hifi=0`. Done when the look holds the display's refresh rate, and the numbers are in your report.

6. **Check the fallbacks.** Press `G` (standard graphics) and restart the level, or open `?hifi=0`: it must look exactly like the plain theme. Compare a shot with your before shot: a plain backdrop function that gained a `part` argument is the usual way to break this (`tex()` passes the width as the second argument, so register it as `(c) => fn(c)`). Open `?renderer=canvas`: layers and animation stay, lighting and the post pass are skipped, nothing breaks. Done when both are checked.

7. **Show it.** Take the after shots at the same three moments (`hifi-after-<id>-<moment>`) and put each pair in front of the owner. Commit with a message that names the level.

## Rules

- **Everything is drawn in code.** No downloaded images, textures or fonts.
- **Never scale or move a physics body** for an effect; animate a stand-in or rotate. That keeps the bot's run identical.
- **The HUD stays crisp:** anything with scroll factor 0 goes to the HUD camera via `ready()`; a single-screen scene names its HUD in `ready({ hud })`.
- **Looks read `hf.state`, not the scene.** If a look needs a number, the scene hands it over with `hf.set()`.
- **A quality bar, not a copy.** Aim for the polish of a modern big-budget game; use no other game's logos, fonts, characters, interface or recognisable art.
