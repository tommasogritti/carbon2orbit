# Carbon to Orbit — Project Spec for Claude Code

> Unofficial, open-source browser game that tells the story of Rocket Lab one level at a time, from the 2006 founding and Ātea-1 to Neutron. New levels get added as the company announces new things.
> "Carbon to Orbit" is a working title. This project is **not affiliated with Rocket Lab**.

This file is the full brief. Read all of it before you write code. Build in the milestone order in §11. After each milestone, check every acceptance criterion before moving on.

---

## 1. Goals

1. **Open source and easy to contribute to.** Many people online will add content. Adding a level, an event card or a character should need **no engine code and no image editor**.
2. **Plays in the browser** on desktop and phone, with no install and no account.
3. **Easy to run locally:** `npm install && npm run dev`.
4. **Hosted on a VPS** as a static site in a container, deployed automatically on merge to `main`.
5. **Tells Rocket Lab's history faithfully:** each level is a real event, recognisable from its place, vehicle silhouette, mission name and date, and every fact links to a source.
6. **Weekly updates:** a new announcement becomes an event card within days and a full level when someone builds it.
7. **Characters from a photo:** any contributor can turn a picture of a person into a playable, animated character with the help of an AI assistant (see §7).

## 2. Core decisions (already made — don't relitigate)

| Topic | Decision |
| --- | --- |
| Game concept | **Three kinds of level on a world map.** Every level is exactly one of: a **platform** level (run, jump, collect: the people-and-places stories), a **launch control** level (fly the rocket: the shared launch mechanic, mostly config), or a **mini-game** (a one-off set piece for a big "first"). Story-only events are **cards**. Level select is an overworld **map** in the style of Super Mario World: nodes on a path across Aotearoa, the Pacific, the USA and up to the Moon (§5.6). No tycoon economy in v1. |
| Photos | Story cards may show **freely licensed photos** (Wikimedia Commons: CC0, public domain, CC BY, CC BY-SA) of the real people and places, with a credit line and source link. Never Rocket Lab's own copyrighted media. Gameplay art stays original illustration (§6 X2, A5). |
| Art style | **Detailed, smooth 2D illustration** (changed 21 Nov 2026: the first 320×180 pixel-art draft was too coarse to recognise people, rockets or places). The world is laid out in **320×180 units** and rendered at **1280×720** (4 texture pixels per unit), scaled to fit the window. Flat colour with gradients, soft shading and thin dark outlines; particle effects for flame, smoke and steam. Recognisability comes first: Electron carries its lettering and flags, the map uses real coastlines, Peter Beck has his curly hair. One shared colour palette still applies to flat fills. |
| Engine | **Phaser** + **TypeScript** + **Vite**. Use Phaser 3 latest stable unless Phaser 4 is stable at build time. Check the npm registry and pick one. |
| Maps | **Tiled** JSON maps, where a level needs one. |
| Content format | YAML files validated by schemas written in **zod**. Generate JSON Schema from zod (`zod-to-json-schema`) so the engine and the docs never drift. |
| Backend | **None** in v1. Progress is saved in `localStorage`. |
| Hosting | Docker image: **Caddy** serving `dist/`. Caddy handles HTTPS automatically. |
| CI/CD | **GitHub Actions**: lint, typecheck, schema validation, Playwright smoke test, PR preview, deploy on merge. |
| Licences | Code **MIT**. Art, audio and text content **CC BY-SA 4.0**. Every asset folder has a `CREDITS.md`. |
| Package manager | npm. Node LTS. |

## 3. Glossary

- **Era:** a chapter on the timeline (Origins, Electron, Growing up, Beyond Earth, Space company, Neutron).
- **Level:** a playable node on the world map. It always names a `kind` and a `mechanic`.
- **Kind:** `platform` | `launch` | `minigame` (playable) or `card` (story only). The kind sets the node's icon and colour on the map and the badge on its intro card, so players know what they are about to play.
- **Mechanic:** a TypeScript module that implements gameplay. `platform` and `launch` are the two shared mechanics; each mini-game is its own mechanic (`hotfire`, `heli-catch`, `orbit-raise`, …).
- **World map:** the overworld level select. One linear path of nodes; the next node opens when the current one is cleared (§5.6).
- **Easter egg:** an optional hidden find or feat in a level that reveals a piece of fan lore on the result card. The map shows a running count.
- **Event card:** an illustrated story card with no gameplay (for news, business events and history).
- **Status:** `announced` | `in-progress` | `flown`. Levels that aren't `flown` show as locked teasers.
- **Character:** a person drawn by layering shared paper-doll parts, defined in a `character.yaml`.

## 4. Repository layout

```
carbon-to-orbit/
  README.md                 what it is, how to play, how to run, disclaimer
  CONTRIBUTING.md           the three tiers + characters, step by step
  CODE_OF_CONDUCT.md
  LICENSE                   MIT (code)
  LICENSE-CONTENT.md        CC BY-SA 4.0 (art, audio, text)
  CLAUDE.md                 short guidance for AI agents working in this repo
  package.json
  vite.config.ts
  tsconfig.json
  src/
    main.ts                 boots Phaser, loads content manifest
    engine/
      content.ts            loads + validates content at build time
      save.ts               localStorage progress + badges
      i18n.ts               string lookup
      registry.ts           mechanic registry
      characters/           paper-doll compositor
    scenes/
      Boot.ts  Title.ts  WorldMap.ts  LevelIntro.ts  EventCard.ts  Builder.ts
    mechanics/
      platform/             shared platformer (kind: platform)
      launch/               shared launch control (kind: launch)
      hotfire/  heli-catch/  orbit-raise/     mini-games (kind: minigame)
      types.ts              Mechanic interface
    schema/
      era.ts  level.ts  card.ts  character.ts   (zod)
  content/
    eras.yaml
    levels/<NNN-id>/level.yaml + sprites/ maps/ sfx/ CREDITS.md
    cards/<id>/card.yaml + image.png + CREDITS.md
    photos/<file>.jpg + CREDITS.md   freely licensed photos for story cards (§6 A5)
    map.yaml                         world map: regions, labels, path style (§5.6)
    characters/<id>/character.yaml (+ optional portrait.png)
    i18n/en.yaml
  art-kit/
    palette.gpl  palette.json   32 colours
    size-guide.md               vehicle heights in px (see §8)
    parts/                      paper-doll parts, see §7
    templates/                  blank sprite sheets with frame grids
  prompts/
    character-from-photo.md     prompt contributors give any AI assistant (§7)
    level-from-news.md          prompt to draft a level/card from a press release
  scripts/
    new-level.ts  new-card.ts  validate.ts  portrait.ts  gen-schema.ts  news-digest.ts
  schema/                       generated JSON Schema (committed)
  tests/
    smoke.spec.ts               Playwright: open every level
    schema.test.ts              Vitest: every content file validates
  docker/
    Dockerfile  Caddyfile  compose.yaml
  .github/
    workflows/ci.yml  preview.yml  deploy.yml  news.yml
    ISSUE_TEMPLATE/ event-card.yml  level-idea.yml  character.yml
    pull_request_template.md
```

## 5. Content schemas (implement in zod, under `src/schema/`)

### 5.1 Era — `content/eras.yaml`

```yaml
- id: origins
  title: "Origins"
  years: [2006, 2012]
  accent: 12            # palette index for era colour
- id: electron
  title: "Electron"
  years: [2013, 2019]
# growing-up, beyond-earth, space-company, neutron
```

### 5.2 Level — `content/levels/<NNN-id>/level.yaml`

```yaml
id: atea-1                       # kebab-case, unique
era: origins                     # must match an era id
order: 3                         # global play order
title: "Ātea-1"
date: 2009-11-30                 # ISO; partial allowed: 2016 or 2016-05
status: flown                    # announced | in-progress | flown
kind: launch                     # platform | launch | minigame
mechanic: launch                 # must exist in registry and match the kind
map: { x: 208, y: 46 }           # node position on the world map (§5.6)
sources:                         # ≥1 URL, required
  - https://www.sciencelearn.org.nz/resources/2431-rocket-lab
intro: >                         # ≤ 400 chars, shown on intro card
  A 6 m sounding rocket lifts off from Great Mercury Island and crosses
  100 km: the first private company in the Southern Hemisphere to reach space.
how: "Hold Space to burn. Ease off at Max-Q."   # ≤ 200 chars, controls
fact: "Ātea is Māori for space."                 # "Did you know?" on the intro card
after: >                         # "What really happened", shown on the result card
  Ātea-1 flew at 14:23 local time and the payload splashed down 50 km downrange.
egg: "…"                         # optional easter-egg text, revealed when found
photo:                           # optional, must be listed in content/photos/CREDITS.md
  file: beck_newman_2016.jpg
  caption: "Peter Beck with Dava Newman in front of Rocket Lab's sounding rockets, 2016."
  credit: "US Embassy New Zealand, CC BY 2.0"
  page: https://commons.wikimedia.org/wiki/File:...
params:                          # validated by the mechanic's own zod schema
  vehicle: atea-1
  site: great-mercury-island
  goal: { apogee_km: 100, orbit: false }
characters: [peter-beck]         # optional, must exist in content/characters
reward:
  badge: badges/atea-1.png       # original art only
credits: ["@github-handle"]
```

