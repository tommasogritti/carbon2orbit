import Phaser from 'phaser';
import { byId, CHARACTERS } from './content';
import type { LevelDef } from './content';
import { D, S, UI, BUSTS } from './art';
import { beep, snd, music, stopLoops, unlock, muted, setMuted } from './audio';

/**
 * Official mission patches, by level id, when they have been fetched into src/assets/patches/ (see README).
 * They are Rocket Lab's artwork, so that folder is git-ignored: the game shows a patch where the file exists and
 * simply goes without where it does not. Nothing here ships in the repository.
 */
export const PATCHES: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob('./assets/patches/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>).map(([p, url]) => [p.split('/').pop()!.replace('.png', ''), url]),
);
/**
 * Official Rocket Lab photos, by level id, when they have been saved into src/assets/official/ as <level id>.jpg
 * (optionally with a manifest.json giving each one's title and Flickr page). Rocket Lab's Flickr says its images may be
 * downloaded with credit, but they are all rights reserved, so this folder is git-ignored too: local play only.
 */
const officialMeta = (Object.values(import.meta.glob('./assets/official/manifest.json', { eager: true, import: 'default' }))[0] || {}) as Record<string, { title: string; page: string }>;
export const OFFICIAL: Record<string, NonNullable<LevelDef['photo']>> = Object.fromEntries(
  Object.entries(import.meta.glob('./assets/official/*.jpg', { eager: true, import: 'default', query: '?url' }) as Record<string, string>).map(([p, src]) => {
    const id = p.split('/').pop()!.replace('.jpg', '');
    return [id, { file: '', src, official: true, caption: officialMeta[id]?.title || 'Official Rocket Lab photo', credit: 'Rocket Lab', page: officialMeta[id]?.page || 'https://www.flickr.com/photos/rocketlab/' }];
  }),
);
/** The picture for a level's cards: its freely licensed photo if it has one, else a local official photo if present. */
export const cardPhoto = (def: LevelDef) => def.photo || OFFICIAL[def.id];
export const patchImg = (id: string) => (PATCHES[id] ? `<img class="patch" src="${PATCHES[id]}" alt="Mission patch" title="Mission patch © Rocket Lab">` : '');
export const W = 320;
export const H = 180;
export const SCENE_FOR: Record<string, string> = { platform: 'Platform', launch: 'Launch', hotfire: 'Hotfire', 'heli-catch': 'Heli', 'orbit-raise': 'OrbitRaise', sprint: 'Sprint' };
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
  return s.add.text(x, y, str, { fontFamily: FONT, fontSize: size + 'px', fontStyle: weight, color, lineSpacing: 1 }).setResolution(D);
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
  const help = document.getElementById('help');
  help?.addEventListener('click', () => { help.blur(); if (helpOpen) overlayConfirm(); else showHelp(game); });
  const dev = document.getElementById('dev');
  if (dev) {
    dev.textContent = DEV ? 'Developer mode: ON · K skips a level · click to turn off' : 'Developer mode: off';
    dev.classList.toggle('on', DEV);
    dev.addEventListener('click', () => {
      try { if (DEV) localStorage.removeItem('carbon-to-orbit-dev'); else localStorage.setItem('carbon-to-orbit-dev', '1'); } catch { /* private mode */ }
      const u = new URL(location.href); u.searchParams.delete('dev'); location.href = u.toString(); // reload with the new setting
    });
  }
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', (e) => {
    unlock(); // browsers only allow sound after a key press or tap
    if (e.code === 'KeyM' && !e.repeat) setMuted(!muted());
    if (e.code === 'KeyH' && !e.repeat && helpOpen) { overlayConfirm(); e.preventDefault(); return; } // H closes the panel it opened
    if (!e.repeat && !overlayOpen() && hotkeys[e.code]) { hotkeys[e.code]!(); e.preventDefault(); return; }
    const k = MAP[e.code];
    if (!k) return;
    if (overlayOpen()) { if (k === 'b' || k === 'a') { if (!e.repeat) overlayConfirm(); e.preventDefault(); } return; }
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
export interface Save { v: 1; done: Record<string, number>; eggs: Record<string, true>; unlocks: Record<string, true>; met: Record<string, true>; at?: string }
const KEY = 'carbon-to-orbit-save';
export function loadSave(): Save {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 1) return { unlocks: {}, met: {}, ...s }; } catch { /* fresh save */ }
  return { v: 1, done: {}, eggs: {}, unlocks: {}, met: {} };
}
export const save: Save = loadSave();
export function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* private mode */ } }
export function resetSave() { save.done = {}; save.eggs = {}; save.unlocks = {}; save.met = {}; delete save.at; persist(); }
/** Developer mode: every node open, and K skips a level. On with ?dev=1 in the address, or with the switch in the page footer (remembered). */
const devStored = () => { try { return localStorage.getItem('carbon-to-orbit-dev') === '1'; } catch { return false; } };
export const DEV = new URLSearchParams(location.search).has('dev') || devStored();
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
// ---------- the controls panel: H, or the ? button, at any moment ----------
/**
 * What the keys do, per scene. A scene whose controls depend on the level (or the phase) defines `help()` instead and
 * returns the same shape; every new mechanic must provide one or the other.
 */
