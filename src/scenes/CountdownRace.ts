import Phaser from 'phaser';
import { W, H, T, just, finish, cam, img, panel, who } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import { P, S } from '../art';
import type { LevelDef } from '../content';
import { hifi, HiFi } from '../hifi';
import { LOOKS } from '../hifiLooks';

const AUTO = new URLSearchParams(location.search).has('auto');
const HOUR = 2.4; // seconds of play per hour on the clock
const REAL = 16 + 42 / 60, LIMIT = 24; // the real notice-to-launch time, and what the Space Force asked for
const NOTICE = 5 + 37 / 60; // local time at Māhia when the notice arrived: 16 h 42 min before the 10:19 pm lift-off
interface Task { id: string; name: string; h: number; needs: string[] }
/** The jobs between the notice and lift-off. The list and the durations are game values: the only published split is about four hours to finalise trajectories, update flight software and co-ordinate ground stations. */
const TASKS: Task[] = [
  { id: 'TRAJ', name: 'Trajectory for the new orbit', h: 4, needs: [] },
  { id: 'ENCAP', name: 'Encapsulate Pioneer in the fairing', h: 4.2, needs: [] },
  { id: 'TRACK', name: 'Bring up downrange tracking', h: 3, needs: [] },
  { id: 'CHILL', name: 'Chill down the LOX system', h: 2.4, needs: [] },
  { id: 'MATE', name: 'Mate the payload, roll out', h: 3.6, needs: ['ENCAP'] },
  { id: 'VERT', name: 'Go vertical, pad checks', h: 2.4, needs: ['MATE'] },
  { id: 'RANGE', name: 'Publish hazard areas, clear the range', h: 4.2, needs: ['TRAJ'] },
  { id: 'FSW', name: 'Load the flight software', h: 1.2, needs: ['TRAJ', 'VERT'] },
  { id: 'PROP', name: 'Load propellants', h: 2.4, needs: ['VERT', 'CHILL'] },
  { id: 'COUNT', name: 'Final checks and count', h: 0.8, needs: ['FSW', 'PROP', 'RANGE', 'TRACK'] },
];
const byId = (id: string) => TASKS.find((t) => t.id === id)!;
/** Longest chain of work from the start of a task to lift-off: what a planner looks at first. */
const tail = (id: string): number => byId(id).h + Math.max(0, ...TASKS.filter((t) => t.needs.includes(id)).map((t) => tail(t.id)));
const hm = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
const RX = 164, RY = 26; // top-left of the pad picture
const LOOK = 'haze'; // the hi-fi look (hifiLooks.ts)

/**
 * VICTUS HAZE: the order to launch arrives with an orbit nobody knew in advance, and the clock starts. Two crews, ten
 * jobs, and some of them cannot start until others finish. Keep both crews working on what matters most.
 */