Rules:
- `params` is validated by the schema the mechanic exports (`mechanic.paramsSchema`).
- `kind` must agree with the mechanic: `platform` ↔ `platform`, `launch` ↔ `launch`, `minigame` ↔ any other mechanic. CI fails otherwise.
- `status: announced` → the map shows a locked node. Selecting it opens a teaser card with the intro and sources. The level can't be played and never blocks the path. `status: in-progress` (changed 21 Nov 2026) is for a chapter that is still unfolding: it is playable up to where the story has got to, its intro card carries a "story still unfolding" badge, and its result card says what is still to come. Nothing that has not happened is played (Neutron's flight, ESCAPADE's arrival).
- Validation errors must be human-readable and include the file path and the field.

### 5.3 Event card — `content/cards/<id>/card.yaml`

```yaml
id: rocket-lab-founded
era: origins
date: 2006-06
title: "Rocket Lab is founded"
body: >                          # ≤ 600 chars
  After a trip to the US, Peter Beck starts a rocket company in Auckland.
image: image.png                 # optional, original artwork, 1280x720 max
sources: [https://...]
credits: ["@handle"]
```

### 5.4 Character — `content/characters/<id>/character.yaml`

See §7.

### 5.5 Mechanic interface — `src/mechanics/types.ts`

```ts
export interface Mechanic<P> {
  id: string;                       // "launch"
  paramsSchema: z.ZodType<P>;       // validates level.params
  scene: typeof Phaser.Scene;       // receives { level, params, onComplete }
  preload?(scene: Phaser.Scene, level: Level): void;
}
// onComplete({ success: boolean, score?: number }) → save stars, return to the map
```

Register mechanics in `src/engine/registry.ts`. CI must fail if a level names a mechanic that isn't registered.

### 5.6 World map — `content/map.yaml` + `map` on each level and card

The level select is one overworld screen, wider than the viewport, that scrolls with the player marker.

- **Geography, stylised:** Aotearoa on the left (South Island, North Island, Great Mercury Island, Māhia), the Pacific in the middle, the USA on the right (Long Beach, Wallops, New York), and a band of space along the top with the Moon (later Mars and Venus). Nodes sit roughly where the event happened.
- **Path:** nodes are joined in `order` by a dotted path. The path may cross the ocean and double back: the company's story really does bounce between two countries.
- **Nodes:** icon and colour by kind (platform green, launch red, mini-game yellow, card blue, locked grey). Cleared nodes get a tick, and playable ones show 1–3 stars in the banner.
- **Movement:** arrow keys (or swipe / on-screen pad) walk the marker to the next or previous node along the path; Enter opens the intro card. The next node is closed until the current one is cleared. Cards clear when read.
- **Banner:** the selected node's title, date, kind and stars. The map also shows the easter-egg count.
- `?dev=1` opens every node.
- The marker is the Peter Beck character for now; later, the player's own avatar from `/builder` (CH6).

## 6. Requirements

Must = needed for the first public release (M3). Should = after that.

### Gameplay and content
- **G1 (Must)** The world map (§5.6) is the level select. Nodes open in order along the path.
- **G1a (Must)** Every level is one of three kinds: platform, launch control or mini-game. The first public release has at least two levels of each kind. A new story should pick the kind that fits it: people, places and building things → platform; a flight → launch control; a one-of-a-kind stunt → mini-game.
- **G1b (Should)** Each playable level has one easter egg and awards 1–3 stars. Neither is needed to progress.
- **G2 (Must)** Every level shows an intro card (what happened, when, why it mattered, how to play, one "did you know") with its source links, and a result card that says what really happened.
- **G3 (Must)** Status handling as in §5.2. Changing one field unlocks a level.
- **G4 (Must)** Progress and badges are saved in `localStorage` with a schema version and migration. No accounts.
- **G5 (Should)** Keyboard, mouse and touch controls. Every level can be finished on a phone.
- **G6 (Should)** All UI strings live in `content/i18n/*.yaml`.

### Contribution
- **C1 (Must)** There are three tiers plus characters:
  1. **Event card:** YAML + optional image, no code. It can also be submitted through a GitHub issue form.
  2. **Level:** YAML + sprites + optional Tiled map, using an existing mechanic.
  3. **Mechanic:** a TypeScript module implementing `Mechanic`, with at least one test.
  4. **Character:** a `character.yaml` only (§7).
- **C2 (Must)** All content is validated by the schemas. Invalid files fail CI with readable errors.
- **C3 (Must)** Every PR gets a preview URL of the built game.
- **C4 (Must)** The repo includes CONTRIBUTING.md, level and card templates, the art kit, a code of conduct and a PR checklist.
- **C5 (Should)** `npm run new-level`, `npm run new-card` and `npm run new-character` scaffold from templates.
- **C6 (Should)** A dev menu at `?dev=1`: jump to any level, unlock everything, show hitboxes. `?level=<id>` and `?auto=1` (bot play) exist for smoke tests.

### Local development
- **L1 (Must)** Requires only Node LTS and Git. `npm install && npm run dev` serves the game with hot reload, including content YAML.
- **L2 (Must)** No secrets, API keys or backend are needed to run, build or test.
- **L3 (Should)** `docker compose up` runs the production build locally, the same image as on the VPS.

### Hosting
- **H1 (Must)** The build output is static and served by Caddy in a container.
- **H2 (Must)** Merging to `main` builds an image, pushes it to GHCR, and deploys it to the VPS over SSH (`docker compose pull && up -d`). A failed build or test never deploys.
- **H3 (Should)** Images are tagged per commit and by semver release. `scripts/rollback.sh <tag>`.
- **H4 (Should)** Optional cookie-free analytics (Plausible or Umami), switched off by default and enabled through an env var at build time.

### Art and assets
- **A1 (Must)** 320×180-unit world rendered at 1280×720 (`D = 4` texture pixels per unit), anti-aliased, scaled to fit. Sprites are authored at 4× their size in units (a 20×31-unit character is an 80×124 px image) and shown at scale 1/D. Text uses Chakra Petch, which has the macrons needed for te reo Māori (Ātea, Māhia). Flat fills come from the shared palette; gradients and shading may blend between palette colours.
- **A1b (Must, added 21 Nov 2026)** Platform backdrops never repeat a module. Each is one long strip, wider than the screen, that reads left to right as a walk through that chapter, built from things that were really there (places, machines, vehicles, signs, wildlife), each one traceable to a source or flagged in the PR as unverified. Use two or three parallax layers outdoors (far: sky, sea, islands; middle: land and buildings) and one detailed wall layer indoors. A layer `w` units wide scrolls with factor `(w - 320) / (levelWidth - 320)` so the whole strip passes by exactly once. Foreground props must not duplicate or hide what the backdrop already shows.
- **A1a (Must)** Recognisability checklist for any real vehicle, person or place: name the two or three features a fan would look for and make sure they are visible at normal size (for Electron: black carbon body, vertical ELECTRON lettering, flags, nine-nozzle base; for LC-1: cliff-top pad, strongback, lightning masts, sheep).
- **A2 (Must)** Formats: PNG for sprites, JSON for Tiled maps, OGG for audio. Each asset folder has a `CREDITS.md` naming the author and licence.
- **A3 (Must)** Vehicles are drawn to the size guide (§8) so they compare correctly.
- **A4 (Must, changed 21 Nov 2026)** Sound is **synthesised in code** with the Web Audio API (`src/audio.ts`): no audio files, so nothing to license. Three parts: named one-shot effects (`snd.jump()`, `snd.stage()`, …), continuous loops whose level follows the game (`rumble`, `rotor`, `sea`, `hiss`, `whine`), and a 16-step sequencer for music. One song per setting: world map (C major, bright), 1990s workshop (A minor, funky), Māhia (G major, pastoral), launch (D minor, builds in three intensity steps: countdown, ascent, stage two), helicopter catch (E minor, fast), space (slow pads and bells, used for the Moon and for the kick stage). A win or fail jingle ends every level.
- **A4a (Must)** Sound starts only after the first key press or tap (browser rule). `M` or the speaker button mutes; the choice is remembered. Effects must match what is on screen: the engine roar thins with altitude and drops to a hum in vacuum, the Max-Q alarm sounds only while the bar is red, steam hisses louder near a vent.
- **A4b (Should)** A contributor adds a song as data (chords, bass and arpeggio patterns, drum strings, lead notes) in `SONGS`, not as an audio file. Recorded clips (`?rec=`) include audio, so the mix can be checked with `ffmpeg -af volumedetect`: keep peaks under -3 dB and effects from masking the music.
- **A5 (Must)** Photos on story cards: only files whose Commons page states CC0, public domain, CC BY or CC BY-SA. Each is listed in `content/photos/CREDITS.md` with author, licence and source URL, and the card shows the credit and a source link. Photos are JPG, at most 960 px wide. The palette check (A1) does not apply to them. CC BY-SA photos are shown unmodified apart from resizing.

