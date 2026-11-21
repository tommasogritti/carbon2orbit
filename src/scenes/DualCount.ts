import Phaser from 'phaser';
import { W, H, T, just, finish, cam, img, panel, who } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import { P, S } from '../art';
import type { LevelDef } from '../content';

const AUTO = new URLSearchParams(location.search).has('auto');
const HW = 156; // width of each half
const SLIP = 20; // minutes a missed call costs that pad
type Kind = 'go' | 'nogo';
interface Call { at: number; side: 0 | 1; kind: Kind; text: string; state?: 'live' | 'ok' | 'missed'; t?: number }
interface Side { name: string; mission: string; site: string; tz: number; day: [number, number]; liftoff: number; label: string }
const THEMES: Record<string, { music: string; role: string; title: string; text: (gap: string, misses: number) => string }> = {
  twopads: { music: 'launch', role: 'CEO · two rockets, one mission control', title: 'Two launches, two hemispheres', text: (gap, n) => `Both rockets flew, ${gap} apart${n ? `, with ${n} call${n > 1 ? 's' : ''} answered late or not at all` : ', and every call was answered on time'}.` },
};
const hm = (h: number) => { const m = Math.round((((h % 24) + 24) % 24) * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

/**
 * Two consoles, one pair of hands. Calls come up on each side with a timer: answer a GO with that side's key (← for the
 * left console, → for the right) and a NO-GO with ↓ to hold. Everything is data on the level: the two sides, the calls
 * with their times, and the clock that the play time stands for.
 */
export class DualCountScene extends Phaser.Scene {
  def!: LevelDef; p: any; th!: (typeof THEMES)[string]; sides: Side[] = []; calls: Call[] = []; t = 0; misses = 0; slip = [0, 0]; ended = false; flew = [false, false]; botT = [0, 0]; clean = true;
  g!: Phaser.GameObjects.Graphics; clockT!: Phaser.GameObjects.Text; callT: Phaser.GameObjects.Text[] = []; nextT: Phaser.GameObjects.Text[] = []; localT: Phaser.GameObjects.Text[] = []; sky: Phaser.GameObjects.Rectangle[] = []; ground: Phaser.GameObjects.Image[] = []; rocket: Phaser.GameObjects.Image[] = []; flame: Phaser.GameObjects.Particles.ParticleEmitter[] = []; rumble!: Loop; msg!: Phaser.GameObjects.Text;
  constructor() { super('DualCount'); }
  init(d: { def: LevelDef }) { this.def = d.def; this.p = d.def.params; this.th = THEMES[this.p.theme]; this.sides = this.p.sides; this.calls = (this.p.calls as [number, 0 | 1, Kind, string][]).map(([at, side, kind, text]) => ({ at, side, kind, text })); this.t = 0; this.misses = 0; this.slip = [0, 0]; this.ended = false; this.flew = [false, false]; this.callT = []; this.nextT = []; this.localT = []; this.sky = []; this.ground = []; this.rocket = []; this.flame = []; this.botT = [0, 0]; this.clean = true; }
  /** The clock the play time stands for, in hours UTC (may run past 24), from the level's key frames. */
  utc(t: number) { const k = this.p.clock as number[][]; let i = 1; while (i < k.length - 1 && k[i][0] < t) i++; const a = k[i - 1], b = k[i], f = Phaser.Math.Clamp((t - a[0]) / (b[0] - a[0] || 1), 0, 1); return a[1] + (b[1] - a[1]) * f; }
  create() {
    cam(this); stopLoops(); music.play(this.th.music, 1); this.rumble = loop('rumble');
    this.cameras.main.setBackgroundColor('#0a0f20');
    panel(this, 4, 4, W - 8, 16, 0.9); this.clockT = T(this, W / 2, 6.6, '', '#ffe98a', 7.4, '700').setOrigin(0.5, 0);
    this.sides.forEach((sd, i) => {
      const x0 = 3 + i * (HW + 2);
      this.sky.push(this.add.rectangle(x0, 24, HW, 80, 0x0a1230).setOrigin(0));
      const gr = img(this, x0 - 2, 28, 'site_' + sd.site).setOrigin(0).setScale(S * 0.5).setCrop(4 * 4, 0, 312 * 4, 150 * 4); this.ground.push(gr);
      this.flame.push(this.add.particles(0, 0, 'puff', { speedY: { min: 40, max: 80 }, speedX: { min: -5, max: 5 }, lifespan: 300, scale: { start: S * 0.4, end: S * 0.1 }, color: [0xffffff, 0xfff0b0, 0xffb347, 0xff5a1f], alpha: { start: 1, end: 0 }, blendMode: 'ADD', frequency: 12, emitting: false }));
      this.rocket.push(img(this, x0 + 75, 78, 'electron_full').setOrigin(0.5, 1).setScale(S * 0.5));
      this.add.rectangle(x0, 104, HW, 76, 0x0a0f20).setOrigin(0); this.add.graphics().lineStyle(0.6, 0xffffff, 0.25).strokeRoundedRect(x0, 24, HW, 80, 2);
      panel(this, x0, 106, HW, 70, 0.9);
      T(this, x0 + 5, 108.4, sd.name, '#ffffff', 6, '700'); T(this, x0 + 5, 116, sd.mission, '#aab4d4', 4.6, '700'); this.localT.push(T(this, x0 + HW - 5, 108.6, '', '#aab4d4', 4.6, '700').setOrigin(1, 0));
      this.callT.push(T(this, x0 + HW / 2, 127, '', '#ffffff', 6, '700').setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(HW - 14).setDepth(3));
      this.nextT.push(T(this, x0 + 5, 168, '', '#7483a6', 4, '700'));
      T(this, x0 + HW / 2, 26.5, `${i ? '→' : '←'} answers this console · ↓ holds`, '#cfd6ea', 4.4, '700').setOrigin(0.5, 0).setShadow(0, 1, '#000', 2);
    });
    this.g = this.add.graphics().setDepth(2);
    this.msg = T(this, W / 2, 96, '', '#ffe98a', 6.4, '700').setOrigin(0.5).setShadow(0, 1, '#000000', 3).setDepth(5);
    who(this, { ...this.def, role: this.def.role || this.th.role }, W / 2 - 50, 40);
  }
  say(s: string) { this.msg.setText(s).setAlpha(1); this.tweens.killTweensOf(this.msg); this.tweens.add({ targets: this.msg, alpha: 0, delay: 1300, duration: 400 }); }
  miss(c: Call, why: string, cost = 1) { c.state = 'missed'; this.misses += cost; this.slip[c.side] += SLIP * cost; this.clean = false; snd.deny(); this.cameras.main.shake(120, 0.004); this.say(why); }
  update(_t: number, dms: number) {
    if (this.ended) return;
    const dt = Math.min(0.05, dms / 1000); this.t += dt;
    const win = (c: Call) => (c.kind === 'go' ? 2.3 : 1.9);
    for (const c of this.calls) { // calls come up, and expire
      if (!c.state && this.t >= c.at) { c.state = 'live'; c.t = 0; if (c.kind === 'nogo') snd.alarm(); else snd.tick(); }
      if (c.state === 'live') { c.t! += dt; if (c.t! > win(c)) this.miss(c, c.kind === 'go' ? `${this.sides[c.side].label}: no answer. The count slips ${SLIP} minutes` : `${this.sides[c.side].label}: NO-GO went uncalled. Scrubbed and recycled`, c.kind === 'go' ? 1 : 3); }
    }
    const live = (i: number) => this.calls.find((c) => c.state === 'live' && c.side === i);
    // input: a side key answers that console's GO; ↓ holds whichever consoles are showing a NO-GO
    const keys = [just('left'), just('right')], hold = just('down');
    for (const i of [0, 1] as const) {
      const c = live(i); let go = keys[i], hd = hold;
      if (AUTO && c) { this.botT[i] += dt; if (this.botT[i] > 0.4) { go = c.kind === 'go'; hd = c.kind === 'nogo'; } }
      if (!c) { this.botT[i] = 0; if (go) snd.deny(); continue; }
      if (c.kind === 'go' && go) { c.state = 'ok'; snd.select(); this.botT[i] = 0; }
      else if (c.kind === 'nogo' && hd) { c.state = 'ok'; snd.abort(); this.say(`${this.sides[i].label}: hold called. Working it`); this.botT[i] = 0; }
      else if (c.kind === 'nogo' && go) this.miss(c, `${this.sides[i].label}: that was a NO-GO. You said go`, 3);
    }
    // lift-offs happen on the clock (plus whatever that pad has slipped)
    this.sides.forEach((sd, i) => {
      if (!this.flew[i] && this.t >= sd.liftoff) { this.flew[i] = true; snd.liftoff(); this.cameras.main.shake(400, 0.003); this.flame[i].startFollow(this.rocket[i], 0, 1); this.flame[i].emitting = true; this.tweens.add({ targets: this.rocket[i], y: -20, duration: 2600, ease: 'Quad.easeIn', onComplete: () => (this.flame[i].emitting = false) }); this.say(`${sd.label}: lift-off of ${sd.mission.split('·')[0].trim()}`); }
    });
    this.rumble.set(this.flame.some((f) => f.emitting) ? 0.5 : 0, 0.6);
    this.draw(win);
    if (this.t >= this.p.length) return this.done();
  }
  draw(win: (c: Call) => number) {
    const g = this.g; g.clear(); const utc = this.utc(this.t), day = Math.floor(utc / 24);
    this.clockT.setText(`${hm(utc)} UTC · ${this.p.dates[day] || ''}   ·   MISSED ${this.misses}`).setColor(this.misses ? '#ff8a70' : '#ffe98a');
    this.sides.forEach((sd, i) => {
      const x0 = 3 + i * (HW + 2), local = (((utc + sd.tz) % 24) + 24) % 24, light = Phaser.Math.Clamp(Math.min((local - sd.day[0]) / 1, (sd.day[1] - local) / 1), 0, 1);
      this.sky[i].setFillStyle(Phaser.Display.Color.GetColor(10 + light * 60, 18 + light * 130, 48 + light * 180)); this.ground[i].setTint(Phaser.Display.Color.GetColor(80 + light * 175, 95 + light * 160, 140 + light * 115)); this.rocket[i].setTint(light > 0.5 ? 0xffffff : 0xb8c4e0);
      this.localT[i].setText(`${hm(utc + sd.tz)} local`);
      const c = this.calls.find((q) => q.state === 'live' && q.side === i), nx = this.calls.find((q) => !q.state && q.side === i);
      if (c) {
        const red = c.kind === 'nogo', blink = red && Math.floor(this.time.now / 160) % 2 === 0;
        g.fillStyle(red ? (blink ? 0xffffff : P.red) : 0x1f5a34, red ? 0.95 : 0.9).fillRoundedRect(x0 + 5, 124, HW - 10, 30, 3);
        this.callT[i].setText(`${red ? 'NO-GO · ' : ''}${c.text}\n${red ? '↓ HOLD' : (i ? '→' : '←') + ' GO'}`).setColor(red && blink ? '#10131c' : '#ffffff');
        g.fillStyle(0x000000, 0.5).fillRoundedRect(x0 + 5, 157, HW - 10, 4, 2); g.fillStyle(red ? P.red : P.lgreen).fillRoundedRect(x0 + 5, 157, Math.max(4, (HW - 10) * (1 - c.t! / win(c))), 4, 2);
      } else this.callT[i].setText(this.flew[i] && !nx ? 'console quiet' : '').setColor('#7483a6');
      this.nextT[i].setText(nx ? `NEXT  ${nx.text}` : '');
    });
  }
  done() {
    this.ended = true; this.rumble.set(0);
    const gapMin = Math.round((this.p.gap_h as number) * 60) + this.slip[1], gap = `${Math.floor(gapMin / 60)} h ${String(gapMin % 60).padStart(2, '0')} min`;
    if (gapMin >= 24 * 60) return finish(this, this.def, { success: false, title: `${gap} apart`, text: 'Both rockets flew, but more than a day apart: no record. Each call you miss slips that pad’s count, and a NO-GO that goes uncalled costs a full recycle. Watch the NEXT line under each console to see what is coming.' });
    const stars = this.misses === 0 ? 3 : this.misses <= 2 ? 2 : 1; snd.seco();
    finish(this, this.def, { success: true, stars, egg: this.clean, title: this.th.title, text: this.th.text(gap, this.misses) + (stars < 3 ? ' Three stars for answering every call in time.' : '') });
  }
}
