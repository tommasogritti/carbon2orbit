import Phaser from 'phaser';
import { W, H, T, just, img, cam, hotkeys, overlayOpen } from '../core';
import { S } from '../art';
import { music, stopLoops, snd } from '../audio';
import { VERSION, SEASON } from '../version';
import { tally, showBoard } from '../leaderboard';

/** The title screen: the whole canvas, an Electron climbing past the Earth's limb, and the way in. */
export class TitleScene extends Phaser.Scene {
  rocket!: Phaser.GameObjects.Container; flame!: Phaser.GameObjects.Particles.ParticleEmitter; smoke!: Phaser.GameObjects.Particles.ParticleEmitter; t = 0; leaving = false;
  constructor() { super('Title'); }
  create() {
    cam(this); this.t = 0; this.leaving = false;
    stopLoops(); music.play('map');
    img(this, 0, 0, 'sky_night').setOrigin(0);
    const stars = img(this, 0, 0, 'stars').setOrigin(0);
    this.tweens.add({ targets: stars, alpha: 0.72, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // a soft glow behind the name, and the Earth's limb along the bottom
    img(this, W / 2 + 6, 62, 'puff').setScale(S * 22, S * 9).setTint(0x3f7fd0).setAlpha(0.3).setBlendMode('ADD');
    const earth = img(this, W / 2, 118, 'earthlimb').setOrigin(0.5, 0);
    this.tweens.add({ targets: earth, x: W / 2 - 14, duration: 30000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // the Humanity Star, flashing across the top
    const hs = img(this, -12, 26, 'puff').setScale(S * 0.5).setBlendMode('ADD');
    this.tweens.add({ targets: hs, x: W + 12, y: 12, duration: 11000, repeat: -1, repeatDelay: 5000 });
    this.tweens.add({ targets: hs, alpha: 0.1, duration: 280, yoyo: true, repeat: -1 });
    // an Electron on its way up: smoke trail, flame, and a rim of light so the carbon black reads against the night
    this.smoke = this.add.particles(0, 0, 'puff', { speed: { min: 6, max: 20 }, angle: { min: 96, max: 132 }, lifespan: { min: 2200, max: 3800 }, scale: { start: S * 0.7, end: S * 4.2 }, alpha: { start: 0.34, end: 0 }, tint: 0xb8c6e6, frequency: 26 });
    this.flame = this.add.particles(0, 0, 'puff', { speed: { min: 60, max: 120 }, angle: { min: 108, max: 120 }, lifespan: { min: 260, max: 520 }, scale: { start: S * 0.85, end: S * 0.15 }, color: [0xffffff, 0xfff0b0, 0xffb347, 0xff5a1f, 0x7a2408], alpha: { start: 1, end: 0 }, blendMode: 'ADD', frequency: 8, quantity: 2 });
    const rim = img(this, 0, -40, 'puff').setScale(S * 2.6, S * 6).setTint(0x7fb4ff).setAlpha(0.32).setBlendMode('ADD');
    this.rocket = this.add.container(0, 0, [rim, img(this, 0, 0, 'electron_full').setOrigin(0.5, 1)]).setRotation(24 * Math.PI / 180);
    this.fly();
    // the name
    T(this, W / 2, 30, 'AN UNOFFICIAL ROCKET LAB FAN GAME', '#ffe98a', 6, '700').setOrigin(0.5).setLetterSpacing(1.6).setShadow(0, 1, '#000000', 4);
    const name = T(this, W / 2, 55, 'CARBON TO ORBIT', '#ffffff', 31, '700').setOrigin(0.5).setLetterSpacing(1).setShadow(0, 2, '#020409', 10);
    const grad = name.context.createLinearGradient(0, 0, 0, name.height);
    grad.addColorStop(0.15, '#ffffff'); grad.addColorStop(0.6, '#ffe98a'); grad.addColorStop(1, '#ff8a3c');
    name.setFill(grad as unknown as string);
    name.setAlpha(0).setScale(1.06); this.tweens.add({ targets: name, alpha: 1, scale: 1, duration: 900, ease: 'Cubic.easeOut' });
    const arc = this.add.graphics(); const AR = 520, a0 = -Math.PI / 2 - 0.2, a1 = -Math.PI / 2 + 0.2; arc.lineStyle(0.7, 0xffe98a, 0.85).beginPath().arc(W / 2, 73 + AR, AR, a0, a1).strokePath(); arc.fillStyle(0xffffff).fillCircle(W / 2 + AR * Math.cos(a1), 73 + AR + AR * Math.sin(a1), 1.5);
    T(this, W / 2, 92, 'The story of Rocket Lab, one level at a time', '#ffffff', 8.6, '600').setOrigin(0.5).setShadow(0, 1, '#000000', 4);
    T(this, W / 2, 102.5, 'From a rocket bike in a Dunedin workshop to the hundredth Electron, and on to Neutron', '#b8c6e6', 5.4).setOrigin(0.5).setShadow(0, 1, '#000000', 3);
    // what is inside
    const kinds: [string, string][] = [['n_platform', 'PLATFORM'], ['n_launch', 'LAUNCH CONTROL'], ['n_minigame', 'MINI-GAMES'], ['n_card', 'STORY']];
    let x = 62;
    for (const [key, label] of kinds) { img(this, x, 117, key).setScale(S * 0.8); const l = T(this, x + 8, 117, label, '#dfe6f7', 5.2, '700').setOrigin(0, 0.5).setShadow(0, 1, '#000000', 3); x += 8 + l.width + 12; }
    // the way in
    const t = tally();
    const go = T(this, W / 2, 139, t.levels ? 'PRESS ENTER TO CONTINUE' : 'PRESS ENTER TO START', '#ffffff', 11.5, '700').setOrigin(0.5).setLetterSpacing(0.6).setShadow(0, 1, '#000000', 5);
    this.tweens.add({ targets: go, alpha: 0.25, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    T(this, W / 2, 151, t.levels ? `${t.levels} of ${t.of} levels played · ${t.score.toLocaleString('en-NZ')} points` : `${t.of} levels across thirty years`, '#ffe98a', 6).setOrigin(0.5).setShadow(0, 1, '#000000', 3);
    T(this, 6, H - 5, `v${VERSION} · season ${SEASON}`, '#8fa3c8', 4.8, '700').setOrigin(0, 1).setShadow(0, 1, '#000000', 3);
    T(this, W / 2, H - 5, 'H controls   L leaderboard   F full screen   M sound', '#b8c6e6', 4.8, '700').setOrigin(0.5, 1).setShadow(0, 1, '#000000', 3);
    T(this, W - 6, H - 5, 'Not affiliated with Rocket Lab', '#8fa3c8', 4.8, '700').setOrigin(1, 1).setShadow(0, 1, '#000000', 3);
    hotkeys.KeyL = () => showBoard();
    this.events.once('shutdown', () => { hotkeys.KeyL = undefined; });
    this.input.on('pointerdown', () => this.start());
  }
  /** One climb, bottom-left to top-right, then again after a pause. */
  fly() {
    this.rocket.setPosition(20, H + 86).setAlpha(1);
    this.tweens.add({ targets: this.rocket, x: 152, y: -30, duration: 15000, ease: 'Quad.easeIn', onComplete: () => this.time.delayedCall(3500, () => this.fly()) });
  }
  help() { return { title: 'Title screen', rows: [['Enter', 'Start, or carry on where you left off'], ['L', 'Your score and the leaderboard'], ['F', 'Full screen on or off']] as [string, string][] }; }
  start() {
    if (this.leaving || overlayOpen()) return;
    this.leaving = true; snd.select();
    this.cameras.main.fadeOut(350, 5, 6, 12);
    this.time.delayedCall(360, () => this.scene.start('Map', { title: tally().levels === 0 }));
  }
  update() {
    const r = this.rocket, on = r.y > -20 && r.y < H + 70;
    this.flame.setPosition(r.x, r.y); this.smoke.setPosition(r.x, r.y); this.flame.emitting = on; this.smoke.emitting = on;
    if (just('a') || just('b')) this.start();
  }
}
