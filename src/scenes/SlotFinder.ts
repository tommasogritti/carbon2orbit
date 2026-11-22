import Phaser from 'phaser';
import { W, T, held, just, finish, cam, img, panel, who } from '../core';
import { snd, music, stopLoops } from '../audio';
import { S, tex, lg, rg, rr, el, line, poly, text, rng, parts, OUT, type C2 } from '../art';
import type { LevelDef } from '../content';
import { hifi, HiFi } from '../hifi';
import { LOOKS } from '../hifiLooks';

const AUTO = new URLSearchParams(location.search).has('auto');

/**
 * The slot finder (mechanic `slot-finder`, spec §10.14): one meeting, several diaries, and a clock that keeps eating the
 * week. The organiser slides and stretches a meeting block across a shared timeline and sends it out as an invitation.
 * Only her own diary is known at the start; every reply shows a little more of the others' (a decline shows the block in
 * the way, an acceptance shows a clear stretch), and the group chat shows one person's whole diary. When everyone has
 * said yes the slot is locked, the clock runs on to the meeting, and the follow-up work (`tail`) has to finish before the
 * release time. A tentative entry (`clashes`) turns into a real meeting at a set time and breaks a locked slot it lands on.
 * Everything about the setting (the room, the music, the words) is in THEMES.
 */
