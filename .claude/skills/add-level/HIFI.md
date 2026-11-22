# Give a level the hi-fi look

The hi-fi layer is a cinematic look a platform theme can opt into: deep parallax with haze, Light2D lighting with generated normal maps, reflections, particles and one post pass (bloom, grade, vignette, grain). How it works is "The hi-fi layer" in [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md); `going-public` (look `listing` in `src/hifiLooks.ts`) is the worked example. Read both before step 1.

The look changes how a level looks, never what it says or how it plays.

## Steps

1. **Take the before shots.** Start the dev server, open `?level=<id>` in a visible Chrome tab and capture the game canvas at three fixed moments (start, middle, the level's set piece) with `__g2o.game.renderer.snapshot`, posted to `/__rec?ext=jpg&name=hifi-before-<id>-<moment>`. Done when the three files are in `recordings/`.

2. **Choose the light.** Pick a time of day and weather the chapter really had (`going-public` is dawn because the bell rang at 9:30 a.m. New York, 6:30 a.m. in Long Beach). Done when the choice has a source or follows from one.

3. **Write the look.** Add an entry to `LOOKS` in `src/hifiLooks.ts` and name it in the theme (`hifi: '<name>'` in `THEMES`, `Platform.ts`). Build the backdrop from the same drawing code as the plain one, split into layers back to front, so every object and word stays. Keep text-bearing layers in front of light shafts. Done when the level's plain objects and text all appear in the after shot.

4. **Prove it plays the same.** Run `?level=<id>&auto=1` and read `window.__g2o.last`: three stars, as before. Run one other platform level the same way and confirm it is unchanged with no hi-fi objects alive. Done when both bots finish with three stars and `npm run build` passes.

5. **Prove it runs.** Measure `game.loop.actualFps` (or frame intervals) over 20 s or more with the player moving, with the look on and with `?hifi=0`. Done when the look holds the display's refresh rate, and the numbers are in your report.

6. **Check the fallbacks.** Press `G` (standard graphics) and restart the level: it must look exactly like the plain theme. Open `?renderer=canvas`: layers and animation stay, lighting and the post pass are skipped, nothing breaks. Done when both are checked.

7. **Show it.** Take the after shots at the same three moments (`hifi-after-<id>-<moment>`) and put each pair in front of the owner. Commit with a message that names the level.

## Rules

- **Everything is drawn in code.** No downloaded images, textures or fonts.
- **Never scale or move a physics body** for an effect; animate a stand-in or rotate. That keeps the bot's run identical.
- **The HUD stays crisp:** anything with scroll factor 0 goes to the HUD camera via `ready()`.
- **A quality bar, not a copy.** Aim for the polish of a modern big-budget game; use no other game's logos, fonts, characters, interface or recognisable art.
