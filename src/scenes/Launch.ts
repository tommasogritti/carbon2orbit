import Phaser from 'phaser';
import { W, H, T, held, just, finish, cam, img, panel, who } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import { P, S } from '../art';
import type { LevelDef } from '../content';
import * as L from '../launchSim';
import { hifi, HiFi } from '../hifi';
import { LOOKS } from '../hifiLooks';

const AUTO = new URLSearchParams(location.search).has('auto');
const DEG = Math.PI / 180, RX = 154; // the rocket's screen column
const gY = (a: number) => 70 * Math.log2(1 + a * 1.5); // screen offset of the ground at altitude a (km)
const km = (m: number) => (m / 1000).toFixed(0);
const clock = (t: number) => `${String(Math.floor(Math.abs(t) / 60)).padStart(2, '0')}:${String(Math.floor(Math.abs(t) % 60)).padStart(2, '0')}`;
const clamp = Phaser.Math.Clamp;
type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;
type Txt = Phaser.GameObjects.Text;
const refs = new Map<string, L.Ref>();
const STATIONS = ['PROP', 'AVIONICS', 'GNC', 'RANGE', 'WEATHER'];
const NOGO = ['LOX temperature out of limits', 'telemetry dropout', 'IMU alignment not converged', 'vessel in the hazard area', 'upper-level winds out of limits'];
const GO_LABEL: Record<string, string> = { liftoff: 'LIFT-OFF · RELEASE HOLD-DOWNS', sep: 'STAGE SEPARATION', ses: 'STAGE 2 IGNITION', fairing: 'FAIRING JETTISON', swap: 'BATTERY HOT-SWAP', dart: 'RELEASE THE DART', release: 'RELEASE TEST ARTICLE' };
/** A scripted stand-down on the first count: `at` is the count it happens at, `lit` whether the engines are already running. */
interface Scrub { at: number; lit?: boolean; text: string; resume: string }
const STILL_TESTING: Scrub = { at: 1.2, lit: true, text: 'ABORT at T-2 · LOX too warm · scrubbed for the day', resume: '21 January 2018 · new attempt · T-8' }; // 12 December 2017: the real attempt was scrubbed, and flew 40 days later
/** Directions (degrees from prograde) the kick stage points for each release, so no two satellites leave the same way. */
const DEPLOY_DIR = [0, 180, 70, 250, 130, 310, 30, 210];
const fmt = (n: number) => Math.round(n).toLocaleString('en-NZ');
/** One step of a kick-stage flight plan: burn to circularise at apogee, raise apogee, lower perigee, or let a payload go. */
interface PlanStep { do: 'circ' | 'raise' | 'lower' | 'deploy'; alt?: number; name?: string; mass?: number }
const STEP_LABEL = (st: PlanStep) => st.do === 'circ' ? `CIRCULARISE AT ${fmt(st.alt!)} km` : st.do === 'raise' ? `RAISE APOGEE TO ${fmt(st.alt!)} km` : st.do === 'lower' ? `DE-ORBIT BURN · PERIGEE ${fmt(st.alt!)} km` : `DEPLOY ${st.name!.toUpperCase()}`;
/** Launch sites with a hi-fi look (hifiLooks.ts): the day sky, the site, the clouds and space are redrawn, and the consoles move to the HUD camera. */
const SITE_LOOK: Record<string, string> = { island: 'mercury' };
/** A flight with its own light at a shared site: Launch Complex 1 on the day and at the hour each mission flew (looks/lc1.ts). */
const LEVEL_LOOK: Record<string, string> = {
  'its-a-test': 'lc1-test', 'still-testing': 'lc1-still', 'its-business-time': 'lc1-business',
  'paschens-law': 'lc1-moongod',
};
/** Flights that left after sunset, each with the evening it had (looks/evening.ts); any other dusk or night flight keeps the plain look. */
const EVE_LOOK: Record<string, string> = {
  'lc-2': 'wallops-dusk',
  haste: 'wallops-night',
  'paschens-law': 'lc1-desert',
};
const TIMELINE: [string, string, number][] = [['maxq', 'MAX-Q', -1], ['meco', 'MECO', 1], ['fairing', 'FAIRING', -1], ['swap', 'HOT-SWAP', 1], ['seco', 'SECO', -1]];

/**
 * Launch control. Orbital rockets: call the count, fly the pitch program on the flight director, throttle through Max-Q,
 * command staging, fairing and the battery hot-swap, cut off on the target apogee, then circularise with the kick stage.
 * Sounding rockets are unguided: aim the rail against the wind, then release the dart at burnout.
 */
