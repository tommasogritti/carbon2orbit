import Phaser from 'phaser';
import { W, H, T, just, save, persist, DEV, showCard, srcLinks, watchLink, KIND_LABEL, SCENE_FOR, img, panel, hero } from '../core';
import { D, S, MAPW, MAPH, BUST_URL, BUSTS, DIAGRAMS } from '../art';
import { LEVELS, BONUS, PEOPLE, CHARACTERS, LevelDef } from '../content';
import { snd, music, stopLoops } from '../audio';

const ZOOM = 2.5; // the map is shown wider than gameplay scenes so the geography reads at a glance
/** Only announced things are locked. A chapter that is still unfolding (in-progress) can be played up to where the story has got to. */
const playable = (d: LevelDef) => d.status !== 'announced';
/** A node is open when every earlier flown node is done (Super Mario World style linear path). */
export const isOpen = (i: number) => DEV || LEVELS.slice(0, i).every((d) => !playable(d) || save.done[d.id]);
/** Secret nodes appear once their blueprint has been found. */
const found = () => BONUS.filter((b) => DEV || save.unlocks[b.id]);
/** People stand beside the path once you have reached the node they branch from. */
const folk = () => PEOPLE.filter((p) => isOpen(LEVELS.findIndex((l) => l.id === p.parent)));
const branches = () => [...found(), ...folk()];
const nodes = () => [...LEVELS, ...branches()];
const parentOf = (b: LevelDef) => LEVELS.find((l) => l.id === b.parent)!;

export function openLevel(scene: Phaser.Scene, def: LevelDef) {
  const locked = !playable(def);
  const kind = locked ? 'locked' : def.kind;
  const head = `<div class="kicker"><span class="badge k-${kind}">${locked ? 'COMING ' + def.date.toUpperCase() : KIND_LABEL[def.kind]}</span>${def.status === 'in-progress' ? '<span class="badge k-locked">STORY STILL UNFOLDING</span>' : ''}${def.date} · ${def.place}</div><h1>${def.title}</h1><p>${def.intro}</p><p class="fact"><b>Did you know?</b> ${def.fact}</p>`;
  const back = { label: 'Back to map', fn: () => {}, alt: true };
  if (def.kind === 'person') { // meeting someone: facts and a picture, never invented speech
    const pic = def.photo || (def.portrait !== undefined ? { file: '', page: '', src: BUSTS[def.portrait], caption: def.title + ', as drawn in the game.', credit: 'Likeness from the photo on Rocket Lab’s team page; no freely licensed photo is available.' } : undefined);
    showCard(head + srcLinks(def.sources), [{ label: 'Good to meet you', fn: () => { save.met[def.id] = true; save.done[def.id] = 3; persist(); scene.scene.restart({ title: false }); } }], pic);
    return;
  }
  if (def.kind === 'card' || locked) {
    showCard(head + srcLinks(def.sources), [{ label: locked ? 'Back to map' : 'Continue', fn: () => { if (!locked) { save.done[def.id] = 3; persist(); scene.scene.restart({ title: false }); } } }], def.photo);
  } else {
    const lead = CHARACTERS.find((c) => c.id === def.hero); // a level played as someone other than Peter says so up front
    const cast = lead ? `<div class="cast"><img class="toon" src="${BUSTS[lead.pre]}" alt="Cartoon of ${lead.name}"><div><b>In this level you play ${lead.name}</b>, ${lead.role}. ${lead.likeness}<br><span class="src">Drawn likeness; no freely licensed photo is available.</span></div></div>` : '';
    const diagram = def.diagram ? `<figure class="diagram"><img src="${DIAGRAMS[def.diagram.key]}" alt="Labelled diagram"><figcaption>${def.diagram.caption}</figcaption></figure>` : '';
    showCard(head + cast + diagram + `<p class="how">How to play: ${def.how}</p>` + watchLink(def) + srcLinks(def.sources), [{ label: 'Start', fn: () => scene.scene.start(SCENE_FOR[def.mechanic!], { def }) }, back], def.photo);
  }
}

