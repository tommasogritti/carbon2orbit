import Phaser from 'phaser';
import { W, H, T, held, just, finish, cam, img, panel, who } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import { P } from '../art';
import type { LevelDef } from '../content';

const AUTO = new URLSearchParams(location.search).has('auto');
const T0 = -120, T1 = 6; // seconds around the engine shutdown shown on the strips
const X0 = 70, XW = 240, Y0 = 22, RH = 18.4; // chart geometry
const nz = (t: number, k: number) => Math.sin(t * 3.1 + k) * 0.5 + Math.sin(t * 7.7 + k * 2.3) * 0.3 + Math.sin(t * 17.3 + k * 5) * 0.2;
interface Ch { name: string; unit: string; onset?: number; root?: boolean; says: string; f: (t: number, on: number) => number }
/** What the telemetry showed, in the order the fault ran through the stage: the root cause comes first in time, last in obviousness. */
const CHANNELS: Ch[] = [
  { name: 'CHAMBER PRESSURE', unit: 'engine', onset: 0, says: 'the engine shutting down. That is the last thing that happened, not the first', f: (t) => (t < 0 ? 0.7 + 0.02 * nz(t, 1) : 0.7 * Math.exp(-t * 2.2)) },
  { name: 'PUMP SPEED', unit: 'turbopumps', onset: -1.5, says: 'the electric pumps losing power, a second and a half before the end', f: (t) => (t < -1.5 ? 0.72 + 0.015 * nz(t, 2) : 0.72 * Math.exp(-(t + 1.5) * 1.6)) },
  { name: 'BATTERY BUS', unit: 'volts', onset: -9, says: 'the supply sagging in the last seconds. Something upstream was already wrong', f: (t) => (t < -9 ? 0.76 + 0.01 * nz(t, 3) : t < -1.5 ? 0.76 - 0.014 * (t + 9) - 0.05 * Math.abs(Math.sin(t * 4)) * ((t + 9) / 7.5) : 0.08 + 0.02 * nz(t, 3)) },
  { name: 'TANK PRESSURE', unit: 'propellant', says: '', f: (t) => 0.8 - 0.0011 * (t - T0) + 0.012 * nz(t, 4) },
  { name: 'JOINT TEMPERATURE', unit: 'electrical', onset: -58, says: 'a connection heating up for most of a minute. Heat is a result. Of what?', f: (t, on) => (t < on ? 0.3 + 0.012 * nz(t, 5) : t < 0 ? 0.3 + 0.55 * Math.pow((t - on) / -on, 1.6) + 0.012 * nz(t, 5) : 0.85 - 0.03 * t) },
  { name: 'JOINT RESISTANCE', unit: 'electrical', onset: -94, root: true, says: '', f: (t, on) => { if (t < on) return 0.24 + 0.01 * nz(t, 6); const k = Math.min(1, (t - on) / -on); return 0.24 + 0.22 * k * k + (Math.sin(t * 1.9) > 0.55 - 0.5 * k ? 0.07 + 0.3 * k : 0) + 0.01 * nz(t, 6); } },
];
const TESTS: [string, number][] = [['VIBRATION', 2], ['THERMAL VACUUM', 4], ['THERMAL CYCLE', 3], ['SUSTAINED LOAD · LOG RESISTANCE', 3]];

/**
 * Pics Or It Didn't Happen: find one bad electrical connection. First trace the telemetry back to the earliest sign of
 * trouble, then find a bench test that makes the fault show itself. The clock counts days since the failure.
 */
