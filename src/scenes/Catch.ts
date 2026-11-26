import Phaser from 'phaser';
import { W, H, T, held, finish, cam, hero, xgOn, SCENE_FOR } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import type { LevelDef } from '../content';
import { can3d, getEngine, Engine, Frame, V3, norm } from '../gfx3d/engine';
import { Score } from '../gfx3d/score';

const AUTO = new URLSearchParams(location.search).has('auto');
const RAD = Math.PI / 180, clamp = Phaser.Math.Clamp, lerp = Phaser.Math.Linear;
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const SUN: V3 = norm([-0.32, 0.643, -0.69]);
const CABLE = 46, RUN = 900, WIN = 8, TOL_X = 2.6, TOL_Y = 4, SINK = 11; // metres: the line under the helicopter, the run-in, how near the hook must pass; m/s: how fast the stage comes down

/**
 * A mid-air catch in three dimensions, drawn by the game's own renderer (src/gfx3d): this scene is the rules, the keys
 * and the clock. A stage comes down under its main parachute with the drogue still flying above it; the helicopter runs
 * in from far astern and well below, and the player flies the hook, on a long line, to where the drogue's line will be when
 * they meet: an estimate is marked on the picture, and it wanders with the gusts until the last seconds. Three
 * passes; the load swings oddly, the crew lets it go, and it comes down in the sea for the ship.
 * The rules are the `heli-catch` level's (spec §10.2); in SD or HD graphics, or without WebGL2, `params.fallback` plays instead.
 */
