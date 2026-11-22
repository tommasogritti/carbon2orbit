import Phaser from 'phaser';
import { W, H, T, held, finish, cam, img, panel, who } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import { P, S } from '../art';
import type { LevelDef } from '../content';
import { hifi, HiFi } from '../hifi';
import { LOOKS } from '../hifiLooks';

const AUTO = new URLSearchParams(location.search).has('auto');
const LOOK = 'stand'; // the test stand's hi-fi look (hifiLooks.ts)
/** Rutherford hot-fire: hold chamber pressure in a drifting green band on battery power. */
export class HotfireScene extends Phaser.Scene {
  def!: LevelDef; t = 0; pc = 0.2; vel = 0; prog = 0; batt = 1; out = 0; g!: Phaser.GameObjects.Graphics; flame!: Phaser.GameObjects.Particles.ParticleEmitter; glow!: Phaser.GameObjects.Image; call!: Phaser.GameObjects.Text; ended = false; swapped = false; rumble!: Loop; whine!: Loop; alarmT = 0; hf?: HiFi;
  constructor() { super('Hotfire'); }
  init(d: { def: LevelDef }) { this.def = d.def; this.t = 0; this.pc = 0.2; this.vel = 0; this.prog = 0; this.batt = 1; this.out = 0; this.ended = false; this.swapped = false; }
  create() {
    cam(this);
    stopLoops(); music.play('launch', 1); this.rumble = loop('rumble'); this.whine = loop('whine');
    const hf = (this.hf = hifi(this, LOOKS[LOOK]));
    if (hf) hf.backdrop(); else img(this, 0, 0, 'bg_stand').setOrigin(0);
    this.glow = img(this, 108, 112, 'puff').setScale(S * 9, S * 5).setTint(0xff9a4a).setBlendMode('ADD').setAlpha(0);
    this.flame = this.add.particles(108, 79, 'puff', { speedY: { min: 90, max: 150 }, speedX: { min: -10, max: 10 }, lifespan: { min: 160, max: 300 }, scale: { start: S * 1.1, end: S * 0.2 }, color: [0xffffff, 0xfff0b0, 0xffb347, 0xff5a1f, 0x7a2408], alpha: { start: 1, end: 0 }, blendMode: 'ADD', frequency: 8, quantity: 2 });
    const eng = img(this, 108, 29, 'rutherford').setOrigin(0.5, 0);
    const worldN = this.children.length; // everything from here on is HUD
    panel(this, 62, 4, 92, 14); T(this, 108, 6.5, 'RUTHERFORD · TEST STAND 1', '#ffffff', 6.5, '700').setOrigin(0.5, 0);
    panel(this, 222, 4, 64, 134); T(this, 254, 8, 'CHAMBER\nPRESSURE', '#aab4d4', 6, '700').setOrigin(0.5, 0).setAlign('center');
    panel(this, 222, 142, 94, 34); T(this, 227, 147, 'QUALIFICATION', '#aab4d4', 5.2, '700'); T(this, 227, 161, 'BATTERY', '#aab4d4', 5.2, '700');
    this.g = this.add.graphics();
    who(this, this.def, 4, 138);
    this.call = T(this, 110, H - 9, 'Hold SPACE to spin up the electric pumps', '#ffe98a', 8, '700').setOrigin(0.5).setShadow(0, 1, '#000000', 3);
    if (hf) { hf.shade(eng, 4, 2); hf.tag({ glow: this.glow, flame: this.flame, engine: eng }); hf.set({ pc: this.pc, on: 0 }); hf.ready({ hud: this.children.list.slice(worldN), lateHud: true }); }
  }
  band(t: number) { return 0.52 + 0.24 * Math.sin(t * 0.8) + 0.1 * Math.sin(t * 2.1 + 1); }
  update(_t: number, dms: number) {
    if (this.ended) return;
    const dt = Math.min(0.05, dms / 1000);
    this.t += dt;
    const c = this.band(this.t), hw = 0.12;
    const on = AUTO ? this.pc < c : held('a');
    this.vel += ((on ? 1.5 : -1.3) - this.vel * 1.6) * dt;
    this.pc = Phaser.Math.Clamp(this.pc + this.vel * dt, 0, 1);
    if (this.pc <= 0 || this.pc >= 1) this.vel = 0;
    const inBand = Math.abs(this.pc - c) < hw;
    if (this.t > 1.2) { this.batt -= dt / 30; if (inBand) this.prog += dt / 11; else this.out += dt; }
    if (this.pc > 0.97 && this.t > 1.2) { this.batt -= dt * 0.08; this.call.setText('Over-pressure! Back off'); this.alarmT -= dt; if (this.alarmT <= 0) { this.alarmT = 0.42; snd.alarm(); } }
    else if (this.prog > 0.5 && !this.swapped) { this.swapped = true; this.call.setText('Halfway. Keep it steady'); snd.tick(); }
    else if (this.t > 1.2 && this.t < 4) this.call.setText('Keep the needle in the green band');
    // gauge
    const g = this.g, x = 240, y0 = 30, hh = 100; g.clear();
    g.fillStyle(0x000000, 0.5).fillRoundedRect(x, y0, 28, hh, 4);
    g.fillStyle(P.green, 0.9).fillRoundedRect(x + 1.5, y0 + hh * (1 - (c + hw)), 25, hh * hw * 2, 3);
    for (let i = 0; i <= 10; i++) g.fillStyle(0xffffff, 0.35).fillRect(x + 28, y0 + (hh * i) / 10 - 0.2, i % 5 ? 2 : 4, 0.4);
    const ny = y0 + hh * (1 - this.pc);
    g.fillStyle(inBand ? 0xffffff : P.red).fillRoundedRect(x - 3, ny - 1.2, 34, 2.4, 1.2); g.fillTriangle(x - 7, ny - 3, x - 7, ny + 3, x - 2, ny);
    const bar = (yy: number, f: number, col: number) => { g.fillStyle(0x000000, 0.5).fillRoundedRect(227, yy, 84, 5, 2.5); const w = 84 * Phaser.Math.Clamp(f, 0, 1); if (w > 1) g.fillStyle(col).fillRoundedRect(227, yy, Math.max(5, w), 5, 2.5); };
    bar(153.5, this.prog, P.lgreen); bar(167.5, this.batt, this.batt < 0.25 ? P.red : P.yellow);
    const p = this.pc; this.hf?.set({ pc: p, on: on ? 1 : 0 });
    this.flame.emitting = p > 0.04; this.flame.lifespan = 90 + p * 300; this.flame.quantity = 1 + Math.round(p * 2);
    this.glow.setAlpha(p * 0.5 + Math.random() * 0.05);
    this.rumble.set(p * 0.9, 0.3 + p * 0.7); this.whine.set(on ? 1 : 0.45, p);
    if (this.prog >= 1) {
      this.ended = true;
      const stars = this.out < 1.5 ? 3 : this.out < 5 ? 2 : 1;
      finish(this, this.def, { success: true, stars, egg: this.out < 1.5, title: 'Engine qualified', text: `Full-duration burn with ${(this.batt * 100).toFixed(0)}% battery left and ${this.out.toFixed(1)} s outside the band.` });
    } else if (this.batt <= 0) {
      this.ended = true; snd.powerdown();
      finish(this, this.def, { success: false, title: 'Batteries flat', text: 'The pumps spun down before the burn was long enough. Feather Space in short taps to ride the green band.' });
    }
  }
}
