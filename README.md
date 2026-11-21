# Carbon to Orbit

An unofficial, open-source browser game that tells the story of Rocket Lab one level at a time, from a rocket bike in a New Zealand workshop to the 100th Electron and on to Neutron.

**Fan project, not affiliated with Rocket Lab.**

This is an early draft. The full brief is in [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md).

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints. Arrow keys walk the world map, Enter opens a node.

| Kind | Draft levels |
| --- | --- |
| Platform | The Rocket Bike, Road to Māhia, RKLB rings the bell (played as Adam Spice, with Peter as a running-mate power-up) |
| Launch control | Ātea-1, It's a Test, Still Testing, The Mountain God Rises |
| Mini-game | Rutherford hot-fire, There And Back Again (helicopter catch), CAPSTONE to the Moon |
| Story card | Rocket Lab is founded, Sir Peter, Neutron (locked teaser) |
| People to meet on the map | Mark Rocket and Sir Stephen Tindall, Ky Michaelson, Sir Michael Fay, Dava Newman, Adam Spice |
| Secret (find the hidden blueprint) | Princes Street Sprint (bonus mini-game), Kaitorete Spit (bonus card) |

Peter Beck is the main character throughout; a level can hand the lead to someone else (Adam Spice has the Nasdaq listing).

Press `H` (or the `?` button, top right) at any moment to pause and see the controls for whatever you are playing, or for the map.

Controls: arrows or WASD to move, Space (A) to jump / burn, Enter (B) to confirm, M to mute. Launch control: ← → pitch (keep the white needle on the green cue), ↑ ↓ throttle, Space commands the next event (lift-off, separation, stage-2 ignition, fairing, hot-swap), Enter holds the count or commands SECO; then hold Space to burn the kick stage at apogee and Enter to deploy. Ātea-1 is unguided: ↑ ↓ aim the rail, Space starts the count and releases the dart. Sound and music are synthesised in code (`src/audio.ts`) and start after your first key press. A touch pad appears on phones.

## Mission patches (optional, local only)

The game shows a mission's patch on the rocket's fairing, on the launch console and on that level's cards when a file named `<level id>.png` exists in `src/assets/patches/`. Those patches are Rocket Lab's artwork, so the folder is git-ignored and nothing in it is part of this repository; without the files the game simply runs without patches. To add them for your own play, save the patch from the mission's page under https://rocketlabcorp.com/missions/launches/ as, for example, `src/assets/patches/its-a-test.png` (about 256 px is plenty).

The same goes for official photos: a file `src/assets/official/<level id>.jpg` is shown on that level's cards when the level has no freely licensed photo of its own, credited to Rocket Lab. Their Flickr (https://www.flickr.com/photos/rocketlab/) says images may be downloaded with credit, but they are all rights reserved, so this folder is git-ignored as well. An optional `manifest.json` beside the photos gives each one a title and its Flickr page.

## Useful URLs while developing

- Developer mode (the switch in the page footer, or `?dev=1` in the address) opens every node on the map and turns on skipping: `K` on the map marks the level under the marker as done, `K` inside a level ends it at once as a one-star pass, and each level's intro card gets a "Skip (dev)" button
- `?level=<id>` jumps straight into a level, for example `?level=capstone`
- `?level=<id>&auto=1` lets a bot play it, platform levels included (used to check each level can be won)
- `npm run sim` flies the launch physics headless with bots
- `?level=<id>&auto=1&rec=<name>` also records the run (dev server only) to `recordings/<name>.webm`; the folder is git-ignored

## Credits and licences

Code: MIT. Text and artwork: CC BY-SA 4.0. All game art is drawn in code in `src/art.ts` (1280×720 render, 320×180-unit world). Photos on story cards are freely licensed images from Wikimedia Commons, listed with authors and licences in [public/assets/photos/CREDITS.md](public/assets/photos/CREDITS.md).