### Characters from a photo (see §7)
- **CH1 (Must)** A new character needs only a `character.yaml`, with no image editor and no custom PNG.
- **CH2 (Must)** `prompts/character-from-photo.md` and the `/builder` scene ship with the repo and work with any AI assistant.
- **CH3 (Must)** Source photos are **never committed**. `.gitignore` excludes `**/source-photo.*`, and CI rejects JPG/HEIC/WebP files under `content/characters/`.
- **CH4 (Must)** Real people need a `consent` block. YouTubers, creators and anyone who isn't a company public figure need recorded opt-in, such as a PR they opened or approved. Executives appear only in their public role, and we ask Rocket Lab before a public launch.
- **CH5 (Must)** Respectful depiction only. Anyone depicted can have their character removed on request. Document this in CONTRIBUTING.md.
- **CH6 (Should)** Players can build a personal avatar in `/builder` from their own photo. It stays in their browser and is never uploaded.

### Legal and accuracy
- **X1 (Must)** A "Fan project, not affiliated with Rocket Lab" notice appears on the title screen, in the README and in the page footer.
- **X2 (Must)** No official Rocket Lab logos, press photos, renders or copied mission-patch artwork. Photos are allowed only under A5 (freely licensed, third-party or government sources). Badges are original designs that carry the mission name. A logo that happens to be visible on clothing in a freely licensed photo is acceptable; a photo chosen for its logo is not.
- **X2a (Must)** Real people are shown in photos only in their public role, with a neutral caption. No invented quotes: narration describes what people did, and dialogue is never put in a real person's mouth unless it is a sourced quotation. That includes titles that imply speech. A photo is used only when its source caption names the person shown; never caption a guess. Family members and other private people are not named. Where a claim rests on the company's own account, say "Rocket Lab says".
- **X2b (Must)** No stock talk beyond the historical fact of the listing: no price, valuation cheerleading or anything that reads as investment promotion.
- **X3 (Must)** The game's title does not use "Rocket Lab". The company and missions are named in the story text.
- **X4 (Must)** Every level and card has at least one source URL, checked at review.
- **X5 (Should)** Contact Rocket Lab comms before announcing publicly. This is a task for the maintainer (Tom), not for code.

### Quality
- **Q1 (Must)** First load under 5 MB; levels are lazy-loaded. Target: interactive within 3 s on a mid-range phone over 4G.
- **Q2 (Must)** CI runs ESLint, `tsc --noEmit`, Vitest (schemas and content), a palette check, and a Playwright smoke test that opens the map and boots every playable level without console errors.
- **Q3 (Should)** Lighthouse performance score of 90 or more on the title screen.

## 7. Characters from a photo — design

**Goal:** go from any photo of a person (Peter Beck, a YouTuber, yourself) to an animated character in the house style, with no art skills.

**Approach: paper-doll parts + YAML, not photo-to-pixel conversion.** At 32–48 px, raw pixelised photos look muddy and inconsistent. Shared parts guarantee one style, small files, easy review and free animation.

### 7.0 Recognising a character (Must, added 21 Nov 2026)

A player who knows the person should recognise them at a glance, and a player who doesn't should be told who they are. Every real person shown in the game gets all of the following:

1. **Likeness notes.** Two to four visible, neutral features taken from captioned reference photos, written next to the art (for Peter Beck: a big mop of tight dark-brown curls, wider than the face; a broad face with a wide jaw; light eyes; black top and jeans). The small in-game figure must carry at least the first two.
2. **A portrait** (head and shoulders, 48×54 units) as well as the small figure. The portrait is used on the name plate, the corner chip and the title card.
3. **A name plate** at the start of every level: a small plate (chip portrait, name, role at that point in the story) in a corner of the screen, never over the middle, which fades after about four seconds. Nothing about the character stays on screen during play. On the world map the marker carries a name tag.
4. **Cartoon beside photo** once, on the title card or the character's first story card, when a freely licensed photo exists (§6 A5), so the drawing is tied to the real person.
5. **Era variants** when the story spans decades (Peter Beck: 1990s apprentice in overalls, present day in black). The defining features (hair, face) stay the same across variants.
6. **A likeness review** as part of the fan review (§12.1): the reviewer compares the cartoon with the reference photos and says, for portrait, chip and small figure separately, whether it reads as the person without the label.

`character.yaml` gains `likeness: [..]` (the notes), `role_default`, and optional `variants`. Levels may set `role` to override the role line.

### 7.0a The cast: one main character, guest leads and running mates (revised 21 Nov 2026)

**Peter Beck is the main character of the whole game.** He is the map marker and the lead of every level unless a level says otherwise. There is no character picker.

Other people from the story appear in three ways:

- **Guest lead.** A level that is really someone else's story sets `hero: <character id>`, and the player controls that person for that level only. The intro card says so up front, with the drawn portrait and likeness notes. First one: **Adam Spice**, CFO since May 2018, leads "RKLB rings the bell" (the 2021 Nasdaq listing). Only give someone a level from a chapter they were part of.
- **Running mate (power-up).** A platform level can set `buddy: <character id>` and place a `C` bubble showing that person's face. Picking it up brings them in for about 11 seconds: they run a few steps ahead, copy the player's stride, and see off any enemy they reach. In Adam's level the running mate is Peter. Use this for people who belong in a chapter but do not carry it.
- **Someone to meet** (below).

Characters live in a `CHARACTERS` list: id, texture prefix, name, role, the year they joined, likeness notes. Every character who can be controlled gets a full sprite set (walk, jump, every power-up outfit), a portrait and a chip, drawn to the §7.0 standard. So far: Peter Beck (plus his 1990s variant) and Adam Spice (shaved head, long face, navy blazer, open-collar shirt).

**Meeting people.** People stand beside the main path as small nodes with a violet trail, placed where and when they enter the story, and appear once you reach the node they branch from. Stepping onto one opens a **person card**: who they are and what they did, with a freely licensed photo where one exists (A5) or the game's drawn portrait where none does. Cards state facts with sources and never put words in anyone's mouth (X2a). The map counts `PEOPLE n/m`. So far: Mark Rocket and Sir Stephen Tindall (Auckland, 2006–07), Ky "Rocketman" Michaelson (Minnesota, 2006), Sir Michael Fay (Great Mercury Island, 2009), Dava Newman (Auckland, 2016), Gabe Newell (beside Return To Sender, 2020; text only), Adam Spice (beside the Nasdaq node, next to his own level), Rob Lillis (beside ESCAPADE; text only). None of the nine levels added on 21 Nov 2026 has a guest lead or a running mate: none of those chapters has one person the public record puts at the centre of it other than Peter Beck, and the launch webcast hosts and recovery crews are not named in sources we could cite.

**Before a public release** (CH4, X5): every living person shown here is depicted in their public role only. Ask Rocket Lab about the two executives, and offer each person named a simple way to be removed.

### 7.1 Art kit parts (`art-kit/parts/`)

Each part is a sprite sheet on one shared frame grid (for example 32×48 per frame) with these animations: `idle` (2f), `walk` (4f), `talk` (2f), `cheer` (2f). Parts are drawn in neutral greys or a mask colour and **tinted at runtime**, so a few shapes cover many people.

Layer order (back to front): `body` → `outfit.top` → `outfit.bottom` → `head` → `face.beard` → `hair` → `face.glasses` → `accessory`.

Starter set (M2): 3 head shapes · 6 skin tones · 10 hair styles (incl. bald, short, long, curly, ponytail) · 4 beards (none, stubble, short, full) · 3 glasses · 6 tops (t-shirt, polo, hoodie, button shirt, lab coat, flight suit) · 3 bottoms · accessories: headset, hard hat, cap, mic, clipboard, camera.

### 7.2 `character.yaml`

```yaml
id: example-creator
name: "Example Creator"
role: "YouTuber covering Rocket Lab"
likeness: ["short messy dark hair", "stubble", "navy hoodie", "always holding a mic"]   # see §7.0
consent:
  type: opt-in             # opt-in | public-role | self
  ref: "https://github.com/<org>/<repo>/pull/123"
body: { head: round, skin: tone-4 }
hair: { style: short-messy, colour: "#3b2a1e" }   # snapped to palette at build
face: { beard: stubble, glasses: none }
outfit: { top: hoodie, top_colour: "#1d3557", bottom: jeans }
accessory: mic
appears_in: [hub, the-mountain-god-rises]
portrait: portrait.png     # optional 64x64, palette-only
```

- Colours are snapped to the nearest palette colour at build time, with a warning.
- `consent.type`: `public-role` is only for company executives shown in their public role. `self` is for someone who submits their own character. `opt-in` needs `ref`.

### 7.3 Compositor (`src/engine/characters/`)

