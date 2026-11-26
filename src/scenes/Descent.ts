import Phaser from 'phaser';
import { W, H, T, held, just, finish, cam, hero, xgOn, SCENE_FOR } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import type { LevelDef } from '../content';
import { can3d, getEngine, Engine, Frame, V3, norm } from '../gfx3d/engine';
import { Score } from '../gfx3d/score';

const AUTO = new URLSearchParams(location.search).has('auto');
const G = 9.81, MACH = 300; // a round figure for the speed of sound in the upper air
const RAD = Math.PI / 180, clamp = Phaser.Math.Clamp, lerp = Phaser.Math.Linear, wrap = Phaser.Math.Angle.WrapDegrees;
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/**
 * What changes from one descent to another. A second level gives its own entry and picks it with `params.theme`;
 * the numbers of the fall itself come from `params` (see spec §10.19).
 */
const THEMES: Record<string, { label: string; sun: V3; ship: boolean; stage2: boolean }> = {
  electron: { label: 'STAGE 1 · COMING HOME', sun: norm([-0.32, 0.643, -0.69]), ship: true, stage2: true },
};
interface Rig { az: number; el: number; dist: number; fov: number; lx: number; ly: number }

/**
 * A descent from the edge of space to the sea as one continuous shot in three dimensions, drawn by the game's own
 * ray-marching renderer (src/gfx3d), not by Phaser: this scene is only the rules, the keys and the clock.
 * Turn the stage engines-first with cold-gas thrusters on two axes (nothing stops a turn up here but another puff),
 * hold it through "the wall", then open the drogue below Mach 2 and the main chute in the last few kilometres.
 * Where the renderer cannot run (no WebGL2), or the player chose SD or HD graphics, the level hands over to `params.fallback`.
 */
