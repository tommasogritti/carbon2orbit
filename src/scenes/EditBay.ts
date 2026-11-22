import Phaser from 'phaser';
import { W, T, held, just, finish, cam, img, panel } from '../core';
import { snd, music, stopLoops } from '../audio';
import { P, S, tex, lg, rg, rr, el, line, rng, OUT, type C2 } from '../art';
import type { LevelDef } from '../content';

const AUTO = new URLSearchParams(location.search).has('auto');

/**
 * The edit bay (mechanic `edit-bay`, spec §10.13): a recording comes in as one long tape and has to go out as several
 * videos on several channels, each before the moment it goes live.
 *
 * Two modes, usually played as two acts (`params.then`):
 * - `parts`: scrub along the tape and cut it at the breaks between speakers' turns; each finished part drops into the
 *   OUT tray and is sent to a channel. Uploads share one connection.
 * - `full`: splice the parts back together in order, then send the full cut to every channel. With a shared connection,
 *   the order in which the uploads are started decides which channels make their time.
 * Everything about the setting (the room, the clocks, the music, the words on the result card) is in THEMES.
 */
interface Chan { name: string; handle: string; chip: string; part: number; due: number; len?: number }
interface Lane extends Chan { slot: number; clip: number; size: number; prog: number; state: 'empty' | 'up' | 'stall' | 'pause' | 'done' | 'live'; ok?: boolean; late?: boolean; stallDue?: boolean }
interface Theme {
  music: string; room: (c: C2) => void; plate: string; plateRole: string;
  partsTitle: string; fullTitle: string; partsText: (ok: number, n: number, late: number, sloppy: number) => string; fullText: (ok: number, n: number, late: number) => string;
  note: string; stallNote: string;
}
const THEMES: Record<string, Theme> = {
  'q2-2024': {
    music: 'factory', room: roomQ2, plate: 'THE EDIT DESK', plateRole: 'a game role: each creator posted his own videos',
    partsTitle: 'Four parts, four channels', fullTitle: 'The full cuts are up',
    partsText: (ok, n, late, sloppy) => `${ok} of ${n} parts went live on the right channel${late ? `, ${late} of them late` : ', each one on time'}${sloppy ? `, and ${sloppy} cut${sloppy > 1 ? 's' : ''} landed off the break` : ''}.`,
    fullText: (ok, n, late) => `${ok} of ${n} full cuts went up${late ? `, ${late} after their time` : ' on time'}.`,
    note: 'CHAPTER LIST: your next cut snaps to the break. (The breaks are the chapter marks of Scott O’s full cut, which the game borrows two days early.)',
    stallNote: 'upload stalled · ↑ ↓ to it, Enter retries',
  },
};
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const dur = (s: number) => `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s`;
const hm = (m: number) => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
/** "SUN 11 AUG" for the level's date shifted by whole days. */
const dayLabel = (iso: string, shift: number) => { const [y, m, d] = iso.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d + shift)); return `${DAYS[t.getUTCDay()]} ${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}`; };

const TX = 6, TW = 308, CX = TX + TW / 2; // the tape view: left edge, width, and the fixed cursor in the middle
const LX = 4, LY = 85, LW = 202, LH = 22.6; // the channel lanes
const RX = 210; // the right-hand column: OUT tray, messages, clocks