export class CatchScene extends Phaser.Scene {
  def!: LevelDef; pass = 1; state: 'run' | 'caught' | 'away' | 'missed' | 'drop' | 'down' | 'over' = 'run'; win = false; bt = 0; t = 0; timer = 0; phase0 = 0;
  ex = 0; ey = 0; vx = 0; vy = 0; z = RUN; h = 1900; sink = SINK; tSplash = -1; callText = ''; rotor = 0; flash = 0; warp = 1; swing = 0; up = 0;
  camP: V3 = [0, 0, 0]; camL: V3 = [0, 0, 0]; fov = 56; orbit = 0; fresh = true;
  eng?: Engine; box?: HTMLDivElement; hudC?: HTMLCanvasElement; rotorS!: Loop; sea!: Loop; score?: Score; ready = false; idle = 0; fdt = 1 / 60; lastP = -1; settle = false;
  constructor() { super('Catch'); }
  help(): { title: string; rows: [keys: string, does: string][]; note?: string } {
    return { title: 'Helicopter catch', rows: [['← →', 'Fly the hook left and right'], ['↑ ↓', 'Fly it up and down']], note: 'The helicopter runs in by itself, from below: the stage comes down to you. The green ring is the estimate of where its line will be when you arrive; the yellow cross is where your hook will pass. Put the cross in the ring early, then trim as the estimate settles. You get three passes.' };
  }
  init(d: { def: LevelDef }) { this.def = d.def; Object.assign(this, { pass: 1, state: 'run', win: false, bt: 0, t: 0, timer: 0, vx: 0, vy: 0, h: 1900, tSplash: -1, callText: 'It is coming down to you · fly the hook to the estimate', rotor: 0, flash: 0, warp: 1, swing: 0, up: 0, orbit: 0, fresh: true, ready: false, idle: 0, phase0: Math.random() * 6 }); this.newPass(); }
  create() {
    const fb = SCENE_FOR[this.def.params?.fallback as string] as string | undefined;
    if (!xgOn() || !can3d()) { if (fb) return void this.scene.start(fb, { def: this.def }); }
    cam(this); stopLoops(); this.cameras.main.setBackgroundColor('#020308');
    const wait = T(this, W / 2, H / 2, 'Building the sky…', '#8fa3c8', 7, '600').setOrigin(0.5);
    this.time.delayedCall(60, () => {
      try { this.eng = getEngine(); } catch (e) { console.error(e); if (fb) return void this.scene.start(fb, { def: this.def }); throw e; }
      wait.destroy(); this.mount();
      music.stop(0.2); this.score = new Score(); this.score.start(); this.rotorS = loop('rotor'); this.sea = loop('sea');
      this.eng.cut(); this.ready = true;
    });
    const draw = () => this.present();
    this.game.events.on('postrender', draw);
    this.events.once('shutdown', () => { this.game.events.off('postrender', draw); this.box?.remove(); this.box = undefined; this.ready = false; this.score?.stop(); this.score = undefined; });
  }
  mount() {
    const box = (this.box = document.createElement('div')); box.id = 'gfx3d';
    box.style.cssText = 'position:absolute;z-index:3;pointer-events:none;overflow:hidden';
    const hud = (this.hudC = document.createElement('canvas'));
    for (const c of [this.eng!.canvas, hud]) { c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'; box.appendChild(c); }
    document.getElementById('stage')!.appendChild(box); this.fit();
  }
  fit() {
    const box = this.box!, r = this.game.canvas.getBoundingClientRect(), s = document.getElementById('stage')!.getBoundingClientRect();
    const key = `${r.left - s.left}|${r.top - s.top}|${r.width}|${r.height}`;
    if (box.dataset.k === key) return;
    box.dataset.k = key; Object.assign(box.style, { left: r.left - s.left + 'px', top: r.top - s.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    const dpr = Math.min(window.devicePixelRatio || 1, 2), k = Math.min(1, 2560 / Math.max(1, r.width * dpr)), w = Math.max(320, r.width * dpr * k), h = Math.max(180, r.height * dpr * k);
    this.eng!.resize(w, h); this.hudC!.width = Math.round(w); this.hudC!.height = Math.round(h);
  }
  /** Where the stage is, from the helicopter's line of approach: it drifts and swings under its parachute. */
  sway(t: number): [number, number] { return [14 * Math.sin(t * 0.55 + this.phase0) + 3 * Math.sin(t * 1.7), 2.5 * Math.sin(t * 0.8 + this.phase0)]; }
  /** How fast the helicopter closes, m/s, at `z` metres to go: quick at first, slow at the end. */
  closing(z: number) { return lerp(62, 16, sstep(0, 1, 1 - z / RUN)) * (1 + 0.1 * (this.pass - 1)); }
  /** Seconds until the helicopter reaches the stage. */
  ttg(z = this.z) { if (z <= 0) return 0; let T = 0; for (let i = 0; i < 32; i++) T += z / 32 / this.closing((z * (i + 0.5)) / 32); return T; }
  /** How fast the stage is coming down now: the parachute's rate, and the gusts. */
  sinkAt(t: number) { return SINK + 3 * Math.sin(t * 0.5 + this.phase0 * 1.3) + 1.2 * Math.sin(t * 1.3 + this.phase0); }
  /**
   * The estimate a crew would work to: where the line will be on arrival if the stage keeps its present rate of descent and
   * drifts back to the middle of its sway. Returns how far the line will have moved ([across, up], metres) and the hook's miss.
   */
  pred() { const T = this.ttg(), w = sstep(1, 7, T), dx = -this.sway(this.bt)[0] * w, dy = -this.sink * T; return { T, dx, dy, mx: this.ex - dx, my: this.ey - dy }; }
  newPass() {
    this.state = 'run'; this.bt = 0; this.z = RUN; this.phase0 = Math.random() * 6; this.sink = this.sinkAt(0); this.vx = this.vy = 0; this.fresh = true;
    const side = Math.random() < 0.5 ? -1 : 1, hi = Math.random() < 0.5 ? -1 : 1;
    this.ex = side * (24 + Math.random() * 12); this.ey = -SINK * this.ttg(RUN) + hi * (22 + Math.random() * 16); this.eng?.cut();
  }
  update(_t: number, dms: number) {
    if (!this.ready) return;
    const dt = Math.min(0.05, dms / 1000); this.t += dt; this.bt += dt; this.timer += dt; this.rotor += dt * 27; this.flash = Math.max(0, this.flash - dt * 2.5);
    if (this.tSplash >= 0) this.tSplash += dt;
    if (this.state === 'over') return;
    const st = this.state, flying = st === 'run' || st === 'caught' || st === 'missed' || st === 'away';
    // the helicopter: the player flies the hook across and up and down; the run-in is the pilot's
    let ix = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), iy = (held('up') ? 1 : 0) - (held('down') ? 1 : 0);
    const [sx0, sy0] = this.sway(this.bt), [sx1, sy1] = this.sway(this.bt + dt), svx = (sx1 - sx0) / dt, svy = (sy1 - sy0) / dt;
    this.sink = flying ? this.sinkAt(this.bt) : SINK;
    if (AUTO && st === 'run') { const e = this.pred(), px = e.mx + (this.vx - svx) * 0.2, py = e.my + this.vy * 0.2; ix = Math.abs(px) > 0.5 ? -Math.sign(px) : 0; iy = Math.abs(py) > 0.6 ? -Math.sign(py) : 0; }
    if (st !== 'run') ix = iy = 0;
    this.vx += (ix * 21 - this.vx) * 4 * dt; this.vy += (iy * 10 - this.vy) * 4 * dt;
    if (st === 'run' || st === 'missed') { this.ex = clamp(this.ex + (this.vx - svx) * dt, -80, 80); this.ey = clamp(this.ey + (this.vy + this.sink - svy) * dt, -520, 160); }
    this.rotorS.set(flying ? 0.9 : Math.max(0, 0.9 - this.timer * 0.3), Math.min(1, Math.hypot(this.vx, this.vy) / 20));
    // the fall goes on all the while; once nobody is flying a pass it is hurried along
    this.warp = flying ? 1 : this.h > 250 ? 34 : 5;
    if (this.tSplash < 0) { this.h -= this.sink * this.warp * dt; if (this.h <= 0) { this.h = 0; this.tSplash = 0; this.timer = 0; this.state = 'down'; snd.splash(); this.score?.set(this.win ? 'down' : 'lost'); this.callText = this.win ? 'Splashdown · the recovery ship is hauling it aboard' : 'In the water, without a catch'; } }
    this.sea.set(this.h < 500 ? 0.5 * (1 - this.h / 500) : 0);
    if (st === 'run') {
      this.z -= this.closing(this.z) * dt;
      if (Math.abs(this.z) < WIN && this.bt > 1 && Math.abs(this.ex) < TOL_X && Math.abs(this.ey) < TOL_Y) { this.state = 'caught'; this.win = true; this.timer = 0; this.flash = 0.3; snd.clank(); this.callText = 'CAPTURE! Nearly a tonne on the hook'; }
      else if (this.z < -WIN) { this.state = 'missed'; this.timer = 0; snd.dud(); this.callText = this.pass >= 3 ? 'Missed it. Splashdown' : 'Missed it'; }
      this.score?.set('drogue', 1 - this.z / RUN);
    } else if (st === 'caught') {
      this.ex = lerp(this.ex, 0, 0.2); this.ey = lerp(this.ey, 0, 0.2); this.z = lerp(this.z, 0, 0.1);
      this.swing = Math.sin(this.timer * 9) * (4 + this.timer * 5); this.score?.set('main', 1);
      if (this.timer > 1.2) this.callText = 'Load is swinging oddly… release!';
      if (this.timer > 2.4) { this.state = 'away'; this.timer = 0; snd.fairing(); this.callText = 'Released · it is back under its own parachute'; }
    } else if (st === 'away' || st === 'missed') {
      this.swing *= 1 - 3 * dt; this.z -= (st === 'away' ? 10 : 22) * dt; this.up += (st === 'away' ? 9 : 5) * dt; this.ex += (st === 'away' ? 6 : 12) * dt * Math.sign(this.ex || 1);
      if (this.timer > (st === 'away' ? 2.4 : 1.7)) {
        if (st === 'missed' && this.pass < 3) { this.pass++; this.up = 0; this.newPass(); this.callText = 'It is still falling. Come around again'; }
        else { this.state = 'drop'; this.timer = 0; this.score?.set('main', 0); this.eng?.cut(); this.fresh = true; }
      }
    } else if (st === 'down' && this.timer > (AUTO ? 1.6 : 4.6)) {
      this.state = 'over';
      if (this.win) finish(this, this.def, { success: true, stars: 4 - this.pass, egg: this.pass === 1, title: 'Caught a rocket in mid-air', text: `Hooked on pass ${this.pass}. The crew let it go for safety and the recovery ship is hauling it aboard.` });
      else finish(this, this.def, { success: false, title: 'Three misses', text: 'The booster is in the water without a catch. Tip: put the yellow cross in the green ring early, then make small corrections as the estimate settles in the last seconds.' });
    }
  }

  // ------------------------------------------------------------------ the picture
  /** Stage, parachutes, helicopter and hook, in metres from the stage's centre. */
  geom() {
    const ts = this.tSplash, down = ts >= 0, tip = down ? sstep(0.5, 3.2, ts) : 0, th = (down ? lerp(0, 84, tip) : this.swing) * RAD;
    const by: V3 = [Math.sin(th), Math.cos(th), 0], bz: V3 = [0, 0, 1], bx = cross(by, bz);
    const sw: V3 = [0.04 * Math.sin(this.t * 1.3), 0, 0.04 * Math.sin(this.t * 1.7 + 1)];
    const chA = norm(down ? [0.5 * tip + 0.1, 1 - tip * 0.8, 0.3 * tip] : [sw[0] + by[0] * 0.5, 1, sw[2]]);
    const top = add(mul(by, 6.1), mul(chA, 31.5)); // a point on the drogue's line
    const hook = add(top, [this.ex, this.ey + this.up, this.z]);
    const slope = this.state === 'run' ? clamp(-this.ey / (Math.max(this.z, 0) + 36), 0, 0.7) : 0; // how steeply the crew looks up at the stage
    const bank = clamp(this.vx * 0.016, -0.4, 0.4), f: V3 = norm([Math.sin(bank * 0.5), -0.05 + 0.4 * slope, -1]), r0 = norm(cross(f, [0, 1, 0])), u0 = cross(r0, f);
    const u: V3 = add(mul(u0, Math.cos(bank)), mul(r0, Math.sin(bank))), r = cross(f, u);
    const heli = add(hook, [this.vx * 0.22, CABLE + this.vy * 0.1, -2 - (this.state === 'run' ? 3 : 0)]);
    const centre = down ? lerp(6, 0.28, sstep(0, 2.6, ts)) - 2.2 * Math.sin(Math.min(ts, 2.2) * 1.43) * Math.exp(-ts * 0.9) + 0.12 * Math.sin(ts * 1.9) : this.h + 6;
    return { bx, by, bz, chA, top, hook, heli, hm: [...f, ...u, ...r], centre, down, ts, slope };
  }
  frame(): Frame {
    const g = this.geom(), st = this.state, withHeli = st === 'run' || st === 'caught' || st === 'away' || st === 'missed';
    // camera: astern of the hook on the run-in, with the helicopter above and the stage ahead; afterwards a wide turn round the stage
    let wantP: V3, wantL: V3, wantF = 56;
    if (withHeli) { const k = sstep(RUN, 0, this.z); wantP = add(g.hook, [11 - 3 * k, 11 - 2 * k, lerp(36, 30, k)]); wantL = add(g.hook, [-2.5, 5.5 - 2 * k + 15 * g.slope, -24]); wantF = 55 + 9 * g.slope; }
    else if (g.down) { const az = (38 + this.orbit) * RAD; wantP = [-6 + Math.sin(az) * 34, 5, Math.cos(az) * 34]; wantL = [-6, 3, 0]; wantF = 44; }
    else { const az = (24 + this.orbit) * RAD, lowK = sstep(500, 120, this.h); wantP = [Math.sin(az) * 58, lerp(-8, 5, lowK), Math.cos(az) * 58]; wantL = [0, lerp(14, 9, lowK), 0]; wantF = 46; }
    const k = this.fresh || this.settle ? 1 : 1 - Math.exp(-this.fdt * (withHeli ? 5 : 1.6));
    if (!this.scene.isPaused() || this.settle || this.fresh) { for (let i = 0; i < 3; i++) { this.camP[i] = lerp(this.camP[i], wantP[i], k); this.camL[i] = lerp(this.camL[i], wantL[i], k); } this.fov = lerp(this.fov, wantF, k); if (!withHeli) this.orbit += this.fdt * (g.down ? 2.2 : 1.4); this.fresh = false; }
    const cam3: V3 = [this.camP[0], Math.max(this.camP[1], 2.2 - g.centre), this.camP[2]];
    const breathe = 1 + 0.012 * Math.sin(this.t * 4.3), caught = st === 'caught';
    let main = caught ? 0.62 + 0.07 * Math.sin(this.t * 23) : breathe; if (g.down) main *= 1 - sstep(0.2, 2.4, g.ts);
    const trail = g.down ? 0 : caught ? 0.3 : st === 'run' || st === 'missed' ? 1 + 0.03 * Math.sin(this.t * 9) : sstep(0, 0.6, this.timer) * 0.9;
    const shipX = lerp(-190, -56, g.down ? sstep(0, 5, g.ts) * 0.5 + 0.5 : 0.5 * (1 - Math.min(this.h, 1500) / 1500));
    return {
      time: this.t, cam: cam3, look: [...this.camL] as V3, fov: this.fov, roll: withHeli ? clamp(this.vx * 0.004, -0.08, 0.08) : -0.04, shake: this.flash * 0.5 + (withHeli ? 0.035 : 0.01),
      alt: g.centre / 1000, travel: [80, 0], drop: g.down ? 0 : this.sink * this.warp, speed: [0, 0],
      sun: SUN, body: [...g.bx, ...g.by, ...g.bz], vel: [0, -1, 0], hot: 0, scorch: 0.9, glow: 0, rcs: [0, 0, 0, 0],
      chuteAxis: g.chA, drogue: 0, main, trail, splash: g.ts, s2: [0, 1, 0, 0], ship: [shipX, -g.centre, -30],
      exposure: 0.27, flash: this.flash, heli: withHeli ? { pos: g.heli, m: g.hm, hook: g.hook, rotor: this.rotor } : undefined,
    };
  }
  present() {
    if (!this.ready || !this.box) return;
    if (this.scene.isPaused()) { if (++this.idle > 40) return; } else this.idle = 0;
    { const now = this.time.now; this.fdt = this.lastP < 0 ? 1 / 60 : Phaser.Math.Clamp((now - this.lastP) / 1000, 0, 0.1); this.lastP = now; } // real seconds since the last picture: the display may refresh at 60 or 120
    this.fit(); const f = this.frame(); this.eng!.render(f); this.hud(f);
  }
  /** Dev: the frame as a JPEG data URL, for the checks that run without a visible tab. */
  shot(q = 0.9) { this.fit(); const f = this.frame(); this.eng!.render(f); this.hud(f); const c = document.createElement('canvas'); c.width = this.eng!.canvas.width; c.height = this.eng!.canvas.height; const x = c.getContext('2d')!; x.drawImage(this.eng!.canvas, 0, 0); x.drawImage(this.hudC!, 0, 0); return c.toDataURL('image/jpeg', q); }

  // ------------------------------------------------------------------ the instruments
  hud(f: Frame) {
    const cv = this.hudC!, c = cv.getContext('2d')!, k = cv.height / 720, g = this.geom(), st = this.state;
    c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, 1280, 720);
    const F = (px: number, w = 600) => `${w} ${px}px "Chakra Petch", system-ui, sans-serif`;
    const txt = (s: string, x: number, y: number, px: number, col: string, al: CanvasTextAlign = 'left', w = 600, sp = 0) => { c.font = F(px, w); c.textAlign = al; (c as any).letterSpacing = sp + 'px'; c.shadowColor = 'rgba(0,0,0,.75)'; c.shadowBlur = 6; c.fillStyle = col; c.fillText(s, x, y); c.shadowBlur = 0; };
    const DIM = 'rgba(205,216,240,.72)', WH = 'rgba(255,255,255,.95)', GR = '#7fe08a', AM = '#ffcf6b';
    { const gr = c.createLinearGradient(0, 0, 0, 170); gr.addColorStop(0, 'rgba(2,5,12,.4)'); gr.addColorStop(1, 'rgba(2,5,12,0)'); c.fillStyle = gr; c.fillRect(0, 0, 1280, 170); const g2 = c.createLinearGradient(0, 720, 0, 600); g2.addColorStop(0, 'rgba(2,5,12,.4)'); g2.addColorStop(1, 'rgba(2,5,12,0)'); c.fillStyle = g2; c.fillRect(0, 600, 1280, 120); }
    const phase = st === 'run' ? `PASS ${this.pass} OF 3` : st === 'caught' ? 'ON THE HOOK' : st === 'away' ? 'RELEASED' : st === 'missed' ? 'MISSED' : g.down ? 'SPLASHDOWN' : 'UNDER MAIN CHUTE';
    txt('STAGE 1 · MID-AIR RECOVERY', 44, 50, 12, DIM, 'left', 700, 2.4); txt(phase, 44, 78, 25, st === 'caught' ? GR : WH, 'left', 700, 1);
    txt(`ALTITUDE ${Math.max(0, this.h).toFixed(0)} M   ·   TIME ×${g.down ? 1 : this.warp}`, 44, 100, 12, DIM, 'left', 600, 1.5);
    if (this.t < 5.5) { const h = hero(this.def), a = Math.min(1, this.t * 3) * sstep(5.5, 4.6, this.t); c.globalAlpha = a; txt(h.name.toUpperCase(), 1236, 50, 14, WH, 'right', 700, 1.5); txt(this.def.role || 'CEO · in Mission Control', 1236, 68, 12, AM, 'right', 600, 0.5); c.globalAlpha = 1; }
    txt(this.callText, 640, 112, 17, AM, 'center', 600, 0.5);
    if (st !== 'run') return;
    // where the line is and where the hook is, marked on the picture itself
    const fw = norm(sub(f.look, f.cam)), rt = norm(cross(fw, [0, 1, 0])), up = cross(rt, fw), tan = Math.tan((f.fov * Math.PI) / 360);
    const proj = (p: V3) => { const d = sub(p, f.cam), zz = dot(d, fw); return [640 + (dot(d, rt) / (zz * tan)) * 360, 360 - (dot(d, up) / (zz * tan)) * 360, zz] as const; };
    // the estimate of where the line will be (green ring), where the hook will pass (yellow cross), and the line now
    const e = this.pred(), ok = Math.abs(e.mx) < TOL_X && Math.abs(e.my) < TOL_Y, far = e.T > 0.4;
    const [lx, ly, tz] = proj(g.top), [tx, ty] = proj(add(g.top, [e.dx, e.dy, 0])), [hx, hy] = proj(add(g.top, [this.ex, this.ey, 0])), [kx, ky] = proj(g.hook);
    const rx = Math.max(9, (TOL_X / (tz * tan)) * 360), ry = Math.max(13, (TOL_Y / (tz * tan)) * 360);
    if (far) { c.setLineDash([3, 7]); c.strokeStyle = 'rgba(127,224,138,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(lx, ly); c.lineTo(tx, ty - ry); c.stroke(); c.setLineDash([]); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(lx - 9, ly - 9); c.lineTo(lx, ly); c.lineTo(lx + 9, ly - 9); c.stroke(); txt(`${Math.max(0, -this.ey).toFixed(0)} M ABOVE YOU`, lx + 16, ly > 92 && ly < 128 ? 138 : ly - 2, 11, DIM, 'left', 700, 1.5); }
    c.strokeStyle = ok ? GR : 'rgba(127,224,138,.8)'; c.lineWidth = ok ? 2.5 : 1.5; c.beginPath(); c.ellipse(tx, ty, rx, ry, 0, 0, 7); c.stroke();
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { c.beginPath(); c.moveTo(tx + dx * rx * 1.25, ty + dy * ry * 1.25); c.lineTo(tx + dx * rx * 1.9, ty + dy * ry * 1.9); c.stroke(); }
    if (far) txt('ESTIMATE', tx, ty + ry * 1.9 + 14, 10, 'rgba(127,224,138,.85)', 'center', 700, 2);
    c.strokeStyle = AM; c.lineWidth = 2; c.beginPath(); c.arc(hx, hy, 7, 0, 7); c.stroke(); c.beginPath(); c.moveTo(hx - 12, hy); c.lineTo(hx + 12, hy); c.moveTo(hx, hy - 12); c.lineTo(hx, hy + 12); c.stroke();
    c.setLineDash([4, 6]); c.strokeStyle = 'rgba(255,207,107,.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(kx, ky); c.lineTo(hx, hy); c.stroke(); c.setLineDash([]);
    // closing, and how far the hook will miss by
    const zc = Math.max(0, this.z), bx = 440, bw = 400, by = 640;
    c.fillStyle = 'rgba(6,10,20,.5)'; c.fillRect(bx, by, bw, 5); c.fillStyle = ok ? GR : WH; c.fillRect(bx, by, bw * (1 - zc / RUN), 5);
    txt('CLOSING', bx, by - 8, 10, DIM, 'left', 700, 2); txt(`${zc.toFixed(0)} M  ·  ${e.T.toFixed(0)} S`, bx + bw, by - 8, 12, WH, 'right', 700);
    const ax = Math.abs(e.mx) < 0.5 ? '' : `${e.mx > 0 ? '◀' : '▶'} ${Math.abs(e.mx).toFixed(0)} M`, ay = Math.abs(e.my) < 0.5 ? '' : `${e.my > 0 ? '▼' : '▲'} ${Math.abs(e.my).toFixed(0)} M`;
    txt(ok ? 'ON THE ESTIMATE' : [ax, ay].filter(Boolean).join('   '), 640, by + 26, 13, ok ? GR : WH, 'center', 700, 1.5);
  }
}