export class DescentScene extends Phaser.Scene {
  def!: LevelDef; h = 78e3; v = 2150; th = 180; om = 4; ph = 0; omp = 0; gas = 1; dmg = 0; chute = 0; ripped = false; t = 0; ended = false; lateFlip = false;
  travel = 0; warp = 1; sink = 0.36; inX = 0; inY = 0; said: Record<string, boolean> = {}; callText = ''; promptText = ''; promptOk = false;
  tChute = [-1, -1]; tSplash = -1; lost = -1; flash = 0; glow = 0; scorch = 0; roll = 0;
  rig: Rig = { az: -24, el: 13, dist: 27, fov: 46, lx: 2, ly: 0.5 }; orbit = 0;
  eng?: Engine; box?: HTMLDivElement; hudC?: HTMLCanvasElement; wind!: Loop; hiss!: Loop; sea!: Loop; ready = false; idle = 0; score?: Score; /** Dev: jump the camera straight to its set-up, for stills. */ settle = false;
  P!: { h0: number; v0: number; wall: [number, number]; drogueMach: number; mainV: number; drag: number[]; theme: string };
  constructor() { super('Descent'); }
  /** The controls panel (H or the ? button): what the keys do right now. */
  help(): { title: string; rows: [keys: string, does: string][]; note?: string } {
    const rows: [string, string][] = [['← →', 'Cold-gas thrusters: swing the stage in the plane of the picture. A puff starts it turning; only a puff the other way stops it.'], ['↑ ↓', 'The same, towards you and away from you.']];
    if (this.chute === 0) rows.push(['Space', `Open the drogue parachute, once the speed is under Mach ${this.P.drogueMach}.`]);
    else if (this.chute === 1) rows.push(['Space', `Open the main parachute, once the drogue has slowed the stage below ${this.P.mainV} m/s.`]);
    return { title: 'Descent', rows, note: this.chute === 2 ? 'Both parachutes are out: nothing left to command.' : 'Bring the dot on the attitude display into the green ring (engines-first, into the airflow) and hold it there through the wall of air.' };
  }
  init(d: { def: LevelDef }) {
    this.def = d.def; const p = d.def.params || {};
    this.P = { h0: p.h0 ?? 78e3, v0: p.v0 ?? 2150, wall: p.wall ?? [55, 22], drogueMach: p.drogueMach ?? 2, mainV: p.mainV ?? 110, drag: p.drag ?? [G / 85 ** 2, G / 60 ** 2, G / 9 ** 2], theme: p.theme ?? 'electron' };
    Object.assign(this, { h: this.P.h0, v: this.P.v0, th: 180, om: Phaser.Math.Between(0, 1) ? 5 : -5, ph: 0, omp: Phaser.Math.Between(0, 1) ? 3 : -3, gas: 1, dmg: 0, chute: 0, ripped: false, t: 0, ended: false, lateFlip: false, travel: 0, said: {}, callText: 'Over the top of its arc · the booster is falling back', promptText: '', tChute: [-1, -1], tSplash: -1, lost: -1, flash: 0, glow: 0, scorch: 0, roll: 0, orbit: 0, ready: false, idle: 0 });
    this.rig = { az: -24, el: 13, dist: 27, fov: 46, lx: 2, ly: 0.5 };
  }
  create() {
    const fb = SCENE_FOR[this.def.params?.fallback as string] as string | undefined; // the scene of the mechanic to fall back on
    if (!xgOn() || !can3d()) { if (fb) return void this.scene.start(fb, { def: this.def }); }
    cam(this); stopLoops(); this.cameras.main.setBackgroundColor('#020308');
    const wait = T(this, W / 2, H / 2, 'Building the sky…', '#8fa3c8', 7, '600').setOrigin(0.5);
    // the first start compiles the shaders and fills the noise volumes: a moment's work, so let the line above show first
    this.time.delayedCall(60, () => {
      try { this.eng = getEngine(); } catch (e) { console.error(e); if (fb) return void this.scene.start(fb, { def: this.def }); throw e; }
      wait.destroy(); this.mount();
      music.stop(0.2); this.score = new Score(); this.score.start(); this.wind = loop('rumble'); this.hiss = loop('hiss'); this.sea = loop('sea');
      this.eng.cut(); this.ready = true;
    });
    const draw = () => this.present();
    this.game.events.on('postrender', draw);
    this.events.once('shutdown', () => { this.game.events.off('postrender', draw); this.box?.remove(); this.box = undefined; this.ready = false; this.score?.stop(); this.score = undefined; });
  }
  /** Lay the renderer's canvas, and a second one for the instruments, exactly over the game's. */
  mount() {
    const box = (this.box = document.createElement('div')); box.id = 'gfx3d';
    box.style.cssText = 'position:absolute;z-index:3;pointer-events:none;overflow:hidden';
    const hud = (this.hudC = document.createElement('canvas'));
    for (const c of [this.eng!.canvas, hud]) { c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'; box.appendChild(c); }
    document.getElementById('stage')!.appendChild(box); this.fit();
  }
  fit() {
    const box = this.box!, r = this.game.canvas.getBoundingClientRect(), s = document.getElementById('stage')!.getBoundingClientRect();
    const key = `${r.left - s.left}|${r.top - s.top}|${r.width}|${r.height}`;
    if (box.dataset.k === key) return;
    box.dataset.k = key; Object.assign(box.style, { left: r.left - s.left + 'px', top: r.top - s.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    const dpr = Math.min(window.devicePixelRatio || 1, 2), k = Math.min(1, 2560 / Math.max(1, r.width * dpr)), w = Math.max(320, r.width * dpr * k), h = Math.max(180, r.height * dpr * k);
    this.eng!.resize(w, h); this.hudC!.width = Math.round(w); this.hudC!.height = Math.round(h);
  }
  say(k: string, s: string) { if (this.said[k]) return; this.said[k] = true; this.callText = s; }
  update(_t: number, dms: number) {
    if (!this.ready) return;
    const dt = Math.min(0.05, dms / 1000); this.t += dt; this.flash = Math.max(0, this.flash - dt * 2.5);
    if (this.ended) { if (this.tSplash >= 0) this.tSplash += dt; if (this.lost >= 0) this.lost += dt; return; }
    const P = this.P, WALL = P.wall, DROGUE_V = P.drogueMach * MACH, MAIN_V = P.mainV;
    const km = this.h / 1000, rho = Math.exp(-this.h / 7200), q = 0.5 * 1.225 * rho * this.v * this.v;
    const air = clamp(q / 9000, 0, 1); // how much the air has to say about it
    // ---- attitude: cold-gas thrusters on two axes, and the air once there is any
    let ix = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), iy = (held('up') ? 1 : 0) - (held('down') ? 1 : 0);
    const err = wrap(this.th), off = Math.acos(clamp(Math.cos(err * RAD) * Math.cos(this.ph * RAD), -1, 1)) / RAD;
    if (AUTO) {
      const bot = (e: number, o: number) => { const stop = (o * Math.abs(o)) / (2 * 62); return this.chute ? 0 : Math.abs(e + stop) < (air > 0.04 ? 7 : 1.5) && Math.abs(o) < (air > 0.04 ? 24 : 3) ? 0 : -Math.sign(e + stop); };
      ix = bot(err, this.om); iy = bot(this.ph, this.omp);
    }
    if (this.gas <= 0 || this.chute) ix = iy = 0;
    this.gas = Math.max(0, this.gas - ((Math.abs(ix) + Math.abs(iy)) * dt) / 9);
    this.inX = ix; this.inY = iy; this.hiss.set(ix || iy ? 0.9 : 0);
    const upright = Math.abs(err) < 90; // engines-first is stable in the airflow; nose-first is stable too, and fatal
    const s1 = Math.sin(this.t * 7.3) + Math.sin(this.t * 3.1 + 1), s2 = Math.sin(this.t * 6.1 + 2) + Math.sin(this.t * 2.7);
    const aeroX = this.chute ? -err * 6 - this.om * 5 : -(upright ? 1 : -1) * Math.sin(err * RAD) * 190 * air - this.om * 1.8 * air + s1 * 21 * air;
    const aeroY = this.chute ? -this.ph * 6 - this.omp * 5 : -Math.sin(this.ph * RAD) * 190 * air - this.omp * 1.8 * air + s2 * 15 * air;
    this.om += (ix * 62 + aeroX) * dt; this.th += this.om * dt; this.omp += (iy * 62 + aeroY) * dt; this.ph = clamp(this.ph + this.omp * dt, -80, 80); if (Math.abs(this.ph) >= 80) this.omp = 0;
    // ---- the fall: time is compressed, more so where nothing is happening
    const warp = (this.warp = this.chute === 2 ? (this.h > 250 ? 34 : 5) : this.chute === 1 ? 9 : km > WALL[0] ? 2.6 : 2.3), md = dt * warp;
    const sink = (this.sink = clamp(0.36 + (60 - km) / 70, 0.36, 1));
    this.v = Math.max(3, this.v + (G * sink - P.drag[this.chute] * rho * this.v * this.v * (upright || this.chute ? 1 : 0.6)) * md);
    this.h -= this.v * sink * md; this.travel += (this.v * Math.sqrt(1 - sink * sink) * md) / 1000;
    // ---- heat and load: flying it sideways or backwards through the wall is what breaks it
    if (!this.chute) this.dmg += dt * (warp / 3) * air * (0.009 + (off > 12 ? ((off - 12) / 40) ** 2 * 0.9 : 0));
    if (km < WALL[0] && !this.lateFlip && off > 35 && !this.chute) { this.lateFlip = true; this.callText = 'Into the wall sideways! Get the engines pointing down the line of flight'; snd.alarm(); }
    const hot = !this.chute && this.v > 900 ? air : 0;
    this.glow = Math.max(this.glow - dt * 0.12, hot); this.scorch = Math.max(this.scorch, sstep(0.1, 1, hot) * 0.9);
    // ---- parachutes
    const wantChute = AUTO ? (this.chute === 0 ? km < 24 && this.v < DROGUE_V - 25 : this.chute === 1 && this.v < MAIN_V - 8 && km < 6.5) : just('a');
    if (wantChute && !this.ripped) {
      if (this.chute === 0) {
        if (km > 30) snd.deny();
        else if (this.v > DROGUE_V) { this.ripped = true; snd.crash(); this.flash = 0.5; this.callText = `Drogue out at Mach ${(this.v / MACH).toFixed(1)}: torn away. It needed to be under Mach ${P.drogueMach}`; }
        else { this.chute = 1; this.tChute[0] = this.t; snd.fairing(); this.flash = 0.25; this.callText = `Drogue out at Mach ${(this.v / MACH).toFixed(1)} · ${km.toFixed(1)} km`; }
      } else if (this.chute === 1) {
        if (this.v > MAIN_V) { this.ripped = true; snd.crash(); this.flash = 0.5; this.callText = `Main chute out at ${this.v.toFixed(0)} m/s: shredded. Wait for ${MAIN_V} m/s`; }
        else { this.chute = 2; this.tChute[1] = this.t; snd.fairing(); this.flash = 0.3; this.callText = `Main chute open at ${km.toFixed(1)} km`; }
      }
    }
    // ---- call-outs
    if (this.t > 2.2) this.say('flip', '← → ↑ ↓ fire the cold-gas thrusters: turn it engines-first before the air arrives');
    if (km < WALL[0] && !this.lateFlip) this.say('wall', 'Here comes the wall · hold it engines-first');
    if (this.v > 2300 || (km < 40 && this.said.wall)) this.say('peak', 'Peak heating · the air around the engines is hotter than 2,400 °C');
    if (km < WALL[1] && !this.chute) this.say('thru', 'Through the wall · slowing down');
    this.promptOk = false;
    if (this.chute === 0 && !this.ripped && km < 30) { this.promptOk = this.v <= DROGUE_V; this.promptText = this.promptOk ? 'SPACE · DROGUE' : `DROGUE BELOW MACH ${P.drogueMach} · NOW MACH ${(this.v / MACH).toFixed(1)}`; }
    else if (this.chute === 1 && !this.ripped) { this.promptOk = this.v <= MAIN_V; this.promptText = this.promptOk ? 'SPACE · MAIN CHUTE' : `MAIN CHUTE BELOW ${MAIN_V} m/s · NOW ${this.v.toFixed(0)} m/s`; }
    else this.promptText = '';
    this.wind.set(Math.min(1, air * 0.9 + (this.chute ? 0.15 : 0)), 0.3 + air * 0.6); this.sea.set(this.h < 700 ? 0.5 * (1 - this.h / 700) : 0);
    this.score?.set(this.chute === 2 ? 'main' : this.chute === 1 ? 'drogue' : km > WALL[0] ? 'space' : km > WALL[1] ? 'wall' : 'fall', hot);
    if (this.dmg >= 1) return this.lose('The stage broke up at the wall. It has to meet the air engines-first: finish the turn above 55 km, and keep correcting on both axes while the air shakes it.');
    if (this.h <= 0) return this.splash();
  }
  lose(text: string) { this.ended = true; this.lost = 0; this.score?.set('lost'); this.wind.set(0); this.hiss.set(0); snd.boom(); this.flash = 1; this.promptText = ''; this.time.delayedCall(1300, () => finish(this, this.def, { success: false, title: 'Lost on the way down', text })); }
  splash() {
    this.ended = true; this.h = 0; this.tSplash = 0; this.score?.set(this.v > 25 ? 'lost' : 'down'); this.wind.set(0); this.hiss.set(0); this.sea.set(0.6); this.promptText = ''; snd.splash();
    const v = this.v, gasLeft = Math.round(this.gas * 100), MAIN_V = this.P.mainV;
    if (v > 25) return void this.time.delayedCall(1400, () => finish(this, this.def, { success: false, title: `Hit the sea at ${v.toFixed(0)} m/s`, text: this.chute === 0 ? `No parachute was open. The drogue goes out below Mach ${this.P.drogueMach}, the main chute once the drogue has slowed the stage to ${MAIN_V} m/s.` : `The main chute never did its work. Open it once the drogue has slowed the stage to ${MAIN_V} m/s, with a few kilometres still in hand.` }));
    const stars = v <= 10.5 && this.dmg < 0.35 ? 3 : v <= 14 && this.dmg < 0.7 ? 2 : 1;
    this.callText = 'Splashdown! The recovery ship is on its way';
    this.time.delayedCall(AUTO ? 2700 : 5200, () => finish(this, this.def, { success: true, stars, egg: stars === 3 && gasLeft >= 30, title: `Splashdown at ${v.toFixed(0)} m/s`, text: `The stage is floating, in one piece, with ${gasLeft}% of its cold gas left and ${Math.round(this.dmg * 100)}% of its heat-and-load allowance used. The recovery ship has a line on it.${stars < 3 ? ' For three stars: touch down at 10 m/s or slower and keep heat and load under 35%.' : ''}` }));
  }

  // ------------------------------------------------------------------ the picture
  /** Everything the renderer needs for this instant, worked out from the state of the fall. */
  frame(): Frame {
    const th3 = THEMES[this.P.theme], km = this.h / 1000, ts = this.tSplash, down = ts >= 0;
    const rho = Math.exp(-this.h / 7200), air = clamp((0.5 * 1.225 * rho * this.v * this.v) / 9000, 0, 1), hot = !this.chute && this.v > 900 && this.lost < 0 ? air : 0;
    // the stage: tipped over and floating once it is down
    const tip = down ? sstep(0.5, 3.2, ts) : 0, thd = (down ? lerp(wrap(this.th), 84, tip) : this.th) * RAD, phd = this.ph * RAD * (1 - tip);
    const sink = clamp(0.36 + (60 - km) / 70, 0.36, 1), g = Math.asin(sink), vel: V3 = [Math.cos(g), -Math.sin(g), 0], a = -thd;
    const dx = vel[0] * Math.cos(a) - vel[1] * Math.sin(a), dy = vel[0] * Math.sin(a) + vel[1] * Math.cos(a);
    const d: V3 = [dx * Math.cos(phd), dy * Math.cos(phd), -Math.sin(phd)];
    const by: V3 = [-d[0], -d[1], -d[2]]; let bz: V3 = norm([-by[0] * by[2], -by[1] * by[2], 1 - by[2] * by[2]]); let bx: V3 = [by[1] * bz[2] - by[2] * bz[1], by[2] * bz[0] - by[0] * bz[2], by[0] * bz[1] - by[1] * bz[0]];
    if (!down) this.roll = this.t * 0.11; const cr = Math.cos(this.roll), sr = Math.sin(this.roll);
    [bx, bz] = [[bx[0] * cr + bz[0] * sr, bx[1] * cr + bz[1] * sr, bx[2] * cr + bz[2] * sr], [bz[0] * cr - bx[0] * sr, bz[1] * cr - bx[1] * sr, bz[2] * cr - bx[2] * sr]];
    // metres from the stage's centre to the sea: the fall is measured to the engines; afterwards it plunges, then floats
    const centre = down ? lerp(6, 0.28, sstep(0, 2.6, ts)) - 2.2 * Math.sin(Math.min(ts, 2.2) * 1.43) * Math.exp(-ts * 0.9) + 0.12 * Math.sin(ts * 1.9) : this.h + 6;
    // parachutes: the drogue snaps open; the main opens reefed, then fully, and breathes
    const td = this.tChute[0] < 0 ? -1 : this.t - this.tChute[0], tm = this.tChute[1] < 0 ? -1 : this.t - this.tChute[1];
    let drogue = td < 0 || tm > 0.25 ? 0 : sstep(0, 0.45, td) * (1 + 0.08 * Math.exp(-td * 3) * Math.sin(td * 18)) + 0.02 * Math.sin(this.t * 9);
    let main = tm < 0 ? 0 : (0.34 * sstep(0, 0.5, tm) + 0.66 * sstep(1.0, 1.7, tm)) * (1 + 0.06 * Math.exp(-Math.max(tm - 1.7, 0) * 2) * Math.sin(tm * 11)) + 0.012 * Math.sin(this.t * 4.3);
    if (down) main *= 1 - sstep(0.2, 2.4, ts);
    if (this.ripped) { drogue = 0; if (this.chute < 2) main = 0; }
    const sway: V3 = [0.05 * Math.sin(this.t * 1.3), 0, 0.05 * Math.sin(this.t * 1.7 + 1)];
    const chA = norm(down ? [0.5 * tip + 0.1, 1 - tip * 0.8, 0.3 * tip] : [-vel[0] + sway[0], -vel[1], sway[2]]);
    // the camera: one rig, moved from set-up to set-up as the fall goes on
    const goal: Rig = down ? { az: 38, el: 4, dist: 34, fov: 44, lx: -6, ly: 3 }
      : this.chute === 2 ? (this.h < 400 ? { az: 30, el: 3, dist: 46, fov: 46, lx: 0, ly: 9 } : { az: 24, el: -9, dist: 60, fov: 46, lx: 0, ly: 13 })
      : this.chute === 1 ? { az: -16, el: -17, dist: 31, fov: 50, lx: 0, ly: 5 }
      : km > this.P.wall[0] ? { az: -24, el: 13, dist: 27, fov: 46, lx: 2, ly: 0.5 }
      : km > this.P.wall[1] ? { az: 30, el: -5, dist: 17.5, fov: 60, lx: -1.5, ly: 1.2 }
      : { az: 8, el: 5, dist: 30, fov: 48, lx: 0, ly: 1 };
    const k = this.settle ? 1 : 1 - Math.exp(-(1 / 60) * (this.chute === 2 && !down ? 0.9 : 1.5)); const r = this.rig;
    if (!this.scene.isPaused() || this.settle) { for (const key of Object.keys(r) as (keyof Rig)[]) r[key] = lerp(r[key], goal[key], k); this.orbit += (1 / 60) * (down ? 2.2 : 1.1); }
    const az = (r.az + this.orbit) * RAD, el = r.el * RAD;
    const cam3: V3 = [r.lx + Math.sin(az) * Math.cos(el) * r.dist, r.ly + Math.sin(el) * r.dist, Math.cos(az) * Math.cos(el) * r.dist];
    cam3[1] = Math.max(cam3[1], 2.2 - centre); // never under the sea
    const shipX = th3.ship && this.h < 1500 ? lerp(-190, -56, down ? sstep(0, 5, ts) * 0.5 + 0.5 : 0.5 * (1 - this.h / 1500)) : 0;
    const s2k = th3.stage2 ? Math.exp(-this.t * 0.22) * sstep(0, 0.4, this.t) : 0;
    return {
      time: this.t, cam: cam3, look: [r.lx, r.ly, 0], fov: r.fov + hot * 3, roll: -0.05 + 0.03 * Math.sin(this.t * 0.2), shake: this.lost >= 0 ? Math.exp(-this.lost * 2.5) : hot * 0.55 + this.flash * 0.6 + (this.chute === 1 ? 0.07 : 0) + air * 0.06,
      alt: centre / 1000, travel: [this.travel, 0], drop: this.ended ? 0 : this.v * this.sink * this.warp, speed: [this.ended ? 0 : (this.v * Math.sqrt(1 - this.sink * this.sink) * this.warp) / 1000, 0],
      sun: th3.sun, body: [...bx, ...by, ...bz], vel, hot: this.lost >= 0 ? Math.exp(-this.lost * 1.5) * 2.5 : hot, scorch: this.scorch, glow: this.glow * 0.8, rcs: [Math.max(this.inX, 0), Math.max(-this.inX, 0), Math.max(-this.inY, 0), Math.max(this.inY, 0)],
      chuteAxis: chA, drogue, main, splash: ts, s2: [...norm([0.82, 0.5, -0.28]), s2k] as [number, number, number, number], ship: shipX ? [shipX, -centre, -30] : null,
      exposure: 0.27 * lerp(1, 0.7, sstep(0.2, 1, hot)), flash: this.flash + (this.lost >= 0 ? Math.exp(-this.lost * 3) * 2 : 0),
    };
  }
  /** Draw one frame of the world and the instruments. Called after Phaser's own (empty) render, so only for frames that are shown. */
  present() {
    if (!this.ready || !this.box) return;
    if (this.scene.isPaused()) { if (++this.idle > 40) return; } else this.idle = 0; // a paused picture settles, then costs nothing
    this.fit(); this.eng!.render(this.frame()); this.hud();
  }
  /** Dev: the frame as a JPEG data URL (world and instruments), for the checks that run without a visible tab. */
  shot(q = 0.9) { this.fit(); this.eng!.render(this.frame()); this.hud(); const c = document.createElement('canvas'); c.width = this.eng!.canvas.width; c.height = this.eng!.canvas.height; const x = c.getContext('2d')!; x.drawImage(this.eng!.canvas, 0, 0); x.drawImage(this.hudC!, 0, 0); return c.toDataURL('image/jpeg', q); }

  // ------------------------------------------------------------------ the instruments
  hud() {
    const cv = this.hudC!, c = cv.getContext('2d')!, k = cv.height / 720, P = this.P, km = this.h / 1000, th3 = THEMES[P.theme];
    c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, 1280, 720);
    const F = (px: number, w = 600) => `${w} ${px}px "Chakra Petch", system-ui, sans-serif`;
    const txt = (s: string, x: number, y: number, px: number, col: string, al: CanvasTextAlign = 'left', w = 600, sp = 0) => { c.font = F(px, w); c.textAlign = al; (c as any).letterSpacing = sp + 'px'; c.shadowColor = 'rgba(0,0,0,.75)'; c.shadowBlur = 6; c.fillStyle = col; c.fillText(s, x, y); c.shadowBlur = 0; };
    const line = (x0: number, y0: number, x1: number, y1: number, col: string, w = 1) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
    const DIM = 'rgba(190,205,235,.62)', WH = 'rgba(255,255,255,.95)', GR = '#7fe08a', RD = '#ff5d4a', AM = '#ffcf6b';
    const fade = this.lost >= 0 ? Math.max(0, 1 - this.lost * 2) : 1; c.globalAlpha = fade;
    // a little shade behind the instruments, so they read over cloud as well as over space
    for (const [x0, x1] of [[0, 300], [1280, 980]]) { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(2,5,12,.38)'); g.addColorStop(1, 'rgba(2,5,12,0)'); c.fillStyle = g; c.fillRect(Math.min(x0, x1), 0, 300, 720); }
    { const g = c.createLinearGradient(0, 720, 0, 500); g.addColorStop(0, 'rgba(2,5,12,.4)'); g.addColorStop(1, 'rgba(2,5,12,0)'); c.fillStyle = g; c.fillRect(0, 500, 1280, 220); const g2 = c.createLinearGradient(0, 0, 0, 170); g2.addColorStop(0, 'rgba(2,5,12,.32)'); g2.addColorStop(1, 'rgba(2,5,12,0)'); c.fillStyle = g2; c.fillRect(0, 0, 1280, 170); }
    // top left: where we are in the fall
    const off = Math.acos(clamp(Math.cos(wrap(this.th) * RAD) * Math.cos(this.ph * RAD), -1, 1)) / RAD;
    const phase = this.tSplash >= 0 ? 'SPLASHDOWN' : this.chute === 2 ? 'UNDER MAIN CHUTE' : this.chute === 1 ? 'UNDER DROGUE' : km > P.wall[0] ? 'COASTING · NO AIR YET' : km > P.wall[1] ? 'THE WALL' : 'FREE FALL';
    txt(th3.label, 44, 50, 12, DIM, 'left', 700, 2.4); txt(phase, 44, 78, 25, phase === 'THE WALL' ? AM : WH, 'left', 700, 1);
    const mm = Math.floor(this.t / 60), ss = Math.floor(this.t % 60);
    txt(`T+ ${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}   ·   TIME ×${this.ended ? 1 : this.warp}`, 44, 100, 12, DIM, 'left', 600, 1.5);
    if (this.t < 5.5) { const h = hero(this.def), a = Math.min(1, this.t * 3) * sstep(5.5, 4.6, this.t); c.globalAlpha = a * fade; txt(h.name.toUpperCase(), 44, 138, 14, WH, 'left', 700, 1.5); txt(this.def.role || 'CEO · in Mission Control', 44, 156, 12, AM, 'left', 600, 0.5); c.globalAlpha = fade; }
    // left: altitude, with the wall marked
    const ax = 52, ay0 = 210, ay1 = 590, AY = (q: number) => ay1 - (ay1 - ay0) * clamp(q / 80, 0, 1);
    line(ax, ay0, ax, ay1, 'rgba(255,255,255,.35)', 1);
    for (let q = 0; q <= 80; q += 10) { line(ax - 5, AY(q), ax, AY(q), 'rgba(255,255,255,.5)'); if (q % 20 === 0) txt(String(q), ax - 10, AY(q) + 4, 10, DIM, 'right', 600); }
    c.fillStyle = 'rgba(255,93,74,.5)'; c.fillRect(ax + 1, AY(P.wall[0]), 4, AY(P.wall[1]) - AY(P.wall[0]));
    const my = AY(km); c.fillStyle = WH; c.beginPath(); c.moveTo(ax + 8, my); c.lineTo(ax + 17, my - 6); c.lineTo(ax + 17, my + 6); c.fill();
    txt(km >= 10 ? km.toFixed(1) : km >= 1 ? km.toFixed(2) : Math.max(0, this.h).toFixed(0), ax + 24, my + 2, 22, WH, 'left', 700); txt(km >= 1 ? 'KM' : 'M', ax + 24, my + 17, 10, DIM, 'left', 700, 2);
    txt('ALTITUDE', ax - 8, ay0 - 16, 10, DIM, 'left', 700, 2);
    // right: speed, on a log scale so both parachute limits can be read
    const sx = 1228, sf = (v: number) => Math.log(Math.max(5, v) / 5) / Math.log(2400 / 5), SY = (v: number) => ay1 - (ay1 - ay0) * clamp(sf(v), 0, 1), DV = P.drogueMach * MACH;
    line(sx, ay0, sx, ay1, 'rgba(255,255,255,.35)', 1);
    for (const [lim, lab] of [[DV, `MACH ${P.drogueMach}`], [P.mainV, `${P.mainV}`]] as [number, string][]) { line(sx - 7, SY(lim), sx + 5, SY(lim), AM, 1.5); txt(lab, sx + 9, SY(lim) + 3, 9, AM, 'left', 700); }
    const sy = SY(this.v), ok = this.chute === 0 ? this.v <= DV : this.v <= P.mainV;
    c.fillStyle = ok && this.chute < 2 ? GR : WH; c.beginPath(); c.moveTo(sx - 8, sy); c.lineTo(sx - 17, sy - 6); c.lineTo(sx - 17, sy + 6); c.fill();
    txt(this.v >= 100 ? String(Math.round(this.v / 10) * 10) : this.v.toFixed(1), sx - 24, sy + 2, 22, WH, 'right', 700); txt(`M/S · MACH ${(this.v / MACH).toFixed(1)}`, sx - 24, sy + 17, 10, DIM, 'right', 700, 1.5);
    txt('SPEED', sx + 8, ay0 - 16, 10, DIM, 'right', 700, 2);
    // bottom: attitude. The dot is where the engines point; the centre is the line of flight. Angles are spread so the green ring can be seen.
    if (!this.chute && this.tSplash < 0) {
      const cx = 640, cy = 606, R = 62, rr = (deg: number) => R * Math.sqrt(clamp(deg, 0, 180) / 180);
      c.fillStyle = 'rgba(6,10,20,.38)'; c.beginPath(); c.arc(cx, cy, R + 6, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
      c.setLineDash([3, 5]); c.beginPath(); c.arc(cx, cy, rr(90), 0, 7); c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(127,224,138,.16)'; c.strokeStyle = GR; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, rr(12), 0, 7); c.fill(); c.stroke();
      line(cx - R, cy, cx - R + 8, cy, DIM); line(cx + R - 8, cy, cx + R, cy, DIM); line(cx, cy - R, cx, cy - R + 8, DIM); line(cx, cy + R - 8, cx, cy + R, DIM);
      const ex = wrap(this.th), ey = this.ph, m = Math.hypot(ex, ey) || 1, px = cx + (ex / m) * rr(off), py = cy - (ey / m) * rr(off);
      line(px, py, px + clamp(this.om * 0.5, -30, 30), py - clamp(this.omp * 0.5, -30, 30), 'rgba(255,255,255,.55)', 1.5);
      c.fillStyle = off <= 12 ? GR : km < P.wall[0] ? RD : WH; c.beginPath(); c.arc(px, py, 5, 0, 7); c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1; c.stroke();
      txt('ATTITUDE', cx, cy - R - 14, 10, DIM, 'center', 700, 2); txt(`${off.toFixed(0)}° OFF THE LINE OF FLIGHT`, cx, cy + R + 22, 11, off <= 12 ? GR : WH, 'center', 700, 1);
    }
    const bar = (x: number, y: number, w: number, f: number, col: string, label: string, tick?: number, al: CanvasTextAlign = 'left') => {
      c.fillStyle = 'rgba(6,10,20,.5)'; c.fillRect(x, y, w, 5); c.fillStyle = col; c.fillRect(x, y, w * clamp(f, 0, 1), 5);
      if (tick !== undefined) line(x + w * tick, y - 3, x + w * tick, y + 8, WH, 1.5);
      txt(label, al === 'left' ? x : x + w, y - 8, 10, DIM, al, 700, 2); txt(`${Math.round(f * 100)}%`, al === 'left' ? x + w : x, y - 8, 11, WH, al === 'left' ? 'right' : 'left', 700);
    };
    bar(250, 640, 240, this.gas, this.gas < 0.2 ? RD : '#8fd3ff', 'RCS GAS'); bar(790, 640, 240, this.dmg, this.dmg > 0.35 ? RD : AM, 'HEAT + LOAD', 0.35, 'right');
    // the calls
    if (this.promptText) { c.font = F(22, 700); (c as any).letterSpacing = '2px'; const w = c.measureText(this.promptText).width + 44; c.fillStyle = this.promptOk ? 'rgba(40,120,60,.55)' : 'rgba(6,10,20,.5)'; c.fillRect(640 - w / 2, 150, w, 44); c.strokeStyle = this.promptOk ? GR : 'rgba(255,255,255,.4)'; c.lineWidth = 1.5; c.strokeRect(640 - w / 2, 150, w, 44); txt(this.promptText, 640, 180, 22, this.promptOk ? '#d9ffe0' : WH, 'center', 700, 2); }
    txt(this.callText, 640, 112, 17, AM, 'center', 600, 0.5);
    c.globalAlpha = 1;
  }
}
