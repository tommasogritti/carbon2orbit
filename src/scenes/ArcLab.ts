import Phaser from 'phaser';
import { W, H, T, held, just, finish, cam, img, panel, who } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import { P } from '../art';
import type { LevelDef } from '../content';

const AUTO = new URLSearchParams(location.search).has('auto');
const PX = 122, PY = 34, PW = 186, PH = 84; // the plot
const XL = 3, XR = -2.4; // log10 of pressure in millibar at the left and right edges: sea level to near-vacuum
const X = (lp: number) => PX + ((XL - lp) / (XL - XR)) * PW, Y = (v: number) => PY + PH - (Math.min(v, 520) / 520) * PH;
/** Breakdown voltage against pressure for a fixed gap: high at both ends, lowest in between. The shape is Paschen's; the numbers are the game's. */
const breakdown = (lp: number, vmin: number) => { const d = lp - 0.4; return vmin * (1 + (d > 0 ? 0.3 : 1.1) * d * d); };
interface Sw { key: string; name: string; on: boolean; what: string }

/**
 * An experiment, not a search: a high-voltage harness in a chamber, a curve that says when a gap will arc, and
 * switches for the conditions that were present in flight. Find what it takes to make it arc on the way up, show that
 * each condition is needed, then show that the fix holds. Switches, tasks and numbers come from the level's params.
 */
