# Carbon to Orbit: project spec

> Unofficial, open-source browser game that tells the story of Rocket Lab one level at a time, from a rocket bike in a Dunedin workshop to the hundredth Electron and on to Neutron. New levels are added as the company's story goes on.
> This project is **not affiliated with Rocket Lab**.

This file says **what the game is and the rules it must meet**: goals and decisions (§1, §2), requirements (§6), the cast (§7), every level built or planned (§9), each mechanic's parameters (§10), and the record of fan reviews with their open questions (§12.1). Two companions cover the rest: [ARCHITECTURE.md](ARCHITECTURE.md) explains how the code works, and [the add-level skill](../.claude/skills/add-level/SKILL.md) is the procedure for adding or changing a level. Things that are still wanted but not built are collected in §17.

Section numbers are stable: other files and code comments refer to them, so add to a section or mark it retired, but do not renumber.

---

## 1. Goals

1. **Open source and easy to contribute to.** Many people will add content, most of them working with an AI coding agent. Adding a level needs a text editor and nothing else: no image editor, no audio tools, no asset files.
2. **Plays in the browser** on desktop and phone, with no install and no account.
3. **Easy to run locally:** `npm install && npm run dev`.
4. **Cheap to host:** the build is a static site that any static host can serve. The only moving part is the optional leaderboard.
5. **Tells Rocket Lab's history faithfully:** each level is a real event, recognisable from its place, vehicle silhouette, mission name and date, and every fact links to a source.
6. **Keeps up with the story:** a new announcement becomes a story card within days and a full level when someone builds it.
7. **Characters from a photo** (not built, §17): any contributor can turn a picture of a person into a playable character with the help of an AI assistant.

## 2. Core decisions (already made — don't relitigate)

| Topic | Decision |
| --- | --- |
| Game concept | **Kinds of level on a world map.** A level is a **platform** level (run, jump, collect: the people-and-places stories), a **launch control** level (fly the rocket), or a **mini-game** (its own kind of play for a particular moment). Story-only events are **cards**; people are nodes to meet. Level select is an overworld **map** in the style of Super Mario World: nodes on a path across Aotearoa, the Pacific, the USA and out to the Moon and Mars (§5.6). No tycoon economy. |
| New kinds of play | When a chapter is better served by a kind of play the game does not have, build it, and build it as a **reusable mechanic** driven by level parameters so other levels can use it (§10.9 onward). |
| Photos | Story cards may show **freely licensed photos** (Wikimedia Commons: CC0, public domain, CC BY, CC BY-SA) of the real people and places, with a credit line and source link. Never Rocket Lab's own copyrighted media in the repository (§6 X2, A5). |
| Art style | **Detailed, smooth 2D illustration.** The world is laid out in **320×180 units** and rendered at **1280×720** (4 texture pixels per unit), scaled to fit the window. Flat colour with gradients, soft shading and thin dark outlines; particle effects for flame, smoke and steam. Recognisability comes first: Electron carries its lettering and flags, the map uses real coastlines, Peter Beck has his curly hair. |
| Art and sound are code | Every texture is drawn with the Canvas 2D API at boot, and every sound is synthesised with Web Audio. The repository ships no sprite sheets and no audio files, so there is nothing to license and nothing a contributor needs beyond a text editor. |
| Engine | **Phaser 3** + **TypeScript** + **Vite**. |
| Content format | Levels are **TypeScript data** (`LevelDef` in `src/content.ts`), checked by the compiler and by each level's bot. A YAML and schema pipeline was the original plan and is in §17. |
| Backend | **None** for the game: progress is saved in `localStorage`. The one optional service is the leaderboard, a Cloudflare Worker with a D1 database (`leaderboard/`). |
| Version and seasons | The version comes from `package.json`. Its major.minor is the **season**; scores compare only within a season, so the minor version is bumped whenever levels or points change. |
| Hosting | A static build (`npm run build` → `dist/`). The host is not chosen yet (§16). |
| Licences | Code **MIT**. Story text and generated artwork **CC BY-SA 4.0**. Photos keep their own licences, listed in `public/assets/photos/CREDITS.md`. |
| Package manager | npm. Node LTS. |

## 3. Glossary

- **Level:** a playable node on the world map. It names a `kind` and a `mechanic`.
- **Kind:** `platform` | `launch` | `minigame` (playable), `card` (story only) or `person` (someone to meet). The kind sets the node's icon and colour on the map and the badge on its intro card.
- **Mechanic:** one kind of play, implemented as one scene in `src/scenes/`. A level picks it with `mechanic` and configures it with `params` (§10).
- **Act:** one mechanic's turn in a level told in several (`params.then`, §5.2).
- **World map:** the overworld level select. Nodes sit on one story path; a node opens when every earlier one is cleared (§5.6).
- **Secret node:** a bonus node off the main path, opened by finding the blueprint hidden in a level.
- **Easter egg:** an optional hidden find or feat in a level that reveals a piece of fan lore on the result card.
- **Status:** `flown` | `in-progress` | `announced`. `announced` levels show as locked teasers.
- **Character:** a person the player can control, drawn in code with a sprite set, a portrait and a chip (§7).
- **Guest lead / running mate:** the two ways someone other than Peter Beck takes part in a level (§7.0a).
- **Season:** the major.minor of the game version; the unit the leaderboard compares within.

## 4. Repository layout

```
README.md  AGENTS.md  CLAUDE.md  LICENSE
index.html  package.json  vite.config.ts  tsconfig.json
src/
  main.ts            boot, scene list, dev hooks
  content.ts         every level, bonus node, person and character (the data)
  core.ts            units, input, save, cards, controls panel, finish(), developer mode
  art.ts             drawing helpers, characters, rockets, the map
  backdrops.ts       level backdrops, enemies, power-up bubbles
  audio.ts           synthesised effects, loops and music
  launchSim.ts       launch physics, no Phaser
  leaderboard.ts  version.ts
  scenes/            Title, Map, and one scene per mechanic
leaderboard/         optional Cloudflare Worker, schema, shared scoring rules
scripts/launch-sim.mjs   fly the launch physics headless
public/assets/photos/    freely licensed photos + CREDITS.md
docs/                PROJECT_SPEC.md (this file), ARCHITECTURE.md, media/
.claude/skills/add-level/   the procedure for adding or changing a level
```

[ARCHITECTURE.md](ARCHITECTURE.md) describes what each part does and the conventions every scene follows.

## 5. Content: how a level is described

### 5.1 Eras (retired)

The original plan grouped levels into eras with their own unlocking. The game uses one story path instead; eras survive only as a way to talk about chapters.

### 5.2 Level: `LevelDef` in `src/content.ts`

The type in the code is the schema; this table says what each field is for.

| Field | Purpose |
| --- | --- |
| `id` | kebab-case, unique. Also the name of optional local media files. |
| `kind`, `mechanic`, `params` | What it is on the map, which scene plays it, and that scene's configuration (§10). |
| `status` | `flown`, `in-progress` or `announced` (rules below). |
| `title`, `date`, `place`, `map` | Shown on the map banner and cards; `map` is the node's position (§5.6). |
| `intro`, `how`, `fact` | The intro card: what happened and why it mattered, how to play, one "did you know". |
| `after` | "What really happened", on the result card. |
| `egg` | The easter egg's text, shown once found. |
| `sources` | At least one URL, shown on the cards. |
| `photo` | A freely licensed photo for the cards (A5). |
| `diagram`, `watch` | A labelled drawing registered in `DIAGRAMS`; a link to a video on its own site (linked, never copied). |
| `hero`, `role` | A guest lead for this level (§7.0a), and the role line on the name plate. |
| `unlocks`, `parent` | The secret node a level's blueprint opens; the node a bonus or person node branches from. |

Rules:
- `status: announced` → the map shows a locked node. Selecting it opens a teaser card with the intro and sources. The level can't be played and never blocks the path. `status: in-progress` is for a chapter that is still unfolding: it is playable up to where the story has got to, its intro card carries a "story still unfolding" badge, and its result card says what is still to come. Nothing that has not happened is played (Neutron's flight, ESCAPADE's arrival).
- **Levels in several acts:** `params.then: { mechanic, params, intro?, how? }` hands over to another mechanic when the first one ends in success, with a short card in between; `then` can nest. Stars are the worst of the acts, the egg counts if any act earns it, and nothing is saved until the last act. `kind` follows the first act. Used by Paschen's Law (launch → arc-lab → launch).
- Main-path levels live in `LEVELS` in story order, secret nodes in `BONUS`, people in `PEOPLE`.

### 5.3 Story cards

A card is a `LevelDef` with `kind: 'card'` and no mechanic: `intro`, `fact`, `sources` and an optional photo. It clears when read.

### 5.4 Characters

See §7.

### 5.5 What a mechanic must provide

A mechanic is a Phaser scene that receives `{ def }`, reads everything about the level from `def.params`, and ends with one call to `finish()`. It also provides `help()` for the controls panel and a bot under `?auto=1` that reaches three stars. It is registered in `SCENE_FOR` (`src/core.ts`), the `mechanic` union (`src/content.ts`) and the scene list (`src/main.ts`). The full conventions are in [ARCHITECTURE.md](ARCHITECTURE.md); the steps for building one are in the skill's `NEW-MECHANIC.md`.

### 5.6 World map

The level select is one overworld screen, wider than the viewport, that scrolls with the player marker.

- **Geography, stylised:** Aotearoa on the left, the Pacific in the middle, the USA on the right, Australia at the far left edge, and a band of space along the top with the Moon and Mars. Nodes sit roughly where the event happened, placed with the `nz()` and `us()` projections in `src/art.ts`.
- **Path:** nodes are joined in story order by a dotted trail. The trail crosses the ocean and doubles back: the company's story really does bounce between two countries.
- **Nodes:** icon and colour by kind (platform green, launch red, mini-game yellow, card blue, locked grey). Cleared nodes get a tick, and playable ones show 1–3 stars in the banner. Secret nodes hang off their parent on a blue trail; people stand beside the path on a violet one.
- **Movement:** an arrow key walks the marker to the nearest node in that direction, along the trails. The next level to play wears a NEXT tag and `N` walks to it. A node is closed until every earlier level is cleared; pressing towards a closed one says which level opens it. Cards clear when read.
- **Banner and counters:** the selected node's title, date, kind and stars; counts of easter eggs, secrets and people; the score, with `L` for the leaderboard.
- **Developer mode** (footer switch or `?dev=1`) opens every node and lets `K` skip a level. Hide the switch before a public release.
- The marker is always Peter Beck (§7.0a).

## 6. Requirements

Must = needed for the first public release. Should = after that. A requirement marked *(not built)* is still wanted; the plan for it is in §17.

### Gameplay and content
- **G1 (Must)** The world map (§5.6) is the level select. Nodes open in order along the path.
- **G1a (Must)** Every level is one of three kinds: platform, launch control or mini-game. The first public release has at least two levels of each kind. A new story should pick the kind that fits it: people, places and building things → platform; a flight → launch control; a one-of-a-kind stunt → mini-game.
- **G1b (Should)** Each playable level has one easter egg and awards 1–3 stars. Neither is needed to progress.
- **G2 (Must)** Every level shows an intro card (what happened, when, why it mattered, how to play, one "did you know") with its source links, and a result card that says what really happened.
- **G3 (Must)** Status handling as in §5.2. Changing one field unlocks a level.
- **G4 (Must)** Progress is saved in `localStorage` with a schema version. No accounts.
- **G5 (Should)** Keyboard and touch controls. Every level can be finished on a phone *(touch pad exists; a phone pass over every level is not done)*.
- **G5b (Must)** Inside any level, `+` and `−` (or the on-page control) change the game speed between ×0.5 and ×4; the setting is remembered. A level's points are its stars × 100 scaled by the average speed of the run: ×0.5 at half speed, ×1.5 at double, ×2 at four times. The best run of each level counts, and the result card says what the run earned.
- **G5a (Must)** At any moment, `H` or the `?` button pauses the game and shows the controls for the level being played, or for the map. Every mechanic supplies its own, by level and phase.
- **G6 (Should)** UI strings can be translated *(not built)*.

### Contribution
- **C1 (Must)** There are three sizes of contribution, all made the same way (the add-level skill):
  1. **Story card or person:** an entry in `src/content.ts`, no drawing.
  2. **Level:** an entry in `src/content.ts` using an existing mechanic, plus its backdrop, enemies and power-ups drawn in code.
  3. **Mechanic:** a new scene, built to be reused (§5.5).
- **C2 (Must)** A contribution is checked by the compiler (`npm run build`), by its level's bot reaching three stars, and by a fan review (§12.1).
- **C3 (Should)** Every PR gets a preview URL of the built game *(not built)*.
- **C4 (Must)** The repo includes a README, `AGENTS.md`, the add-level skill, the architecture doc and a licence. A contributing guide, code of conduct and issue forms are *(not built)*.
- **C5 (Should)** Scaffolding commands for a new level or card *(not built; the skill tells an agent to copy a neighbouring level instead)*.
- **C6 (Should)** Developer mode: jump to any level, unlock everything, skip a level. `?level=<id>` and `?auto=1` (bot play) exist for checks.

### Local development
- **L1 (Must)** Requires only Node LTS and Git. `npm install && npm run dev` serves the game with hot reload.
- **L2 (Must)** No secrets, API keys or backend are needed to run, build or test.
- **L3 (Should)** One command serves the production build locally (`npm run preview` today).

### Hosting
- **H1 (Must)** The build output is static and can be served by any static host.
- **H2 (Should)** Merging to `main` builds and deploys automatically; a failed build never deploys *(not built)*.
- **H3 (Should)** The optional leaderboard costs nothing at this scale and the game works without it (`leaderboard/README.md`).
- **H4 (Should)** Cookie-free analytics *(built 22 Nov 2026)*: the public site uses Cloudflare Web Analytics, and the game sends anonymous per-level counts (start, finish with stars, fail) to the leaderboard Worker, which keeps daily totals in D1 (`src/stats.ts`, `leaderboard/README.md`). Nothing identifies a player; nothing is sent in developer mode, during bot runs, from a copy without a leaderboard, or when the browser sends Do Not Track or Global Privacy Control.