export interface Help { title: string; rows: [keys: string, does: string][]; note?: string }
export const CONTROLS: Record<string, Help> = {
  Map: { title: 'World map', rows: [['← ↑ ↓ →', 'Walk to the nearest level in that direction'], ['Enter', 'Open the level, card or person you are standing on'], ['N', 'Walk straight to the next level to play']], note: 'Greyed-out levels open once every earlier level on the story path is finished.' },
  Platform: { title: 'Platform level', rows: [['← →', 'Run'], ['Space', 'Jump: hold for a higher jump. Land on a troublemaker to see it off'], ['Space (jet pack)', 'Hold to fly while the jet pack lasts'], ['Space (gumboots)', 'Press again in mid-air for a second jump']], note: 'Collect every part, then reach the goal. Bubbles are power-ups; the timer bar shows how long one lasts.' },
  Hotfire: { title: 'Engine hot-fire', rows: [['Space', 'Hold to spin the electric pumps up; release to let pressure fall']], note: 'Keep the needle in the green band until the qualification bar is full, before the battery runs flat.' },
  Heli: { title: 'Helicopter catch', rows: [['← ↑ ↓ →', 'Fly the helicopter']], note: 'Put the hook at the bottom of your cable on the line trailing above the parachute. You get three passes.' },
  OrbitRaise: { title: 'Orbit raising', rows: [['Space', 'Fire the engine: press as the spacecraft sweeps through the green perigee zone']], note: 'Better timing gives a bigger push. Reach the Moon before the propellant runs out.' },
  Sprint: { title: 'Rocket bike sprint', rows: [['Space', 'Hold to open the peroxide valve'], ['← →', 'Tap to keep the balance needle centred']], note: 'The faster you go, the more it wobbles. Stay upright to the flag.' },
};
let helpOpen = false;
const kbd = (s: string) => s.replace(/(←|→|↑|↓|Space|Enter|\b[A-Z]\b)/g, '<kbd>$1</kbd>');
/** Pause whatever is running and show its controls. */
export function showHelp(game: Phaser.Game) {
  if (overlayOpen()) return;
  const sc = game.scene.getScenes(true)[0] as any;
  const h: Help | undefined = sc && (sc.help?.() || CONTROLS[sc.scene.key]);
  if (!h) return;
  const rows: [string, string][] = [...h.rows, ['H', 'Show or hide this panel'], ['M', 'Sound on or off'], ...(DEV ? [['K', 'Developer mode: skip this level'] as [string, string]] : [])];
  sc.scene.pause(); helpOpen = true; snd.select();
  showCard(`<div class="kicker">CONTROLS · GAME PAUSED</div><h1>${h.title}</h1><table class="keys">${rows.map(([k, t]) => `<tr><td>${kbd(k)}</td><td>${t}</td></tr>`).join('')}</table>${h.note ? `<p class="how">${h.note}</p>` : ''}<p class="src">Arrows also work as W A S D, Space as Z, Enter as X.</p>`,
    [{ label: 'Back to the game', fn: () => { helpOpen = false; sc.scene.resume(); } }]);
}