export class ArcLabScene extends Phaser.Scene {
  def!: LevelDef; p: any; sw: Sw[] = []; sel = 0; lp = XL; sweep = -1; arced = false; sweeps = 0; wasted = 0; tasks: { text: string; done: boolean }[] = []; ended = false; arcT = 0; botT = 0; botI = 0; fixOpen = false;
  g!: Phaser.GameObjects.Graphics; list!: Phaser.GameObjects.Text; call!: Phaser.GameObjects.Text; swT: Phaser.GameObjects.Text[] = []; read!: Phaser.GameObjects.Text; hum!: Loop;
  constructor() { super('ArcLab'); }
  /** The controls panel (H or the ? button): what the keys do right now, in this level and this phase. Shape agreed with core's showHelp. */
  help(): { title: string; rows: [keys: string, does: string][]; note?: string } {
    if (this.sweep >= 0) return { title: 'The laboratory', rows: [], note: 'An ascent sweep is running: no keys until it ends.' };
    return { title: 'The laboratory', rows: [['← →', 'Choose a condition.'], ['Space', 'Switch the chosen condition on or off.'], ['↑ ↓', 'Change the pressure by hand.'], ['Enter', 'Run an ascent sweep, from sea level to vacuum.']], note: 'Work down the list on the left. The fewer sweeps, the more stars.' };
  }
  init(d: { def: LevelDef }) {
    this.def = d.def; this.p = d.def.params; this.sel = 0; this.lp = XL; this.sweep = -1; this.arced = false; this.sweeps = 0; this.wasted = 0; this.ended = false; this.arcT = 0; this.botT = 0; this.botI = 0; this.fixOpen = false; this.swT = [];
    this.sw = (this.p.switches as [string, string, string][]).map(([key, name, what]) => ({ key, name, what, on: false }));
    this.tasks = [{ text: 'Make it arc on an ascent sweep', done: false }, ...this.sw.filter((s) => s.key !== 'fix').map((s) => ({ text: `Sweep without ${s.what}: no arc`, done: false })), { text: 'Apply the fix: sweep with everything on, no arc', done: false }];
  }
  on(k: string) { return !!this.sw.find((s) => s.key === k)?.on; }
  /** Peak voltage across the gap, and the voltage at which this gas would break down at this pressure. */
  volts() { return this.p.dc + (this.on('ripple') ? this.p.ripple : 0); }
  limit(lp: number) { return breakdown(lp, this.on('gas') ? this.p.vmin[1] : this.p.vmin[0]); }
  arcs(lp: number) { return this.on('fault') && this.volts() > this.limit(this.on('fix') ? XL : lp); }
  create() {
    cam(this); stopLoops(); music.play('space'); this.hum = loop('whine'); this.hum.set(0.1, 0.1);
    img(this, 0, 0, 'bg_review').setOrigin(0);
    panel(this, 4, 4, W - 8, 16, 0.9); T(this, 9, 6.6, this.p.heading as string, '#ffffff', 6.2, '700');
    panel(this, 4, 24, 110, 100, 0.9); this.list = T(this, 8, 27, '', '#ffffff', 4.5, '700').setWordWrapWidth(102).setLineSpacing(0.6);
    panel(this, 118, 24, 198, 100, 0.9);
    T(this, PX, PY - 7.6, 'VOLTS · game scale', '#aab4d4', 4, '700'); T(this, PX, PY + PH + 1.6, 'SEA LEVEL', '#aab4d4', 3.8, '700'); T(this, PX + PW, PY + PH + 1.6, 'VACUUM', '#aab4d4', 3.8, '700').setOrigin(1, 0); T(this, PX + PW / 2, PY + PH + 1.6, 'PRESSURE →  falling, as on the way up', '#8fa3c8', 3.8, '700').setOrigin(0.5, 0);
    this.read = T(this, PX + PW, PY - 7.6, '', '#ffffff', 4.4, '700').setOrigin(1, 0);
    panel(this, 4, 128, W - 8, 30, 0.9);
    this.sw.forEach((s, i) => this.swT.push(T(this, 12 + i * 77, 131, '', '#ffffff', 4.6, '700').setWordWrapWidth(70)));
    this.g = this.add.graphics();
    this.call = T(this, 212, 160.6, '', '#ffe98a', 5.2, '700').setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(204).setShadow(0, 1, '#000000', 3);
    who(this, { ...this.def, role: this.def.role || 'CEO · with the review team' }, 4, 158);
    this.say('← → choose a condition · SPACE switches it · ↑ ↓ change the pressure by hand · ENTER runs an ascent sweep');
  }
  say(s: string) { this.call.setText(s); }
  tick(i: number, msg: string) { if (this.tasks[i].done) return false; this.tasks[i].done = true; snd.pickup(); this.say(msg); return true; }
  endSweep() {
    this.sweep = -1; this.hum.set(0.1, 0.1);
    const need = this.sw.filter((s) => s.key !== 'fix'), off = need.filter((s) => !s.on), fix = this.on('fix'); let useful = false;
    if (this.arced) useful = this.tick(0, 'It arcs: not at sea-level pressure, not in a hard vacuum, but at the low pressure in between.');
    else if (fix && !off.length) useful = this.tick(this.tasks.length - 1, 'All three conditions present, and no arc: the sealed frame never lets the pressure fall into the danger band.');
    else if (!fix && off.length === 1 && this.tasks[0].done) useful = this.tick(1 + need.indexOf(off[0]), `No arc without ${off[0].what}. It is needed.`);
    if (!useful) { this.wasted++; this.say(this.arced ? 'It arced again. That was already known.' : !this.tasks[0].done ? 'Nothing. Something that was there in flight is missing here.' : 'Nothing new from that one. Change one condition at a time.'); }
    if (this.tasks.slice(0, -1).every((q) => q.done) && !this.fixOpen) { this.fixOpen = true; this.say(this.call.text + '\nAll three are needed. Now the fix: switch on the sealed battery frame.'); }
    if (this.tasks.every((q) => q.done)) {
      this.ended = true;
      const stars = this.sweeps <= this.tasks.length + 1 ? 3 : this.sweeps <= this.tasks.length + 4 ? 2 : 1;
      this.time.delayedCall(1400, () => finish(this, this.def, { success: true, stars, egg: this.wasted === 0, title: 'Cause found, fix proven', text: `${this.sweeps} sweeps, ${this.wasted} of them wasted. An arc needs a gap to jump, enough voltage, and gas at the wrong pressure; take any one away and it cannot form.` }));
    }
  }
  update(_t: number, dms: number) {
    if (this.ended) return;
    const dt = Math.min(0.05, dms / 1000); this.arcT = Math.max(0, this.arcT - dt);
    const vis = this.sw.filter((s) => s.key !== 'fix' || this.fixOpen);
    if (this.sweep >= 0) { // pressure falls as it does on the way to space
      this.sweep += dt / 2.6; this.lp = XL + (XR - XL) * Math.min(1, this.sweep); this.hum.set(0.4, 0.2 + this.sweep * 0.6);
      if (this.arcs(this.lp) && !this.arced) { this.arced = true; this.arcT = 0.9; snd.boom(); this.cameras.main.flash(200, 255, 255, 255); this.cameras.main.shake(250, 0.008); }
      if (this.sweep >= 1) this.endSweep();
    } else {
      let dSel = (just('right') ? 1 : 0) - (just('left') ? 1 : 0), flip = just('a'), run = just('b');
      if (AUTO) { // the bot runs the five sweeps a careful experimenter would
        this.botT += dt; dSel = 0; flip = false; run = false;
        const want = (this.p.botPlan as string[][])[this.botI];
        if (want && this.botT > 0.3) { this.botT = 0; const wrong = vis.findIndex((s) => s.on !== want.includes(s.key)); if (wrong >= 0) { this.sel = wrong; flip = true; } else { run = true; this.botI++; } }
      } else this.lp = Phaser.Math.Clamp(this.lp + ((held('up') ? 1 : 0) - (held('down') ? 1 : 0)) * 2.4 * dt, XR, XL);
      if (dSel) { this.sel = (this.sel + dSel + vis.length) % vis.length; snd.tick(); }
      if (flip) { const s = vis[this.sel]; s.on = !s.on; snd.click(); }
      if (run) { this.sweep = 0; this.arced = false; this.sweeps++; snd.select(); this.say('Ascent sweep: pressure falling…'); }
      if (!run && this.arcs(this.lp) && this.arcT <= 0) { this.arcT = 0.5; snd.sizzle(); if (!this.tasks[0].done) this.say('An arc! Now show it on an ascent sweep (ENTER).'); }
    }
    this.draw(vis);
  }
  draw(vis: Sw[]) {
    const g = this.g; g.clear();
    g.fillStyle(0x0b1020, 0.9).fillRect(PX, PY, PW, PH);
    const live = this.on('fault'), v = this.volts();
    // the danger band: where this gas would break down under this voltage
    for (let i = 0; i < PW; i += 2) { const lp = XL + (XR - XL) * (i / PW); if (v > this.limit(lp)) g.fillStyle(P.red, live ? 0.28 : 0.1).fillRect(PX + i, PY, 2, PH); }
    g.lineStyle(0.8, live ? 0xffe98a : 0x6a7390, 1).beginPath(); for (let i = 0; i <= PW; i += 2) { const lp = XL + (XR - XL) * (i / PW), y = Y(this.limit(lp)); if (i) g.lineTo(PX + i, y); else g.moveTo(PX + i, y); } g.strokePath();
    g.lineStyle(0.7, 0x7fd0ff, 1).lineBetween(PX, Y(this.p.dc), PX + PW, Y(this.p.dc));
    if (this.on('ripple')) { g.lineStyle(0.5, 0x7fd0ff, 0.9).beginPath(); for (let i = 0; i <= PW; i += 1) { const y = Y(this.p.dc + this.p.ripple * Math.abs(Math.sin(i * 0.5 + this.time.now / 90))); if (i) g.lineTo(PX + i, y); else g.moveTo(PX + i, y); } g.strokePath(); }
    const px = X(this.on('fix') ? XL : this.lp); g.lineStyle(0.8, 0xffffff, 0.9).lineBetween(px, PY, px, PY + PH); g.fillStyle(0xffffff).fillTriangle(px - 2, PY - 0.4, px + 2, PY - 0.4, px, PY + 3);
    if (this.on('fix') && this.sweep >= 0) { const ox = X(this.lp); g.lineStyle(0.5, 0x8fa3c8, 0.6).lineBetween(ox, PY, ox, PY + PH); } // outside falls; inside the frame it does not
    if (this.arcT > 0) { const ax = px, ay = Y(this.limit(this.lp)); g.lineStyle(1.2, 0xffffff, 1).beginPath().moveTo(ax - 6, ay - 8); for (let k = 0; k < 6; k++) g.lineTo(ax - 6 + k * 2.4 + (Math.random() - 0.5) * 3, ay - 8 + k * 3.2 + (Math.random() - 0.5) * 3); g.strokePath(); g.fillStyle(0xbfe3ff, 0.5).fillCircle(ax, ay, 6 + Math.random() * 3); }
    this.read.setText(`${live ? '' : 'INSULATION INTACT · '}CURVE: ${this.on('gas') ? 'helium + nitrogen' : 'dry air'} · PEAK ${v} V`).setColor(live ? '#ffe98a' : '#8fa3c8');
    this.list.setText(this.tasks.map((q) => `${q.done ? '✓' : '☐'} ${q.text}`).join('\n') + `\n\nSWEEPS ${this.sweeps}`);
    vis.forEach((s, i) => { const sel = i === this.sel && this.sweep < 0, x = 8 + i * 77; g.fillStyle(s.on ? 0x1f5a34 : 0x1b2236, 0.95).fillRoundedRect(x, 130, 74, 26, 3); g.lineStyle(sel ? 0.9 : 0.4, sel ? 0xffe98a : 0x5f7fb0, 1).strokeRoundedRect(x, 130, 74, 26, 3); this.swT[this.sw.indexOf(s)].setText(`${s.on ? '● ON' : '○ OFF'}\n${s.name}`).setColor(s.on ? '#ffffff' : '#aab4d4').setDepth(2); });
  }
}