/** Paths between nodes are gentle arcs; long ocean crossings bow more. */
function arc(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  const dx = b.x - a.x, dy = b.y - a.y, bow = Math.min(40, Math.hypot(dx, dy) * 0.14);
  const mx = (a.x + b.x) / 2 + (dy / (Math.hypot(dx, dy) || 1)) * bow, my = (a.y + b.y) / 2 - (Math.abs(dx) / (Math.hypot(dx, dy) || 1)) * bow;
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * mx + t * t * b.x, y: u * u * a.y + 2 * u * t * my + t * t * b.y };
}

export class MapScene extends Phaser.Scene {
  cur: LevelDef = LEVELS[0]; pre = ''; lastStep = 0; tag!: Phaser.GameObjects.Container; marker!: Phaser.GameObjects.Image; ring!: Phaser.GameObjects.Image; moving = false; banner!: Phaser.GameObjects.Text; sub!: Phaser.GameObjects.Text; badge!: Phaser.GameObjects.Image;
  constructor() { super('Map'); }
  create(data: { title?: boolean }) {
    this.moving = false;
    stopLoops(); music.play('map');
    const cam = this.cameras.main; cam.setZoom(ZOOM).setBounds(0, 0, MAPW, MAPH);
    img(this, 0, 0, 'map').setOrigin(0);
    // drifting clouds and their shadows on the sea
    for (let i = 0; i < 7; i++) {
      const y = 170 + ((i * 97) % 240), x0 = (i * 173) % MAPW;
      const c = img(this, x0, y, 'cloud' + (1 + (i % 3))).setAlpha(0.55).setDepth(8);
      this.tweens.add({ targets: c, x: x0 + 140, duration: 60000 + i * 9000, yoyo: true, repeat: -1 });
    }
    // path
    const pg = this.add.graphics();
    LEVELS.forEach((d, i) => {
      if (!i) return; const a = LEVELS[i - 1].map, b = d.map, open = isOpen(i);
      const n = Math.ceil(Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) / 5);
      for (let k = 1; k < n; k++) { const p = arc(a, b, k / n); pg.fillStyle(0x0b0c12, 0.5).fillCircle(p.x, p.y + 0.5, 1.3); pg.fillStyle(open ? 0xffe98a : 0x8fa3c8, open ? 1 : 0.7).fillCircle(p.x, p.y, 0.95); }
    });
    LEVELS.forEach((d, i) => {
      const open = isOpen(i);
      const n = img(this, d.map.x, d.map.y, playable(d) ? 'n_' + d.kind : 'n_locked').setDepth(3);
      if (!open) n.setTint(0x8f9bb5).setAlpha(0.85);
      if (save.done[d.id]) img(this, d.map.x + 6.5, d.map.y - 6.5, 'check').setDepth(4);
    });
    for (const b of found()) { // secret branches: a blue trail off the parent node, and a glow
      const a = parentOf(b).map, n = Math.ceil(Phaser.Math.Distance.Between(a.x, a.y, b.map.x, b.map.y) / 5);
      for (let k = 1; k < n; k++) { const p = arc(a, b.map, k / n); pg.fillStyle(0x0b0c12, 0.5).fillCircle(p.x, p.y + 0.5, 1.3); pg.fillStyle(0x7fd0ff).fillCircle(p.x, p.y, 0.95); }
      const glow = img(this, b.map.x, b.map.y, 'puff').setScale(S * 2.2).setTint(0x7fd0ff).setBlendMode('ADD').setDepth(2);
      this.tweens.add({ targets: glow, alpha: 0.35, scale: S * 2.8, duration: 900, yoyo: true, repeat: -1 });
      img(this, b.map.x, b.map.y, 'n_' + b.kind).setDepth(3);
      if (save.done[b.id]) img(this, b.map.x + 6.5, b.map.y - 6.5, 'check').setDepth(4);
      else T(this, b.map.x, b.map.y + 13, 'SECRET', '#bfe9ff', 5, '700').setOrigin(0.5).setDepth(4).setShadow(0, 1, '#000', 2);
    }
    for (const p of folk()) { // people: a violet trail and a small figure
      const a = parentOf(p).map, n = Math.ceil(Phaser.Math.Distance.Between(a.x, a.y, p.map.x, p.map.y) / 5);
      for (let k = 1; k < n; k++) { const q = arc(a, p.map, k / n); pg.fillStyle(0x0b0c12, 0.4).fillCircle(q.x, q.y + 0.5, 1.1); pg.fillStyle(0xc9a8ff, 0.9).fillCircle(q.x, q.y, 0.75); }
      if (p.portrait !== undefined) img(this, p.map.x, p.map.y, p.portrait + 'peter_chip').setScale(S * 0.62).setDepth(3); else img(this, p.map.x, p.map.y, 'n_person').setDepth(3);
      if (save.met[p.id]) img(this, p.map.x + 6.5, p.map.y - 6.5, 'check').setDepth(4);
    }
    this.cur = nodes().find((d) => d.id === save.at) || LEVELS[0];
    const m = this.cur.map;
    this.ring = img(this, m.x, m.y - 0.5, 'ring').setDepth(2);
    this.tweens.add({ targets: this.ring, scale: S * 1.25, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });
    const me = hero(); this.pre = me.pre;
    this.marker = img(this, m.x, m.y - 5, me.pre + 'peter0').setOrigin(0.5, 1).setScale(S * 1.05).setDepth(6);
    this.tweens.add({ targets: this.marker, scaleY: S * 1.0, duration: 420, yoyo: true, repeat: -1 });
    const tg = this.add.graphics(); tg.fillStyle(0x0b0e18, 0.85).fillRoundedRect(-21, -5.5, 42, 11, 5.5); tg.lineStyle(0.5, 0xffffff, 0.4).strokeRoundedRect(-21, -5.5, 42, 11, 5.5);
    this.tag = this.add.container(m.x, m.y - 48, [tg, T(this, 0, 0, me.name, '#ffffff', 6.4, '700').setOrigin(0.5)]).setDepth(7);
    cam.startFollow(this.marker, false, 0.12, 0.12, 0, -26);
    if (save.done['still-testing']) { // the Humanity Star crosses the sky once you have put it there
      const hs = img(this, -10, 126, 'puff').setScale(S * 0.5).setBlendMode('ADD');
      this.tweens.add({ targets: hs, x: MAPW + 10, y: 92, duration: 14000, repeat: -1, repeatDelay: 3000 });
      this.tweens.add({ targets: hs, alpha: 0.15, duration: 330, yoyo: true, repeat: -1 });
    }
    // HUD lives on its own fixed camera, so the map camera can zoom and scroll freely
    const world = [...this.children.list];
    const hud: Phaser.GameObjects.GameObject[] = [];
    const h = <G extends Phaser.GameObjects.GameObject>(o: G) => { hud.push(o); return o; };
    h(panel(this, 4, H - 36, W - 8, 32, 0.86));
    this.badge = h(img(this, 17, H - 20, 'n_card')).setScale(S * 1.25);
    this.banner = h(T(this, 30, H - 33, '', '#ffffff', 11, '700'));
    this.sub = h(T(this, 30, H - 18, '', '#ffe98a', 6.5));
    const eggs = Object.keys(save.eggs).length, total = LEVELS.filter((d) => d.egg).length;
    h(panel(this, 4, 4, 82, 14)); h(T(this, 9, 6.5, 'CARBON TO ORBIT', '#ffffff', 7.5, '700'));
    h(panel(this, W - 196, 4, 154, 14)); h(T(this, W - 47, 7, `EGGS ${eggs}/${total}   SECRETS ${Object.keys(save.unlocks).length}/${BONUS.length}   PEOPLE ${Object.keys(save.met).length}/${PEOPLE.length}`, '#ffe98a', 6)).setOrigin(1, 0);
    h(T(this, W - 8, H - 17, '←↑↓→ move   ⏎ open', '#aab4d4', 5.5)).setOrigin(1, 0);
    cam.ignore(hud);
    this.cameras.add(0, 0, W * D, H * D).setZoom(D).centerOn(W / 2, H / 2).ignore(world);
    this.refresh();
    if (data?.title) this.titleCard();
  }
  titleCard() {
    showCard(
      `<div class="kicker">AN UNOFFICIAL FAN GAME</div><h1>Carbon to Orbit</h1><p>The story of Rocket Lab, one level at a time: from a rocket bike in a New Zealand workshop to the hundredth Electron and on to Neutron.</p><div class="cast"><img class="toon" src="${BUST_URL}" alt="Cartoon of Peter Beck"><img class="real" src="assets/photos/beck_knzm.jpg" alt="Sir Peter Beck"><div><b>You play as Sir Peter Beck</b>, the founder and CEO of Rocket Lab: the one with the curls. He appears as a younger apprentice in the first level. Now and then someone else from the story takes a level of their own, or runs alongside as a power-up.<br><span class="src">Photo: New Zealand Government, Office of the Governor-General, CC0</span></div></div><p>Walk the map with the arrow keys and press Enter on a node. Sound is on: press M or the speaker button to mute. <span class="badge k-platform">PLATFORM</span><span class="badge k-launch">LAUNCH</span><span class="badge k-minigame">MINI-GAME</span><span class="badge k-card">STORY</span></p><p class="src">Fan project, not affiliated with Rocket Lab. Every level links its sources; photos are freely licensed and credited.</p>`,
      [{ label: 'Play', fn: () => {} }],
    );
  }
  refresh() {
    const d = this.cur;
    const stars = save.done[d.id] && d.kind !== 'card' ? '   ' + '★'.repeat(save.done[d.id]) + '☆'.repeat(3 - save.done[d.id]) : '';
    this.banner.setText(d.title).setFontSize(d.title.length > 30 ? 8.5 : 11);
    this.badge.setTexture(d.kind === 'person' ? (d.portrait !== undefined ? d.portrait + 'peter_chip' : 'n_person') : playable(d) ? 'n_' + d.kind : 'n_locked').setScale(d.kind === 'person' && d.portrait !== undefined ? S * 0.8 : S * 1.25);
    this.sub.setText(`${d.date.slice(0, 15)}  ·  ${d.place}  ·  ${d.kind === 'person' ? (save.met[d.id] ? 'MET' : 'SOMEONE TO MEET') : (d.parent ? 'SECRET ' : '') + (playable(d) ? KIND_LABEL[d.kind] : 'LOCKED')}${d.kind === 'person' ? '' : stars}`);
    this.ring.setPosition(d.map.x, d.map.y - 0.5);
  }
  update() {
    this.tag.setPosition(this.marker.x, this.marker.y - 43);
    if (this.moving) return;
    const cur = this.cur, i = LEVELS.indexOf(cur);
    // neighbours: previous and next on the main path, any secret branches, or back to the parent from a secret node
    const next = i >= 0 ? LEVELS[i + 1] : undefined;
    const around = (i >= 0 ? [LEVELS[i - 1], next, ...branches().filter((b) => b.parent === cur.id)] : [parentOf(cur)]).filter(Boolean) as LevelDef[];
    const dir = { x: (just('right') ? 1 : 0) - (just('left') ? 1 : 0), y: (just('down') ? 1 : 0) - (just('up') ? 1 : 0) };
    let to: LevelDef | undefined;
    if (dir.x || dir.y) {
      let best = 0.1;
      for (const n of around) { const dx = n.map.x - cur.map.x, dy = n.map.y - cur.map.y, l = Math.hypot(dx, dy) || 1, sc = (dx * dir.x + dy * dir.y) / l; if (sc > best) { best = sc; to = n; } }
      if (to && to === next && !isOpen(i + 1)) { to = undefined; snd.deny(); this.sub.setText('Finish this one first!'); }
    }
    if (to) {
      const dest = to;
      this.moving = true; snd.move(); this.ring.setVisible(false);
      // trails are drawn from the earlier node (or the parent) to the later one; walk the same curve either way
      const fwd = dest.parent ? true : cur.parent ? false : LEVELS.indexOf(dest) > i;
      const a = cur.map, b = dest.map, dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      this.marker.setFlipX(b.x < a.x);
      const o = { t: 0 };
      this.tweens.add({
        targets: o, t: 1, duration: Math.min(2200, 260 + dist * 7), ease: 'Sine.easeInOut',
        onUpdate: () => { if (this.time.now - this.lastStep > 190) { this.lastStep = this.time.now; snd.step(); } const p = fwd ? arc(a, b, o.t) : arc(b, a, 1 - o.t); this.marker.setPosition(p.x, p.y - 5).setTexture(this.pre + 'peterw' + (Math.floor(this.time.now / 90) % 6)); },
        onComplete: () => { this.marker.setTexture(this.pre + 'peter0'); this.cur = dest; this.moving = false; save.at = dest.id; persist(); this.ring.setVisible(true); this.refresh(); },
      });
    } else if (just('b') || just('a')) {
      snd.select(); openLevel(this, this.cur);
    }
  }
}
