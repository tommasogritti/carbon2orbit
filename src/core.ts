import Phaser from 'phaser';
import { byId, CHARACTERS } from './content';
import { speedFactor, levelPoints } from '../leaderboard/src/rules.js';
import type { LevelDef } from './content';
import { D, S, UI, BUSTS } from './art';
import { beep, snd, music, stopLoops, unlock, muted, setMuted, nextSoundtrack } from './audio';
import { count } from './stats';

/** `?clean=1` leaves Rocket Lab's mission patches and the optional local photos out, for footage without their artwork. */
const CLEAN = new URLSearchParams(location.search).has('clean');
/**
 * Official Rocket Lab mission patches, by file name (normally the level id), from src/assets/patches/.
 * patches.json lists, for each level, which patches it shows, the mission each belongs to and the page it came from;
 * the cards credit Rocket Lab and link that page. How to add one: .claude/skills/add-level/SKILL.md.
 */
export const PATCHES: Record<string, string> = CLEAN ? {} : Object.fromEntries(
  Object.entries(import.meta.glob('./assets/patches/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>).map(([p, url]) => [p.split('/').pop()!.replace('.png', ''), url]),
);
/**
 * Official Rocket Lab photos, by level id, when they have been saved into src/assets/official/ as <level id>.jpg
 * (optionally with a manifest.json giving each one's title and Flickr page). Rocket Lab's Flickr says its images may be
 * downloaded with credit, but they are all rights reserved, so this folder is git-ignored too: local play only.
 */
const officialMeta = (Object.values(import.meta.glob('./assets/official/manifest.json', { eager: true, import: 'default' }))[0] || {}) as Record<string, { title: string; page: string }>;
export const OFFICIAL: Record<string, NonNullable<LevelDef['photo']>> = CLEAN ? {} : Object.fromEntries(
  Object.entries(import.meta.glob('./assets/official/*.jpg', { eager: true, import: 'default', query: '?url' }) as Record<string, string>).map(([p, src]) => {
    const id = p.split('/').pop()!.replace('.jpg', '');
    return [id, { file: '', src, official: true, caption: officialMeta[id]?.title || 'Official Rocket Lab photo', credit: 'Rocket Lab', page: officialMeta[id]?.page || 'https://www.flickr.com/photos/rocketlab/' }];
  }),
);
/** The picture for a level's cards: its freely licensed photo if it has one, else a local official photo if present. */
export const cardPhoto = (def: LevelDef) => def.photo || OFFICIAL[def.id];
export interface PatchSource { file: string; mission: string; page: string }
export const PATCH_SOURCES: Record<string, PatchSource[]> = CLEAN ? {} : (Object.values(import.meta.glob('./assets/patches/patches.json', { eager: true, import: 'default' }))[0] || {}) as Record<string, PatchSource[]>;
/** A level's mission patch (or patches), credited to Rocket Lab with a link to the mission page it came from. */
export function patchImg(id: string) {
  const list = (PATCH_SOURCES[id] || []).filter((p) => PATCHES[p.file.replace('.png', '')]);
  if (!list.length) return '';
  const imgs = list.map((p) => `<img src="${PATCHES[p.file.replace('.png', '')]}" alt="${p.mission} mission patch">`).join('');
  const credit = list.map((p) => `${p.mission} · <a href="${p.page}" target="_blank" rel="noopener">source</a>`).join('<br>');
  return `<figure class="patches${list.length > 1 ? ' two' : ''}"><div>${imgs}</div><figcaption>Mission patch${list.length > 1 ? 'es' : ''} © Rocket Lab<br>${credit}</figcaption></figure>`;
}
export const W = 320;
export const H = 180;
export const SCENE_FOR: Record<string, string> = { platform: 'Platform', launch: 'Launch', hotfire: 'Hotfire', 'heli-catch': 'Heli', 'orbit-raise': 'OrbitRaise', sprint: 'Sprint', 'fault-finder': 'FaultFinder', splashdown: 'Splashdown', cruise: 'Cruise', 'countdown-race': 'CountdownRace', ride: 'Ride', 'orbit-ops': 'OrbitOps', 'dual-count': 'DualCount', 'arc-lab': 'ArcLab', 'edit-bay': 'EditBay', 'slot-finder': 'SlotFinder', 'hat-trick': 'HatTrick', 'fit-out': 'FitOut', sandbar: 'Sandbar', 'chill-down': 'ChillDown' };
export const FONT = UI;

export const plain = (s: string) => s;
/** World is 320x180 units; the canvas is D times that. A scrollFactor-0 object must be offset by HX/HY because the zoomed camera is centred. */
export const HX = (W * D - W) / 2, HY = (H * D - H) / 2;
/** Static camera for single-screen scenes. */
export function cam(s: Phaser.Scene) { s.cameras.main.setZoom(D).centerOn(W / 2, H / 2); return s.cameras.main; }
/** Image from a generated texture, at world-unit size. */
export const img = (s: Phaser.Scene, x: number, y: number, key: string) => s.add.image(x, y, key).setScale(S);
/** Pin an object to the screen in a scrolling scene (HUD). */
export function fix<G extends Phaser.GameObjects.GameObject & { x: number; y: number; setScrollFactor(a: number, b?: number): G }>(o: G) { o.x += HX; o.y += HY; return o.setScrollFactor(0); }
/** Rounded translucent HUD panel. */
export function panel(s: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.72) { const g = s.add.graphics(); g.fillStyle(0x0b0e18, alpha).fillRoundedRect(x, y, w, h, 3); g.lineStyle(0.5, 0xffffff, 0.18).strokeRoundedRect(x, y, w, h, 3); return g; }
export function T(s: Phaser.Scene, x: number, y: number, str: string, color = '#ffffff', size = 7, weight = '600') {
  return s.add.text(x, y, str, { fontFamily: FONT, fontSize: size + 'px', fontStyle: weight, color, lineSpacing: 1 }).setResolution(s.game.renderer.type === Phaser.WEBGL ? D : 1); // the Canvas renderer draws a high-resolution text at its full pixel size, so without WebGL text stays at 1
}

// ---------- input: keyboard + on-screen pad, with edge detection ----------
type Key = 'left' | 'right' | 'up' | 'down' | 'a' | 'b';
export const pad: Record<Key, boolean> = { left: false, right: false, up: false, down: false, a: false, b: false };
const latch: Record<Key, boolean> = { ...pad }; // set on keydown, cleared after each game step, so very short taps still register
let lockUntil = 0;
const MAP: Record<string, Key> = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down', Space: 'a', KeyZ: 'a', Enter: 'b', KeyX: 'b',
};
export function initInput(game: Phaser.Game) {
  const mute = document.getElementById('mute')!;
  mute.textContent = muted() ? '🔇' : '🔊';
  mute.addEventListener('click', () => { unlock(); setMuted(!muted()); mute.blur(); });
  // Developer mode (?dev=1): K skips. On the map it marks the level under the marker as done; inside a level it ends it at once as a one-star pass.
  if (DEV) hotkeys.KeyK = () => {
    const sc = game.scene.getScenes(true)[0] as any;
    if (!sc) return;
    if (sc.scene.key === 'Map') sc.devSkip?.();
    else if (sc.def) { sc.scene.pause(); finish(sc, sc.def, { success: true, stars: 1, title: 'Skipped', text: 'Developer mode: level skipped and marked as done.' }); }
  };
  hotkeys.KeyH = () => showHelp(game);
  document.querySelectorAll<HTMLElement>('#speed button').forEach((b) => b.addEventListener('click', () => { b.blur(); setSpeed(Number(b.dataset.d)); }));
  showSpeed();
  // F, or the corner button, fills the screen. The whole stage goes full screen, so cards still show on top of the game.
  const full = () => { if (game.scale.fullscreen.available) game.scale.toggleFullscreen(); };
  hotkeys.KeyF = full;
  document.getElementById('full')?.addEventListener('click', (e) => { (e.currentTarget as HTMLElement).blur(); full(); });
  // T, or the note button, steps through the soundtracks; the new one's name shows for a moment.
  const track = () => { unlock(); const s = nextSoundtrack(); toast(`♪ Soundtrack: ${s.name} · ${s.style}`); };
  document.getElementById('track')?.addEventListener('click', (e) => { (e.currentTarget as HTMLElement).blur(); track(); });
  document.getElementById('gfx')?.addEventListener('click', (e) => { (e.currentTarget as HTMLElement).blur(); toggleGfx(game); });
  showGfx();
  // The map button (or Esc) leaves a level for the map, after asking; the hint button (or I) shows when the scene offers hints.
  document.getElementById('home')?.addEventListener('click', (e) => { (e.currentTarget as HTMLElement).blur(); leaveLevel(game); });
  document.getElementById('hint')?.addEventListener('click', (e) => { (e.currentTarget as HTMLElement).blur(); showHint(game); });
  hotkeys.Escape = () => leaveLevel(game);
  hotkeys.KeyI = () => showHint(game);
  const sync = () => { const sc = game.scene.getScenes(true)[0] as any, inLevel = !!(sc && sc.def); document.getElementById('home')!.hidden = !inLevel; document.getElementById('hint')!.hidden = !(inLevel && typeof sc.hint === 'function'); document.getElementById('pick')!.hidden = !(sc && (sc.scene.key === 'Map' || sc.scene.key === 'Title')); };
  game.events.on('poststep', () => { if ((game.loop.frame & 15) === 0) sync(); });
  const help = document.getElementById('help');
  help?.addEventListener('click', () => { help.blur(); if (helpOpen) overlayConfirm(); else showHelp(game); });
  setFree(free.on); // label the footer button
  const dev = document.getElementById('dev');
  if (dev && !import.meta.env.DEV) dev.remove(); // the deployed game has no developer mode
  else if (dev) {
    dev.textContent = DEV ? 'Developer mode: ON · K skips a level · click to turn off' : 'Developer mode: off';
    dev.classList.toggle('on', DEV);
    dev.addEventListener('click', () => {
      try { if (DEV) localStorage.removeItem('carbon-to-orbit-dev'); else localStorage.setItem('carbon-to-orbit-dev', '1'); } catch { /* private mode */ }
      const u = new URL(location.href); u.searchParams.delete('dev'); location.href = u.toString(); // reload with the new setting
    });
  }
  // A mouse press lets audio start at once; a finger only when it lifts (pointerup, touchend, click), so a phone that
  // heard nothing but "pointerdown" stayed silent. Capture phase: a control that stops the event must not stop the sound.
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click'] as const) window.addEventListener(ev, () => unlock(), { capture: true, passive: true });
  window.addEventListener('keydown', (e) => {
    unlock(); // browsers only allow sound after a key press or tap
    if ((e.target as HTMLElement | null)?.tagName === 'INPUT') { if (e.code === 'Enter') { overlayConfirm(); e.preventDefault(); } return; } // typing a name: keys are text, not controls
    if (e.code === 'KeyM' && !e.repeat) setMuted(!muted());
    if (!overlayOpen() && (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd')) { setSpeed(1); e.preventDefault(); return; }
    if (!overlayOpen() && (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract')) { setSpeed(-1); e.preventDefault(); return; }
    if (e.code === 'KeyT' && !e.repeat) track();
    if (e.code === 'KeyG' && !e.repeat && !overlayOpen()) { toggleGfx(game); e.preventDefault(); return; }
    if (e.code === 'KeyH' && !e.repeat && helpOpen) { overlayConfirm(); e.preventDefault(); return; } // H closes the panel it opened
    if (!e.repeat && !overlayOpen() && hotkeys[e.code]) { hotkeys[e.code]!(); e.preventDefault(); return; }
    const k = MAP[e.code];
    if (!k) return;
    if (overlayOpen()) {
      if (k === 'b' || k === 'a') {
        const f = document.activeElement; // a level picked in the free-play list with Tab, then Enter or Space
        if (!e.repeat) { if (f instanceof HTMLButtonElement && f.matches('#overlay button.pick')) f.click(); else overlayConfirm(); }
        e.preventDefault();
      }
      return;
    }
    if (!e.repeat) latch[k] = true;
    pad[k] = true; e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { const k = MAP[e.code]; if (k) pad[k] = false; });
  window.addEventListener('blur', () => { for (const k in pad) pad[k as Key] = false; });
  game.events.on('poststep', () => { for (const k in latch) latch[k as Key] = false; });
  const touch = document.getElementById('touch')!;
  if (matchMedia('(pointer: coarse)').matches) touch.hidden = false;
  touch.querySelectorAll('button').forEach((b) => {
    const k = b.dataset.k as Key;
    b.addEventListener('pointerdown', (e) => { pad[k] = true; latch[k] = true; e.preventDefault(); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => (pad[k] = false));
  });
}
const live = () => performance.now() > lockUntil && !overlayOpen();
export const held = (k: Key) => live() && pad[k];
export const just = (k: Key) => live() && latch[k];

// ---------- sound: see audio.ts. `sfx` is the old plain-beep helper, kept for a few call sites.
export const sfx = beep;

// ---------- save ----------
export interface Save { v: 1; done: Record<string, number>; pts: Record<string, number>; eggs: Record<string, true>; unlocks: Record<string, true>; met: Record<string, true>; at?: string }
const KEY = 'carbon-to-orbit-save';
export function loadSave(): Save {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 1) return { unlocks: {}, met: {}, pts: {}, ...s }; } catch { /* fresh save */ }
  return { v: 1, done: {}, pts: {}, eggs: {}, unlocks: {}, met: {} };
}
export const save: Save = loadSave();
export function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* private mode */ } }
export function resetSave() { save.done = {}; save.pts = {}; save.eggs = {}; save.unlocks = {}; save.met = {}; delete save.at; persist(); }
/**
 * Developer mode: every node open, and K skips a level. Only on the dev server (`npm run dev`), never in the deployed
 * game: on with ?dev=1 in the address, or with the switch in the page footer (remembered).
 */
const devStored = () => { try { return localStorage.getItem('carbon-to-orbit-dev') === '1'; } catch { return false; } };
export const DEV = import.meta.env.DEV && (new URLSearchParams(location.search).has('dev') || devStored());
/**
 * Free play: every node on the map is open, a list (P) jumps straight to any of them, and nothing is scored or saved:
 * no stars, points, eggs, secrets, people met or map position. For trying a level without playing the story in order.
 * P, or the footer button, turns it on; ?free=1 starts in it; it lasts until the player leaves it or reloads.
 * `at` is where the marker stands in free play, kept apart from the save's.
 */
export const free = { on: new URLSearchParams(location.search).has('free'), at: '' };
export function setFree(on: boolean) {
  free.on = on; if (!on) free.at = '';
  const b = document.getElementById('free');
  if (b) { b.textContent = on ? 'Free play: on' : 'Free play'; b.classList.toggle('on', on); }
  document.getElementById('pick')?.classList.toggle('on', on);
}
/**
 * Who is played in a level, and which sprite set to use. Peter Beck is the main character throughout; a level can hand
 * the controls to someone else with `hero`. Peter has a younger set for 1990s levels.
 */
export function hero(def?: LevelDef, young = false) {
  const c = CHARACTERS.find((x) => x.id === def?.hero) || CHARACTERS[0];
  return { c, pre: c.id === 'peter' ? (young ? 'y' : '') : c.pre, name: c.name, role: def?.role || c.role };
}
/** Extra hotkeys a scene can claim. */
export const hotkeys: Record<string, (() => void) | undefined> = {};

// ---------- DOM overlay cards (story text, photos, source links) ----------
const overlay = () => document.getElementById('overlay')!;
let confirmFn: (() => void) | undefined;
export const overlayOpen = () => !overlay().hidden;
function overlayConfirm() { const f = confirmFn; if (f) f(); }
export function closeCard() { if (overlayOpen()) snd.move(); overlay().hidden = true; overlay().innerHTML = ''; confirmFn = undefined; lockUntil = performance.now() + 250; for (const k in pad) pad[k as Key] = false; }
export interface Btn { label: string; fn: () => void; alt?: boolean }
export function showCard(html: string, btns: Btn[], photo?: LevelDef['photo']) {
  const o = overlay();
  const fig = photo
    ? photo.official
      ? `<figure><img src="${photo.src}" alt="${photo.caption}"><figcaption>${photo.caption}<br>Photo: ${photo.credit}, all rights reserved · <a href="${photo.page}" target="_blank" rel="noopener">source</a></figcaption></figure>`
      : photo.src
      ? `<figure class="drawn"><img src="${photo.src}" alt="${photo.caption}"><figcaption>${photo.caption}<br>${photo.credit}</figcaption></figure>`
      : `<figure><img src="assets/photos/${photo.file}" alt="${photo.caption}"><figcaption>${photo.caption}<br>Photo: ${photo.credit} · <a href="${photo.page}" target="_blank" rel="noopener">source</a></figcaption></figure>`
    : '';
  o.innerHTML = `<div class="card ${photo ? 'has-photo' : ''}">${fig}<div>${html}<div class="btns"></div></div></div>`;
  const box = o.querySelector('.btns')!;
  btns.forEach((b, i) => {
    const el = document.createElement('button');
    el.textContent = b.label + (i === 0 ? ' ⏎' : '');
    if (b.alt) el.className = 'alt';
    el.onclick = () => { closeCard(); b.fn(); };
    box.appendChild(el);
  });
  confirmFn = () => { closeCard(); btns[0].fn(); };
  o.hidden = false;
}
/** A line of text at the top of the stage that fades away by itself. */
let toastTimer: number | undefined;
export function toast(text: string) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.getElementById('stage')!.appendChild(el); }
  el.textContent = text; el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = window.setTimeout(() => el.classList.remove('on'), 2400);
}
// ---------- graphics: high uses the hi-fi layer (hifi.ts) wherever a level has a look; G or the HD button ----------
const GFX_KEY = 'carbon-to-orbit-graphics';
let gfxHigh = (() => { try { return localStorage.getItem(GFX_KEY) !== 'standard'; } catch { return true; } })();
if (new URLSearchParams(location.search).get('hifi') === '0') gfxHigh = false;
export const hifiOn = () => gfxHigh;
function showGfx() { const b = document.getElementById('gfx'); if (b) { b.textContent = gfxHigh ? 'HD' : 'SD'; b.classList.toggle('on', gfxHigh); } }
function toggleGfx(game: Phaser.Game) {
  gfxHigh = !gfxHigh; snd.click(); showGfx();
  try { localStorage.setItem(GFX_KEY, gfxHigh ? 'high' : 'standard'); } catch { /* private mode */ }
  const sc = game.scene.getScenes(true)[0] as any, label = `Graphics: ${gfxHigh ? 'high' : 'standard'}`;
  if (!sc) return toast(label);
  // The map and the title screen lose nothing by being rebuilt, so they switch at once.
  if (sc.scene.key === 'Map') { toast(label); return sc.scene.restart({ title: false }); }
  if (sc.scene.key === 'Title') { toast(label); return sc.scene.restart(); }
  if (!sc.def || overlayOpen()) return toast(label + (sc.def ? ' · from the next start of a level' : ''));
  // Inside a level the run would be lost, so ask first.
  sc.scene.pause(); snd.select();
  showCard(`<div class="kicker">${label.toUpperCase()} · GAME PAUSED</div><h1>Restart this level to see it now?</h1><p>Restarting begins the level again from the start. Otherwise the new graphics apply from the next level you start.</p>`,
    [{ label: 'Keep playing', fn: () => sc.scene.resume() }, { label: 'Restart the level', alt: true, fn: () => { stopLoops(); music.stop(0.2); sc.scene.restart({ def: sc.def }); } }]);
}
// ---------- game speed: + and - at any moment in a level ----------
/** The speeds on offer. Speed applies inside levels (not on the map), and a level's points scale with it: see `speedFactor`. */
export const SPEEDS = [0.5, 0.75, 1, 1.5, 2, 3, 4];
const SPEED_KEY = 'carbon-to-orbit-speed';
let speedIx = (() => { try { const i = SPEEDS.indexOf(Number(localStorage.getItem(SPEED_KEY))); return i < 0 ? 2 : i; } catch { return 2; } })();
export const speed = () => SPEEDS[speedIx];
const pct = (f: number) => (f === 1 ? 'score ×1' : `score ×${f}`);
function showSpeed() {
  const el = document.querySelector('#speed span'); if (!el) return;
  const f = speedFactor(speed()) as number;
  el.innerHTML = `×${speed()}<small>${f === 1 ? '' : f > 1 ? '+' + Math.round((f - 1) * 100) + '%' : '−' + Math.round((1 - f) * 100) + '%'}</small>`;
  (el.parentElement as HTMLElement).title = `Game speed ×${speed()} (+ and − keys): ${pct(f)} in a level`;
  (el.parentElement as HTMLElement).classList.toggle('fast', speed() > 1); (el.parentElement as HTMLElement).classList.toggle('slow', speed() < 1);
}
export function setSpeed(d: number) {
  const i = Math.max(0, Math.min(SPEEDS.length - 1, speedIx + d));
  if (i === speedIx) return snd.deny();
  speedIx = i; snd.click(); try { localStorage.setItem(SPEED_KEY, String(speed())); } catch { /* private mode */ }
  showSpeed();
}
/** The average speed of the level being played: game steps taken per screen frame, counted only while a level is running. */
const run = { frames: 0, steps: 0 };
export function trackRun(steps: number) { run.frames++; run.steps += steps; }
const runAverage = () => (run.frames > 30 ? run.steps / run.frames : 1);

// ---------- the controls panel: H, or the ? button, at any moment ----------
/**
 * What the keys do, per scene. A scene whose controls depend on the level (or the phase) defines `help()` instead and
 * returns the same shape; every new mechanic must provide one or the other.
 */
export interface Help { title: string; rows: [keys: string, does: string][]; note?: string }
export const CONTROLS: Record<string, Help> = {
  Map: { title: 'World map', rows: [['← ↑ ↓ →', 'Walk to the nearest level in that direction'], ['Enter', 'Open the level, card or person you are standing on'], ['N', 'Walk straight to the next level to play'], ['P', 'Free play: pick any level, card or person from a list. Nothing is scored'], ['L', 'Your score and the leaderboard'], ['C', 'Who made the game, and its source']], note: 'Greyed-out levels open once every earlier level on the story path is finished, or at once in free play.' },
  Platform: { title: 'Platform level', rows: [['← →', 'Run'], ['Space', 'Jump: hold for a higher jump. Land on a troublemaker to see it off'], ['Space (jet pack)', 'Hold to fly while the jet pack lasts'], ['Space (gumboots)', 'Press again in mid-air for a second jump']], note: 'Collect every part, then reach the goal. Bubbles are power-ups; the timer bar shows how long one lasts.' },
  Hotfire: { title: 'Engine hot-fire', rows: [['Space', 'Hold to spin the electric pumps up; release to let pressure fall']], note: 'Keep the needle in the green band until the qualification bar is full, before the battery runs flat.' },
  Heli: { title: 'Helicopter catch', rows: [['← ↑ ↓ →', 'Fly the helicopter']], note: 'Put the hook at the bottom of your cable on the line trailing above the parachute. You get three passes.' },
  OrbitRaise: { title: 'Orbit raising', rows: [['Space', 'Fire the engine: press as the spacecraft sweeps through the green perigee zone']], note: 'Better timing gives a bigger push. Reach the Moon before the propellant runs out.' },
  Sprint: { title: 'Rocket bike sprint', rows: [['Space', 'Hold to open the peroxide valve'], ['← →', 'Tap to keep the balance needle centred']], note: 'The faster you go, the more it wobbles. Stay upright to the flag.' },
};
let helpOpen = false;
const kbd = (s: string) => s.replace(/(←|→|↑|↓|Space|Enter|Esc|\b[A-Z]\b)/g, '<kbd>$1</kbd>');
/** Ask before leaving a level for the map: the run so far is not saved. */
export function leaveLevel(game: Phaser.Game) {
  if (overlayOpen()) return;
  const sc = game.scene.getScenes(true)[0] as any;
  if (!sc || !sc.def) return;
  sc.scene.pause(); snd.select();
  showCard(`<div class="kicker">${sc.def.title.toUpperCase()} · GAME PAUSED</div><h1>Back to the map?</h1><p>This run of the level is not saved. Stars and points you already earned here stay.</p>`,
    [{ label: 'Keep playing', fn: () => sc.scene.resume() }, { label: 'Back to the map', alt: true, fn: () => { stopLoops(); music.stop(0.3); sc.scene.start('Map', { title: false }); } }]);
}
/**
 * A hint, when the scene offers one: `hint()` returns the next hint for where the player is now (and may charge for it,
 * in the scene's own currency), or undefined when there is none left.
 */
export function showHint(game: Phaser.Game) {
  if (overlayOpen()) return;
  const sc = game.scene.getScenes(true)[0] as any;
  if (!sc || typeof sc.hint !== 'function') return;
  const h: { title: string; text: string; cost?: string } | undefined = sc.hint();
  sc.scene.pause(); snd.select();
  showCard(`<div class="kicker">HINT · GAME PAUSED</div><h1>${h ? h.title : 'No more hints'}</h1><p>${h ? h.text : 'That is everything the hints can tell you here.'}</p>${h?.cost ? `<p class="src">${h.cost}</p>` : ''}`,
    [{ label: 'Back to the game', fn: () => sc.scene.resume() }]);
}
/** Pause whatever is running and show its controls. */
export function showHelp(game: Phaser.Game) {
  if (overlayOpen()) return;
  const sc = game.scene.getScenes(true)[0] as any;
  const h: Help | undefined = sc && (sc.help?.() || CONTROLS[sc.scene.key]);
  if (!h) return;
  const rows: [string, string][] = [...h.rows, ['+ −', 'Game speed in a level: faster scores more, slower scores less'], ['H', 'Show or hide this panel'], ['M', 'Sound on or off'], ['T', 'Next soundtrack: four to choose from'], ['Esc', 'In a level: back to the map (asks first)'], ...((sc.hint ? [['I', 'A hint for where you are now']] : []) as [string, string][]), ['G', 'Graphics: high (HD) or standard (SD), for slower computers'], ...(DEV ? [['K', 'Developer mode: skip this level'] as [string, string]] : [])];
  sc.scene.pause(); helpOpen = true; snd.select();
  showCard(`<div class="kicker">CONTROLS · GAME PAUSED</div><h1>${h.title}</h1><table class="keys">${rows.map(([k, t]) => `<tr><td>${kbd(k)}</td><td>${t}</td></tr>`).join('')}</table>${h.note ? `<p class="how">${h.note}</p>` : ''}<p class="src">Arrows also work as W A S D, Space as Z, Enter as X.</p>`,
    [{ label: 'Back to the game', fn: () => { helpOpen = false; sc.scene.resume(); } }]);
}

export const KIND_LABEL: Record<string, string> = { platform: 'PLATFORM', launch: 'LAUNCH CONTROL', minigame: 'MINI-GAME', card: 'STORY CARD', person: 'PERSON' };
/** A link out to a video on its own site. The footage is never copied into the game. */
export const watchLink = (def: LevelDef) => (def.watch ? `<p class="watch"><a href="${def.watch.url}" target="_blank" rel="noopener">▶ Watch</a> ${def.watch.label}</p>` : '');
export const srcLinks = (urls: string[]) =>
  `<p class="src">Sources: ${urls.map((u) => `<a href="${u}" target="_blank" rel="noopener">${new URL(u).hostname.replace('www.', '')}</a>`).join(' ')}</p>`; // spaced, so a long list can wrap

/**
 * Says who the player is: a small name plate (portrait, name, role) shown as the level opens, which then fades away
 * so it never sits over the game. `wrap` lets a scrolling scene pin the pieces to the screen.
 */
export function who(s: Phaser.Scene, def: LevelDef, x: number, y: number, young = false, wrap: (o: any) => any = (o) => o) {
  const h = hero(def, young);
  const name = T(s, x + 23, y + 3.6, h.name.toUpperCase(), '#ffffff', 6.6, '700'), role = T(s, x + 23, y + 12.4, h.role, '#ffe98a', 5);
  const w = Math.max(100, 23 + Math.max(name.width, role.width) + 6); // the plate grows to fit a long role, so the words stay on it
  const shift = Math.min(0, W - 2 - (x + w)); x += shift; name.x += shift; role.x += shift; // and a plate on the right edge moves left to stay on screen
  const parts = [
    wrap(panel(s, x, y, w, 22, 0.85)).setDepth(48), wrap(img(s, x + 11, y + 11, h.pre + 'peter_chip')).setScale(S * 0.68).setDepth(49),
    wrap(name).setDepth(49), wrap(role).setDepth(49),
  ];
  parts.forEach((o) => o.setAlpha(0));
  s.tweens.add({ targets: parts, alpha: 1, duration: 250 });
  s.tweens.add({ targets: parts, alpha: 0, delay: 4200, duration: 600, onComplete: () => parts.forEach((o) => o.destroy()) });
}

/** Shared end-of-level flow: save, show the result card, return to the map. */
export function finish(scene: Phaser.Scene, def: LevelDef, r: { success: boolean; stars?: number; title: string; text: string; egg?: boolean; secret?: boolean }) {
  // A level can be told in several acts: `params.then` names the next mechanic and its params. A successful act hands
  // over to the next one with a short card in between; stars are the worst of the acts, and nothing is saved until the last.
  const nxt = def.params?.then as { mechanic: string; params: any; intro?: string; how?: string } | undefined;
  if (r.success && nxt) {
    stopLoops(); music.stop(0.3);
    const d2: LevelDef = { ...def, mechanic: nxt.mechanic as LevelDef['mechanic'], how: nxt.how || def.how, params: nxt.params, _stars: Math.min(def._stars ?? 3, r.stars || 1), _egg: def._egg || !!r.egg };
    const go = () => scene.scene.start(SCENE_FOR[nxt.mechanic], { def: d2 });
    (window as any).__g2o.act = { id: def.id, title: r.title, stars: r.stars };
    if (new URLSearchParams(location.search).has('auto')) return void scene.time.delayedCall(300, go);
    return showCard(`<div class="kicker">${def.title.toUpperCase()} · NEXT ACT</div><h1>${r.title}</h1><p>${r.text}</p>${nxt.intro ? `<p class="fact">${nxt.intro}</p>` : ''}${nxt.how ? `<p class="how">How to play: ${nxt.how}</p>` : ''}`, [{ label: 'Continue', fn: go }]);
  }
  if (r.success && def._stars !== undefined) r = { ...r, stars: Math.min(def._stars, r.stars || 1), egg: r.egg || def._egg };
  if (!DEV) count(r.success ? 'finish' : 'fail', def.id, r.success ? r.stars || 1 : 0);
  stopLoops(); music.stop(0.3); if (r.success) snd.win(); else snd.lose();
  // points for the level: stars × 100, scaled by the average game speed it was played at; the best run is kept
  const avg = runAverage(), factor = speedFactor(avg) as number, earned = r.success ? (levelPoints(r.stars || 1, avg) as number) : 0;
  run.frames = 0; run.steps = 0;
  const scored = !free.on; // free play keeps nothing: the save is left exactly as it was
  if (r.success && scored) {
    const before = save.pts[def.id] ?? (save.done[def.id] || 0) * 100;
    save.pts[def.id] = Math.max(before, earned);
    save.done[def.id] = Math.max(save.done[def.id] || 0, r.stars || 1);
  }
  const speedLine = !r.success ? '' : scored ? `<p class="src">Played at ×${avg.toFixed(2).replace(/\.?0+$/, '')} speed on average: ${factor === 1 ? `${earned} points` : `score ×${factor} = ${earned} points`}${save.pts[def.id] > earned ? ` (your best here is ${save.pts[def.id]})` : ''}. Press + or − in a level to change speed.</p>` : `<p class="src">Free play: this run is not scored or saved. Press P on the map to pick another level, or to leave free play.</p>`;
  if (r.egg && def.egg && scored) save.eggs[def.id] = true;
  const fresh = !!(scored && r.success && r.secret && def.unlocks && !save.unlocks[def.unlocks]);
  if (scored && r.success && r.secret && def.unlocks) save.unlocks[def.unlocks] = true;
  if (scored) { save.at = def.id; persist(); } else free.at = def.id;
  const stars = r.success ? `<div class="stars">${'★'.repeat(r.stars || 1)}${'☆'.repeat(3 - (r.stars || 1))}</div>` : '';
  const eggFound = scored ? save.eggs[def.id] : r.egg;
  const egg = def.egg ? (eggFound ? `<p class="fact"><b>Easter egg found:</b> ${def.egg}</p>` : `<p class="src">There is an easter egg hidden in this level…</p>`) : '';
  const bonus = def.unlocks && scored ? byId(def.unlocks) : undefined; // in free play every secret is already on the map
  const secret = !bonus ? '' : save.unlocks[bonus.id] ? `<p class="fact unlock"><b>${fresh ? 'Secret unlocked' : 'Secret found'}:</b> “${bonus.title}” is now on the map, branching off this node.</p>` : `<p class="src">${def.params?.secretHint || 'A blueprint is hidden somewhere in this level. You will need a power-up to reach it.'}</p>`;
  const html = `${r.success ? patchImg(def.id) : ''}<div class="kicker">${def.title.toUpperCase()} · ${r.success ? 'MISSION SUCCESS' : 'ANOMALY'}</div><h1>${r.title}</h1>${stars}<p>${r.text}</p>${r.success ? `<p class="fact"><b>What really happened:</b> ${def.after}</p>` : ''}${speedLine}${r.success ? watchLink(def) : ''}${egg}${r.success ? secret : ''}`;
  const back = () => scene.scene.start('Map', { title: false }); // without data Phaser reuses the boot data and the title card comes back
  const retry = () => scene.scene.start(scene.scene.key, { def });
  showCard(html, r.success ? [{ label: 'Back to map', fn: back }, { label: 'Play again', fn: retry, alt: true }] : [{ label: 'Try again', fn: retry }, { label: 'Back to map', fn: back, alt: true }]);
  (window as any).__g2o.last = { id: def.id, ...r };
  setTimeout(() => (window as any).__g2o.recStop?.(), 2200); // dev recorder, if running: leave room for the jingle
}
