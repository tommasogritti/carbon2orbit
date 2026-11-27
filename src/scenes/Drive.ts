import Phaser from 'phaser';
import { W, H, T, held, just, finish, cam, hero, xgOn, SCENE_FOR } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import type { LevelDef } from '../content';
import { can3d, getEngine, Engine, Frame, V3, norm } from '../gfx3d/engine';
import { buildStage, signAtlas, Stage, Data } from '../drive/world';

const AUTO = new URLSearchParams(location.search).has('auto');
const G = 9.81, clamp = Phaser.Math.Clamp, lerp = Phaser.Math.Linear;
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** Early afternoon in late September at Māhia: the sun a little west of north, about 45° up (x east, y up, z south). */
const SUN0: V3 = norm([-0.35, 0.72, -0.6]);
const WB = 4.85, GOVERNOR = 25;           // wheelbase, m; heavy vehicles in New Zealand are limited to 90 km/h
/** The road data a level can drive, by name (`params.data`): made by scripts/drive-data.mjs. */
const DATA: Record<string, () => Promise<{ default: unknown }>> = { mahia: () => import('../drive/stages.json') };

interface Sheep { s: number; d: number; h: number; step: number; mode: 0 | 1 | 2; t: number }

/**
 * Road to Māhia as a drive: a truck with the pad's liquid-oxygen tank on its deck, from Wairoa to Launch Complex 1, over
 * six real stretches of the 83 km (the rest goes by on the cards between them). The road, its height and everything
 * along it come from OpenStreetMap and the LINZ elevation model, drawn by the game's own ray-marching renderer at ground
 * level (src/gfx3d/drive.ts). This scene is the rules, the keys, the clock and the truck: a bicycle model on the road's
 * own line, with the grade, the grip of seal, gravel and grass, a load that suffers in hard corners and over bumps, and
 * sheep. In SD or HD graphics, or without WebGL2, the level plays as `params.fallback` (the platform level it was).
 */
export class DriveScene extends Phaser.Scene {
  def!: LevelDef; world?: Data; st?: Stage; si = 0;
  s = 0; d = -1.7; psi = 0; v = 0; steer = 0; curv = 0; acc = 0; lat = 0; spin = 0; brake = 0;
  t = 0; clock = 0; started = false; strain = 0; shift = 0; ended = false; fade = 1; fadeDir = -1; cardT = 0; penalty = 0; crashes = 0; stops = 0;
  camMode = 0; camH = 0; camP: V3 = [0, 4, -11]; fresh = true; horn = 0; callText = ''; callT = 0; egg = false; secret = false; bump = 0; dust = 0;
  sheep: Sheep[] = []; said: Record<string, boolean> = {}; times: number[] = []; sun: V3 = SUN0; notes: Record<string, string> = {};
  eng?: Engine; box?: HTMLDivElement; hudC?: HTMLCanvasElement; diesel?: Loop; tyres?: Loop; sea?: Loop; ready = false; idle = 0; fdt = 1 / 60; lastP = -1; atlas?: HTMLCanvasElement; settle = false;
  constructor() { super('Drive'); }
  help(): { title: string; rows: [keys: string, does: string][]; note?: string } {
    return { title: 'Drive to the pad', rows: [['↑', 'Accelerate (the truck is governed at 90 km/h)'], ['↓', 'Brake; held at a standstill, reverse'], ['← →', 'Steer. The wheel follows the road a little, as a driver’s hands would'], ['Space', 'The horn: sheep move off the road for it'], ['Enter', 'Change the camera: behind, low, or from the cab']], note: 'New Zealand drives on the left. Hard corners, bumps at speed and the verge all strain the load’s straps; the bar on the right shows how much. Slow right down for the cattle stop.' };
  }
  init(d: { def: LevelDef }) {
    this.def = d.def; const p = d.def.params || {}; this.sun = p.sun ? norm(p.sun) : SUN0; this.notes = p.notes || {};
    Object.assign(this, { si: 0, s: 0, d: -1.7, psi: 0, v: 0, steer: 0, curv: 0, t: 0, clock: 0, started: false, strain: 0, shift: 0, ended: false, fade: 1, fadeDir: -1, cardT: 0, penalty: 0, crashes: 0, stops: 0, camMode: 0, fresh: true, horn: 0, callText: '', egg: false, secret: false, sheep: [], said: {}, times: [], ready: false, idle: 0, st: undefined });
  }
  create() {
    const fb = SCENE_FOR[this.def.params?.fallback as string] as string | undefined, fdef = { ...this.def, params: this.def.params?.walk, how: this.def.params?.walkHow || this.def.how };
    if (!xgOn() || !can3d()) { if (fb) return void this.scene.start(fb, { def: fdef }); }
    cam(this); stopLoops(); this.cameras.main.setBackgroundColor('#05070a');
    const wait = T(this, W / 2, H / 2, 'Laying the road to Māhia…', '#8fa3c8', 7, '600').setOrigin(0.5);
    const draw = () => this.present();
    this.game.events.on('postrender', draw);
    this.events.once('shutdown', () => { this.game.events.off('postrender', draw); this.box?.remove(); this.box = undefined; this.ready = false; });
    this.time.delayedCall(60, async () => {
      try {
        this.world = (await (DATA[this.def.params?.data ?? 'mahia'] || DATA.mahia)()).default as unknown as Data;
        this.eng = getEngine(); this.eng.drive(); this.atlas = signAtlas();
      } catch (e) { console.error(e); if (fb) return void this.scene.start(fb, { def: fdef }); throw e; }
      if (!this.scene.isActive()) return;
      wait.destroy(); this.mount(); this.enter(0);
      music.play('mahia'); this.diesel = loop('diesel'); this.tyres = loop('tyres'); this.sea = loop('sea');
      this.ready = true;
    });
  }
  /** Lay the next stretch of road out, and put the truck at its start. */
  enter(i: number) {
    this.si = i; const st = (this.st = buildStage(this.world!, i, this.atlas));   // laid out while the picture is faded out
    this.eng!.setDrive(st.tex); this.eng!.cut();
    const w2 = st.track.width(0) / 2;
    this.s = 0; this.d = st.track.kind(0) & 1 ? 0 : -w2 / 2; this.psi = 0; this.steer = 0; this.curv = 0; this.v = i === 0 ? 0 : Math.min(this.v, 15);
    this.camH = st.track.head(0); this.fresh = true; this.cardT = 0; this.fade = 1; this.fadeDir = -1;
    this.sheep = [];
    if (st.raw.id === 'onenui') for (let k = 0; k < 6; k++) { const s = 300 + k * 85 + Math.random() * 30; this.sheep.push({ s, d: (k % 2 ? 1 : -1) * (st.track.width(s) / 2 + 3 + Math.random() * 6), h: Math.random() * 6.28, step: 0, mode: 0, t: 0 }); }
    this.callText = ''; this.said = {};
  }
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
  say(k: string, s: string) { if (this.said[k]) return; this.said[k] = true; this.callText = s; this.callT = 0; }