At load time, build a Phaser texture per character by layering the tinted parts per frame, then register the animations `<id>-idle`, `<id>-walk` and so on. Cache the result. Unknown part ids are a validation error.

### 7.4 `/builder` scene

- Shows a live preview (all animations), with dropdowns or arrows for each layer and palette swatches.
- **Import YAML** (paste) and **Export YAML** (copy, or download `character.yaml`).
- **"Submit to GitHub"** opens the `character.yml` issue form with the YAML prefilled through URL params.
- Optional local photo assist (CH6): the user picks a photo, it's shown beside the preview for reference only, and it never leaves the browser.

### 7.5 `prompts/character-from-photo.md` (write this file)

Its content should tell any AI assistant to:
1. Look at the attached photo and describe the person's visible features neutrally: head shape, skin tone, hair style and colour, facial hair, glasses, typical outfit.
2. Map each feature to the **closest part id from the list in this file**. The prompt embeds the current part list and palette, generated by `npm run gen-prompt`.
3. Output **only** a valid `character.yaml`. Don't guess sensitive attributes. Choose flattering, neutral options. Fill `consent` with a placeholder and remind the user about CH4.
4. Tell the user to run `npm run validate` or paste the result into `/builder` to preview it.

### 7.6 `npm run portrait <photo>` (Should)

A local script with no network: background removal (a pure-JS/WASM option, or a plain crop if unavailable), downscale to 64×64, snap to the palette with light dithering, write `portrait.png`. The photo is never copied into the repo.

## 8. Size guide (`art-kit/size-guide.md`)

Sizes are in world units (1 unit = 4 texture pixels). Launch scenes use **1 unit ≈ 0.225 m**.
- Ātea-1: about 6 m → about 36 units tall (drawn a little wider than scale so it reads)
- Electron: 18 m tall, 1.2 m diameter → 80 × 6 units (fairing 12, stage 2 10, stage 1 with interstage and engines 58)
- Neutron: about 43 m, 7 m first-stage diameter → about 190 × 31 units, so its launch scene needs a wider camera. **Mark the Neutron height as "verify" in the guide**; take it from an official source before drawing.

People in hub and cutscenes use the character frame grid from §7.1, not the vehicle scale.

## 9. Starter level map

Each row is a node on the world map. Every date must be checked against a source before merging. Status is `flown` unless stated. **Draft** = playable in the current draft build.