export class CountdownRaceScene extends Phaser.Scene {
  def!: LevelDef; t = 0; done: Record<string, number> = {}; work: { id: string; left: number }[] = []; cur = 0; ended = false; idle = 0; botT = 0;
  g!: Phaser.GameObjects.Graphics; rows: Phaser.GameObjects.Text[] = []; clockT!: Phaser.GameObjects.Text; crewT: Phaser.GameObjects.Text[] = []; call!: Phaser.GameObjects.Text;
  sky!: Phaser.GameObjects.Rectangle; stars!: Phaser.GameObjects.Image; site!: Phaser.GameObjects.Image; rocket!: Phaser.GameObjects.Image; flame!: Phaser.GameObjects.Particles.ParticleEmitter; vent!: Phaser.GameObjects.Particles.ParticleEmitter; hum!: Loop; hf?: HiFi;
  constructor() { super('CountdownRace'); }
  /** The controls panel (H or the ? button): what the keys do right now, in this level and this phase. Shape agreed with core's showHelp. */
  help(): { title: string; rows: [keys: string, does: string][]; note?: string } {
    return { title: 'Countdown race', rows: [['↑ ↓', 'Choose a job on the list.'], ['Space or Enter', 'Give the chosen job to a free crew.']], note: 'A job can start only when the jobs it waits for are finished and a crew is free.' };
  }
  init(d: { def: LevelDef }) { this.def = d.def; this.t = 0; this.done = {}; this.work = [{ id: '', left: 0 }, { id: '', left: 0 }]; this.cur = 0; this.ended = false; this.idle = 0; this.rows = []; this.crewT = []; this.botT = 0; }
  create() {
    cam(this); stopLoops(); music.play('launch', 1); this.hum = loop('sea'); this.hum.set(0.5);
    this.cameras.main.setBackgroundColor('#0a0f20');
    const hf = (this.hf = hifi(this, LOOKS[LOOK])); // the picture, the panels and the job list take the look; every word stays on the HUD camera
    // the pad at Māhia, from the early-morning notice to a night launch
    this.sky = this.add.rectangle(RX, RY, 152, 90, 0x0a1230).setOrigin(0); this.stars = img(this, RX, RY, 'stars').setOrigin(0).setCrop(0, 0, 152 * 4, 60 * 4);
    this.site = img(this, RX - 4, RY + 16, hf ? hf.key('site_mahia') : 'site_mahia').setOrigin(0).setScale(S * 0.5).setCrop(8 * 4, 0, 304 * 4, 150 * 4);
    this.vent = this.add.particles(RX + 74, RY + 58, 'puff', { speedX: { min: 6, max: 18 }, speedY: { min: -6, max: 2 }, lifespan: 900, scale: { start: S * 0.2, end: S * 0.7 }, alpha: { start: 0.7, end: 0 }, frequency: 90, emitting: false });
    this.flame = this.add.particles(0, 0, 'puff', { speedY: { min: 40, max: 80 }, speedX: { min: -5, max: 5 }, lifespan: 300, scale: { start: S * 0.4, end: S * 0.1 }, color: [0xffffff, 0xfff0b0, 0xffb347, 0xff5a1f], alpha: { start: 1, end: 0 }, blendMode: 'ADD', frequency: 12, emitting: false });
    this.rocket = img(this, RX + 73, RY + 66, 'electron_full').setOrigin(0.5, 1).setScale(S * 0.5).setVisible(false);
    const cover = this.add.rectangle(RX, RY + 90, 152, 30, 0x0a0f20).setOrigin(0); // crews panel sits over the bottom of the picture
    const frame = this.add.graphics().lineStyle(0.6, 0xffffff, 0.25).strokeRoundedRect(RX, RY, 152, 90, 2);
    const top = panel(this, 4, 4, W - 8, 18, 0.9); this.clockT = T(this, 9, 6.4, '', '#ffe98a', 8.4, '700');
    const list = panel(this, 4, RY, 156, 150, 0.85);
    TASKS.forEach((_t, i) => this.rows.push(T(this, 16, RY + 4 + i * 14.4, '', '#ffffff', 4.9, '700').setDepth(2)));
    for (let i = 0; i < 2; i++) this.crewT.push(T(this, RX + 4, RY + 94 + i * 12, '', '#ffffff', 4.9, '700'));
    this.g = this.add.graphics();
    this.call = T(this, RX + 76, H - 28, '', '#ffe98a', 5.6, '700').setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(150).setShadow(0, 1, '#000000', 3);
    who(this, { ...this.def, role: this.def.role || 'CEO · the notice has just arrived' }, RX + 26, RY + 2);
    this.say('NOTICE TO LAUNCH. The target orbit has just arrived.\n↑ ↓ choose a job · SPACE gives it to a free crew');
    snd.alarm();
    if (hf) { const world = { sky: this.sky, stars: this.stars, site: this.site, vent: this.vent, flame: this.flame, rocket: this.rocket, cover, frame, top, list, rows: this.g }, w = Object.values(world) as Phaser.GameObjects.GameObject[]; hf.tag(world); this.tell(); hf.ready({ hud: this.children.list.filter((o) => !w.includes(o)), lateHud: true }); }
  }
  /** What the look animates from: daylight `l` and the local hour `h` at Māhia, the hours its winter day begins and ends, what each crew is doing (`w0`, `w1`: 0 idle with a job waiting, 1 working, 2 standing by) and whether the real time has passed. */
  tell() {
    if (!this.hf) return; const clock = (NOTICE + this.t) % 24, ready = TASKS.some((t) => this.state(t) === 'ready'), w = this.work.map((q) => (q.id ? 1 : ready ? 0 : 2));
    this.hf.set({ l: Phaser.Math.Clamp(Math.min((clock - 6.6) / 1.2, (17.6 - clock) / 1.2), 0, 1), h: clock, r: 7, s: 17.5, w0: w[0], w1: w[1], late: this.t > REAL ? 1 : 0 });
  }
  say(s: string) { this.call.setText(s); }
  state(t: Task) { return this.done[t.id] !== undefined ? 'done' : this.work.some((w) => w.id === t.id) ? 'work' : t.needs.every((n) => this.done[n] !== undefined) ? 'ready' : 'wait'; }
  assign(t: Task) {
    const st = this.state(t), free = this.work.find((w) => !w.id);
    if (st === 'wait') { snd.deny(); return this.say(`“${t.name}” cannot start yet. It waits for: ${t.needs.filter((n) => this.done[n] === undefined).map((n) => byId(n).name.toLowerCase()).join('; ')}.`); }
    if (st !== 'ready') return snd.deny();
    if (!free) { snd.deny(); return this.say('Both crews are busy. A job has to finish first.'); }
    free.id = t.id; free.left = t.h; snd.select(); this.say(`Crew ${this.work.indexOf(free) ? 'B' : 'A'}: ${t.name.toLowerCase()} · ${t.h} h`);
  }
  update(_t: number, dms: number) {
    if (this.ended) return;
    const dt = Math.min(0.05, dms / 1000), dh = dt / HOUR;
    this.t += dh;
    for (const w of this.work) {
      if (!w.id) { if (TASKS.some((t) => this.state(t) === 'ready')) this.idle += dh; continue; }
      w.left -= dh;
      if (w.left <= 0) { this.done[w.id] = this.t; const id = w.id; w.id = ''; snd.pickup(); this.milestone(id); if (id === 'COUNT') return this.liftoff(); }
    }
    // input
    if (AUTO) { this.botT += dt; const free = this.work.some((w) => !w.id), best = TASKS.filter((t) => this.state(t) === 'ready').sort((a, b) => tail(b.id) - tail(a.id))[0]; if (free && best && this.botT > 0.25) { this.botT = 0; this.cur = TASKS.indexOf(best); this.assign(best); } }
    else {
      if (just('down')) { this.cur = (this.cur + 1) % TASKS.length; snd.tick(); } if (just('up')) { this.cur = (this.cur + TASKS.length - 1) % TASKS.length; snd.tick(); }
      if (just('a') || just('b')) this.assign(TASKS[this.cur]);
    }
    this.draw(); this.tell();
    if (this.t > LIMIT + 3) { this.ended = true; finish(this, this.def, { success: false, title: 'Still on the ground', text: 'More than 27 hours after the notice, Electron has not flown: slower than the record it set out to beat. Keep both crews busy, and start the jobs that other jobs are waiting for first.' }); }
  }
  milestone(id: string) {
    if (id === 'MATE') { this.rocket.setVisible(true).setAngle(-90).setPosition(RX + 60, RY + 64); this.say('Electron is on the pad, lying down.'); }
    else if (id === 'VERT') { this.tweens.add({ targets: this.rocket, angle: 0, x: RX + 73, y: RY + 66, duration: 900, ease: 'Sine.easeInOut' }); this.say('Electron is vertical.'); }
    else if (id === 'PROP') { this.vent.emitting = true; this.say('Propellants aboard: LOX is venting.'); }
    else if (id === 'TRAJ') this.say('Trajectory done: the range and the flight software can start.');
    else this.say(`${byId(id).name}: done.`);
  }
  draw() {
    const g = this.g; g.clear();
    this.clockT.setText(`T+${hm(this.t)}  SINCE NOTICE TO LAUNCH`).setColor(this.t > REAL ? '#ff8a70' : '#ffe98a');
    // the day so far against the marks that matter
    const bx = 176, bw = 134, X = (h: number) => bx + bw * Math.min(1, h / 27);
    g.fillStyle(0x000000, 0.5).fillRoundedRect(bx, 9, bw, 4.4, 2.2); g.fillStyle(this.t > REAL ? P.orange : P.lgreen).fillRoundedRect(bx, 9, Math.max(4.4, X(this.t) - bx), 4.4, 2.2);
    for (const [h, col] of [[REAL, 0xffe98a], [LIMIT, 0xff8a70]] as number[][]) g.fillStyle(col).fillRect(X(h), 7, 0.6, 8.4);
    if (!this.aux) this.aux = [T(this, X(REAL), 15.2, '16:42 real', '#ffe98a', 3.6, '700').setOrigin(0.5, 0), T(this, X(LIMIT), 15.2, '24:00 asked for', '#ff8a70', 3.6, '700').setOrigin(0.5, 0)];
    TASKS.forEach((t, i) => {
      const y = RY + 2.6 + i * 14.4, st = this.state(t), sel = i === this.cur, w = this.work.find((q) => q.id === t.id);
      g.fillStyle(sel ? 0x1c2a4a : 0x0b1020, sel ? 0.95 : 0.55).fillRoundedRect(8, y, 148, 12.6, 2); if (sel) g.lineStyle(0.6, 0xffe98a, 1).strokeRoundedRect(8, y, 148, 12.6, 2);
      g.fillStyle(st === 'done' ? P.lgreen : st === 'work' ? P.yellow : st === 'ready' ? 0xffffff : 0x5a6480).fillCircle(12, y + 4.6, 1.5);
      this.rows[i].setText(`${t.name}\n`).setColor(st === 'wait' ? '#7483a6' : st === 'done' ? '#7cc56b' : '#ffffff').setY(y + 1.2);
      const sub = st === 'done' ? `done at T+${hm(this.done[t.id])}` : st === 'work' ? `crew ${this.work.indexOf(w!) ? 'B' : 'A'} · ${w!.left.toFixed(1)} h to go` : st === 'ready' ? `${t.h} h · READY` : `${t.h} h · waits for ${t.needs.filter((n) => this.done[n] === undefined).map((n) => byId(n).id).join(' + ')}`;
      this.rows[i].setText(`${t.name}\n${sub}`).setLineSpacing(-0.6);
      if (w) { g.fillStyle(0x000000, 0.5).fillRect(108, y + 8.6, 44, 2); g.fillStyle(P.yellow).fillRect(108, y + 8.6, 44 * (1 - w.left / t.h), 2); }
    });
    this.work.forEach((w, i) => this.crewT[i].setText(`CREW ${i ? 'B' : 'A'}  ${w.id ? byId(w.id).name : TASKS.some((t) => this.state(t) === 'ready') ? 'IDLE: give them a job' : 'standing by'}`).setColor(w.id ? '#ffffff' : '#ff8a70'));
    // sky at Māhia by local time: dark, dawn about seven, dusk about five
    const clock = (NOTICE + this.t) % 24, day = Phaser.Math.Clamp(Math.min((clock - 6.6) / 1.2, (17.6 - clock) / 1.2), 0, 1), edge = day > 0 && day < 1;
    this.sky.setFillStyle(Phaser.Display.Color.GetColor(10 + day * (edge ? 190 : 70), 18 + day * (edge ? 120 : 140), 48 + day * 180)); this.stars.setAlpha(1 - day);
    this.site.setTint(Phaser.Display.Color.GetColor(90 + day * 165, 105 + day * 150, 150 + day * 105)); this.rocket.setTint(day > 0.5 ? 0xffffff : 0xb8c4e0);
    if (!this.timeT) this.timeT = T(this, RX + 148, RY + 83, '', '#ffffff', 4.4, '700').setOrigin(1, 0).setShadow(0, 1, '#000000', 3);
    this.timeT.setText(`MĀHIA ${hm(clock)} · ${19 + Math.floor((NOTICE + this.t) / 24)} JUNE 2026`);
  }
  aux?: Phaser.GameObjects.Text[]; timeT?: Phaser.GameObjects.Text;
  liftoff() {
    this.ended = true; const t = this.t; this.draw(); this.tell(); this.vent.emitting = false; this.hum.set(0); snd.liftoff(); this.cameras.main.shake(600, 0.004);
    this.flame.startFollow(this.rocket, 0, 1); this.flame.emitting = true; this.say('Lift-off!');
    this.tweens.add({ targets: this.rocket, y: RY - 30, duration: 2600, ease: 'Quad.easeIn' });
    const stars = t <= REAL ? 3 : t <= 20 ? 2 : t <= LIMIT ? 1 : 0;
    this.time.delayedCall(2700, () => {
      this.flame.emitting = false;
      if (!stars) return finish(this, this.def, { success: false, title: `Launched at T+${hm(t)}`, text: 'Electron flew, but outside the 24 hours the Space Force asked for. Start the long chains first: Pioneer has to be encapsulated, mated, rolled out and stood up before anything can be loaded, and the range cannot be cleared until the trajectory exists.' });
      finish(this, this.def, { success: true, stars, egg: t <= REAL - 1, title: `Launched ${hm(t)} after the notice`, text: `From the notice to lift-off in ${Math.floor(t)} hours ${Math.floor((t % 1) * 60)} minutes, with the crews idle for ${this.idle.toFixed(1)} crew-hours while jobs were waiting. ${t <= REAL ? 'That beats the real thing.' : 'The real team did it in 16 hours 42 minutes: three stars for matching that.'}` });
    });
  }
}
