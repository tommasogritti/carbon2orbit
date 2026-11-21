import Phaser from 'phaser';
import { W, H, T, held, just, finish, img, fix, panel, who, HX } from '../core';
import { D, S } from '../art';
import type { LevelDef } from '../content';
import { snd, music, stopLoops, loop, Loop } from '../audio';

const AUTO = new URLSearchParams(location.search).has('auto');
const G = 430, ACC = 150, VMAX = 132, HOP = 128; // px/s², px/s
const KMH = 0.42; // what one px/s reads as on the speedometer
type Zone = { kind: string; x0: number; x1: number; o?: Phaser.GameObjects.Image; gone?: boolean };

/**
 * What changes from one riding level to the next: the look of the ground, the backdrop strips, the vehicle, what the
 * hazards are called and drawn as. Hazard behaviour is by kind and shared:
 *   mob   something alive on the track: go through slower than walking pace or hop it
 *   block something solid: hop it
 *   bog   soft ground: drags, unless the grip power-up is on
 *   gap   a break in the ground (set by the terrain itself): jump it
 */
const THEMES: Record<string, {
  music: string; amb: 'sea' | 'hiss'; layers: [string, number][]; vehicle: string; ground: [number, number, number]; goal: string; egg: string;
  art: Record<string, string>; hurt: Record<string, string>; pw: Record<string, { name: string; secs: number; tip: string; vehicle?: string; hop?: number }>;
  title: string; text: (secs: string, crashes: number) => string;
}> = {
  farm: {
    music: 'mahia', amb: 'sea', layers: [['bg_ride_far', 520], ['bg_ride_mid', 760]], vehicle: 'dirtbike', ground: [0x6fb25a, 0x4f8a45, 0x8a6a3c], goal: 'surveyflag', egg: 'container',
    art: { mob: 'sheep', block: 'stump', bog: 'bog' }, hurt: { mob: 'Sheep on the track! Slow right down, or hop them', block: 'Hit a stump', gap: 'Into the gully!', flip: 'Came down wrong way up' },
    pw: { K: { name: 'KNOBBLY TYRES', secs: 9, tip: 'Knobbly tyres: mud cannot hold you, and they bite for a higher hop', vehicle: 'dirtbike_k', hop: 1.3 } },
    title: 'End of the track', text: (t, c) => `Across the station in ${t} s${c ? `, with ${c} spill${c > 1 ? 's' : ''}` : ' without a spill'}. Past the last fence the land stops, and there is nothing in front of it but ocean.`,
  },
};

/**
 * A side-on ride over rolling ground. → throttle, ← brake, Space hops; in the air ← → tip the nose so both wheels meet
 * the slope. The level is data: `terrain` control points, `zones` of hazards, `flags` to ride through, a goal.
 */