  // ------------------------------------------------------------------ the truck
  update(_t: number, dms: number) {
    if (!this.ready || !this.st) return;
    const dt = Math.min(0.05, dms / 1000), st = this.st, tr = st.track; this.t += dt; this.callT += dt;
    // the cards between stretches: fade out, lay the next one out, fade in
    if (this.fadeDir !== 0) {
      this.fade = clamp(this.fade + this.fadeDir * dt * 1.6, 0, 1);
      if (this.fadeDir > 0 && this.fade >= 1) {
        if (this.si + 1 < this.world!.stages.length) { this.enter(this.si + 1); return; }
      }
      if (this.fadeDir < 0 && this.fade <= 0) this.fadeDir = 0;
    }
    this.cardT += dt;
    if (this.ended) { this.v = Math.max(0, this.v - 6 * dt); this.audioStep(dt); return; }
    const w2 = tr.width(this.s) / 2, kind = tr.kind(this.s), gravel = !!(kind & 1), town = !!(kind & 16);
    // ---- the keys, or the bot
    let thr = held('up') ? 1 : 0, brk = held('down') ? 1 : 0, str = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
    if (just('b')) this.camMode = (this.camMode + 1) % 3;
    let hornNow = just('a');
    if (AUTO) ({ thr, brk, str, horn: hornNow } = this.bot());
    if (this.fadeDir > 0) { thr = 0; brk = 0.5; }
    if (!this.started && (thr || str)) { this.started = true; }
    if (hornNow && this.horn <= 0) { snd.horn(); this.horn = 0.7; for (const sh of this.sheep) if (sh.mode < 2 && Math.abs(sh.s - this.s) < 70) { sh.mode = 2; sh.t = 0; } }
    this.horn -= dt;
    if (this.started && this.fadeDir <= 0) this.clock += dt;
    // ---- grip: what the tyres are on
    const ad = Math.abs(this.d), off = ad - w2, onVerge = off > (gravel ? 0.6 : 0.9);
    const mu = onVerge ? 0.38 : gravel ? 0.5 : 0.78;
    // ---- steering: keys turn the wheel at a rate; the curvature it asks for is limited by speed and grip
    const vv = Math.max(this.v, 0.5), cMax = Math.min(Math.tan(0.6) / WB, (mu * 1.12 * G) / (vv * vv));
    const assist = tr.curv(this.s + this.v * 0.4) * 0.65;                    // the hands follow the road a little
    const want = clamp(assist + str * cMax, -cMax, cMax);
    this.curv += clamp(want - this.curv, -dt * (1.4 / WB), dt * (1.4 / WB)) * (str || Math.abs(want - this.curv) > 0.002 ? 1 : 0.5);
    let c = this.curv; const latWant = this.v * this.v * c, latMax = mu * G;
    let slide = 0; if (Math.abs(latWant) > latMax) { slide = Math.abs(latWant) / latMax - 1; c = (Math.sign(c) * latMax) / (this.v * this.v); }
    this.steer = Math.atan(this.curv * WB);
    // ---- along the road: engine, brakes, the grade, rolling and air
    const grade = tr.grade(this.s), rev = this.v < 0.3 && brk && !thr;
    let a = thr ? Math.min(2.1, 180000 / (14000 * Math.max(this.v, 3))) * (this.v < GOVERNOR ? 1 : 0) : 0;
    if (brk && !rev) a -= (gravel || onVerge ? 4.2 : 6.0) * Math.sign(this.v || 1);
    if (rev) a = -1.2;
    a -= G * grade + (0.009 * G + (0.5 * 1.2 * 6.2 * this.v * Math.abs(this.v)) / 14000) * Math.sign(this.v) + (onVerge ? 1.6 * Math.sign(this.v) : 0);
    this.v = this.v + a * dt; if (!thr && !rev && Math.abs(this.v) < 0.25 && !brk) this.v *= 0.9; if (brk && !rev && this.v > 0 && this.v + a * dt < 0) this.v = 0;
    this.v = clamp(this.v, -4, GOVERNOR + 0.3); this.acc = a; this.brake = brk && this.v > 0.2 ? 1 : 0;
    // ---- the bicycle model in the road's own frame
    const k = tr.curv(this.s), ds = (this.v * Math.cos(this.psi)) / Math.max(0.2, 1 - k * this.d);
    this.psi += (this.v * c - k * ds) * dt; this.psi = clamp(this.psi, -1.2, 1.2);
    this.d += this.v * Math.sin(this.psi) * dt; this.s += ds * dt;
    this.lat = this.v * this.v * c; this.spin += (this.v / 0.52) * dt;
    // ---- the load: hard corners, bumps at speed, the verge
    const latG = Math.abs(this.lat) / G;
    let strainR = latG > 0.28 ? (latG - 0.28) * 1.6 : 0;
    if (gravel && this.v > 13) strainR += (this.v - 13) * 0.0025;
    if (onVerge && this.v > 4) strainR += 0.035;
    if (slide > 0) strainR += slide * 0.25;
    this.strain = Math.min(1, this.strain + strainR * dt);
    this.shift = lerp(this.shift, this.strain * 0.22 * Math.sign(this.lat || 1), dt * 0.6);
    if (st.cattle !== undefined && Math.abs(this.s - st.cattle) < 1.2 && !this.said.cattle) { this.said.cattle = true; snd.rattle(); this.bump = 1; const kmh = this.v * 3.6; if (kmh > 25) { this.strain = Math.min(1, this.strain + (kmh - 25) * 0.008); this.say('cattleHard', `Over the cattle stop at ${kmh.toFixed(0)} km/h: the load jumped on its straps`); } }
    this.bump = Math.max(0, this.bump - dt * 3);
    this.dust = lerp(this.dust, gravel || onVerge ? clamp((Math.abs(this.v) - 3) / 14, 0, 1) : 0, dt * 1.5);
    if (st.cattle !== undefined && this.s > st.cattle - 140 && this.s < st.cattle - 20) this.say('cattleAhead', 'Cattle stop ahead · slow to 25 km/h');
    for (const [cs, apex, adv] of st.curves) if (this.s > cs && this.s < apex + 10 && this.v * 3.6 > adv - 6) { this.say('adv' + cs, `${adv} km/h bend: a loaded truck takes it 10 under the sign`); break; }
    // ---- off the road: into the fence, the bank or over the edge
    const [x, z] = tr.pos(this.s, this.d), gy = st.ground(x, z), ry = tr.height(this.s);
    if (off > 3.0 || (off > 1.2 && Math.abs(gy - ry) > 1.4)) this.crash(off > 3.0 ? 'Off the road and into the fence line' : gy < ry ? 'Over the edge of the road' : 'Into the bank');
    // ---- sheep: they wander, step out, and move off for the horn
    for (const sh of this.sheep) {
      sh.t += dt; const dS = sh.s - this.s;
      if (sh.mode === 0 && dS > 20 && dS < 120 && Math.random() < dt * 0.12) { sh.mode = 1; sh.t = 0; }
      if (sh.mode === 1) { const goal = (sh.d > 0 ? -1 : 1) * 0.8, dd = goal - sh.d; sh.d += Math.sign(dd) * Math.min(Math.abs(dd), dt * 0.7); sh.h = Math.atan2(0, 1) + (dd > 0 ? Math.PI / 2 : -Math.PI / 2); sh.step += dt * 2; }
      if (sh.mode === 2) { const side = sh.d >= 0 ? 1 : -1, goal = side * (tr.width(sh.s) / 2 + 6); sh.d += side * Math.min(Math.abs(goal - sh.d), dt * 3.2); sh.step += dt * 6; sh.h = side > 0 ? Math.PI / 2 : -Math.PI / 2; }
      if (sh.mode === 0) { sh.step += dt * 0.3; sh.h += Math.sin(sh.t * 0.3 + sh.s) * dt * 0.2; }
      if (dS > 0 && dS < 60 && Math.abs(sh.d) < tr.width(sh.s) / 2 + 0.5) this.say('sheep', 'Sheep on the road · Space for the horn');
      if (dS > 1 && dS < 7.5 + this.v * 0.25 && Math.abs(sh.d - this.d) < 2.0 && this.v > 2.5) {        // the truck stands on its brakes; the sheep trots off
        this.strain = Math.min(1, this.strain + 0.06 + this.v * 0.008); this.v = 0; this.stops++; sh.mode = 2; snd.horn(); this.callText = 'A sheep would not move: an emergency stop, and the load took it'; this.callT = 0;
      }
    }
    if (this.strain >= 1) return this.lose('The load shifted on its saddles. Ease off in the corners and over the bumps: the bar on the right is how much the straps have taken.');
    // ---- the easter egg and the blueprint
    if (st.egg && !this.egg) { const [ex, ez] = st.egg; if (Math.hypot(ex - x, ez - z) < 26 && this.v < 30 / 3.6) { this.egg = true; this.callText = 'A garden gnome on a fence post, watching the traffic'; this.callT = 0; snd.select(); } }
    if (st.blueprint && !this.secret) { const [bs, bd] = st.blueprint; if (Math.abs(this.s - bs) < 3 && Math.abs(this.d - bd) < 1.6 && this.v < 25 / 3.6) { this.secret = true; this.callText = 'A blueprint, blown off the deck: picked up'; this.callT = 0; snd.select(); } }
    // ---- the end of the stretch
    const last = this.si + 1 === this.world!.stages.length;
    if (!last && this.s >= tr.len && this.fadeDir === 0) { this.times.push(this.clock); this.fadeDir = 1; }
    if (last && this.s > tr.len - 8 && (Math.abs(this.v) < 0.6 || this.s > tr.len + 10)) return this.arrive();
    if (this.si + 1 === this.world!.stages.length && this.s > tr.len - 90) this.say('stop', 'Launch Complex 1 · bring it to a stop on the hard standing');
    this.audioStep(dt);
  }
  audioStep(dt: number) {
    const tr = this.st!.track, kind = tr.kind(this.s), rpm = clamp(((Math.abs(this.v) * 3.6) % 30) / 30 * 0.6 + Math.abs(this.v) / GOVERNOR * 0.35 + (held('up') || AUTO ? 0.08 : 0), 0, 1);
    this.diesel?.set(0.55 + 0.45 * (held('up') ? 1 : 0.4), rpm); this.tyres?.set(clamp(Math.abs(this.v) / 20, 0, 1), clamp(Math.abs(this.v) / 25, 0, 1) + (kind & 1 ? 1.01 : 0));
    const id = this.st!.raw.id; this.sea?.set(id === 'blowhole' || id === 'eastcoast' || id === 'mahia' ? 0.7 : id === 'onenui' ? 0.35 : 0.08);
  }
  crash(why: string) {
    if (this.fadeDir > 0) return;
    this.crashes++; this.penalty += 8; this.clock += 8; this.strain = Math.min(1, this.strain + 0.18); snd.crash();
    const tr = this.st!.track; this.s = Math.max(0, this.s - 15); this.d = tr.kind(this.s) & 1 ? 0 : -tr.width(this.s) / 4; this.psi = 0; this.v = 3; this.curv = tr.curv(this.s); this.fresh = true; this.eng?.cut();
    this.callText = `${why}. Back on the road: 8 s lost`; this.callT = 0;
  }
  /** The bot: speed from the bends ahead and the strain they would put on the load, steering after a point on the left lane. */
  bot() {
    const tr = this.st!.track, w2 = tr.width(this.s) / 2, gravel = !!(tr.kind(this.s) & 1);
    let vt = GOVERNOR - 0.3;
    for (let q = 0; q < 190; q += 4) { const k = Math.abs(tr.curv(this.s + q)), g2 = tr.kind(this.s + q) & 1 ? 0.5 : 0.78, lim = Math.min(0.21 * G, g2 * G * 0.7), vk = k > 1e-4 ? Math.sqrt(lim / k) : 99, vmax = Math.sqrt(vk * vk + 2 * 2.6 * Math.max(q - 8, 0)); vt = Math.min(vt, vmax); }
    if (tr.kind(this.s) & 1) vt = Math.min(vt, 13);
    if (tr.kind(this.s + 30) & 32) vt = Math.min(vt, 50 / 3.6);                        // the bot keeps to the town's limit
    const st = this.st!;
    if (st.cattle !== undefined) { const dS = st.cattle - this.s; if (dS > -2 && dS < 60) vt = Math.min(vt, Math.sqrt(6.5 * 6.5 + 2 * 3 * Math.max(dS - 3, 0))); }
    if (st.egg && !this.egg) { const [ex, ez] = st.egg, [x, z] = tr.pos(this.s, this.d); const dd = Math.hypot(ex - x, ez - z); if (dd < 90) vt = Math.min(vt, 7.5); }
    let horn = false;
    for (const sh of this.sheep) { const dS = sh.s - this.s; if (dS > 0 && dS < 70 && sh.mode < 2 && Math.abs(sh.d) < tr.width(sh.s) / 2 + 2) { horn = true; vt = Math.min(vt, Math.max(3, dS / 4)); } if (dS > 0 && dS < 25 && Math.abs(sh.d - this.d) < 2.2) vt = Math.min(vt, 1.5); }
    let tD = gravel ? 0 : -w2 / 2;
    if (st.blueprint && !this.secret) { const [bs, bd] = st.blueprint, dS = bs - this.s; if (dS > -2 && dS < 140) { tD = lerp(tD, bd * 0.95, sstep(140, 60, dS)); vt = Math.min(vt, Math.sqrt(5.5 * 5.5 + 2 * 2.2 * Math.max(dS, 0))); } }
    if (this.si + 1 === this.world!.stages.length) { const dS = tr.len - this.s; vt = Math.min(vt, Math.sqrt(Math.max(0, 2 * 2.5 * (dS + 1)))); }
    const L = Math.max(9, this.v * 1.1), sA = this.s + L, cA = tr.curv(sA);
    // pure pursuit on the road's frame: the lateral error at the lookahead point, and the heading error
    const err = tD - (this.d + Math.sin(this.psi) * L), want = cA + (2 * err) / (L * L);
    const cMax = Math.min(Math.tan(0.6) / WB, (0.6 * G) / Math.max(this.v * this.v, 0.25)), assist = tr.curv(this.s + this.v * 0.4) * 0.65;
    const str = clamp((want - assist) / cMax, -1, 1);
    const thr = this.v < vt - 0.4 ? 1 : 0, brk = this.v > vt + 0.6 ? 1 : 0;
    return { thr, brk, str: Math.abs(str) < 0.05 ? 0 : str, horn };
  }
  arrive() {
    this.ended = true; this.times.push(this.clock); this.scoreRun();
  }
  scoreRun() {
    const time = this.clock, par = this.def.params?.par ?? 300, load = Math.round(this.strain * 100);
    const stars = time <= par && this.strain <= 0.35 ? 3 : time <= par * 1.3 && this.strain <= 0.7 ? 2 : 1;
    const mm = Math.floor(time / 60), ss = Math.floor(time % 60);
    this.callText = 'Delivered · the tank is at the pad'; this.callT = 0;
    this.time.delayedCall(AUTO ? 1500 : 3200, () => finish(this, this.def, { success: true, stars, egg: this.egg, secret: this.secret, title: `At the pad in ${mm}:${String(ss).padStart(2, '0')}`, text: `The liquid-oxygen tank reached Launch Complex 1 with ${load}% of its straps’ allowance used${this.crashes ? `, after ${this.crashes} trip${this.crashes > 1 ? 's' : ''} off the road` : ''}${this.stops ? ` and ${this.stops} emergency stop${this.stops > 1 ? 's' : ''} for sheep` : ''}.${stars < 3 ? ` Three stars for ${Math.floor(par / 60)}:${String(Math.round(par % 60)).padStart(2, '0')} or less with the load under 35%.` : ''}` }));
  }
  lose(text: string) { this.ended = true; snd.crash(); this.callText = 'The load has shifted'; this.callT = 0; this.time.delayedCall(1400, () => finish(this, this.def, { success: false, title: 'The load shifted', text })); }