### Art and assets
- **A1 (Must)** 320×180-unit world rendered at 1280×720 (`D = 4` texture pixels per unit), anti-aliased, scaled to fit. Sprites are authored at 4× their size in units (a 20×31-unit character is an 80×124 px image) and shown at scale 1/D. Text uses Chakra Petch, which has the macrons needed for te reo Māori (Ātea, Māhia). Flat fills come from the shared palette; gradients and shading may blend between palette colours.
- **A1b (Must, added 21 Nov 2026)** Platform backdrops never repeat a module. Each is one long strip, wider than the screen, that reads left to right as a walk through that chapter, built from things that were really there (places, machines, vehicles, signs, wildlife), each one traceable to a source or flagged in the PR as unverified. Use two or three parallax layers outdoors (far: sky, sea, islands; middle: land and buildings) and one detailed wall layer indoors. A layer `w` units wide scrolls with factor `(w - 320) / (levelWidth - 320)` so the whole strip passes by exactly once. Foreground props must not duplicate or hide what the backdrop already shows.
- **A1a (Must)** Recognisability checklist for any real vehicle, person or place: name the two or three features a fan would look for and make sure they are visible at normal size (for Electron: black carbon body, vertical ELECTRON lettering, flags, nine-nozzle base; for LC-1: cliff-top pad, strongback, lightning masts, sheep).
- **A2 (Must)** No art or audio asset files: textures are drawn in code and sound is synthesised (§2). The only binary files are photos for story cards (A5) and the screenshots in `docs/media/`.
- **A3 (Must)** Vehicles are drawn to the size guide (§8) so they compare correctly.
- **A4 (Must, changed 21 Nov 2026)** Sound is **synthesised in code** with the Web Audio API (`src/audio.ts`): no audio files, so nothing to license. Three parts: named one-shot effects (`snd.jump()`, `snd.stage()`, …), continuous loops whose level follows the game (`rumble`, `rotor`, `sea`, `hiss`, `whine`), and a 16-step sequencer for music. One song per setting: world map (C major, bright), 1990s workshop (A minor, funky), Māhia (G major, pastoral), launch (D minor, builds in three intensity steps: countdown, ascent, stage two), helicopter catch (E minor, fast), space (slow pads and bells, used for the Moon and for the kick stage). A win or fail jingle ends every level.
- **A4a (Must)** Sound starts only after the first key press or tap (browser rule). `M` or the speaker button mutes; the choice is remembered. Effects must match what is on screen: the engine roar thins with altitude and drops to a hum in vacuum, the Max-Q alarm sounds only while the bar is red, steam hisses louder near a vent.
- **A4b (Should)** A contributor adds a song as data (chords, bass and arpeggio patterns, drum strings, lead notes) in `SONGS`, not as an audio file. Recorded clips (`?rec=`) include audio, so the mix can be checked with `ffmpeg -af volumedetect`: keep peaks under -3 dB and effects from masking the music.
- **A5 (Must)** Photos on story cards: only files whose Commons page states CC0, public domain, CC BY or CC BY-SA. Each is listed in `public/assets/photos/CREDITS.md` with author, licence and source URL, and the card shows the credit and a source link. Photos are JPG, at most 960 px wide. CC BY-SA photos are shown unmodified apart from resizing.

### People
- **CH1 (Should)** A new character from a photo, with no drawing code *(not built, §17)*. Today a character is drawn in code to the §7.0 standard.
- **CH3 (Must)** Source photos used as drawing references are **never committed**. `.gitignore` excludes `**/source-photo.*`.
- **CH4 (Must)** Real people appear only in their public role, with sourced facts. Creators and anyone who is not a company public figure need recorded opt-in, such as a PR they opened or approved. We ask Rocket Lab about depicting its executives before a public launch.
- **CH5 (Must)** Respectful depiction only. Anyone depicted can have their character removed on request; the README says how.

### Legal and accuracy
- **X1 (Must)** A "Fan project, not affiliated with Rocket Lab" notice appears on the title screen, in the README and in the page footer.
- **X2 (Must)** The repository contains no official Rocket Lab logos, press photos or renders; mission patches are the exception, under X2c. Photos are allowed only under A5 (freely licensed, third-party or government sources). Badges are original designs that carry the mission name. A logo that happens to be visible on clothing in a freely licensed photo is acceptable; a photo chosen for its logo is not.
- **X2a (Must)** Real people are shown in photos only in their public role, with a neutral caption. No invented quotes: narration describes what people did, and dialogue is never put in a real person's mouth unless it is a sourced quotation. That includes titles that imply speech. A photo is used only when its source caption names the person shown; never caption a guess. Family members and other private people are not named. Where a claim rests on the company's own account, say "Rocket Lab says".
- **X2b (Must)** No stock talk beyond the historical fact of the listing: no price, valuation cheerleading or anything that reads as investment promotion.
- **X3 (Must)** The game's title does not use "Rocket Lab". The company and missions are named in the story text.
- **X4 (Must)** Every level and card has at least one source URL, checked at review.
- **X2c (Must)** Every level about a Rocket Lab mission ships that mission's official patch, taken from its page on rocketlabcorp.com and listed with the mission name and page in `src/assets/patches/patches.json`. The level's opening and result cards show it with "Mission patch © Rocket Lab" and a link to that page; launch levels also carry it as a fairing decal. Official photos remain local only: one shows on a level's cards when `src/assets/official/<level id>.jpg` exists (git-ignored) and the level has no freely licensed photo. `?clean=1` leaves out both.
- **X5 (Should)** Contact Rocket Lab comms before announcing publicly. This is a task for the maintainer, not for code.

### Quality
- **Q1 (Must)** First load under 5 MB. Target: interactive within 3 s on a mid-range phone over 4G.
- **Q2 (Must)** Before a merge: `npm run build` passes, every playable level's bot finishes with three stars, and `npm run sim` passes when launch physics changed. Running these in CI on every PR is *(not built)*.
- **Q3 (Should)** Lighthouse performance score of 90 or more on the title screen.

## 7. Characters

Every person in the game is drawn in code, in the house style, to the standard below. Turning a photo into a character without drawing code was the original idea for this section; it is not built and is described in §17.

### 7.0 Recognising a character (Must, added 21 Nov 2026)

A player who knows the person should recognise them at a glance, and a player who doesn't should be told who they are. Every real person shown in the game gets all of the following:

1. **Likeness notes.** Two to four visible, neutral features taken from captioned reference photos, written next to the art (for Peter Beck: a big mop of tight dark-brown curls, wider than the face; a broad face with a wide jaw; light eyes; black top and jeans). The small in-game figure must carry at least the first two.
2. **A portrait** (head and shoulders, 48×54 units) as well as the small figure. The portrait is used on the name plate, the corner chip and the title card.
3. **A name plate** at the start of every level: a small plate (chip portrait, name, role at that point in the story) in a corner of the screen, never over the middle, which fades after about four seconds. Nothing about the character stays on screen during play. On the world map the marker carries a name tag.
4. **Cartoon beside photo** once, on the title card or the character's first story card, when a freely licensed photo exists (§6 A5), so the drawing is tied to the real person.
5. **Era variants** when the story spans decades (Peter Beck: 1990s apprentice in overalls, present day in black). The defining features (hair, face) stay the same across variants.
6. **A likeness review** as part of the fan review (§12.1): the reviewer compares the cartoon with the reference photos and says, for portrait, chip and small figure separately, whether it reads as the person without the label.

Each entry in `CHARACTERS` (`src/content.ts`) carries its likeness notes and default role. Levels may set `role` to override the role line.

### 7.0a The cast: one main character, guest leads and running mates (revised 21 Nov 2026)

**Peter Beck is the main character of the whole game.** He is the map marker and the lead of every level unless a level says otherwise. There is no character picker.

Other people from the story appear in three ways:

- **Guest lead.** A level that is really someone else's story sets `hero: <character id>`, and the player controls that person for that level only. The intro card says so up front, with the drawn portrait and likeness notes. First one: **Adam Spice**, CFO since May 2018, leads "RKLB rings the bell" (the 2021 Nasdaq listing). Only give someone a level from a chapter they were part of.
- **Running mate (power-up).** A platform level can set `buddy: <character id>` and place a `C` bubble showing that person's face. Picking it up brings them in for about 11 seconds: they run a few steps ahead, copy the player's stride, and see off any enemy they reach. In Adam's level the running mate is Peter. Use this for people who belong in a chapter but do not carry it. A character can set `trait` to change what the running mate does: **Ashlee Vance** (`trait: 'reporter'`, added 22 Nov 2026) walks the Rosie the Robot factory floor for 20 seconds on his own timer, so he can be had alongside an outfit; his notebook rings the level's easter egg and blueprint, with an arrow at the screen edge when they are out of sight; and Enter (or X) takes a photo whose flash stops every troublemaker in view for 3 seconds. He gets his own name plate when he joins, and the level's intro card introduces him with his portrait (`note` on the character). His sourced part in the chapter: a day at the Auckland factory with Peter Beck in November 2018, reporting his book. The level is set a year later, which the card says; no source puts him at a launch, so the game never does. **Madison Malone** (`trait: 'host'`, added 23 Nov 2026) walks into mission control with Peter Beck in No Time Toulouse, Electron's 50th launch, for 30 seconds on her own timer: her access opens the level's access doors as you reach them, and Enter rolls her camera, which gets troublemakers out of the shot (a ruru flies off from its light) and puts a fact of the day in a lower third. Her sourced part: Rocket Lab gave her NZ Herald show exclusive access to its mission control in Auckland for that launch, and her report from the room was published on 23 June 2024. She appears with her agreement, confirmed by the owner; the game gives her no words, and her walk from the street, her jacket and her camera are the game's. Her walking figure follows her portrait (`bustMadison`): long, straight, centre-parted hair lighter in the lengths, a round face, a broad smile, a black tee, here under a black jacket as in her byline photo. Her report quotes Peter Beck but does not say where he watched from, so the level's text says that walking him in is the game's own.
- **Someone to meet** (below).

A second guest lead was added on 21 Nov 2026: **Shaun D'Mello** leads "Go Find the Launch Site", the chapter Rocket Lab's own account gives him. Because that level is ridden, not walked, he has a portrait and a chip but no walking sprite set: on the bike he is in a helmet, and the name plate says who it is. His portrait was drawn from the captioned black-and-white photo on Rocket Lab's team page, so its colours are the game's choice and need checking against a colour photo.

A third guest lead was added on 22 Nov 2026: **Mrs. Iglesias**, the creator of the YouTube channel Space Lab (@spacelabRKLB, @MrsIglesiasRKLB on X), leads "Seven diaries, one slot", the Q1 2026 retail interview that Vince is Bullish thanked her on X for arranging. She appears with her permission, confirmed by the owner on 22 Nov 2026. Her level is a scheduling puzzle, so like Shaun D'Mello she has a portrait and a chip but no walking sprite set; the portrait was drawn from her X profile picture (her channel picture is the Space Lab logo). In the game she sends the invitations, which the sources do not say: the level's text says so.

Characters live in a `CHARACTERS` list: id, texture prefix, name, role, the year they joined, likeness notes. Every character who can be controlled gets a full sprite set (walk, jump, every power-up outfit), a portrait and a chip, drawn to the §7.0 standard. So far: Peter Beck (plus his 1990s variant) and Adam Spice (shaved head, long face, navy blazer, open-collar shirt).

**Meeting people.** People stand beside the main path as small nodes with a violet trail, placed where and when they enter the story, and appear once you reach the node they branch from. Stepping onto one opens a **person card**: who they are and what they did, with a freely licensed photo where one exists (A5) or the game's drawn portrait where none does. Cards state facts with sources and never put words in anyone's mouth (X2a). The map counts `PEOPLE n/m`. So far: Mark Rocket and Sir Stephen Tindall (Auckland, 2006–07), Ky "Rocketman" Michaelson (Minnesota, 2006), Sir Michael Fay (Great Mercury Island, 2009), Dava Newman (Auckland, 2016), Gabe Newell (beside Return To Sender, 2020; text only), Adam Spice (beside the Nasdaq node, next to his own level), Rob Lillis (beside ESCAPADE; text only), Madison Malone (branching from the Sir Peter card, near Auckland: she watched the 50th Electron launch from Rocket Lab's mission control in June 2024; drawn portrait from her byline photo, added 22 Nov 2026). Ashlee Vance and Madison Malone appear with their agreement, confirmed by the owner. The four YouTube creators of the Q2 2024 interview (Vince is Bullish, Dave G, Matt Farley of MattMoney, Scott O) branch from "Four channels, one call", with portraits drawn from their channel pictures (Scott O's from a frame of the interview); they appear with their permission, confirmed by the owner on 22 Nov 2026. Mrs. Iglesias of Space Lab branches from "Seven diaries, one slot" (permission confirmed by the owner on 22 Nov 2026), and each of the four creators' cards now has one sourced line on the Q1 2026 interview. In that level the player is "the edit desk", a role the game invents, and Peter Beck and Adam Spice appear only as faces on the tape, with no words. None of the nine levels added on 21 Nov 2026 has a guest lead or a running mate: none of those chapters has one person the public record puts at the centre of it other than Peter Beck, and the launch webcast hosts and recovery crews are not named in sources we could cite.

**Before a public release** (CH4, X5): every living person shown here is depicted in their public role only. Ask Rocket Lab about the two executives, and offer each person named a simple way to be removed.

### 7.1 to 7.6 (retired)

These sections specified a paper-doll art kit, a `character.yaml`, a compositor, a `/builder` scene, a photo-to-character prompt and a portrait script. None was built; the idea is kept in §17.

## 8. Size guide

