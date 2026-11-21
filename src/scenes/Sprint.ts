import Phaser from 'phaser';
import { W, H, T, held, finish, cam, img, panel, who, hero } from '../core';
import { D, P, S } from '../art';
import type { LevelDef } from '../content';
import { snd, music, stopLoops, loop, Loop } from '../audio';

const AUTO = new URLSearchParams(location.search).has('auto');
const COURSE = 330; // metres to the chequered flag
const PPM = 6; // world units per metre

/** Secret level: the rocket bike's street sprint. Open the valve, keep it upright, beat the sports car. */
export class SprintScene extends Phaser.Scene {
  def!: LevelDef; v = 0; dist = 0; fuel = 1; w = 0; wv = 0; top = 0; rival = 0; rv = 0; t = 0; go = 2.6; ended = false; steerHeld = 0;
  street!: Phaser.GameObjects.TileSprite; bike!: Phaser.GameObjects.Container; car!: Phaser.GameObjects.Image; flag!: Phaser.GameObjects.Image; steam!: Phaser.GameObjects.Particles.ParticleEmitter;
  hud!: Phaser.GameObjects.Text; big!: Phaser.GameObjects.Text; call!: Phaser.GameObjects.Text; g!: Phaser.GameObjects.Graphics; hiss!: Loop; roar!: Loop;
  constructor() { super('Sprint'); }
  init(d: { def: LevelDef }) { this.def = d.def; this.v = 0; this.dist = 0; this.fuel = 1; this.w = 0; this.wv = 0; this.top = 0; this.rival = 0; this.rv = 0; this.t = 0; this.go = 2.6; this.ended = false; }
  create() {
    cam(this);
    stopLoops(); music.play('heli'); this.hiss = loop('hiss'); this.roar = loop('rumble');
    this.street = this.add.tileSprite(0, 0, W * D, H * D, 'street').setOrigin(0).setScale(S);
    this.flag = img(this, 0, 150, 'finish').setOrigin(0.5, 1);
    this.car = img(this, 70, 147, 'viper').setOrigin(0.5, 1).setScale(S * 0.9);
    this.steam = this.add.particles(0, 0, 'puff', { speedX: { min: -190, max: -110 }, speedY: { min: -14, max: 14 }, lifespan: { min: 300, max: 600 }, scale: { start: S * 0.5, end: S * 2.2 }, alpha: { start: 0.9, end: 0 }, frequency: 12, quantity: 2, emitting: false });
    const rider = img(this, -1, -13, hero(this.def, true).pre + 'Speter0').setAngle(78); // lying along the frame, in the suit and helmet
    this.bike = this.add.container(92, 168, [img(this, 0, 0, 'bike').setOrigin(0.5, 1), rider]);
    panel(this, 4, 4, 92, 40);
    this.big = T(this, 9, 6, '0 km/h', '#ffe98a', 12, '700');
    this.hud = T(this, 9, 23, '', '#ffffff', 6);
    this.g = this.add.graphics();
    T(this, W / 2, 54, 'BALANCE', '#aab4d4', 5, '700').setOrigin(0.5);
    this.call = T(this, W / 2, H - 9, 'Get ready…', '#ffe98a', 8, '700').setOrigin(0.5).setShadow(0, 1, '#000000', 3);
    who(this, this.def, W - 104, 4, true);
  }
  update(_t: number, dms: number) {
    if (this.ended) return;
    const dt = Math.min(0.05, dms / 1000);
    this.t += dt;
    if (this.go > 0) { // start lights
      const before = Math.ceil(this.go); this.go -= dt;
      if (Math.ceil(this.go) !== before && this.go > 0) snd.count();
      if (this.go <= 0) { snd.liftoff(); this.call.setText('Hold SPACE: open the valve!'); }
      return this.draw(false);
    }
    const thrust = (AUTO || held('a')) && this.fuel > 0;
    let steer = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
    if (AUTO) steer = Math.abs(this.w + this.wv * 0.35) < 0.05 ? 0 : -Math.sign(this.w + this.wv * 0.35);
    // straight-line physics: about 13 m/s² on the valve, a little drag, a tank that lasts under four seconds
    this.v = Math.max(0, this.v + ((thrust ? 13 : 0) - 0.0016 * this.v * this.v - 0.4) * dt);
    if (thrust) this.fuel = Math.max(0, this.fuel - dt / 3.8);
    this.dist += this.v * dt; this.top = Math.max(this.top, this.v);
    // the wobble: an upside-down pendulum that gets twitchier with speed
    const twitch = 1.0 + this.v / 20;
    this.wv += (twitch * 2.2 * this.w + steer * 7.5 + (Math.random() - 0.5) * (1.5 + this.v / 9)) * dt; this.wv *= 1 - 1.4 * dt;
    this.w += this.wv * dt;
    // the sports car: quick, but not rocket quick
    this.rv = Math.min(52, this.rv + (this.rv < 28 ? 6.2 : 2.6) * dt); this.rival += this.rv * dt;
    if (thrust && this.fuel <= 0) this.call.setText('Tank empty: hold it steady to the flag');
    else if (thrust && this.v > 30 && this.call.text.startsWith('Hold')) this.call.setText('Left / Right to stay upright!');
    if (Math.abs(this.w) > 1) return this.crash();
    if (this.dist >= COURSE) return this.done();
    this.draw(thrust);
  }
  draw(thrust: boolean) {
    const kmh = this.v * 3.6;
    this.street.tilePositionX = this.dist * PPM * D;
    this.flag.x = 92 + (COURSE - this.dist) * PPM; this.flag.setVisible(this.flag.x < W + 40);
    this.car.x = 70 + (this.rival - this.dist) * PPM; this.car.setVisible(this.car.x > -40 && this.car.x < W + 40);
    this.bike.setRotation(this.w * 0.3).setY(168 + Math.sin(this.t * 40) * Math.min(0.5, this.v / 60));
    this.steam.emitting = thrust; this.steam.setPosition(this.bike.x - 21, this.bike.y - 12);
    this.hiss.set(thrust ? 1 : 0); this.roar.set(thrust ? 0.5 : Math.min(0.3, this.v / 120), 0.5);
    this.big.setText(`${kmh.toFixed(0)} km/h`);
    this.hud.setText(`TOP  ${(this.top * 3.6).toFixed(0)} km/h\nFLAG ${Math.max(0, COURSE - this.dist).toFixed(0)} m`);
    const g = this.g; g.clear();
    g.fillStyle(0x000000, 0.5).fillRoundedRect(9, 37.5, 82, 3.4, 1.7); const fw = 82 * this.fuel; if (fw > 1) g.fillStyle(0x7fd0ff).fillRoundedRect(9, 37.5, Math.max(3.4, fw), 3.4, 1.7);
    g.fillStyle(0x0b0e18, 0.75).fillRoundedRect(W / 2 - 62, 58, 124, 9, 4.5); g.fillStyle(P.green, 0.8).fillRoundedRect(W / 2 - 14, 60, 28, 5, 2.5);
    g.fillStyle(P.red, 0.8).fillRoundedRect(W / 2 - 60, 60, 8, 5, 2.5).fillRoundedRect(W / 2 + 52, 60, 8, 5, 2.5);
    g.fillStyle(0xffffff).fillRoundedRect(W / 2 + Phaser.Math.Clamp(this.w, -1, 1) * 58 - 1.2, 57, 2.4, 11, 1.2);
  }
  crash() {
    this.ended = true; snd.crash(); this.cameras.main.shake(400, 0.012); this.steam.emitting = false;
    this.tweens.add({ targets: this.bike, angle: this.w > 0 ? 100 : -100, x: this.bike.x + 40, duration: 500 });
    this.time.delayedCall(900, () => finish(this, this.def, { success: false, title: 'Speed wobble', text: `Down at ${(this.v * 3.6).toFixed(0)} km/h. Small, early taps keep the needle in the green; ease off the valve if it gets away from you.` }));
  }
  done() {
    this.ended = true; this.steam.emitting = false;
    const top = this.top * 3.6, won = this.dist > this.rival;
    const stars = top >= 140 ? 3 : top >= 115 ? 2 : 1;
    this.call.setText(won ? 'Chequered flag: ahead of the sports car!' : 'Chequered flag!');
    this.time.delayedCall(700, () => finish(this, this.def, { success: true, stars, title: `${top.toFixed(0)} km/h on a bicycle`, text: `Top speed ${top.toFixed(0)} km/h, upright the whole way${won ? ', and the red sports car is still coming' : '; the sports car got there first this time'}.` }));
  }
}
