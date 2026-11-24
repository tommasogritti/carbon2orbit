import Phaser from 'phaser';
import { W, H, T, just, finish, cam, img, panel, who } from '../core';
import { snd, music, stopLoops } from '../audio';
import { P, S } from '../art';
import type { LevelDef } from '../content';
import { hifi, HiFi } from '../hifi';
import { LOOKS } from '../hifiLooks';

const AUTO = new URLSearchParams(location.search).has('auto');
const EX = 70, EY = 122, MX = 262, MY = 46; // Earth and Moon on screen
const RP = 16; // perigee radius
const TARGET = Math.hypot(MX - EX, MY - EY); // apogee needed to reach the Moon
const AXIS = Math.atan2(MY - EY, MX - EX); // apogee points at the Moon
const WIN = 0.5; // perigee window half-width, rad
const LOOK = 'cislunar'; // the hi-fi look (looks/cislunar.ts)

/** CAPSTONE: raise Lunar Photon's apogee with well-timed perigee burns until it reaches the Moon. */
export class OrbitRaiseScene extends Phaser.Scene {
  def!: LevelDef; th = Math.PI; ra = 30; fuel = 9; burns = 0; wasted = 0; g!: Phaser.GameObjects.Graphics; hud!: Phaser.GameObjects.Text; call!: Phaser.GameObjects.Text; ended = false; cool = 0;
  craft!: Phaser.GameObjects.Image; burn!: Phaser.GameObjects.Particles.ParticleEmitter; bar!: Phaser.GameObjects.Graphics; hf?: HiFi;
  constructor() { super('OrbitRaise'); }
  init(d: { def: LevelDef }) { this.def = d.def; this.th = Math.PI; this.ra = 30; this.fuel = 9; this.burns = 0; this.wasted = 0; this.ended = false; this.cool = 0; }
  create() {
    cam(this);
    stopLoops(); music.play('space');
    this.cameras.main.setBackgroundColor('#04050c');
    const hf = (this.hf = hifi(this, LOOKS[LOOK])), K = (k: string) => (hf ? hf.key(k) : k); // the look redraws space, the Earth and the Moon
    const stars = img(this, 0, 0, K('stars')).setOrigin(0);
    const st = this.add.graphics();
    st.lineStyle(0.5, 0x8fa3c8, 0.5).strokeEllipse(MX + 3, MY + 12, 14, 56); // near-rectilinear halo orbit: a long, thin polar ellipse
    const pan = panel(this, 4, 4, 100, 30);
    this.g = this.add.graphics(); this.bar = hf ? this.add.graphics() : this.g; // in hi-fi the orbit glows in the world and the apogee bar stays on the HUD
    const earth = img(this, EX, EY, K('earth')).setScale(S * 0.85);
    const moon = img(this, MX, MY, K('moon')).setScale(S * 0.9);
    const names = [T(this, MX - 16, MY - 4, 'MOON', '#aab4d4', 6, '700').setOrigin(1, 0), T(this, MX + 14, MY + 34, 'NRHO', '#8fa3c8', 4.5, '700')];
    this.burn = this.add.particles(0, 0, 'puff', { speed: { min: 10, max: 60 }, lifespan: 420, scale: { start: S * 0.45, end: 0 }, color: [0xffffff, 0xb8dcff, 0x6fa8ff], blendMode: 'ADD', emitting: false });
    this.craft = img(this, 0, 0, 'curie').setScale(S * 0.9);
    const worldN = this.children.length; // everything from here on is HUD
    this.hud = T(this, 9, 6.5, '', '#ffffff', 7, '700'); T(this, 9, 17, 'APOGEE', '#aab4d4', 5.2, '700');
    who(this, { ...this.def, role: this.def.role || 'CEO · in Mission Control' }, 4, 38);
    this.call = T(this, W / 2, H - 10, 'SPACE in the green zone = perigee burn', '#ffe98a', 8, '700').setOrigin(0.5).setShadow(0, 1, '#000000', 3);
    if (hf) { hf.shade(this.craft, 2, 2); hf.tag({ stars, orbit: this.g, earth, moon, craft: this.craft, burn: this.burn }); hf.set({ x: 0, y: 0, rot: 0, fired: 0, done: 0 }); hf.ready({ hud: [pan, this.bar, ...names, ...this.children.list.slice(worldN)] }); }
  }
  pos(th: number, ra = this.ra) {
    const a = (ra + RP) / 2, e = (ra - RP) / (ra + RP);
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(th)); // th = 0 at perigee
    const ang = AXIS + Math.PI + th;
    return { x: EX + r * Math.cos(ang), y: EY + r * Math.sin(ang) };
  }
  update(_t: number, dms: number) {
    if (this.ended) return;
    const dt = Math.min(0.05, dms / 1000);
    const e = (this.ra - RP) / (this.ra + RP);
    this.th += dt * 1.25 * (0.55 + (1 + e * Math.cos(this.th)));
    if (this.th > Math.PI) this.th -= Math.PI * 2;
    this.cool -= dt;
    const off = Math.abs(this.th);
    const p = this.pos(this.th), p2 = this.pos(this.th + 0.05);
    if ((just('a') || (AUTO && off < 0.1)) && this.cool <= 0 && this.fuel > 0) {
      this.fuel--; this.cool = 0.6;
      if (off < WIN) {
        const q = 1 - off / WIN; this.burns++; this.ra *= 1 + 0.2 + 0.4 * q; this.burn.explode(16, p.x, p.y); this.cameras.main.shake(120, 0.002);
        snd.burn(q); this.call.setText(q > 0.75 ? 'HyperCurie burn: perfect' : q > 0.4 ? 'HyperCurie burn: good' : 'HyperCurie burn: weak');
      } else { this.wasted++; snd.dud(); this.call.setText('Wasted burn. Wait for perigee'); }
    }
    const g = this.g; g.clear();
    g.lineStyle(0.6, 0x8fa3c8, 0.85); g.beginPath();
    for (let i = 0; i <= 96; i++) { const q = this.pos((i / 96) * Math.PI * 2 - Math.PI); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }
    g.strokePath();
    g.lineStyle(2.4, P.lgreen, 0.9); g.beginPath();
    for (let i = 0; i <= 10; i++) { const q = this.pos(-WIN + (i / 10) * WIN * 2); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }
    g.strokePath();
    this.craft.setPosition(p.x, p.y).setRotation(Math.atan2(p2.y - p.y, p2.x - p.x) + Math.PI / 2);
    const b = this.bar; if (b !== g) b.clear();
    b.fillStyle(0x000000, 0.5).fillRoundedRect(9, 24, 90, 5, 2.5); const w = 90 * Math.min(1, (this.ra - 30) / (TARGET - 30)); if (w > 1) b.fillStyle(P.lgreen).fillRoundedRect(9, 24, Math.max(5, w), 5, 2.5);
    this.hf?.set({ x: p.x, y: p.y, rot: this.craft.rotation, fired: this.burns + this.wasted });
    this.hud.setText(`BURNS LEFT  ${this.fuel}`);
    if (this.ra >= TARGET) {
      this.ended = true; this.call.setText('TLI complete. CAPSTONE released');
      const sat = this.add.rectangle(p.x, p.y, 2, 2, 0xffffff).setStrokeStyle(0.3, 0xffe98a);
      this.tweens.add({ targets: sat, x: MX + 9, y: MY - 6, duration: 1800, ease: 'Sine.easeInOut' }); this.hf?.tag({ sat }); this.hf?.set({ done: 1 });
      snd.seco();
      const stars = this.wasted === 0 && this.burns <= 6 ? 3 : this.fuel >= 1 ? 2 : 1;
      this.time.delayedCall(2100, () => finish(this, this.def, { success: true, stars, egg: this.wasted === 0, title: 'On the way to the Moon', text: `${this.burns} perigee burns stretched the orbit all the way out. Photon lets go, CAPSTONE coasts toward its halo orbit, and Photon carries on to a lunar flyby of its own.` }));
    } else if (this.fuel <= 0 && this.cool <= 0) {
      this.ended = true; finish(this, this.def, { success: false, title: 'Out of propellant', text: 'The orbit never reached the Moon. Only burn inside the green perigee zone, as close to its centre as you can.' });
    }
  }
}