export class FaultFinderScene extends Phaser.Scene {
  def!: LevelDef; g!: Phaser.GameObjects.Graphics; call!: Phaser.GameObjects.Text; dayT!: Phaser.GameObjects.Text; head!: Phaser.GameObjects.Text; labels: Phaser.GameObjects.Text[] = []; aux: Phaser.GameObjects.Text[] = [];
  order: number[] = []; on: number[] = []; marks: { c: number; t: number; ok: boolean }[] = []; ct = -20; cc = 0; days = 3; wrong = 0; phase: 1 | 2 | 3 = 1; ended = false; hum!: Loop;
  bad = 0; test = 0; running = -1; prog = 0; ran: number[] = []; joint = 0; shown = false; botT = 0; hints = [0, 0, 0]; hintRow = -1;
  constructor() { super('FaultFinder'); }
  /** The controls panel (H or the ? button): what the keys do right now, in this level and this phase. Shape agreed with core's showHelp. */
  help(): { title: string; rows: [keys: string, does: string][]; note?: string } {
    if (this.phase === 1) return { title: 'Fault finder · the telemetry trace', rows: [['← →', 'Move the cursor through time.'], ['↑ ↓', 'Change channel.'], ['Space', 'Flag the point under the cursor as the first sign of trouble.']], note: 'A wrong flag costs two days. Stuck? I or the 💡 button gives a hint, for one day each.' };
    const rows: [string, string][] = [['↑ ↓', 'Choose a test.'], ['Space', 'Run the chosen test on the suspect harness. Every test costs days.']];
    if (this.shown) rows.push(['← →', 'Select a connection.'], ['Enter', 'Tag the selected connection as the root cause.']);
    return { title: 'Fault finder · the bench', rows, note: (this.shown ? '' : 'Once a test makes one connection give itself away, ← → select it and Enter tags it. ') + 'Stuck? I or the 💡 button gives a hint, for one day each.' };
  }
  /**
   * The hint button (or I): the next hint for this phase, from a nudge to the answer. Each one costs the investigation a
   * day, so hints still count against the 27 days that earn three stars.
   */
  hint(): { title: string; text: string; cost?: string } | undefined {
    if (this.ended || this.phase === 3) return undefined;
    const stage = this.phase === 1 ? 0 : this.shown ? 2 : 1, k = this.hints[stage]; // the trace, choosing a test, choosing a connection
    const rootRow = this.order.indexOf(5), lead = Math.round(-this.on[5] / 10) * 10;
    const steps = this.phase === 1 ? [
      { title: 'Work backwards', text: 'Start at the red SHUTDOWN line and move left. Every channel that goes wrong was pushed by something that went wrong earlier. The first sign of trouble is the change furthest to the left, on whichever channel it is.' },
      { title: 'Which kind of channel?', text: 'The engine, the pumps and the battery are all symptoms of the same thing. Look at the electrical channels: one of them starts changing long before the others, well over a minute before the shutdown.' },
      { title: 'The channel', text: `It is <b>JOINT RESISTANCE</b>, row ${rootRow + 1} from the top: it is highlighted now. Find where its line first starts to wobble and climb, and flag that point with Space.` },
      { title: 'The moment', text: `On JOINT RESISTANCE the first blip comes about <b>${lead} seconds before the shutdown</b> (the counter under the rows shows T −${lead} s). Flag within a few seconds of it.` },
    ] : this.shown ? [
      { title: 'Which connection?', text: 'Look at the six read-outs over the harness. One bar is red and flickers while the others stay low and green: select it with ← → and tag it with Enter.' },
      { title: 'The connection', text: `It is <b>J${this.bad + 1}</b>. Select it with ← → and press Enter.` },
    ] : [
      { title: 'Which test?', text: 'The flight unit passed every standard acceptance test, so running those again tells you little. Think about what the telemetry showed: resistance climbing slowly, under a long load.' },
      { title: 'The test', text: 'Run <b>SUSTAINED LOAD · LOG RESISTANCE</b>: choose it with ↑ ↓ and press Space. Then watch which connection gives itself away.' },
    ];
    if (k >= steps.length) return undefined;
    this.hints[stage]++; this.days += 1;
    if (this.phase === 1 && k >= 2) { this.hintRow = rootRow; this.cc = rootRow; }
    return { ...steps[k], cost: `Hint ${k + 1} of ${steps.length}. Asking cost the investigation one day.` };
  }
  init(d: { def: LevelDef }) {
    this.def = d.def; this.labels = []; this.aux = []; this.marks = []; this.days = 3; this.wrong = 0; this.phase = 1; this.ended = false; this.cc = 0; this.ct = -20;
    this.order = Phaser.Utils.Array.Shuffle([0, 1, 2, 3, 4, 5]); // the rows come up in a different order every time
    this.on = CHANNELS.map((c) => (c.onset === undefined ? 0 : c.onset < -20 ? c.onset + Phaser.Math.Between(-8, 8) : c.onset));
    this.bad = Phaser.Math.Between(0, 5); this.test = 0; this.running = -1; this.prog = 0; this.ran = []; this.joint = 0; this.shown = false; this.botT = 0; this.hints = [0, 0, 0]; this.hintRow = -1;
  }
  create() {
    cam(this); stopLoops(); music.play('space'); this.hum = loop('whine'); this.hum.set(0.12, 0.05);
    img(this, 0, 0, 'bg_review').setOrigin(0);
    panel(this, 4, 4, 196, 14, 0.9); this.head = T(this, 9, 6.5, 'ACCIDENT INVESTIGATION · FLIGHT 13 · TELEMETRY', '#ffffff', 6.2, '700');
    panel(this, W - 116, 4, 112, 14, 0.9); this.dayT = T(this, W - 9, 6.5, '', '#ffe98a', 6.2, '700').setOrigin(1, 0);
    panel(this, 4, 20, W - 8, 116, 0.88);
    for (let i = 0; i < 6; i++) this.labels.push(T(this, 8, Y0 + i * RH + 3, '', '#aab4d4', 4.6, '700'));
    this.g = this.add.graphics();
    this.call = T(this, W / 2, 138.5, '', '#ffe98a', 6.2, '700').setOrigin(0.5, 0).setAlign('center').setShadow(0, 1, '#000000', 3).setWordWrapWidth(300);
    who(this, { ...this.def, role: this.def.role || 'CEO · with the investigation board' }, 4, H - 24);
    this.say('← → move through time · ↑ ↓ change channel · SPACE flag the FIRST sign of trouble');
  }
  say(s: string) { this.call.setText(s); }
  date() { const d = 4 + Math.floor(this.days); return d <= 31 ? `${d} JULY 2020` : d <= 62 ? `${d - 31} AUGUST 2020` : `${d - 62} SEPTEMBER 2020`; }
  X(t: number) { return X0 + ((t - T0) / (T1 - T0)) * XW; }
  update(_t: number, dms: number) {
    if (this.ended) return;
    const dt = Math.min(0.05, dms / 1000);
    this.days += dt * 0.25; this.botT += dt;
    this.dayT.setText(`DAY ${Math.floor(this.days)} · ${this.date()}`).setColor(this.days > 27 ? '#ff8a70' : '#ffe98a');
    if (this.phase === 1) this.trace(dt); else if (this.phase === 2) this.bench(dt);
    if (this.days > 90) { this.ended = true; finish(this, this.def, { success: false, title: 'Still grounded', text: 'Three months on and the cause is still open. Start from the end of the flight and work backwards: each symptom points at something that began earlier.' }); }
  }

