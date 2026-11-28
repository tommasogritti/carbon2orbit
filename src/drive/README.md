# The road to Māhia: data

`stages.json` is the road from Wairoa to Launch Complex 1 that the drive (`src/scenes/Drive.ts`, `src/gfx3d/drive.ts`) is built from: six stretches of road, the ground under and around them, and what the map holds along them. `scripts/drive-data.mjs` makes it; run it again with `node scripts/drive-data.mjs` (it caches what it downloads in `.drive-cache/`, which git ignores).

## Where it comes from

- **The road, buildings, trees, power poles, water, bush, beaches, cliffs, the coastline, fences and the old railway:** [OpenStreetMap](https://www.openstreetmap.org/copyright), © OpenStreetMap contributors, through the Overpass API.
- **The ground's height:** the LINZ NZ 8 m Digital Elevation Model (2012), released by Toitū Te Whenua Land Information New Zealand under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), through [OpenTopoData](https://www.opentopodata.org/datasets/nzdem/). Over Wairoa the LINZ tile is a flat fill, so the town's heights come from SRTM (30 m, NASA, public domain), also through OpenTopoData.

## Licence

`stages.json` is a derived database of OpenStreetMap data and is made available under the [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The heights in it are LINZ's (CC BY 4.0) and NASA's (public domain). The rest of this folder is the game's code (MIT).

## What is not from the map

The truck, its load, the road signs and their placement, the edge marker posts, the roadside fences (except Onenui Station's, which the map has), the flax, toetoe, scrub and bush plants (placed by rule inside the map's bush and scrub outlines), the sheep, the gnome, the blueprint and the launch pad (the game's 2016 pad, from the launch scenes) are drawn and placed by the game.
