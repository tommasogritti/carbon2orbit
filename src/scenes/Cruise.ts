import Phaser from 'phaser';
import { W, H, T, held, finish, cam, img, panel, who } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import { P, S } from '../art';
import type { LevelDef } from '../content';

const AUTO = new URLSearchParams(location.search).has('auto');
const EX = 78, EY = 100, ER = 9; // Earth on screen
const GM = 40000; // px³/s²: strong close in, faint out at L2
const GATES: [number, number, string][] = [[176, 42, 'A'], [270, 50, 'B'], [268, 118, 'C'], [200, 134, 'D']]; // the kidney bean around L2
const KEY = { r0: 14, r1: 25 }; // the flyby keyhole: pass Earth's centre between these distances, underneath it
const MARS = { x: 36, y: 38, r: 15, v: 60 }; // the way out, and the speed needed to keep going
const THR = 16, MAIN = 26, TANK = 26; // thruster and main-engine acceleration (px/s²); seconds of thruster propellant
const LAG = 2.4; // Gold flies the same path a little behind Blue

/**
 * ESCAPADE: fly Blue (Gold follows) the long way to Mars. Nothing here has brakes: every push from a thruster stays
 * until another push cancels it. Loop the kidney bean around Sun–Earth L2, fall back past Earth, burn hard at the
 * lowest point of the flyby, and leave for Mars.
 */