export class EditBayScene extends Phaser.Scene {
  def!: LevelDef; p: any; th!: Theme; mode: 'parts' | 'full' = 'parts';
  min = 0; rate = 0.36; ended = false; lanes: Lane[] = []; sel = 0; misses = 0; late = 0; sloppy = 0; pulls = 0; wrongSends = 0; exact = true; ffwd = false;
  // parts mode
  cur = 0; vel = 0; holdT = 0; hw = 120; cutAt: (number | undefined)[] = []; cutKind: ('exact' | 'clean' | 'sloppy')[] = []; made: boolean[] = []; tray: number[] = []; notes: number[] = []; snap = false;
  turns: { t0: number; t1: number; who: string; q: boolean }[] = [];
  // full mode
  bin: number[] = []; binSel = 0; spliced: number[] = []; render = 0; ready = false;
  hiccups: [number, number][] = []; botT = 0;
  g!: Phaser.GameObjects.Graphics; chips: Phaser.GameObjects.Image[] = []; laneT: Phaser.GameObjects.Text[] = []; laneS: Phaser.GameObjects.Text[] = []; laneChip: Phaser.GameObjects.Image[] = []; laneClip: Phaser.GameObjects.Image[] = [];
  topL!: Phaser.GameObjects.Text; topR!: Phaser.GameObjects.Text; curT!: Phaser.GameObjects.Text; edgeT: Phaser.GameObjects.Text[] = []; trayT!: Phaser.GameObjects.Text; trayChip!: Phaser.GameObjects.Image; msg!: Phaser.GameObjects.Text; clockT: Phaser.GameObjects.Text[] = []; binT: Phaser.GameObjects.Text[] = []; binChip: Phaser.GameObjects.Image[] = [];
  constructor() { super('EditBay'); }
  /** The controls panel (H or the ? button), by mode. Shape agreed with core's showHelp. */
  help(): { title: string; rows: [keys: string, does: string][]; note?: string } {
    if (this.mode === 'full') return { title: 'Edit bay · full cuts', rows: [['← →', 'Choose a part in the bin.'], ['Space', 'Splice the chosen part onto the end of the full cut. They go in order: part 1 first.'], ['↑ ↓', 'Choose a channel.'], ['Enter', 'On a channel: start sending the full cut, pause a running upload (or resume it), or retry a STALLED one.']], note: 'Every upload running at once shares the same connection, so two at once each go at half speed. Start the channels that go live first.' };
    return { title: 'Edit bay · cutting the parts', rows: [['← →', 'Scrub along the tape. Hold to go faster; let go and the view zooms in.'], ['Space', 'Cut the tape at the yellow line. Or, on a sticky note, pick up the chapter list: your next cut snaps to the break.'], ['↑ ↓', 'Choose a channel.'], ['Enter', 'On a channel: send it the part in the OUT tray, pull back the part it has, or retry a STALLED upload.']], note: 'Cut in the quiet gap where one creator’s turn ends and the next one’s begins: the faces above the waveform show who is asking. Match each part’s face to the channel with the same face. Every upload running at once shares one connection.' };
  }
  init(d: { def: LevelDef }) {
    this.def = d.def; this.p = d.def.params; this.th = THEMES[this.p.theme]; this.mode = this.p.mode === 'full' ? 'full' : 'parts';
    this.min = this.p.clock.start; this.rate = this.p.clock.rate; this.ended = false; this.sel = 0; this.misses = 0; this.late = 0; this.sloppy = 0; this.pulls = 0; this.wrongSends = 0; this.exact = true; this.ffwd = false; this.botT = 0;
    this.hiccups = (this.p.hiccups || []).map((h: [number, number]) => [...h] as [number, number]);
    // the channels sit in a different order on every play, so a part goes by the face, not by its number
    const order = Phaser.Utils.Array.Shuffle((this.p.channels as Chan[]).map((_c, i) => i));
    this.lanes = (this.p.channels as Chan[]).map((c, i) => ({ ...c, slot: order.indexOf(i), clip: -1, size: 0, prog: 0, state: 'empty' as const }));
    const tp = this.p.tape;
    this.cur = tp ? tp.from + 20 : 0; this.vel = 0; this.holdT = 0; this.hw = 120; this.cutAt = []; this.cutKind = []; this.tray = []; this.snap = false; this.notes = tp ? [...(this.p.notes || [])] : [];
    this.made = (this.p.parts as unknown[]).map(() => false);
    this.bin = Phaser.Utils.Array.Shuffle((this.p.parts as unknown[]).map((_x, i) => i)); this.binSel = 0; this.spliced = []; this.render = 0; this.ready = false;
    this.chips = []; this.laneT = []; this.laneS = []; this.laneChip = []; this.laneClip = []; this.edgeT = []; this.clockT = []; this.binT = []; this.binChip = []; this.liveT = undefined; this.botV = undefined;
    if (tp) this.turns = this.layTurns();
  }
  /**
   * Who is speaking along the tape. A picture, not a transcript: in each part its creator asks (short turns) and the two
   * guests answer (long turns). Turns meet with a short dip; a part ends in a longer quiet gap, which is where a cut goes.
   */
  layTurns() {
    const tp = this.p.tape, b = [tp.from, ...tp.marks, tp.to], r = rng(7), out: { t0: number; t1: number; who: string; q: boolean }[] = [];
    (this.p.parts as { who: string }[]).forEach((pt, i) => {
      let t = b[i] + (i ? 3 : 0); const end = b[i + 1] - 3; let q = true;
      while (t < end - 4) { const len = q ? 18 + r() * 22 : 50 + r() * 90, t1 = Math.min(end, t + len); out.push({ t0: t, t1, who: q ? pt.who : this.p.guests[Math.floor(r() * this.p.guests.length)], q }); t = t1 + 0.8; q = !q; }
    });
    return out;
  }
  create() {
    cam(this); stopLoops(); music.play(this.th.music, 1);
    const key = 'eb_room_' + this.p.theme;
    if (!this.textures.exists(key)) tex(this, key, W, 180, (c) => this.th.room(c));
    img(this, 0, 0, key).setOrigin(0);
    panel(this, 4, 3, W - 8, 14, 0.9);
    this.topL = T(this, 8, 5.4, '', '#ffe98a', 6.6, '700'); this.topR = T(this, W - 8, 6.2, '', '#cfd6ea', 4.6, '700').setOrigin(1, 0);
    panel(this, 4, 20, W - 8, 61, 0.88);
    this.g = this.add.graphics().setDepth(2);
    for (let i = 0; i < 40; i++) this.chips.push(img(this, 0, 0, 'peter_chip').setScale(S * 0.26).setDepth(3).setVisible(false));
    this.curT = T(this, CX, 31, '', '#ffe98a', 4.8, '700').setOrigin(0.5, 0).setDepth(4);
    this.edgeT = [T(this, TX, 31, '', '#7483a6', 3.8, '700').setDepth(4), T(this, TX + TW, 31, '', '#7483a6', 3.8, '700').setOrigin(1, 0).setDepth(4)];
    if (this.mode === 'parts') { T(this, TX + 40, 31, 'RED: A CREATOR ASKS', '#ff8a70', 3.6, '700').setDepth(4); T(this, TX + TW - 40, 31, 'BLUE: A GUEST ANSWERS', '#7fb4ff', 3.6, '700').setOrigin(1, 0).setDepth(4); }
    panel(this, LX, LY - 3, LW, LH * 4 + 4, 0.88);
    this.lanes.forEach(() => { this.laneChip.push(img(this, 0, 0, 'peter_chip').setScale(S * 0.56).setDepth(3)); this.laneClip.push(img(this, 0, 0, 'peter_chip').setScale(S * 0.3).setDepth(3).setVisible(false)); this.laneT.push(T(this, 0, 0, '', '#ffffff', 5.4, '700').setDepth(3)); this.laneS.push(T(this, 0, 0, '', '#aab4d4', 4, '700').setDepth(3)); });
    panel(this, RX, LY - 3, W - RX - 4, 34, 0.9);
    this.trayT = T(this, RX + 24, LY, '', '#ffffff', 4.4, '700').setDepth(3).setWordWrapWidth(W - RX - 30);
    this.trayChip = img(this, RX + 12, LY + 13, 'peter_chip').setScale(S * 0.6).setDepth(3).setVisible(false);
    this.msg = T(this, RX + 3, LY + 34, '', '#ffe98a', 4.4, '700').setDepth(5).setWordWrapWidth(W - RX - 8).setShadow(0, 1, '#000000', 2);
    if (!this.textures.exists('eb_clock')) tex(this, 'eb_clock', 22, 22, (c) => { el(c, 11, 11, 10.6, 10.6, '#0b0c12'); el(c, 11, 11, 9.6, 9.6, lg(c, 0, 1, 0, 21, [0, '#f4f1e8'], [1, '#d8d2c2']), OUT, 0.5); for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; line(c, 11 + Math.sin(a) * 7.8, 11 - Math.cos(a) * 7.8, 11 + Math.sin(a) * (k % 3 ? 8.7 : 9.1), 11 - Math.cos(a) * (k % 3 ? 8.7 : 9.1), '#3a3c48', k % 3 ? 0.35 : 0.7); } });
    (this.p.clock.zones as unknown[]).forEach((_z, i) => img(this, CLX + i * 34, CLY, 'eb_clock').setDepth(1));
    (this.p.clock.zones as [string, string, number][]).forEach((_z, i) => this.clockT.push(T(this, CLX + i * 34, CLY + 11, '', '#cfd6ea', 3.4, '700').setOrigin(0.5, 0).setAlign('center').setDepth(3).setShadow(0, 1, '#000000', 2)));
    if (this.mode === 'full') (this.p.parts as unknown[]).forEach(() => { this.binChip.push(img(this, 0, 0, 'peter_chip').setScale(S * 0.42).setDepth(3)); this.binT.push(T(this, 0, 0, '', '#ffffff', 4.2, '700').setOrigin(0.5, 0).setDepth(3)); });
    this.plate();
    this.say(this.mode === 'parts' ? 'The recording is in. Cut it into its parts: ← → scrub, Space cuts at a break.' : 'The parts are live. Now the full cuts: ← → and Space splice the parts in order.');
  }
  /** Who the player is: a game role, not a real person. Fades after a few seconds, like every name plate. */
  plate() {
    const x = 8, y = 38, parts = [panel(this, x, y, 104, 20, 0.92).setDepth(48), T(this, x + 5, y + 3, this.th.plate, '#ffffff', 6.4, '700').setDepth(49), T(this, x + 5, y + 11.6, this.th.plateRole, '#ffe98a', 4.2).setDepth(49)];
    parts.forEach((o) => o.setAlpha(0)); this.tweens.add({ targets: parts, alpha: 1, duration: 250 });
    this.tweens.add({ targets: parts, alpha: 0, delay: 4200, duration: 600, onComplete: () => parts.forEach((o) => o.destroy()) });
  }
  say(s: string) { this.msg.setText(s); }
  laneAt(slot: number) { return this.lanes.find((l) => l.slot === slot)!; }
  bounds(i: number) { const tp = this.p.tape, b = [tp.from, ...tp.marks, tp.to]; return [i ? this.cutAt[i - 1] ?? b[i] : b[0], i < tp.marks.length ? this.cutAt[i] ?? b[i + 1] : b[i + 1]] as [number, number]; }

  update(_t: number, dms: number) {
    if (this.ended) return;
    const dt = Math.min(0.05, dms / 1000);
    this.min += (dt / this.rate) * (this.ffwd ? 8 : 1);
    if (this.mode === 'parts') this.parts(dt); else this.full(dt);
    this.lanesStep(dt);
    this.draw();
  }
  // ------------------------------------------------------------ act one: cut and send
  parts(dt: number) {
    const tp = this.p.tape;
    let dir = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), cut = just('a'), send = just('b'), up = just('up'), down = just('down');
    if (AUTO) { [dir, cut, send, up, down] = this.botParts(dt); }
    if (dir) { this.holdT += dt; const v = 28 * (1 + Math.min(1.4, this.holdT) * 6.5); this.vel = dir * v; } else { this.holdT = 0; this.vel = 0; }
    if (AUTO && this.botV !== undefined) this.vel = this.botV;
    this.cur = Phaser.Math.Clamp(this.cur + this.vel * dt, tp.from, tp.to);
    this.hw += (Phaser.Math.Clamp(45 + Math.abs(this.vel) * 1.25, 45, 320) - this.hw) * Math.min(1, dt * 5); // zoom out while scrubbing fast
    if (up) { this.sel = (this.sel + this.lanes.length - 1) % this.lanes.length; snd.tick(); }
    if (down) { this.sel = (this.sel + 1) % this.lanes.length; snd.tick(); }
    if (cut) this.cut();
    if (send) this.enterParts();
  }
  cut() {
    const tp = this.p.tape, ni = this.notes.findIndex((n) => Math.abs(n - this.cur) < Math.max(5, this.hw * 0.035));
    if (ni >= 0) { this.notes.splice(ni, 1); this.snap = true; snd.power(); return this.say(this.th.note); }
    const k = tp.marks.reduce((b: number, m: number, i: number) => (Math.abs(m - this.cur) < Math.abs(tp.marks[b] - this.cur) ? i : b), 0), d = this.cur - tp.marks[k];
    if (this.cutAt[k] !== undefined) { snd.deny(); return this.say('That break is already cut.'); }
    if (this.snap && Math.abs(d) < 45) { this.snap = false; this.cutAt[k] = tp.marks[k]; this.cutKind[k] = 'exact'; snd.click(); this.say(`Clean cut at ${mmss(tp.marks[k])}: the chapter list put it right on the break.`); }
    else if (Math.abs(d) <= 1.2) { this.cutAt[k] = this.cur; this.cutKind[k] = 'exact'; snd.click(); this.say(`Cut at ${mmss(this.cur)}: right on the break.`); }
    else if (Math.abs(d) <= 3.2) { this.cutAt[k] = this.cur; this.cutKind[k] = 'clean'; this.exact = false; snd.click(); this.say(`Cut at ${mmss(this.cur)}: in the gap.`); }
    else if (Math.abs(d) <= 25) { this.cutAt[k] = this.cur; this.cutKind[k] = 'sloppy'; this.exact = false; this.sloppy++; this.misses++; snd.dud(); this.say(`Cut at ${mmss(this.cur)}, ${Math.round(Math.abs(d))} s ${d < 0 ? 'before' : 'after'} the break: someone is cut off mid-sentence. It will do.`); }
    else { snd.deny(); this.min += 5; this.cameras.main.shake(100, 0.003); return this.say('No break here: that is the middle of somebody’s turn. Five minutes lost finding your place.'); }
    (this.p.parts as unknown[]).forEach((_x, i) => { // a part is finished once both its ends are cut
      if (this.made[i]) return;
      if ((i === 0 || this.cutAt[i - 1] !== undefined) && (i === tp.marks.length || this.cutAt[i] !== undefined)) { this.made[i] = true; this.tray.push(i); }
    });
  }
  enterParts() {
    const l = this.laneAt(this.sel);
    if (l.state === 'stall') { l.state = 'up'; snd.select(); return this.say(`${l.name}: upload restarted.`); }
    if (l.clip < 0 && this.tray.length) {
      const part = this.tray.shift()!, [a, b] = this.bounds(part);
      l.clip = part; l.size = b - a; l.prog = 0; l.state = 'up'; if (part !== l.part) this.wrongSends++; snd.select();
      return this.say(`Part ${part + 1} is uploading to ${l.name}.`);
    }
    if (l.clip >= 0 && l.state !== 'live') { this.tray.unshift(l.clip); this.say(`Part ${l.clip + 1} pulled back from ${l.name}.`); l.clip = -1; l.prog = 0; l.state = 'empty'; this.pulls++; return snd.move(); }
    snd.deny(); this.say(this.tray.length ? 'That channel is already live.' : 'The OUT tray is empty: cut a part first.');
  }
  botV?: number;
  botParts(dt: number): [number, boolean, boolean, boolean, boolean] {
    this.botT += dt; const tp = this.p.tape; let cut = false, send = false;
    const stalled = this.lanes.find((l) => l.state === 'stall');
    const target = stalled || this.lanes.find((l) => this.tray[0] === l.part && l.clip < 0);
    if (target && this.sel !== target.slot && this.botT > 0.15) { this.sel = target.slot; this.botT = 0; }
    else if (target && this.botT > 0.25) { send = true; this.botT = 0; }
    const next = tp.marks.findIndex((_m: number, i: number) => this.cutAt[i] === undefined), aim = this.notes.length ? this.notes[0] : next >= 0 ? tp.marks[next] : undefined;
    if (aim === undefined) this.botV = 0;
    else { const d = aim - this.cur; this.botV = Math.sign(d) * Math.min(220, Math.abs(d) * 3 + 0.4); if (Math.abs(d) < 0.6 && !send) { cut = true; this.botV = 0; } }
    return [0, cut, send, false, false];
  }
  // ------------------------------------------------------------ act two: splice and send the full cut
  full(dt: number) {
    let left = just('left'), right = just('right'), splice = just('a'), send = just('b'), up = just('up'), down = just('down');
    if (AUTO) [left, right, splice, send, up, down] = this.botFull(dt);
    if (left) { this.binSel = (this.binSel + this.bin.length - 1) % this.bin.length; snd.tick(); }
    if (right) { this.binSel = (this.binSel + 1) % this.bin.length; snd.tick(); }
    if (up) { this.sel = (this.sel + this.lanes.length - 1) % this.lanes.length; snd.tick(); }
    if (down) { this.sel = (this.sel + 1) % this.lanes.length; snd.tick(); }
    if (splice) {
      const part = this.bin[this.binSel];
      if (part === undefined) { snd.deny(); this.say('The bin is empty: the full cut is spliced.'); }
      else if (part !== this.spliced.length) { snd.deny(); this.min += 4; this.say(`Part ${this.spliced.length + 1} comes next: the interview runs in order. Four minutes lost.`); }
      else { this.spliced.push(part); this.bin.splice(this.binSel, 1); this.binSel = Math.min(this.binSel, Math.max(0, this.bin.length - 1)); snd.click(); this.say(this.bin.length ? `Part ${part + 1} spliced.` : `All ${this.spliced.length} parts spliced. Rendering the full cut…`); }
    }
    if (this.spliced.length === this.p.parts.length && !this.ready) { this.render += dt / this.rate; if (this.render >= this.p.render) { this.ready = true; snd.pickup(); this.say('The full cut is rendered. ↑ ↓ choose a channel, Enter sends it.'); } }
    if (send) this.enterFull();
  }
  enterFull() {
    const l = this.laneAt(this.sel);
    if (l.state === 'stall') { l.state = 'up'; snd.select(); return this.say(`${l.name}: upload restarted.`); }
    if (l.state === 'empty') { if (!this.ready) { snd.deny(); return this.say('Splice and render the full cut first.'); } l.clip = 0; l.size = l.len!; l.prog = 0; l.state = 'up'; snd.select(); return this.say(`Full cut uploading to ${l.name}.`); }
    if (l.state === 'up') { l.state = 'pause'; snd.move(); return this.say(`${l.name}: paused, to give the others the bandwidth.`); }
    if (l.state === 'pause') { l.state = 'up'; snd.select(); return this.say(`${l.name}: resumed.`); }
    snd.deny();
  }
  botFull(dt: number): boolean[] {
    this.botT += dt; const out = [false, false, false, false, false, false];
    if (this.botT < 0.3) return out;
    this.botT = 0;
    if (this.bin.length) { const want = this.bin.indexOf(this.spliced.length); if (want === this.binSel) out[2] = true; else out[1] = true; return out; }
    const stalled = this.lanes.find((l) => l.state === 'stall');
    const next = stalled || (this.ready && !this.lanes.some((l) => l.state === 'up') ? [...this.lanes].filter((l) => l.state === 'empty').sort((a, b) => a.due - b.due)[0] : undefined);
    if (!next) return out;
    if (this.sel !== next.slot) this.sel = next.slot; else out[3] = true;
    return out;
  }
  // ------------------------------------------------------------ both acts: uploads, stalls and going live
  lanesStep(dt: number) {
    const dmin = (dt / this.rate) * (this.ffwd ? 8 : 1);
    for (const h of this.hiccups) if (this.min >= h[0]) { const l = this.lanes[h[1]]; if (l) l.stallDue = true; h[0] = Infinity; }
    for (const l of this.lanes) if (l.stallDue && l.state === 'up') { l.stallDue = false; l.state = 'stall'; snd.alarm(); this.say(`${l.name}: ${this.th.stallNote}.`); }
    const active = this.lanes.filter((l) => l.state === 'up');
    for (const l of active) { l.prog += (this.p.bandwidth / active.length) * dmin; if (l.prog >= l.size) { l.prog = l.size; l.state = 'done'; snd.pickup(); } }
    for (const l of this.lanes) {
      if (l.state === 'done' && (this.min >= l.due || l.late)) this.goLive(l);
      if (l.state !== 'live' && l.state !== 'done' && this.min >= l.due && !l.late) { l.late = true; this.say(`${l.name} was due to go live at ${hm(l.due)}. It goes up as soon as it is ready.`); snd.deny(); }
    }
    const allIn = this.lanes.every((l) => l.state === 'done' || l.state === 'live');
    this.ffwd = allIn && (this.mode === 'full' || this.tray.length === 0);
    if (this.lanes.every((l) => l.state === 'live')) { this.ended = true; this.draw(); this.time.delayedCall(1600, () => this.done()); }
    else if (this.min > Math.max(...this.lanes.map((l) => l.due)) + this.p.grace) { this.ended = true; this.done(); }
  }
  goLive(l: Lane) {
    l.state = 'live'; l.ok = this.mode === 'full' || l.clip === l.part;
    if (l.late) { this.late++; this.misses++; } if (!l.ok) this.misses++;
    if (l.ok) snd.seco(); else snd.deny();
    this.say(`${hm(this.min)} · ${l.name} is live${l.ok ? '' : `, with part ${l.clip + 1}: the wrong part`}${l.late ? ', late' : ''}.`);
  }
  done() {
    const n = this.lanes.length, ok = this.lanes.filter((l) => l.state === 'live' && l.ok).length, onTime = this.lanes.filter((l) => l.state === 'live' && l.ok && !l.late).length;
    if (ok < Math.ceil(n / 2)) return finish(this, this.def, { success: false, title: 'Off the air', text: this.mode === 'parts' ? 'Too many channels went up without their part. Each part belongs on the channel of the creator asking the questions in it: match the face on the part to the face on the channel.' : 'Too many channels were still uploading at the end. Every upload running at once shares the connection, so start the channels that go live first.' });
    const stars = this.misses === 0 ? 3 : this.misses <= 2 ? 2 : 1;
    const egg = this.mode === 'parts' && this.exact && this.pulls === 0 && this.wrongSends === 0;
    finish(this, this.def, { success: true, stars, egg, title: this.mode === 'parts' ? this.th.partsTitle : this.th.fullTitle, text: (this.mode === 'parts' ? this.th.partsText(ok, n, this.late, this.sloppy) : this.th.fullText(ok, n, this.late)) + (onTime < n || stars < 3 ? ' Three stars for every one on time and on the right channel' + (this.mode === 'parts' ? ', with every cut in its gap.' : '.') : '') });
  }
  // ------------------------------------------------------------ drawing
  draw() {
    const g = this.g; g.clear();
    const zones = this.p.clock.zones as [string, string, number][], date = this.p.clock.date;
    this.topL.setText(`${dayLabel(date, Math.floor(this.min / 1440))} ${date.slice(0, 4)} · ${hm(this.min)} ${zones[0][1]}${this.ffwd ? '  ▶▶' : ''}`);
    this.topR.setText(`${this.mode === 'parts' ? 'PARTS GO LIVE' : 'FULL CUTS GO LIVE'} ${[...new Set(this.lanes.map((l) => hm(l.due)))].sort().join(' · ')} ${zones[0][1]}   ·   MISSES ${this.misses}`).setColor(this.misses ? '#ff8a70' : '#cfd6ea');
    if (this.mode === 'parts') this.drawTape(g); else this.drawSplice(g);
    this.drawLanes(g); this.drawTray(); this.drawClocks(g);
  }
  drawTape(g: Phaser.GameObjects.Graphics) {
    const tp = this.p.tape, X = (t: number) => CX + ((t - this.cur) / this.hw) * (TW / 2), span = tp.to - tp.from, OX = (t: number) => TX + ((t - tp.from) / span) * TW;
    // overview of the whole tape, with the part of it in view
    g.fillStyle(0x000000, 0.55).fillRoundedRect(TX, 23, TW, 5, 1.5);
    for (const tn of this.turns) g.fillStyle(tn.q ? 0xd8452e : 0x3f7fd0, 0.55).fillRect(OX(tn.t0), 24, Math.max(0.3, OX(tn.t1) - OX(tn.t0)), 3);
    g.lineStyle(0.5, 0xffffff, 0.8).strokeRect(OX(Math.max(tp.from, this.cur - this.hw)), 22.6, ((Math.min(tp.to, this.cur + this.hw) - Math.max(tp.from, this.cur - this.hw)) / span) * TW, 5.8);
    this.cutAt.forEach((c, i) => c !== undefined && g.fillStyle(this.cutKind[i] === 'sloppy' ? P.orange : 0xff5a5a).fillRect(OX(c) - 0.3, 22, 0.6, 7));
    for (const n of this.notes) g.fillStyle(P.yellow).fillRect(OX(n) - 0.8, 22.4, 1.6, 1.6);
    g.fillStyle(0xffe98a).fillRect(OX(this.cur) - 0.3, 21.6, 0.6, 7.6);
    // the zoomed view: who is talking, and the waveform
    const t0 = this.cur - this.hw, t1 = this.cur + this.hw; let ci = 0;
    g.fillStyle(0x05070e, 0.9).fillRect(TX, 38, TW, 40);
    for (const tn of this.turns) {
      if (tn.t1 < t0 || tn.t0 > t1) continue;
      const a = Math.max(TX, X(tn.t0)), b = Math.min(TX + TW, X(tn.t1));
      g.fillStyle(tn.q ? 0xd8452e : 0x3f7fd0, 0.35).fillRect(a, 39, Math.max(0.3, b - a), 6.4);
      if (X(tn.t0) > TX && X(tn.t0) < TX + TW - 4 && ci < this.chips.length) { this.chips[ci].setTexture(tn.who + 'peter_chip').setPosition(X(tn.t0) + 3.6, 42.2).setVisible(true); ci++; }
    }
    for (; ci < this.chips.length; ci++) this.chips[ci].setVisible(false);
    const step = 0.8, amp = (t: number) => { const tn = this.turns.find((q) => t >= q.t0 && t <= q.t1); if (!tn) return [0, 0] as const; const e = Math.min(1, (t - tn.t0) / 0.6, (tn.t1 - t) / 0.6); return [e * (0.3 + 0.7 * Math.abs(Math.sin(t * 2.7) * Math.cos(t * 0.71 + 1.3))), tn.q ? 1 : 0] as const; };
    for (let x = TX; x < TX + TW; x += step) { const t = this.cur + ((x - CX) / (TW / 2)) * this.hw; if (t < tp.from || t > tp.to) continue; const [a, q] = amp(t), h = 0.4 + a * 12; g.fillStyle(q ? 0xff8a70 : 0x7fb4ff, 0.85).fillRect(x, 62 - h, step * 0.7, h * 2); }
    if (this.cur - this.hw < tp.from) g.fillStyle(0x000000, 0.6).fillRect(TX, 38, Math.max(0, X(tp.from) - TX), 40);
    if (this.cur + this.hw > tp.to) g.fillStyle(0x000000, 0.6).fillRect(X(tp.to), 38, Math.max(0, TX + TW - X(tp.to)), 40);
    this.cutAt.forEach((c, i) => { if (c === undefined || c < t0 || c > t1) return; const x = X(c), col = this.cutKind[i] === 'sloppy' ? P.orange : 0xff5a5a; g.fillStyle(col).fillRect(x - 0.4, 38, 0.8, 40); g.fillTriangle(x - 2, 38, x + 2, 38, x, 41); });
    for (const n of this.notes) if (n > t0 && n < t1) { const x = X(n); g.fillStyle(0x000000, 0.4).fillRect(x - 3.2, 47.4, 6.4, 6.4); g.fillStyle(P.yellow).fillRect(x - 3.6, 46.8, 6.4, 6.4); g.fillStyle(0x6b4a2b).fillRect(x - 2.6, 48.4, 4.4, 0.5).fillRect(x - 2.6, 50, 4.4, 0.5).fillRect(x - 2.6, 51.6, 3, 0.5); }
    g.fillStyle(0xffe98a).fillRect(CX - 0.4, 36, 0.8, 42); g.fillTriangle(CX - 2.4, 36, CX + 2.4, 36, CX, 38.6);
    this.curT.setText(`${mmss(this.cur)}${this.snap ? '  · CHAPTER LIST: NEXT CUT SNAPS' : ''}`);
    this.edgeT[0].setText(mmss(Math.max(tp.from, t0))); this.edgeT[1].setText(mmss(Math.min(tp.to, t1)));
  }
  drawSplice(g: Phaser.GameObjects.Graphics) {
    const parts = this.p.parts as { who: string; len: number }[], total = parts.reduce((s, p) => s + p.len, 0);
    this.curT.setText(this.ready ? 'FULL CUT · RENDERED' : this.spliced.length === parts.length ? 'RENDERING…' : `BIN · ← → choose, Space splices part ${this.spliced.length + 1}`).setY(22);
    this.edgeT.forEach((t) => t.setText(''));
    this.binChip.forEach((c) => c.setVisible(false)); this.binT.forEach((t) => t.setText(''));
    this.bin.forEach((part, i) => { const x = 70 + i * 60, on = i === this.binSel; g.fillStyle(on ? 0x1c2a4a : 0x0b1020, 0.95).fillRoundedRect(x - 24, 29, 48, 22, 2); if (on) g.lineStyle(0.6, 0xffe98a, 1).strokeRoundedRect(x - 24, 29, 48, 22, 2); this.binChip[i].setTexture(parts[part].who + 'peter_chip').setPosition(x - 14, 40).setVisible(true); this.binT[i].setText(`PART ${part + 1}\n${dur(parts[part].len)}`).setPosition(x + 6, 33); });
    // the full cut so far, to scale
    g.fillStyle(0x000000, 0.55).fillRoundedRect(TX, 58, TW, 12, 2); let x = TX;
    this.chips.forEach((c) => c.setVisible(false));
    this.spliced.forEach((part, i) => { const w = (parts[part].len / total) * TW; g.fillStyle([0xd8452e, 0x3f7fd0, 0x4f9d4f, 0xf2d14a][part % 4], 0.85).fillRect(x + 0.3, 59, w - 0.6, 10); this.chips[i].setTexture(parts[part].who + 'peter_chip').setPosition(x + 5, 64).setScale(S * 0.3).setVisible(true); x += w; });
    if (this.spliced.length === parts.length) { g.fillStyle(0x000000, 0.6).fillRoundedRect(TX, 72, TW, 3, 1.5); g.fillStyle(P.lgreen).fillRoundedRect(TX, 72, TW * Math.min(1, this.render / this.p.render), 3, 1.5); }
  }
  drawLanes(g: Phaser.GameObjects.Graphics) {
    this.lanes.forEach((l, i) => {
      const y = LY + l.slot * LH, on = l.slot === this.sel, live = l.state === 'live';
      g.fillStyle(on ? 0x1c2a4a : 0x0b1020, on ? 0.95 : 0.6).fillRoundedRect(LX + 2, y - 1, LW - 4, LH - 1.6, 2); if (on) g.lineStyle(0.6, 0xffe98a, 1).strokeRoundedRect(LX + 2, y - 1, LW - 4, LH - 1.6, 2);
      this.laneChip[i].setTexture(l.chip + 'peter_chip').setPosition(LX + 12, y + 9.4);
      this.laneT[i].setText(l.name).setPosition(LX + 23, y + 0.6);
      const st = live ? (l.ok ? (l.late ? 'LIVE · LATE' : 'LIVE ✓') : 'LIVE · WRONG PART') : l.state === 'up' ? `UPLOADING ${Math.floor((l.prog / l.size) * 100)}%` : l.state === 'stall' ? 'STALLED · Enter retries' : l.state === 'pause' ? 'PAUSED' : l.state === 'done' ? `SCHEDULED · ${hm(l.due)}` : `EMPTY · live ${hm(l.due)}`;
      this.laneS[i].setText(`${l.handle}${l.len ? ` · ${mmss(l.len)}` : ''}   ${st}`).setPosition(LX + 23, y + 7.6).setColor(live ? (l.ok && !l.late ? '#7cc56b' : '#ff8a70') : l.state === 'stall' ? '#ff8a70' : l.late ? '#ffb070' : '#aab4d4');
      const bx = LX + 23, bw = LW - 30, by = y + 14.6;
      g.fillStyle(0x000000, 0.55).fillRoundedRect(bx, by, bw, 3, 1.5);
      if (l.size) g.fillStyle(live ? (l.ok && !l.late ? P.lgreen : P.orange) : l.state === 'stall' ? (Math.floor(this.time.now / 200) % 2 ? P.red : 0x5a1a12) : l.state === 'pause' ? P.grey : P.yellow).fillRoundedRect(bx, by, Math.max(3, (bw * l.prog) / l.size), 3, 1.5);
      if (live) { g.fillStyle(l.ok ? 0xd8452e : 0x6a1a12).fillRoundedRect(LX + LW - 22, y + 0.6, 18, 5.4, 1.4); }
      const showClip = this.mode === 'parts' && l.clip >= 0; this.laneClip[i].setVisible(showClip);
      if (showClip) this.laneClip[i].setTexture((this.p.parts[l.clip] as { who: string }).who + 'peter_chip').setPosition(LX + 18.6, y + 15.6);
    });
    if (!this.liveT) this.liveT = this.lanes.map(() => T(this, 0, 0, '', '#ffffff', 3.6, '700').setOrigin(0.5, 0).setDepth(3));
    this.lanes.forEach((l, i) => this.liveT![i].setText(l.state === 'live' ? '● LIVE' : '').setPosition(LX + LW - 13, LY + l.slot * LH + 1.2));
  }
  liveT?: Phaser.GameObjects.Text[];
  drawTray() {
    if (this.mode === 'full') { this.trayChip.setVisible(false); this.trayT.setPosition(RX + 4, LY).setText(this.ready ? `FULL CUT READY\nSend it to every channel.\n${this.lanes.filter((l) => l.state === 'empty').length} still to start.` : `FULL CUT\n${this.spliced.length} of ${this.p.parts.length} parts spliced${this.spliced.length === this.p.parts.length ? '\nrendering…' : ''}`); return; }
    const part = this.tray[0];
    if (part === undefined) { this.trayChip.setVisible(false); this.trayT.setPosition(RX + 4, LY).setText(`OUT TRAY · empty\n${this.made.every(Boolean) ? 'Every part is cut.' : 'Cut the tape at a break to finish a part.'}`); return; }
    const [a, b] = this.bounds(part);
    this.trayChip.setTexture((this.p.parts[part] as { who: string }).who + 'peter_chip').setVisible(true);
    this.trayT.setPosition(RX + 24, LY).setText(`OUT TRAY${this.tray.length > 1 ? ` · ${this.tray.length} waiting` : ''}\nPART ${part + 1}\n${mmss(a)}–${mmss(b)}\n${dur(b - a)}\nEnter sends it`);
  }
  drawClocks(g: Phaser.GameObjects.Graphics) {
    (this.p.clock.zones as [string, string, number][]).forEach((z, i) => {
      const m = this.min + z[2] * 60, cx = CLX + i * 34, cy = CLY, h = ((m / 60) % 12) / 12 * Math.PI * 2, mi = ((m % 60) / 60) * Math.PI * 2;
      g.lineStyle(1.1, 0x10131c, 1).lineBetween(cx, cy, cx + Math.sin(h) * 4.8, cy - Math.cos(h) * 4.8);
      g.lineStyle(0.6, 0x10131c, 1).lineBetween(cx, cy, cx + Math.sin(mi) * 7, cy - Math.cos(mi) * 7); g.fillStyle(0xd8452e).fillCircle(cx, cy, 0.8);
      this.clockT[i].setText(`${z[0]}\n${dayLabel(this.p.clock.date, Math.floor(m / 1440))} ${hm(m)}`);
    });
  }
}

