import Phaser from 'phaser';
import { W, H, T, held, just, finish, img, fix, panel, who, hero, HX } from '../core';
import { D, S, Fit } from '../art';
import { CHARACTERS } from '../content';
import type { LevelDef } from '../content';
import { snd, music, stopLoops, loop, Loop } from '../audio';

const TS = 16;
const AUTO = new URLSearchParams(location.search).has('auto');
interface Way { x: number; top: number; x0: number; x1: number }
interface Foe { o: Phaser.Physics.Arcade.Image; kind: string; x0: number; x1: number; dir: number; speed: number; alive: boolean; t: number; baseY: number; vx?: number; charging?: boolean; extra?: Phaser.GameObjects.Image }
const SPEED: Record<string, number> = { scooter: 85, drawerbot: 22, ram: 28, redtape: 44, gull: 55, bear: 24 };
const HURT: Record<string, string> = { scooter: 'Run over by your own scooter!', drawerbot: 'Chomped by a DishDrawer!', ram: 'Rammed!', gull: 'Pecked!', redtape: 'Tangled in red tape!', bear: 'Mauled by a bear market!' };
const POWER: Record<string, { name: string; secs: number; tip: string }> = {
  J: { name: 'JET PACK', secs: 7, tip: 'Jet pack! Hold SPACE to fly' },
  S: { name: 'SUIT + HELMET', secs: 7, tip: 'Suited up: nothing can touch you' },
  H: { name: 'HARD HAT + HI-VIS', secs: 7, tip: 'Site safe: nothing can touch you' },
  B: { name: 'GUMBOOTS', secs: 9, tip: 'Gumboots! Faster, and SPACE again in mid-air' },
  C: { name: 'RUNNING MATE', secs: 11, tip: 'joins you and clears the way' }, // a companion: see `buddy`
};
/** What changes from one platform setting to the next. */
const THEMES: Record<string, { music: string; amb: 'hiss' | 'sea'; layers: [string, number][]; tiles: string; goal: string; egg: string; young?: boolean; pit: string; drop: [string, string, string]; title: string; text: (secs: string) => string }> = {
  workshop: { music: 'workshop', amb: 'hiss', layers: [['bg_workshop', 760]], tiles: 'workshop', goal: 'bike', egg: 'waterrocket', young: true, pit: 'Mind the service pit!', drop: ['welder', 'spark', 'Welding sparks!'], title: 'Rocket bike: assembled', text: (t) => `All five parts in ${t} s. The bike screams off down Princes Street on hydrogen peroxide.` },
  mahia: { music: 'mahia', amb: 'sea', layers: [['bg_mahia_far', 520], ['bg_mahia_mid', 760]], tiles: 'mahia', goal: 'pad_empty', egg: 'gnome', pit: 'Splash!', drop: ['welder', 'spark', 'Sparks!'], title: 'Pad hardware delivered', text: (t) => `Everything reached the tip of the peninsula in ${t} s. Launch Complex 1 can open.` },
  listing: { music: 'heli', amb: 'hiss', layers: [['bg_listing', 760]], tiles: 'workshop', goal: 'bell', egg: 'blender', pit: 'Fell into a funding gap!', drop: ['tickerbox', 'candle', 'Hit by a red candle!'], title: 'RKLB is trading', text: (t) => `The whole listing delivered in ${t} s. Peter Beck rings the opening bell by video link, and VACQ becomes RKLB.` },
};
const BOP: Record<string, string> = { scooter: 'Scooter: kill switch hit', drawerbot: 'Drawer shut', ram: 'Ram sent packing', gull: 'Shoo!', redtape: 'Red tape cut', bear: 'Bear squeezed' };
export class PlatformScene extends Phaser.Scene {
  def!: LevelDef; p: any; me!: Phaser.Physics.Arcade.Sprite; solids!: Phaser.Physics.Arcade.StaticGroup;
  amb?: Loop; jet?: Loop; power: Fit | 'C' = ''; buddy?: Phaser.GameObjects.Image; buddyPre = ''; powerT = 0; powerMax = 1; dbl = false; secret = false; pwHud!: Phaser.GameObjects.Graphics; pwIcon!: Phaser.GameObjects.Image; pwText!: Phaser.GameObjects.Text; jetFx?: Phaser.GameObjects.Particles.ParticleEmitter; wasDown = true; inv = 0; bopped = 0; foes: Foe[] = []; droppers: { x: number; t: number; gy: number; live: Phaser.Physics.Arcade.Image[] }[] = []; pre = ''; got = 0; egg = false; hud!: Phaser.GameObjects.Text; msg!: Phaser.GameObjects.Text; safe = { x: 24, y: 100 }; done = false; stun = 0; t0 = 0; falls = 0;
  constructor() { super('Platform'); }
  init(d: { def: LevelDef }) { this.def = d.def; this.p = d.def.params; this.got = 0; this.egg = false; this.done = false; this.stun = 0; this.falls = 0; this.safe = { x: 24, y: 100 }; this.sheepList = []; this.foes = []; this.droppers = []; this.inv = 0; this.bopped = 0; this.hits = []; this.botWait = 0; this.power = ''; this.powerT = 0; this.dbl = false; this.secret = false; this.buddy = undefined; }
  create() {
    const p = this.p, LW = p.width * TS, th = p.theme as string;
    const TH = THEMES[th], tl = TH.tiles;
    const me = hero(this.def, !!TH.young), pre = (this.pre = me.pre); // Peter is the 1990s apprentice in the workshop; a level's own lead comes as they are
    this.t0 = this.time.now;
    stopLoops(); music.play(TH.music);
    this.amb = loop(TH.amb); if (TH.amb === 'sea') this.amb.set(0.7);
    this.physics.world.setBounds(0, -200, LW, H + 400);
    this.cameras.main.setZoom(D).setBounds(0, 0, LW, H);
    // far backdrop with slow parallax; a scroll factor f needs an offset of HX * (1 - f) under the zoomed camera
    // a layer w units wide scrolls just fast enough to show all of itself over the level; factor f needs an offset of HX * (1 - f)
    const layer = (key: string, w: number, depth: number) => { const f = (w - W) / (LW - W); return img(this, HX * (1 - f), 0, key).setOrigin(0).setScrollFactor(f, 1).setDepth(depth); };
    TH.layers.forEach(([key, w], i) => layer(key, w, -10 + i));
    if (th === 'mahia') for (let i = 0; i < 5; i++) { const c = img(this, HX * 0.65 + 60 + i * 150, 22 + (i % 3) * 12, 'cloud' + (1 + (i % 3))).setScrollFactor(0.35, 1).setAlpha(0.9).setDepth(-9.5); this.tweens.add({ targets: c, x: c.x + 30, duration: 20000 + i * 4000, yoyo: true, repeat: -1 }); }
    this.solids = this.physics.add.staticGroup();
    for (const [x0, x1, row] of p.ground as number[][])
      for (let x = x0; x <= x1; x++) for (let y = row; y < 12; y++)
        (this.solids.create(x * TS + 8, y * TS + 8, y > row ? `t_${tl}_fill` : 't_' + tl) as Phaser.Physics.Arcade.Image).setScale(S).refreshBody();
    for (const [x, row, w] of p.plats as number[][]) for (let i = 0; i < w; i++)
      (this.solids.create((x + i) * TS + 8, row * TS + 3, 'p_' + tl) as Phaser.Physics.Arcade.Image).setScale(S).refreshBody();
    const groundRow = (tx: number) => (p.ground as number[][]).find(([a, b]) => tx >= a && tx <= b)?.[2] ?? 9;
    const board = (x: number, y: number, a: string, b?: string, strike = false) => {
      img(this, x, y, 'sign').setOrigin(0.5, 1).setDepth(1);
      T(this, x, y - 26.4, a, '#ffffff', b ? 4.6 : 5.6, '700').setOrigin(0.5, 0).setDepth(1); if (b) T(this, x, y - 21, b, '#ffe98a', 4.2).setOrigin(0.5, 0).setDepth(1);
      if (strike) this.add.rectangle(x, y - 22.4, 44, 1.2, 0xd8452e).setAngle(-14).setDepth(1);
    };
    for (const [tx, kind] of p.signs as [number, string][]) {
      const x = tx * TS + 8, y = groundRow(tx) * TS;
      if (kind === 'sign') board(x, y, 'ONENUI STATION', 'Launch Complex 1 →');
      else if (kind === 'sign2') board(x, y, 'WAIROA', 'Māhia Peninsula →');
      else if (kind === 'sign3') board(x, y, 'KAITORETE SPIT', 'launch site: on hold', true);
      else if (kind === 'princes') board(x, y, 'PRINCES ST');
      else {
        const s = img(this, x, y, kind).setOrigin(0.5, 1).setDepth(1);
        if (kind === 'jetpack') s.y -= 22;
        if (kind === 'washer') T(this, x, y - 32, 'DISHDRAWER', '#aab2c0', 4, '700').setOrigin(0.5, 0);
      }
    }
    // goal
    const gx = p.goal * TS, gy = groundRow(p.goal) * TS;
    const goal = img(this, gx, gy, TH.goal).setOrigin(0.5, 1).setDepth(2);
    const goalZone = this.add.zone(gx, gy - 16, 20, 32); this.physics.add.existing(goalZone, true);
    // player
    this.me = this.physics.add.sprite(24, 100, pre + 'peter0').setScale(S).setDepth(5);
    this.me.setSize(8 * D, 23 * D).setOffset(8 * D, 10.5 * D).setCollideWorldBounds(true).setAngle(0);
    for (const fit of ['', 'S', 'J', 'H', 'B']) if (this.textures.exists(pre + fit + 'peterw0') && !this.anims.exists(pre + fit + 'walk')) this.anims.create({ key: pre + fit + 'walk', frames: [0, 1, 2, 3, 4, 5].map((i) => ({ key: pre + fit + 'peterw' + i })), frameRate: 12, repeat: -1 });
    this.physics.add.collider(this.me, this.solids);
    this.cameras.main.startFollow(this.me, false, 0.12, 0.12, -40, 20);
    // parts
    for (const [tx, ty, name] of p.parts as [number, number, string][]) {
      const it = this.physics.add.staticImage(tx * TS + 8, ty * TS + 8, 'part').setScale(S).refreshBody();
      this.tweens.add({ targets: it, y: it.y - 3, angle: 20, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.physics.add.overlap(this.me, it, () => { this.burst(it.x, it.y, 0xffe98a); it.destroy(); this.got++; snd.pickup(); this.say(name + '!'); this.refresh(); });
    }
    // easter egg
    const e = this.physics.add.staticImage(p.egg[0] * TS + 8, p.egg[1] * TS + 8, TH.egg).setScale(S).refreshBody();
    this.physics.add.overlap(this.me, e, () => { this.burst(e.x, e.y, 0xffffff); e.destroy(); this.egg = true; snd.egg(); this.say('Easter egg!'); });
    // power-ups and the hidden blueprint
    for (const [code, tx, ty] of (p.powerups || []) as [Fit | 'C', number, number][]) {
      const it = this.physics.add.staticImage(tx * TS + 8, ty * TS + 8, 'pw_' + code).setScale(S).refreshBody().setDepth(3);
      this.tweens.add({ targets: it, y: it.y - 3, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.physics.add.overlap(this.me, it, () => { this.burst(it.x, it.y, 0x9fe6ff); it.destroy(); this.givePower(code); });
    }
    if (p.secret) {
      const sc = this.physics.add.staticImage(p.secret[0] * TS + 8, p.secret[1] * TS + 8, 'secret').setScale(S).refreshBody().setDepth(3);
      this.tweens.add({ targets: sc, angle: 12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.physics.add.overlap(this.me, sc, () => { this.burst(sc.x, sc.y, 0xffe98a); this.burst(sc.x, sc.y, 0x9fe6ff); sc.destroy(); this.secret = true; snd.secret(); this.say('Blueprint found! Secret unlocked'); });
    }
    this.jetFx = this.add.particles(0, 0, 'puff', { speedY: { min: 60, max: 110 }, speedX: { min: -8, max: 8 }, lifespan: 260, scale: { start: S * 0.3, end: S * 0.05 }, color: [0xffffff, 0xffd27a, 0xff6b2c], alpha: { start: 1, end: 0 }, blendMode: 'ADD', frequency: 14, emitting: false }).setDepth(4);
    // hazards and sheep
    for (const tx of p.hazards as number[]) {
      const x = tx * TS + 8, y = groundRow(tx) * TS;
      const s = this.physics.add.staticImage(x, y - 4, 'vent').setScale(S).refreshBody(); (s.body as Phaser.Physics.Arcade.StaticBody).setSize(8, 14);
      this.add.particles(x, y - 6, 'puff', { speedY: { min: -46, max: -26 }, speedX: { min: -5, max: 5 }, lifespan: 520, scale: { start: S * 0.35, end: S * 1.1 }, alpha: { start: 0.75, end: 0 }, frequency: 45 }).setDepth(3);
      this.physics.add.overlap(this.me, s, () => { if (this.inv <= 0 && !this.tough()) this.respawn('Steam burn!'); });
    }
    for (const tx of p.sheep as number[]) {
      const s = this.physics.add.image(tx * TS, groundRow(tx) * TS - 8.5, 'sheep').setScale(S).setDepth(4); this.sheepList.push(s); (s.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      this.tweens.add({ targets: s, x: s.x + 40, duration: 1800, yoyo: true, repeat: -1, onYoyo: () => s.setFlipX(true), onRepeat: () => s.setFlipX(false) });
      this.tweens.add({ targets: s, y: s.y - 1.2, duration: 180, yoyo: true, repeat: -1 });
      this.physics.add.overlap(this.me, s, () => { if (this.stun > 0 || this.tough()) return; this.stun = 0.5; this.me.setVelocity(this.me.x < s.x ? -150 : 150, -160); snd.baa(); this.say('Baa!'); });
    }
    for (const [kind, a, b] of (p.enemies || []) as [string, number, number][]) this.spawn(kind, a, b, groundRow(a) * TS);
    this.physics.add.overlap(this.me, goalZone, () => {
      if (this.done) return;
      if (this.got < p.parts.length) { this.say(`${p.parts.length - this.got} part(s) still missing`); return; }
      this.done = true; this.me.setVelocity(0, 0); (this.me.body as Phaser.Physics.Arcade.Body).setAllowGravity(false); this.me.anims.stop();
      if (th === 'workshop') snd.bikeGo();
      if (th === 'workshop') { // he rode it lying low along the frame
        this.me.setTexture(this.pre + (this.textures.exists(this.pre + 'Speter0') ? 'S' : '') + 'peter0').setPosition(goal.x - 2, goal.y - 20).setAngle(78).setFlipX(false).setDepth(3);
        const fl = this.add.particles(goal.x - 22, goal.y - 12, 'puff', { speedX: { min: -160, max: -90 }, speedY: { min: -8, max: 8 }, lifespan: 380, scale: { start: S * 0.6, end: S * 0.1 }, color: [0xffffff, 0xcfe6ff, 0x8fb8ff], alpha: { start: 0.9, end: 0 }, blendMode: 'ADD', frequency: 12 }).setDepth(2);
        this.tweens.add({ targets: [goal, this.me, fl], x: '+=300', duration: 1300, ease: 'Quad.easeIn' });
      } else { this.burst(goal.x, goal.y - 50, 0xffe98a); if (th === 'listing') { // the bell was rung virtually: Peter appears on a screen above it
          snd.egg(); this.tweens.add({ targets: goal, angle: 5, duration: 90, yoyo: true, repeat: 5 });
          const live = [panel(this, goal.x - 37, goal.y - 104, 74, 34, 0.92).setDepth(6), img(this, goal.x - 22, goal.y - 87, 'peter_chip').setScale(S * 0.9).setDepth(7), T(this, goal.x - 6, goal.y - 99, '● LIVE', '#ff6a50', 4.6, '700').setDepth(7), T(this, goal.x - 6, goal.y - 92, 'PETER BECK', '#ffffff', 6, '700').setDepth(7), T(this, goal.x - 6, goal.y - 83.6, 'by video link', '#ffe98a', 4.8).setDepth(7)];
          live.forEach((o) => o.setAlpha(0)); this.tweens.add({ targets: live, alpha: 1, duration: 200 });
        } }
      const secs = (this.time.now - this.t0) / 1000;
      const stars = this.falls === 0 && secs < 75 ? 3 : this.falls <= 2 ? 2 : 1;
      this.time.delayedCall(1400, () => finish(this, this.def, {
        success: true, stars, egg: this.egg, secret: this.secret,
        title: TH.title, text: TH.text(secs.toFixed(0)) + (this.bopped ? ` Troublemakers seen off: ${this.bopped}.` : ''),
      }));
    });
    fix(panel(this, 4, 4, 150, 14)).setDepth(10);
    this.hud = fix(T(this, 9, 6.5, '', '#ffffff', 7, '700')).setDepth(11);
    this.msg = fix(T(this, W / 2, 34, '', '#ffe98a', 10, '700')).setOrigin(0.5).setDepth(11).setShadow(0, 1, '#000000', 3);
    who(this, this.def, W - 104, 4, !!TH.young, fix);
    this.pwHud = fix(this.add.graphics()).setDepth(10); this.pwIcon = fix(img(this, 13, 30, 'pw_J')).setScale(S * 0.9).setDepth(11).setVisible(false); this.pwText = fix(T(this, 23, 22.6, '', '#bfe9ff', 5.6, '700')).setDepth(11);
    this.jet = loop('hiss');
    this.plan();
    this.refresh();
  }
  /** Waypoints for the ?auto=1 bot: every pickup in order (via a stepping-stone platform where needed), then the goal. */
  ways: Way[] = [];
  plan() {
    const p = this.p, groundAt = (tx: number) => (p.ground as number[][]).find(([a, b]) => tx >= a && tx <= b);
    const out: Way[] = [];
    const add = (tx: number, ty: number) => {
      const g = groundAt(tx), plat = (p.plats as number[][]).find(([x, row, w]) => tx >= x && tx < x + w && (row === ty + 1 || row === ty + 2));
      if (plat) {
        const [x, row, w] = plat;
        if (g && g[2] - row > 2) { const mid = (p.plats as number[][]).find(([mx, mrow, mw]) => mrow === row + 2 && Math.abs(mx + mw / 2 - tx) < 6); if (mid) out.push({ x: (mid[0] + mid[2] / 2) * TS, top: mid[1] * TS, x0: mid[0] * TS, x1: (mid[0] + mid[2]) * TS }); }
        out.push({ x: tx * TS + 8, top: row * TS, x0: x * TS, x1: (x + w) * TS });
      } else if (g) out.push({ x: tx * TS + 8, top: g[2] * TS, x0: g[0] * TS, x1: (g[1] + 1) * TS });
    };
    [...(p.parts as number[][]), p.egg as number[]].sort((a, b) => a[0] - b[0]).forEach(([tx, ty]) => add(tx, ty));
    const gg = groundAt(p.goal)!; out.push({ x: p.goal * TS, top: gg[2] * TS, x0: gg[0] * TS, x1: (gg[1] + 1) * TS });
    this.ways = out;
  }
  bot(): { dir: number; jump: boolean } {
    const b = this.me.body as Phaser.Physics.Arcade.Body, p = this.p, x = this.me.x, feet = b.bottom;
    let w = this.ways[0];
    if (!w) return { dir: 0, jump: false };
    if (Math.abs(x - w.x) < 5 && Math.abs(feet - w.top) < 4 && b.blocked.down && this.ways.length > 1) { this.ways.shift(); w = this.ways[0]; }
    let dir = Math.abs(w.x - x) < 2 ? 0 : Math.sign(w.x - x), jump = false;
    const d = dir || 1, groundAt = (px: number) => (p.ground as number[][]).find(([a, bb]) => px >= a * TS && px < (bb + 1) * TS);
    const here = groundAt(x), ahead = groundAt(x + d * 10);
    const onGround = !!here && Math.abs(feet - here[2] * TS) < 3;
    if (w.top < feet - 10 && b.blocked.down) { // the waypoint is above: take off a little before its near edge, backing up if too close
      const edge = d > 0 ? w.x0 : w.x1, dist = (edge - x) * d;
      if (dist <= 26 && dist >= 12) jump = true; else if (dist < 12) dir = -d;
    }
    const up = jump; // heading for a platform above
    let forced = false, avoid = false;
    if ((p.hazards as number[]).some((h) => { const k = (h * TS + 8 - x) * d; return k > 4 && k < 22; })) avoid = true;
    if (onGround && (!ahead || ahead[2] < here![2])) forced = true; // pit or step up
    if (!onGround && b.blocked.down && !ahead) forced = true; // on a ledge or lip with nothing but a pit ahead
    if (!onGround && b.blocked.down) { // about to step off a platform: jump clear if a vent sits in the landing zone
      const plat = (p.plats as number[][]).find(([px, row, pw]) => Math.abs(row * TS - feet) < 4 && x >= px * TS - 4 && x <= (px + pw) * TS + 4);
      const off = plat && (d > 0 ? x + 8 > (plat[0] + plat[2]) * TS : x - 8 < plat[0] * TS);
      if (off && (p.hazards as number[]).some((h) => { const k = (h * TS + 8 - x) * d; return k > 0 && k < 75; })) forced = true;
    }
    // ground enemies: take off early enough to be at full height over them, later for slow ones, sooner for fast ones
    const walkers = [...this.sheepList.map((o) => ({ x: o.x, y: o.y, vx: 0, hw: 10, slow: false })), ...this.foes.filter((f) => f.alive && f.kind !== 'gull').map((f) => ({ x: f.o.x, y: f.o.y, vx: f.vx || 0, hw: f.o.displayWidth * 0.4, slow: f.kind === 'drawerbot' || f.kind === 'redtape' || f.kind === 'bear' }))];
    for (const e of walkers) {
      const k = (e.x - x) * d; if (k < 0 || Math.abs(e.y - feet) > 26) continue;
      const vc = 95 - e.vx * d; // closing speed
      if (e.slow && Math.abs(k - 0.79 * vc) < 4) { avoid = true; continue; } // slow ones: time the jump to come down on top of them
      if (vc < 30) { if (k < 26) avoid = true; } else if (k > 0.13 * vc + e.hw + 2 && k < Math.max(0.3 * vc + e.hw + 6, 0.55 * vc - e.hw)) avoid = true;
    }
    // an optional hop (over a vent or an enemy) must not end in a pit
    if (avoid && !(groundAt(x + d * 66) && groundAt(x + d * 84))) avoid = false;
    jump = up || forced || avoid;
    if (b.blocked.down) {
      // never jump up into a gull, and never walk under a falling spark; give up waiting on a gull after a while
      const gull = jump && this.foes.some((f) => { const k = (f.o.x - x) * d; return f.alive && f.kind === 'gull' && k > -18 && k < (f.dir * d < 0 ? 150 : 104); }); // wait until it is behind, or well ahead and flying away
      const spark = this.droppers.some((dr) => { const k = (dr.x - x) * d; return k > 2 && k < (jump ? 92 : 40) && (dr.live.length > 0 || dr.t > 0.75); });
      if ((gull && this.botWait < 8) || spark) { dir = 0; jump = false; this.botWait += this.game.loop.delta / 1000; } else if (!gull) this.botWait = 0;
    }
    return { dir, jump: jump && b.blocked.down };
  }
  sheepList: Phaser.GameObjects.Image[] = []; hits: string[] = []; botWait = 0;
  burst(x: number, y: number, tint: number) {
    const e = this.add.particles(x, y, 'puff', { speed: { min: 20, max: 70 }, lifespan: 420, scale: { start: S * 0.35, end: 0 }, tint, blendMode: 'ADD', emitting: false }).setDepth(6);
    e.explode(14); this.time.delayedCall(600, () => e.destroy());
  }
  say(s: string) { this.msg.setText(s).setAlpha(1); this.tweens.killTweensOf(this.msg); this.tweens.add({ targets: this.msg, alpha: 0, delay: 1100, duration: 400 }); }
  refresh() { this.hud.setText(`PARTS ${this.got}/${this.p.parts.length}   ${this.def.title.toUpperCase()}`); }
  /** Power-ups change how Peter looks and what he can do, for a few seconds. */
  tough() { return this.power === 'S' || this.power === 'H'; }
  givePower(code: Fit | 'C') {
    const pw = POWER[code]; this.power = code; this.powerT = this.powerMax = pw.secs; this.dbl = false;
    const mate = code === 'C' ? CHARACTERS.find((c) => c.id === this.p.buddy) || CHARACTERS[0] : undefined;
    this.buddy?.destroy(); this.buddy = undefined;
    if (mate) { // someone from the story runs just ahead of you for a while
      this.buddyPre = mate.pre; this.buddy = img(this, this.me.x, this.me.y, mate.pre + 'peter0').setDepth(5).setAlpha(0);
      this.tweens.add({ targets: this.buddy, alpha: 1, duration: 200 }); this.burst(this.me.x, this.me.y, 0xffffff);
    }
    snd.power(); this.say(mate ? `${mate.name} ${pw.tip}` : pw.tip); this.pwIcon.setTexture('pw_' + code).setVisible(true); this.pwText.setText(mate ? mate.name.toUpperCase() : pw.name);
    this.cameras.main.flash(120, 160, 230, 255);
  }
  powerStep(dt: number, b: Phaser.Physics.Arcade.Body) {
    const g = this.pwHud; g.clear();
    if (!this.power) { this.jetFx!.emitting = false; this.jet?.set(0); return; }
    this.powerT -= dt;
    if (this.buddy) { // the running mate keeps a few steps ahead, copies your stride, and sees off whatever he reaches
      const bd = this.buddy, ahead = this.me.x + (this.me.flipX ? -26 : 26), moving = Math.abs(b.velocity.x) > 5;
      bd.x += (ahead - bd.x) * Math.min(1, dt * 7); bd.y += (this.me.y - bd.y) * Math.min(1, dt * 14); bd.setFlipX(this.me.flipX);
      bd.setTexture(this.buddyPre + (!b.blocked.down ? 'peterj' : moving ? 'peterw' + (Math.floor(this.time.now / 85) % 6) : 'peter0')).setAlpha(this.powerT < 1.5 && Math.floor(this.time.now / 120) % 2 ? 0.4 : 1);
      for (const f of this.foes) if (f.alive && Math.abs(f.o.x - bd.x) < 15 && Math.abs(f.o.y - bd.y) < 26) this.bop(f, false);
    }
    const flying = this.power === 'J' && (held('a') || held('up')) && !b.blocked.down;
    if (flying) this.me.setVelocityY(this.me.y < 30 ? Math.max(b.velocity.y, 0) : Math.max(b.velocity.y - 1500 * dt, -135)); // stays under the roof
    this.jetFx!.emitting = flying; this.jetFx!.setPosition(this.me.x - (this.me.flipX ? -3 : 3), this.me.y + 9); this.jet?.set(flying ? 1 : 0);
    if (this.power === 'B' && !b.blocked.down && Math.random() < 0.2) this.burst(this.me.x, this.me.y + 14, 0xd9cfb4);
    g.fillStyle(0x0b0e18, 0.8).fillRoundedRect(4, 20, 96, 20, 3); g.lineStyle(0.5, 0x9fe6ff, 0.6).strokeRoundedRect(4, 20, 96, 20, 3);
    g.fillStyle(0x000000, 0.5).fillRoundedRect(23, 31.5, 72, 4, 2); const w = 72 * Math.max(0, this.powerT / this.powerMax); if (w > 1) g.fillStyle(this.powerT < 2 ? 0xff7a5c : 0x7fd0ff).fillRoundedRect(23, 31.5, Math.max(4, w), 4, 2);
    if (this.powerT <= 0) { this.power = ''; this.buddy?.destroy(); this.buddy = undefined; this.pwIcon.setVisible(false); this.pwText.setText(''); g.clear(); snd.powerEnd(); this.say('Power-up worn off'); this.jetFx!.emitting = false; this.jet?.set(0); }
  }
  /** Enemies. Jumping on one from above sees it off; touching it any other way costs a retry from the last safe spot. */
  spawn(kind: string, a: number, b: number, gy: number) {
    const x0 = a * TS + 8, x1 = b * TS + 8;
    if (kind === 'sparks' || kind === 'candles') { img(this, x0, 19, THEMES[this.p.theme].drop[0]).setOrigin(0.5, 0).setDepth(1); this.droppers.push({ x: x0 + 1, t: Math.random(), gy, live: [] }); return; }
    const o = this.physics.add.image(x0, 0, kind === 'drawerbot' ? 'drawerbot0' : kind === 'gull' ? 'gull0' : kind).setScale(S).setDepth(4);
    const body = o.body as Phaser.Physics.Arcade.Body; body.setAllowGravity(false); body.setSize(o.width * 0.76, o.height * 0.8);
    const baseY = kind === 'gull' ? gy - 49 : gy - o.displayHeight / 2; // gulls skim just over your head: only a jump brings you into them
    o.y = baseY;
    const foe: Foe = { o, kind, x0, x1, dir: 1, speed: SPEED[kind], alive: true, t: Math.random() * 3, baseY };
    if (kind === 'redtape') foe.extra = img(this, x0, gy - 3, 'tapetail').setDepth(3);
    if (kind === 'scooter') foe.extra = img(this, x0, baseY, 'puff').setScale(S * 0.5, S * 0.3).setTint(0xcfe6ff).setBlendMode('ADD').setDepth(3);
    this.foes.push(foe);
    this.physics.add.overlap(this.me, o, () => this.touch(foe));
  }
  touch(f: Foe) {
    if (!f.alive || this.done) return;
    const b = this.me.body as Phaser.Physics.Arcade.Body;
    const stomp = b.velocity.y > 50 && b.bottom < f.o.y + 3;
    if (stomp || this.tough()) this.bop(f, stomp); // landed on it, or wearing protection
    else if (this.inv <= 0) { if (f.kind === 'gull') snd.squawk(); this.respawn(HURT[f.kind]); }
  }
  bop(f: Foe, bounce: boolean) {
    f.alive = false; this.bopped++; if (bounce) this.me.setVelocityY(-215); snd.stomp(); this.burst(f.o.x, f.o.y, 0xffffff); this.say(BOP[f.kind]); f.extra?.destroy();
    this.tweens.add({ targets: f.o, scaleY: S * 0.25, y: f.o.y + f.o.displayHeight * 0.35, alpha: 0, duration: 280, onComplete: () => f.o.destroy() });
  }
  foeStep(dt: number) {
    for (const f of this.foes) {
      if (!f.alive) continue;
      f.t += dt;
      let sp = f.speed;
      if (f.kind === 'ram') { // lowers its head and charges when you are in front of it
        const dx = this.me.x - f.o.x, charge = Math.abs(dx) < 72 && Math.sign(dx) === f.dir && Math.abs(this.me.y - f.o.y) < 30;
        if (charge) { sp = 105; if (!f.charging) snd.snort(); } f.charging = charge;
      }
      f.o.x += f.dir * sp * dt; f.vx = f.dir * sp;
      if (f.o.x > f.x1) { f.o.x = f.x1; f.dir = -1; } else if (f.o.x < f.x0) { f.o.x = f.x0; f.dir = 1; }
      f.o.setFlipX(f.dir < 0);
      if (f.kind === 'gull') { f.o.y = f.baseY + Math.sin(f.t * 2.4) * 18; f.o.setTexture('gull' + (Math.floor(f.t * 7) % 2)); }
      else if (f.kind === 'drawerbot') { f.o.setTexture('drawerbot' + (Math.floor(f.t * 2.6) % 2)); f.o.y = f.baseY - Math.abs(Math.sin(f.t * 5.2)) * 2; }
      else if (f.kind === 'redtape') { f.o.rotation += (f.dir * sp * dt) / 6.6; f.extra!.setPosition(f.o.x - f.dir * 14, f.baseY + 5).setFlipX(f.dir < 0); }
      else if (f.kind === 'scooter') { f.o.y = f.baseY + Math.sin(f.t * 30) * 0.3; f.extra!.setPosition(f.o.x - f.dir * 18, f.baseY + 0.5).setAlpha(0.6 + Math.random() * 0.4); }
      else if (f.kind === 'bear') f.o.y = f.baseY - Math.abs(Math.sin(f.t * 6)) * 1.2;
      else if (f.kind === 'ram') f.o.y = f.baseY - (f.charging ? Math.abs(Math.sin(f.t * 14)) * 1.5 : 0);
    }
    for (const d of this.droppers) { // welding arms shed a spark every second and a half
      d.t += dt;
      if (d.t > 1.5) {
        d.t = 0;
        const drop = THEMES[this.p.theme].drop;
        const s = this.physics.add.image(d.x, 50, drop[1]).setScale(S).setDepth(4).setBlendMode(drop[1] === 'spark' ? 'ADD' : 'NORMAL'); d.live.push(s);
        if (Math.abs(d.x - this.me.x) < 130) snd.sizzle();
        this.physics.add.overlap(this.me, s, () => { if (this.inv <= 0 && !this.done && !this.tough()) this.respawn(drop[2]); });
      }
      d.live = d.live.filter((s) => { if (s.y < d.gy - 3) return true; this.burst(s.x, d.gy - 2, 0xffb347); s.destroy(); return false; });
    }
  }
  respawn(why: string) {
    if (this.done) return;
    this.inv = 1.6; this.hits.push(why + '@' + Math.round(this.me.x));
    this.falls++; if (why === 'Splash!') snd.splash(); else snd.hurt(); this.say(why);
    this.me.setPosition(this.safe.x, this.safe.y - 4).setVelocity(0, 0); this.cameras.main.flash(150, 255, 255, 255);
  }
  update(_t: number, dms: number) {
    if (this.done) return;
    const b = this.me.body as Phaser.Physics.Arcade.Body;
    this.stun = Math.max(0, this.stun - dms / 1000);
    this.inv = Math.max(0, this.inv - dms / 1000); this.me.setAlpha(this.inv > 0 && Math.floor(this.time.now / 80) % 2 ? 0.35 : 1);
    this.foeStep(Math.min(0.05, dms / 1000));
    if (this.stun <= 0) {
      const bot = AUTO ? this.bot() : undefined;
      const dir = bot ? bot.dir : (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
      const look = this.pre + (this.power === 'C' || (this.powerT < 1.5 && Math.floor(this.time.now / 120) % 2) ? '' : this.power); // flickers back as it runs out
      this.me.setVelocityX(dir * 95 * (this.power === 'B' && !bot ? 1.45 : 1));
      if (dir) this.me.setFlipX(dir < 0);
      if ((bot ? bot.jump : just('a') || just('up')) && b.blocked.down) { this.me.setVelocityY(-245); snd.jump(); this.dbl = false; }
      else if (this.power === 'B' && !b.blocked.down && !this.dbl && (just('a') || just('up'))) { this.dbl = true; this.me.setVelocityY(-232); snd.jump(); this.burst(this.me.x, this.me.y + 12, 0xffffff); }
      if (!bot && !held('a') && !held('up') && b.velocity.y < -90) this.me.setVelocityY(-90); // variable jump height
      this.powerStep(Math.min(0.05, dms / 1000), b);
      if (!b.blocked.down) this.me.anims.stop(), this.me.setTexture(look + 'peterj');
      else if (dir) this.me.anims.play(look + 'walk', true);
      else this.me.anims.stop(), this.me.setTexture(look + 'peter0');
    }
    if (b.blocked.down && (b.velocity.x === 0 || Math.floor(this.me.x) % 24 === 0)) {
      // remember the last solid footing well away from pit edges
      const tx = Math.floor(this.me.x / TS);
      const span = (this.p.ground as number[][]).find(([a, bb]) => tx >= a + 1 && tx <= bb - 1);
      if (span && !(this.p.hazards as number[]).some((h) => Math.abs(h - tx) < 2)) this.safe = { x: this.me.x, y: this.me.y };
    }
    if (b.blocked.down && !this.wasDown) snd.land();
    this.wasDown = b.blocked.down;
    if (this.p.theme === 'workshop' && this.amb) { // steam hisses louder as you get close to a vent
      const near = Math.min(...(this.p.hazards as number[]).map((h) => Math.abs(h * TS + 8 - this.me.x)));
      this.amb.set(Math.max(0, 1 - near / 56) ** 2);
    }
    if (this.me.y > H + 30) this.respawn(THEMES[this.p.theme].pit);
  }
}