export class LaunchScene extends Phaser.Scene {
  def!: LevelDef; p: any; v!: L.Vehicle; s!: L.Sim; m!: L.Mission; ref?: L.Ref; ung = false;
  dark!: Phaser.GameObjects.Rectangle; stars!: Phaser.GameObjects.Image; ground!: Phaser.GameObjects.Image; earth!: Phaser.GameObjects.Image;
  clouds: { o: Phaser.GameObjects.Image; alt: number }[] = []; streaks: Phaser.GameObjects.Rectangle[] = [];
  rocket!: Phaser.GameObjects.Container; s1!: Phaser.GameObjects.Image; s2?: Phaser.GameObjects.Image; flame!: Emitter; flame2!: Emitter; smoke!: Emitter;
  g!: Phaser.GameObjects.Graphics; clockT!: Txt; tele!: Txt; call!: Txt; prompt!: Txt; hint!: Txt; warpT!: Txt; dialT!: Txt; plotT!: Txt[]; lab: Txt[] = []; val: Txt[] = []; poll: Txt[] = []; tl: Txt[] = [];
  rumble!: Loop; sea!: Loop; patch?: Phaser.GameObjects.Image; hf?: HiFi;
  ended = false; count = 12; pollT = 0; holdT = 0; resume = ''; nogo?: { i: number; at: number; shown: boolean; done: boolean }; missed = false; scrubbed = true; lastC = 99;
  warp = 1; trail: { d: number; a: number }[] = []; trailT = 0; said: Record<string, boolean> = {}; alarmT = 0; why = ''; sawQ = 0; seco0?: L.Orbit; margin = 0; stageDelay = 0;
  // sounding rocket
  nose = 15; mach = 0; noseMax = 15; // nose-tip temperature (°C) and Mach number, for the sounding rocket's readouts
  elev = 82; windBase = 0; armed = false; pred?: L.Ballistic; predT = 0; zone: [number, number] = [35, 65];
  kick?: { g: Phaser.GameObjects.Graphics; craft: Phaser.GameObjects.Image; info: Txt; tip: Txt; passes: number; lastTAp: number; burning: boolean; botDone: boolean; done: boolean; burned: boolean };
  kickT: Txt[] = []; sc?: Scrub; aftsT = 0; aftsMin = 1; kr = [30, 0.055]; kRings: number[] = []; pi = 0; planLog: { name: string; ap: number; pe: number; err: number }[] = []; planBot = { burning: false, t: 0 }; aftsTxt?: Txt; secoV = 0; tlKeys: [string, string, number][] = [];
  dep?: { i: number; ang: number; rate: number; since: number; rushed: number; names: string[]; icon: Phaser.GameObjects.Image; g: Phaser.GameObjects.Graphics; sail?: boolean; end: number };
  constructor() { super('Launch'); }
  init(d: { def: LevelDef }) {
    this.def = d.def; this.p = d.def.params; this.v = L.VEHICLES[this.p.vehicle]; this.ung = !!this.v.unguided;
    this.ended = false; this.kick = undefined; this.streaks = []; this.clouds = []; this.lab = []; this.val = []; this.poll = []; this.tl = [];
    this.count = 12; this.pollT = 0; this.holdT = 0; this.missed = false; this.scrubbed = !this.p.scrub; this.lastC = 99; this.warp = 1; this.trail = []; this.trailT = 0; this.said = {}; this.alarmT = 0; this.why = ''; this.sawQ = 0; this.seco0 = undefined; this.stageDelay = 0; this.aftsT = 0; this.aftsMin = 1; this.aftsTxt = undefined; this.pi = 0; this.planLog = []; this.planBot = { burning: false, t: 0 };
    const plan = this.p.plan as PlanStep[] | undefined; this.kRings = plan ? [...new Set(plan.filter((q) => q.do === 'circ').map((q) => q.alt! * 1000))] : []; this.kr = plan ? [25, 0.042] : [30, 0.055]; this.secoV = 0; this.dep = undefined;
    this.sc = this.p.scrub === true ? STILL_TESTING : this.p.scrub;
    this.nogo = !this.ung && !this.p.scrub && Math.random() < 0.6 ? { i: Math.floor(Math.random() * STATIONS.length), at: 3.6 + Math.random() * 3, shown: false, done: false } : undefined;
    if (this.ung) {
      this.nose = 15; this.mach = 0; this.noseMax = 15; this.elev = 80; this.armed = false; this.count = 5; this.windBase = (Math.random() * 2 - 1) * 3; this.pred = undefined; this.predT = 0; this.zone = this.p.goal.zone_km || [35, 65];
      this.s = L.newSim(this.v, this.elev * DEG);
    } else {
      this.m = { hp: (this.p.goal.inject_km || 250) * 1000, ha: (this.p.goal.orbit_km || 500) * 1000, vCut: this.p.goal.v_ms, relAlt: this.p.goal.release_km ? this.p.goal.release_km * 1000 : undefined };
      const key = this.p.vehicle + this.m.hp + '/' + this.m.ha + '/' + (this.m.vCut || 0);
      if (!refs.has(key)) refs.set(key, L.reference(this.v, this.m));
      this.ref = refs.get(key)!; this.s = L.newSim(this.v);
    }
  }
  create() {
    cam(this);
    stopLoops(); music.play('launch', 0);
    this.rumble = loop('rumble'); this.sea = loop('sea'); this.sea.set(0.8);
    const night = !!this.p.night, dusk = !!this.p.dusk, two = !this.ung;
    const hf = (this.hf = hifi(this, LOOKS[(night || dusk ? EVE_LOOK[this.def.id] : LEVEL_LOOK[this.def.id] || SITE_LOOK[this.p.site]) || ''])), K = (k: string) => (hf ? hf.key(k) : k); // a look redraws these by name
    const sky = img(this, 0, 0, K(night ? 'sky_night' : dusk ? 'sky_dusk' : 'sky_day')).setOrigin(0);
    this.dark = this.add.rectangle(0, 0, W, H, 0x04050c, 0).setOrigin(0);
    this.stars = img(this, 0, 0, K('stars')).setOrigin(0).setAlpha(0);
    this.earth = img(this, W / 2, H + 20, K('earthlimb')).setOrigin(0.5, 0).setVisible(false);
    [[1.2, 40, 1], [2.2, 250, 2], [3.6, 120, 3], [5.5, 280, 1], [7.5, 60, 2], [10, 200, 3]].forEach(([alt, x, k]) => this.clouds.push({ o: img(this, x, -50, K('cloud' + k)).setAlpha(night ? 0.35 : dusk ? 0.8 : 0.95).setTint(dusk && !hf ? 0xffc8b0 : 0xffffff), alt }));
    this.ground = img(this, RX + 6, 136, K('site_' + this.p.site)).setOrigin(0.5, 100 / 150);
    if (hf) { /* an evening look brings the site already in the dark and under its lamps */ } else if (night) this.ground.setTint(0x7088c8); else if (dusk) this.ground.setTint(0xd9b4c0);
    const rnd = new Phaser.Math.RandomDataGenerator([this.def.id]);
    for (let i = 0; i < 16; i++) this.streaks.push(this.add.rectangle(rnd.between(0, W), rnd.between(0, H), 0.4, 7, 0xffffff, 0.4));
    this.smoke = this.add.particles(RX, 135, 'puff', { speedX: { min: -70, max: 70 }, speedY: { min: -14, max: 4 }, lifespan: 1500, scale: { start: S * 0.6, end: S * 2.6 }, alpha: { start: 0.75, end: 0 }, tint: night ? 0xaab4d4 : 0xf4f2ea, frequency: 22, emitting: false });
    this.flame = this.add.particles(0, -1, 'puff', { speedY: { min: 70, max: 130 }, speedX: { min: -7, max: 7 }, lifespan: { min: 180, max: 340 }, scale: { start: S * (two ? 0.62 : 0.4), end: S * 0.12 }, color: [0xffffff, 0xfff0b0, 0xffb347, 0xff5a1f, 0x7a2408], alpha: { start: 1, end: 0 }, blendMode: 'ADD', frequency: 9, quantity: 2, emitting: false });
    this.flame2 = this.add.particles(0, 13, 'puff', { speedY: { min: 30, max: 60 }, speedX: { min: -5, max: 5 }, lifespan: { min: 160, max: 300 }, scale: { start: S * 0.34, end: S * 0.7 }, color: [0xffd9a0, 0xff9a4a, 0x8a3a1a], alpha: { start: 0.55, end: 0 }, blendMode: 'ADD', frequency: 16, emitting: false });
    if (two) { this.s1 = img(this, 0, 0, 'electron_s1').setOrigin(0.5, 1); this.s2 = img(this, 0, -58, 'electron_s2').setOrigin(0.5, 1); }
    else this.s1 = img(this, 0, 0, 'atea').setOrigin(0.5, 1);
    this.rocket = this.add.container(RX, 136, [this.flame, this.flame2, this.s1, ...(this.s2 ? [this.s2] : [])]);
    // the mission patch, where the file is present: a decal on the fairing (it is also on the level's cards)
    const pk = 'patch_' + this.def.id; this.patch = undefined;
    if (this.textures.exists(pk)) {
      const src = this.textures.get(pk).getSourceImage(), ratio = src.height / src.width;
      if (two) { this.patch = this.add.image(0, -71.4, pk).setDisplaySize(4.6, 4.6 * ratio); this.rocket.add(this.patch); }
    }
    // ---- consoles ----
    const worldN = this.children.length; // everything from here on is HUD
    panel(this, 4, 4, 86, 44);
    this.clockT = T(this, 9, 6, 'T-00:12', '#ffe98a', 10, '700');
    this.warpT = T(this, 86, 8.5, '', '#aab4d4', 5, '700').setOrigin(1, 0);
    this.tele = T(this, 9, 20, '', '#ffffff', 6);
    panel(this, 4, 104, 82, 72);
    T(this, 9, 106.5, this.ung ? 'LAUNCH RAIL' : 'FLIGHT DIRECTOR', '#aab4d4', 4.6, '700');
    this.dialT = T(this, 82, 106.5, '', '#ffffff', 5, '700').setOrigin(1, 0).setAlign('right');
    panel(this, W - 100, 4, 96, 72);
    T(this, W - 9, 6.5, (this.p.payload as string).toUpperCase(), '#aab4d4', 5.4, '700').setOrigin(1, 0);
    for (let i = 0; i < 5; i++) { this.lab.push(T(this, W - 96, 16.5 + i * 11.4, '', '#aab4d4', 4.6, '700')); this.val.push(T(this, W - 8, 16.5 + i * 11.4, '', '#ffffff', 4.8, '700').setOrigin(1, 0)); }
    if (this.p.hundred) T(this, W - 9, 84, 'ELECTRON LAUNCH #100', '#ffe98a', 6.5, '700').setOrigin(1, 0).setShadow(0, 1, '#000', 2);
    panel(this, W - 100, 100, 96, 76);
    T(this, W - 96, 102, 'TRAJECTORY', '#aab4d4', 4.6, '700');
    this.plotT = [T(this, W - 8, 102, '', '#8fa3c8', 4.2).setOrigin(1, 0), T(this, W - 8, 170.5, '', '#8fa3c8', 4.2).setOrigin(1, 0), T(this, W - 92, 0, '100 km', '#7fd0ff', 4).setVisible(false)];
    if (!this.ung) {
      panel(this, 94, 4, 122, 19);
      const tEnd = this.tEnd();
      this.tlKeys = [...TIMELINE, ...(this.v.suborbital ? [['release', 'RELEASE', 1] as [string, string, number]] : [])].filter(([k]) => this.ref!.ev[k] !== undefined);
      this.tlKeys.forEach(([k, name, side], i) => { const x = 98 + (this.ref!.ev[k] / tEnd) * 114, last = i === this.tlKeys.length - 1; this.tl.push(T(this, last ? 214 : x, side < 0 ? 5.2 : 15.6, name, '#8fa3c8', 4.2, '700').setOrigin(last ? 1 : 0.5, 0)); });
      if (this.p.afts) this.aftsTxt = T(this, W - 96, 107.6, '', '#7cc56b', 4, '700');
      STATIONS.forEach((n, i) => this.poll.push(T(this, 106 + i * 24.5, 27.5, n, '#0b0e18', 4.2, '700').setOrigin(0.5).setDepth(21)));
    }
    this.g = this.add.graphics().setDepth(20);
    this.call = T(this, RX, H - 13, '', '#ffe98a', 7.5, '700').setOrigin(0.5).setShadow(0, 1, '#000000', 3);
    this.prompt = T(this, RX, 41, '', '#ffffff', 8.5, '700').setOrigin(0.5).setDepth(21).setShadow(0, 1, '#000000', 4);
    this.hint = T(this, RX, 50.5, '', '#cfd6ea', 5.2, '700').setOrigin(0.5).setDepth(21).setShadow(0, 1, '#000000', 3).setAlign('center');
    who(this, { ...this.def, role: this.def.role || 'CEO · calling the launch' }, 4, 52);
    this.say(this.ung ? 'Aim the rail against the wind' : 'Terminal count');
    if (hf) { hf.tag({ sky, dark: this.dark, stars: this.stars, earth: this.earth, ground: this.ground, smoke: this.smoke, rocket: this.rocket }); hf.set({ rx: RX, alt: 0, base: 136, ry: 136, rot: 0, burn: 0, up: 0 }); hf.ready({ hud: this.children.list.slice(worldN), lateHud: true }); }
  }
  say(s: string) { this.call.setText(s); }
  /** For the controls panel: launch control changes with the vehicle and the phase. */
  help() {
    if (this.ung) return { title: 'Launch control · sounding rocket', rows: [['↑ ↓', 'Set the rail elevation (before the count ends)'], ['Space', 'Start the count; at burnout, release the dart'], ['Enter', 'Hold the count if the wind takes the prediction out of limits']] as [string, string][], note: 'The rocket is unguided. Get the predicted apogee over the 100 km line and the impact inside the green zone before you commit.' };
    if (this.kick && this.p.plan) return { title: 'Launch control · kick-stage flight plan', rows: [['Space', 'Hold to burn Curie for the current step of the plan'], ['Enter', 'With the engine off: confirm the step, or release the payload on a deploy step']] as [string, string][], note: 'The plan on the left lists each burn and release in order, with its target.' };
    if (this.kick && this.dep) return { title: 'Launch control · payload deployment', rows: [['← →', 'Turn the kick stage onto the commanded direction'], ['Space', 'Release the next payload']] as [string, string][], note: 'Let the stage settle on each heading before you release.' };
    if (this.kick) return { title: 'Launch control · kick stage', rows: [['Space', 'Hold to burn Curie. Centre the burn on apogee, release when perigee meets apogee'], ['Enter', 'Deploy the payload']] as [string, string][], note: 'Miss the apogee pass and you wait one orbit for the next.' };
    if (this.v.suborbital) return { title: 'Launch control · suborbital test flight', rows: [['Enter', 'In the count: call a hold when a station goes NO-GO. Later: SECO at the target speed'], ['Space', 'At T-0: release the hold-downs. Then each event when prompted, and the test article inside the release window'], ['← →', 'Pitch: follow the green cue on the way up, keep the nose on the velocity vector on the way down'], ['↑ ↓', 'Throttle: ease off through Max-Q']] as [string, string][], note: 'This flight does not go to orbit: cut off on speed, coast over the top, and release at the stated altitude with almost no angle of attack.' };
    return { title: 'Launch control', rows: [['Enter', 'In the count: call a hold when a station goes NO-GO'], ['Space', 'At T-0: release the hold-downs'], ['← →', 'Pitch: keep the white needle on the green cue'], ['↑ ↓', 'Throttle: ease off to stay under the dynamic-pressure limit through Max-Q'], ['Space', 'Command the next event when prompted: separation, stage-2 ignition, fairing, battery hot-swap'], ['Enter', 'SECO, when predicted apogee reaches the target']] as [string, string][], note: 'Flying off the cue in thick air builds Q-alpha load. The fairing is safe to drop once heating is below 1,135 W/m².' };
  }
  tEnd() { return (this.ref!.ev.release ?? this.ref!.ev.seco) * 1.04; }
  alarm(dt: number) { this.alarmT -= dt; if (this.alarmT <= 0) { this.alarmT = 0.42; snd.alarm(); } }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    if (this.ended) return;
    if (this.kick) return this.kickUpdate(dt);
    if (this.s.held) { if (this.ung) this.aim(dt); else this.terminalCount(dt); return this.render(dt); }
    this.fly(dt);
  }

  // ---------- the count ----------
  station(i: number) { const n = this.nogo; return n && n.shown && !n.done && n.i === i ? 'nogo' : this.pollT > 0.8 * (i + 1) ? 'go' : 'wait'; }
  hold(text: string, resume = 'Recycled · count resumes at T-8') {
    this.holdT = 2.6; this.resume = resume; snd.abort(); this.say(text); this.s = L.newSim(this.v); if (this.nogo?.shown) this.nogo.done = true;
    this.prompt.setText('HOLD HOLD HOLD'); this.hint.setText('');
  }
  terminalCount(dt: number) {
    const s = this.s, n = this.nogo;
    if (this.holdT > 0) { this.holdT -= dt; if (this.holdT <= 0) { this.count = 8; this.pollT = 0; this.say(this.resume); } return; }
    this.count -= dt; this.pollT += dt;
    const c = Math.ceil(this.count);
    if (c !== this.lastC) { this.lastC = c; if (c <= 3 && c > 0) snd.count(); else if (c > 3 && this.station(Math.min(4, Math.floor(this.pollT / 0.8) - 1)) === 'go' && this.pollT < 4.9) snd.tick(); }
    if (n && !n.shown && this.count <= n.at) { n.shown = true; snd.alarm(); this.say(`${STATIONS[n.i]} is NO-GO · ${NOGO[n.i]}`); }
    const bad = !!n && n.shown && !n.done;
    if (just('b') || (AUTO && bad && this.count < n!.at - 0.6)) return this.hold(bad ? `Hold called · ${STATIONS[n!.i]} is working it` : s.lit ? 'Abort after ignition · engines safed' : 'Hold called · all stations were GO');
    if (bad && this.count <= 2.3) { this.missed = true; return this.hold(`Auto-sequencer abort · ${STATIONS[n!.i]} was NO-GO and nobody called it`); }
    if (this.count <= 2 && !s.lit) { L.ignite(s); snd.ignition(); this.say('Ignition · engines at full thrust'); }
    const sc = this.sc;
    if (sc && !this.scrubbed && this.count <= sc.at && (!sc.lit || s.lit)) { this.scrubbed = true; this.hold(sc.text, sc.resume); if (!sc.lit) this.prompt.setText('SCRUB'); return; }
    if (this.count > 0) { this.prompt.setText(c <= 10 ? 'T-' + c : ''); this.hint.setText(bad ? 'ENTER · CALL A HOLD' : c <= 10 ? 'ENTER holds the count' : 'Go/no-go poll'); }
    else {
      this.prompt.setText('SPACE · ' + GO_LABEL.liftoff); this.hint.setText('Engines are burning propellant');
      if (just('a') || AUTO) { L.release(s); this.prompt.setText(''); this.hint.setText(''); this.say('Lift-off!'); snd.liftoff(); music.intensity(1); this.cameras.main.shake(500, 0.004); }
    }
    L.step(s, dt);
  }
  /** Sounding rocket: set the rail elevation so the predicted flight clears 100 km and lands in the safety zone. */
  wind() { const t = this.time.now / 1000; return this.windBase + 1.0 * Math.sin(t * 0.45) + 0.5 * Math.sin(t * 1.3 + 1); }
  predOk() { const p = this.pred; return !!p && p.apogee >= this.p.goal.apogee_km * 1000 && p.range / 1000 >= this.zone[0] && p.range / 1000 <= this.zone[1]; }
  aim(dt: number) {
    const s = this.s, w = this.wind();
    if (AUTO && this.pred) { const mid = (this.zone[0] + this.zone[1]) / 2, r = this.pred.range / 1000; if (Math.abs(r - mid) > 4) this.elev += Math.sign(r - mid) * 3 * dt; }
    else this.elev += ((held('up') ? 1 : 0) - (held('down') ? 1 : 0)) * 4 * dt;
    this.elev = clamp(this.elev, 70, 89.5); s.pitch = this.elev * DEG; s.wind = w;
    this.predT -= dt; if (this.predT <= 0) { this.predT = 0.15; this.pred = L.ballistic(this.v, s.pitch, w); }
    const ok = this.predOk();
    if (!this.armed) {
      this.prompt.setText('SPACE · START THE COUNT'); this.hint.setText('↑ ↓ rail elevation · wait for a lull in the wind');
      if (just('a') || (AUTO && ok)) { this.armed = true; this.count = 5; this.lastC = 99; this.say('Count started · rail locked at T-0'); snd.select(); }
      return;
    }
    this.count -= dt;
    const c = Math.ceil(this.count);
    if (c !== this.lastC) { this.lastC = c; if (c > 0) snd.count(); }
    this.prompt.setText('T-' + Math.max(1, c)); this.hint.setText(ok ? 'ENTER holds the count' : 'OUT OF LIMITS · ENTER holds the count');
    if (just('b') || (AUTO && !ok && this.count > 0.5)) { this.armed = false; snd.abort(); this.say('Hold · waiting on the wind'); return; }
    if (this.count <= 0) { L.ignite(s); L.release(s); this.prompt.setText(''); this.hint.setText(''); this.say('Ignition · off the rail'); snd.liftoff(); music.intensity(1); this.cameras.main.shake(300, 0.004); }
  }

  // ---------- flight ----------
  warpFor() {
    const s = this.s;
    if (this.ung) return s.dart ? 12 : s.lit ? 2 : 1.5;
    if (s.stage === 0) return !s.lit ? 1.5 : s.t < 5 ? 2 : 5;
    if (this.v.suborbital && s.ev.seco !== undefined) { const above = s.alt - this.m.relAlt!; return s.vr < 0 && above < 5e3 ? 1 : s.vr < 0 && above < 16e3 ? 3 : 8; } // coast to the release point
    if (!s.lit || s.starved) return 1.5;
    if (L.vInject(this.m) - s.vt < 260) return 1; // the last seconds before SECO play in real time
    if (s.t - s.ev.ses < 2) return 2;
    return 8;
  }
  doGo() {
    const s = this.s, e = L.go(s);
    if (!e) return snd.deny();
    const rushed = e.endsWith('!'), k = e.replace('!', '');
    if (k === 'sep') { this.stageDelay = s.t - s.ev.meco; this.separate(); snd.stage(); music.intensity(2); this.say(rushed ? 'Separation too early: recontact!' : 'Stage separation confirmed'); if (rushed) { this.why = 'rushed'; this.cameras.main.shake(200, 0.008); } }
    else if (k === 'ses') { snd.ignition(); this.say(rushed ? 'Ignition too close to stage 1!' : 'Stage 2 ignition · Rutherford vacuum'); if (rushed) this.why = 'rushed'; }
    else if (k === 'fairing') { this.patch?.destroy(); this.patch = undefined; this.s2!.setTexture('electron_s2bare'); this.fairings(); snd.fairing(); this.say(s.fmh > L.FMH_LIMIT ? 'Fairing off early: payload is heating!' : 'Fairing jettison confirmed'); }
    else if (k === 'swap') {
      snd.click(); this.say('Battery hot-swap · two packs away');
      for (const d of [-1, 1]) { const b = this.add.rectangle(this.rocket.x, this.rocket.y, 2.4, 3.4, P.yellow).setStrokeStyle(0.3, 0x0b0c12); this.tweens.add({ targets: b, x: b.x - 30 + d * 8, y: H + 10, angle: 300 * d, duration: 1400, onComplete: () => b.destroy() }); }
    } else if (k === 'release') {
      snd.stage(); this.say('Test article released'); const b = this.add.rectangle(this.rocket.x, this.rocket.y - 6, 2, 7, 0xe8e6df).setStrokeStyle(0.3, 0x0b0c12).setRotation(this.rocket.rotation); this.tweens.add({ targets: b, x: b.x + 60, y: b.y + 26, duration: 1500, onComplete: () => b.destroy() });
    } else if (k === 'dart') { snd.stage(); this.say('Dart away · coasting to apogee'); const b = this.add.rectangle(this.rocket.x, this.rocket.y, 2.2, 9, 0xd8dbe6).setStrokeStyle(0.3, 0x0b0c12).setRotation(this.rocket.rotation); this.tweens.add({ targets: b, y: H + 20, x: b.x - 16, angle: 200, duration: 1600, onComplete: () => b.destroy() }); }
  }
  doCut() {
    const s = this.s;
    if (this.ung || s.stage !== 1 || !s.lit || s.vt < 0.9 * L.vInject(this.m)) { snd.deny(); if (!this.ung && s.stage === 1) this.say('Cutoff inhibited: far short of orbital velocity'); return; }
    L.cutoff(s);
  }
  fly(dt: number) {
    const s = this.s, v = this.v;
    this.warp += (this.warpFor() - this.warp) * Math.min(1, dt * 5);
    const md = dt * this.warp, wasLit = s.lit, wasStarved = s.starved;
    if (AUTO) {
      if (!this.ung) { L.pilot(s, this.m, md, this.ref); const e = L.botEvent(s, this.m); if (e === 'go') this.doGo(); else if (e === 'cut') this.doCut(); }
      else if (!s.lit && !s.dart && s.t - s.ev.meco > 0.15) this.doGo();
    } else {
      if (!this.ung) {
        s.pitch = clamp(s.pitch + ((held('left') ? 1 : 0) - (held('right') ? 1 : 0)) * 13 * DEG * dt, -25 * DEG, 100 * DEG);
        s.throttle = clamp(s.throttle + ((held('up') ? 1 : 0) - (held('down') ? 1 : 0)) * 0.7 * dt, v.minThrottle, 1);
      }
      if (just('a')) this.doGo();
      if (just('b')) this.doCut();
    }
    const once = (k: string, text: string, f?: () => void) => { if (!this.said[k]) { this.said[k] = true; this.say(text); f?.(); } };
    L.step(s, md);
    if (this.ung) { // aerodynamic heating of the nose tip: recovery temperature behind the shock, with a little thermal lag
      const Ta = Math.max(216.65, 288.15 - 0.0065 * s.alt); this.mach = s.speed / Math.sqrt(401.9 * Ta);
      const target = s.q > 3000 ? Ta * (1 + 0.162 * this.mach * this.mach) - 273.15 : -40;
      this.nose += (target - this.nose) * Math.min(1, md * (s.q > 3000 ? 0.6 : 0.03)); this.noseMax = Math.max(this.noseMax, this.nose);
      if (this.mach > 1) once('mach', 'Supersonic'); if (this.mach >= 5) once('mach5', 'Mach 5 · shock wave on the nose tip');
    }
    this.trailT -= dt; if (this.trailT <= 0) { this.trailT = 0.2; this.trail.push({ d: s.down, a: s.alt }); }
    // call-outs
    if (!this.ung && s.stage === 0 && s.lit) {
      if (s.alt > 150) once('tower', 'Tower clear · begin pitch-over');
      if (s.speed > 320 && s.alt > 5000) once('mach', 'Vehicle is supersonic');
      const qa = s.q * Math.abs(s.alpha);
      if (s.q > v.qLimit) { this.why = 'maxq'; this.say('DYNAMIC PRESSURE OVER LIMIT · THROTTLE DOWN'); this.alarm(dt); }
      else if (qa > v.qaLimit) { this.why = 'qalpha'; this.say('Q-ALPHA OVER LIMIT · NOSE ON THE CUE'); this.alarm(dt); }
      else if (this.call.text.includes('OVER LIMIT')) this.say('Loads nominal');
      else if (this.call.text.includes('CORRIDOR') && this.aftsT <= 0) this.say('Back inside the corridor');
      if (s.q > this.sawQ) this.sawQ = s.q; else if (s.q < this.sawQ * 0.93 && this.sawQ > v.qLimit * 0.5) once('maxq', 'Max-Q passed · throttle up');
    }
    if (wasLit && !s.lit) {
      if (this.ung) { this.say('Burnout'); snd.cutoff(); }
      else if (s.stage === 0) { this.say('MECO · main engine cutoff'); snd.cutoff(); }
      else if (s.stage === 1 && this.v.suborbital) { this.secoV = s.speed; snd.seco(); this.say(`SECO · ${fmt(s.speed)} m/s at ${km(s.alt)} km · the third stage coasts to the release point`); }
      else if (s.stage === 1) return this.seco();
    }
    if (this.p.afts && !s.fail && s.ev.seco === undefined && s.alt > 1500) this.afts(dt); else if (s.ev.seco !== undefined) this.aftsTxt?.setText('');
    if (!wasStarved && s.starved) { this.say('BATTERIES FLAT · PUMPS STOPPED · HOT-SWAP!'); snd.powerdown(); }
    if (s.starved) this.alarm(dt);
    // prompts: what Space and Enter would do now
    const next = L.nextGo(s);
    let pr = '', hi = '';
    if (next === 'sep') { pr = 'SPACE · ' + GO_LABEL.sep; hi = s.t - s.ev.meco < L.GAP ? 'wait for thrust tail-off…' : 'clear to separate'; }
    else if (next === 'ses') { pr = 'SPACE · ' + GO_LABEL.ses; hi = s.t - s.ev.sep < L.GAP ? 'let the stages drift apart…' : 'every second coasting costs velocity'; }
    else if (next === 'dart') { pr = 'SPACE · ' + GO_LABEL.dart; hi = 'the spent booster is all drag now'; }
    else if (next === 'release') { const r = this.m.relAlt! / 1000; pr = 'SPACE · ' + GO_LABEL.release; hi = s.vr >= 0 || s.alt / 1000 > r + 16 ? `← → keep the nose on the velocity vector\nrelease window ${r + 2.5}–${r - 2.5} km, on the way down` : `ALT ${(s.alt / 1000).toFixed(1)} km · window ${r + 2.5}–${r - 2.5} km\nangle of attack ${(Math.abs(s.alpha) / DEG).toFixed(1)}°`; }
    else if (next === 'fairing' && s.fmh < L.FMH_LIMIT * 4) { pr = 'SPACE · ' + GO_LABEL.fairing; hi = s.fmh > L.FMH_LIMIT ? `heating ${s.fmh.toFixed(0)} W/m² · wait for 1,135` : 'heating below 1,135 W/m²: clear to jettison'; }
    else if ((next === 'swap' && s.batt < 0.12) || s.starved) { pr = 'SPACE · ' + GO_LABEL.swap; hi = `battery ${(s.batt * 100).toFixed(0)}%`; }
    if (s.stage === 1 && s.lit && !s.starved && L.vInject(this.m) - s.vt < 260) { const o = L.orbit(s); pr = 'ENTER · SECO'; hi = (this.m.vCut ? `speed ${fmt(s.vt)} m/s · target ${fmt(this.m.vCut)} m/s` : `apogee ${o.bound ? km(o.ap) : '∞'} km · target ${km(this.m.ha)} km`) + (s.throttle > 0.9 ? '\n↓ throttle down for a finer cut' : ''); }
    this.prompt.setText(pr); this.hint.setText(hi);
    // endings
    if (this.p.twist === 'scripted-no-orbit' && s.stage === 1 && s.alt >= 224e3) return this.telemetryLoss();
    if (this.p.twist === 'scripted-loss' && s.stage === 1 && s.ev.ses !== undefined && s.t - s.ev.ses > 1.4) return this.powerLoss();
    if (this.ung && s.t > 5 && s.vr <= 0) return this.apogee();
    if (this.v.suborbital && s.released) return this.testResult();
    if (this.v.suborbital && !s.fail && s.ev.seco !== undefined && s.vr < 0 && s.alt < this.m.relAlt! - 14e3) s.fail = 'norelease';
    if (!s.fail && s.stage === 1 && s.alt < 55e3 && s.vr < 0) s.fail = 'reentry';
    if (s.fail) return this.fail(this.failText());
    this.render(dt);
  }
  failText() {
    const f = this.s.fail;
    if (f === 'breakup') return this.why === 'maxq' ? 'The vehicle broke up at Max-Q. Throttle down (↓) before dynamic pressure reaches the limit, then throttle back up once it falls.' : this.why === 'rushed' ? 'Recontact at staging. Wait for the thrust to tail off before separating, and for the stages to drift apart before lighting stage 2.' : 'Structural failure from angle of attack in thick air (Q-alpha). Keep the nose on the flight-director cue until you are through Max-Q.';
    if (f === 'heating') return 'The fairing came off while the air was still thick and fast, and the payload overheated. Wait until free molecular heating is below 1,135 W/m².';
    if (f === 'afts') return 'The autonomous flight termination system ended the flight: it shut the engines down. The vehicle had stayed outside its approved corridor, and no range officer had to send a command: the unit on board made the call. Keep the trail between the red lines on the TRAJECTORY plot.';
    if (f === 'norelease') return 'The test article was still attached when the stage fell below the test window. Press Space as the altitude passes through the window on the way down.';
    if (f === 'reentry') return 'Stage 2 fell back into the atmosphere. Light it promptly after separation and keep the nose on the cue: it has to climb while it accelerates.';
    return 'The vehicle fell back to Earth.';
  }

  /** Wallops flights carry an autonomous flight termination system: leave the corridor for long and it ends the flight. */
  afts(dt: number) {
    const s = this.s, centre = L.refAlt(this.ref!, s.down), tol = L.corridor(centre), dev = s.alt - centre, used = Math.abs(dev) / tol;
    if (used > 1) { this.aftsT += dt; this.say(`AFTS · OUTSIDE THE CORRIDOR · ${dev > 0 ? 'TOO HIGH: PITCH OVER' : 'TOO LOW: PITCH UP'}`); this.alarm(dt); if (this.aftsT > 3.5) s.fail = 'afts'; }
    else this.aftsT = Math.max(0, this.aftsT - dt * 0.5);
    this.aftsMin = Math.min(this.aftsMin, 1 - used);
    this.aftsTxt?.setText(used > 1 ? `AFTS · TERMINATE IN ${Math.max(0, 3.5 - this.aftsT).toFixed(1)} s` : `AFTS ARMED · MARGIN ${Math.round((1 - used) * 100)}%`).setColor(used > 1 ? '#ff6a50' : used > 0.7 ? '#ffe98a' : '#7cc56b');
  }
  /** Suborbital test flight: scored on the conditions the test article was given, not on an orbit. */
  testResult() {
    const s = this.s, m = this.m; this.end();
    const ev = Math.abs(this.secoV - m.vCut!), ea = Math.abs(s.alt - m.relAlt!), aoa = Math.abs(s.alpha) / DEG, mach = s.speed / 295;
    const clean = s.stress < 0.5 && s.heat < 0.2 && !this.missed;
    if (ev > 500 || ea > 12e3) return this.fail(`The test article left the stage at ${(s.alt / 1000).toFixed(1)} km after a cutoff ${fmt(ev)} m/s off the target speed: outside any useful test condition. Cut off on the speed target, then release inside the altitude window.`);
    const stars = ev <= 60 && ea <= 2500 && aoa <= 2 && clean ? 3 : ev <= 200 && ea <= 6000 && aoa <= 6 ? 2 : 1;
    const notes = [ev > 60 ? `cutoff was ${fmt(ev)} m/s off the target speed` : '', ea > 2500 ? `release was ${(ea / 1000).toFixed(1)} km outside the window centre` : '', aoa > 2 ? `the nose was ${aoa.toFixed(1)}° off the velocity vector at release` : '', s.stress >= 0.5 ? `structural load reached ${(s.stress * 100).toFixed(0)}%` : '', this.missed ? 'a NO-GO went uncalled in the count' : ''].filter(Boolean);
    this.say('Test article away · data is flowing');
    this.time.delayedCall(1500, () => finish(this, this.def, { success: true, stars, egg: stars === 3 && ev <= 25, title: 'Test article away', text: `Mach ${mach.toFixed(0)} at ${(s.alt / 1000).toFixed(0)} km (the game’s own test point). SECO at ${fmt(this.secoV)} m/s (target ${fmt(m.vCut!)}). The test article was released at ${(s.alt / 1000).toFixed(1)} km, ${km(s.down)} km downrange, descending at ${Math.abs(Math.atan2(s.vr, s.vt) / DEG).toFixed(1)}° with ${aoa.toFixed(1)}° angle of attack, doing ${fmt(s.speed * 3.6)} km/h. No orbit: that was the point.${this.p.afts ? ` AFTS corridor margin never below ${Math.max(0, Math.round(this.aftsMin * 100))}%.` : ''}${notes.length ? ' For three stars: ' + notes.join('; ') + '.' : ''}` }));
  }

  // ---------- drawing ----------
  rows(): { l: string; f: number; t: string; col: number; tick?: number }[] {
    const s = this.s, v = this.v, st = v.stages[s.stage];
    const prop = { l: this.ung ? 'PROPELLANT' : 'PROP S' + (s.stage + 1), f: s.prop / st.prop, t: ((s.prop / st.prop) * 100).toFixed(0) + '%', col: P.lgreen };
    const g = { l: 'G-LOAD', f: s.g / 6, t: s.g.toFixed(1) + ' g', col: P.yellow };
    if (this.ung) {
      const w = s.held ? this.wind() : s.wind;
      return [{ l: 'RAIL ELEV', f: (this.elev - 70) / 19.5, t: this.elev.toFixed(1) + '°', col: 0x7fd0ff }, { l: 'WIND', f: Math.abs(w) / 5, t: `${w < 0 ? 'HW' : 'TW'} ${(Math.abs(w) * 1.944).toFixed(0)} kt`, col: Math.abs(w) > 3 ? P.red : P.yellow }, prop,
        { l: 'DYN PRESS', f: s.q / 6e5, t: (s.q / 1000).toFixed(0) + ' kPa', col: P.yellow }, { l: 'NOSE TIP', f: this.nose / 1100, t: this.nose.toFixed(0) + ' °C', col: this.nose > 600 ? P.red : P.yellow }];
    }
    const thr = { l: 'THROTTLE', f: s.lit && !s.starved ? s.throttle : 0, t: s.lit && !s.starved ? (s.throttle * 100).toFixed(0) + '%' : 'OFF', col: 0x7fd0ff };
    const load = { l: 'STRUCT LOAD', f: s.stress, t: (s.stress * 100).toFixed(0) + '%', col: P.red };
    if (s.stage === 0) {
      const qa = s.q * Math.abs(s.alpha);
      return [thr, prop, { l: 'DYN PRESS', f: s.q / (v.qLimit * 1.3), t: (s.q / 1000).toFixed(1) + ' kPa', col: s.q > v.qLimit ? P.red : s.q > v.qLimit * 0.85 ? P.yellow : P.lgreen, tick: 1 / 1.3 },
        { l: 'Q-ALPHA', f: qa / (v.qaLimit * 1.3), t: (Math.abs(s.alpha) / DEG).toFixed(1) + '° AoA', col: qa > v.qaLimit ? P.red : P.lgreen, tick: 1 / 1.3 }, load];
    }
    const aoa = Math.abs(s.alpha) / DEG;
    const heat = this.v.suborbital && s.ev.seco !== undefined ? { l: 'ANGLE OF ATK', f: aoa / 6, t: aoa.toFixed(1) + '°', col: aoa > 2 ? P.red : P.lgreen, tick: 1 / 3 } : s.fairing || s.fmh > L.FMH_LIMIT
      ? { l: 'HEATING', f: s.fmh / (L.FMH_LIMIT * 3), t: s.fmh > 9999 ? (s.fmh / 1000).toFixed(0) + ' kW/m²' : s.fmh.toFixed(0) + ' W/m²', col: s.fmh > L.FMH_LIMIT ? P.red : P.lgreen, tick: 1 / 3 } : g;
    return [thr, prop, { l: s.swapped ? 'BATTERY B' : 'BATTERY A', f: s.batt, t: (s.batt * 100).toFixed(0) + '%', col: s.batt < 0.12 ? P.red : P.yellow }, heat, load];
  }
  render(dt: number) {
    const s = this.s, v = this.v, a = s.alt / 1000, up = s.stage >= 1, burning = s.lit && !s.starved;
    const ry = s.held ? 136 : Phaser.Math.Linear(this.rocket.y, up ? 96 : 118, 0.04);
    this.rocket.y = ry; this.rocket.rotation = Math.PI / 2 - s.pitch;
    const base = ry + gY(a);
    this.ground.y = base; this.ground.setVisible(base < H + 110);
    this.hf?.set({ alt: a, base, ry, rot: this.rocket.rotation, burn: burning ? s.throttle : 0, up: up ? 1 : 0 });
    for (const c of this.clouds) { c.o.y = base - gY(c.alt) - 20; c.o.setVisible(c.o.y > -30 && c.o.y < H + 30); }
    const k = clamp((a - 8) / 80, 0, 1);
    this.dark.setAlpha(k); this.stars.setAlpha(k);
    if (a > 60) { this.earth.setVisible(true); this.earth.y = H + 20 - Math.min(104, (a - 60) * 0.9); }
    const sp = Math.min(3, s.speed / 1000);
    for (const r of this.streaks) {
      r.y += sp * 260 * dt * (up ? 0.2 : 1); r.x -= sp * 260 * dt * Math.cos(s.pitch) * (up ? 0.2 : 1); r.setAlpha(Math.max(0, 0.4 - a / 70) * Math.min(1, sp * 3)).setRotation(this.rocket.rotation);
      if (r.y > H || r.x < 0) { r.y = r.x < 0 ? Phaser.Math.Between(0, H) : -8; r.x = r.x < 0 ? W : Phaser.Math.Between(0, W); }
    }
    this.flame.emitting = burning && !up; this.flame2.emitting = burning && up;
    this.flame.lifespan = s.held ? 60 : a < 0.3 ? 120 + a * 600 : 150 + 150 * s.throttle;
    this.smoke.emitting = burning && a < 0.25;
    this.rumble.set(burning ? (s.held ? 0.55 : up ? 0.28 : Math.max(0.4, 1 - a / 140) * s.throttle) : 0, up ? 0.15 : Math.max(0.2, 1 - a / 70));
    this.sea.set(Math.max(0, 0.8 - a * 0.8));
    // telemetry
    this.clockT.setText(s.held ? (this.ung && !this.armed ? 'HOLD' : 'T-' + clock(Math.max(0, this.count))) : 'T+' + clock(s.t));
    this.warpT.setText(s.held || this.warp < 1.2 ? '' : `×${this.warp.toFixed(this.warp < 3 ? 1 : 0)}`);
    const o = up && !this.v.suborbital ? L.orbit(s) : undefined;
    this.tele.setText(`ALT   ${a.toFixed(a < 10 ? 1 : 0)} km\nVEL   ${Math.round(s.speed * 3.6).toLocaleString('en-NZ')} km/h\n` + (up && this.v.suborbital ? `MACH ${(s.speed / 295).toFixed(1)} · FPA ${(Math.atan2(s.vr, s.vt) / DEG).toFixed(1)}°` : o ? `AP ${o.bound ? km(o.ap) : '∞'} · PE ${o.pe < 0 ? '—' : km(o.pe)} km` : this.ung ? (s.held && this.pred ? `PREDICT ${km(this.pred.apogee)} km up, ${km(this.pred.range)} out` : `MACH ${this.mach.toFixed(1)} · APOGEE ${km(s.apogee)} km`) : `DOWNRANGE ${km(s.down)} km`));
    const g = this.g; g.clear();
    // gauges
    this.rows().forEach((r, i) => {
      const y = 17.6 + i * 11.4, x = W - 59, w = 30;
      this.lab[i].setText(r.l); this.val[i].setText(r.t);
      g.fillStyle(0x000000, 0.5).fillRoundedRect(x, y, w, 3.6, 1.8); const fw = w * clamp(r.f, 0, 1); if (fw > 1) g.fillStyle(r.col).fillRoundedRect(x, y, Math.max(3.6, fw), 3.6, 1.8);
      if (r.tick) g.fillStyle(0xffffff, 0.9).fillRect(x + w * r.tick, y - 1, 0.5, 5.6);
    });
    this.dial(g); this.plot(g);
    if (!this.ung) {
      // mission timeline, as on the webcast
      const tEnd = this.tEnd(), X = (t: number) => 98 + clamp(t / tEnd, 0, 1) * 114;
      g.lineStyle(0.5, 0x8fa3c8, 0.7).lineBetween(98, 13.5, 212, 13.5);
      if (!s.held) g.lineStyle(1, 0xffe98a).lineBetween(98, 13.5, X(s.t), 13.5);
      this.tlKeys.forEach(([key], i) => { const done = s.ev[key] !== undefined && (key !== 'maxq' || this.said.maxq); g.fillStyle(done ? P.lgreen : 0x8fa3c8).fillCircle(X(this.ref!.ev[key]), 13.5, 1.3); this.tl[i].setColor(done ? '#7cc56b' : '#8fa3c8'); });
      g.fillStyle(0xffffff).fillTriangle(X(s.t) - 1.6, 10.2, X(s.t) + 1.6, 10.2, X(s.t), 12.6);
      // go/no-go poll
      this.poll.forEach((t, i) => {
        t.setVisible(s.held);
        if (!s.held) return;
        const st = this.station(i), blink = st === 'nogo' && Math.floor(this.time.now / 180) % 2 === 0;
        g.fillStyle(st === 'go' ? P.lgreen : st === 'nogo' ? (blink ? 0xffffff : P.red) : 0x5a6480).fillRoundedRect(t.x - 11.4, 24.4, 22.8, 6.2, 2);
      });
    }
  }
  /** Attitude: the white needle is the body axis, the green bug is the pitch guidance wants, the yellow dot is prograde. */
  dial(g: Phaser.GameObjects.Graphics) {
    const s = this.s, cx = 14, cy = 163, R = 41;
    const pt = (ang: number, r: number) => ({ x: cx + Math.cos(ang) * r, y: cy - Math.sin(ang) * r });
    g.lineStyle(0.6, 0x8fa3c8, 0.9).beginPath().arc(cx, cy, R, 20 * DEG, -92 * DEG, true).strokePath();
    for (let d = -15; d <= 90; d += 15) { const a = pt(d * DEG, R), b = pt(d * DEG, R - (d % 30 ? 2 : 4)); g.lineStyle(0.5, 0x8fa3c8, 0.9).lineBetween(a.x, a.y, b.x, b.y); }
    if (this.ung) { // safe launch corridor is not a pitch: just show the rail
      const e = pt(s.pitch, R - 1); g.lineStyle(1.4, 0xffffff).lineBetween(cx, cy, e.x, e.y); g.fillStyle(0xffffff).fillCircle(cx, cy, 1.6);
      this.dialT.setText(`ELEV ${(s.pitch / DEG).toFixed(1)}°`); return;
    }
    const c = L.cue(s, this.m, this.ref), gam = Math.atan2(s.vr, s.vt), off = Math.abs(c - s.pitch) / DEG;
    if (s.speed > 30) { const p = pt(gam, R - 8); g.lineStyle(0.6, 0xffe98a).strokeCircle(p.x, p.y, 2); }
    const b0 = pt(c, R + 1), b1 = pt(c + 3.4 * DEG, R + 6.5), b2 = pt(c - 3.4 * DEG, R + 6.5);
    g.fillStyle(off > 4 ? P.red : P.lgreen).fillTriangle(b0.x, b0.y, b1.x, b1.y, b2.x, b2.y);
    const c1 = pt(c, R - 14); g.lineStyle(0.5, P.lgreen, 0.6).lineBetween(b0.x, b0.y, c1.x, c1.y);
    const e = pt(s.pitch, R - 1); g.lineStyle(1.4, 0xffffff).lineBetween(cx, cy, e.x, e.y); g.fillStyle(0xffffff).fillCircle(cx, cy, 1.6);
    this.dialT.setText(`PITCH ${(s.pitch / DEG).toFixed(1)}°\nCUE ${(c / DEG).toFixed(1)}°`).setColor(off > 4 ? '#ff8a70' : '#ffffff');
  }
  /** Altitude against downrange: the planned profile, and where the vehicle has actually been. */
  plot(g: Phaser.GameObjects.Graphics) {
    const s = this.s, x0 = W - 94, y0 = 169, w = 84, h = 56;
    const up = s.stage >= 1, xm = this.ung ? 130e3 : up ? this.ref!.pts[this.ref!.pts.length - 1].down * 1.05 : 260e3, ym = this.ung ? 140e3 : up ? (this.v.suborbital ? this.m.hp * 1.5 : Math.max(360e3, this.m.hp * 1.35)) : 125e3;
    const X = (d: number) => x0 + clamp(d / xm, 0, 1) * w, Y = (a: number) => y0 - clamp(a / ym, 0, 1) * h;
    g.lineStyle(0.4, 0x8fa3c8, 0.6).lineBetween(x0, y0, x0 + w, y0).lineBetween(x0, y0, x0, y0 - h);
    this.plotT[0].setText(`alt ${km(ym)} km`); this.plotT[1].setText(`downrange ${km(xm)} km`);
    const line = (all: { down: number; alt: number }[], col: number, al: number, wd: number) => { const pts = all.filter((p) => p.down <= xm && p.alt <= ym && p.alt >= 0); g.lineStyle(wd, col, al).beginPath(); pts.forEach((p, i) => (i ? g.lineTo(X(p.down), Y(p.alt)) : g.moveTo(X(p.down), Y(p.alt)))); g.strokePath(); };
    if (this.ung) {
      const ok = this.predOk();
      g.fillStyle(P.lgreen, 0.8).fillRect(X(this.zone[0] * 1000), y0 - 1, X(this.zone[1] * 1000) - X(this.zone[0] * 1000), 2.4);
      g.lineStyle(0.4, 0x7fd0ff, 0.8).lineBetween(x0, Y(100e3), x0 + w, Y(100e3)); this.plotT[2].setVisible(true).setY(Y(100e3) - 5.4);
      if (this.pred) line(this.pred.pts, s.held ? (ok ? P.lgreen : P.red) : 0x8fa3c8, s.held ? 1 : 0.6, 0.6);
    } else {
      line(this.ref!.pts, 0x8fa3c8, 0.7, 0.5);
      if (this.p.afts && s.ev.seco === undefined) for (const sg of [-1, 1]) line(this.ref!.pts.map((p) => ({ down: p.down, alt: p.alt + sg * L.corridor(p.alt) })), P.red, 0.75, 0.4); // the corridor the AFTS enforces
      if (this.v.suborbital && up) { const r = this.m.relAlt!, xa = X(this.ref!.pts.find((p) => p.t >= this.ref!.ev.seco)!.down); g.fillStyle(P.lgreen, 0.55).fillRect(xa, Y(r + 2500), x0 + w - xa, Math.max(1.2, Y(r - 2500) - Y(r + 2500))); }
    }
    if (this.trail.length > 1) line(this.trail.map((p) => ({ down: p.d, alt: p.a })), 0xffe98a, 1, 0.8);
    if (!s.held) g.fillStyle(0xffffff).fillCircle(X(s.down), Y(s.alt), 1.3);
  }
  separate() {
    const w = this.rocket.getWorldTransformMatrix();
    const old = img(this, w.tx, w.ty, 'electron_s1').setOrigin(0.5, 1).setRotation(this.rocket.rotation);
    this.rocket.remove(this.s1, true);
    this.s2!.setTexture('electron_s2free').setOrigin(0.5, 0.5).setPosition(0, 0); this.patch?.setPosition(0, -3.4);
    this.tweens.add({ targets: this.rocket, scale: 1.5, duration: 900 });
    this.tweens.add({ targets: old, y: H + 70, x: old.x - 30, angle: old.angle + 35, duration: 2200, ease: 'Quad.easeIn', onComplete: () => old.destroy() });
  }
  fairings() {
    for (const d of [-1, 1]) { const f = this.add.ellipse(this.rocket.x + 14, this.rocket.y - 8, 5, 14, 0x191a21).setStrokeStyle(0.3, 0x444655); this.tweens.add({ targets: f, x: f.x + d * 46 - 30, y: H + 20, angle: d * 220, duration: 1700, onComplete: () => f.destroy() }); }
  }
  end() { this.ended = true; this.rumble.set(0); this.prompt.setText(''); this.hint.setText(''); this.flame.emitting = false; this.flame2.emitting = false; this.smoke.emitting = false; }

  // ---------- endings ----------
  apogee() {
    const s = this.s; this.end();
    const ap = s.apogee / 1000, goal = this.p.goal.apogee_km as number;
    const c = { ...s, ev: { ...s.ev } } as L.Sim; while (c.ev.impact === undefined && c.t < 2000) L.step(c, 0.25); // where it comes down
    const range = c.down / 1000, inZone = range >= this.zone[0] && range <= this.zone[1], late = (s.ev.dart ?? 99) - s.ev.meco;
    if (ap < goal) return this.fail(`Apogee ${ap.toFixed(0)} km: short of the ${goal} km line. ${s.dart ? (late > 0.8 ? 'The dart stayed on the spent booster too long: release it the moment the motor burns out.' : 'Raise the rail: a steeper launch trades range for height.') : 'The dart never left the booster, and the booster is all drag.'}`);
    this.say('Apogee! Welcome to space'); snd.seco();
    const stars = 1 + (inZone ? 1 : 0) + (inZone && ap >= goal + 15 ? 1 : 0);
    this.time.delayedCall(900, () => finish(this, this.def, { success: true, stars, title: `Apogee ${ap.toFixed(0)} km`, text: `Past the ${goal} km line, with the dart released ${late.toFixed(1)} s after burnout. The nose tip peaked at about ${Math.round(this.noseMax / 10) * 10} °C on the way up. Predicted impact ${range.toFixed(0)} km downrange: ${inZone ? 'inside the safety zone.' : `outside the ${this.zone[0]}–${this.zone[1]} km safety zone. Range safety will want a word.`}` }));
  }
  telemetryLoss() {
    this.end(); this.say('');
    const g = this.add.graphics().setDepth(30);
    this.time.addEvent({ delay: 60, repeat: 24, callback: () => { g.clear(); for (let i = 0; i < 40; i++) g.fillStyle(Math.random() < 0.5 ? 0xffffff : 0x10131c, 0.8).fillRect(0, Phaser.Math.Between(0, H), W, Phaser.Math.FloatBetween(0.5, 4)); snd.staticBurst(); } });
    this.time.delayedCall(1600, () => {
      g.clear().fillStyle(0x0b0e18).fillRect(0, 0, W, H);
      T(this, W / 2, 62, 'TELEMETRY LOST', '#ff6a50', 18, '700').setOrigin(0.5).setDepth(31); T(this, W / 2, 80, 'ALT 224 km', '#ff6a50', 9, '700').setOrigin(0.5).setDepth(31);
      T(this, W / 2, 108, 'GROUND STATION CONFIG\n☐  forward error correction', '#aab4d4', 7).setOrigin(0.5).setDepth(31).setAlign('center');
    });
    const clean = this.s.stress < 0.5 && !this.missed && this.s.heat < 0.2;
    this.time.delayedCall(3800, () => finish(this, this.def, { success: true, stars: clean ? 3 : 2, title: 'It was a test', text: 'You flew it well. The rocket was healthy and on course when the ground lost its data link, and range safety had to end the flight. Level complete: this one is history, not a mistake.' }));
  }
  /** Flight 41: seconds after stage 2 lights, its high voltage collapses and the stage loses all power. History, not a mistake: the level goes on. */
  powerLoss() {
    const s = this.s; this.end(); snd.powerdown(); this.say('HIGH VOLTAGE LOST · STAGE 2 HAS NO POWER');
    this.prompt.setText('T+' + clock(s.t) + ' · ANOMALY').setColor('#ff6a50'); this.cameras.main.flash(160, 255, 255, 255);
    this.tweens.add({ targets: this.rocket, angle: this.rocket.angle + 30, y: this.rocket.y + 30, duration: 2600, ease: 'Sine.easeIn' });
    const clean = s.stress < 0.5 && !this.missed;
    this.time.delayedCall(2800, () => finish(this, this.def, { success: true, stars: clean ? 3 : 2, title: 'Stage 2: total loss of power', text: 'Lift-off, Max-Q and stage separation all went by the book. Then, about 151 seconds into the flight, the high voltage feeding the second stage’s motor controllers fell away, and in under a second the stage was dead. Nothing you did caused it.' }));
  }
  seco() {
    const s = this.s, o = L.orbit(s); this.seco0 = o; this.margin = s.prop / this.v.stages[1].prop;
    this.prompt.setText(''); this.hint.setText(''); this.flame2.emitting = false; snd.seco(); this.rumble.set(0);
    if (!o.bound || o.ap < 160e3) return this.fail(s.prop <= 0 ? `Propellant depleted short of orbit (apogee ${km(o.ap)} km). Wandering off the cue, coasting at staging and carrying the fairing too long all cost velocity.` : `Cut off too early: apogee is only ${km(o.ap)} km.`);
    this.say(`SECO · ${km(o.ap)} × ${km(o.pe)} km transfer orbit`);
    this.render(0);
    if (this.p.twist === 'kick-stage') this.time.delayedCall(1300, () => this.kickStart());
    else { this.end(); this.time.delayedCall(900, () => this.result(o, 1)); }
  }
  kickStart() {
    const s = this.s; L.kickSep(s);
    this.flame2.emitting = false; music.play('space'); this.say(''); this.g.clear();
    this.add.rectangle(0, 0, W, H, 0x04050c, 0.94).setOrigin(0).setDepth(40);
    img(this, 0, 0, 'stars').setOrigin(0).setDepth(40).setAlpha(0.8);
    img(this, 176, 98, 'earth').setDepth(41).setDisplaySize(this.kr[0] * 2, this.kr[0] * 2);
    this.kickT = [T(this, 176, 8, 'KICK STAGE · CIRCULARISE', '#ffe98a', 10, '700').setOrigin(0.5).setDepth(42), T(this, 176, 21, 'Kick stage separation confirmed · Curie holds prograde', '#aab4d4', 5.6).setOrigin(0.5).setDepth(42)];
    if (!this.p.plan) panel(this, 4, 78, 96, 70).setDepth(42);
    if (this.p.plan) { this.kickT[0].setText('KICK STAGE · FLIGHT PLAN'); this.kickT[1].setText('SPACE burns Curie · ENTER confirms each step'); panel(this, 4, 74, 118, 78).setDepth(42); }
    this.kick = { g: this.add.graphics().setDepth(41), craft: img(this, 0, 0, 'curie').setDepth(43), info: T(this, 9, 81, '', '#ffffff', 6).setDepth(43), tip: T(this, 176, H - 12, '', '#ffffff', 7, '700').setOrigin(0.5).setDepth(43).setAlign('center'), passes: 1, lastTAp: 1e9, burning: false, botDone: false, done: false, burned: false };
  }
  kickUpdate(dt: number) {
    const k = this.kick!, s = this.s, v = this.v; if (k.done) return;
    if (this.p.plan) return this.planUpdate(dt);
    let o = L.orbit(s);
    if (this.dep) { L.step(s, dt * 20); o = L.orbit(s); this.kickPicture(o); return this.deployUpdate(dt, o); }
    const st = v.stages[2], need = L.vCirc(o.ap) - Math.sqrt(L.MU * (2 / (L.RE + o.ap) - 1 / o.a)), burn = need / (st.thrustVac / s.m);
    let want = held('a');
    if (AUTO) { if (!k.botDone && !k.burning && o.tAp <= burn / 2) k.burning = true; if (k.burning && (o.pe >= Math.min(o.ap - 2e3, this.m.ha) || s.prop <= 0)) { k.burning = false; k.botDone = true; } want = k.burning; }
    if (want && s.prop > 0) { if (!s.lit) { s.lit = true; snd.burn(1); k.burned = true; } } else if (s.lit) { L.cutoff(s); snd.cutoff(); }
    const near = o.tAp < 220 || o.tAp > o.period - 60;
    L.step(s, dt * (s.lit || near ? 20 : 400));
    o = L.orbit(s);
    if (k.lastTAp < 60 && o.tAp > o.period / 2) k.passes++;
    k.lastTAp = o.tAp;
    this.rumble.set(s.lit ? 0.22 : 0, 0.12);
    this.kickPicture(o);
    const ha = this.m.ha, good = Math.max(Math.abs(o.ap - ha), Math.abs(o.pe - ha)) <= 15e3;
    k.info.setText(`APOGEE   ${km(o.ap)} km\nPERIGEE  ${km(o.pe)} km\nTARGET   ${km(ha)} km circular\n\nTIME TO AP  ${clock(o.tAp)}\nBURN NEEDED ${need > 0.5 ? need.toFixed(0) + ' m/s · ' + burn.toFixed(0) + ' s' : 'none'}\nCURIE PROP  ${((s.prop / st.prop) * 100).toFixed(0)}%\nAPOGEE PASS ${k.passes}`);
    k.tip.setText(s.prop <= 0 ? 'Curie is empty · ENTER deploys the payload' : good ? 'Circular. ENTER deploys the payload' : s.lit ? 'Release SPACE when perigee meets apogee' : `Hold SPACE to burn Curie. Centre the burn on apogee: start at T-${clock(burn / 2)}`).setColor(good ? '#7cc56b' : '#ffffff');
    if (s.alt < 100e3) { k.done = true; return this.fail(`The transfer orbit dipped back into the atmosphere at perigee (${km(o.pe)} km) before Curie could raise it.`); }
    if ((just('b') || (AUTO && k.botDone)) && !s.lit) { if (this.p.deploy) return this.deployStart(); k.done = true; this.end(); this.result(o, k.passes); }
  }
  /**
   * A kick stage with more than one job: the level's `plan` is a list of burns and deployments, done in order.
   * Hold Space to burn (the stage points itself along the velocity vector, or against it for a de-orbit burn);
   * Enter confirms the step once the engine is off.
   */
  planUpdate(dt: number) {
    const k = this.kick!, s = this.s, st = this.v.stages[2], plan = this.p.plan as PlanStep[], step = plan[this.pi], bot = this.planBot;
    let o = L.orbit(s);
    const alt = (step.alt || 0) * 1000, acc = st.thrustVac / s.m;
    s.retro = step.do === 'lower';
    const need = step.do === 'circ' ? L.vCirc(o.ap) - Math.sqrt(L.MU * (2 / (L.RE + o.ap) - 1 / o.a)) : 0, burn = need / acc;
    const met = step.do === 'circ' ? Math.max(Math.abs(o.ap - alt), Math.abs(o.pe - alt)) <= 20e3 : step.do === 'raise' ? Math.abs(o.ap - alt) <= 25e3 : step.do === 'lower' ? o.pe <= alt + 2e3 : true;
    let want = held('a') && step.do !== 'deploy', confirm = just('b');
    if (AUTO) { // the autopilot centres each circularisation on apogee and stops the others on the number
      bot.t += dt;
      if (step.do === 'deploy') confirm = bot.t > 0.7;
      else {
        if (!bot.burning && !met && (step.do !== 'circ' || o.tAp <= burn / 2)) bot.burning = true;
        if (bot.burning && (s.prop <= 0 || (step.do === 'circ' ? o.pe >= Math.min(o.ap - 2e3, alt) : step.do === 'raise' ? o.ap >= alt : o.pe <= alt))) bot.burning = false;
        want = bot.burning; confirm = !bot.burning && !s.lit && (met || s.prop <= 0) && bot.t > 0.6;
      }
    }
    if (want && s.prop > 0) { if (!s.lit) { s.lit = true; snd.burn(1); } } else if (s.lit) { L.cutoff(s); snd.cutoff(); }
    const near = step.do !== 'circ' || o.tAp < 220 || o.tAp > o.period - 60;
    L.step(s, dt * (step.do === 'deploy' ? 6 : s.lit || near ? 20 : 400));
    o = L.orbit(s); this.rumble.set(s.lit ? 0.22 : 0, 0.12);
    this.kickPicture(o);
    if (s.lit) { const th = Math.atan2(s.x, s.y), sg = s.retro ? -1 : 1; k.g.fillStyle(0xffb347, 0.9).fillCircle(k.craft.x - Math.cos(th) * 3 * sg, k.craft.y - Math.sin(th) * 3 * sg, 1.6 + Math.random()); }
    k.info.setFontSize(4.5).setText(plan.map((q, i) => `${i < this.pi ? '✓' : i === this.pi ? '▶' : '·'} ${STEP_LABEL(q)}`).join('\n') + `\n\nAP ${km(o.ap)} · PE ${km(o.pe)} km\nCURIE PROP ${((s.prop / st.prop) * 100).toFixed(0)}%${step.do === 'circ' ? ` · AP IN ${clock(o.tAp)}` : ''}`);
    const tip = s.prop <= 0 && step.do !== 'deploy' ? 'Curie is empty · ENTER moves on' : step.do === 'deploy' ? `ENTER · release ${step.name}` : met && !s.lit ? 'On the numbers · ENTER confirms' : step.do === 'circ' ? (s.lit ? 'Release SPACE when perigee meets apogee' : `Hold SPACE to burn at apogee: start at T-${clock(burn / 2)}`) : step.do === 'raise' ? `Hold SPACE: burn until apogee reads ${fmt(step.alt!)} km` : `Hold SPACE: the stage has turned round. Burn until perigee reads ${fmt(step.alt!)} km`;
    k.tip.setText(tip).setColor(met && !s.lit ? '#7cc56b' : '#ffffff');
    if (s.alt < 100e3) { k.done = true; return this.fail(`The stage dipped into the atmosphere (perigee ${km(o.pe)} km) with work still to do.`); }
    if (confirm && !s.lit) {
      if (step.do === 'deploy') {
        const tgt = [...plan.slice(0, this.pi)].reverse().find((q) => q.do === 'circ')!.alt! * 1000, err = Math.max(Math.abs(o.ap - tgt), Math.abs(o.pe - tgt));
        this.planLog.push({ name: step.name!, ap: o.ap, pe: o.pe, err }); s.m -= step.mass || 0; snd.fairing();
        const sat = this.add.rectangle(k.craft.x, k.craft.y, 3, 2.2, this.planLog.length % 2 ? 0x7fd0ff : 0xffe98a).setStrokeStyle(0.3, 0x0b0c12).setDepth(44); this.tweens.add({ targets: sat, x: sat.x + 14, y: sat.y - 10, alpha: 0, duration: 2200, onComplete: () => sat.destroy() });
        this.kickT[1].setText(`${step.name} released at ${km(o.ap)} × ${km(o.pe)} km`);
      } else snd.select();
      this.pi++; bot.t = 0; bot.burning = false;
      if (this.pi >= plan.length) { k.done = true; this.end(); return this.planResult(o); }
    }
  }
  planResult(o: L.Orbit) {
    const s = this.s, plan = this.p.plan as PlanStep[], last = plan[plan.length - 1], log = this.planLog;
    const worst = Math.max(...log.map((q) => q.err)) / 1000, low = log.find((q) => q.pe < 150e3);
    if (low) return this.fail(`${low.name} was released with a perigee of ${km(low.pe)} km: inside the atmosphere. Circularise before letting anything go.`);
    const down = last.do !== 'lower' || o.pe <= last.alt! * 1000 + 5e3, clean = s.stress < 0.5 && s.heat < 0.2 && !this.missed;
    const stars = worst <= 15 && down && clean ? 3 : worst <= 50 ? 2 : 1;
    const notes = [worst > 15 ? `a payload was released ${worst.toFixed(0)} km off its orbit` : '', !down ? `the stage was left with its perigee at ${km(o.pe)} km, not ${fmt(last.alt!)}` : '', s.stress >= 0.5 ? `structural load reached ${(s.stress * 100).toFixed(0)}%` : '', this.missed ? 'a NO-GO went uncalled in the count' : ''].filter(Boolean);
    T(this, 176, 32, 'PLAN COMPLETE', '#7cc56b', 9, '700').setOrigin(0.5).setDepth(44); this.kick!.tip.setText('');
    this.time.delayedCall(1900, () => finish(this, this.def, { success: true, stars, egg: stars === 3 && worst <= 6, title: 'Two orbits, one kick stage', text: `${log.map((q) => `${q.name} released at ${km(q.ap)} × ${km(q.pe)} km`).join('; ')}. The stage was left in a ${km(o.ap)} × ${km(o.pe)} km orbit with ${((s.prop / this.v.stages[2].prop) * 100).toFixed(0)}% of its Curie propellant.${notes.length ? ' For three stars: ' + notes.join('; ') + '.' : ''}` }));
  }
  kickPicture(o: L.Orbit) {
    // picture: altitudes are exaggerated so the ellipse reads
    const k = this.kick!, s = this.s, cx = 176, cy = 98, RD = (alt: number) => this.kr[0] + (alt / 1000) * this.kr[1], g = k.g; g.clear();
    const th = Math.atan2(s.x, s.y), w = th - o.nu, rd = RD(s.alt), px = cx + Math.sin(th) * rd, py = cy - Math.cos(th) * rd;
    for (const ring of this.kRings.length ? this.kRings : [this.m.ha]) g.lineStyle(0.5, P.lgreen, 0.55).strokeCircle(cx, cy, RD(ring));
    g.lineStyle(0.7, 0xffe98a, 0.95).beginPath();
    for (let i = 0; i <= 72; i++) { const nu = (i / 72) * Math.PI * 2, r = (o.a * (1 - o.ecc * o.ecc)) / (1 + o.ecc * Math.cos(nu)), d = RD(r - L.RE), x = cx + Math.sin(w + nu) * d, y = cy - Math.cos(w + nu) * d; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.strokePath();
    const apx = cx + Math.sin(w + Math.PI) * RD(o.ap), apy = cy - Math.cos(w + Math.PI) * RD(o.ap);
    g.fillStyle(0xffe98a).fillCircle(apx, apy, 1.6);
    k.craft.setPosition(px, py).setRotation(th + Math.PI / 2);
    if (s.lit) g.fillStyle(0xffb347, 0.9).fillCircle(px - Math.cos(th) * 3, py - Math.sin(th) * 3, 1.6 + Math.random());
  }
  /**
   * Several customers on one kick stage: point the dispenser along the commanded direction (← →), let the body rates
   * settle, then release (Space). Each spring pushes the stage the other way, so it has to be steadied again.
   */
  deployStart() {
    const k = this.kick!;
    panel(this, W - 100, 40, 96, 112).setDepth(42);
    T(this, W - 52, 43, 'DEPLOY SEQUENCE', '#aab4d4', 5, '700').setOrigin(0.5, 0).setDepth(43); T(this, W - 92, 132, 'BODY RATE', '#aab4d4', 4.2, '700').setDepth(43);
    this.kickT[0].setText('KICK STAGE · DEPLOY'); this.kickT[1].setText('One customer at a time, each in its own direction'); this.call.setDepth(45).setY(H - 23).setFontSize(6.5);
    this.dep = { i: 0, ang: -40, rate: 0, since: 0, rushed: 0, names: this.p.deploy as string[], icon: img(this, W - 52, 96, 'curie').setScale(S * 2.6).setDepth(44), g: this.add.graphics().setDepth(43), end: 0 };
    k.tip.setText(''); snd.select();
  }
  deployUpdate(dt: number, o: L.Orbit) {
    const k = this.kick!, d = this.dep!, g = d.g.clear(), cx = W - 52, cy = 96, R = 30, n = d.names.length;
    const tgt = DEPLOY_DIR[d.i % DEPLOY_DIR.length], diff = Phaser.Math.Angle.WrapDegrees(tgt - d.ang);
    d.since += dt;
    if (d.i < n) {
      const ready = Math.abs(diff) <= 6 && Math.abs(d.rate) < 14 && d.since >= 1;
      const inp = AUTO ? (Math.abs(diff) > 2.5 ? Math.sign(diff) * Math.min(1, Math.abs(diff) / 25 + 0.25) : 0) : (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
      d.rate += (inp * 110 - d.rate) * Math.min(1, dt * (inp ? 5 : 2.2)); d.ang += d.rate * dt;
      if (just('a') || (AUTO && ready && Math.abs(diff) < 3.5 && Math.abs(d.rate) < 9)) {
        if (d.since < 1) snd.deny();
        else {
          if (!ready) { d.rushed++; snd.alarm(); this.cameras.main.shake(140, 0.004); } else snd.fairing();
          const a = (d.ang - 90) * DEG, sat = this.add.rectangle(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 3.2, 2.2, [0x7fd0ff, 0xffe98a, 0x7cc56b, 0xff9a7a][d.i % 4]).setStrokeStyle(0.3, 0x0b0c12).setDepth(44).setRotation(a);
          this.tweens.add({ targets: sat, x: cx + Math.cos(a) * 44, y: cy + Math.sin(a) * 44, alpha: 0, angle: sat.angle + 90, duration: 2600, onComplete: () => sat.destroy() });
          this.say(ready ? `${d.names[d.i]} · separation confirmed` : `${d.names[d.i]} away, off the commanded line: recontact risk`);
          d.i++; d.since = 0; d.rate += (d.i % 2 ? -1 : 1) * (55 + Math.random() * 35); // the spring pushes back on the stage
        }
      }
      k.tip.setText(ready ? 'SPACE · RELEASE' : d.since < 1 ? 'Let the last one drift clear…' : Math.abs(diff) > 6 ? '← → point the dispenser at the green marker' : 'Steady… let the rates settle').setColor(ready ? '#7cc56b' : '#ffffff');
    } else {
      d.end += dt; d.rate *= 1 - Math.min(1, dt * 3); d.ang += d.rate * dt;
      if (this.p.sail && !d.sail && d.end > 0.7) { d.sail = true; snd.click(); this.say(this.p.sail as string); }
      k.tip.setText('');
      if (d.end > (this.p.sail ? 2.6 : 1.1)) { k.done = true; this.end(); return this.result(o, k.passes); }
    }
    // the stage, its dispenser axis (white) and the commanded release direction (green)
    const pt = (deg: number, r: number) => ({ x: cx + Math.cos((deg - 90) * DEG) * r, y: cy + Math.sin((deg - 90) * DEG) * r });
    g.lineStyle(0.5, 0x8fa3c8, 0.7).strokeCircle(cx, cy, R);
    for (let a = 0; a < 360; a += 30) { const p0 = pt(a, R), p1 = pt(a, R - (a % 90 ? 2 : 4)); g.lineStyle(0.4, 0x8fa3c8, 0.8).lineBetween(p0.x, p0.y, p1.x, p1.y); }
    if (d.i < n) { const b0 = pt(tgt, R + 1), b1 = pt(tgt + 5, R + 7), b2 = pt(tgt - 5, R + 7); g.fillStyle(Math.abs(diff) <= 6 ? P.lgreen : P.yellow).fillTriangle(b0.x, b0.y, b1.x, b1.y, b2.x, b2.y); const c1 = pt(tgt, R - 12); g.lineStyle(0.5, P.lgreen, 0.6).lineBetween(b0.x, b0.y, c1.x, c1.y); }
    const e = pt(d.ang, R - 1); g.lineStyle(1.2, 0xffffff).lineBetween(cx, cy, e.x, e.y);
    d.icon.setRotation(d.ang * DEG);
    const rate = Math.min(1, Math.abs(d.rate) / 60); g.fillStyle(0x000000, 0.5).fillRoundedRect(W - 92, 138, 80, 3.6, 1.8); if (rate > 0.03) g.fillStyle(Math.abs(d.rate) < 14 ? P.lgreen : P.red).fillRoundedRect(W - 92, 138, Math.max(3.6, 80 * rate), 3.6, 1.8);
    k.info.setText(`DEPLOYED ${Math.min(d.i, n)} / ${n}\n` + d.names.map((nm, i) => `${i < d.i ? '✓' : i === d.i ? '▶' : '·'} ${nm}`).join('\n')).setFontSize(n > 5 ? 5 : 6);
  }
  /** Score the orbit the payload was left in. */
  result(o: L.Orbit, passes: number) {
    const s = this.s, ha = this.m.ha, kicked = this.p.twist === 'kick-stage';
    if (o.pe < 150e3) return this.fail(`Perigee ${km(o.pe)} km is inside the atmosphere: the payload will re-enter within days. ${kicked ? 'Burn Curie at apogee until perigee comes up to meet it.' : ''}`);
    const err = Math.max(Math.abs(o.ap - ha), kicked ? Math.abs(o.pe - ha) : 0) / 1000;
    const clean = s.stress < 0.5 && s.heat < 0.2 && !this.missed;
    const d = this.dep, rushed = d ? d.rushed : 0;
    const stars = err <= 15 && clean && !rushed ? 3 : err <= 50 ? 2 : 1, first = passes === 1 && err <= 15 && !rushed && (!this.p.afts || this.aftsMin >= 0.4);
    const corridor = this.p.afts ? ` The AFTS never had less than ${Math.max(0, Math.round(this.aftsMin * 100))}% of its corridor margin in hand.` : '';
    const notes = [err > 15 ? `orbit is ${err.toFixed(0)} km off target` : '', s.stress >= 0.5 ? `structural load reached ${(s.stress * 100).toFixed(0)}%` : '', s.heat >= 0.2 ? 'the payload took heating after an early fairing jettison' : '', this.missed ? 'a NO-GO went uncalled in the count' : '', rushed ? `${rushed} release${rushed > 1 ? 's were' : ' was'} made off the commanded line or before the stage had steadied` : ''].filter(Boolean);
    const text = `SECO left a ${km(this.seco0!.ap)} × ${km(this.seco0!.pe)} km transfer orbit with ${(this.margin * 100).toFixed(1)}% of stage-2 propellant in hand. ${kicked ? `Curie circularised it to ${km(o.ap)} × ${km(o.pe)} km on apogee pass ${passes}; target ${km(ha)} km. ` : ''}${d ? `All ${d.names.length} payloads released one at a time, each in its own direction` : (this.p.kickPayload || this.p.payload) + ' deployed'}.${this.p.sail ? ' ' + this.p.sailNote : ''}${corridor}${notes.length ? ' For three stars: ' + notes.join('; ') + '.' : ''}`;
    const k = this.kick;
    if (k) {
      T(this, 176, 32, this.p.hundred ? 'PAYLOAD DEPLOYED · 100 LAUNCHES!' : 'PAYLOAD DEPLOYED', '#7cc56b', 9, '700').setOrigin(0.5).setDepth(44); k.tip.setText('');
      const b = this.add.particles(k.craft.x, k.craft.y, 'puff', { speed: { min: 10, max: 50 }, lifespan: 500, scale: { start: S * 0.4, end: 0 }, color: [0xffffff, 0xffd9a0, 0xff9a4a], blendMode: 'ADD', emitting: false }).setDepth(44); b.explode(18);
    }
    if (this.p.hundred) { // confetti and a roll call of the missions that got here
      for (let i = 0; i < 90; i++) { const r = this.add.rectangle(Phaser.Math.Between(0, W), -5, 2.4, 1.4, [P.red, P.yellow, P.white, P.blue, P.lgreen][i % 5]).setDepth(45); this.tweens.add({ targets: r, y: H + 5, x: r.x + Phaser.Math.Between(-30, 30), angle: Phaser.Math.Between(360, 1080), duration: Phaser.Math.Between(1200, 3200), delay: Phaser.Math.Between(0, 900) }); }
      const roll = T(this, W + 4, H - 30, 'It’s a Test  ·  Still Testing  ·  It’s Business Time  ·  Make It Rain  ·  Look Ma, No Hands  ·  Running Out Of Fingers  ·  Don’t Stop Me Now  ·  Return To Sender  ·  They Go Up So Fast  ·  Running Out Of Toes  ·  There And Back Again  ·  Catch Me If You Can  ·  Baby Come Back  ·  No Time Toulouse  ·  The Mountain God Rises', '#ffe98a', 7).setDepth(46);
      this.tweens.add({ targets: roll, x: -roll.width, duration: 24000 });
    }
    this.time.delayedCall(this.p.hundred ? 5200 : 1900, () => finish(this, this.def, { success: true, stars, egg: this.p.hundred ? stars === 3 : first, title: this.p.hundred ? 'One hundred Electrons' : 'Orbit!', text }));
  }
  fail(text: string) {
    if (this.s.fail === 'afts') { // thrust termination: the engines are cut and the vehicle falls; nothing blows up
      this.end(); snd.powerdown(); this.say('AFTS · THRUST TERMINATED'); this.tweens.add({ targets: this.rocket, angle: this.rocket.angle + 140, y: H + 80, duration: 2200, ease: 'Quad.easeIn' });
      this.time.delayedCall(2300, () => finish(this, this.def, { success: false, title: 'Flight terminated', text })); return;
    }
    this.end(); snd.boom(); this.cameras.main.shake(350, 0.01); this.rocket.setVisible(false);
    const b = this.add.particles(this.kick ? this.kick.craft.x : this.rocket.x, this.kick ? this.kick.craft.y : this.rocket.y - 30, 'puff', { speed: { min: 20, max: 150 }, lifespan: { min: 500, max: 1100 }, scale: { start: S * 0.9, end: S * 0.1 }, color: [0xffffff, 0xffd27a, 0xff6b2c, 0x3a1a0a], alpha: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false }).setDepth(50); b.explode(60);
    this.time.delayedCall(1000, () => finish(this, this.def, { success: false, title: 'Anomaly', text }));
  }
}
