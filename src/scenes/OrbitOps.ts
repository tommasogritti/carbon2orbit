import Phaser from 'phaser';
import { W, H, T, held, just, finish, cam, img, panel, who } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import { P, S } from '../art';
import type { LevelDef } from '../content';
import { MU, RE } from '../launchSim';

const AUTO = new URLSearchParams(location.search).has('auto');
const DEG = Math.PI / 180, WE = 360 / 86164; // Earth turns this many degrees a second
const MX = 10, MY = 30, MW = 300, MH = 112, L0 = -30; // the map on screen, and the longitude at its left edge
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
const X = (lon: number) => MX + ((((lon - L0) % 360) + 360) % 360) * (MW / 360), Y = (lat: number) => MY + (90 - lat) * (MH / 180);
const km = (m: number) => (m / 1000).toFixed(0);

/** A spacecraft in its orbital plane: position and velocity in metres, time in seconds. u is the angle from the ascending node. */
class Orb {
  x = 0; y = 0; vx = 0; vy = 0; t = 0;
  static circular(alt: number, uDeg: number) { const o = new Orb(), r = RE + alt, v = Math.sqrt(MU / r), u = uDeg * DEG; o.x = r * Math.cos(u); o.y = r * Math.sin(u); o.vx = -v * Math.sin(u); o.vy = v * Math.cos(u); return o; }
  copy() { return Object.assign(new Orb(), this); }
  get r() { return Math.hypot(this.x, this.y); } get alt() { return this.r - RE; } get u() { return Math.atan2(this.y, this.x) / DEG; }
  get vr() { return (this.x * this.vx + this.y * this.vy) / this.r; } get speed() { return Math.hypot(this.vx, this.vy); }
  /** Apogee and perigee altitudes and the period, from the state. */
  el() { const e = (this.speed ** 2) / 2 - MU / this.r, hm = this.x * this.vy - this.y * this.vx, a = -MU / (2 * e), ecc = Math.sqrt(Math.max(0, 1 + (2 * e * hm * hm) / (MU * MU))); return { ap: a * (1 + ecc) - RE, pe: a * (1 - ecc) - RE, period: 2 * Math.PI * Math.sqrt((a * a * a) / MU) }; }
  /** Advance dt seconds (kick, drift, kick). thrust is an acceleration along (+) or against (-) the velocity; below 120 km the air takes over. */
  step(dt: number, thrust = 0) {
    const n = Math.max(1, Math.ceil(dt / (this.alt < 160e3 ? 0.5 : 2))), h = dt / n;
    const acc = (): [number, number] => {
      const r = this.r, g = MU / (r * r * r), sp = this.speed; let ax = -g * this.x, ay = -g * this.y;
      if (thrust) { ax += (thrust * this.vx) / sp; ay += (thrust * this.vy) / sp; }
      if (r - RE < 120e3) { const d = 0.5 * 1.225 * Math.exp(-Math.max(0, r - RE) / 7200) * sp * 0.004; ax -= d * this.vx; ay -= d * this.vy; }
      return [ax, ay];
    };
    let [ax, ay] = acc();
    for (let i = 0; i < n; i++) {
      this.vx += ax * h * 0.5; this.vy += ay * h * 0.5; this.x += this.vx * h; this.y += this.vy * h; [ax, ay] = acc(); this.vx += ax * h * 0.5; this.vy += ay * h * 0.5; this.t += h;
    }
  }
}
interface Step { do: 'lower' | 'raise' | 'deorbit' | 'release'; alt?: number }
const THEMES: Record<string, { map: string; craft: string; capsule: string; music: string; role: string; label: (st: Step) => string; title: string; text: (miss: number, where: string) => string }> = {
  varda: {
    map: 'worldmap', craft: 'pioneer', capsule: 'capsule', music: 'space', role: 'CEO · Pioneer is Rocket Lab’s; the capsule is Varda’s',
    label: (st) => (st.do === 'lower' ? `LOWER PERIGEE TO ${st.alt} km` : st.do === 'raise' ? `RAISE APOGEE TO ${st.alt} km` : st.do === 'deorbit' ? 'DE-ORBIT BURN · AIM THE LANDING' : `RELEASE CAPSULE AT ${st.alt} km`),
    title: 'Touchdown', text: (miss, where) => `The capsule came down ${miss.toFixed(0)} km from the centre of ${where}, under its parachute.`,
  },
};