  // ------------------------------------------------------------------ the picture
  frame(): Frame {
    const st = this.st!, tr = st.track;
    const [x, z] = tr.pos(this.s, this.d), h0 = tr.head(this.s) + this.psi, fx = Math.cos(h0), fz = Math.sin(h0);
    const yb = st.ground(x, z), yf = st.ground(x + fx * WB, z + fz * WB), rxv = -fz, rzv = fx, yl = st.ground(x - rxv * 1.0, z - rzv * 1.0), yr = st.ground(x + rxv * 1.0, z + rzv * 1.0);
    const bodyRoll = clamp(-this.lat * 0.011, -0.06, 0.06), bodyPitch = clamp(-this.acc * 0.006, -0.03, 0.03) + this.bump * 0.03 * Math.sin(this.t * 40);
    let F = norm([fx, yf - yb, fz]); const pitchA = Math.atan2(yf - yb, WB) + bodyPitch; F = norm([fx * Math.cos(pitchA), Math.sin(pitchA), fz * Math.cos(pitchA)]);
    const rollA = Math.atan2(yr - yl, 2.0) + bodyRoll, Rt0: V3 = [-F[2], 0, F[0]], Rn = norm(Rt0);
    const up0: V3 = [Rn[1] * F[2] - Rn[2] * F[1], Rn[2] * F[0] - Rn[0] * F[2], Rn[0] * F[1] - Rn[1] * F[0]];
    const cr = Math.cos(rollA), sr = Math.sin(rollA);
    const Rt: V3 = [Rn[0] * cr + up0[0] * sr, Rn[1] * cr + up0[1] * sr, Rn[2] * cr + up0[2] * sr], Up: V3 = [up0[0] * cr - Rn[0] * sr, up0[1] * cr - Rn[1] * sr, up0[2] * cr - Rn[2] * sr];
    const truck: V3 = [x, yb + 0.02, z];
    // the camera: behind and above, lagging the truck's turns a little; or low and wide; or from the cab
    if (this.fresh || this.settle) this.camH = h0;
    const dh = ((h0 - this.camH + Math.PI * 3) % (Math.PI * 2)) - Math.PI; if (!this.scene.isPaused() || this.settle) this.camH += dh * Math.min(1, this.fdt * 2.6);
    const cx = Math.cos(this.camH), cz = Math.sin(this.camH);
    let camO: V3, look: V3, fov: number;
    if (this.camMode === 0) { camO = [-cx * 15.5, 5.4, -cz * 15.5]; look = [cx * 14, 1.2, cz * 14]; fov = 52 + Math.abs(this.v) * 0.22; }
    else if (this.camMode === 1) { camO = [-cx * 13 - cz * 3.2, 1.7, -cz * 13 + cx * 3.2]; look = [cx * 12, 2.0, cz * 12]; fov = 58 + Math.abs(this.v) * 0.25; }
    else { const off = [Rt[0] * 0.55 + Up[0] * 2.75 + F[0] * 6.2, Rt[1] * 0.55 + Up[1] * 2.75 + F[1] * 6.2, Rt[2] * 0.55 + Up[2] * 2.75 + F[2] * 6.2] as V3; /* the driver's seat: New Zealand trucks are right-hand drive */ camO = off; look = [off[0] + F[0] * 20, off[1] + F[1] * 20 - 0.6, off[2] + F[2] * 20]; fov = 58; }
    if (this.camMode < 2) { const gy = st.ground(x + camO[0], z + camO[2]); camO[1] = Math.max(camO[1], gy - truck[1] + 1.1); }
    // smooth the chase camera's position so a bump does not throw it about
    const k = this.fresh || this.settle ? 1 : 1 - Math.exp(-this.fdt * 7); this.camP = [lerp(this.camP[0], camO[0], k), lerp(this.camP[1], camO[1], k), lerp(this.camP[2], camO[2], k)]; if (this.camMode === 2) this.camP = camO;
    this.fresh = false;
    const sheep = new Float32Array(24).fill(0); for (let i = 0; i < 6; i++) { const sh = this.sheep[i]; if (!sh) { sheep[i * 4] = 2e5; continue; } const [sx, sz] = tr.pos(sh.s, sh.d); sheep.set([sx, sz, tr.head(sh.s) + sh.h, sh.step], i * 4); }
    const vx = this.v * fx, vz = this.v * fz, vy = this.v * (F[1] / Math.max(Math.hypot(F[0], F[2]), 0.1));
    const og = [this.world!.stages[this.si].o[0] / 1000, this.world!.stages[this.si].o[1] / 1000];
    return {
      time: this.t, cam: this.camP, look, fov, roll: 0, shake: this.bump * 0.3 + (tr.kind(this.s) & 1 ? clamp(this.v / 25, 0, 1) * 0.05 : 0),
      alt: truck[1] / 1000, travel: [og[0] + x / 1000, og[1] + z / 1000], drop: -vy, speed: [vx / 1000, vz / 1000],
      sun: this.sun, body: [1, 0, 0, 0, 1, 0, 0, 0, 1], vel: [0, 1, 0], hot: 0, scorch: 0, glow: 0, rcs: [0, 0, 0, 0], chuteAxis: [0, 1, 0], drogue: 0, main: 0, splash: -1, s2: [0, 1, 0, 0], ship: null,
      exposure: 0.215, flash: 0,
      drive: { truck, m: [...Rt, ...Up, ...F], drv: [this.steer, this.spin, this.brake, this.shift], sheep, pad: st.pad || [2e5, 0, 0, 0], bridge: [tr.bridge[0], tr.bridge[1], 0.9, 1.1], bridgeB: this.bridgeBox(), look: [this.dust, 0, 1, this.si] },
    };
  }
  bridgeBox(): [number, number, number, number] {
    const tr = this.st!.track; if (tr.bridge[0] >= tr.bridge[1]) return [0, 0, 0, 0];
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity; for (let s = tr.bridge[0] - 8; s <= tr.bridge[1] + 8; s += 4) for (const d of [-14, 14]) { const [x, z] = tr.pos(s, d); x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
    return [x0, z0, x1, z1];
  }
  present() {
    if (!this.ready || !this.box || !this.st) return;
    if (this.scene.isPaused()) { if (++this.idle > 40) return; } else this.idle = 0;
    { const now = this.time.now; this.fdt = this.lastP < 0 ? 1 / 60 : clamp((now - this.lastP) / 1000, 0, 0.1); this.lastP = now; }
    this.fit(); this.eng!.render(this.frame()); this.hud();
  }
  /** Dev: the frame as a JPEG data URL (world and instruments). */
  shot(q = 0.9) { this.fit(); this.eng!.render(this.frame()); this.hud(); const c = document.createElement('canvas'); c.width = this.eng!.canvas.width; c.height = this.eng!.canvas.height; const x = c.getContext('2d')!; x.drawImage(this.eng!.canvas, 0, 0); x.drawImage(this.hudC!, 0, 0); return c.toDataURL('image/jpeg', q); }

  // ------------------------------------------------------------------ the instruments
  hud() {
    const cv = this.hudC!, c = cv.getContext('2d')!, k = cv.height / 720, st = this.st!, raw = st.raw, tr = st.track, data = this.world!;
    c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, 1280, 720);
    const F = (px: number, w = 600) => `${w} ${px}px "Chakra Petch", system-ui, sans-serif`;
    const txt = (s: string, x: number, y: number, px: number, col: string, al: CanvasTextAlign = 'left', w = 600, sp = 0) => { c.font = F(px, w); c.textAlign = al; (c as any).letterSpacing = sp + 'px'; c.shadowColor = 'rgba(0,0,0,.75)'; c.shadowBlur = 6; c.fillStyle = col; c.fillText(s, x, y); c.shadowBlur = 0; };
    const DIM = 'rgba(220,228,240,.72)', WH = 'rgba(255,255,255,.96)', AM = '#ffcf6b', RD = '#ff5d4a', GR = '#7fe08a';
    { const g = c.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, 'rgba(2,5,12,.42)'); g.addColorStop(1, 'rgba(2,5,12,0)'); c.fillStyle = g; c.fillRect(0, 0, 1280, 150); const g2 = c.createLinearGradient(0, 720, 0, 560); g2.addColorStop(0, 'rgba(2,5,12,.45)'); g2.addColorStop(1, 'rgba(2,5,12,0)'); c.fillStyle = g2; c.fillRect(0, 560, 1280, 160); }
    // top left: where we are
    const km = raw.km[0] + Math.max(0, Math.min(this.s, tr.len)) / 1000;
    txt(raw.way.toUpperCase(), 44, 50, 12, DIM, 'left', 700, 2.2); txt(raw.name, 44, 80, 26, WH, 'left', 700, 0.5);
    txt(`KM ${km.toFixed(1)} OF ${(data.total / 1000).toFixed(0)} · WAIROA TO LAUNCH COMPLEX 1`, 44, 102, 11, DIM, 'left', 600, 1.5);
    const mm = Math.floor(this.clock / 60), ss = this.clock % 60; txt(`${String(mm).padStart(2, '0')}:${ss.toFixed(1).padStart(4, '0')}`, 1236, 64, 30, WH, 'right', 700, 1); txt(this.started ? 'DRIVING TIME' : '↑ TO SET OFF', 1236, 84, 11, this.started ? DIM : AM, 'right', 700, 2);
    if (this.t < 6 && this.si === 0) { const pl = this.def.params?.plate as [string, string] | undefined, h = hero(this.def), a = Math.min(1, this.t * 2) * sstep(6, 5, this.t); c.globalAlpha = a; txt((pl ? pl[0] : h.name).toUpperCase(), 44, 140, 14, WH, 'left', 700, 1.5); txt(pl ? pl[1] : this.def.role || '', 44, 158, 12, AM, 'left', 600, 0.5); c.globalAlpha = 1; }
    // the route: six stretches on a line, and the truck on it
    const rx0 = 430, rx1 = 850, ry = 44; c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(rx0, ry); c.lineTo(rx1, ry); c.stroke();
    for (const [i, s2] of data.stages.entries()) { const a = rx0 + (rx1 - rx0) * (s2.km[0] * 1000 / data.total), b = rx0 + (rx1 - rx0) * (s2.km[1] * 1000 / data.total); c.strokeStyle = i < this.si ? GR : i === this.si ? AM : 'rgba(255,255,255,.7)'; c.lineWidth = 5; c.beginPath(); c.moveTo(a, ry); c.lineTo(Math.max(b, a + 3), ry); c.stroke(); }
    const tx = rx0 + (rx1 - rx0) * (km * 1000 / data.total); c.fillStyle = WH; c.beginPath(); c.moveTo(tx, ry - 6); c.lineTo(tx - 5, ry - 14); c.lineTo(tx + 5, ry - 14); c.fill();
    txt('WAIROA', rx0, ry + 18, 9, DIM, 'left', 700, 1.5); txt('LC-1', rx1, ry + 18, 9, DIM, 'right', 700, 1.5);
    // bottom left: the speedometer
    const kmh = Math.abs(this.v) * 3.6, sx = 120, sy = 640, R = 66;
    c.lineWidth = 7; c.strokeStyle = 'rgba(6,10,20,.45)'; c.beginPath(); c.arc(sx, sy, R, Math.PI * 0.8, Math.PI * 2.2); c.stroke();
    c.strokeStyle = kmh > 88 ? AM : WH; c.beginPath(); c.arc(sx, sy, R, Math.PI * 0.8, Math.PI * 0.8 + Math.PI * 1.4 * clamp(kmh / 100, 0, 1)); c.stroke();
    const gv = Math.PI * 0.8 + Math.PI * 1.4 * 0.9; c.strokeStyle = RD; c.lineWidth = 3; c.beginPath(); c.moveTo(sx + Math.cos(gv) * (R - 9), sy + Math.sin(gv) * (R - 9)); c.lineTo(sx + Math.cos(gv) * (R + 9), sy + Math.sin(gv) * (R + 9)); c.stroke();
    txt(kmh.toFixed(0), sx, sy + 8, 34, WH, 'center', 700); txt('KM/H', sx, sy + 26, 10, DIM, 'center', 700, 2);
    const kind = tr.kind(this.s); txt(kind & 1 ? 'GRAVEL' : kind & 32 ? 'TOWN · 50' : 'SEALED', sx, sy - 34, 10, kind & 32 && kmh > 55 ? AM : DIM, 'center', 700, 2);
    // bottom right: the load
    const bx = 1040, by = 640, bw = 200;
    txt('LOAD · STRAPS', bx, by - 10, 10, DIM, 'left', 700, 2); txt(`${Math.round(this.strain * 100)}%`, bx + bw, by - 10, 12, this.strain > 0.7 ? RD : WH, 'right', 700);
    c.fillStyle = 'rgba(6,10,20,.5)'; c.fillRect(bx, by, bw, 7); c.fillStyle = this.strain > 0.7 ? RD : this.strain > 0.35 ? AM : '#8fd3ff'; c.fillRect(bx, by, bw * this.strain, 7);
    c.strokeStyle = WH; c.lineWidth = 1.5; c.beginPath(); c.moveTo(bx + bw * 0.35, by - 3); c.lineTo(bx + bw * 0.35, by + 10); c.stroke();
    const latG = Math.abs(this.lat) / G; txt(`${latG.toFixed(2)} G SIDEWAYS`, bx, by + 26, 10, latG > 0.28 ? AM : DIM, 'left', 700, 1.5);
    // the calls
    if (this.callText && this.callT < 5) { c.globalAlpha = sstep(5, 4.2, this.callT); txt(this.callText, 640, 128, 17, AM, 'center', 600, 0.5); c.globalAlpha = 1; }
    // the card at the start of each stretch, and the fade between them
    if (this.fade > 0) { c.fillStyle = `rgba(3,5,9,${this.fade})`; c.fillRect(0, 0, 1280, 720); }
    const ca = this.fadeDir > 0 ? 0 : Math.min(1, this.cardT * 1.5) * sstep(6.5, 5.2, this.cardT);
    if (ca > 0.01) {
      c.globalAlpha = ca;
      c.fillStyle = 'rgba(4,7,12,.55)'; c.fillRect(340, 520, 600, 120);
      txt(`${this.si + 1} / ${data.stages.length} · KM ${raw.km[0].toFixed(0)}`, 360, 546, 11, AM, 'left', 700, 2);
      txt(raw.name, 360, 574, 22, WH, 'left', 700);
      c.font = F(12, 500); const words = (this.notes[raw.id] || '').split(' '); let line = '', y = 596;
      for (const w of words) { if (c.measureText(line + w).width > 560) { txt(line, 360, y, 12, DIM, 'left', 500); line = ''; y += 16; } line += w + ' '; }
      txt(line, 360, y, 12, DIM, 'left', 500); c.globalAlpha = 1;
    }
  }
}