  // ---------- phase 1: trace the telemetry back ----------
  trace(dt: number) {
    const row = this.order.indexOf(5), rootOn = this.on[5];
    if (AUTO) { // the bot walks the cursor to the root channel's first blip
      if (this.cc !== row) { if (this.botT > 0.25) { this.botT = 0; this.cc += Math.sign(row - this.cc); } }
      else if (Math.abs(this.ct - rootOn) > 1.5) this.ct += Math.sign(rootOn - this.ct) * Math.min(60 * dt, Math.abs(this.ct - rootOn));
      else if (this.botT > 0.4) this.flag();
    } else {
      this.ct = Phaser.Math.Clamp(this.ct + ((held('right') ? 1 : 0) - (held('left') ? 1 : 0)) * 34 * dt, T0, T1);
      if (just('down')) { this.cc = (this.cc + 1) % 6; snd.tick(); } if (just('up')) { this.cc = (this.cc + 5) % 6; snd.tick(); }
      if (just('a')) this.flag();
    }
    const g = this.g; g.clear();
    this.order.forEach((ci, r) => {
      const ch = CHANNELS[ci], y = Y0 + r * RH, sel = r === this.cc;
      this.labels[r].setText(`${ch.name}\n${ch.unit}`).setColor(sel ? '#ffffff' : '#8fa3c8');
      g.fillStyle(sel ? 0x1c2a4a : 0x0b1020, sel ? 0.9 : 0.6).fillRect(X0, y, XW, RH - 2);
      if (r === this.hintRow) g.lineStyle(0.6, 0xffe98a, 0.55 + 0.35 * Math.sin(this.time.now / 180)).strokeRect(X0 - 0.5, y - 0.5, XW + 1, RH - 1);
      g.lineStyle(0.6, sel ? 0x7fd0ff : 0x5f7fb0, 1).beginPath();
      for (let i = 0; i <= 250; i++) { const t = T0 + ((T1 - T0) * i) / 250, v = Phaser.Math.Clamp(ch.f(t, this.on[ci]), 0, 1), px = X0 + (XW * i) / 250, py = y + (RH - 3) * (1 - v) + 0.5; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
      g.strokePath();
    });
    g.lineStyle(0.5, P.red, 0.9).lineBetween(this.X(0), Y0, this.X(0), Y0 + 6 * RH - 2); // engine shutdown
    for (let t = -120; t <= 0; t += 20) g.fillStyle(0x8fa3c8, 0.6).fillRect(this.X(t), Y0 + 6 * RH - 2, 0.4, 2);
    for (const m of this.marks) { const y = Y0 + m.c * RH; g.lineStyle(0.6, m.ok ? P.lgreen : P.orange, 1).lineBetween(this.X(m.t), y, this.X(m.t), y + RH - 2); g.fillStyle(m.ok ? P.lgreen : P.orange).fillTriangle(this.X(m.t) - 1.6, y, this.X(m.t) + 1.6, y, this.X(m.t), y + 2.4); }
    const cx = this.X(this.ct), cy = Y0 + this.cc * RH;
    g.lineStyle(0.5, 0xffffff, 0.5).lineBetween(cx, Y0, cx, Y0 + 6 * RH - 2); g.lineStyle(0.8, 0xffe98a, 1).strokeRect(cx - 2.5, cy, 5, RH - 2);
    if (!this.aux.length) { this.aux.push(T(this, this.X(0) - 1.4, Y0 + 6 * RH - 1.4, 'SHUTDOWN', '#ff8a70', 3.8, '700').setOrigin(1, 0), T(this, X0, Y0 + 6 * RH - 1.4, '2 minutes earlier', '#8fa3c8', 3.8, '700'), T(this, 8, Y0 + 6 * RH - 1.4, '', '#ffe98a', 3.8, '700')); }
    this.aux[2].setText(`T ${this.ct >= 0 ? '+' : '−'}${Math.abs(this.ct).toFixed(0)} s`);
  }
  flag() {
    const ci = this.order[this.cc], ch = CHANNELS[ci], on = this.on[ci];
    if (ch.root && Math.abs(this.ct - on) <= 7) { // found it
      this.marks.push({ c: this.cc, t: on, ok: true }); snd.egg();
      this.say('There. Long before the end, one connection starts to come and go.\nResistance, then heat, then no power to the pumps. Now prove it on the bench.');
      this.phase = 3; this.time.delayedCall(AUTO ? 600 : 2600, () => this.benchStart()); return;
    }
    this.wrong++; this.days += 2; snd.deny(); this.cameras.main.shake(100, 0.003);
    if (ch.onset === undefined) this.say(`${ch.name}: nominal all the way. Nothing here. (2 days spent)`);
    else if (ch.root) this.say(this.ct > on ? 'This is the right channel, but it starts earlier than that. Go left. (2 days spent)' : 'Still quiet here. The first blip is later. (2 days spent)');
    else if (this.ct < on - 4) this.say(`${ch.name} is still nominal at this point. (2 days spent)`);
    else { this.marks.push({ c: this.cc, t: on, ok: false }); this.say(`A symptom: ${ch.says}. (2 days spent)`); }
  }

  // ---------- phase 2: make it happen again ----------
  benchStart() {
    this.phase = 2; this.g.clear(); this.labels.forEach((l) => l.setText('')); this.aux.forEach((a) => a.destroy()); this.aux = []; this.botT = 0;
    this.head.setText('ACCIDENT INVESTIGATION · FLIGHT 13 · BENCH');
    this.aux.push(T(this, 10, 24, 'TEST', '#aab4d4', 4.6, '700'), T(this, 122, 24, 'SUSPECT HARNESS · SIX CONNECTIONS', '#aab4d4', 4.6, '700'));
    TESTS.forEach(([n, d], i) => this.aux.push(T(this, 14, 34 + i * 17, `${n}`, '#ffffff', i === 3 ? 4.3 : 5, '700'), T(this, 14, 34 + i * 17 + 6.4, `${d} days`, '#8fa3c8', 4)));
    for (let j = 0; j < 6; j++) this.aux.push(T(this, 136 + j * 30, 121, 'J' + (j + 1), '#ffffff', 5.4, '700').setOrigin(0.5, 0));
    this.say('↑ ↓ choose a test · SPACE run it · then ← → pick the connection and ENTER to tag it');
  }
  bench(dt: number) {
    const g = this.g; g.clear();
    const idle = this.running < 0;
    if (AUTO && idle) { // the bot goes straight to the test the telemetry suggests
      if (!this.shown) { if (this.test !== 3) { if (this.botT > 0.25) { this.botT = 0; this.test++; } } else if (this.botT > 0.3) this.run(); }
      else if (this.joint !== this.bad) { if (this.botT > 0.2) { this.botT = 0; this.joint += Math.sign(this.bad - this.joint); } } else if (this.botT > 0.4) this.tag();
    } else if (idle) {
      if (just('down')) { this.test = (this.test + 1) % 4; snd.tick(); } if (just('up')) { this.test = (this.test + 3) % 4; snd.tick(); }
      if (just('right')) { this.joint = (this.joint + 1) % 6; snd.tick(); } if (just('left')) { this.joint = (this.joint + 5) % 6; snd.tick(); }
      if (just('a')) this.run(); if (just('b')) this.tag();
    }
    if (!idle) { // a test in progress: time passes on the calendar, too
      this.prog += dt / 1.6; this.hum.set(0.5, 0.3 + this.prog * 0.5);
      if (this.prog >= 1) {
        const k = this.running; this.running = -1; this.hum.set(0.12, 0.05); this.ran.push(k); this.days += TESTS[k][1]; this.botT = 0;
        if (k === 3) { this.shown = true; snd.alarm(); this.say('One of them climbs, and flickers. ← → pick it, ENTER to tag it.'); }
        else { snd.tick(); this.say(`${TESTS[k][0]}: all six pass. So did the flight unit: this is a standard acceptance test.\nWhat did the telemetry show? Resistance climbing slowly, under load.`); }
      }
    }
    TESTS.forEach((_x, i) => { const y = 32 + i * 17, sel = i === this.test; g.fillStyle(sel ? 0x1c2a4a : 0x0b1020, 0.9).fillRoundedRect(8, y, 104, 15.4, 2); g.lineStyle(0.5, sel ? 0xffe98a : 0x5f7fb0, sel ? 1 : 0.5).strokeRoundedRect(8, y, 104, 15.4, 2); if (this.ran.includes(i)) g.fillStyle(i === 3 ? P.red : P.lgreen).fillCircle(106, y + 4, 1.6); if (this.running === i) g.fillStyle(0xffe98a).fillRect(8, y + 14.2, 104 * this.prog, 1.2); });
    // the harness: a board, six connections, a resistance read-out over each
    g.fillStyle(0x1f5a34, 0.95).fillRoundedRect(120, 94, 186, 24, 2); g.lineStyle(0.5, 0x7cc56b, 0.6).strokeRoundedRect(120, 94, 186, 24, 2);
    for (let j = 0; j < 6; j++) {
      const x = 136 + j * 30, sel = j === this.joint, t = this.time.now / 1000;
      let r = 0.18 + 0.01 * nz(t * 3, j);
      const live = this.running === 3 || this.shown;
      if (live && j === this.bad) { const k = this.running === 3 ? this.prog : 1; r = 0.18 + 0.5 * k * k + (Math.sin(t * 9) > 0.3 ? 0.18 * k : 0); }
      g.lineStyle(0.5, 0xc9a66b, 0.9).lineBetween(x, 94, x, 86).lineBetween(x - 15, 106, x + 15, 106);
      g.fillStyle(0xdfe5ee).fillRoundedRect(x - 5, 100, 10, 12, 1.4); g.fillStyle(0x23262f).fillRect(x - 3, 102, 6, 3); g.fillStyle(0xc9a66b).fillRect(x - 3.4, 107, 1.4, 4).fillRect(x + 2, 107, 1.4, 4);
      g.fillStyle(0x000000, 0.55).fillRoundedRect(x - 4, 36, 8, 50, 2); const hh = 50 * Phaser.Math.Clamp(r, 0, 1); g.fillStyle(r > 0.4 ? P.red : P.lgreen).fillRoundedRect(x - 4, 86 - hh, 8, hh, 2);
      if (this.ran.length && !live && this.running < 0) g.fillStyle(P.lgreen).fillCircle(x, 31, 1.4);
      if (sel) g.lineStyle(0.8, 0xffe98a, 1).strokeRoundedRect(x - 9, 28, 18, 103, 2);
    }
  }
  run() { if (this.shown && this.test === 3) return snd.deny(); this.running = this.test; this.prog = 0; snd.select(); this.say(`Running ${TESTS[this.test][0].toLowerCase()}…`); }
  tag() {
    if (!this.ran.length) { snd.deny(); this.say('Nothing to go on yet: run a test first.'); return; }
    if (!this.shown || this.joint !== this.bad) { this.wrong++; this.days += 3; snd.deny(); this.cameras.main.shake(100, 0.003); this.say(this.shown ? 'Not that one: its resistance is flat. (3 days spent)' : 'Every connection has passed every test so far. A guess costs 3 days.'); return; }
    this.ended = true; this.hum.set(0); snd.clank();
    const d = Math.floor(this.days), stars = d <= 27 ? 3 : d <= 45 ? 2 : 1, clean = this.wrong === 0 && this.ran.length === 1;
    this.time.delayedCall(700, () => finish(this, this.def, { success: true, stars, egg: clean, title: `Root cause on day ${d}`, text: `Connection J${this.bad + 1}: sound in every standard test, and coming apart under a long, hot load. ${this.wrong ? `False leads: ${this.wrong}. ` : 'No false leads. '}Tests run: ${this.ran.length}. The real investigation was signed off on day 27. ${d <= 27 ? 'You matched it.' : 'Three stars for 27 days or fewer.'}` }));
  }
}