Sizes are in world units (1 unit = 4 texture pixels). Launch scenes use **1 unit ≈ 0.225 m**.
- Ātea-1: about 6 m → about 36 units tall (drawn a little wider than scale so it reads)
- Electron: 18 m tall, 1.2 m diameter → 80 × 6 units (fairing 12, stage 2 10, stage 1 with interstage and engines 58)
- Neutron: 43 m tall with a 7 m first stage (Rocket Lab's launch page, as read in November 2026) → about 190 × 31 units, so its launch scene needs a wider camera.

People are drawn on a 24 × 34-unit frame and are not to the vehicle scale.

## 9. Starter level map

Each row is a node on the world map. Every date must be checked against a source before merging. Status is `flown` unless stated. **Draft** = playable in the current draft build.

| # | Id | Title | Date | Kind / mechanic | Map location | Recognisable cues and easter eggs |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | workshop | The Rocket Bike | 1995–2000 | **platform** · Draft | Dunedin | Fisher & Paykel workshop after hours; collect bike frame, peroxide tank, nozzle, helmet, jumpsuit. Backdrop strip: clocking in under the Southern Cross → tool and die bay → DishDrawer line → design corner (rocket equation, bike blueprint, telescope) → peroxide corner ("NO PROPELLANT MIXING ON SITE") → roller door to Princes Street. Props: the turbo Mini, a jet pack, a cruise-missile engine. Enemies: rocket scooter, snapping DishDrawer, welding sparks. Egg: water rocket |
| 2 | founded | Rocket Lab is founded | 2006-06 | card · Draft | Auckland | the US "rocket pilgrimage", Ky "Rocketman" Michaelson, Mark Rocket, Stephen Tindall |
| 3 | atea-1 | Ātea-1 | 2009-11-30 | **launch** (unguided: aim the rail) · Draft | Great Mercury Island | Manu Karere; first private company in the Southern Hemisphere to reach space |
| 4 | rutherford | Rutherford hot-fire | 2013–2016 | **mini-game** `hotfire` · Draft | Auckland | electric pumps, 3D-printed engine, battery hot-swap |
| 4a | find-the-launch-site | Go Find the Launch Site | about 2015 | **mini-game** `ride`, played as Shaun D'Mello · Draft | Māhia | the engineer told to "go find the launch site"; open ocean to the north, south and east; 45 minutes by dirt bike with no road. Side-on riding over the farm: sheep, stumps, mud, gullies, five survey flags. Power-up: knobbly tyres. Egg: the shipping-container mission control. Secret: Inside the first hundred (card) |
| 5 | lc-1 | Road to Māhia | 2016-09-26 | **platform** · Draft | Māhia | pad hardware. Backdrop strip: Wairoa and its relocated lighthouse → Onenui Station (woolshed, sheep, cattle) → the gravel road with a LOX tank on a low-loader → the building site (crane, containers, tracking dish) → the range (hangar, masts, strongback); behind it Mokotahi, a dolphin, Portland Island. Enemies: red tape, rams, gulls. Egg: gnome Chompski |
| 6 | its-a-test | It's a Test | 2017-05-25 | **launch** (scripted telemetry loss at 224 km) · Draft | LC-1 | first Electron flight; unticked "forward error correction" box on the loss screen |
| 7 | still-testing | Still Testing | 2018-01-21 | **launch** + kick stage · Draft | LC-1 | first orbit; scripted T-2 abort (Dec 2017 attempt); Humanity Star and a Dove in the transfer orbit; the secret kick stage circularises two Lemur-2s |
| 8 | its-business-time | It's Business Time | 2018-11-11 | **launch** + kick stage + deploy sequence · Draft | LC-1 | first fully commercial flight (210 × 500 km, 85°, circularised at 500); the June 2018 motor-controller scrub replayed on the first count; new to play: point the kick stage and release six satellites one at a time. Egg: IRVINE01, built by high-school students |
| 9 | factory | Rosie the Robot | 2019-11-13 | **platform** · Draft | Auckland factory | composite parts in 12 hours instead of 400+; new to play: conveyor belts. Backdrop strip: the door and the 2019 launch board (five flown, one to come) → rolls of carbon fibre and the hand-work bench → cure oven → Electrons on cradles and a crate of Rutherfords from Huntington Beach → fairing halves and the clean room → Rosie's cell. Enemies: runaway sander, roll of carbon fibre, carbon dust, offcuts. Power-ups: clean-room suit, carbon-weave jacket. Egg: Rutherford no. 100. Secret: Photon card. Running mate: Ashlee Vance (his notebook marks the egg and the blueprint; Enter takes a photo whose flash stops troublemakers) |
| 10 | pics-or-it-didnt-happen | Pics Or It Didn't Happen | 2020-07-04 | **mini-game** `fault-finder` · Draft | LC-1 → Auckland | flight 13 failure, one bad electrical connection; trace six telemetry channels back to the first sign of trouble, then find the bench test that exposes it; the clock counts days (real review: 27; back flying on day 58) |
| 11 | return-to-sender | Return To Sender | 2020-11-20 | **mini-game** `splashdown` · Draft | Pacific | first booster ocean recovery: flip with cold-gas thrusters, hold through "the wall", drogue below Mach 2, main chute, 9 m/s; gnome Chompski rides away on the kick stage (20 November in both UTC and NZ time; the 19th only in the US) |
| 11a | eat-the-hat | Eating the Hat | 2021-03-01 | **mini-game** `hat-trick`, two acts · Draft | off Long Beach (the release's dateline; where the video was filmed is not published) | the Neutron announcement and the Vector merger, same day; Beck's old vow to eat his hat if Rocket Lab went reusable. Act one, the factory walk as a tracking shot: stay in the camera's frame while putting on the blue blazer and the cap and picking up the blender (Electron stages racked on their sides in red cradles, a Rutherford on a stand, a US and an NZ flag, red floor lines). Act two, the table inside the ribbed fairing mock-up: snip the cap on the cut lines, pulse the blender, pour into the martini glass to the line, eat a pinch; his one line is the sourced "It's about time I finally ate the hat." Egg: the SmallSat 2019 "eating my hat" line. Watch link to "Introducing Neutron" |
| 12 | going-public | RKLB rings the bell | 2021-08-25 | **platform**, played as Adam Spice · Draft | Long Beach | SPAC with Vector; collect merger agreement, PIPE commitments, Form S-4, shareholder vote, RKLB ticker. Backdrop strip: Long Beach HQ and the Rutherford line → mission control → the March 2021 Neutron whiteboard → three clocks (Auckland on Thursday, Long Beach, New York) → the VACQ→RKLB board → a live video wall of Times Square. The bell is rung by video link: Peter appears on a screen. Enemies: bears, red tape, red candles. Running mate: Peter. Egg: the hat in the blender |
| 13 | there-and-back-again | There And Back Again | 2022-05-03 | **mini-game** `heli-catch` · Draft | Pacific off Māhia | Sikorsky S-92 hooks the booster, then releases it |
| 14 | capstone | CAPSTONE to the Moon | 2022-06-28 | **mini-game** `orbit-raise` · Draft | the Moon | Lunar Photon, HyperCurie perigee burns, TLI on 4 July |
| 15 | lc-2 | Virginia Is For Launch Lovers | 2023-01-24 | **launch** + kick stage · Draft | Wallops | first Electron from LC-2 (three HawkEye 360 satellites, 550 km, 40.5°); new site backdrop (barrier island, Pad 0A's water tower next door, plovers) at dusk; new to play: the autonomous flight termination corridor; the December 2022 upper-level-winds scrub |
| 15a | heavens-on-sale | When the Heavens Went on Sale | 2023-05-09 | card · Draft | New York | Ashlee Vance's book (Ecco, HarperCollins) follows Rocket Lab, Astra, Firefly and Planet; his November 2018 day at the Auckland factory and his first visit in 2015; the Bloomberg excerpt's "dishwasher engineer". Drawn: a shelf with the book's spine and his notebook (not the real cover) |
| 15b | markets-with-madison | Markets with Madison | 2023-05-18 | card · Draft | California (Beck spoke from there) | NZ Herald show hosted by Madison Malone (then Reidy): Neutron "head to head" with Falcon 9, Starship's April 2023 test flight, Electron's reliability. Drawn: an Auckland studio with a split screen to California |
| 16 | haste | Scout's Arrow | 2023-06-18 | **launch** (suborbital) · Draft | Wallops | first HASTE flight (Leidos, MACH-TB), at night; no orbit: SECO on a speed, coast over the top, release the test article in an altitude window with the nose on the velocity vector. Targets are game values: the real profile was never published |
| 16a | paschens-law | Paschen's Law | 2023-09-19 | **launch** → `arc-lab` → **launch**, three acts · Draft | LC-1 | flight 41 loses second-stage high voltage at T+151 s (scripted); in the lab, show that AC ripple, helium and nitrogen, and an insulation fault are all needed for the arc, and that a sealed battery frame stops it; then fly "The Moon God Awakens" (15 Dec 2023) |
| 16b | beginning-of-the-swarm | Beginning Of The Swarm | 2024-04-23 | **launch** + kick-stage flight plan · Draft | LC-1 | NEONSAT-1 to 520 km, NASA's solar sail to 1,000 km, then a retrograde de-orbit burn: four Curie ignitions |
| 17 | sir-peter | Sir Peter | 2024-06-03 | card · Draft | Wellington | KNZM in the King's Birthday Honours, invested 5 Sept 2024; 50th launch "No Time Toulouse" in June. Person to meet: Madison Malone, at Auckland mission control for the 50th launch |
| 17f | no-time-toulouse | No Time Toulouse | 2024-06-20 (UTC; 6:13 a.m. NZST on Friday 21 June) | **platform** · Draft | Auckland (Mount Wellington), near the Sir Peter card | Electron's 50th launch, five Kinéis satellites to 635 km; the walk from a pre-dawn Mount Wellington street (the Moon 99.5% lit, low in the south-west; Maungarei) through the white entry portal with its glowing motto, the scale-model Electron through the reception ceiling, the Oculus and its hung nozzle, the dark sunken viewing gallery with red LED risers and big screens, to mission control. New to play: access doors that open only as somebody badges through, and a T− clock to be in the room before lift-off; the set piece is the lift-off on the big screen. Enemies: ruru, runaway alarm clocks, cartons of black merch. Power-ups: winter layers, the kick stage (double jump). Running mate: Madison Malone (`host`: opens doors, films). Egg: the Moon and the solstice. Secret: Kinéis: five for five (card) |
| 17c | wild-wild-space | Wild Wild Space | 2024-07-17 | card · Draft | mid-Pacific, between Sir Peter and Two Hemispheres | HBO documentary by Ross Kauffman from Vance's book; DC/DOX premiere 14 June 2024; Beck appears in it with Astra's Chris Kemp and Planet's Will Marshall. Drawn: a clapperboard and a can of film (no HBO artwork) |
| 17e | four-channels | Four channels, one call | 2024-08-11 (UTC; 12 August in continental Europe and New Zealand) | **mini-game** `edit-bay`, two acts · Draft | mid-Pacific, between Wild Wild Space and the Forbes card | after the Q2 2024 results (call 8 August, 2 p.m. PT), four YouTube creators (Vince is Bullish, Dave G Investing, Matt Farley of MattMoney, Scott O) interview Sir Peter Beck and Adam Spice; four parts, one per channel, live 15:00 PDT on 11 August (part 4 at 15:20), full cuts on 13 August (15:00, 15:00, 16:00, 16:02 PDT). Act one: scrub the tape, cut at the breaks (the chapter marks of Scott O's full cut), send each part to the channel with the same face. Act two: splice the parts in order and schedule four uploads on one connection. Hazard: stalled uploads (a game element). Power-up: the chapter list (the chapter marks of Scott O's full cut, borrowed two days early). Backdrop: an edit desk with three clocks (Los Angeles, Amsterdam, Auckland). Egg: frame-perfect cuts; the Q2 release's Archimedes and ESCAPADE news. People to meet: the four creators, drawn from their channel pictures. The player is "the edit desk", a game role; Beck and Spice appear on the tape only, with no words |
| 17d | space-billionaire | Forbes counts a billionaire | 2024-11-15 | card · Draft | mid-Pacific, beside Two Hemispheres | Forbes's first US$1 billion estimate: a stake of roughly 10% plus earlier share sales. No other figures. Drawn: a list with a new name on it and a 10% slice |
| 17a | two-hemispheres | Two Hemispheres | 2024-11-24 | **mini-game** `dual-count` · Draft | mid-Pacific | "HASTE A La Vista" from LC-2 and "Ice AIS Baby" from LC-1, 21 h 55 min apart: two consoles of timed calls, one pair of hands |
| 17b | outback-delivery | Outback Delivery | 2025-02-27 | **mini-game** `orbit-ops` · Draft | Australia (a corner of it now on the map) | Varda's W-2 capsule on a Rocket Lab Pioneer: lower perigee to 300 km, raise apogee to 900, de-orbit so the predicted landing sits on Koonibba, release at 470 km |
| 17g | return-on-investment | Return On Investment | 2025–2026 (revealed 27 Feb 2025; Bollinger contract announced 10 Jul 2025; thrusters and power generation at the yard by May 2026) | **mini-game** `fit-out`, two acts, played as Shaun D'Mello, status `in-progress` (playable) · Draft | Amelia, Louisiana (drawn a little west of its true place, clear of the Stennis node) | Neutron's landing barge, the former *Oceanus*, being fitted out at Bollinger's Amelia yard. Act one, the yard from the side: a gantry crane with a swinging load puts four thrusters, the power generation, its blast shield and the capture gear on their marks, on a hull that trims as the weight goes on. Act two, the same yard from above: hold the fitted barge in four boxes on its thrusters, against wind. Sourced: both names, 400 ft, Canal Barge, Bollinger and Amelia, the three modifications, electrical equipment on deck, East Coast operation (Rocket Lab's two releases); four thrusters, 10 MW, 5,000 t, the main cabin, sea trials planned for later in 2026, flight one's soft splashdown and the barge from flight two (the May 2026 results call); delivery and sea trials not announced as of November 2026. The game's own: the gantry crane, the weights and order, the power generation as one unit, the old name still on the hull and its repainting, the trial, and D'Mello at the yard (both cards say so). Egg: take the old name off the hull with the bare hook (Oceanus the Titan, from Rocket Lab's release). Scenery: fabrication shed, bald cypress with Spanish moss, brown water, a brown pelican |
| 18 | escapade | ESCAPADE | 2025-11-13 | **mini-game** `cruise` · Draft | Mars | twin Rocket Lab-built spacecraft, launched on New Glenn; thruster piloting with no drag round the L2 kidney bean, then the powered Earth flyby (Blue 7 Nov 2026, Gold 9 Nov) and out through the Mars gate. Arrival (September 2027) is not played |
| 18a | seven-diaries | Seven diaries, one slot | 2026-05-07 (the results call; the interview went out on 8 May, Pacific time) | **mini-game** `slot-finder`, played as Mrs. Iglesias · Draft | mid-Pacific, between ESCAPADE and VICTUS HAZE | after the Q1 2026 results (call 7 May, 2 p.m. PT) five creators (Mrs. Iglesias of Space Lab, Vince is Bullish, Dave G, Matt Farley of MattMoney, Scott O) interview Sir Peter Beck and Adam Spice; Vince thanked her on X for arranging it and Scott O for recording and editing it. Slide and stretch one meeting across seven diaries (only hers known), send invitations, read the replies; the clock eats the past; Scott O's five-hour edit (a game value) has to make the 3 p.m. PT release Vince announced. Hazard: a TENTATIVE entry in Adam Spice's diary that becomes a meeting at 5:30 p.m. Thursday (a game element). Power-up: the group chat, one person's whole diary (two asks, a game element). Hints: three, half an hour of clock each. Backdrop: an organiser's desk at dusk, a boxed Electron model (her channel's unboxing) and a phone with the chat. Egg: three stars without chat or hint; the Q1 release's Motiv agreement and Gauss thruster, both chapters in her video. Every busy block is a game value; when it was really recorded is not published. Watch: her cut on Space Lab. Person to meet: Mrs. Iglesias |
| 18b | q1-2026-qa | Five channels, one Q&A | 2026-05-08 (UTC; Space Lab's cut went up at 16:19 PDT, 01:19 on 9 May CEST) | card · Draft | mid-Pacific, beside Seven diaries | the five cuts, 14:59 to 16:19 PDT on 8 May (Vince, Scott O, Dave G, MattMoney, Space Lab), each just under an hour; the chapter list YouTube shows on hers; the earliest of the group's joint interviews that includes her, as far as their own videos show. Drawn: the cast of seven. Watch: her cut |
| 19 | victus-haze | VICTUS HAZE | 2026-06-19 | **mini-game** `countdown-race` · Draft | Māhia | launch 16 h 42 min after the Notice to Launch; ten jobs with dependencies, two crews, the pad from dawn to a night lift-off |
| 20 | the-mountain-god-rises | The Mountain God Rises | 2026-11-14 | **launch** + kick stage · Draft | LC-1 | 100th Electron, for iQPS; confetti |
| 21 | archimedes | Archimedes and the tank | 2024–2026 | **platform**, status `in-progress` (playable) · Draft | Stennis → Middle River → Wallops | Archimedes hot fire; Jan 2026 tank rupture in a hydrostatic trial; Oct 2026 voids in a tank dome, with a replacement forward dome being made; LC-3 open. New to play: test positions that fire on a cycle. Enemies: falling ice, blue crabs, voids. Power-ups: cryo kit, methane-and-oxygen pack. Egg: Archimedes' bath. Secret: Hungry Hippo card |
| 22 | neutron | Neutron: first flight | no earlier than 2027 | launch, status `announced` (locked) · Draft | LC-3, Wallops | Hungry Hippo fairing, nine Archimedes, barge "Return On Investment" |

The draft therefore has every row playable except the locked Neutron teaser: 6 platform levels (one led by Adam Spice), 9 launch levels (one of them in three acts), 12 mini-games (two led by Shaun D'Mello, one by Mrs. Iglesias) and 7 cards, plus 6 secret nodes (Princes Street Sprint, Kaitorete Spit, Inside the first hundred, Photon, the Hungry Hippo, Kinéis: five for five) and 13 people to meet. Rows numbered with a letter were added on 21 Nov 2026 at the owner's request, after the original list was complete; 15a, 15b, 17c, 17d, 17e, 18a and 18b on 22 Nov 2026; 17f and 17g on 23 Nov 2026 (rows stay in story order, so 17c and 17d sit before 17a).

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
  doors?: number[];                        // tiles of access doors: solid, open now and then; a `host` running mate opens one at once
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
| `ruru` | control | flies a wave over the street like the gull; a stomp or Madison Malone's camera light sees it off | the morepork, New Zealand's night owl, which DOC describes as nocturnal and sensitive to light; lift-off was more than an hour before sunrise |
| `alarm` | control | fast ground patrol, ringing; stomp to snooze it | lift-off at 6:13 a.m. on a winter morning; Michael Pearson had been at mission control since 9 p.m. |
| `merch` | control | a slow, hopping carton of black tees; stomp to fold it | by the Herald's report, everyone in the room wore black company merchandise |

**Access doors** (control) are full-height glass doors: shut for 2.6 s, open for 1.8 s as somebody badges through, and never shut on the player; a `host` running mate opens one as soon as she or the player is within 46 px. A theme can also set `count` (seconds): the HUD then shows a T− clock that reaches T−0 where three stars stop (75 s in No Time Toulouse, a game clock: the real count is not this short). Two things in the newer levels are scenery that acts rather than enemies. **Conveyors** (factory) carry the player along at 48 px/s, with or against the direction of travel, on the ground or on a platform. **Test positions** (stennis) hold an engine over the trench that fires on a 3.6 s cycle: green lamp, flashing amber for 0.8 s, then a second of blue flame that sends the player back to the last safe footing.

**Power-ups** float in glass bubbles. Each lasts a few seconds, shows a timer bar, and changes how the character looks as well as what he can do (the look flickers back as it runs out). Like enemies, each is tied to the chapter:

| Code | Level | Look | Effect | Why it is there |
| --- | --- | --- | --- | --- |
| `J` jet pack | workshop | twin tanks on the back, goggles | hold jump to fly for 7 s | Beck built a jet pack at Fisher & Paykel |
| `S` suit and helmet | workshop | yellow suit, open-face helmet | untouchable for 7 s; enemies are knocked out on contact | what he wore on the rocket bike |
| `H` hard hat and hi-vis | Māhia | white hard hat, orange vest | untouchable for 7 s | the pad was a building site in 2016 |
| `B` gumboots | Māhia | black gumboots with a red band, checked bush shirt | faster, plus a second jump in mid-air, for 9 s | farm country |
| `C` running mate | listing | no outfit: the level's `buddy` appears and runs just ahead of you | for 11 s the running mate sees off every enemy he reaches | people who belong in a chapter but do not lead it (§7.0a) |
| `C` with `trait: 'reporter'` | factory (Ashlee Vance) | no outfit: Vance walks beside you with a notebook and a camera, and raises the camera when he takes a photo | for 20 s, on his own timer: rings round the egg and the blueprint (arrows at the screen edge when they are off screen); Enter or X takes a photo that stops every troublemaker in view for 3 s, every 2.5 s at most | he spent a day at the factory with Peter Beck in November 2018, reporting a book |
| `T` clean-room suit | factory | white coverall, blue gloves and shoe covers, safety glasses | untouchable for 7 s | spacecraft and kick stages are built behind glass |
| `L` carbon light | factory | carbon-weave jacket with a bright edge, safety glasses | for 10 s jumps reach about five tiles and falls are slow | carbon composite is why Electron weighs so little |
| `F` cryo kit | stennis | clear face shield on a yellow headband, long blue apron, gauntlets | untouchable for 7 s | what handling cryogenic propellants calls for |
| `M` methane + oxygen | stennis | two frosted bottles on the back, goggles | hold jump to fly for 7 s, on a blue flame | Archimedes burns methane and liquid oxygen, and methane burns blue |
| `W` winter layers | control | a quilted puffer jacket and a red knitted beanie, the curls spilling out | untouchable for 7 s | the morning of the June solstice, sunrise at 7:33 |
| `U` kick stage | control | a gold-wrapped kick stage on the back with its Curie nozzle | a second jump in mid-air (press jump again) for 9 s | the kick stage deployed the five Kinéis satellites, in singles and pairs |
| `C` with `trait: 'host'` | control (Madison Malone) | no outfit: she walks beside you in a black jacket with a handheld camera, and raises it to film | for 30 s, on her own timer: her access opens every access door as you reach it; Enter or X rolls her camera for 2.2 s (every 5.2 s at most): troublemakers in front of the lens within 120 px run to the far end of their beat, a ruru flies off for good, and a lower third shows a fact of the day | Rocket Lab gave her show exclusive access to mission control for this launch, and she filmed there |

Every outfit keeps the curls visible, so the character stays recognisable (§7.0).

**Secrets.** Each platform level hides one **blueprint** that can only be reached with that level's movement power-up (flight, or the double jump). Finishing the level with the blueprint opens a **secret node** on the world map: a branch off that level's node, drawn with a blue trail and a glow, as in Super Mario World's secret exits. Secret nodes are optional and never block the main path. The map shows `SECRETS n/m`. So far: The Rocket Bike → **Princes Street Sprint** (a bonus mini-game, mechanic `sprint`: open the valve, keep the wobbling bike upright, beat the sports car, three stars for 140 km/h); Road to Māhia → **Kaitorete Spit: the first choice** (a bonus story card); Rosie the Robot → **Photon: the kick stage grows up** (card; the blueprint needs the carbon-light jump); Archimedes and the tank → **The Hungry Hippo arrives** (card; the blueprint hangs over the canal and needs the methane-and-oxygen pack); No Time Toulouse → **Kinéis: five for five** (card; the blueprint hangs over the viewing gallery and needs the kick stage's second jump). Level data: `powerups: [code, x, row][]`, `secret: [x, row]`, and `unlocks: <bonus id>` on the level; bonus nodes live in a separate list with a `parent`.

Plain `sheep` stay friendly: they only bump you. Rules for adding one: tie it to a fact, give it one clear behaviour, make it readable at a glance, and check the level is still fair by running the bot (`?auto=1`) to a clean three-star finish. Jump reach is 3 tiles up and about 4 across; keep every gap and step within it.

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

**Kick-stage flight plan** (`plan`): a list of steps flown in order after SECO: `{ do: 'circ', alt }` (prograde burn at apogee until perigee meets it), `{ do: 'raise', alt }` (prograde burn until the apogee reads `alt`), `{ do: 'lower', alt }` (the stage turns round and burns retrograde until the perigee reads `alt`), `{ do: 'deploy', name, mass }`. Space burns, Enter confirms a step once the engine is off. Each deployment is scored against the last circular orbit asked for. Three stars need every payload within 15 km and the last `lower` reached.

**Scripted loss** (`twist: 'scripted-loss'`): about 1.4 s after stage-2 ignition the stage loses all power. It counts as a success (three stars for a clean ascent) and is meant to be followed by another act.

**Sounding rockets (Ātea-1)** are unguided, so they are aimed, not flown. The flight shows Mach number and an estimated nose-tip temperature (Beck: about Mach 5 and about 900 °C). The player sets the **rail elevation** while the wind shifts; the rocket weathercocks into the relative wind as it leaves the rail. A live prediction draws the arc. Clear the apogee line and land the impact in the range-safety zone, start the count (Enter holds it if a gust takes the prediction out of limits), and release the **dart** at burnout: the spent booster is all drag.

**On screen:** mission clock with time-compression factor, altitude and speed (km/h, as on the webcast), apogee and perigee, a webcast-style timeline (MAX-Q, MECO, FAIRING, HOT-SWAP, SECO), gauges for throttle, propellant, dynamic pressure, Q-alpha, heating, battery, g-load and structural load, the flight director, and an altitude-against-downrange plot with the planned profile.

**The model** (`src/launchSim.ts`, pure TypeScript, SI units): a point mass in a plane around a round, non-rotating Earth; inverse-square gravity; thrust along the body axis, varying with ambient pressure; an exponential atmosphere and constant drag coefficient; real orbital elements from the state vector. Electron uses the published thrust and specific impulse (224 kN at lift-off and 311 s for nine Rutherfords, 25.8 kN and 343 s for the vacuum engine); **stage masses are tuned so the autopilot reproduces the webcast timeline** (MECO about T+2:30, separation T+2:33, stage-2 ignition T+2:36, fairing just after T+3:00, hot-swap T+6:31, SECO T+9:06 into 250 × 500 km) and are not official figures. Limits such as the 23.5 kPa dynamic-pressure rating are game values. Ātea-1 uses the published motor figures (peak about 6.9 kN for about 14.5 s) with estimated masses and drag tuned to its 120 km design apogee. Time is compressed 5× in stage 1 and 8× in stage 2, and slows around events.

- `reference()` flies the mission with the autopilot to produce the planned profile and the stage-1 cue; `npm run sim` prints the timeline, margins and failure cases, so a change to the numbers can be checked without a browser. CI should assert that the autopilot reaches orbit in every launch level and that full throttle through Max-Q fails.
- **Scripted endings** (`twist: scripted-no-orbit`) count as a clear and explain the real outcome.

### 10.3 (retired)
The `/builder` scene planned here is in §17.

### 10.5 `fault-finder` (mini-game, built 21 Nov 2026)
Two phases against a clock that counts days since the failure. **Trace:** six telemetry strips from the last two minutes of the burn, shuffled each play; ← → move a cursor through time, ↑ ↓ change channel, Space flags a point. Only the earliest deviation on the root channel is accepted; flagging a symptom marks where that symptom begins and costs two days. **Bench:** choose a test (↑ ↓, Space) and run it on a six-connection harness; the three standard acceptance tests pass everything, as they did on the flight unit, and only a sustained-load test makes one connection's resistance climb; ← → and Enter tag it. Three stars for 27 days or fewer. The channel names, the tests and their durations are the game's own stand-in for the real investigation.

### 10.6 `splashdown` (mini-game, built 21 Nov 2026)
The first stage falls from about 78 km. Attitude has inertia and no damping in vacuum: ← → fire cold-gas thrusters (limited gas) and only an opposite puff stops a turn. Once dynamic pressure builds the stage is stable engines-first or nose-first, and flying "the wall" (55 to 22 km in the game) off-axis builds heat-and-load damage. Space opens the drogue (allowed below Mach 2) and then the main chute (allowed below 110 m/s); early deployment tears the chute off. Three stars for touching down at 10.5 m/s or less with damage under 35%. Published numbers used: separation near 80 km, 2,350 m/s peak, drogue below Mach 2, 9 m/s at the water. The wall altitudes, the main-chute limit and the drag terms are game values.

### 10.7 `cruise` (mini-game, built 21 Nov 2026)
Newtonian piloting on one screen: Earth with inverse-square gravity, four thrusters on the arrow keys, a main engine on Space that pushes along the direction of travel, one propellant tank. Fly four gates round Sun–Earth L2, pass under Earth through a marked band, burn at the lowest point, and leave through the Mars gate above a minimum speed (the perigee burn is what makes that speed reachable). Gold is drawn following Blue's recorded path. The clock waits for the first key press. Three stars for 35% propellant left. Distances, speeds and the gates are not to scale.

### 10.8 `countdown-race` (mini-game, built 21 Nov 2026)
A scheduling race in compressed time (2.4 s per hour). Ten jobs with dependencies, two crews; ↑ ↓ choose, Space assigns a ready job to a free crew. The clock starts at the Notice to Launch. Pass inside 24 hours; three stars for 16 h 42 min or less. The jobs and their durations are game values: the only published split is about four hours to finalise trajectories, update flight software and co-ordinate ground stations.

### 10.9 `ride` (reusable, built 21 Nov 2026)
A side-on ride over rolling ground (scene `Ride`). → throttle, ← brake, Space hops; in the air ← → tip the vehicle, and it must land within about 49° of the slope. Everything is level data:
```ts
{
  theme: "farm" | string;                 // THEMES in Ride.ts: backdrop strips, ground colours, vehicle sprite, hazard art and messages, power-ups, goal, texts
  terrain: [x: number, y: number][];      // control points in world units; the ground is smooth between them; the last x is the length
  gaps?: [x0: number, x1: number][];      // breaks in the ground: fall in and you go back to the last safe spot
  zones: [kind: "mob" | "block" | "bog", x: number, width: number][];   // mob: pass below walking pace or hop it; block: hop it; bog: drags
  flags: [x: number, name: string][];     // ride through all of them to finish
  egg?: [x, height]; secret?: [x, height]; powerups?: [code, x, height][];   // floating pickups, measured up from the ground (or from the lip of a gap)
  par: number; flagWord?: string;         // seconds for three stars (with no spills); what the HUD calls the flags
}
```
A theme's power-ups can change the vehicle sprite, ignore bogs and scale the hop (`farm`: knobbly tyres, hop × 1.3, which is what the blueprint needs). The bot holds the throttle, hops obstacles and gap lips, and levels the bike in the air. Could carry other levels: the coast road to Māhia with the first Electron on a truck (a `truck` theme), the helicopter crew's drive to the recovery ship, a Neutron transporter crawling to LC-3, the rocket bike again.

### 10.10 `orbit-ops` (reusable, built 21 Nov 2026)
Spacecraft operations on a ground-track map (scene `OrbitOps`): a world map, the track ahead, burns that belong at marked points on the orbit, a live predicted landing point, a release.
```ts
{
  theme: "varda" | string;                // map texture, craft and capsule sprites, step labels, texts
  orbit: { alt_km: number; inc_deg: number }; thrust: number;   // starting circular orbit; acceleration in m/s²
  target: { name: string; lat: number; lon: number };
  steps: { do: "lower" | "raise" | "deorbit" | "release"; alt?: number }[];
}
```
The model is a point mass in its orbital plane (leapfrog integration, exponential atmosphere below 120 km) mapped to latitude and longitude with a rotating Earth. On start the scene flies the plan once on paper to learn where the first burn must go for the landing to reach the target's latitude; after the orbit is shaped it fast-forwards to the pass that crosses the target. Three stars for landing within 70 km, releasing within 20 km of the planned altitude and making every burn at its marker. Could carry: W-1's long wait and Utah landing, Photon's own missions, a HASTE splash zone, a deorbiting kick stage.

### 10.11 `dual-count` (reusable, built 21 Nov 2026)
Two consoles at once (scene `DualCount`). Calls come up on each side with a timer; ← answers the left console's GO, → the right's, ↓ calls a hold on a NO-GO. A missed GO slips that side by 20 minutes; a missed or wrongly answered NO-GO counts as three.
```ts
{
  theme: "twopads" | string; length: number;                    // seconds of play
  sides: { name, label, mission, site, tz, day: [rise, set], liftoff }[];   // exactly two; site is a launch-site texture; liftoff in play seconds
  calls: [at: number, side: 0 | 1, kind: "go" | "nogo", text: string][];
  clock: [playSeconds: number, hoursUTC: number][];             // key frames for the clock the play time stands for
  dates: string[]; gap_h: number;                               // labels for each UTC day; the real gap between the two events
}
```
Three stars for no misses; fail if the slips push the gap past 24 hours. Could carry: a launch and a booster recovery running together, Electron and Neutron campaigns in the same week, mission control handing over between Auckland and Long Beach.

### 10.12 `arc-lab` (reusable, built 21 Nov 2026)
An experiment with switches (scene `ArcLab`): a breakdown curve against pressure, a voltage line, conditions to switch on and off, and ascent sweeps from sea level to vacuum. The task list is generated: make it arc, show that each condition is needed (one sweep with each switched off), then show that the fix holds.
```ts
{
  heading: string; dc: number; ripple: number; vmin: [air: number, tracerGas: number];   // game volts
  switches: [key: "ripple" | "gas" | "fault" | "fix", name: string, what: string][];
  botPlan: string[][];                    // which switches are on for each of the bot's sweeps
}
```
Three stars for doing it in at most one sweep more than the list needs. The curve has Paschen's shape (high at both ends, a minimum between); the numbers are not Rocket Lab's. Could carry other "find the combination" investigations if the plot and switch meanings are made part of the theme.

### 10.13 `edit-bay` (reusable, built 22 Nov 2026)
A recording goes out as videos on several channels, each before the moment it goes live (scene `EditBay`). Two modes, usually two acts:
- **`parts`:** the tape scrolls under a fixed cursor; ← → scrub (holding ramps from 28 to about 280 tape-seconds per second, and the view zooms out with speed and back in when you stop), Space cuts. A cut within 1.2 s of a break is exact, within 3.2 s clean, within 25 s sloppy (a miss); further away it is refused and costs five clock minutes. A part is finished when both its ends are cut and drops into the OUT tray; ↑ ↓ choose a channel, Enter sends it (Enter on a channel with a part pulls it back, on a STALLED one retries). A sticky note on the tape (`notes`) is picked up with Space and makes the next cut snap to the break. A part goes live at its channel's `due` time if it has finished uploading, otherwise as soon as it has (late, a miss); the wrong part on a channel is a miss.
- **`full`:** ← → and Space splice the parts in order onto one full cut (out of order costs four minutes), which renders for `render` minutes; then Enter starts, pauses or resumes each channel's upload of its own full cut (`len`).
Both modes: every running upload shares `bandwidth`; `hiccups` stall a channel's upload at a clock time (or as soon as it starts); the channels sit in a random order on every play. Once every channel has finished uploading the clock runs at ×8 to the release times. Stars: three for no misses, two for up to two; fail if fewer than half the channels end up with the right video. Egg (`parts`): every cut exact, no wrong send and no pull-back.
```ts
{
  theme: "q2-2024" | string;              // THEMES in EditBay.ts: room backdrop, music, name plate, result texts
  mode: "parts" | "full"; grace: number;  // minutes after the last release before the act ends anyway
  clock: { date: "YYYY-MM-DD"; start: number; rate: number; zones: [label, abbrev, hoursFromFirst][] };   // start in minutes after local midnight; rate = real seconds per clock minute; one wall clock per zone (up to 3)
  bandwidth: number;                      // tape-seconds uploaded per clock minute, shared by every running upload
  parts: { who: string; len?: number }[]; // chip prefix of whoever leads each part; len (full mode) its length in seconds
  channels: { name, handle, chip, part, due, len? }[];   // up to 4; part = which part belongs there; due = release time (minutes); len (full) = that channel's full cut, seconds
  hiccups?: [atMinute: number, channel: number][];
  // parts mode
  tape?: { from: number; to: number; marks: number[] };   // seconds; marks are the true breaks, one fewer than parts
  guests?: string[];                      // chip prefixes of the people answering (drawn on the speaker strip)
  notes?: number[];                       // tape positions of chapter-list notes
  // full mode
  render?: number;                        // clock minutes to render the spliced cut
}
```
In the Q2 2024 level the cut points are the chapter marks of Scott O's full cut (10:35 Dave, 21:16 Matt, 30:54 Scott), the release times and lengths are the ones YouTube shows for each video, and the upload speeds, stalls, render time and clock pace are game values. The speaker strip (who asks, who answers) is a picture, not a transcript. Could carry: a launch webcast clipped for several regions, mission patches sent to print before a launch date, a press release going out in several time zones.

### 10.14 `slot-finder` (reusable, built 22 Nov 2026)
One meeting, several diaries, a clock that keeps running (scene `SlotFinder`). The rows are people; only the lead's diary (`known`) and labelled entries (the results call) show at first, the rest is hatched. ← → slide the meeting block a `step` at a time, ↑ ↓ change its length through `lengths`, Space sends the invitation: every other row replies within a second or two, a decline reveals the busy blocks in the way and an acceptance marks the slot clear. Enter opens the group chat: ↑ ↓ choose a person, Enter reveals their whole diary (`chats` asks). An invitation needs `notice` hours; the past is greyed out behind the white now-line. Once every row has accepted, the slot is locked and the clock runs at ×30 to it, through the recording and through the `tail` (the work after the meeting) to the `release` time. A `clash` is a striped TENTATIVE entry, visible from the start, that becomes a busy block at its `at` time; landing on a locked or pending slot breaks it. `cues` are real moments shown as the clock passes them. Hints (`I`, three, each costs half an hour of clock): the rule, the edges (length, deadline, the clash), then the slot. Stars: start at three, minus one for more than `par` invitations, another beyond `par + 2`, one for a meeting shorter than `need`, one if the tail ends after the release; the run fails if the release time comes with nothing recorded. Egg: three stars without the group chat or a hint.
```ts
{
  theme: "q1-2026" | string;            // THEMES in SlotFinder.ts: room backdrop, music, legend, chat and clash texts, result texts
  clock: { date: "YYYY-MM-DD"; start: number; rate: number; zone: string };   // start in hours after midnight on date; rate = real seconds per clock hour
  grid: [from: number, to: number]; step: number;   // the timeline, in hours after midnight on date (may run into the next day)
  lengths: number[]; need: number; startAt?: number; notice: number; chats: number; par: number;
  tail: { hours: number; label: string; doing: string }; release: number;   // the follow-up work and the time it has to be done by
  marks: [hour: number, label: string, where?: "top"][];   // real times, as green lines
  cues?: [hour: number, text: string][];
  rows: { name: string; chip: string; busy: [from, to, label?][]; known?: boolean; lead?: boolean }[];   // a labelled busy block is public from the start
  clashes?: { row: number; from: number; to: number; at: number; label: string }[];
}
```
In the Q1 2026 level the results call (2 p.m. PT on 7 May), the release time (3 p.m. PT on 8 May, Vince's "6 pm EST") and Vince's 2:42 p.m. post are real; the diaries, the call's one-hour length, the notice, the five-hour edit, the tentative meeting, the group chat and the clock's pace are game values, and the level says so. The puzzle is built so that only a few slots work: a 45-minute gap on Thursday (two stars), a 75-minute one that the tentative entry closes, one hour early on Friday (three stars), and one late on Friday that misses the release. The bot knows every diary and sends one invitation. Could carry: a launch window agreed between a customer, a range and a recovery ship; a hot-fire slot on a shared test stand; the press call after a launch across three time zones.

### 10.15 `hat-trick` (reusable, built 23 Nov 2026)
A bet settled on camera, in two acts (scene `HatTrick`), joined by `params.then` with the same mechanic. **`act: "walk"`** is a tracking shot across one screen: the camera's frame (`frame`: left edge, width, speed, wobble) glides along the hall at its own pace and stops at the right-hand edge; the lead walks (← →) and holds Space for `hold` seconds beside each item to put it on (`blazer`, `cap`: the lead's sprite changes) or pick it up (`blender`: carried). Out of the frame for `outMax` seconds and the director calls a cut: everything goes back to its mark and the take counter goes up; more than `takes` takes fails the act. The act ends when every item is gathered and the lead stands at `end` with the camera there too. Stars: one take 3, two takes 2, else 1. **`act: "table"`** is the dish, step by step: the cap goes onto the plate and a napkin into the collar; SNIP, the scissors cross the cap at `snipSpeed` while ↑ ↓ keep them on each wavy line in `cuts` (accuracy is the share of time within 2.4 units); BLEND, Space pulses the jar, which counts only when at least 70% of the pieces are back on the blades (a pulse with them in the air is wasted and adds heat; full heat fails), `pulses` good ones needed; POUR, → tips the jar and ← stands it up, the flow follows the tilt with a lag, the glass is a cone (fill by volume) and the act wants the jar upright with the fill inside `pour.band` (over the brim fails); TASTE, Space. Faults: snip under 80% (1) or 60% (2), wasted pulses over 1 (1) or 3 (2), a fill off the middle of the band (1); 0–1 faults 3 stars, 2–3 two, else one; the level's stars are the worse of the two acts. Egg: no faults, one take.
```ts
// act one
{ theme: "neutron" | string; act: "walk"; start: number; end: number; speed: number; hold: number; takes: number; outMax: number;
  frame: [x0: number, width: number, speed: number, wobble?: number];
  items: [kind: "blazer" | "cap" | "blender", x: number, label: string][];
  then: { mechanic: "hat-trick"; intro?: string; how?: string; params: /* act two */ } }
// act two
{ theme: string; act: "table"; cuts: [amplitude: number, waves: number, phase: number, offset: number][]; snipSpeed: number; pulses: number;
  pour: { band: [lo: number, hi: number]; jar: number } }   // jar: how many glasses the jar holds
```
THEMES (in `HatTrick.ts`) hold the two rooms (`walkHall`, `setHall`, each drawn in parts for the hi-fi looks `hatwalk` and `hatset`), the music, the headings, the one sourced line the lead may say, and the result texts. In Eating the Hat the tracking shot, the takes, the order of the pickups, the cap worn on the walk (in the video it waits under the cloche), the pulses and the scoring are the game's; the blazer, the blender, the scissors, the martini glass, the napkin, the cloche and the fairing mock-up are from the video and the press. Could carry: a promise kept on camera elsewhere (a dish, a dare), or a lab bench where the steps are a procedure.

### 10.16 `fit-out` (reusable, built 23 Nov 2026)
Fitting out a vessel, in two acts (scene `FitOut`), joined by `params.then` with the same mechanic. **`act: "lift"`** is the yard from the side. A trolley runs along a gantry (← →, reaching full speed in two seconds), a cable hoists and lowers (↑ ↓), and the load hangs from it as a damped pendulum, so it swings whenever the trolley speeds up or slows down. Space hooks on when the bare hook is on a load on the quay, and sets a load down when it is within 2.6 units of its mark on the deck, touching, and moving sideways slower than 8 units a second; otherwise the call line says which of those is missing. Each item has a place along the deck (`s`, −1 stern to 1 bow) and a weight: the hull sinks with the total and trims with the moment (`trimAngle` radians per unit of moment), and an item that would take the moment past `trim` is refused until the other end is loaded. An item with `needs` goes over another and is refused until that one is fitted. A load that swings into the quay, the hull or something already fitted, or meets a surface while moving sideways faster than 16 units a second, is a knock; more than `maxKnocks` fails the act. Stars: at most one knock inside `par` seconds 3, up to four knocks 2, else 1. A deckhouse at `hull.cabin` is drawn and is in the way of a swinging load. Egg, when `hull.was` is set: lower the bare hook onto the old name on the hull's side and press Space; when the list is complete the new name is lettered on. **`act: "trial"`** is the same yard from above, the quay down the left as in act one. ← ↑ ↓ → thrust in that direction and Space and Enter twist the hull; commands reach the thrusters through a 0.6 s lag, and the hull has mass and drag, so it slides. Each of `steps` is a box (`at`, `hdg` in degrees clockwise on screen) to sit in, within `box` units and `deg` degrees, for `hold` seconds in total, against that step's `wind` (acceleration east and south in units of which full thrust is 10, a gust fraction, and a twist). Touching the quay at speed counts as a knock; the far bank and the screen's edges only stop the hull. Stars: inside `par` seconds with no knock 3, inside 1.6 × `par` 2, else 1; past `limit` seconds the act fails.
```ts
// act one
{ theme: "amelia" | string; act: "lift"; hull: { name: string; was?: string; cabin?: number /* place along the deck */ }; trim: number; trimAngle: number; par: number; maxKnocks: number;
  items: [key: string, kind: "thruster" | "power" | "shield" | "cradle", label: string, s: number, weight: number, needs?: string][];
  then: { mechanic: "fit-out"; intro?: string; how?: string; params: /* act two */ } }
// act two
{ theme: string; act: "trial"; hull: { name: string; cabin?: number }; items: /* as above: drawn on the deck */; start: [x: number, y: number]; box: number; deg: number; par: number; limit: number;
  steps: { say: string; at: [x: number, y: number]; hdg: number; hold: number; wind?: [x: number, y: number, gust?: number, twist?: number] }[] }
```
THEMES (in `FitOut.ts`) hold the two backdrops (`yard`, `basin`), the hull's colours, the music, the headings and the result texts; `KINDS` holds what can be lifted, with its size and its drawing, and `deckPlan` draws the same things from above. The bot hoists each load to the one cable length at which the pendulum's period equals the trolley's two-second run-up, so that speeding up and slowing down each leave the load hanging still. In Return On Investment the gantry crane (no source shows one over the water at Amelia), the weights, the trim limit, the order of the lifts, the power generation as one unit, the old name still on the hull and the whole trial are the game's; the thrusters, the blast shielding, the capture gear, electrical equipment on deck, the two names, the 400 ft length, the yard and its town are from Rocket Lab's two releases, and the four thrusters, the 10 MW of power generation, the main cabin and the planned sea trials from the May 2026 results call. Could carry: Neutron's second stage and thrust module being shipped from Middle River to Wallops (October 2026), a kick stage or a satellite lifted onto its adapter in a clean room, or any trial of holding position.

### 10.4 `sprint` (secret mini-game)
Side view of a night street. Hold to open the peroxide valve (about four seconds of propellant); the bike's wobble grows with speed and is corrected with left and right; cross the flag upright. A rival car accelerates alongside. Unlocked by the blueprint in The Rocket Bike.

## 11. Status: what exists

### Built so far (21 to 22 Nov 2026)
A playable vertical slice exists at the repo root: Vite + TypeScript + Phaser 3, the world map, the `platform`, `launch`, `hotfire`, `heli-catch` and `orbit-raise` mechanics, 13 map nodes (§9; 22 after the second pass described below), DOM story cards with photos and sources, `localStorage` save, stars and easter eggs, keyboard and touch pad, synthesised sound effects and music. How it differs from the original plan (§17 keeps what is still wanted): content lives in `src/content.ts` rather than YAML + zod; all art is drawn in code with the Canvas 2D API (`src/art.ts`, `src/backdrops.ts`) at 4 px per unit rather than shipped as image files; characters are drawn in code, not assembled from a paper-doll kit; there is no linting, unit-test suite, CI or deployment yet. Test hooks: `?level=<id>` jumps to a level, `?auto=1` flies it with a bot, `?dev=1` opens the whole map, `?fast=N` (with `auto`) steps the game N times per tick and keeps running in a background tab. **Developer mode** (the switch in the page footer, remembered, or `?dev=1`) also turns on skipping: `K` on the map marks the node under the marker as done, `K` inside a level ends it as a one-star pass, and intro cards get a "Skip (dev)" button. Hide the switch before a public release.

**Title screen, version, score and leaderboard (added 22 Nov 2026).** The game opens on a full-canvas title scene (`src/scenes/Title.ts`); `F` or the corner button toggles full screen. The version comes from `package.json` and is shown on the title screen; its major.minor is the **season**. A score is derived from the save (level points, which are stars × 100 scaled by game speed as in §6 G5b, plus easter eggs × 150, secrets × 250, people met × 50; rules in `leaderboard/src/rules.js`) and shown on the map; `L` opens the leaderboard card. Scores compare only within a season, so the minor version is bumped whenever levels or points change. The online board is an optional Cloudflare Worker with D1 (`leaderboard/`), configured with `VITE_LEADERBOARD_URL`; the dev server has a stand-in; without either the card shows the player's own score. Developer mode never submits. The Worker checks a score against its parts but cannot prove it: the board is friendly, not authoritative.

**For contributors and their agents (added 22 Nov 2026).** `docs/ARCHITECTURE.md` describes how the code works; `.claude/skills/add-level/` is the procedure for adding or changing a level or a mechanic, and `AGENTS.md` points any agent at both. This spec was revised on 22 Nov 2026 to describe the game as built; plans that were not followed moved to §17.

**Map navigation (revised 21 Nov 2026).** An arrow key moves to the nearest node in that direction among all nodes the player may stand on, and the marker walks there along the trails; it no longer steps along the story order, which zigzags across the map. The next unfinished level wears a bouncing NEXT tag and `N` walks to it. Pressing towards a locked node says which level opens it.

**Official Rocket Lab media (added 21 Nov 2026, revised 22 Nov 2026).** See §6 X2c. On 22 Nov 2026 the owner decided that mission patches may be used: all fifteen mission levels now ship their patch, credited and linked. Official photos still show only from a player's own git-ignored files. Rocket Lab's Flickr profile says its images may be downloaded with credit, but every photo is marked all rights reserved.

**Second pass (21 Nov 2026):** the nine planned rows of §9 that were not yet playable were built: It's Business Time, Rosie the Robot, Pics Or It Didn't Happen, Return To Sender, Virginia Is For Launch Lovers, Scout's Arrow, ESCAPADE, VICTUS HAZE and Archimedes and the tank, with four new mini-game mechanics (`fault-finder`, `splashdown`, `cruise`, `countdown-race`), two new platform themes (`factory`, `stennis`), a second launch site (Wallops), suborbital flight in the launch model, two secret cards and two more people to meet (Gabe Newell, Rob Lillis). Every playable level finishes with three stars under its bot. **Third pass (same day, at the owner's request):** five more levels (Go Find the Launch Site, Paschen's Law, Beginning Of The Swarm, Two Hemispheres, Outback Delivery) and, following the instruction to add new kinds of play where a story calls for one, four reusable mechanics documented in §10.9 to §10.12 (`ride`, `orbit-ops`, `dual-count`, `arc-lab`), a kick-stage flight plan in launch control, and levels in several acts (§5.2). No photos were added for the new levels: finding freely licensed ones (NASA's Wallops launch photos are a likely source) is still to do.

## 12. Review checklist

- [ ] I played it to the end, and its bot (`?level=<id>&auto=1`) finishes with three stars
- [ ] `npm run build` passes (and `npm run sim` if launch physics changed)
- [ ] The controls panel (`H`) lists every key the level uses
- [ ] Fan review done (§12.1) and its fact errors fixed; anything unverified is recorded there as open
- [ ] Every fact has a source link; dates say which time zone they are in where it matters
- [ ] The backdrop, enemies and power-ups belong to this chapter and repeat no other level's
- [ ] No official logos or photos are committed; each mission patch is listed in `patches.json` with its source; photos are credited in `CREDITS.md`
- [ ] Real people: public role, sourced facts, no invented speech
- [ ] The level table (§9), the README and the minor version are updated

### 12.1 Fan review

Every new level or card gets a second read by someone who knows the history well: a long-time fan, or an AI agent briefed to act as one (a Rocket Lab retail investor who watches every webcast and knows the mission names). The reviewer reads the level text, callouts, props and photo captions and reports: (1) fact errors with corrections and confidence, (2) things a fan would expect to recognise that are missing or look wrong, (3) small easter-egg ideas tied to real facts, (4) tone and respect problems. Fix every high-confidence fact error before merging; record anything unverified as an open item in the PR.

The first review of the draft (21 Nov 2026) led to these changes, kept here as examples of the standard: the kick stage on "Still Testing" circularised the Lemur-2s, not the Humanity Star; stage-2 flame is a faint orange kerosene plume, not blue; webcast callouts ("Stage 2 ignition", "Fairing separation confirmed", "Battery hot-swap", "Curie ignition"); the hat promise was about reuse; two photos dropped because the person shown was not confirmed by the source caption; "Arise, Sir Peter" renamed; Advanced Space credited on CAPSTONE.

Second review (backdrops and enemies, 21 Nov 2026) led to: no Electron on the 2016 goal pad (the first one arrived in February 2017); Māhia landmarks reordered to the real drive (Wairoa, Māhia Beach, coast road, Onenui, the range); "Space Coast" slogan removed as too early for 2016; Kaitorete described as on hold, not sunk; Tawapata South named on the Onenui gate; peroxide drums moved outside the factory door, in line with "no propellant mixing on site"; the Pointers now point at the Southern Cross. Not yet verified: whether LC-1 had lightning masts on opening day; the Mini's colour; that the bike out-ran a Dodge Viper (the game says "by some accounts").

Third review (Adam Spice's level and the rebuilt launch control, 21 Nov 2026) led to: the Nasdaq bell was rung **virtually by Peter Beck**, so the level stays in Long Beach, Times Square is a live video wall, and Peter appears on a screen at the bell (the map node moved from New York to Long Beach); "$4.1 billion" is stated as the enterprise value at announcement; collectibles reordered to the real sequence (merger agreement and PIPE together, then the S-4, the 20 August vote, the ticker); Adam Spice's MaxLinear tenure dated from 2011; "4.5 m fairing" and the Thursday-in-Auckland clock added; Long Beach shows a Rutherford line, not Electron stages (those are built in Auckland). Launch: flight 100 lifted off at 18:30 NZDT, so it is no longer a night launch, and the payload reads QPS-SAR-19; the December 2017 abort is a scrub followed by the January attempt, not a recycle; staging gaps are about three seconds each; Still Testing injects at 300 km; Ātea-1 uses the published motor figures (peak 6.9 kN, about 14.5 s, 15 cm diameter) and its card says the booster was recovered; fairing mass 44 kg; "Vehicle is supersonic" and "Kick stage separation confirmed" call-outs added.

Added after the third review, from Peter Beck's own walk-through of an Ātea-1 wind-tunnel model (Science Learning Hub video, 2011; all rights reserved, so it is **linked, never copied**): the intro card carries a labelled cutaway drawn for the game (exit cone, solid fuel grain, liquid oxidiser under pressure, separation joint, the slimmer dart with payload, flight computers and recovery, nose tip), the length is given as 6.5 m, and intro and result cards have a "Watch" link. Levels can now set `diagram: { key, caption }` (a drawing registered in `DIAGRAMS`, `src/art.ts`) and `watch: { url, label }`. Rule for video: link to the original host; embed only through the host's own player; bundle a file only under a free licence (A5).

Open from the third review: where Beck physically was for the bell (sources disagree between Long Beach and New Zealand, so the game says only "by video link"); whether Electron throttles down at Max-Q at all (the bucket and the 23.5 kPa limit are game values); whether Ātea-1 was rail-launched and unguided as modelled; "8 t to LEO" on the March 2021 whiteboard; the lift-off mass is about 16 t in the model against 13 t published (never shown on screen); the 2018 Curie was the monopropellant version.

Fourth review (It's Business Time, Rosie the Robot, Pics Or It Didn't Happen, Return To Sender, Virginia Is For Launch Lovers, Scout's Arrow, the Photon card and Gabe Newell; 21 Nov 2026) led to: the factory wall is dated 13 November 2019, so it ticks five launches and shows "Running Out Of Fingers" as next (it flew on 6 December); a crate of ten Rutherfords, not nine; an AFTS termination shuts the engines down rather than blowing the vehicle up, and the text no longer implies Wallops is the only range with one (Māhia has flown AFTS since flight 10, after four shadow flights); the scripted stand-downs read SCRUB and happen early in the count; NABEO is no longer drawn unfolding (no source confirms it deployed); the HASTE "49 days" remark is attributed to Leidos's Tom Bell via The Defense Post, not to C4ISRNET; the flight 13 screens say "accident investigation" and Peter Beck is "with the investigation board", not leading it; "the wall" is attributed to Rocket Lab; Return To Sender says "what Rocket Lab counted as thirty satellites" (itemised manifests list 29 plus the gnome); Fleet Space's two Proximas joined the manifest about a fortnight before launch; Pad 0A's water tower now dominates LC-2's masts; the pointing game in the deploy sequence, the corridor's numbers, the wall's altitudes and the test point for HASTE are labelled as game values. Confirmed by the reviewer: eleven successful missions before flight 13; IRVINE01 was built by high-school students from six Irvine schools; flight 10 was the first guided re-entry; "This One's For Pickering" flew 35 days after It's Business Time; Chompski comes from Half-Life 2: Episode Two; six HASTE flights by the end of 2025.

Open from the fourth review: the order in which It's Business Time released its payloads (not published); whether NABEO deployed; the thirtieth satellite on Return To Sender; whether the June 2018 scrub came inside the terminal count; "about an hour after lift-off" for First Light's switch to satellite mode; the Jetsons origin of Rosie's name (Wikipedia only, so the game does not say it); whether the Auckland factory in 2019 was the Mt Wellington site (the game says only "Auckland"); the volcanic cone seen through the factory door is generic Auckland, not a verified view; Wētā Workshop's exact part in making the gnome ("made with").

Fifth review (ESCAPADE, VICTUS HAZE, Archimedes and the tank, the Neutron card, the Hungry Hippo card and Rob Lillis; 21 Nov 2026) led to: the replacement forward dome is being made, not built (the 10-Q lists its "manufacture and inspection" as still to do), so the cards, the sign on the backdrop and the collectible changed; the January statement is quoted in full ("no significant damage to the test structure or facilities"); VICTUS HAZE's four hours covered trajectories, flight software and ground stations together, so the level now says all ten jobs and durations are its own; True Anomaly's Jackal is named as the other half of the exercise, Firefly and Millennium as holders of the 27-hour mark, and the account of the chase is attributed to Rocket Lab; no phone call is documented, so "the order" and "the notice" replaced it; "Gold left two days later" (Gold is due at Mars first); "Rocket Lab says the burns ran autonomously"; Berkeley is credited with leading and operating ESCAPADE and Rob Lillis has his title; the Hungry Hippo's halves "stay attached" (hinged is not confirmed) and the fairing came by barge on 23 January; the Stennis flare stack is no longer blue; "from the Gulf Coast to the Atlantic", not "the seaboard"; the bath story is about displaced water. Also found while checking by hand: ESCAPADE started so close to Earth that a player who waited two seconds fell back in, so it now starts on an escape path and the clock waits for the first key press.

Open from the fifth review (the reviewer could not open Rocket Lab's own pages; the figures come from the research pass, which read them in a browser): Archimedes' cycle, 733 kN and 102%; the A-3 stand; the Middle River machine's 90 tonnes, 12 m and 100 m a minute; Neutron's 43 m, 7 m and 13 tonnes; Return On Investment's 122 m; LC-3's opening date; where the January 2026 rupture happened (sources disagree between Middle River and Wallops, so the game does not say); who designed ESCAPADE's route (the reviewer says Advanced Space; not in the game); whether Pioneer was already encapsulated on standby; alligators at Stennis (not verified, so not in the game); any Neutron news after the 9 November 2026 filings.

Sixth review (Go Find the Launch Site and Shaun D'Mello, Inside the first hundred, Paschen's Law, Beginning Of The Swarm, Two Hemispheres, Outback Delivery; 21 Nov 2026, the reviewer opened Rocket Lab's pages in a browser but did not run the game) led to: the easter egg no longer calls the shipping container "the first mission control" (the source says only that early operations ran from containers); the intro card no longer gives D'Mello his present title on a 2015 level ("an engineer at Rocket Lab since 2014, today Vice President, Neutron"); "open ocean to the north, south and east" is now quoted as Rocket Lab's phrase, since the peninsula's only road runs north, and the first flag reads "North-east"; the team is credited alongside him, the text says the account does not say who rode the bike, and it points to the consents and launch rate of the next chapter; the portrait's skin tone is a step deeper than Peter's and Adam's, because the photo reads that way; "one mission control" for the two launches was unsourced and is gone; the calls on the two consoles no longer ask for a GO on flight events ("... confirmed"), do not announce a HASTE payload release (not public), and do not roll out a rocket the intro said was already standing; "its busiest day yet" lost its superlative and the toaster comparison is attributed to Rocket Lab (NASA compares the bus to a small microwave oven); "Curie is pointing backwards" became "the stage has turned round"; "Pioneer burned up behind it" was in no source and was cut; Outback Delivery says that the game splits Rocket Lab's third manoeuvre into a de-orbit burn and a release, and credits the Koonibba Community Aboriginal Corporation, which Southern Launch consulted before developing the range; the laboratory says its volts are a game scale and that the real arc came after staging, in near-vacuum, with trapped gas supplying the pressure; the fixed battery frame holds pressure "from launch until the kick stage separates"; the apology video went "to customers". Confirmed by the reviewer: both D'Mello quotations are verbatim; the team page says he led site selection; Māhia was first visited in April 2015 and prioritised on 23 November 2015; all the flight-41 figures and dates; four Curie ignitions; 06:00 and 03:55 UTC and 21 h 55 min; 500, 300, 900 and 470 km; Koonibba at 31.89° S, 133.45° E.

Open from the sixth review: D'Mello's portrait was drawn from a black-and-white photo, so every colour in it (skin, hair, eyes, blazer) is the game's choice and needs checking against a colour photo before release, and the reviewer did not compare the drawing on screen (§7.0 item 6); the 575 km target of "The Moon God Awakens" and the target orbit of flight 41 are not on Rocket Lab's pages (a secondary source gives 575 km); the de-orbit perigee of 500 km, the payload masses, Pioneer's 97.5° inclination and thrust, and every individual call on the two consoles are game values and are labelled so; whether Kinéis's five satellites left singly was not checked; where "B.T.S" comes from is not stated by Rocket Lab and the game does not guess. Suggested extra eggs, not used yet: Māhia's consent was approved seven days after it was submitted; the first flight's "go" came with about ten seconds to spare; Sandy Tirtey had never watched a launch in person before flight 100; TSUKUYOMI-I separated on Rocket Lab's own Motorized Lightband; the solar sail unfurled on 29 August 2024; W-2 touched down at 1:02 am local time, 40 minutes after release.

Seventh review (four story events and two people: When the Heavens Went on Sale, Markets with Madison, Wild Wild Space, Forbes counts a billionaire, Ashlee Vance as running mate in Rosie the Robot, and Madison Malone; 22 Nov 2026) found nothing WRONG and led to: Madison Malone's card is anchored in 2024 ("In 2024, a senior business journalist at the NZ Herald"), because she has since gone independent; her map node moved from near Wellington to near Auckland; Vance's drawing was redone from the likeness review (the parting had been mirrored, the hair now covers his ears and reaches his jaw, a broader face with a squinting smile and laughter lines, a green shirt checked with blue and white over a dark tee) and his likeness text changed to match; Madison's portrait has a rounder face and softer chin, hair darker at the crown with a slight wave, and a softer lip line; the Wild Wild Space card now says Vance was a guest on Markets with Madison four days after the film reached HBO. Confirmed by the reviewer: the November 2018 factory day (Bloomberg excerpt, headline "How a Dishwasher Engineer…"); the 2015 first visit, "three rocket bodies" and about seven trips (Markets with Madison, 21 July 2024); the 18 May 2023 interview's topics and quotations and that Beck spoke from California; NZME's figures and "sole New Zealander"; the 50th launch at 06:13 NZST on Friday 21 June 2024 (18:13 UTC on 20 June), the Herald report dated 23 June with exclusive access to mission control in Auckland; DC/DOX on 14 June 2024 and HBO on 17 July 2024, with Vance as a producer; Forbes's roughly 10% stake and earlier share sales; Rosie's figures. Also found during research: the brief for this pass said Madison Malone was in mission control "on 23 June"; that is the date of her report, and the launch was on the 21st (NZ time), which is what the game says.

Open from the seventh review: (1) Forbes dates its first US$1 billion estimate to the close of 15 November 2024, but the SEC record suggests his holding was worth more than that earlier: the Schedule 13D filed in 2021 (https://www.sec.gov/Archives/edgar/data/1819994/000119312521266747/d220722dsc13d.htm) gives 54,551,250 shares, which at the 9 September 2021 close of $20.72 is about $1.13 billion, and Forbes's "all-time high" at about $19.00 conflicts with the 2021 record close. The card therefore says only that Forbes estimated US$1 billion "for the first time" and gives no other price or value (from the research pass; not re-checked here). (2) Beck's early career: Forbes says he joined Fisher & Paykel in 1993 and moved to the government research institute in 2003; Wikipedia, which the first level follows, says 1995 and Industrial Research Ltd 2001–2006. The new card gives no years; the first level's dates are unchanged and should say less ("the 1990s", "the early 2000s") once someone settles it. (3) Whether 18 May 2023 was Beck's first appearance on Markets with Madison: neither source says so, so the card does not. (4) Madison Malone's independent show, Business with Madison, and when she left the Herald: found in podcast directories only, so it is not in the game. (5) The 9 May 2023 US hardcover date comes from booksellers; Publishers Weekly says only "May". (6) No freely licensed photo of Madison Malone was found; one of Ashlee Vance is on Commons (File:Ashlee_Vance.gk.jpg), but its licence was not checked and it is not in the repository, so neither card shows a "cartoon beside photo" yet (§7.0 item 4). (7) The factory level's "more than 400 hours by hand" is older text: Satnews words it as Rosie speeding production "by more than 400 hours"; not changed in this pass. Ideas not used yet: three rocket bodies on a rack with a "2015" note; Musk's phone call on the evening of Vance's factory day (from his excerpt; no words for anyone); an "It's Business Time" (November 2018) poster on the factory wall, without implying Vance was at that launch.

Eighth review (Four channels, one call, and the four creators to meet: Vince is Bullish, Dave G, Matt Farley, Scott O; 22 Nov 2026; the reviewer read YouTube's watch pages, oEmbed and the SEC copy of the Q2 release, and compared the portraits with the reference stills linked from issue #4) led to: Vince's earlier interview with Beck (8 May 2024) is "two days after the Q1 2024 results", which Rocket Lab reported on 6 May; the chapter-list power-up now credits the chapter marks of Scott O's full cut (posted 13 August) and says the game borrows them two days early, since part 4's own chapters are topics inside part 4; "12 August in continental Europe" (it was still 11 August in London); the room's comment no longer calls Amsterdam a place in the story (it is the time zone the level was proposed in; the release gives Pacific and Eastern times); Dave G's hair is short at the sides with a brushed-up quiff, and Matt's is swept to one side from a parting, so the two ginger beards (Vince and Matt) also differ by hair at chip size. Confirmed by the reviewer: all eight upload times and channels (parts 1 to 3 at 15:00 PDT on 11 August and part 4 at 15:20; full cuts by Dave G and MattMoney at 15:00, Vince at 16:00 and Scott O at 16:02 on 13 August), every quoted title, the part lengths as YouTube displays them, the full cut's chapters (0:54, 10:35, 21:16, 30:54, 45:21), that every part's description points on to the others in order, Dave's "previously posted" note, Matt's "I am an engineer", the clock offsets, and the release's 2 p.m. PT call, first Archimedes hot fire and the two ESCAPADE spacecraft. Likeness: Scott O reads as him (blond fade, top-heavy glasses, earphone wire); Vince and Matt read through their cues (receding crop, beard, grin, V-neck; tux and bow tie); Dave was weak and was redrawn. Also found during research, before the review: Dave G and MattMoney posted their full cuts at the same second, so neither is called the first.

Open from the eighth review: (1) **CH4, resolved 22 Nov 2026:** the owner confirmed that the four creators gave permission to appear; they are shown in their public role as YouTube creators, from their own channels. (2) "The first time" the four interviewed Beck and Spice together, as issue #4 puts it, is not supported: Dave G (8 May 2024, Beck and Spice) and Vince (8 May 2024, Beck) had interviewed them after the Q1 2024 results, and Matt's 22 May 2024 video is titled "The Peter Beck Interview" "w/ @vinceisbullish", which may mean he took part in Vince's; the game says only what the Q2 videos show. (3) Matt Farley's surname is not on his YouTube channel ("MattMoney"); it comes from the Seeking Alpha byline that his own video description links to as "my latest Rocket Lab Seeking Alpha article". The game uses it because his public writing carries it; drop it to "Matt (MattMoney)" if he prefers. (4) X2b, resolved 22 Nov 2026: the game's own text has no prices; the Watch link was Scott O's full cut, whose description advertises a valuation model with price targets, so at the owner's choice it now points to Dave G's full cut. Scott O's stays in the sources, because its chapters give the cut points; the Seeking Alpha source is an investment article. (5) The speaker strip (who asks and who answers, in what order) is a picture, not a transcript, and the upload speeds, stalls, render time and clock pace are game values; all are labelled so. Ideas not used yet: the same group's later joint interviews (Q3 2024 and Q1 2025 full cuts of matching length on Scott O's and Vince's channels) as a "same time next quarter" note; the release's "50th Electron launch faster than any commercially developed rocket" and "within eight meters of target orbit".

Ninth review (Seven diaries, one slot; Five channels, one Q&A; Mrs. Iglesias; the four creators' new lines; 22 Nov 2026; the reviewer read the five watch pages, Vince's X post through the public embed API and the SEC copy of the Q1 2026 release, and judged the likeness from the code against her X profile picture) found one small WRONG and led to: "Saturday 9 May in continental Europe" was true only of Space Lab's cut (Vince's went up at 23:59 CEST on the 8th), so the texts now say "around midnight in central Europe, Saturday morning in New Zealand" and give her cut as 1:19 a.m. CEST; "she has posted the next two" became "her channel also has the group's interviews after the Q2 and Q3 2026 results", because a Beck and Spice interview on the Iridium acquisition (30 June to 1 July 2026, on Vince's, Dave G's and MattMoney's channels) came between and is not on hers; "the first to include her" became "the earliest of the group's joint interviews that includes her, as far as their own videos show"; the level's how-to and the in-game legend now say that she sends the invitations only in the game and that when the interview was recorded is not known; "name the other four channels" became "link"; the cast drawing no longer says the creators "ask" (whether each asked on camera was not checked), tags Vince "announced it" from his post, and the caption says "the five creators who posted the interview"; the Vince card says "the group's joint interview"; the portrait's hair is fuller on the viewer's right as in her picture, her lips are red, and the bright green lanyard from her picture is drawn (no badge text); the city through the window is no particular city (the Los Angeles skyline had come from her X profile's location, which is beyond her public role). Added from the reviewer's ideas: Vince's 2:42 p.m. post appears as a message when the clock passes it. Confirmed by the reviewer: the 2 p.m. PT call and the release's Motiv and Gauss wording; Vince's post (21:42:48 UTC: all five channels "at 6 pm EST", "in 20 min", thanks to her "for arranging the interview" and to Scott O "for recording it and editing it"); the five upload times (Vince 14:59:06, Scott O 15:00:33, Dave G 15:00:50, MattMoney 15:48:00, Space Lab 16:19:32 PDT) and lengths of about 58 to 59 minutes; Scott O's descriptions (Q3 2024 and Q1 2025 link the original four, Q1 2026 adds her); Dave G's list of participants; her video's description and chapter list; the Electron model unboxing (4 Nov 2025); her channel's About text; her later Q2 and Q3 2026 interviews.

Open from the ninth review: (1) **CH4, resolved 22 Nov 2026:** the owner confirmed that Mrs. Iglesias gave permission to appear; she is shown in her public role as the creator of Space Lab. (2) Issue #12 calls this her first joint post-earnings interview: no source says so; the game says only what the videos show, and nobody checked for joint interviews between Q2 and Q4 2025 exhaustively. (3) When and how the interview was recorded is not published (her Q2 2026 description calls that one "a live Q&A"); every channel's cut being Scott O's edit is likely from their near-identical lengths but not stated. (4) Whether she was part of the June 2026 Iridium interview. (5) Whether the chapters on her video are YouTube's automatic ones (one reads "Propulsion and Gaus"); the card says "the chapter list YouTube shows". (6) In the game Beck and Spice decline invitations and share diaries in a chat; both are labelled game elements, but the reviewer called it borderline under X2a. (7) The issue gave her upload as 9 May 01:19 CEST, which matches YouTube's 16:19:32 PDT on 8 May. Ideas not used yet: she was at Māhia for the 100th Electron in November 2026 (her channel has "The Road to Launch Complex 1" and "My First Rocket: The Electron 100th"; not verified, and her profile picture's setting was not checked); a "Rocket Lab Weekly" nod (hosts not verified); Dave G's cut runs about a minute longer than the others.

Tenth review (No Time Toulouse, Kinéis: five for five, Madison Malone as running mate, the Sir Peter card's new fact; 23 Nov 2026; the reviewer read the Herald report, Spaceflight Now, Space.com, Wikipedia's launch list, ArchitectureNow, timeanddate.com, DOC and a reprint of Rocket Lab's release, and compared the drawing with her NZ Herald byline photo) found nothing WRONG and led to: the player is no longer sent to "your console" (no source says where Beck watched from; the level now says "be in the room", and the result card says the console he stops at is the game's, like walking him in, the doors, the clock and the camera); the big screen no longer shows the five satellites out seconds after lift-off with a cutoff sound: it says "about an hour later" (Space.com), and the result card says the screen runs that hour together; the Oculus holds "a rocket nozzle" (ArchitectureNow does not say Rutherford); the motto glows "in the dark of the entry portal", and which surface it is on is the game's choice; the gate sign reading MISSION CONTROL is gone (invented, and the building's entry has no windows); the red strip below the floor line runs only under the gallery; a ruru "startles" rather than swoops (DOC does not say they swoop at people; it says they are sensitive to light, which is why the camera light sees one off); "Kinéis Killed the RadIOT Star" with Rocket Lab's lower-case "the"; "faster than any commercially developed rocket in history" without "other"; Pearson "at mission control since 9 p.m.", in the Herald's words; the message when her camera rolls reads "Camera rolling", so it cannot be taken for her voice; Madison's walking figure wears a black jacket over the black tee, as in her byline photo. Added from the reviewer's ideas: the pun on "no time to lose" and Toulouse in the intro. Confirmed by the reviewer: 06:13 NZST on 21 June (18:13 UTC on the 20th), LC-1 Pad B, five satellites to 635 km at 98°, "in singles and as pairs", 190 satellites in 50 launches, the five Kinéis launches and their dates (the last, High Five, at 01:31 UTC on 18 March 2025), commercial service from 1 June 2025, the Mount Wellington facility opened on 12 October 2018 with the mission control that commands Electron launches, the portal, the model Electron through the ceiling, the red strips on the gallery's risers, the Moon (99.5%, set 06:40 at 236°, full on 22 June at 13:07), the twilights, sunrise at 07:33 and the solstice at 08:50, the Herald's account of the room, "eighteen days" after the honours list, and Madison Malone's Forbes listing and the show's start.

Open from the tenth review: (1) where Peter Beck watched the 50th launch: not in the Herald report, the release or Spaceflight Now (the Herald's photos of the room and of Beck are by different photographers), so the game says it does not know. (2) Madison Malone's portrait and walking figure: her byline photo shows a black jacket with an open neckline and an oval face with full cheeks; the black crew-neck tee, the round face and the hazel eyes follow the owner-supplied video still, and the portrait was checked against that still on 23 Nov 2026 (§7.0 item 6); the walking figure adds a black jacket for the winter morning, as in the byline photo. Resolved. (3) The glass between the gallery and the control room, the cars and the gate are the game's; ArchitectureNow says only that the sunken gallery looks into mission control. (4) Whether ruru live in urban Mount Wellington, and whether Maungarei can be seen from the building, were not checked. (5) Pad B comes from Wikipedia's launch list; Rocket Lab's own pages answered the reviewer with 403. (6) The second Herald link (the Markets with Madison video page) did not load for the reviewer or the research pass, so nothing on screen depends on it. (7) The T− clock and its 75 s, the doors' cycle, the deployment shown on the big screen and Madison's camera are game elements, labelled as such. Ideas not used yet: "MISSION TEAM" on the backs of the black tops at the consoles (seen in the Herald's photo of the room) and more monitors per console; a 50 or 190 counter on the gallery screens; a note that the 50 include "It's a Test" (May 2017), which did not reach orbit; an unnamed "Future Mission Team" onesie on a hook in reception (the baby in the report is a private person, so never drawn).

Eleventh review (Eating the Hat, the new `hat-trick` mechanic, and the Neutron-announcement outfits on Peter Beck; 23 Nov 2026; the reviewer read Space.com, ClickOrlando, GeekWire, TechCrunch, Universe Today, Digital Trends, the release as reprinted on space-travel.com and YouTube's stills of the video, but could not get its captions) found nothing WRONG and led to: (1) MISLEADING, the cap worn on the walk: in the video it is served under the cloche and he never wears it. Wearing it is the owner's requirement for the level, so it stays, and the result card now says it is the game's; (2) MISLEADING, Return To Sender's hat line was sourced only to Wikipedia's Peter Beck article, which does not mention the hat: GeekWire's SmallSat 2019 report added; (3) the $4.1 billion is now "a pro forma enterprise value", as in the release; (4) the blazer drawn a shade darker (the reviewer read it as a muted navy in YouTube's stills; the storyboard frames read brighter, so it sits between); (5) Beck's next-day line to Space.com, "I have learned my lesson, and it tasted terrible", added to the result card. Kept: "a ribbed mock-up of a fairing", which Universe Today describes ("seated inside a large mock-up of the Neutron rocket payload faring") and the video's wide shots show; the blender, not a food processor (Space.com; ClickOrlando: "a blending machine"; no source says food processor, though the owner's brief did); the vow tied to reusability (GeekWire, Space.com), not to building a big rocket (only an unsourced Nasdaq piece says so); the bubble's "It's about time I finally ate the hat." (ClickOrlando; Universe Today has the longer "I really think with this project, that it's about time I finally 'ate the hat'"). Going Public's "the bigger reusable rocket Beck had said he would never build" stays: Space.com quotes him on 1 March 2021, "There are some things we said we would never do, but we're going to build a big rocket."

Open from the eleventh review: (1) **The jacket and Iridium.** The owner says Beck wore the same blue jacket again when announcing Rocket Lab's acquisition of Iridium. The acquisition announcement is real (29 June 2026: https://www.globenewswire.com/news-release/2026/06/29/3318842/0/en/rocket-lab-to-acquire-iridium-in-historic-deal-creating-a-fully-vertically-integrated-space-powerhouse-primed-for-growth.html, https://www.space.com/space-exploration/launches-spacecraft/the-start-of-a-new-era-rocket-lab-buying-satellite-communications-company-iridium-for-usd8-billion), and in Rocket Lab's video "UPDATE | Rocket Lab's Latest Acquisition" (https://www.youtube.com/watch?v=K3KtOZeORW8) he puts on and wears a blue blazer over a white open-collar shirt, much like March 2021; in the longer investor video (https://www.youtube.com/watch?v=63w39z-Emj8) he does not. No source says it is the same jacket, so nothing about Iridium is on screen. (2) Where the video was filmed: the release is datelined Long Beach and the factory has a US flag, but no source names the place; the node sits off Long Beach. (3) When and where the original vow was made: sources say only that it came before August 2019. (4) From the video's frames only, unconfirmed in print: the opening montage of promises, the scissors, the blue floor lights, the closing cards "We're building a bigger rocket" and "Coming 2024". (5) Digital Trends attributes "This hat is not tasty" to Beck; not checked against the video, so not used.

Twelfth review (Return On Investment and the new `fit-out` mechanic; 23 Nov 2026; the reviewer could not open Rocket Lab's or NASASpaceFlight's pages and read reprints of both releases, the Q1 to Q3 2026 call transcripts, Aerospace America, WorkBoat, Bollinger's site and the coastwise statute; its claims from the Q1 2026 transcript and Aerospace America were then checked in a browser) found one WRONG and led to: (1) WRONG, the power module called the game's invention: Peter Beck gave "10 megawatts across four station-keeping thrusters" on the May 2026 call and said the power generation systems and thrusters had reached the yard, so the item is now "Power generation", weighs as much as a thruster, and only its form as one unit is labelled the game's; (2) MISLEADING, "ready for Neutron's second launch rather than its first" read as the barge running late: the result card now says flight one is an intentional soft splashdown and the barge goes under the stage on flight two if the re-entry goes well, with Beck's own line from the call; (3) the call's facts added (thruster housings and main cabin installed, more than 11 million pounds or 5,000 tonnes, sea trials on track for later in 2026), a cabin drawn on the hull, and the act-two card no longer says nothing has been published about testing; (4) the level is dated 2025–2026, not 10 July 2025, since the thrusters only reached the yard in 2026, and 10 July is given as the announcement of a contract under which work had begun; (5) the two ways home are what Rocket Lab "describes", barge first (Aerospace America has ground landings as a hope for later); (6) Shaun D'Mello: the name plate gives his title without a year, and both the opening and the result card say that no account places him at the yard and that the work is Bollinger's; (7) "ship" is now "barge", "holds her ground" is "holds station", a breeze "pushes" where it "set", the Jones Act line no longer glosses the law, and the Neutron card's "It has not flown yet" names Neutron; (8) act two was redrawn with the quay down the left and the gantry overhead, as in act one (it had the barge alongside a quay across the top), and the thrusters sit on the four corners; (9) the old name on the hull and its repainting at the yard are listed as the game's (the renaming was announced in February 2025); the call transcript replaces a newsletter as the source for the four thrusters.

Open from the twelfth review: (1) whether sea trials have begun, and whether the barge has been delivered or has left Louisiana: nothing announced as of 23 Nov 2026 (the Q2 and Q3 calls mention it only as capital expenditure), so the level's ending must be revisited when Rocket Lab says more. (2) The yard's real equipment and waterway: the gantry over the water is the game's; that the yard is on the Intracoastal Waterway at Bayou Boeuf comes from a search summary only, so no waterway is named. (3) The hull's colours, where its name is painted, the real layout of the thrusters, cabin and deck equipment: drawn from none of Rocket Lab's renders, which are all rights reserved. (4) Oceanus as built in 2010 and 400 × 105 × 25 ft (WorkBoat, Marine Log): trade press only, not on screen; the top view uses the proportion. (5) Shaun D'Mello as the lead: sourced as the Rocket Lab voice of the announcement, not as someone at the yard; the owner may prefer Peter Beck or no named lead. His portrait's colours are still open from the sixth review. (6) Ideas not taken: Bollinger's 12,500-ton dry dock at Amelia, 400 ft long like the barge (no source says the barge used it); the payload figures for barge landing against return to launch site on the Neutron card.

Still open from the second review: name of the recovery ship on "There And Back Again"; whether the founding trip was 2006 or 2007; the Fisher & Paykel plant's product line (props currently say DishDrawer); a cliff-top backdrop for LC-1.

## 13. Keeping up with the news (retired)

The plan for a weekly digest that turns Rocket Lab announcements into issues is in §17. Until it exists, a new announcement is handled by hand with the add-level skill: a story card first, a level when someone builds it, and a status change (for example Neutron `announced → flown`) when the event happens.

## 14. Guidance for agents

`AGENTS.md` at the repository root is the entry point (`CLAUDE.md` imports it). It points to the add-level skill and the architecture doc. Keep it short.

## 15. Out of scope

Accounts; multiplayer; 3D; a tycoon or economy layer; in-game purchases; committing official Rocket Lab media other than mission patches; any leaderboard that claims to be authoritative (the game runs in the browser, so scores cannot be proven).

## 16. Open questions (for the maintainer; don't block on these)

- Final title. Whether to ask Rocket Lab for a blessing before announcing.
- Where to host: a free static host is enough; whether a custom domain is worth it.
- Whether to accept donations at all. Hosting is free, and collecting money around another company's name changes the footing of a fan project.
- Should business events (acquisitions, earnings) stay cards only, or get gameplay? The Nasdaq listing became a level.
- Photos of people other than Peter Beck: Commons has almost none for other Rocket Lab staff. Ask for opt-in photos, or keep everyone else as drawn characters?
- Open factual questions are listed with each fan review in §12.1.

## 17. Roadmap: wanted, not built

Kept from the original brief. Each is independent; none is needed to add levels today.

- **Continuous integration.** Run the build, the launch sim and every level's bot on each PR; give each PR a preview URL; deploy on merge to `main`. The original plan also had ESLint, unit tests and a Playwright smoke test that boots every level without console errors.
- **Hosting and deploy.** Originally a Docker image with Caddy on a VPS, deployed over SSH with a rollback script. A static host does the same job with less to run.
- **Contributor paperwork.** A contributing guide, a code of conduct, issue forms for "level idea" and "story card", and a PR template carrying the §12 checklist.
- **Content as data files.** Levels as YAML validated by zod schemas, with readable errors and scaffolding commands, so a story card needs no TypeScript. Worth doing if people without agents start contributing.
- **Characters from a photo.** A shared paper-doll art kit (heads, hair, outfits, accessories on one frame grid, tinted at runtime), a small character file choosing parts, a compositor that builds the sprite set, a `/builder` scene with live preview and import/export, and a prompt that lets any AI assistant turn a photo into that file. Source photos never leave the contributor's machine. Later, players could build their own avatar the same way.
- **A weekly news digest.** A scheduled job that reads Rocket Lab's press releases and filings, and opens one issue listing what is new, to be triaged into story cards, status changes and level ideas.
- **Translation.** UI and story strings moved out of the code so the game can be translated.
- **A phone pass.** Check that every level can be finished on a touch screen.
- **Analytics.** Cookie-free and anonymous (§H4): Cloudflare Web Analytics for visits, and daily per-level counts in the leaderboard database.