| # | Id | Title | Date | Kind / mechanic | Map location | Recognisable cues and easter eggs |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | workshop | The Rocket Bike | 1995–2000 | **platform** · Draft | Dunedin | Fisher & Paykel workshop after hours; collect bike frame, peroxide tank, nozzle, helmet, jumpsuit. Backdrop strip: clocking in under the Southern Cross → tool and die bay → DishDrawer line → design corner (rocket equation, bike blueprint, telescope) → peroxide corner ("NO PROPELLANT MIXING ON SITE") → roller door to Princes Street. Props: the turbo Mini, a jet pack, a cruise-missile engine. Enemies: rocket scooter, snapping DishDrawer, welding sparks. Egg: water rocket |
| 2 | founded | Rocket Lab is founded | 2006-06 | card · Draft | Auckland | the US "rocket pilgrimage", Ky "Rocketman" Michaelson, Mark Rocket, Stephen Tindall |
| 3 | atea-1 | Ātea-1 | 2009-11-30 | **launch** (unguided: aim the rail) · Draft | Great Mercury Island | Manu Karere; first private company in the Southern Hemisphere to reach space |
| 4 | rutherford | Rutherford hot-fire | 2013–2016 | **mini-game** `hotfire` · Draft | Auckland | electric pumps, 3D-printed engine, battery hot-swap |
| 5 | lc-1 | Road to Māhia | 2016-09-26 | **platform** · Draft | Māhia | pad hardware. Backdrop strip: Wairoa and its relocated lighthouse → Onenui Station (woolshed, sheep, cattle) → the gravel road with a LOX tank on a low-loader → the building site (crane, containers, tracking dish) → the range (hangar, masts, strongback); behind it Mokotahi, a dolphin, Portland Island. Enemies: red tape, rams, gulls. Egg: gnome Chompski |
| 6 | its-a-test | It's a Test | 2017-05-25 | **launch** (scripted telemetry loss at 224 km) · Draft | LC-1 | first Electron flight; unticked "forward error correction" box on the loss screen |
| 7 | still-testing | Still Testing | 2018-01-21 | **launch** + kick stage · Draft | LC-1 | first orbit; scripted T-2 abort (Dec 2017 attempt); Humanity Star and a Dove in the transfer orbit; the secret kick stage circularises two Lemur-2s |
| 8 | its-business-time | It's Business Time | 2018-11-11 | **launch** + kick stage + deploy sequence · Draft | LC-1 | first fully commercial flight (210 × 500 km, 85°, circularised at 500); the June 2018 motor-controller scrub replayed on the first count; new to play: point the kick stage and release six satellites one at a time. Egg: IRVINE01, built by high-school students |
| 9 | factory | Rosie the Robot | 2019-11-13 | **platform** · Draft | Auckland factory | composite parts in 12 hours instead of 400+; new to play: conveyor belts. Backdrop strip: the door and the 2019 launch board (five flown, one to come) → rolls of carbon fibre and the hand-work bench → cure oven → Electrons on cradles and a crate of Rutherfords from Huntington Beach → fairing halves and the clean room → Rosie's cell. Enemies: runaway sander, roll of carbon fibre, carbon dust, offcuts. Power-ups: clean-room suit, carbon-weave jacket. Egg: Rutherford no. 100. Secret: Photon card |
| 10 | pics-or-it-didnt-happen | Pics Or It Didn't Happen | 2020-07-04 | **mini-game** `fault-finder` · Draft | LC-1 → Auckland | flight 13 failure, one bad electrical connection; trace six telemetry channels back to the first sign of trouble, then find the bench test that exposes it; the clock counts days (real review: 27; back flying on day 58) |
| 11 | return-to-sender | Return To Sender | 2020-11-20 | **mini-game** `splashdown` · Draft | Pacific | first booster ocean recovery: flip with cold-gas thrusters, hold through "the wall", drogue below Mach 2, main chute, 9 m/s; gnome Chompski rides away on the kick stage (20 November in both UTC and NZ time; the 19th only in the US) |
| 12 | going-public | RKLB rings the bell | 2021-08-25 | **platform**, played as Adam Spice · Draft | Long Beach | SPAC with Vector; collect merger agreement, PIPE commitments, Form S-4, shareholder vote, RKLB ticker. Backdrop strip: Long Beach HQ and the Rutherford line → mission control → the March 2021 Neutron whiteboard → three clocks (Auckland on Thursday, Long Beach, New York) → the VACQ→RKLB board → a live video wall of Times Square. The bell is rung by video link: Peter appears on a screen. Enemies: bears, red tape, red candles. Running mate: Peter. Egg: the hat in the blender |
| 13 | there-and-back-again | There And Back Again | 2022-05-03 | **mini-game** `heli-catch` · Draft | Pacific off Māhia | Sikorsky S-92 hooks the booster, then releases it |
| 14 | capstone | CAPSTONE to the Moon | 2022-06-28 | **mini-game** `orbit-raise` · Draft | the Moon | Lunar Photon, HyperCurie perigee burns, TLI on 4 July |
| 15 | lc-2 | Virginia Is For Launch Lovers | 2023-01-24 | **launch** + kick stage · Draft | Wallops | first Electron from LC-2 (three HawkEye 360 satellites, 550 km, 40.5°); new site backdrop (barrier island, Pad 0A's water tower next door, plovers) at dusk; new to play: the autonomous flight termination corridor; the December 2022 upper-level-winds scrub |
| 16 | haste | Scout's Arrow | 2023-06-18 | **launch** (suborbital) · Draft | Wallops | first HASTE flight (Leidos, MACH-TB), at night; no orbit: SECO on a speed, coast over the top, release the test article in an altitude window with the nose on the velocity vector. Targets are game values: the real profile was never published |
| 17 | sir-peter | Sir Peter | 2024-06-03 | card · Draft | Wellington | KNZM in the King's Birthday Honours, invested 5 Sept 2024; 50th launch "No Time Toulouse" in June |
| 18 | escapade | ESCAPADE | 2025-11-13 | **mini-game** `cruise` · Draft | Mars | twin Rocket Lab-built spacecraft, launched on New Glenn; thruster piloting with no drag round the L2 kidney bean, then the powered Earth flyby (Blue 7 Nov 2026, Gold 9 Nov) and out through the Mars gate. Arrival (September 2027) is not played |
| 19 | victus-haze | VICTUS HAZE | 2026-06-19 | **mini-game** `countdown-race` · Draft | Māhia | launch 16 h 42 min after the Notice to Launch; ten jobs with dependencies, two crews, the pad from dawn to a night lift-off |
| 20 | the-mountain-god-rises | The Mountain God Rises | 2026-11-14 | **launch** + kick stage · Draft | LC-1 | 100th Electron, for iQPS; confetti |
| 21 | archimedes | Archimedes and the tank | 2024–2026 | **platform**, status `in-progress` (playable) · Draft | Stennis → Middle River → Wallops | Archimedes hot fire; Jan 2026 tank rupture in a hydrostatic trial; Oct 2026 voids in a tank dome and the replacement forward dome; LC-3 open. New to play: test positions that fire on a cycle. Enemies: falling ice, blue crabs, voids. Power-ups: cryo kit, methane-and-oxygen pack. Egg: Archimedes' bath. Secret: Hungry Hippo card |
| 22 | neutron | Neutron: first flight | no earlier than 2027 | launch, status `announced` (locked) · Draft | LC-3, Wallops | Hungry Hippo fairing, nine Archimedes, barge "Return On Investment" |

The draft therefore has every row playable except the locked Neutron teaser: 5 platform levels (one led by Adam Spice), 7 launch levels, 7 mini-games and 2 cards, plus 4 secret nodes (Princes Street Sprint, Kaitorete Spit, Photon, the Hungry Hippo) and 7 people to meet.

Dates in the table are UTC dates; where the local date differs (Pics Or It Didn't Happen was the morning of 5 July at Māhia; Scout's Arrow was the evening of 17 June at Wallops) the level text says so.

### 9.1 Easter-egg and lore bank (use these; add sources when used)

- **People:** Peter Beck (curly hair, black tee; never went to university; toolmaker apprentice; knighted 2024); Kerryn Morris; Mark Rocket; Sir Stephen Tindall; Sir Michael Fay; Vinod Khosla; Ky "Rocketman" Michaelson; Adam Spice (CFO); the launch webcast hosts.
- **Hardware names:** Rutherford, Curie, HyperCurie, Archimedes, Photon, Pioneer, Gauss; "Rosie the Robot"; "Hungry Hippo"; "Return On Investment".
- **Moments:** the rocket bike; the hat in the blender (March 2021); the Humanity Star; gnome Chompski; the helicopter catch and release; Electron reusing a flown Rutherford ("We Love The Nightlife", 2023); Nasdaq-100 entry (June 2026).
- **Mission names** are a gift: "It's a Test", "Still Testing", "It's Business Time", "This One's For Pickering", "That's a Funny Looking Cactus", "Make It Rain", "Look Ma, No Hands", "Running Out Of Fingers" (flight 10), "Don't Stop Me Now", "Pics Or It Didn't Happen", "I Can't Believe It's Not Optical", "Return To Sender", "Another One Leaves The Crust", "They Go Up So Fast", "Running Out Of Toes" (flight 20), "Love At First Insight", "There And Back Again", "Catch Me If You Can", "Virginia Is For Launch Lovers", "Baby Come Back", "We Will Never Desert You", "No Time Toulouse" (50th), the Owl series for Synspective and the God series for iQPS. Use them as level titles, signposts and loading-screen lines.
- **Places:** Invercargill, Dunedin, Auckland (Mt Wellington), Great Mercury Island, Kaitorete Spit (the pad that never was), Māhia and Onenui Station, Wairoa, Long Beach, Wallops Island, Stennis, Middle River, Warkworth.

Sources to cite (open the page and check before using):
- Rocket Lab overview (founding, Ātea-1, Electron, SPAC, helicopter recovery): https://en.wikipedia.org/wiki/Rocket_Lab
- Ātea-1, 30 Nov 2009: https://www.sciencelearn.org.nz/resources/2431-rocket-lab
- Ātea-1 specs: https://directory.eoportal.org/other-space-activities/rocket-lab
- 2025 overview (ESCAPADE, HASTE, LC-3): https://www.nasaspaceflight.com/2025/12/rocket-lab-2025-overview/
- VICTUS HAZE (June 2026): https://investors.rocketlabcorp.com/news-releases/news-release-details/rocket-lab-shatters-responsive-space-record-launches-us-space
- 100th Electron (14 Nov 2026): https://finviz.com/news/422837/rocket-lab-hits-100-electron-launches-fastest-commercial-rocket-to-reach-the-milestone
- Neutron moved to 2027 (8-K, 14 Oct 2026): https://www.sec.gov/Archives/edgar/data/0001819994/000181999426000067/rklb-10142026ex991.htm
- Neutron tank rupture (Jan 2026): https://tech.yahoo.com/science/articles/rocket-labs-neutron-rocket-suffers-130000985.html

Mission names and dates for rows 4–15 (It's a Test, Still Testing, It's Business Time, Pics or It Didn't Happen, Return to Sender, There and Back Again, CAPSTONE, LC-2/HawkEye 360, HASTE) need a primary source (a Rocket Lab press release or news) added to each level file.

## 10. Mechanics — v1 scope

### 10.1 `launch` (spine) — params
```ts
{
  vehicle: "atea-1" | "electron" | "neutron";
  site: string;                         // backdrop id
  goal: { apogee_km?: number; zone_km?: [number, number];        // sounding rocket: height to clear, impact zone
          orbit?: boolean; orbit_km?: number; inject_km?: number };  // orbital: target circular altitude, SECO altitude (default 250)
  twist?: "scripted-no-orbit" | "kick-stage";
  scrub?: boolean | { at: number; lit?: boolean; text: string; resume: string };   // scripted stand-down on the first count (true = Still Testing's abort after ignition)
  night?: boolean; dusk?: boolean; payload?: string; kickPayload?: string;
  deploy?: string[];                    // several payloads: after circularising, each is released in its own direction
  sail?: string; sailNote?: string;     // a call-out and a result line for something that stays on the kick stage (NABEO)
  afts?: boolean;                       // fly inside an autonomous flight termination corridor
}
// suborbital (vehicle "haste"): goal: { inject_km, v_ms, release_km }
```
Launch control is written for players who know the vocabulary. It is a real (if simplified) ascent simulation, not a timing game: see §10.2c for the full procedure and the model.

### 10.1a `platform` — params
```ts
{
  theme: "workshop" | "mahia" | "listing" | string;   // backdrop, goal prop, music, hazard names (the THEMES table in Platform.ts)
  buddy?: string;                          // character id of the running mate brought in by a `C` power-up (§7.0a)
  width: number;                           // level width in 16 px tiles (height is fixed at 11)
  ground: [x0: number, x1: number, row: number][];   // solid spans; gaps are pits
  plats: [x: number, row: number, w: number][];      // floating platforms
  parts: [x: number, row: number, name: string][];   // collectibles, all required to finish
  hazards: number[];                       // ground tiles that send you back to the last safe spot
  sheep: number[];                         // patrolling animals: knock-back, no damage
  enemies: [kind: string, x0: number, x1: number][];   // see below; patrol between tiles x0 and x1
  egg: [x: number, row: number];           // easter-egg pickup
  goal: number;                            // tile of the goal prop
  signs: [x: number, prop: string][];      // background props and signposts
  belts?: [x0: number, x1: number, row: number, dir: 1 | -1][];   // conveyors laid over ground or platform tiles
  fires?: number[];                        // ground tiles under a test position that fires on a cycle
}
```
Gameplay: run and jump (variable height), collect every part, reach the goal. No lives: a fall, hazard or enemy returns the player to the last safe footing (with a moment of invulnerability) and costs a star.

**Enemies** belong to the chapter, like everything else, and are never real people. Landing on one from above sees it off (a bounce and a sound); touching it any other way costs a retry. Kinds so far:

| Kind | Level | Behaviour | Why it is there |
| --- | --- | --- | --- |
| `scooter` | workshop | fast ground patrol; stomp to hit the kill switch | Beck's rocket-attached scooter, off on its own |
| `drawerbot` | workshop | slow, hopping, drawer snaps open and shut; stomp to shut it | the appliance line he worked on by day |
| `sparks` | workshop | a ceiling welding arm drops a spark every 1.5 s; wait it out | factory hazard; cannot be stomped |
| `redtape` | Māhia | a rolling reel of red tape; stomp to cut it | the consent trouble that ended the Kaitorete Spit plan |
| `ram` | Māhia | ambles, then charges when you are in front of it; stomp it | Onenui is a working sheep and beef station |
| `gull` | Māhia | flies a wave just above head height over a wide stretch; only a jump brings you into it; can be stomped | karoro, the black-backed gull of that coast |
| `bear` | listing | slow ground patrol with a red down-arrow on its flank; stomp to squeeze it | a bear market on legs |
| `candles` | listing | a hanging ticker drops a red candlestick every 1.5 s; wait it out | the red candle of a falling share price; cannot be stomped |
| `sander` | factory | fast ground patrol; stomp to unplug it | the 400 hours of hand trimming and sanding that Rosie replaced |
| `roll` | factory | a slow rolling roll of carbon fibre; stomp to stop it | what an Electron is made of |
| `dust` | factory | drifts on a wave at head height, like the gull | Rosie cuts, drills, mills and sands carbon composite |
| `offcuts` | factory | a trimming head drops an offcut every 1.5 s; wait it out | the same; cannot be stomped |
| `ice` | stennis | ice falls from a cryogenic line every 1.5 s; wait it out | liquid oxygen and liquid methane lines frost over; cannot be stomped |
| `crab` | stennis | fast sideways patrol; stomp it | Middle River is on the Chesapeake, blue-crab water |
| `void` | stennis | drifts on a wave at head height | the voids found in a composite tank dome in October 2026 |

Two things in the newer levels are scenery that acts rather than enemies. **Conveyors** (factory) carry the player along at 48 px/s, with or against the direction of travel, on the ground or on a platform. **Test positions** (stennis) hold an engine over the trench that fires on a 3.6 s cycle: green lamp, flashing amber for 0.8 s, then a second of blue flame that sends the player back to the last safe footing.

**Power-ups** float in glass bubbles. Each lasts a few seconds, shows a timer bar, and changes how the character looks as well as what he can do (the look flickers back as it runs out). Like enemies, each is tied to the chapter:

| Code | Level | Look | Effect | Why it is there |
| --- | --- | --- | --- | --- |
| `J` jet pack | workshop | twin tanks on the back, goggles | hold jump to fly for 7 s | Beck built a jet pack at Fisher & Paykel |
| `S` suit and helmet | workshop | yellow suit, open-face helmet | untouchable for 7 s; enemies are knocked out on contact | what he wore on the rocket bike |
| `H` hard hat and hi-vis | Māhia | white hard hat, orange vest | untouchable for 7 s | the pad was a building site in 2016 |
| `B` gumboots | Māhia | black gumboots with a red band, checked bush shirt | faster, plus a second jump in mid-air, for 9 s | farm country |
| `C` running mate | listing | no outfit: the level's `buddy` appears and runs just ahead of you | for 11 s the running mate sees off every enemy he reaches | people who belong in a chapter but do not lead it (§7.0a) |
| `T` clean-room suit | factory | white coverall, blue gloves and shoe covers, safety glasses | untouchable for 7 s | spacecraft and kick stages are built behind glass |
| `L` carbon light | factory | carbon-weave jacket with a bright edge, safety glasses | for 10 s jumps reach about five tiles and falls are slow | carbon composite is why Electron weighs so little |
| `F` cryo kit | stennis | clear face shield on a yellow headband, long blue apron, gauntlets | untouchable for 7 s | what handling cryogenic propellants calls for |
| `M` methane + oxygen | stennis | two frosted bottles on the back, goggles | hold jump to fly for 7 s, on a blue flame | Archimedes burns methane and liquid oxygen, and methane burns blue |

Every outfit keeps the curls visible, so the character stays recognisable (§7.0).

**Secrets.** Each platform level hides one **blueprint** that can only be reached with that level's movement power-up (flight, or the double jump). Finishing the level with the blueprint opens a **secret node** on the world map: a branch off that level's node, drawn with a blue trail and a glow, as in Super Mario World's secret exits. Secret nodes are optional and never block the main path. The map shows `SECRETS n/m`. So far: The Rocket Bike → **Princes Street Sprint** (a bonus mini-game, mechanic `sprint`: open the valve, keep the wobbling bike upright, beat the sports car, three stars for 140 km/h); Road to Māhia → **Kaitorete Spit: the first choice** (a bonus story card); Rosie the Robot → **Photon: the kick stage grows up** (card; the blueprint needs the carbon-light jump); Archimedes and the tank → **The Hungry Hippo arrives** (card; the blueprint hangs over the canal and needs the methane-and-oxygen pack). Level data: `powerups: [code, x, row][]`, `secret: [x, row]`, and `unlocks: <bonus id>` on the level; bonus nodes live in a separate list with a `parent`.

Plain `sheep` stay friendly: they only bump you. Rules for adding one: tie it to a fact, give it one clear behaviour, make it readable at a glance, and check the level is still fair by running the bot (`?auto=1`) to a clean three-star finish. Jump reach is 3 tiles up and about 4 across; CI checks that no gap or step exceeds it. Later: build levels in Tiled instead of spans.

### 10.2 `heli-catch` (first set piece)
The booster falls under a parachute in a drifting wind. The player flies the helicopter to line up the hook with the drogue line, inside a time window. Params: `wind`, `time_limit_s`, `difficulty`.

### 10.2a `hotfire` (mini-game)
Hold a chamber-pressure needle inside a drifting green band by feathering the electric pumps, until the qualification bar fills and before the battery bar empties. Egg: almost no time outside the band.

### 10.2b `orbit-raise` (mini-game)
Top-down view of Earth and Moon. Press at perigee to burn; timing sets how far the apogee grows. Reach the Moon's distance within the burn budget. Egg: no wasted burns.

### 10.2c Launch control: the procedure and the model (rebuilt 21 Nov 2026)

The player is launch director and flight controller. Keys: **← →** pitch, **↑ ↓** throttle, **Space** "go" (the next sequence event), **Enter** "stop" (hold the count, or engine cutoff).

**Orbital vehicles (Electron).**

1. **Terminal count.** Five stations (PROP, AVIONICS, GNC, RANGE, WEATHER) report go. On some counts one turns NO-GO; the player must call a hold with Enter before T-2.3, or the auto-sequencer aborts and the mission is capped at two stars. Ignition is at T-2 against the hold-downs; Space releases at T-0, and propellant burns while the player waits. `scrub: true` scripts one abort after ignition (Still Testing: December 2017).
2. **Stage 1.** A flight director shows the body axis (white needle), the commanded pitch (green cue) and the velocity vector (yellow ring). The cue is: vertical rise, a small pitch kick, then a gravity turn. The player keeps the needle on the cue. Flying at an angle of attack in thick air builds **Q-alpha** load; exceeding the **dynamic-pressure limit** builds load faster, so the player flies a **throttle bucket** through Max-Q. Structural load at 100% is a break-up. Full throttle all the way fails.
3. **Sequence.** MECO is automatic at depletion. The player commands **stage separation** (not before the thrust has tailed off, about 2.5 s) and **stage-2 ignition** (not before the stages have drifted apart, another 2.5 s); rushing either risks recontact, and every second of coasting costs velocity. **Fairing jettison** is gated on free molecular heating below 1,135 W/m²: early cooks the payload, late carries dead mass. The **battery hot-swap** drops two spent packs; if the first packs run flat first, the electric pumps stop and so does the thrust.
4. **Stage 2** steers on closed-loop guidance toward the injection altitude. The last seconds play in real time: the player commands **SECO** with Enter as the predicted apogee reaches the target (throttling down gives a finer cut).
5. **Kick stage** (`twist: kick-stage`): an orbit view with apogee, perigee, time to apogee and the burn needed. Hold Space to burn Curie, centred on apogee, until perigee meets apogee; Enter deploys. Missing the pass means waiting an orbit.

Stars: three for a final orbit within 15 km of target with structural load under 50%, no payload heating and no missed NO-GO; two within 50 km; one for any orbit with perigee above 150 km.

**Deploy sequence** (`deploy`): with several customers aboard, the kick stage is pointed for each release. ← → turn it (it has inertia), the white dispenser line has to sit on the green marker with the body rate settled, Space releases, and each spring kicks the stage. A release off the line counts as a recontact risk and caps the result at two stars. The real stages release on a timeline of their own; the pointing game is ours.

**Range corridor** (`afts`): flights from Wallops are flown inside a corridor drawn on the trajectory plot (the reference profile ± 3 km + 13% of altitude, a game value). A read-out shows the margin left. Outside it for about 3.5 s, the autonomous flight termination system ends the flight by shutting the engines down: thrust termination, not an explosion.

**Suborbital test flights (HASTE)**: vehicle `haste` is Electron's two stages under a heavier load. Stage 2 flies level at `inject_km` and the player commands SECO on speed (`v_ms`), not on apogee. The stack then coasts over the top with the cue on the velocity vector, and Space releases the test article as the altitude falls through `release_km` ± 2.5 km. Scored on cutoff speed (60 m/s for three stars), release altitude and angle of attack (2°). After cutoff the heating rule no longer applies: the article is built for it.

**Sounding rockets (Ātea-1)** are unguided, so they are aimed, not flown. The flight shows Mach number and an estimated nose-tip temperature (Beck: about Mach 5 and about 900 °C). The player sets the **rail elevation** while the wind shifts; the rocket weathercocks into the relative wind as it leaves the rail. A live prediction draws the arc. Clear the apogee line and land the impact in the range-safety zone, start the count (Enter holds it if a gust takes the prediction out of limits), and release the **dart** at burnout: the spent booster is all drag.

**On screen:** mission clock with time-compression factor, altitude and speed (km/h, as on the webcast), apogee and perigee, a webcast-style timeline (MAX-Q, MECO, FAIRING, HOT-SWAP, SECO), gauges for throttle, propellant, dynamic pressure, Q-alpha, heating, battery, g-load and structural load, the flight director, and an altitude-against-downrange plot with the planned profile.

**The model** (`src/launchSim.ts`, pure TypeScript, SI units): a point mass in a plane around a round, non-rotating Earth; inverse-square gravity; thrust along the body axis, varying with ambient pressure; an exponential atmosphere and constant drag coefficient; real orbital elements from the state vector. Electron uses the published thrust and specific impulse (224 kN at lift-off and 311 s for nine Rutherfords, 25.8 kN and 343 s for the vacuum engine); **stage masses are tuned so the autopilot reproduces the webcast timeline** (MECO about T+2:30, separation T+2:33, stage-2 ignition T+2:36, fairing just after T+3:00, hot-swap T+6:31, SECO T+9:06 into 250 × 500 km) and are not official figures. Limits such as the 23.5 kPa dynamic-pressure rating are game values. Ātea-1 uses the published motor figures (peak about 6.9 kN for about 14.5 s) with estimated masses and drag tuned to its 120 km design apogee. Time is compressed 5× in stage 1 and 8× in stage 2, and slows around events.

- `reference()` flies the mission with the autopilot to produce the planned profile and the stage-1 cue; `npm run sim` prints the timeline, margins and failure cases, so a change to the numbers can be checked without a browser. CI should assert that the autopilot reaches orbit in every launch level and that full throttle through Max-Q fails.
- **Scripted endings** (`twist: scripted-no-orbit`) count as a clear and explain the real outcome.

### 10.3 Later (don't build in v1, only stub)
`builder`.

### 10.5 `fault-finder` (mini-game, built 21 Nov 2026)
Two phases against a clock that counts days since the failure. **Trace:** six telemetry strips from the last two minutes of the burn, shuffled each play; ← → move a cursor through time, ↑ ↓ change channel, Space flags a point. Only the earliest deviation on the root channel is accepted; flagging a symptom marks where that symptom begins and costs two days. **Bench:** choose a test (↑ ↓, Space) and run it on a six-connection harness; the three standard acceptance tests pass everything, as they did on the flight unit, and only a sustained-load test makes one connection's resistance climb; ← → and Enter tag it. Three stars for 27 days or fewer. The channel names, the tests and their durations are the game's own stand-in for the real investigation.

### 10.6 `splashdown` (mini-game, built 21 Nov 2026)
The first stage falls from about 78 km. Attitude has inertia and no damping in vacuum: ← → fire cold-gas thrusters (limited gas) and only an opposite puff stops a turn. Once dynamic pressure builds the stage is stable engines-first or nose-first, and flying "the wall" (55 to 22 km in the game) off-axis builds heat-and-load damage. Space opens the drogue (allowed below Mach 2) and then the main chute (allowed below 110 m/s); early deployment tears the chute off. Three stars for touching down at 10.5 m/s or less with damage under 35%. Published numbers used: separation near 80 km, 2,350 m/s peak, drogue below Mach 2, 9 m/s at the water. The wall altitudes, the main-chute limit and the drag terms are game values.

### 10.7 `cruise` (mini-game, built 21 Nov 2026)
Newtonian piloting on one screen: Earth with inverse-square gravity, four thrusters on the arrow keys, a main engine on Space that pushes along the direction of travel, one propellant tank. Fly four gates round Sun–Earth L2, pass under Earth through a marked band, burn at the lowest point, and leave through the Mars gate above a minimum speed (the perigee burn is what makes that speed reachable). Gold is drawn following Blue's recorded path. Three stars for 35% propellant left. Distances, speeds and the gates are not to scale.

### 10.8 `countdown-race` (mini-game, built 21 Nov 2026)
A scheduling race in compressed time (2.4 s per hour). Ten jobs with dependencies, two crews; ↑ ↓ choose, Space assigns a ready job to a free crew. The clock starts at the Notice to Launch. Pass inside 24 hours; three stars for 16 h 42 min or less. Only the four hours for the trajectory is a published figure; the other jobs and durations are game values.

### 10.4 `sprint` (secret mini-game)
Side view of a night street. Hold to open the peroxide valve (about four seconds of propellant); the bike's wobble grows with speed and is corrected with left and right; cross the flag upright. A rival car accelerates alongside. Unlocked by the blueprint in The Rocket Bike.

## 11. Milestones and acceptance criteria

### Draft (done, 21 Nov 2026)
A playable vertical slice exists at the repo root: Vite + TypeScript + Phaser 3, the world map, the `platform`, `launch`, `hotfire`, `heli-catch` and `orbit-raise` mechanics, 13 map nodes (§9; 22 after the second pass described below), DOM story cards with photos and sources, `localStorage` save, stars and easter eggs, keyboard and touch pad, synthesised sound effects and music. Shortcuts taken, to be paid back in M0–M2: content lives in `src/content.ts` rather than YAML + zod; all art is drawn in code with the Canvas 2D API (`src/art.ts`) at 4 px per unit rather than shipped as image files from the art kit (good enough to set the style; contributors will want PNG or SVG sources); the character is one hand-drawn sprite, not the paper-doll compositor; no ESLint, Vitest, Playwright, Docker or CI yet. Test hooks: `?level=<id>` jumps to a level, `?auto=1` flies it with a bot, `?dev=1` opens the whole map, `?fast=N` (with `auto`) steps the game N times per tick and keeps running in a background tab.

**Second pass (21 Nov 2026):** the nine planned rows of §9 that were not yet playable were built: It's Business Time, Rosie the Robot, Pics Or It Didn't Happen, Return To Sender, Virginia Is For Launch Lovers, Scout's Arrow, ESCAPADE, VICTUS HAZE and Archimedes and the tank, with four new mini-game mechanics (`fault-finder`, `splashdown`, `cruise`, `countdown-race`), two new platform themes (`factory`, `stennis`), a second launch site (Wallops), suborbital flight in the launch model, two secret cards and two more people to meet (Gabe Newell, Rob Lillis). Every playable level finishes with three stars under its bot. No photos were added for the new levels: finding freely licensed ones (NASA's Wallops launch photos are a likely source) is still to do.

### M0 — Skeleton
- Vite + TS + Phaser project, ESLint, Prettier, Vitest, Playwright set up.
- Scenes: Boot → Title (with the X1 disclaimer) → WorldMap → LevelIntro → mechanic → result card → back to the map.
- zod schemas for era, level and card. Content is loaded and validated at build time through a Vite plugin or prebuild script that writes `src/generated/content.ts`.
- A minimal `launch` mechanic, enough to play **Ātea-1** (level 3) to the 100 km goal.
- Save system with one badge.
- Dockerfile + Caddyfile + `compose.yaml`; `docker compose up` serves the build.
- CI: lint, typecheck, unit tests, smoke test.
- **Accept when:** a fresh clone runs with `npm i && npm run dev`; Ātea-1 can be played and finished; the badge persists after reload; `docker compose up` works; CI is green.

### M1 — Electron era
- `launch` is complete (staging, fairing, orbit goal, twists).
- Levels 1, 3, 5 (a `launch` placeholder until `builder` exists), 6, 7 and 8, and card 2.
- Era unlocking, and locked teasers for non-`flown` levels (add level 20 as `announced`).
- **Accept when:** you can play through the Origins and Electron eras; "It's a Test" ends in the scripted no-orbit outcome; Neutron shows as locked with its source.

### M2 — Contributor kit
- `scripts/new-level.ts`, `new-card.ts`, `new-character.ts`, `validate.ts`, `gen-schema.ts`, `gen-prompt.ts`.
- Palette check, readable validation errors, generated JSON Schema committed.
- Issue forms: event card, level idea, character. PR template with the review checklist (§12).
- Preview deploys per PR (GitHub Pages under `/pr-<n>/`, or `pr-<n>.` subdomains on the VPS; pick the simpler one and document it).
- Art kit: palette, size guide, sprite templates, **paper-doll parts starter set**, compositor, **`/builder` scene**, `prompts/character-from-photo.md`.
- CONTRIBUTING.md with a walkthrough for each tier, including "add a character from a photo with your AI assistant".
- **Accept when:** someone new can add a card, a level and a character by following CONTRIBUTING.md alone; a broken file fails CI with a clear message; every PR gets a preview link.

### M3 — Public
- `heli-catch` set piece and level 12.
- Remaining starter levels as cards or levels where mechanics exist.
- Weekly news job (§13).
- Deploy workflow to the VPS (secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`), plus rollback.
- Mobile controls pass on all playable levels.
- **Accept when:** the site is live on the VPS over HTTPS; merging to `main` deploys within 10 min; all Must requirements in §6 are met.

## 12. PR review checklist (put in `.github/pull_request_template.md`)

- [ ] I ran it locally, or played the preview link, to the end
- [ ] Fan review done (§12.1) and its fact errors fixed
- [ ] `npm run validate` passes
- [ ] Every fact has a source link; the date is checked
- [ ] All art is original, in the house style (§2, A1), with credits in `CREDITS.md`
- [ ] No official logos, photos or copied mission patches
- [ ] Characters of real people: the `consent` block is filled and valid
- [ ] No source photos committed

### 12.1 Fan review

Every new level or card gets a second read by someone who knows the history well: a long-time fan, or an AI agent briefed to act as one (a Rocket Lab retail investor who watches every webcast and knows the mission names). The reviewer reads the level text, callouts, props and photo captions and reports: (1) fact errors with corrections and confidence, (2) things a fan would expect to recognise that are missing or look wrong, (3) small easter-egg ideas tied to real facts, (4) tone and respect problems. Fix every high-confidence fact error before merging; record anything unverified as an open item in the PR.

The first review of the draft (21 Nov 2026) led to these changes, kept here as examples of the standard: the kick stage on "Still Testing" circularised the Lemur-2s, not the Humanity Star; stage-2 flame is a faint orange kerosene plume, not blue; webcast callouts ("Stage 2 ignition", "Fairing separation confirmed", "Battery hot-swap", "Curie ignition"); the hat promise was about reuse; two photos dropped because the person shown was not confirmed by the source caption; "Arise, Sir Peter" renamed; Advanced Space credited on CAPSTONE.

Second review (backdrops and enemies, 21 Nov 2026) led to: no Electron on the 2016 goal pad (the first one arrived in February 2017); Māhia landmarks reordered to the real drive (Wairoa, Māhia Beach, coast road, Onenui, the range); "Space Coast" slogan removed as too early for 2016; Kaitorete described as on hold, not sunk; Tawapata South named on the Onenui gate; peroxide drums moved outside the factory door, in line with "no propellant mixing on site"; the Pointers now point at the Southern Cross. Not yet verified: whether LC-1 had lightning masts on opening day; the Mini's colour; that the bike out-ran a Dodge Viper (the game says "by some accounts").

Third review (Adam Spice's level and the rebuilt launch control, 21 Nov 2026) led to: the Nasdaq bell was rung **virtually by Peter Beck**, so the level stays in Long Beach, Times Square is a live video wall, and Peter appears on a screen at the bell (the map node moved from New York to Long Beach); "$4.1 billion" is stated as the enterprise value at announcement; collectibles reordered to the real sequence (merger agreement and PIPE together, then the S-4, the 20 August vote, the ticker); Adam Spice's MaxLinear tenure dated from 2011; "4.5 m fairing" and the Thursday-in-Auckland clock added; Long Beach shows a Rutherford line, not Electron stages (those are built in Auckland). Launch: flight 100 lifted off at 18:30 NZDT, so it is no longer a night launch, and the payload reads QPS-SAR-19; the December 2017 abort is a scrub followed by the January attempt, not a recycle; staging gaps are about three seconds each; Still Testing injects at 300 km; Ātea-1 uses the published motor figures (peak 6.9 kN, about 14.5 s, 15 cm diameter) and its card says the booster was recovered; fairing mass 44 kg; "Vehicle is supersonic" and "Kick stage separation confirmed" call-outs added.

Added after the third review, from Peter Beck's own walk-through of an Ātea-1 wind-tunnel model (Science Learning Hub video, 2011; all rights reserved, so it is **linked, never copied**): the intro card carries a labelled cutaway drawn for the game (exit cone, solid fuel grain, liquid oxidiser under pressure, separation joint, the slimmer dart with payload, flight computers and recovery, nose tip), the length is given as 6.5 m, and intro and result cards have a "Watch" link. Levels can now set `diagram: { key, caption }` (a drawing registered in `DIAGRAMS`, `src/art.ts`) and `watch: { url, label }`. Rule for video: link to the original host; embed only through the host's own player; bundle a file only under a free licence (A5).

Open from the third review: where Beck physically was for the bell (sources disagree between Long Beach and New Zealand, so the game says only "by video link"); whether Electron throttles down at Max-Q at all (the bucket and the 23.5 kPa limit are game values); whether Ātea-1 was rail-launched and unguided as modelled; "8 t to LEO" on the March 2021 whiteboard; the lift-off mass is about 16 t in the model against 13 t published (never shown on screen); the 2018 Curie was the monopropellant version.

Fourth review (It's Business Time, Rosie the Robot, Pics Or It Didn't Happen, Return To Sender, Virginia Is For Launch Lovers, Scout's Arrow, the Photon card and Gabe Newell; 21 Nov 2026) led to: the factory wall is dated 13 November 2019, so it ticks five launches and shows "Running Out Of Fingers" as next (it flew on 6 December); a crate of ten Rutherfords, not nine; an AFTS termination shuts the engines down rather than blowing the vehicle up, and the text no longer implies Wallops is the only range with one (Māhia has flown AFTS since flight 10, after four shadow flights); the scripted stand-downs read SCRUB and happen early in the count; NABEO is no longer drawn unfolding (no source confirms it deployed); the HASTE "49 days" remark is attributed to Leidos's Tom Bell via The Defense Post, not to C4ISRNET; the flight 13 screens say "accident investigation" and Peter Beck is "with the investigation board", not leading it; "the wall" is attributed to Rocket Lab; Return To Sender says "what Rocket Lab counted as thirty satellites" (itemised manifests list 29 plus the gnome); Fleet Space's two Proximas joined the manifest about a fortnight before launch; Pad 0A's water tower now dominates LC-2's masts; the pointing game in the deploy sequence, the corridor's numbers, the wall's altitudes and the test point for HASTE are labelled as game values. Confirmed by the reviewer: eleven successful missions before flight 13; IRVINE01 was built by high-school students from six Irvine schools; flight 10 was the first guided re-entry; "This One's For Pickering" flew 35 days after It's Business Time; Chompski comes from Half-Life 2: Episode Two; six HASTE flights by the end of 2025.

Open from the fourth review: the order in which It's Business Time released its payloads (not published); whether NABEO deployed; the thirtieth satellite on Return To Sender; whether the June 2018 scrub came inside the terminal count; "about an hour after lift-off" for First Light's switch to satellite mode; the Jetsons origin of Rosie's name (Wikipedia only, so the game does not say it); whether the Auckland factory in 2019 was the Mt Wellington site (the game says only "Auckland"); the volcanic cone seen through the factory door is generic Auckland, not a verified view; Wētā Workshop's exact part in making the gnome ("made with").

Still open from the second review: name of the recovery ship on "There And Back Again"; whether the founding trip was 2006 or 2007; the Fisher & Paykel plant's product line (props currently say DishDrawer); a cliff-top backdrop for LC-1.

## 13. Weekly update workflow

1. **`news.yml`** (scheduled weekly): `scripts/news-digest.ts` fetches Rocket Lab press releases (RSS, or their newsroom page) and recent SEC filings for RKLB, compares them with `content/.seen.json`, and opens one GitHub issue, "This week: <date>", listing the new items with links. No API keys; if a source is unreachable, list the failure in the issue rather than failing silently.
2. **Triage** (maintainer): label each item `event-card`, `level-worthy`, `status-change` or `skip`.
3. `event-card`: someone fills the issue form, and a workflow turns the form into a PR (`content/cards/<id>/card.yaml`).
4. `status-change`: a one-line PR, for example Neutron `announced → flown` once it flies.
5. `level-worthy`: label it `good first level`, attach the template, and let a contributor claim it.
6. Merge deploys automatically. Add a "This week" line to `CHANGELOG.md`, shown on the title screen.

`prompts/level-from-news.md` should help contributors use an AI assistant to draft a card or level YAML from a press-release URL. It must keep facts and wording paraphrased, not copied.

## 14. `CLAUDE.md` for the repo (create it)

Keep it short. Include:
- The project summary (one paragraph) and a link to this spec, saved in the repo as `docs/SPEC.md`.
- Commands: `npm run dev | build | test | e2e | validate | new-level | new-card | new-character`.
- Rules: content is data, so never hard-code level-specific logic in the engine; new gameplay goes in `src/mechanics/<id>/` with a params schema and a test; keep the palette; never commit photos; never add official Rocket Lab logos or imagery; every fact needs a source.
- Definition of done: lint + typecheck + tests + smoke test pass and the docs are updated.

## 15. Out of scope for v1

Accounts, leaderboards and any backend; multiplayer; 3D; the tycoon/economy layer; in-game purchases; using official Rocket Lab media.

## 16. Open questions (for the maintainer; don't block on these)

- Final title. Whether to ask Rocket Lab for a blessing before announcing.
- Should business events (listing, acquisitions, earnings) stay cards only, or get gameplay?
- Photos of people other than Peter Beck: Commons has almost none for other Rocket Lab staff. Ask for opt-in photos, or keep everyone else as pixel characters?
- Should the map stay one linear path, or branch (optional side nodes for mission-name deep cuts)?
- Who the first 2–3 maintainers and reviewers are.
- Languages beyond English, and how Māori place names are shown (keep macrons, for example Ātea-1 and Māhia).
- PR preview hosting: GitHub Pages or the VPS.

---

*Spec as of 21 Nov 2026. The Neutron status (first launch expected 2027) and the 100-launch milestone reflect announcements up to that date.*
