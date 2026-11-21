import Phaser from 'phaser';
import { W, H, T, held, just, finish, cam, img, panel, who } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import { P, S } from '../art';
import type { LevelDef } from '../content';

const AUTO = new URLSearchParams(location.search).has('auto');
const G = 9.81, MACH = 300; // a round figure for the speed of sound in the upper air
const WALL = [55, 22]; // km: where the air bites
const DROGUE_V = 2 * MACH, MAIN_V = 110; // deploy limits, m/s
/** Drag terms (g over terminal speed squared at sea level): bare stage, under the drogue, under the main. */
const DRAG = [G / 85 ** 2, G / 60 ** 2, G / 9 ** 2];
const BX = 112, BY = 84; // where the booster sits on screen

/**
 * Return To Sender: bring Electron's first stage back through the atmosphere. Flip it engines-first with cold-gas
 * thrusters (no air up here, so nothing stops a turn but another puff), hold it through "the wall", then open the
 * drogue below Mach 2 and the main chute in the last few kilometres.
 */
export class SplashdownScene extends Phaser.Scene {
  def!: LevelDef; h = 78e3; v = 2150; th = 180; om = 4; gas = 1; dmg = 0; chute = 0; ripped = false; t = 0; ended = false; splashV = 0; lateFlip = false;
  boo!: Phaser.GameObjects.Container; stage!: Phaser.GameObjects.Image; canopy!: Phaser.GameObjects.Image; glow!: Phaser.GameObjects.Image; stars!: Phaser.GameObjects.Image; sky!: Phaser.GameObjects.Image; limb!: Phaser.GameObjects.Image; sea!: Phaser.GameObjects.Image; ship!: Phaser.GameObjects.Image;
  clouds: Phaser.GameObjects.Image[] = []; g!: Phaser.GameObjects.Graphics; tele!: Phaser.GameObjects.Text; call!: Phaser.GameObjects.Text; prompt!: Phaser.GameObjects.Text; puff!: Phaser.GameObjects.Particles.ParticleEmitter; plasma!: Phaser.GameObjects.Particles.ParticleEmitter;
  wind!: Loop; hiss!: Loop; said: Record<string, boolean> = {};
  constructor() { super('Splashdown'); }
  init(d: { def: LevelDef }) { this.def = d.def; this.h = 78e3; this.v = 2150; this.th = 180; this.om = Phaser.Math.Between(0, 1) ? 5 : -5; this.gas = 1; this.dmg = 0; this.chute = 0; this.ripped = false; this.t = 0; this.ended = false; this.clouds = []; this.said = {}; this.lateFlip = false; }
  create() {
    cam(this); stopLoops(); music.play('heli'); this.wind = loop('rumble'); this.hiss = loop('hiss');
    this.cameras.main.setBackgroundColor('#04050c');
    this.stars = img(this, 0, 0, 'stars').setOrigin(0);
    this.sky = img(this, 0, 0, 'sky_day').setOrigin(0).setAlpha(0);
    this.limb = img(this, W / 2, 96, 'earthlimb').setOrigin(0.5, 0);
    [[40, 1], [150, 2], [226, 3], [96, 3]].forEach(([x, k]) => this.clouds.push(img(this, x, -40, 'cloud' + k).setAlpha(0.95)));
    this.sea = img(this, 0, H + 40, 'sea').setOrigin(0); this.ship = img(this, W + 60, 0, 'ship').setScale(S * 0.8);
    // the kick stage carries on to orbit with thirty satellites and a gnome
    const ks = this.add.container(BX - 22, BY - 30, [img(this, 0, 0, 'curie').setScale(S * 1.2), img(this, 0.4, -4.6, 'gnome').setScale(S * 0.42)]);
    const kt = T(this, BX - 30, BY - 36, 'Stage 2, the kick stage,\nthe satellites and one gnome:\non their way to orbit', '#aab4d4', 4.4, '700').setOrigin(1, 0).setAlign('right');
    this.tweens.add({ targets: [ks, kt], y: '-=60', x: '-=40', alpha: 0, duration: 5200, ease: 'Quad.easeIn', onComplete: () => { ks.destroy(); kt.destroy(); } });
    this.glow = img(this, 0, 14, 'puff').setScale(S * 3.2, S * 4.4).setTint(0xff8a3c).setBlendMode('ADD').setAlpha(0);
    this.plasma = this.add.particles(0, 0, 'puff', { speedY: { min: -150, max: -90 }, speedX: { min: -16, max: 16 }, lifespan: 420, scale: { start: S * 0.7, end: S * 0.1 }, color: [0xffffff, 0xffd27a, 0xff6b2c], alpha: { start: 0.9, end: 0 }, blendMode: 'ADD', frequency: 16, emitting: false });
    this.canopy = img(this, 0, -30, 'chute').setOrigin(0.5, 1).setVisible(false);
    this.stage = img(this, 0, 0, 'electron_s1').setScale(S * 0.74);
    this.boo = this.add.container(BX, BY, [this.glow, this.canopy, this.stage]);
    this.puff = this.add.particles(0, 0, 'puff', { speed: { min: 30, max: 60 }, lifespan: 260, scale: { start: S * 0.3, end: 0 }, alpha: { start: 0.9, end: 0 }, emitting: false });
    panel(this, W - 108, 4, 104, 172, 0.86);
    T(this, W - 102, 7, 'STAGE 1 · COMING HOME', '#aab4d4', 4.8, '700');
    this.tele = T(this, W - 102, 15, '', '#ffffff', 6.2, '700');
    for (const [y, s] of [[54, 'ATTITUDE'], [104, 'RCS GAS'], [116, 'HEAT + LOAD'], [128, 'SPEED']] as [number, string][]) T(this, W - 102, y, s, '#aab4d4', 4.4, '700');
    T(this, W - 102, 150, 'ALTITUDE', '#aab4d4', 4.4, '700');
    this.g = this.add.graphics();
    this.prompt = T(this, BX, 26, '', '#ffffff', 8, '700').setOrigin(0.5).setShadow(0, 1, '#000000', 4).setAlign('center');
    this.call = T(this, BX, H - 10, 'Over the top of its arc · the booster is falling back', '#ffe98a', 6.6, '700').setOrigin(0.5).setShadow(0, 1, '#000000', 3);
    who(this, { ...this.def, role: this.def.role || 'CEO · in Mission Control' }, 4, 4);
  }
  say(k: string, s: string) { if (this.said[k]) return; this.said[k] = true; this.call.setText(s); }
  update(_t: number, dms: number) {
    if (this.ended) return;
    const dt = Math.min(0.05, dms / 1000); this.t += dt;
    const km = this.h / 1000, rho = Math.exp(-this.h / 7200), q = 0.5 * 1.225 * rho * this.v * this.v;
    const inWall = km < WALL[0] && km > WALL[1], air = Phaser.Math.Clamp(q / 9000, 0, 1); // how much the air has to say about it
    // ---- attitude: cold-gas thrusters, and the air once there is any
    let inp = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
    const err = Phaser.Math.Angle.WrapDegrees(this.th);
    if (AUTO) { const stop = (this.om * Math.abs(this.om)) / (2 * 62); inp = this.chute ? 0 : Math.abs(err + stop) < (air > 0.04 ? 9 : 1.5) && Math.abs(this.om) < (air > 0.04 ? 30 : 3) ? 0 : -Math.sign(err + stop); }
    if (this.gas <= 0 || this.chute) inp = 0;
    if (inp) { this.gas = Math.max(0, this.gas - dt / 7.5); if (Math.random() < 0.5) { const a = (this.th - 90) * Phaser.Math.DEG_TO_RAD; this.puff.emitParticleAt(BX + Math.cos(a) * 16 - inp * Math.sin(a) * 3, BY + Math.sin(a) * 16 + inp * Math.cos(a) * 3); } }
    this.hiss.set(inp ? 0.9 : 0);
    const upright = Math.abs(err) < 90; // engines-first is stable in the airflow; nose-first is stable too, and fatal
    const aero = this.chute ? -err * 6 - this.om * 5 : -(upright ? Math.sin(err * Phaser.Math.DEG_TO_RAD) : -Math.sin(err * Phaser.Math.DEG_TO_RAD)) * 190 * air - this.om * 1.8 * air + (Math.sin(this.t * 7.3) + Math.sin(this.t * 3.1 + 1)) * 26 * air;
    this.om += (inp * 62 + aero) * dt; this.th += this.om * dt;
    // ---- the fall: time is compressed, more so where nothing is happening
    const warp = this.chute === 2 ? (this.h > 250 ? 34 : 5) : this.chute === 1 ? 9 : km > WALL[0] ? 4 : 3, md = dt * warp;
    const sink = Phaser.Math.Clamp(0.36 + (60 - km) / 70, 0.36, 1);
    this.v = Math.max(3, this.v + (G * sink - DRAG[this.chute] * rho * this.v * this.v * (upright || this.chute ? 1 : 0.6)) * md);
    this.h -= this.v * sink * md;
    // ---- heat and load: flying it sideways or backwards through the wall is what breaks it
    const off = Math.abs(err);
    if (!this.chute) this.dmg += dt * air * (0.009 + (off > 12 ? ((off - 12) / 40) ** 2 * 0.9 : 0));
    if (km < WALL[0] && !this.lateFlip && off > 35) { this.lateFlip = true; this.call.setText('Into the wall sideways! Get the engines pointing down'); snd.alarm(); }
    // ---- parachutes
    const wantChute = AUTO ? (this.chute === 0 ? km < 24 && this.v < DROGUE_V - 25 : this.chute === 1 && this.v < MAIN_V - 8 && km < 6.5) : just('a');
    if (wantChute && !this.ripped) {
      if (this.chute === 0) {
        if (km > 30) snd.deny();
        else if (this.v > DROGUE_V) { this.ripped = true; snd.crash(); this.cameras.main.shake(250, 0.008); this.call.setText(`Drogue out at Mach ${(this.v / MACH).toFixed(1)}: torn away. It needed to be under Mach 2`); }
        else { this.chute = 1; snd.fairing(); this.canopy.setVisible(true).setScale(S * 0.3, S * 0.34).setPosition(0, -26); this.call.setText(`Drogue out at Mach ${(this.v / MACH).toFixed(1)} · ${km.toFixed(1)} km`); this.cameras.main.shake(120, 0.004); }
      } else if (this.chute === 1) {
        if (this.v > MAIN_V) { this.ripped = true; snd.crash(); this.cameras.main.shake(250, 0.008); this.call.setText(`Main chute out at ${this.v.toFixed(0)} m/s: shredded. Wait for ${MAIN_V} m/s`); }
        else { this.chute = 2; snd.fairing(); this.tweens.add({ targets: this.canopy, scaleX: S * 0.8, scaleY: S * 0.86, y: -22, duration: 500, ease: 'Back.easeOut' }); this.call.setText(`Main chute open at ${km.toFixed(1)} km`); this.cameras.main.shake(160, 0.005); }
      }
    }
    // ---- call-outs
    if (this.t > 2.2) this.say('flip', '← → fire the cold-gas thrusters: turn it engines-first before the air arrives');
    if (km < WALL[0] && !this.lateFlip) this.say('wall', 'Here comes the wall · hold it engines-first');
    if (this.v > 2300 || (km < 40 && this.said.wall)) this.say('peak', 'Peak heating · the air around the engines is hotter than 2,400 °C');
    if (km < WALL[1] && !this.chute) this.say('thru', 'Through the wall · slowing down');
    if (this.chute === 0 && !this.ripped && km < 30) this.prompt.setText(this.v <= DROGUE_V ? 'SPACE · DROGUE' : `drogue below Mach 2\nnow Mach ${(this.v / MACH).toFixed(1)}`).setColor(this.v <= DROGUE_V ? '#7cc56b' : '#ffffff');
    else if (this.chute === 1 && !this.ripped) this.prompt.setText(this.v <= MAIN_V ? 'SPACE · MAIN CHUTE' : `main chute below ${MAIN_V} m/s\nnow ${this.v.toFixed(0)} m/s`).setColor(this.v <= MAIN_V ? '#7cc56b' : '#ffffff');
    else this.prompt.setText('');
    this.draw(km, air, off);
    if (this.dmg >= 1) return this.lose('The stage broke up at the wall. It has to meet the air engines-first: finish the turn above 55 km, and keep correcting while the air shakes it.');
    if (this.h <= 0) return this.splash();
  }
  draw(km: number, air: number, off: number) {
    this.boo.setRotation(this.th * Phaser.Math.DEG_TO_RAD).setPosition(BX + (Math.random() - 0.5) * air * 1.6, BY + (Math.random() - 0.5) * air * 1.6);
    const day = Phaser.Math.Clamp((45 - km) / 30, 0, 1);
    this.sky.setAlpha(day); this.stars.setAlpha(1 - day * 0.9); this.limb.setY(96 + Math.max(0, 78 - km) * 0.5).setAlpha(Phaser.Math.Clamp((km - 14) / 10, 0, 1));
    this.clouds.forEach((c, i) => { const base = 2.2 + i * 2.6; c.y = BY + (km - base) * 46; c.setVisible(c.y > -30 && c.y < H + 30); });
    const seaY = 150 + Math.min(this.h, 1200) * 0.05; this.sea.setY(seaY); this.ship.setPosition(this.ship.x + (this.h < 900 ? (W - 96 - this.ship.x) * 0.02 : 0), seaY - 1);
    const hot = !this.chute && this.v > 900 ? air : 0;
    this.glow.setAlpha(hot * 0.85); this.plasma.emitting = hot > 0.25; this.plasma.setPosition(BX, BY + 16);
    this.wind.set(Math.min(1, air * 0.9 + (this.chute ? 0.15 : 0)), 0.3 + air * 0.6);
    this.tele.setText(`ALT   ${km >= 10 ? km.toFixed(0) : km.toFixed(1)} km\nSPEED ${this.v >= 100 ? Math.round(this.v / 10) * 10 : this.v.toFixed(0)} m/s\nMACH  ${(this.v / MACH).toFixed(1)}\n${this.chute === 2 ? 'UNDER MAIN CHUTE' : this.chute === 1 ? 'UNDER DROGUE' : km > WALL[0] ? 'COASTING · NO AIR YET' : km > WALL[1] ? 'THE WALL' : 'FREE FALL'}`);
    const g = this.g; g.clear();
    // attitude dial: green wedge is engines-first, give or take 12 degrees
    const cx = W - 56, cy = 80, R = 17, a0 = (-90 + 180 - 12) * Phaser.Math.DEG_TO_RAD, a1 = (-90 + 180 + 12) * Phaser.Math.DEG_TO_RAD;
    g.lineStyle(0.5, 0x8fa3c8, 0.8).strokeCircle(cx, cy, R); g.fillStyle(P.lgreen, 0.5).slice(cx, cy, R, a0, a1, false).fillPath();
    const ea = (this.th + 90) * Phaser.Math.DEG_TO_RAD; g.lineStyle(1.3, off <= 12 ? 0xffffff : P.red).lineBetween(cx, cy, cx + Math.cos(ea) * (R - 1), cy + Math.sin(ea) * (R - 1)); g.fillStyle(0xffffff).fillCircle(cx, cy, 1.4);
    g.fillStyle(0x8fa3c8).fillTriangle(cx - 2, cy + R + 5, cx + 2, cy + R + 5, cx, cy + R + 2);
    const bar = (y: number, f: number, col: number, tick?: number) => { g.fillStyle(0x000000, 0.5).fillRoundedRect(W - 102, y, 92, 4, 2); const w = 92 * Phaser.Math.Clamp(f, 0, 1); if (w > 1) g.fillStyle(col).fillRoundedRect(W - 102, y, Math.max(4, w), 4, 2); if (tick !== undefined) g.fillStyle(0xffffff, 0.9).fillRect(W - 102 + 92 * tick, y - 1, 0.5, 6); };
    bar(110, this.gas, this.gas < 0.2 ? P.red : 0x7fd0ff); bar(122, this.dmg, this.dmg > 0.35 ? P.red : P.yellow, 0.35);
    // speed, on a log scale so both chute limits can be read
    const sf = (v: number) => Math.log(Math.max(5, v) / 5) / Math.log(2400 / 5);
    bar(134, sf(this.v), this.chute === 0 ? (this.v <= DROGUE_V ? P.lgreen : P.orange) : this.v <= MAIN_V ? P.lgreen : P.orange);
    for (const lim of [DROGUE_V, MAIN_V]) g.fillStyle(0xffffff, 0.9).fillRect(W - 102 + 92 * sf(lim), 132.5, 0.5, 7);
    // altitude strip
    const ax = W - 102, aw = 92, AX = (k: number) => ax + aw * (1 - Phaser.Math.Clamp(k / 80, 0, 1));
    g.fillStyle(0x000000, 0.5).fillRoundedRect(ax, 157, aw, 5, 2); g.fillStyle(P.red, 0.55).fillRect(AX(WALL[0]), 157, AX(WALL[1]) - AX(WALL[0]), 5);
    g.fillStyle(0xffffff).fillTriangle(AX(km) - 2, 155, AX(km) + 2, 155, AX(km), 158.5); g.fillStyle(0x2f7fd0).fillRect(ax + aw - 1.5, 157, 1.5, 5);
  }
  lose(text: string) { this.ended = true; this.wind.set(0); this.hiss.set(0); snd.boom(); this.cameras.main.shake(350, 0.01); this.boo.setVisible(false); this.plasma.emitting = false; this.prompt.setText(''); this.time.delayedCall(900, () => finish(this, this.def, { success: false, title: 'Lost on the way down', text })); }
  splash() {
    this.ended = true; this.wind.set(0); this.hiss.set(0); this.prompt.setText(''); this.splashV = this.v; snd.splash();
    this.add.particles(BX, 152, 'puff', { speedY: { min: -120, max: -40 }, speedX: { min: -60, max: 60 }, gravityY: 240, lifespan: 800, scale: { start: S * 0.6, end: S * 0.1 }, alpha: { start: 0.9, end: 0 }, emitting: false }).explode(36);
    this.tweens.add({ targets: this.boo, y: BY + 46, rotation: 1.35, duration: 1500, ease: 'Sine.easeOut' }); this.tweens.add({ targets: this.ship, x: BX + 62, duration: 2600 });
    const v = this.splashV, gasLeft = Math.round(this.gas * 100);
    if (v > 25) return void this.time.delayedCall(1100, () => finish(this, this.def, { success: false, title: `Hit the sea at ${v.toFixed(0)} m/s`, text: this.chute === 0 ? 'No parachute was open. The drogue goes out below Mach 2, the main chute once the drogue has slowed the stage to 110 m/s.' : 'The main chute never did its work. Open it once the drogue has slowed the stage to 110 m/s, with a few kilometres still in hand.' }));
    const stars = v <= 10.5 && this.dmg < 0.35 ? 3 : v <= 14 && this.dmg < 0.7 ? 2 : 1;
    this.call.setText('Splashdown! The recovery ship is on its way');
    this.time.delayedCall(2700, () => finish(this, this.def, { success: true, stars, egg: stars === 3 && gasLeft >= 30, title: `Splashdown at ${v.toFixed(0)} m/s`, text: `The stage is floating, in one piece, with ${gasLeft}% of its cold gas left and ${Math.round(this.dmg * 100)}% of its heat-and-load allowance used. The recovery ship has a line on it.${stars < 3 ? ' For three stars: touch down at 10 m/s or slower and keep heat and load under 35%.' : ''}` }));
  }
}