export const KIND_LABEL: Record<string, string> = { platform: 'PLATFORM', launch: 'LAUNCH CONTROL', minigame: 'MINI-GAME', card: 'STORY CARD', person: 'PERSON' };
/** A link out to a video on its own site. The footage is never copied into the game. */
export const watchLink = (def: LevelDef) => (def.watch ? `<p class="watch"><a href="${def.watch.url}" target="_blank" rel="noopener">▶ Watch</a> ${def.watch.label}</p>` : '');
export const srcLinks = (urls: string[]) =>
  `<p class="src">Sources: ${urls.map((u) => `<a href="${u}" target="_blank" rel="noopener">${new URL(u).hostname.replace('www.', '')}</a>`).join('')}</p>`;

/**
 * Says who the player is: a small name plate (portrait, name, role) shown as the level opens, which then fades away
 * so it never sits over the game. `wrap` lets a scrolling scene pin the pieces to the screen.
 */
export function who(s: Phaser.Scene, def: LevelDef, x: number, y: number, young = false, wrap: (o: any) => any = (o) => o) {
  const h = hero(def, young);
  const parts = [
    wrap(panel(s, x, y, 100, 22, 0.85)).setDepth(48), wrap(img(s, x + 11, y + 11, h.pre + 'peter_chip')).setScale(S * 0.68).setDepth(49),
    wrap(T(s, x + 23, y + 3.6, h.name.toUpperCase(), '#ffffff', 6.6, '700')).setDepth(49), wrap(T(s, x + 23, y + 12.4, h.role, '#ffe98a', 5)).setDepth(49),
  ];
  parts.forEach((o) => o.setAlpha(0));
  s.tweens.add({ targets: parts, alpha: 1, duration: 250 });
  s.tweens.add({ targets: parts, alpha: 0, delay: 4200, duration: 600, onComplete: () => parts.forEach((o) => o.destroy()) });
}

/** Shared end-of-level flow: save, show the result card, return to the map. */
export function finish(scene: Phaser.Scene, def: LevelDef, r: { success: boolean; stars?: number; title: string; text: string; egg?: boolean; secret?: boolean }) {
  stopLoops(); music.stop(0.3); if (r.success) snd.win(); else snd.lose();
  if (r.success) { save.done[def.id] = Math.max(save.done[def.id] || 0, r.stars || 1); }
  if (r.egg && def.egg) save.eggs[def.id] = true;
  const fresh = !!(r.success && r.secret && def.unlocks && !save.unlocks[def.unlocks]);
  if (r.success && r.secret && def.unlocks) save.unlocks[def.unlocks] = true;
  save.at = def.id; persist();
  const stars = r.success ? `<div class="stars">${'★'.repeat(r.stars || 1)}${'☆'.repeat(3 - (r.stars || 1))}</div>` : '';
  const egg = def.egg ? (save.eggs[def.id] ? `<p class="fact"><b>Easter egg found:</b> ${def.egg}</p>` : `<p class="src">There is an easter egg hidden in this level…</p>`) : '';
  const bonus = def.unlocks ? byId(def.unlocks) : undefined;
  const secret = !bonus ? '' : save.unlocks[bonus.id] ? `<p class="fact unlock"><b>${fresh ? 'Secret unlocked' : 'Secret found'}:</b> “${bonus.title}” is now on the map, branching off this node.</p>` : `<p class="src">A blueprint is hidden somewhere in this level. You will need a power-up to reach it.</p>`;
  const html = `${r.success ? patchImg(def.id) : ''}<div class="kicker">${def.title.toUpperCase()} · ${r.success ? 'MISSION SUCCESS' : 'ANOMALY'}</div><h1>${r.title}</h1>${stars}<p>${r.text}</p>${r.success ? `<p class="fact"><b>What really happened:</b> ${def.after}</p>` : ''}${r.success ? watchLink(def) : ''}${egg}${r.success ? secret : ''}`;
  const back = () => scene.scene.start('Map', { title: false }); // without data Phaser reuses the boot data and the title card comes back
  const retry = () => scene.scene.start(scene.scene.key, { def });
  showCard(html, r.success ? [{ label: 'Back to map', fn: back }, { label: 'Play again', fn: retry, alt: true }] : [{ label: 'Try again', fn: retry }, { label: 'Back to map', fn: back, alt: true }]);
  (window as any).__g2o.last = { id: def.id, ...r };
  setTimeout(() => (window as any).__g2o.recStop?.(), 2200); // dev recorder, if running: leave room for the jingle
}
