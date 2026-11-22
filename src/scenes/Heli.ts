import Phaser from 'phaser';
import { W, H, T, held, finish, cam, img, panel, who } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import { P, S } from '../art';
import type { LevelDef } from '../content';
import { hifi, HiFi } from '../hifi';
import { LOOKS } from '../hifiLooks';

const AUTO = new URLSearchParams(location.search).has('auto');
const MISS_Y = 98, SEA_Y = 112;
const LOOK = 'catch'; // the hi-fi look (looks/catch.ts)
/** There And Back Again: hook the parachute line of a falling Electron booster. */
export class HeliScene extends Phaser.Scene {
  def!: LevelDef; heli!: Phaser.GameObjects.Container; rotor!: Phaser.GameObjects.Image; hv = { x: 0, y: 0 };
  boo!: Phaser.GameObjects.Container; bt = 0; pass = 1; state: 'fall' | 'caught' | 'released' | 'missed' | 'over' = 'fall'; phase0 = 0;
  g!: Phaser.GameObjects.Graphics; call!: Phaser.GameObjects.Text; hud!: Phaser.GameObjects.Text; timer = 0; splash!: Phaser.GameObjects.Particles.ParticleEmitter; wet = false; rotorS!: Loop; hf?: HiFi;
  constructor() { super('Heli'); }
  init(d: { def: LevelDef }) { this.def = d.def; this.pass = 1; this.state = 'fall'; this.bt = 0; this.hv = { x: 0, y: 0 }; this.timer = 0; this.wet = false; }
  create() {
    cam(this);
    stopLoops(); music.play('heli'); this.rotorS = loop('rotor'); loop('sea').set(0.5);
    const hf = (this.hf = hifi(this, LOOKS[LOOK])), K = (k: string) => (hf ? hf.key(k) : k); // the look redraws the sky, the clouds and the sea
    const sky = img(this, 0, 0, K('sky_day')).setOrigin(0);
    [[40, 34, 2], [200, 58, 1], [120, 84, 3], [280, 96, 3]].forEach(([x, y, k], i) => { const c = img(this, x, y, K('cloud' + k)).setAlpha(0.9); this.tweens.add({ targets: c, x: x + 26, duration: 16000 + i * 5000, yoyo: true, repeat: -1 }); });
    this.g = this.add.graphics();
    const stage = img(this, 0, 20, 'electron_s1').setOrigin(0.5, 0).setScale(S * 0.5);
    const chute = img(this, 0, 0, 'chute').setOrigin(0.5, 0).setScale(S * 0.7);
    this.boo = this.add.container(160, -40, [chute, stage]);
    const sea = img(this, 0, 152, K('sea')).setOrigin(0);
    const ship = img(this, 262, 151, 'ship').setScale(S * 0.8); this.tweens.add({ targets: ship, y: 152.2, angle: 1.2, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.splash = this.add.particles(0, 153, 'puff', { speedY: { min: -90, max: -30 }, speedX: { min: -40, max: 40 }, gravityY: 220, lifespan: 700, scale: { start: S * 0.5, end: S * 0.1 }, alpha: { start: 0.9, end: 0 }, emitting: false });
    this.rotor = img(this, -1.5, -9.6, 'rotor').setScale(S * 0.8, S);
    const body = img(this, 0, 0, 'heli').setScale(S * 0.75);
    this.heli = this.add.container(60, 60, [body, this.rotor]);
    const worldN = this.children.length; // everything from here on is HUD
    panel(this, 4, 4, 56, 14); this.hud = T(this, 9, 6.5, '', '#ffffff', 7, '700');
    this.call = T(this, W / 2, H - 9, 'Hook the line above the parachute', '#ffffff', 8, '700').setOrigin(0.5).setShadow(0, 1, '#000000', 3);
    who(this, { ...this.def, role: this.def.role || 'CEO · in Mission Control' }, W - 104, 4);
    this.newPass();
    if (hf) { hf.shade(stage, 3, 2); hf.shade(chute); hf.shade(ship); hf.shade(body, 4, 2); hf.tag({ sky, sea, ship, boo: this.boo, heli: this.heli }); hf.set({ caught: 0, wet: 0, bx: 160, kx: 0, ky: 0 }); hf.ready({ hud: this.children.list.slice(worldN) }); }
  }
  newPass() { this.state = 'fall'; this.bt = 0; this.wet = false; this.phase0 = Math.random() * 6; this.boo.setPosition(160, -50).setAngle(0); this.hud.setText(`PASS ${this.pass} / 3`); }
  boosterX(t: number) { return 160 + 85 * Math.sin(t * 0.55 + this.phase0) + 18 * Math.sin(t * 1.7); }
  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    this.rotor.scaleX = S * (0.5 + Math.abs(Math.sin(this.time.now / 28)) * 0.45);
    this.rotorS.set(0.9, Math.min(1, Math.hypot(this.hv.x, this.hv.y) / 120));
    if (this.state === 'over') return;
    // helicopter
    let ix = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), iy = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
    const hook = { x: this.heli.x, y: this.heli.y + 34 };
    const line = { x: this.boo.x, y: this.boo.y - 14 };
    if (AUTO && this.state === 'fall') { ix = Math.sign(line.x - hook.x) * (Math.abs(line.x - hook.x) > 3 ? 1 : 0); iy = Math.sign(line.y + 8 - hook.y) * (Math.abs(line.y + 8 - hook.y) > 3 ? 1 : 0); }
    this.hv.x += (ix * 130 - this.hv.x) * 4 * dt; this.hv.y += (iy * 90 - this.hv.y) * 4 * dt;
    this.heli.x = Phaser.Math.Clamp(this.heli.x + this.hv.x * dt, 24, W - 24);
    this.heli.y = Phaser.Math.Clamp(this.heli.y + this.hv.y * dt, 16, 96);
    const face = this.hv.x < -5 ? -1 : this.hv.x > 5 ? 1 : this.heli.scaleX;
    this.heli.setAngle(this.hv.x * 0.07).setScale(face, 1);
    // booster
    this.bt += dt;
    if (this.state === 'fall') {
      this.boo.setPosition(this.boosterX(this.bt), -50 + this.bt * (15 + this.pass * 2)).setAngle(Math.sin(this.bt * 2) * 3);
      if (Math.hypot(hook.x - line.x, hook.y - (line.y + 6)) < 9 && this.bt > 1) {
        this.state = 'caught'; this.timer = 0; snd.clank(); this.call.setText('CAPTURE! Nearly a tonne on the hook');
      } else if (this.boo.y > MISS_Y) { this.state = 'missed'; this.timer = 0; this.call.setText('Missed it. Splashdown'); snd.dud(); }
    } else if (this.state === 'caught') {
      this.timer += dt; this.boo.setPosition(Phaser.Math.Linear(this.boo.x, hook.x, 0.3), hook.y + 14); this.boo.setAngle(Math.sin(this.timer * 9) * (4 + this.timer * 5));
      if (this.timer > 1.2) this.call.setText('Load is swinging oddly… release!');
      if (this.timer > 2.4) { this.state = 'released'; this.timer = 0; }
    } else {
      this.timer += dt; this.boo.y = Math.min(SEA_Y, this.boo.y + 26 * dt); this.boo.setAngle(0);
      if (this.boo.y >= SEA_Y && !this.wet) { this.wet = true; this.splash.explode(26, this.boo.x, 153); snd.splash(); }
      if (this.boo.y >= SEA_Y && this.timer > 1.2) {
        if (this.state === 'released') {
          this.state = 'over'; const stars = 4 - this.pass;
          finish(this, this.def, { success: true, stars, egg: this.pass === 1, title: 'Caught a rocket in mid-air', text: `Hooked on pass ${this.pass}. The crew let it go for safety and the recovery ship is hauling it aboard.` });
        } else if (this.pass >= 3) { this.state = 'over'; finish(this, this.def, { success: false, title: 'Three misses', text: 'The booster is in the water without a catch. Tip: get underneath early and climb to meet the line rather than chasing it sideways.' }); }
        else { this.pass++; this.newPass(); this.call.setText('It is still falling. Come around again'); }
      }
    }
    this.hf?.set({ caught: this.state === 'caught' ? 1 : 0, wet: this.wet ? 1 : 0, bx: this.boo.x, kx: hook.x, ky: hook.y });
    const g = this.g; g.clear();
    g.lineStyle(0.5, 0x10131c).lineBetween(this.heli.x, this.heli.y + 8, hook.x, hook.y);
    g.lineStyle(1, P.yellow).beginPath().arc(hook.x, hook.y, 1.8, 0, Math.PI, false).strokePath();
    if (this.state !== 'caught') { g.lineStyle(0.4, 0x3a3f4f).lineBetween(this.boo.x, this.boo.y + 1, line.x, line.y - 8); g.fillStyle(P.orange).fillEllipse(line.x, line.y - 9.5, 7, 3.4); g.lineStyle(0.3, 0x10131c).strokeEllipse(line.x, line.y - 9.5, 7, 3.4); }
    if (this.state === 'fall') { g.lineStyle(0.6, P.lgreen, 0.9).strokeCircle(line.x, line.y + 6, 9); }
  }
}
