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
| Platform | The Rocket Bike, Road to Māhia, Rosie the Robot (conveyors), RKLB rings the bell (played as Adam Spice, with Peter as a running-mate power-up), Archimedes and the tank (in progress: playable up to where the story has got to) |
| Launch control | Ātea-1, It's a Test, Still Testing, It's Business Time (multi-payload deploy sequence), Virginia Is For Launch Lovers (Wallops, at dusk, inside the AFTS corridor), Scout's Arrow (HASTE: suborbital, no orbit), Paschen's Law (three acts: the lost flight 41, the arc in the lab, the return to flight), Beginning Of The Swarm (a four-burn kick-stage flight plan), The Mountain God Rises |
| Mini-game | Rutherford hot-fire, Go Find the Launch Site (a dirt-bike ride, played as Shaun D'Mello), Pics Or It Didn't Happen (fault finder), Return To Sender (splashdown), There And Back Again (helicopter catch), CAPSTONE to the Moon, Two Hemispheres (two launch consoles at once), Outback Delivery (ground-track orbit operations for Varda's capsule), ESCAPADE (thruster piloting to the Mars gate), VICTUS HAZE (countdown race) |
| Story card | Rocket Lab is founded, Sir Peter, Neutron (locked teaser) |
| People to meet on the map | Mark Rocket and Sir Stephen Tindall, Ky Michaelson, Sir Michael Fay, Dava Newman, Gabe Newell, Adam Spice, Rob Lillis |
| Secret (find the hidden blueprint) | Princes Street Sprint (bonus mini-game), Kaitorete Spit, Inside the first hundred, Photon, The Hungry Hippo (bonus cards) |

Reusable mechanics, each driven by a level's `params` and documented in the spec (§10): `platform`, `launch`, `ride` (side-on riding), `orbit-ops` (ground-track map), `dual-count` (two consoles), `arc-lab` (an experiment with switches), plus the one-off mini-games. A level can chain several of them as acts (`params.then`).

Press `H` (or the `?` button, top right) at any moment to pause and see the controls for whatever you are playing, or for the map.

Peter Beck is the main character throughout; a level can hand the lead to someone else (Adam Spice has the Nasdaq listing, Shaun D'Mello the search for a launch site).

Controls: arrows or WASD to move, Space (A) to jump / burn, Enter (B) to confirm, M to mute. Launch control: ← → pitch (keep the white needle on the green cue), ↑ ↓ throttle, Space commands the next event (lift-off, separation, stage-2 ignition, fairing, hot-swap), Enter holds the count or commands SECO; then hold Space to burn the kick stage at apogee and Enter to deploy. Ātea-1 is unguided: ↑ ↓ aim the rail, Space starts the count and releases the dart. With several payloads aboard, ← → point the kick stage at the green marker and Space releases each one. From Wallops, stay inside the red AFTS corridor. HASTE has no orbit: Enter cuts off on speed, then Space releases the test article in the altitude window. Each mini-game says how it is played on its intro card. Sound and music are synthesised in code (`src/audio.ts`) and start after your first key press. A touch pad appears on phones.

## Mission patches (optional, local only)

The game shows a mission's patch on the rocket's fairing, on the launch console and on that level's cards when a file named `<level id>.png` exists in `src/assets/patches/`. Those patches are Rocket Lab's artwork, so the folder is git-ignored and nothing in it is part of this repository; without the files the game simply runs without patches. To add them for your own play, save the patch from the mission's page under https://rocketlabcorp.com/missions/launches/ as, for example, `src/assets/patches/its-a-test.png` (about 256 px is plenty).

The same goes for official photos: a file `src/assets/official/<level id>.jpg` is shown on that level's cards when the level has no freely licensed photo of its own, credited to Rocket Lab. Their Flickr (https://www.flickr.com/photos/rocketlab/) says images may be downloaded with credit, but they are all rights reserved, so this folder is git-ignored as well. An optional `manifest.json` beside the photos gives each one a title and its Flickr page.

## Useful URLs while developing

- Developer mode (the switch in the page footer, or `?dev=1` in the address) opens every node on the map and turns on skipping: `K` on the map marks the level under the marker as done, `K` inside a level ends it at once as a one-star pass, and each level's intro card gets a "Skip (dev)" button
- `?level=<id>` jumps straight into a level, for example `?level=capstone`
- `?level=<id>&auto=1` lets a bot play it, platform levels included (used to check each level can be won)
- `?level=<id>&auto=1&fast=6` does the same six times faster, and keeps running in a background tab
- `npm run sim` flies the launch physics headless with bots (Electron to several orbits, HASTE, Ātea-1)
- `?level=<id>&auto=1&rec=<name>` also records the run (dev server only) to `recordings/<name>.webm`; the folder is git-ignored

## Credits and licences

Code: MIT. Text and artwork: CC BY-SA 4.0. All game art is drawn in code in `src/art.ts` (1280×720 render, 320×180-unit world). Photos on story cards are freely licensed images from Wikimedia Commons, listed with authors and licences in [public/assets/photos/CREDITS.md](public/assets/photos/CREDITS.md).