export class RideScene extends Phaser.Scene {
  def!: LevelDef; p: any; th!: (typeof THEMES)[string]; pts: number[][] = []; len = 0;
  x = 30; y = 0; v = 0; vx = 0; vy = 0; rot = 0; air = false; t = 0; crashes = 0; got = 0; egg = false; secret = false; done = false; stun = 0; safe = 30; power = ''; powerT = 0;
  bike!: Phaser.GameObjects.Image; zones: Zone[] = []; flags: { x: number; name: string; o: Phaser.GameObjects.Image; got: boolean }[] = []; items: { x: number; y: number; kind: string; o: Phaser.GameObjects.Image }[] = [];
  hud!: Phaser.GameObjects.Text; msg!: Phaser.GameObjects.Text; pwT!: Phaser.GameObjects.Text; dust!: Phaser.GameObjects.Particles.ParticleEmitter; eng!: Loop; hits: string[] = [];
  constructor() { super('Ride'); }
  init(d: { def: LevelDef }) { this.def = d.def; this.p = d.def.params; this.th = THEMES[this.p.theme]; this.pts = this.p.terrain; this.len = this.pts[this.pts.length - 1][0]; this.x = 30; this.v = 0; this.air = false; this.t = 0; this.crashes = 0; this.got = 0; this.egg = false; this.secret = false; this.done = false; this.stun = 0; this.safe = 30; this.zones = []; this.flags = []; this.items = []; this.hits = []; this.power = ''; this.powerT = 0; this.rot = 0; }
  /** Height of the ground at x: smooth through the control points, and bottomless inside a gap. */
  ground(x: number): number {
    if ((this.p.gaps as number[][] | undefined)?.some(([a, b]) => x > a && x < b)) return H + 60;
    const p = this.pts; let i = 1; while (i < p.length - 1 && p[i][0] < x) i++;
    const a = p[i - 1], b = p[i], f = Phaser.Math.Clamp((x - a[0]) / (b[0] - a[0] || 1), 0, 1), s = f * f * (3 - 2 * f);
    return a[1] + (b[1] - a[1]) * s;
  }
  slope(x: number) { const a = this.ground(x - 1.5), b = this.ground(x + 1.5); return a > H || b > H ? 0 : Math.atan2(b - a, 3); }
  inGap(x: number) { return this.ground(x) > H; }
  create() {
    const p = this.p, TH = this.th, LW = this.len;
    stopLoops(); music.play(TH.music); loop(TH.amb).set(0.5); this.eng = loop('whine');
    this.cameras.main.setZoom(D).setBounds(0, 0, LW, H);
    TH.layers.forEach(([key, w], i) => { const f = (w - W) / (LW - W); img(this, HX * (1 - f), 0, key).setOrigin(0).setScrollFactor(f, 1).setDepth(-10 + i); });
    // the ground: one filled shape, a lighter top edge, a worn line where the bike goes
    const g = this.add.graphics().setDepth(0), [top, body, track] = TH.ground;
    const flush = (x0: number, x1: number) => {
      g.fillStyle(body).beginPath().moveTo(x0, H + 4); for (let x = x0; x < x1; x += 4) g.lineTo(x, this.ground(x)); g.lineTo(x1, this.ground(x1)).lineTo(x1, H + 4).closePath().fillPath();
      g.lineStyle(3, top, 1).beginPath().moveTo(x0, this.ground(x0) + 1.2); for (let x = x0 + 4; x < x1; x += 4) g.lineTo(x, this.ground(x) + 1.2); g.lineTo(x1, this.ground(x1) + 1.2).strokePath();
      g.lineStyle(0.8, track, 0.7).beginPath().moveTo(x0, this.ground(x0) + 0.4); for (let x = x0 + 4; x < x1; x += 4) g.lineTo(x, this.ground(x) + 0.4); g.lineTo(x1, this.ground(x1) + 0.4).strokePath();
    };
    let start = 0; // the ground is drawn in runs, broken at each gap; a gap shows water at the bottom
    for (const [a, b] of [...((p.gaps || []) as number[][])].sort((u, w) => u[0] - w[0])) { flush(start, a - 0.01); g.fillStyle(0x2f7fd0, 0.9).fillRect(a, H - 14, b - a, 18); g.fillStyle(0xbfe3ff, 0.6).fillRect(a, H - 14, b - a, 0.8); start = b + 0.01; }
    flush(start, LW);
    for (const [kind, x0, w] of (p.zones || []) as [string, number, number][]) {
      const z: Zone = { kind, x0, x1: x0 + w };
      if (kind === 'bog') { const bg = this.add.graphics().setDepth(1); bg.fillStyle(0x4a3620, 0.9).beginPath().moveTo(x0, this.ground(x0)); for (let x = x0; x <= x0 + w; x += 4) bg.lineTo(x, this.ground(x) + 0.4); for (let x = x0 + w; x >= x0; x -= 4) bg.lineTo(x, this.ground(x) + 3.4); bg.closePath().fillPath(); for (let x = x0 + 5; x < x0 + w; x += 11) bg.fillStyle(0x7a5a34, 0.9).fillEllipse(x, this.ground(x) + 1.6, 4, 1); }
      else z.o = img(this, (z.x0 + z.x1) / 2, this.ground((z.x0 + z.x1) / 2), TH.art[kind]).setOrigin(0.5, 1).setDepth(2).setRotation(this.slope((z.x0 + z.x1) / 2));
      this.zones.push(z);
    }
    for (const [x, name] of p.flags as [number, string][]) this.flags.push({ x, name, got: false, o: img(this, x, this.ground(x), 'rideflag').setOrigin(0.2, 1).setDepth(1) });
    const solid = (x: number) => { const gp = ((p.gaps || []) as number[][]).find(([a, b]) => x > a && x < b); return this.ground(gp ? gp[0] - 0.5 : x); }; // something hanging over a gully is measured from its lip
    const float = (kind: string, a: number[] | undefined, key: string) => { if (!a) return; const o = img(this, a[0], solid(a[0]) - a[1], key).setDepth(3); this.tweens.add({ targets: o, y: o.y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); this.items.push({ x: a[0], y: o.y, kind, o }); };
    float('egg', p.egg, TH.egg); float('secret', p.secret, 'secret'); for (const [code, x, hgt] of (p.powerups || []) as [string, number, number][]) float('pw:' + code, [x, hgt], 'pw_' + code);
    img(this, LW - 40, this.ground(LW - 40), TH.goal).setOrigin(0.5, 1).setDepth(1);
    this.dust = this.add.particles(0, 0, 'puff', { speedX: { min: -50, max: -10 }, speedY: { min: -30, max: -4 }, lifespan: 420, scale: { start: S * 0.25, end: S * 0.8 }, alpha: { start: 0.55, end: 0 }, tint: 0xcdbf9a, frequency: 30, emitting: false }).setDepth(3);
    this.y = this.ground(this.x);
    this.bike = img(this, this.x, this.y, TH.vehicle).setOrigin(0.5, 0.92).setDepth(4);
    this.cameras.main.startFollow(this.bike, false, 0.14, 0.1, -46, 26);
    fix(panel(this, 4, 4, 132, 14)).setDepth(10); this.hud = fix(T(this, 9, 6.5, '', '#ffffff', 6.4, '700')).setDepth(11);
    this.msg = fix(T(this, W / 2, 36, '', '#ffe98a', 9, '700')).setOrigin(0.5).setDepth(11).setShadow(0, 1, '#000000', 3).setAlign('center');
    this.pwT = fix(T(this, 9, 22, '', '#bfe9ff', 5.6, '700')).setDepth(11);
    who(this, this.def, W - 104, 4, false, fix);
    this.say('→ throttle · ← brake · SPACE hop');
  }
  say(s: string) { this.msg.setText(s).setAlpha(1); this.tweens.killTweensOf(this.msg); this.tweens.add({ targets: this.msg, alpha: 0, delay: 1500, duration: 400 }); }
  spill(why: string) {
    if (this.done) return;
    this.crashes++; this.hits.push(why + '@' + Math.round(this.x)); snd.crash(); this.say(why); this.cameras.main.shake(180, 0.006); this.cameras.main.flash(120, 255, 255, 255);
    this.x = this.safe; this.y = this.ground(this.x); this.v = 0; this.air = false; this.rot = this.slope(this.x); this.stun = 0.5;
  }
  bot() {
    let thr = 1, hop = false, lean = 0; const v = this.v;
    if (this.air) { const want = this.slope(this.x + this.vx * 0.22); lean = Math.abs(want - this.rot) > 0.08 ? Math.sign(want - this.rot) : 0; return { thr, hop, lean }; }
    for (const z of this.zones) {
      if (z.gone || z.kind === 'bog') continue; const k = z.x0 - this.x; if (k < -6 || k > 90) continue;
      const air = (2 * HOP) / G, reach = v * air; // how far a hop carries
      if (reach > z.x1 - z.x0 + 20) { if (k < Math.max(4, (reach - (z.x1 - z.x0)) / 2 - 2) && k > -2) hop = true; } else thr = 1; // too slow to clear it: keep building speed
    }
    for (const [a] of (this.p.gaps || []) as number[][]) { const k = a - this.x; if (k < 9 && k > -1) hop = true; } // off the lip
    return { thr, hop, lean };
  }
  update(_t: number, dms: number) {
    if (this.done) return;
    const dt = Math.min(0.04, dms / 1000), TH = this.th; this.t += dt; this.stun = Math.max(0, this.stun - dt);
    const b = AUTO ? this.bot() : { thr: (held('right') ? 1 : 0) - (held('left') ? 1 : 0), hop: just('a') || just('up'), lean: (held('right') ? 1 : 0) - (held('left') ? 1 : 0) };
    if (this.stun > 0) { b.thr = 0; b.hop = false; }
    if (this.power) { this.powerT -= dt; if (this.powerT <= 0) { this.power = ''; this.pwT.setText(''); this.bike.setTexture(TH.vehicle); snd.powerEnd(); } else this.pwT.setText(`${TH.pw[this.power].name} ${'▮'.repeat(Math.ceil(this.powerT))}`); }
    const bog = !this.air && this.power !== 'K' && this.zones.some((z) => z.kind === 'bog' && this.x > z.x0 && this.x < z.x1);
    if (!this.air) {
      const th = this.slope(this.x);
      this.v += (b.thr * ACC * (bog ? 0.55 : 1) + G * Math.sin(th) * 0.8 - this.v * (bog ? 2.6 : 0.5) - Math.sign(this.v) * 6) * dt;
      this.v = Phaser.Math.Clamp(this.v, -40, VMAX);
      const nx = this.x + this.v * Math.cos(th) * dt, ng = this.ground(nx);
      this.vx = this.v * Math.cos(th); this.vy = this.v * Math.sin(th);
      const fly = this.y + this.vy * dt + 0.5 * G * dt * dt; // where a thrown bike would be: above the ground means the ground has fallen away
      if (b.hop) { this.air = true; this.vy -= HOP * (TH.pw[this.power]?.hop || 1); snd.jump(); }
      else if (ng > H || ng - fly > 0.9) this.air = true;
      else { this.x = Math.max(8, nx); this.y = ng; this.rot = th; }
      if (!this.air && Math.abs(this.v) < 3 && !this.inGap(this.x) && !this.zones.some((z) => !z.gone && this.x > z.x0 - 30 && this.x < z.x1 + 12)) this.safe = this.x;
      if (!this.air && this.v > 40 && Math.floor(this.x / 90) !== Math.floor((this.x - this.v * dt) / 90) && !this.inGap(this.x - 40) && !this.zones.some((z) => !z.gone && this.x - 40 > z.x0 - 30 && this.x - 40 < z.x1 + 12)) this.safe = this.x - 40;
    } else {
      this.vy += G * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.rot += b.lean * 2.6 * dt;
      const gy = this.ground(this.x);
      if (this.y > H + 30) return this.spill(TH.hurt.gap);
      if (this.y >= gy && gy < H) {
        const th = this.slope(this.x);
        if (Math.abs(Phaser.Math.Angle.Wrap(this.rot - th)) > 0.85) return this.spill(TH.hurt.flip);
        this.air = false; this.y = gy; this.v = this.vx * Math.cos(th) + this.vy * Math.sin(th); this.rot = th; snd.land(); this.dust.emitParticleAt(this.x, this.y, 6);
      }
    }
    // hazards on the ground
    if (!this.air) for (const z of this.zones) {
      if (z.gone || z.kind === 'bog' || this.x < z.x0 || this.x > z.x1) continue;
      if (z.kind === 'mob' && Math.abs(this.v) < 26) { z.gone = true; snd.baa(); this.tweens.add({ targets: z.o, y: z.o!.y - 4, x: z.o!.x + 14, alpha: 0.5, duration: 500 }); continue; } // slow enough: they wander off
      return this.spill(TH.hurt[z.kind]);
    }
    for (const f of this.flags) if (!f.got && Math.abs(this.x - f.x) < 10) { f.got = true; this.got++; snd.pickup(); f.o.setTint(0x7cc56b); this.say(f.name); }
    for (const it of this.items) if (it.o.active && Math.abs(this.x - it.x) < 11 && Math.abs(this.y - 8 - it.y) < 13) {
      it.o.destroy();
      if (it.kind === 'egg') { this.egg = true; snd.egg(); this.say('Easter egg!'); } else if (it.kind === 'secret') { this.secret = true; snd.secret(); this.say('Blueprint found! Secret unlocked'); }
      else { const code = it.kind.slice(3), pw = TH.pw[code]; this.power = code; this.powerT = pw.secs; snd.power(); this.say(pw.tip); if (pw.vehicle) this.bike.setTexture(pw.vehicle); }
    }
    this.bike.setPosition(this.x, this.y).setRotation(this.rot);
    this.dust.emitting = !this.air && Math.abs(this.v) > 50; this.dust.setPosition(this.x - 9, this.y);
    this.eng.set(0.25 + 0.5 * Math.abs(b.thr), Math.min(1, Math.abs(this.v) / VMAX));
    this.hud.setText(`${Math.round(Math.abs(this.v) * KMH)} km/h   ${this.p.flagWord || 'FLAGS'} ${this.got}/${this.flags.length}   ${this.t.toFixed(0)} s`);
    if (this.x >= this.len - 46) {
      if (this.got < this.flags.length) { this.x = this.len - 47; this.v = Math.min(this.v, 0); this.say(`${this.flags.length - this.got} still to find: go back`); return; }
      this.done = true; this.eng.set(0); this.dust.emitting = false;
      const stars = this.crashes === 0 && this.t <= this.p.par ? 3 : this.crashes <= 2 ? 2 : 1;
      this.time.delayedCall(900, () => finish(this, this.def, { success: true, stars, egg: this.egg, secret: this.secret, title: TH.title, text: TH.text(this.t.toFixed(0), this.crashes) + (stars < 3 ? ` Three stars for no spills inside ${this.p.par} s.` : '') }));
    }
  }
}