/**
 * The room for Q2 2024: a creator's edit desk late in the evening. Acoustic panels and a ring light on the wall, a
 * microphone on an arm, a mug, sticky notes on the bezel, and three clocks for the three places in this story:
 * Los Angeles (Pacific time, the times on YouTube's own pages), Amsterdam (where the parts went up at midnight:
 * the time zone the level was proposed in, not a place in the story) and Auckland (already Monday morning). Nothing here is a real person's room.
 */
function roomQ2(c: C2) {
  c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#1a1630'], [0.6, '#120f22'], [1, '#0a0912']); c.fillRect(0, 0, 320, 180);
  // acoustic foam: a grid of wedges in deep red and charcoal
  for (let y = 0; y < 180; y += 10) for (let x = 0; x < 320; x += 10) { const col = (x / 10 + y / 10) % 2 ? '#2a1a2a' : '#1e1626'; rr(c, x + 0.4, y + 0.4, 9.2, 9.2, 1, col); for (let k = 0; k < 3; k++) line(c, x + 1.4, y + 2.4 + k * 2.6, x + 8.6, y + 2.4 + k * 2.6, (x / 10 + y / 10) % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.25)', 0.8); }
  // a ring light glowing behind the right-hand column
  c.fillStyle = rg(c, 262, 100, 4, 70, [0, 'rgba(255,240,220,.22)'], [1, 'rgba(255,240,220,0)']); c.fillRect(190, 30, 130, 150);
  c.beginPath(); c.arc(262, 100, 22, 0, Math.PI * 2); c.strokeStyle = 'rgba(255,248,236,.5)'; c.lineWidth = 2.4; c.stroke(); c.beginPath(); c.arc(262, 100, 22, 0, Math.PI * 2); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 0.8; c.stroke();
  // an LED strip along the top of the desk and the monitor bezels
  c.fillStyle = lg(c, 0, 0, 320, 0, [0, '#ff3d6e'], [0.5, '#8a5cff'], [1, '#3fd0ff']); c.fillRect(0, 81.6, 320, 0.6);
  rr(c, 1.6, 18.4, 316.8, 64.4, 2.4, undefined, '#05060a', 1.4); rr(c, 2.2, 80.2, 206, 99, 2.4, undefined, '#05060a', 1.2);
  // sticky notes on the bezel
  for (const [x, y, rot, col] of [[300, 15, 0.12, '#f2d14a'], [292, 16.6, -0.1, '#ff9ad1']] as [number, number, number, string][]) { c.save(); c.translate(x, y); c.rotate(rot); rr(c, -4, -3, 8, 6.4, 0.4, col, 'rgba(0,0,0,.3)', 0.25); for (let k = 0; k < 3; k++) line(c, -2.8, -1.4 + k * 1.6, 2.6, -1.4 + k * 1.6, 'rgba(60,40,30,.5)', 0.35); c.restore(); }
  // a desk microphone on a short stand, on the shelf under the clocks
  rr(c, 309, 140, 6, 10, 2.8, lg(c, 309, 0, 315, 0, [0, '#4a4e5e'], [1, '#15161c']), OUT, 0.4); for (let k = 0; k < 3; k++) line(c, 310, 142.4 + k * 2.4, 314, 142.4 + k * 2.4, 'rgba(255,255,255,.18)', 0.3); line(c, 312, 150, 312, 178, '#2a2c36', 1); rr(c, 307, 177, 10, 2, 0.8, '#2a2c36');
}
const CLX = RX + 18, CLY = 151; // where the three clocks hang
