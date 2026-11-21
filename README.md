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
| Launch control | Ātea-1, It's a Test, Still Testing, It's Business Time (multi-payload deploy sequence), Virginia Is For Launch Lovers (Wallops, at dusk, inside the AFTS corridor), Scout's Arrow (HASTE: suborbital, no orbit), The Mountain God Rises |
| Mini-game | Rutherford hot-fire, Pics Or It Didn't Happen (fault finder), Return To Sender (splashdown), There And Back Again (helicopter catch), CAPSTONE to the Moon, ESCAPADE (thruster piloting to the Mars gate), VICTUS HAZE (countdown race) |
| Story card | Rocket Lab is founded, Sir Peter, Neutron (locked teaser) |
| People to meet on the map | Mark Rocket and Sir Stephen Tindall, Ky Michaelson, Sir Michael Fay, Dava Newman, Gabe Newell, Adam Spice, Rob Lillis |
| Secret (find the hidden blueprint) | Princes Street Sprint (bonus mini-game), Kaitorete Spit, Photon, The Hungry Hippo (bonus cards) |

Peter Beck is the main character throughout; a level can hand the lead to someone else (Adam Spice has the Nasdaq listing).

Controls: arrows or WASD to move, Space (A) to jump / burn, Enter (B) to confirm, M to mute. Launch control: ← → pitch (keep the white needle on the green cue), ↑ ↓ throttle, Space commands the next event (lift-off, separation, stage-2 ignition, fairing, hot-swap), Enter holds the count or commands SECO; then hold Space to burn the kick stage at apogee and Enter to deploy. Ātea-1 is unguided: ↑ ↓ aim the rail, Space starts the count and releases the dart. With several payloads aboard, ← → point the kick stage at the green marker and Space releases each one. From Wallops, stay inside the red AFTS corridor. HASTE has no orbit: Enter cuts off on speed, then Space releases the test article in the altitude window. Each mini-game says how it is played on its intro card. Sound and music are synthesised in code (`src/audio.ts`) and start after your first key press. A touch pad appears on phones.

## Useful URLs while developing

- `?dev=1` opens every node on the map
- `?level=<id>` jumps straight into a level, for example `?level=capstone`
- `?level=<id>&auto=1` lets a bot play it, platform levels included (used to check each level can be won)
- `?level=<id>&auto=1&fast=6` does the same six times faster, and keeps running in a background tab
- `npm run sim` flies the launch physics headless with bots (Electron to several orbits, HASTE, Ātea-1)
- `?level=<id>&auto=1&rec=<name>` also records the run (dev server only) to `recordings/<name>.webm`; the folder is git-ignored

## Credits and licences

Code: MIT. Text and artwork: CC BY-SA 4.0. All game art is drawn in code in `src/art.ts` (1280×720 render, 320×180-unit world). Photos on story cards are freely licensed images from Wikimedia Commons, listed with authors and licences in [public/assets/photos/CREDITS.md](public/assets/photos/CREDITS.md).