interface Row { name: string; chip: string; busy: [from: number, to: number, label?: string][]; known?: boolean; lead?: boolean }
interface Clash { row: number; from: number; to: number; at: number; label: string }
interface Theme {
  music: string; room: (c: C2) => void; /** The room's hi-fi look (hifiLooks.ts). */ hifi?: string; legend: string; chatNote: string;
  clashText: (who: string, when: string) => string; breakText: (who: string) => string;
  winTitle: string; winText: (o: { len: number; invites: number; late: boolean; when: string }) => string; failText: string;
}
const THEMES: Record<string, Theme> = {
  'q1-2026': {
    music: 'delta', room: (c) => roomQ1(c), hifi: 'diary',
    legend: 'All times Pacific. Every busy block is a game value: nobody’s real diary is known, nor when the interview was recorded. Only the results call (2 p.m.) and the release times are real.',
    chatNote: 'GROUP CHAT (a game element: how the seven really found their time is not published).',
    clashText: (w, when) => `${w}: the tentative entry at ${when} is now a meeting (a game element).`,
    breakText: (w) => `${w} can no longer make the slot: a meeting has landed on it. Find another one.`,
    winTitle: 'Seven diaries, one slot',
    winText: ({ len, invites, late, when }) => `The interview is in the diary for ${when}, ${Math.round(len * 60)} minutes long, after ${invites} invitation${invites > 1 ? 's' : ''}. ${late ? 'Scott O’s edit ran past 3 p.m., so the release went out late.' : 'Scott O’s edit is done in time for the 3 p.m. release.'}`,
    failText: 'The release time came with no interview recorded. Every busy block a reply shows stays on the grid: look for the stretch where all seven rows are clear.',
  },
};
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const dayLabel = (iso: string, shift: number) => { const [y, m, d] = iso.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d + shift)); return `${DAYS[t.getUTCDay()]} ${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}`; };
const hm = (h: number) => { const m = Math.round(h * 60), x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 - 1e-6 && b0 < a1 - 1e-6;

const GX = 58, GW = 254, HY0 = 22, RY0 = 36, RH = 11.6; // the grid: left edge, width; header top; first row top, row height
const MX = 4, MY = 127, MW = 202, MH = 49; // the message panel

export class SlotFinderScene extends Phaser.Scene {
  def!: LevelDef; p: any; th!: Theme; rows: Row[] = []; clashes: Clash[] = [];
  now = 0; g0 = 0; g1 = 0; step = 0.25; start = 0; li = 0; lengths: number[] = []; ended = false;
  state: 'plan' | 'wait' | 'chat' | 'locked' | 'rec' | 'edit' = 'plan';
  seen: Set<number>[] = []; free: [number, number][][] = []; all: boolean[] = []; acc: (boolean | undefined)[] = []; replies: { row: number; at: number }[] = [];
  cues: [number, string, boolean?][] = []; invites = 0; chats = 0; chatsUsed = 0; hints = 0; pick = 0; holdT = 0; repT = 0; botT = 0; late = false; recAt = 0; broke = 0;
  g!: Phaser.GameObjects.Graphics; topL!: Phaser.GameObjects.Text; topR!: Phaser.GameObjects.Text; msg!: Phaser.GameObjects.Text; blockT!: Phaser.GameObjects.Text;
  names: Phaser.GameObjects.Text[] = []; replyT: Phaser.GameObjects.Text[] = []; labels: Phaser.GameObjects.Text[] = []; nlab = 0; hf?: HiFi;
  constructor() { super('SlotFinder'); }

  /** The controls panel (H or the ? button), by phase. Shape agreed with core's showHelp. */
  help(): { title: string; rows: [keys: string, does: string][]; note?: string } {
    if (this.state === 'chat') return { title: 'Slot finder · the group chat', rows: [['↑ ↓', 'Choose whose diary to ask for.'], ['Enter', 'Ask: that person’s whole diary appears on the grid.'], ['Space', 'Close the group chat without asking.']], note: this.th.chatNote };
    return { title: 'Slot finder · seven diaries', rows: [['← →', 'Slide the meeting along the two days, a quarter of an hour at a time (hold to slide faster).'], ['↑ ↓', 'Make the meeting longer or shorter.'], ['Space', 'Send the invitation for the slot under the meeting. Everyone replies; a decline shows what is in the way.'], ['Enter', `Open the group chat: ask one person for their whole diary (${this.chats} left).`]], note: `A slot works only where every row is clear, and it needs ${this.p.notice} h notice. The violet bar under the grid is the work after the meeting: it has to finish before the release line. ${this.th.legend}` };
  }
  /** Hints (I or the 💡 button), from a nudge to the answer. Each one costs half an hour on the clock. */
  hint(): { title: string; text: string; cost?: string } | undefined {
    if (this.state !== 'plan' && this.state !== 'chat') return undefined;
    const k = this.hints, best = this.bestSlot(this.lengths[this.lengths.length - 1] >= this.p.need ? this.p.need : this.lengths[this.li]);
    const steps = [
      { title: 'Where all the rows are clear', text: 'A slot works only where every row is clear for the whole length of the meeting. Each reply leaves its mark: a decline shows the block that got in the way, an acceptance shows a clear stretch in green. The group chat (Enter) shows one person’s whole diary at once.' },
      { title: 'Mind the edges', text: `The meeting has to be about ${Math.round(this.p.need * 60)} minutes for three stars, and the ${this.p.tail.hours}-hour block after it has to finish by ${this.when(this.p.release)}: so the meeting has to end by ${this.when(this.p.release - this.p.tail.hours)}. ${this.clashes.length ? `And watch the striped TENTATIVE block in ${this.rows[this.clashes[0].row].name}’s row: at ${this.when(this.clashes[0].at)} it becomes a real meeting.` : ''}` },
      best !== undefined ? { title: 'The slot', text: `Every diary is clear from ${this.when(best)} to ${hm(best + this.p.need)}: slide the meeting there, make it ${Math.round(this.p.need * 60)} minutes, and send it.` } : { title: 'No slot left', text: 'No slot that long is left before the release. A shorter meeting may still fit.' },
    ];
    if (k >= steps.length) return undefined;
    this.hints++; this.now += 0.5;
    return { ...steps[k], cost: `Hint ${k + 1} of ${steps.length}. Asking cost half an hour on the clock.` };
  }
  init(d: { def: LevelDef }) {
    this.def = d.def; this.p = d.def.params; this.th = THEMES[this.p.theme];
    this.rows = this.p.rows; this.clashes = (this.p.clashes || []).map((c: Clash) => ({ ...c }));
    [this.g0, this.g1] = this.p.grid; this.step = this.p.step || 0.25; this.now = this.p.clock.start; this.start = this.p.startAt ?? this.now + 2;
    this.lengths = this.p.lengths; this.li = Math.max(0, this.lengths.indexOf(this.p.length ?? this.p.need)); this.ended = false; this.state = 'plan';
    this.seen = this.rows.map(() => new Set<number>()); this.free = this.rows.map(() => []); this.all = this.rows.map((r) => !!r.known); this.acc = this.rows.map(() => undefined); this.replies = [];
    this.rows.forEach((r, i) => r.busy.forEach((b, j) => { if (b[2]) this.seen[i].add(j); })); // labelled entries (the results call) are public
    this.invites = 0; this.chats = this.p.chats ?? 2; this.chatsUsed = 0; this.hints = 0; this.pick = 0; this.holdT = 0; this.repT = 0; this.botT = 0; this.late = false; this.recAt = 0; this.broke = 0;
    this.names = []; this.replyT = []; this.labels = []; this.nlab = 0; this.cues = (this.p.cues || []).map((q: [number, string]) => [q[0], q[1]]);
  }
  create() {
    cam(this); stopLoops(); music.play(this.th.music, 1);
    const key = 'sf_room_' + this.p.theme;
    if (!this.textures.exists(key)) tex(this, key, W, 180, (c) => this.th.room(c));
    const hf = (this.hf = hifi(this, LOOKS[this.th.hifi || ''])); // the room, the panels and the grid take the look; every word and every face stays on the HUD camera
    const world: Record<string, Phaser.GameObjects.GameObject> = { room: img(this, 0, 0, hf ? hf.key(key) : key).setOrigin(0) };
    world.top = panel(this, 4, 3, W - 8, 14, 0.9);
    this.topL = T(this, 8, 5.2, '', '#ffe98a', 6.6, '700'); this.topR = T(this, W - 8, 6.2, '', '#cfd6ea', 4.4, '700').setOrigin(1, 0);
    world.grid = panel(this, 4, 20, W - 8, 104, 0.88);
    world.g = this.g = this.add.graphics().setDepth(2);
    this.rows.forEach((r, i) => {
      const y = RY0 + i * RH;
      img(this, 12, y + RH / 2, r.chip + 'peter_chip').setScale(S * 0.34).setDepth(3);
      this.names.push(T(this, 19, y + 1.4, r.name, r.lead ? '#ffe98a' : '#ffffff', 3.9, '700').setDepth(3));
      this.replyT.push(T(this, 19, y + 6.2, '', '#aab4d4', 3.2, '700').setDepth(3));
    });
    for (let i = 0; i < 40; i++) this.labels.push(T(this, 0, 0, '', '#ffffff', 3, '700').setDepth(4).setVisible(false));
    this.blockT = T(this, 0, 0, '', '#ffe98a', 3.4, '700').setOrigin(0.5, 1).setDepth(5).setShadow(0, 1, '#000000', 2);
    world.msg = panel(this, MX, MY, MW, MH, 0.9);
    this.msg = T(this, MX + 4, MY + 3, '', '#ffe98a', 4.4, '700').setDepth(5).setWordWrapWidth(MW - 8).setShadow(0, 1, '#000000', 2);
    T(this, MX + 4, MY + MH - 10.4, this.th.legend, '#8f9bb5', 3.1, '600').setDepth(5).setWordWrapWidth(MW - 8);
    who(this, this.def, 104, 146);
    this.say(`${this.when(this.now)}: the results call is over. Find one slot when all ${this.rows.length} of you are free. ← → slide, ↑ ↓ length, Space sends the invitation, Enter opens the group chat.`);
    if (hf) { const w = Object.values(world); hf.tag(world); this.tell(); hf.ready({ hud: this.children.list.filter((o) => !w.includes(o)), lateHud: true }); }
  }
  /** What the look animates from: the clock (`now`, hours), the phase (`st`: 0 planning, 1 waiting for replies, 2 the group chat, 3 locked, 4 recording, 5 the edit), where the meeting block is, and the replies so far. */
  tell() {
    if (!this.hf) return; const s = this.start;
    this.hf.set({ now: this.now, st: ['plan', 'wait', 'chat', 'locked', 'rec', 'edit'].indexOf(this.state), bx: this.X(s), bw: this.X(s + this.len()) - this.X(s), nx: this.X(Math.min(this.g1, Math.max(this.g0, this.now))), yes: this.acc.filter((a) => a === true).length, no: this.acc.filter((a) => a === false).length, chats: this.chatsUsed, soon: s < this.now + this.p.notice - 1e-6 ? 1 : 0 });
  }
  say(s: string) { this.msg.setText(s); }
  len() { return this.lengths[this.li]; }
  when(h: number) { return `${dayLabel(this.p.clock.date, Math.floor(h / 24)).slice(0, 3)} ${hm(h)}`; }
  X(h: number) { return GX + ((h - this.g0) / (this.g1 - this.g0)) * GW; }
  /** Busy blocks for a row as they stand now (tentative entries count once they have landed). */
  busyOf(i: number, all = false) {
    const out = this.rows[i].busy.map((b) => [b[0], b[1]] as [number, number]);
    for (const c of this.clashes) if (c.row === i && (all || this.now >= c.at)) out.push([c.from, c.to]);
    return out;
  }
  /** The earliest start that every diary leaves clear for `len` hours, in time for the release (the bot and the last hint use it). */
  bestSlot(len: number) {
    const earliest = Math.ceil((this.now + this.p.notice) / this.step) * this.step, last = this.p.release - this.p.tail.hours - len;
    for (let s = earliest; s <= last + 1e-6; s += this.step) if (this.rows.every((_r, i) => this.busyOf(i, true).every(([a, b]) => !overlaps(s, s + len, a, b)))) return s;
    return undefined;
  }

  update(_t: number, dms: number) {
    if (this.ended) return;
    const slow = this.state === 'edit' && this.cues.some((q) => q[2]) && this.now < this.p.release; // once a cue has shown, slow down so it can be read
    const dt = Math.min(0.05, dms / 1000), ff = this.state === 'locked' || this.state === 'rec' || this.state === 'edit' ? (slow ? 2 : 30) : 1;
    this.now += (dt / this.p.clock.rate) * ff;
    this.landClashes();
    if (this.state === 'plan') this.plan(dt);
    else if (this.state === 'chat') this.chat();
    else if (this.state === 'wait') this.collect(dt);
    else this.after();
    if ((this.state === 'plan' || this.state === 'wait' || this.state === 'chat') && this.now >= this.p.release) return this.fail();
    this.draw();
  }
  landClashes() {
    for (const c of this.clashes) {
      if (this.now < c.at || (c as any).landed) continue;
      (c as any).landed = true; snd.alarm(); this.say(this.th.clashText(this.rows[c.row].name, `${hm(c.from)}`));
      this.seen[c.row].add(-1 - this.clashes.indexOf(c));
      this.free[c.row] = this.free[c.row].filter(([a, b]) => !overlaps(a, b, c.from, c.to));
      const s = this.start, e = s + this.len();
      if ((this.state === 'locked' || this.state === 'wait') && overlaps(s, e, c.from, c.to)) {
        this.state = 'plan'; this.replies = []; this.acc = this.rows.map(() => undefined); this.acc[c.row] = false; this.broke++; snd.deny(); this.cameras.main.shake(140, 0.003);
        this.say(this.th.breakText(this.rows[c.row].name));
      }
    }
  }
  plan(dt: number) {
    let dir = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), tap = just('right') || just('left'), up = just('up'), down = just('down'), send = just('a'), open = just('b');
    if (AUTO) [dir, tap, up, down, send, open] = this.bot(dt);
    if (open) { if (this.chats <= 0) { snd.deny(); this.say('The group chat has been asked enough for one day: no more asks left.'); } else { this.state = 'chat'; this.pick = this.rows.findIndex((_r, i) => !this.all[i]); snd.select(); this.say(`${this.th.chatNote} ↑ ↓ choose whose diary to ask for, Enter asks, Space closes the chat.`); } return; }
    if (dir) { this.holdT += dt; if (tap || this.holdT > 0.32) { this.repT -= dt; if (tap || this.repT <= 0) { this.move(dir); this.repT = 0.06; } } } else { this.holdT = 0; this.repT = 0; }
    if (up && this.li < this.lengths.length - 1) { this.li++; snd.tick(); this.clampBlock(); }
    if (down && this.li > 0) { this.li--; snd.tick(); }
    if (send) this.send();
  }
  move(dir: number) { this.start += dir * this.step; this.clampBlock(); snd.tick(); this.acc = this.rows.map(() => undefined); }
  clampBlock() { this.start = Phaser.Math.Clamp(this.start, this.g0, this.g1 - this.len()); }
  send() {
    const s = this.start, e = s + this.len(), lead = this.rows.findIndex((r) => r.lead);
    if (s < this.now + this.p.notice - 1e-6) { snd.deny(); return this.say(`Too soon: an invitation needs ${this.p.notice} h notice (a game rule). The earliest start now is ${this.when(Math.ceil((this.now + this.p.notice) / this.step) * this.step)}.`); }
    if (lead >= 0 && this.busyOf(lead).some(([a, b]) => overlaps(s, e, a, b))) { snd.deny(); return this.say('Your own diary is busy then: slide the meeting off your own busy block first.'); }
    this.invites++; this.state = 'wait'; snd.select();
    this.acc = this.rows.map((_r, i) => (i === lead ? true : undefined));
    const order = Phaser.Utils.Array.Shuffle(this.rows.map((_r, i) => i).filter((i) => i !== lead));
    this.replies = order.map((row, k) => ({ row, at: 0.35 + k * 0.32 + Math.random() * 0.15 }));
    this.repT = 0;
    this.say(`Invitation ${this.invites} is out: ${this.when(s)} to ${hm(e)}. Waiting for the replies…`);
  }
  collect(dt: number) {
    this.repT += dt;
    while (this.replies.length && this.replies[0].at <= this.repT) {
      const { row } = this.replies.shift()!, s = this.start, e = s + this.len();
      const hit = this.busyOf(row).map((b, j) => [b, j] as const).filter(([b]) => overlaps(s, e, b[0], b[1]));
      if (hit.length) { this.acc[row] = false; for (const [, j] of hit) if (j < this.rows[row].busy.length) this.seen[row].add(j); snd.dud(); } // a landed clash is on show already
      else { this.acc[row] = true; this.free[row].push([s, e]); snd.tick(); }
    }
    if (this.replies.length) return;
    const no = this.rows.map((r, i) => (this.acc[i] === false ? r.name : '')).filter(Boolean);
    if (!no.length) { this.state = 'locked'; snd.pickup(); this.say(`Seven yeses. The interview is in every diary for ${this.when(this.start)}. The clock runs on to it…`); }
    else { this.state = 'plan'; this.say(`${no.length} can’t make it: ${no.join(', ')}. Their replies show what is in the way. Slide the meeting and try again.`); }
  }
  chat() {
    let up = just('up'), down = just('down'), ask = just('b'), close = just('a') || just('left') || just('right');
    if (AUTO) { ask = true; up = down = close = false; }
    const open = this.rows.map((_r, i) => i).filter((i) => !this.all[i]);
    if (!open.length) { this.state = 'plan'; return; }
    if (up || down) { const k = open.indexOf(this.pick); this.pick = open[(Math.max(0, k) + (down ? 1 : open.length - 1)) % open.length]; snd.tick(); }
    if (!open.includes(this.pick)) this.pick = open[0];
    if (close) { this.state = 'plan'; snd.move(); return this.say('Group chat closed.'); }
    if (ask) { this.all[this.pick] = true; this.chats--; this.chatsUsed++; this.state = 'plan'; snd.power(); this.say(`${this.rows[this.pick].name} shares a whole diary in the group chat. ${this.chats} ask${this.chats === 1 ? '' : 's'} left.`); }
  }
  after() {
    const s = this.start, e = s + this.len(), t = e + this.p.tail.hours;
    if (this.state === 'locked' && this.now >= s) { this.state = 'rec'; snd.count(); this.say(`${this.when(s)}: recording. All seven are on the call.`); }
    if (this.state === 'rec' && this.now >= e) { this.state = 'edit'; snd.click(); this.say(`${this.when(e)}: the recording is done. ${this.p.tail.doing}.`); }
    for (const q of this.cues) if (this.now >= q[0] && !q[2]) { q[2] = true; snd.tick(); this.say(q[1]); } // real moments, shown as the clock passes them
    if (this.state === 'edit' && this.now >= Math.max(t, this.p.release)) this.done(t > this.p.release + 1e-6);
  }
  fail() {
    this.ended = true; this.draw();
    finish(this, this.def, { success: false, title: 'No slot in time', text: this.th.failText });
  }
  done(late: boolean) {
    this.ended = true; this.late = late; this.draw();
    const len = this.len(), par = this.p.par ?? 3;
    const misses = (this.invites > par ? 1 : 0) + (this.invites > par + 2 ? 1 : 0) + (len < this.p.need - 1e-6 ? 1 : 0) + (late ? 1 : 0);
    const stars = Math.max(1, 3 - misses), egg = stars === 3 && this.chatsUsed === 0 && this.hints === 0;
    const why = stars < 3 ? ` Three stars for a meeting of at least ${Math.round(this.p.need * 60)} minutes, in time for the release, in ${par} invitations or fewer.` : '';
    snd.seco();
    this.time.delayedCall(900, () => finish(this, this.def, { success: true, stars, egg, title: this.th.winTitle, text: this.th.winText({ len, invites: this.invites, late, when: this.when(this.start) }) + why }));
  }
  /** The bot knows every diary (it is the game, after all): it slides to the earliest slot that works and sends one invitation. */
  bot(dt: number): [number, boolean, boolean, boolean, boolean, boolean] {
    this.botT += dt; const out: [number, boolean, boolean, boolean, boolean, boolean] = [0, false, false, false, false, false];
    if (this.botT < 0.09) return out;
    this.botT = 0;
    const want = this.lengths.indexOf(this.p.need);
    if (this.li < want) { out[2] = true; return out; } if (this.li > want) { out[3] = true; return out; }
    const s = this.bestSlot(this.p.need);
    if (s === undefined) return out;
    if (Math.abs(this.start - s) > 1e-6) { this.move(Math.sign(s - this.start)); return out; }
    out[4] = true; return out;
  }

  // ------------------------------------------------------------ drawing
  lab(s: string, x: number, y: number, col: string, size = 3, ox = 0, oy = 0) {
    const t = this.labels[this.nlab++]; if (!t) return;
    t.setText(s).setPosition(x, y).setColor(col).setFontSize(size + 'px').setOrigin(ox, oy).setVisible(true);
  }
  draw() {
    const g = this.g; g.clear(); this.nlab = 0;
    const date = this.p.clock.date, s = this.start, e = s + this.len(), tailEnd = e + this.p.tail.hours;
    this.topL.setText(`${dayLabel(date, Math.floor(this.now / 24))} ${date.slice(0, 4)} · ${hm(this.now)} ${this.p.clock.zone}${this.state === 'locked' || this.state === 'rec' || this.state === 'edit' ? '  ▶▶' : ''}`);
    this.topR.setText(`INVITATIONS ${this.invites}   ·   GROUP CHAT ${this.chats} LEFT   ·   NOTICE ${this.p.notice} h`).setColor(this.invites > (this.p.par ?? 3) ? '#ff8a70' : '#cfd6ea');
    // header: the two days, hour ticks, and the real times
    for (let d = Math.ceil(this.g0 / 24) * 24 - 24; d < this.g1; d += 24) { const x = this.X(Math.max(this.g0, d)); this.lab(dayLabel(date, d / 24), x + 1, HY0, '#ffe98a', 3.4); if (d > this.g0) g.lineStyle(0.5, 0xffe98a, 0.55).lineBetween(this.X(d), HY0, this.X(d), RY0 + this.rows.length * RH); }
    for (let h = Math.ceil(this.g0 / 2) * 2; h <= this.g1; h += 2) { const x = this.X(h); g.lineStyle(0.3, 0xffffff, 0.12).lineBetween(x, RY0 - 1, x, RY0 + this.rows.length * RH); if (h % 24) this.lab(String(h % 24), x, HY0 + 5.4, '#7483a6', 2.8, 0.5); }
    for (const [h, label, where] of this.p.marks as [number, string, string?][]) { const x = this.X(h), y = where === 'top' ? HY0 : HY0 + 9.4; g.lineStyle(0.7, 0x7cc56b, 0.9).lineBetween(x, y + 2.6, x, RY0 + this.rows.length * RH + 6); if (label) this.lab(label, x - 0.8, y, '#9fe08a', 2.6, h > (this.g0 + this.g1) / 2 ? 1 : 0); } // real times, in green
    // rows
    this.rows.forEach((r, i) => {
      const y = RY0 + i * RH, h = RH - 1.6, x0 = this.X(this.g0), x1 = this.X(this.g1);
      g.fillStyle(r.lead ? 0x2a2a14 : 0x0b1020, 0.9).fillRect(x0, y, x1 - x0, h);
      if (!this.all[i]) { g.fillStyle(0x30364a, 0.9).fillRect(x0, y, x1 - x0, h); g.lineStyle(0.3, 0x5a6280, 0.55); for (let x = x0 - h; x < x1; x += 2.6) g.lineBetween(Math.max(x0, x), y + Math.max(0, x0 - x), Math.min(x1, x + h), y + h - Math.max(0, x + h - x1)); }
      else g.fillStyle(0x1d4a2c, 0.75).fillRect(x0, y, x1 - x0, h);
      for (const [a, b] of this.free[i]) g.fillStyle(0x2f8a4a, 0.9).fillRect(this.X(a), y, this.X(b) - this.X(a), h);
      r.busy.forEach((b, j) => {
        if (!this.all[i] && !this.seen[i].has(j)) return;
        const bx = this.X(b[0]), bw = this.X(b[1]) - bx, real = !!b[2];
        g.fillStyle(real ? 0x3f7fd0 : 0xb4463a, 1).fillRect(bx, y, bw, h); g.lineStyle(0.3, 0x000000, 0.5).strokeRect(bx, y, bw, h);
        if (bw > 9) this.lab(real ? b[2]! : 'BUSY', bx + bw / 2, y + h / 2, real ? '#dfeaff' : '#ffd0c8', 2.6, 0.5, 0.5);
      });
      this.clashes.forEach((c, k) => {
        if (c.row !== i) return; const landed = this.now >= c.at, bx = this.X(c.from), bw = this.X(c.to) - bx;
        if (landed) { g.fillStyle(0xb4463a, 1).fillRect(bx, y, bw, h); this.lab('MEETING', bx + bw / 2, y + h / 2, '#ffd0c8', 2.6, 0.5, 0.5); }
        else { g.fillStyle(0x3a2a08, 1).fillRect(bx, y, bw, h); g.lineStyle(0.9, 0xf2a93b, 0.9); for (let x = bx; x < bx + bw; x += 2.2) g.lineBetween(x, y + h, Math.min(bx + bw, x + 2), y); this.lab(c.label || 'TENTATIVE', bx + bw / 2, y + h / 2, '#ffe0a0', 2.4, 0.5, 0.5); }
        void k;
      });
      const a = this.acc[i];
      this.replyT[i].setText(this.all[i] ? (r.lead ? 'your own diary' : 'whole diary shared') : a === true ? 'YES' : a === false ? 'CAN’T MAKE IT' : this.state === 'wait' ? '…' : '').setColor(a === true ? '#7cc56b' : a === false ? '#ff8a70' : '#aab4d4');
      if (this.state === 'chat' && i === this.pick) g.lineStyle(0.8, 0xffe98a, 1).strokeRect(5.5, y - 0.6, W - 12, h + 1.2);
    });
    // the past is greyed out, with a line at the present moment
    const nx = this.X(Math.min(this.g1, Math.max(this.g0, this.now)));
    g.fillStyle(0x000000, 0.45).fillRect(this.X(this.g0), RY0 - 1, nx - this.X(this.g0), this.rows.length * RH + 1);
    g.lineStyle(0.8, 0xffffff, 0.95).lineBetween(nx, HY0 + 8, nx, RY0 + this.rows.length * RH + 6); g.fillStyle(0xffffff).fillTriangle(nx - 1.6, HY0 + 8, nx + 1.6, HY0 + 8, nx, HY0 + 10.4);
    // the meeting block, across every row, and the work after it on the bottom track
    const bx = this.X(s), bw = this.X(e) - bx, top = RY0 - 1.5, bot = RY0 + this.rows.length * RH - 0.6, locked = this.state === 'locked' || this.state === 'rec' || this.state === 'edit';
    const tooSoon = !locked && s < this.now + this.p.notice - 1e-6, col = locked ? 0x7cc56b : tooSoon ? 0xff6a50 : 0xffe98a;
    g.fillStyle(col, locked ? 0.22 : 0.16).fillRect(bx, top, bw, bot - top); g.lineStyle(locked ? 1.1 : 0.8, col, 1).strokeRect(bx, top, bw, bot - top);
    if (this.state === 'rec' || this.state === 'edit') g.fillStyle(0x7cc56b, 0.5).fillRect(bx, top, bw * Phaser.Math.Clamp((this.now - s) / (e - s), 0, 1), bot - top);
    this.blockT.setText(`${locked ? 'IN EVERY DIARY' : tooSoon ? 'TOO SOON' : 'THE INTERVIEW'} · ${hm(s)}–${hm(e)} · ${Math.round(this.len() * 60)} MIN`).setPosition(Phaser.Math.Clamp(bx + bw / 2, GX + 24, GX + GW - 24), top - 0.2).setColor(locked ? '#9fe08a' : tooSoon ? '#ff8a70' : '#ffe98a');
    const ty = bot + 1.6, tx1 = this.X(Math.min(this.g1, tailEnd)), late = tailEnd > this.p.release + 1e-6;
    g.fillStyle(0x000000, 0.5).fillRect(this.X(this.g0), ty, GW, 3.6);
    g.fillStyle(late ? 0xb4463a : 0x8a7acc, 0.95).fillRect(bx + bw, ty, Math.max(0, tx1 - bx - bw), 3.6);
    if (this.state === 'edit') g.fillStyle(0xc9b8ff, 1).fillRect(bx + bw, ty, Math.max(0, Math.min(this.X(this.now), tx1) - bx - bw), 3.6);
    this.lab(`${this.p.tail.label} · ${this.p.tail.hours} h (a game value)` + (late ? ' · TOO LATE FOR THE RELEASE' : ''), Math.min(bx + bw + 1, GX + GW - 2), ty + 4.4, late ? '#ff8a70' : '#c9b8ff', 2.6, bx + bw > GX + GW * 0.6 ? 1 : 0);
    for (let i = this.nlab; i < this.labels.length; i++) this.labels[i].setVisible(false);
    this.tell();
  }
}