/**
 * Orbit operations on a ground-track map. The level's `steps` are burns that reshape the orbit, a de-orbit burn that
 * moves a predicted landing point along the track, and a release. Space burns (the stage points itself the right way
 * for the step); each burn has a place on the orbit where it belongs, marked on the track.
 */
export class OrbitOpsScene extends Phaser.Scene {
  def!: LevelDef; p: any; th!: (typeof THEMES)[string]; o!: Orb; cap?: Orb; steps: Step[] = []; si = 0; inc = 97.5; node = 0; U1 = 0; uT = 0; ended = false; used = 0; relAlt = 0; lit = false; phasing = 0; lastVr = 0; trail: number[][] = []; pred?: { lat: number; lon: number; miss: number; along: number }; predT = 0; botBurn = false; missed = 0;
  g!: Phaser.GameObjects.Graphics; craft!: Phaser.GameObjects.Image; info!: Phaser.GameObjects.Text; list!: Phaser.GameObjects.Text; call!: Phaser.GameObjects.Text; rumble!: Loop;
  constructor() { super('OrbitOps'); }
  /** The controls panel (H or the ? button): what the keys do right now, in this level and this phase. Shape agreed with core's showHelp. */
  help(): { title: string; rows: [keys: string, does: string][]; note?: string } {
    const step = this.steps[Math.min(this.si, this.steps.length - 1)];
    if (this.cap) return { title: 'Orbit operations', rows: [], note: 'The capsule has been released: nothing left to command.' };
    if (this.phasing > 0) return { title: 'Orbit operations', rows: [], note: 'Waiting for the pass that crosses the target: no keys until it arrives.' };
    if (step.do === 'release') return { title: 'Orbit operations · release', rows: [['Space or Enter', `Release the capsule as the altitude falls through ${step.alt} km.`]] };
    const what = step.do === 'lower' ? `until the perigee reads ${step.alt} km` : step.do === 'raise' ? `until the apogee reads ${step.alt} km` : 'until the landing cross reaches the target';
    return { title: `Orbit operations · ${this.th.label(step)}`, rows: [['Space (hold)', `Burn ${what}. The spacecraft points itself.`]], note: 'Start each burn at the ring on the track. The step moves on by itself when the engine is off and the number is met.' };
  }
  lat(u: number) { return Math.asin(Math.sin(this.inc * DEG) * Math.sin(u * DEG)) / DEG; }
  lon(u: number, t: number) { return this.node + Math.atan2(Math.cos(this.inc * DEG) * Math.sin(u * DEG), Math.cos(u * DEG)) / DEG - WE * t; }
  /** Where a state comes down if nothing more is done to it, or undefined if it stays in orbit. */
  landing(from: Orb) { const c = from.copy(), t1 = c.t + 7000; let sw = 0, pu = c.u; while (c.t < t1) { c.step(c.alt < 200e3 ? 4 : 20); sw += wrap(c.u - pu); pu = c.u; if (c.alt < 15e3) return { u: c.u, t: c.t, sw }; } return undefined; } // sw: how far round the orbit it travels first
  init(d: { def: LevelDef }) {
    this.def = d.def; this.p = d.def.params; this.th = THEMES[this.p.theme]; this.steps = this.p.steps; this.si = 0; this.ended = false; this.used = 0; this.lit = false; this.phasing = 0; this.trail = []; this.cap = undefined; this.pred = undefined; this.botBurn = false; this.missed = 0; this.relAlt = 0;
    this.inc = this.p.orbit.inc_deg;
    const tgt = this.p.target, alt0 = this.p.orbit.alt_km * 1000;
    this.uT = 360 + Math.asin(Math.sin(tgt.lat * DEG) / Math.sin(this.inc * DEG)) / DEG; // the northbound pass over the target's latitude
    // fly the plan once on paper to learn where the first burn has to go for the capsule to come down at that latitude
    const n = Orb.circular(alt0, -100); const low = this.steps.find((s) => s.do === 'lower')!, hi = this.steps.find((s) => s.do === 'raise');
    while (wrap(n.u) < 0) n.step(5); while (n.el().pe > low.alt! * 1000) n.step(2, -this.p.thrust);
    if (hi) { let v0 = n.vr; for (;;) { n.step(5); if (v0 < 0 && n.vr >= 0) break; v0 = n.vr; } while (n.el().ap < hi.alt! * 1000) n.step(2, this.p.thrust); }
    { let v0 = n.vr; for (;;) { n.step(5); if (v0 > 0 && n.vr <= 0) break; v0 = n.vr; } } while (n.el().pe > 45e3) n.step(2, -this.p.thrust);
    const C = wrap(this.landing(n)!.u); this.U1 = wrap(this.uT - C);
    this.o = Orb.circular(alt0, this.U1 - 110); this.node = 0; this.lastVr = 0;
  }
  create() {
    cam(this); stopLoops(); music.play(this.th.music); this.rumble = loop('rumble');
    this.cameras.main.setBackgroundColor('#05060c'); img(this, 0, 0, 'stars').setOrigin(0).setAlpha(0.6);
    panel(this, 4, 4, W - 8, 20, 0.9); T(this, 9, 6, this.def.title.toUpperCase() + ' · GROUND TRACK', '#ffffff', 6, '700'); this.call = T(this, 9, 14, '', '#ffe98a', 5.4, '700');
    img(this, MX, MY, this.th.map).setOrigin(0);
    const tg = this.p.target; this.add.circle(X(tg.lon), Y(tg.lat), 3.4).setStrokeStyle(0.7, 0xffe98a); this.add.circle(X(tg.lon), Y(tg.lat), 0.9, 0xffe98a); T(this, X(tg.lon) + 5, Y(tg.lat) + 2, tg.name, '#ffe98a', 4.4, '700').setShadow(0, 1, '#000', 2);
    this.g = this.add.graphics(); this.craft = img(this, 0, 0, this.th.craft).setScale(S * 0.8);
    panel(this, 4, 146, 150, 30, 0.9); this.list = T(this, 8, 148, '', '#ffffff', 4.5, '700').setLineSpacing(-0.4);
    panel(this, 158, 146, 158, 30, 0.9); this.info = T(this, 163, 148.4, '', '#ffffff', 5, '700');
    who(this, { ...this.def, role: this.def.role || this.th.role }, W - 108, 28);
    this.say('SPACE burns. Each burn belongs at one place on the orbit: watch for the marker on the track.');
  }
  say(s: string) { this.call.setText(s); }
  update(_t: number, dms: number) {
    if (this.ended) return;
    const dt = Math.min(0.05, dms / 1000), o = this.o, step = this.steps[Math.min(this.si, this.steps.length - 1)], e = o.el(), a = this.p.thrust as number;
    if (this.phasing > 0) return this.phase(dt);
    // ---- where this step's burn belongs, and whether we are there
    const du = wrap(o.u - this.U1), mid = (e.ap + e.pe) / 2, nearApsis = Math.abs(o.vr) < 32; // radial speed is zero at the high and low points
    const here = this.cap ? false : step.do === 'lower' ? du > -4 && du < 14 : step.do === 'raise' ? nearApsis && o.alt < mid : step.do === 'deorbit' ? nearApsis && o.alt > mid : o.vr < 0 && Math.abs(o.alt - step.alt! * 1000) < 16e3;
    const metNow = step.do === 'lower' ? e.pe <= step.alt! * 1000 + 3e3 : step.do === 'raise' ? e.ap >= step.alt! * 1000 - 3e3 : step.do === 'deorbit' ? !!this.pred && this.pred.along <= 0 : false;
    let burn = held('a') && step.do !== 'release' && !this.cap, act = (just('a') || just('b')) && !this.cap;
    const settled = step.do === 'deorbit' ? !!this.pred && this.pred.along <= 25 : metNow; // a human may stop a little long and still move on
    if (AUTO) { if (step.do === 'release') act = here && o.alt <= step.alt! * 1000 + 1500; else { if (!this.botBurn && here && !metNow && (step.do === 'lower' ? du > 0 : step.do === 'raise' ? o.vr >= 0 : o.vr <= 0)) this.botBurn = true; if (this.botBurn && metNow) this.botBurn = false; burn = this.botBurn; act = false; } }
    const dir = step.do === 'raise' ? 1 : -1;
    if (burn && !this.lit) { this.lit = true; snd.burn(1); if (!here) { this.missed++; this.say('Burning away from the marker: the orbit will not be where the plan wants it'); } } else if (!burn && this.lit) { this.lit = false; snd.cutoff(); }
    const slow = step.do === 'release' && o.vr < 0 && o.alt < step.alt! * 1000 + 90e3;
    const md = dt * (this.lit ? 40 : slow ? 30 : 420);
    this.lastVr = o.vr; o.step(md, this.lit ? dir * a : 0); if (this.lit) this.used += a * md;
    this.rumble.set(this.lit ? 0.3 : 0, 0.15);
    // ---- step done?
    const e2 = o.el();
    if (!this.cap && step.do !== 'release' && !this.lit && (AUTO ? metNow : settled)) {
      snd.select(); this.si++;
      if (step.do === 'raise' || (step.do === 'lower' && this.steps[this.si].do === 'deorbit')) { this.phasing = 2.6; this.say('Orbit shaped. Now the Earth has to bring the range round underneath it…'); }
      else this.say(this.steps[this.si].do === 'raise' ? 'Perigee is down. Next burn at the low point, half an orbit on' : 'Capsule release coming up on the way down');
    } else if (!this.cap && step.do === 'release' && act) {
      if (o.vr >= 0 || Math.abs(o.alt - step.alt! * 1000) > 60e3) snd.deny();
      else { this.relAlt = o.alt; this.cap = o.copy(); snd.stage(); this.say(`Capsule released at ${km(o.alt)} km · it is on its own now`); this.si++; }
    }
    if (o.alt < 100e3 && !this.cap) return this.lose(this.pred ? 'The capsule was still attached when Pioneer met the atmosphere. Release it on the way down, at the altitude the plan gives.' : 'Pioneer dropped into the atmosphere before the plan was flown.');
    // ---- the capsule's fall
    if (this.cap) { this.cap.step(dt * 110); if (this.cap.alt < 15e3) return this.touchdown(); }
    this.predT -= dt; if (this.predT <= 0 || this.lit) { this.predT = 0.12; const l = this.landing(this.cap || o); this.pred = l ? this.score(l.u, l.t, l.sw, (this.cap || o).u) : undefined; }
    this.draw(e2, here, step);
  }
  /**
   * How far a landing at (u, t) is from the target, and whether it is beyond it along the track (+) or short of it (-).
   * `sw` is the angle still to travel from `uNow`, so a capsule that skims and goes round again counts as long, not short.
   */
  score(u: number, t: number, sw = 0, uNow = u) {
    const tg = this.p.target, lat = this.lat(u), lon = this.lon(u, t), dl = (lat - tg.lat) * DEG, dn = wrap(lon - tg.lon) * DEG * Math.cos(tg.lat * DEG), m = (d: number) => ((d % 360) + 360) % 360, base = this.U1 - 60;
    return { lat, lon, miss: Math.hypot(dl, dn) * 6371, along: m(uNow - base) + sw - m(this.uT - base) };
  }
  /** The wait between shaping the orbit and coming home: days of orbits, shown in a couple of seconds. */
  phase(dt: number) {
    const o = this.o; this.phasing -= dt; o.step(dt * 2600); this.node = wrap(this.node - dt * 70);
    if (this.phasing <= 0) { // stop where the pass that follows the next apogee goes over the range
      const c = o.copy(); let v0 = c.vr; for (;;) { c.step(5); if (v0 > 0 && c.vr <= 0) break; v0 = c.vr; } while (wrap(c.u - this.uT) < -1 || wrap(c.u - this.uT) > 20) c.step(5);
      this.node = 0; this.node = wrap(this.p.target.lon - this.lon(this.uT, c.t)); this.trail = []; this.lastVr = o.vr;
      snd.egg(); this.say('The next pass goes over the range. De-orbit burn at the high point: hold SPACE until the landing marker reaches it');
    }
    this.draw(o.el(), false, this.steps[this.si]);
  }
  draw(e: { ap: number; pe: number }, here: boolean, step: Step) {
    const o = this.o, g = this.g, lat = this.lat(o.u), lon = this.lon(o.u, o.t), x = X(lon), y = Y(lat); g.clear();
    const last = this.trail[this.trail.length - 1]; if (!last || Math.hypot(last[0] - x, last[1] - y) > 1.2) this.trail.push([x, y]); if (this.trail.length > 420) this.trail.shift();
    const path = (pts: number[][], col: number, al: number, wd: number) => { g.lineStyle(wd, col, al).beginPath(); pts.forEach((q, i) => (i && Math.abs(q[0] - pts[i - 1][0]) < 40 ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.strokePath(); };
    path(this.trail, 0x7fb4ff, 0.55, 0.5);
    const c = o.copy(), ahead: number[][] = []; for (let i = 0; i < 70 && c.alt > 20e3; i++) { ahead.push([X(this.lon(c.u, c.t)), Y(this.lat(c.u))]); c.step(90); } path(ahead, 0xffffff, 0.8, 0.5);
    // the marker for where this step's burn belongs
    const mark = (u: number, t: number, col: number) => { const mx = X(this.lon(u, t)), my = Y(this.lat(u)); g.lineStyle(0.8, col, 1).strokeCircle(mx, my, 3 + Math.sin(this.time.now / 150)); };
    if (!this.phasing && !this.cap) { const m = o.copy(); let v0 = m.vr, n = 0; const want = (): boolean => (step.do === 'lower' ? Math.abs(wrap(m.u - this.U1 - 4)) < 3 : step.do === 'raise' ? v0 < 0 && m.vr >= 0 : step.do === 'deorbit' ? v0 > 0 && m.vr <= 0 : m.vr < 0 && m.alt <= step.alt! * 1000); while (n++ < 400 && !want()) { v0 = m.vr; m.step(20); } if (n < 400) mark(m.u, m.t, here ? P.lgreen : 0xffe98a); }
    if (this.pred) { const px = X(this.pred.lon), py = Y(this.pred.lat); g.lineStyle(0.8, this.pred.miss < 80 ? P.lgreen : P.orange, 1).lineBetween(px - 3, py - 3, px + 3, py + 3).lineBetween(px - 3, py + 3, px + 3, py - 3); }
    if (this.cap) { const cx = X(this.lon(this.cap.u, this.cap.t)), cy = Y(this.lat(this.cap.u)); g.fillStyle(0xffffff).fillCircle(cx, cy, 1.3); }
    this.craft.setPosition(x, y).setRotation(Math.atan2(Y(this.lat(o.u + 2)) - y, X(this.lon(o.u + 2, o.t + 30)) - x));
    if (this.lit) g.fillStyle(0xffb347, 0.9).fillCircle(x, y, 2.2 + Math.random());
    this.list.setText(this.steps.map((q, i) => `${i < this.si ? '✓' : i === this.si ? '▶' : '·'} ${this.th.label(q)}`).join('\n'));
    this.info.setText(`ALT ${km(o.alt)} km   AP ${km(e.ap)} · PE ${e.pe < 0 ? '—' : km(e.pe)} km\nΔV USED ${this.used.toFixed(0)} m/s\n${this.pred ? `LANDING ${this.pred.miss.toFixed(0)} km from the range · ${this.pred.along > 0 ? 'long' : 'short'}` : 'NO RE-ENTRY ON THIS ORBIT'}`).setColor(this.pred && this.pred.miss < 80 ? '#7cc56b' : '#ffffff');
  }
  lose(text: string) { this.ended = true; this.rumble.set(0); snd.dud(); this.time.delayedCall(500, () => finish(this, this.def, { success: false, title: 'No delivery', text })); }
  touchdown() {
    this.ended = true; this.rumble.set(0);
    const s = this.score(this.cap!.u, this.cap!.t, 0, this.cap!.u), relErr = Math.abs(this.relAlt - this.steps[this.steps.length - 1].alt! * 1000) / 1000, where = this.p.target.name as string;
    this.draw(this.o.el(), false, this.steps[this.steps.length - 1]);
    const ch = img(this, X(s.lon), Y(s.lat) - 6, 'chute').setScale(S * 0.3); this.tweens.add({ targets: ch, y: ch.y + 6, duration: 1400 });
    if (s.miss > 900) return void this.time.delayedCall(1500, () => finish(this, this.def, { success: false, title: `${s.miss.toFixed(0)} km off the range`, text: 'The capsule came down a long way from anyone waiting for it. Stop the de-orbit burn as the landing marker reaches the range: more burn brings it down sooner along the track.' }));
    const stars = s.miss <= 70 && relErr <= 20 && !this.missed ? 3 : s.miss <= 260 ? 2 : 1; snd.seco();
    this.time.delayedCall(1700, () => finish(this, this.def, { success: true, stars, egg: s.miss <= 40, title: this.th.title, text: this.th.text(s.miss, where) + ` Released at ${km(this.relAlt)} km after ${this.used.toFixed(0)} m/s of manoeuvres.${stars < 3 ? ' For three stars: land within 70 km, release within 20 km of the planned altitude, and make every burn at its marker.' : ''}` }));
  }
}