export class CruiseScene extends Phaser.Scene {
  def!: LevelDef; x = 0; y = 0; vx = 0; vy = 0; fuel = 1; next = 0; t = 0; ended = false; peri = 999; burned = 0; inKey = false; flew = false; path: { x: number; y: number; a: number }[] = [];
  blue!: Phaser.GameObjects.Image; gold!: Phaser.GameObjects.Image; g!: Phaser.GameObjects.Graphics; hud!: Phaser.GameObjects.Text; call!: Phaser.GameObjects.Text; tip!: Phaser.GameObjects.Text; puff!: Phaser.GameObjects.Particles.ParticleEmitter; flame!: Phaser.GameObjects.Particles.ParticleEmitter; hiss!: Loop; rumble!: Loop;
  constructor() { super('Cruise'); }
  init(d: { def: LevelDef }) { this.def = d.def; this.x = 104; this.y = 94; this.vx = 26; this.vy = -18; this.fuel = 1; this.next = 0; this.t = 0; this.ended = false; this.peri = 999; this.burned = 0; this.inKey = false; this.flew = false; this.path = []; }
  create() {
    cam(this); stopLoops(); music.play('space'); this.hiss = loop('hiss'); this.rumble = loop('rumble');
    this.cameras.main.setBackgroundColor('#04050c');
    img(this, 0, 0, 'stars').setOrigin(0);
    img(this, -8, EY, 'puff').setScale(S * 22, S * 30).setTint(0xffe9a8).setBlendMode('ADD').setAlpha(0.5); // the Sun is off to the left; L2 is on the far side of Earth from it
    const st = this.add.graphics();
    st.lineStyle(0.4, 0x8fa3c8, 0.45); const pts = [...GATES.map(([x, y]) => new Phaser.Math.Vector2(x, y)), new Phaser.Math.Vector2(GATES[0][0], GATES[0][1])];
    new Phaser.Curves.Spline([new Phaser.Math.Vector2(104, 94), ...pts.slice(0, 4), new Phaser.Math.Vector2(150, 138), new Phaser.Math.Vector2(104, 132), new Phaser.Math.Vector2(EX - 4, EY + 18), new Phaser.Math.Vector2(EX - 22, EY - 28), new Phaser.Math.Vector2(MARS.x, MARS.y)]).getPoints(130).forEach((p, i) => { if (i % 2) st.fillStyle(0x8fa3c8, 0.5).fillCircle(p.x, p.y, 0.5); });
    st.lineStyle(0.5, 0xffe98a, 0.8).lineBetween(232, 84, 240, 84).lineBetween(236, 80, 236, 88); T(this, 236, 90, 'SUN–EARTH L2', '#ffe98a', 4, '700').setOrigin(0.5, 0); T(this, 236, 95, 'about a million miles out', '#8fa3c8', 3.4).setOrigin(0.5, 0);
    st.lineStyle(2.2, P.lgreen, 0.55).beginPath().arc(EX, EY, (KEY.r0 + KEY.r1) / 2, 0.25, Math.PI - 0.25, false).strokePath(); st.lineStyle(KEY.r1 - KEY.r0, P.lgreen, 0.16).beginPath().arc(EX, EY, (KEY.r0 + KEY.r1) / 2, 0.15, Math.PI - 0.15, false).strokePath();
    img(this, EX, EY, 'earth').setDisplaySize(ER * 2.9, ER * 2.9); T(this, EX, EY - 17, 'EARTH', '#aab4d4', 4, '700').setOrigin(0.5, 0);
    img(this, 16, 16, 'mars').setScale(S); T(this, 27, 9, 'MARS', '#ffb090', 4.6, '700'); T(this, 27, 15, 'orbit insertion planned\nSeptember 2027', '#b08a7a', 3.4);
    T(this, W - 6, H - 5, 'not to scale', '#5f6f90', 3.4).setOrigin(1, 1);
    this.g = this.add.graphics();
    this.flame = this.add.particles(0, 0, 'puff', { speed: { min: 20, max: 50 }, lifespan: 300, scale: { start: S * 0.5, end: 0 }, color: [0xffffff, 0xb8dcff, 0x6fa8ff], blendMode: 'ADD', emitting: false });
    this.puff = this.add.particles(0, 0, 'puff', { speed: { min: 14, max: 30 }, lifespan: 240, scale: { start: S * 0.22, end: 0 }, alpha: { start: 0.9, end: 0 }, emitting: false });
    this.gold = img(this, this.x, this.y, 'esc_gold').setAlpha(0); this.blue = img(this, this.x, this.y, 'esc_blue');
    panel(this, 110, 150, 84, 26, 0.8); this.hud = T(this, 115, 152.4, '', '#ffffff', 5, '700');
    this.call = T(this, W / 2 + 20, 6, '13 November 2025 · New Glenn has let go of Blue and Gold', '#ffe98a', 6.2, '700').setOrigin(0.5, 0).setShadow(0, 1, '#000000', 3).setAlign('center');
    this.tip = T(this, W / 2 + 20, 15, '←↑↓→ fire thrusters · every push stays until you cancel it', '#cfd6ea', 4.8, '700').setOrigin(0.5, 0).setShadow(0, 1, '#000000', 3);
    who(this, { ...this.def, role: this.def.role || 'CEO · Rocket Lab built both spacecraft' }, 4, H - 26);
  }
  update(_t: number, dms: number) {
    if (this.ended) return;
    const dt = Math.min(0.05, dms / 1000); this.t += dt;
    const dx = this.x - EX, dy = this.y - EY, r = Math.hypot(dx, dy), sp = Math.hypot(this.vx, this.vy);
    const below = dy > 0 && r < KEY.r1 + 6;
    // ---- controls: four thrusters, and the main engine along the direction of travel
    let ix = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), iy = (held('down') ? 1 : 0) - (held('up') ? 1 : 0), main = held('a');
    if (AUTO) ({ ix, iy, main } = this.bot(r, sp));
    if (this.fuel <= 0) { ix = 0; iy = 0; main = false; }
    if (ix || iy) { this.vx += ix * THR * dt; this.vy += iy * THR * dt; this.fuel -= ((Math.abs(ix) + Math.abs(iy)) * dt) / TANK; if (Math.random() < 0.6) this.puff.emitParticleAt(this.x - ix * 3, this.y - iy * 3); }
    if (main && sp > 1) { this.vx += (this.vx / sp) * MAIN * dt; this.vy += (this.vy / sp) * MAIN * dt; this.fuel -= (1.6 * dt) / TANK; this.flame.emitParticleAt(this.x - (this.vx / sp) * 4, this.y - (this.vy / sp) * 4); if (r < KEY.r1 + 4) this.burned += dt; }
    this.fuel = Math.max(0, this.fuel); this.hiss.set(ix || iy ? 0.8 : 0); this.rumble.set(main ? 0.45 : 0, 0.2);
    // ---- gravity and motion
    const a = GM / (r * r); this.vx -= (dx / r) * a * dt; this.vy -= (dy / r) * a * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    this.path.push({ x: this.x, y: this.y, a: Math.atan2(this.vy, this.vx) });
    // ---- the route
    if (this.next < GATES.length) {
      const [gx, gy, name] = GATES[this.next];
      if (Math.hypot(this.x - gx, this.y - gy) < 11) { this.next++; snd.pickup(); this.call.setText(this.next < GATES.length ? `Gate ${name} · loitering near L2 while Mars comes round` : 'November 2026 · the window is open · fall back to Earth'); this.tip.setText(this.next < GATES.length ? 'small pushes: let it coast' : 'pass UNDER Earth through the green band, and hold SPACE at the lowest point'); }
    } else if (!this.flew) {
      if (below && r < KEY.r1) { if (!this.inKey) { this.inKey = true; snd.select(); this.call.setText('7 November 2026 · Blue’s powered flyby · BURN!'); } this.peri = Math.min(this.peri, r); }
      else if (this.inKey && r > KEY.r1 + 4) { this.flew = true; this.call.setText('Through the keyhole · now make for Mars'); this.tip.setText('the gate at top left needs speed: a burn deep in the well is worth more than one out here'); }
    } else if (Math.hypot(this.x - MARS.x, this.y - MARS.y) < MARS.r) {
      if (sp >= MARS.v) return this.win(sp);
      this.call.setText('Too slow to leave: Earth will pull this one back');
    }
    // ---- endings
    if (r < ER + 1.5) return this.lose('Blue came in too low and met the atmosphere. Aim for the green band under Earth: close, but not that close.');
    if (this.x < -30 || this.x > W + 30 || this.y < -30 || this.y > H + 30) return this.lose(this.flew ? 'Blue left the Earth–Moon neighbourhood in the wrong direction. Come out of the flyby aimed at the gate at top left.' : 'Blue drifted away from the route. Nothing stops a spacecraft but its own thrusters: cancel each push with an opposite one.');
    if (this.t > 150) return this.lose('The Mars window has closed. Fly the four gates around L2 in order, then drop back to Earth for the flyby.');
    this.draw(sp, r);
  }
  /** Autopilot: steer the velocity vector at the next gate, coast when it is close enough, burn through perigee. */
  bot(r: number, sp: number) {
    let tx: number, ty: number, vc = 26, main = false, band = 6;
    if (this.next < GATES.length) { [tx, ty] = GATES[this.next] as unknown as [number, number]; }
    else if (!this.flew) { tx = 110; ty = 138; vc = 34; band = 3; if (this.inKey || (r < KEY.r1 + 2 && this.y > EY)) return { ix: 0, iy: 0, main: sp < 79 }; if (r < 72) return { ix: 0, iy: 0, main: false }; } // line up on the approach, then let gravity do the turning
    else { if (r < 70) return { ix: 0, iy: 0, main: false }; tx = MARS.x; ty = MARS.y; vc = Math.max(sp, MARS.v + 2); band = 7; main = sp < MARS.v + 1; } // coast out of the well before trimming
    const d = Math.hypot(tx - this.x, ty - this.y) || 1, ex = ((tx - this.x) / d) * vc - this.vx, ey = ((ty - this.y) / d) * vc - this.vy;
    return { ix: Math.abs(ex) > band ? Math.sign(ex) : 0, iy: Math.abs(ey) > band ? Math.sign(ey) : 0, main };
  }
  draw(sp: number, _r: number) {
    const g = this.g; g.clear();
    g.lineStyle(0.5, 0x7fb4ff, 0.7).beginPath(); const n = this.path.length; for (let i = Math.max(0, n - 220); i < n; i += 2) { const p = this.path[i]; if (i === Math.max(0, n - 220)) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); } g.strokePath();
    GATES.forEach(([x, y, name], i) => { const done = i < this.next, cur = i === this.next; g.lineStyle(cur ? 0.9 : 0.5, done ? P.lgreen : cur ? 0xffe98a : 0x8fa3c8, done ? 0.5 : 1).strokeCircle(x, y, cur ? 9 + Math.sin(this.t * 5) : 8); if (cur) { g.fillStyle(0xffe98a).fillCircle(x, y, 1); void name; } });
    const out = this.flew; g.lineStyle(out ? 0.9 : 0.5, out ? 0xffe98a : 0x8fa3c8, out ? 1 : 0.6).strokeCircle(MARS.x, MARS.y, MARS.r + (out ? Math.sin(this.t * 5) : 0));
    this.blue.setPosition(this.x, this.y).setRotation(Math.atan2(this.vy, this.vx));
    const lag = this.path[this.path.length - 1 - Math.round(LAG * 60)]; // Gold, two days behind on the same road
    if (lag) this.gold.setPosition(lag.x, lag.y).setRotation(lag.a).setAlpha(1);
    this.hud.setText(`PROPELLANT ${Math.round(this.fuel * 100)}%\nSPEED ${sp.toFixed(0)}${this.flew ? ` · need ${MARS.v}` : ''}\n${this.next < GATES.length ? `L2 GATES ${this.next}/4` : this.flew ? 'OUTBOUND' : this.inKey ? 'PERIGEE · BURN' : 'EARTH FLYBY NEXT'}`).setColor(this.fuel < 0.15 ? '#ff8a70' : '#ffffff');
  }
  lose(text: string) { this.ended = true; this.hiss.set(0); this.rumble.set(0); snd.dud(); this.time.delayedCall(500, () => finish(this, this.def, { success: false, title: 'Off course', text })); }
  win(sp: number) {
    this.ended = true; this.hiss.set(0); this.rumble.set(0); snd.seco(); this.call.setText('On the way to Mars · Gold follows two days behind'); this.tip.setText('');
    const left = Math.round(this.fuel * 100), stars = left >= 35 ? 3 : left >= 15 ? 2 : 1, deep = this.burned >= 0.25;
    this.tweens.add({ targets: [this.blue, this.gold], x: 16, y: 16, scale: S * 0.3, alpha: 0.2, duration: 2400, ease: 'Sine.easeIn' });
    this.time.delayedCall(2600, () => finish(this, this.def, { success: true, stars, egg: stars === 3 && deep, title: 'Trans-Mars injection', text: `Blue left Earth at speed ${sp.toFixed(0)} with ${left}% of its propellant in hand${deep ? ', after a burn at the bottom of the flyby, where it counts for most' : ''}. Gold flew the same road two days later.${stars < 3 ? ' For three stars: arrive with 35% or more. Coast more, correct less, and save the big burn for the lowest point of the flyby.' : ''}` }));
  }
}