/**
 * The room for Q1 2026: an organiser's desk at dusk, drawn for the game. Nothing here is a real person's room, and the city
 * through the window is no particular city. On the shelf, a boxed Electron model (her channel has an Electron model
 * unboxing) and a phone with the group chat open.
 */
export function roomQ1(real: C2, part = 31) { // `part`: 1 the wall, 2 the window's frame and what is on the shelf, 4 the sky in the window, 8 the city, 16 its lit windows
  const pick = parts(real, part); let c = pick(1);
  c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#1f2a44'], [0.6, '#172036'], [1, '#0c1120']); c.fillRect(0, 0, 320, 180);
  for (let x = 0; x < 320; x += 16) line(c, x, 0, x, 180, 'rgba(255,255,255,.025)', 6); // a faint striped wallpaper
  // the window: a city at dusk and a line of lights
  const wx = 210, wy = 128, ww = 56, wh = 48;
  rr(pick(2), wx - 1.6, wy - 1.6, ww + 3.2, wh + 3.2, 1.2, '#3a3226', OUT, 0.5);
  for (const k of [4, 8, 16]) { const q = pick(k); q.save(); q.beginPath(); q.rect(wx, wy, ww, wh); q.clip(); }
  c = pick(4);
  c.fillStyle = lg(c, 0, wy, 0, wy + wh, [0, '#2b2e6a'], [0.45, '#a8507a'], [0.75, '#f28c4a'], [1, '#ffd38a']); c.fillRect(wx, wy, ww, wh);
  c.fillStyle = rg(c, wx + 40, wy + 40, 1, 10, [0, 'rgba(255,240,200,.9)'], [1, 'rgba(255,240,200,0)']); c.fillRect(wx, wy, ww, wh);
  const r = rng(12); let x = wx; c = pick(8); c.fillStyle = '#1a1424';
  while (x < wx + ww) { const bw = 3 + r() * 6, bh = 4 + r() * 12; c.fillRect(x, wy + wh - bh, bw, bh); x += bw; }
  for (let i = 0; i < 26; i++) el(pick(16), wx + r() * ww, wy + wh - 1 - r() * 9, 0.25, 0.25, r() < 0.5 ? '#ffe9a0' : '#ffb86a');
  for (const [bx, bw, bh] of [[wx + 6, 6, 30], [wx + 31, 5, 36], [wx + 44, 7, 26]] as [number, number, number][]) { c.fillStyle = '#140f1c'; c.fillRect(bx, wy + wh - bh, bw, bh); for (let k = 0; k < 9; k++) el(pick(16), bx + 1 + r() * (bw - 2), wy + wh - bh + 2 + r() * (bh - 4), 0.3, 0.3, '#ffe9a0'); } // a few taller blocks, windows lit
  for (const k of [4, 8, 16]) pick(k).restore();
  c = pick(2);
  line(c, wx + ww / 2, wy, wx + ww / 2, wy + wh, '#3a3226', 1.2); line(c, wx, wy + wh / 2, wx + ww, wy + wh / 2, '#3a3226', 1.2);
  // the shelf, with a boxed Electron model and a phone showing the group chat
  rr(c, 270, 160, 48, 3, 0.6, '#5a4430', OUT, 0.4); rr(c, 270, 163, 48, 15, 0, 'rgba(0,0,0,.25)');
  rr(c, 274, 128, 14, 32, 1, lg(c, 274, 0, 288, 0, [0, '#eae6dc'], [1, '#c8c2b4']), OUT, 0.4); rr(c, 277, 131, 8, 26, 0.6, '#0b0c12'); // the box and its window
  rr(c, 279.6, 133, 2.8, 20, 0.6, lg(c, 279.6, 0, 282.4, 0, [0, '#0a0a0c'], [0.4, '#33343e'], [1, '#08080a'])); poly(c, [279.6, 133, 281, 130.8, 282.4, 133], '#24252c');
  c.save(); c.translate(276, 145); c.rotate(-Math.PI / 2); text(c, 'ELECTRON · MODEL', 0, 0, 1.8, '#1d1f28', 700); c.restore();
  rr(c, 294, 136, 14, 24, 2, '#111318', '#3a3e4a', 0.6); rr(c, 295.4, 138.4, 11.2, 19, 1, '#e9edf4'); // the phone
  for (const [by, mine, w] of [[140, false, 7], [143.4, true, 6], [146.8, false, 8], [150.2, true, 5], [153.6, false, 6]] as [number, boolean, number][]) rr(c, mine ? 306 - w : 296.4, by, w, 2.4, 1, mine ? '#4fb06a' : '#c4cad6');
  text(c, 'GROUP CHAT', 301, 159, 1.6, '#c8d0e0', 700);
  rr(c, 310, 150, 6, 10, 1, '#c8452e', OUT, 0.4); el(c, 316.6, 154, 1.6, 2.4, undefined, '#c8452e', 0.8); // a mug
}
