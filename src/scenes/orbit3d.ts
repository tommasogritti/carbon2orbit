import Phaser from 'phaser';
import { hero } from '../core';
import { getEngine, Engine, Frame, V3, norm } from '../gfx3d/engine';
import { MX, MY, MW, MH, L0 } from './OrbitOps';
import type { OrbitOpsScene } from './OrbitOps';

const DEG = Math.PI / 180, clamp = Phaser.Math.Clamp, lerp = Phaser.Math.Linear, RE_KM = 6371;
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const wrapDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180, wrapRad = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const km = (m: number) => (m / 1000).toFixed(0);

/** How high the ground stands where the capsule lands, km; how much quicker than life the ground goes by in the fall; how long the last of the fall is shown, s. */
const GROUND = 0.05, QUICK = 2.6, FALL = 22, CHUTE = 6.2;

/**
 * Orbit operations drawn by the game's own 3D renderer (src/gfx3d), for XG graphics. The scene keeps the rules, the
 * orbit, the keys and the sound; this reads its state each frame and shows three things in turn: the spacecraft over
 * the Earth while its burns are made, the capsule's fall through the atmosphere from behind and then from ahead, and
 * the last of it under a parachute on to the ground. The ground-track map, the plan and the numbers are redrawn beside it.
 */
export class OrbitOps3D {
  eng: Engine; box: HTMLDivElement; hudC: HTMLCanvasElement; map?: CanvasImageSource;
  t = 0; dt = 1 / 60; last = -1; thr = 0; att = NaN; travel = 900; idle = 0; off = false; view: 'orbit' | 'fall' | 'land' = 'orbit';
  /** How many seconds of the capsule's fall pass in one: the scene steps the capsule by this, so the fall lasts about FALL seconds. */
  rate = 26; hot = 0; glow = 0; scorch = 0; az = 0.55;
  tRel = -1; sw0 = 0; swept = 0; pu = 0; north = 0; tLand = -1; total = 1;
  constructor(public sc: OrbitOpsScene) {
    this.eng = getEngine();
    const box = (this.box = document.createElement('div')); box.id = 'gfx3d';
    box.style.cssText = 'position:absolute;z-index:3;pointer-events:none;overflow:hidden';
    const hud = (this.hudC = document.createElement('canvas'));
    for (const c of [this.eng.canvas, hud]) { c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'; box.appendChild(c); }
    document.getElementById('stage')!.appendChild(box); this.fit(); this.eng.cut(); this.eng.setPatch(null);
    if (sc.textures.exists(sc.th.map)) this.map = sc.textures.get(sc.th.map).getSourceImage() as CanvasImageSource;
    const draw = () => this.present();
    sc.game.events.on('postrender', draw);
    sc.events.once('shutdown', () => { sc.game.events.off('postrender', draw); box.remove(); this.off = true; });
  }
  fit() {
    const box = this.box, r = this.sc.game.canvas.getBoundingClientRect(), s = document.getElementById('stage')!.getBoundingClientRect();
    const key = `${r.left - s.left}|${r.top - s.top}|${r.width}|${r.height}`;
    if (box.dataset.k === key) return;
    box.dataset.k = key; Object.assign(box.style, { left: r.left - s.left + 'px', top: r.top - s.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    const dpr = Math.min(window.devicePixelRatio || 1, 2), k = Math.min(1, 2560 / Math.max(1, r.width * dpr)), w = Math.max(320, r.width * dpr * k), h = Math.max(180, r.height * dpr * k);
    this.eng.resize(w, h); this.hudC.width = Math.round(w); this.hudC.height = Math.round(h);
  }
  /** The scene says the capsule is down: show the last of its fall. Returns how long that takes, ms. */
  land() { this.tLand = this.sc.time.now; this.view = 'land'; this.eng.cut(); return (CHUTE + 2.6) * 1000; }
  /** Follow the scene: the engine, the release, the capsule's fall. */
  track() {
    const sc = this.sc, now = sc.time.now, dt = (this.dt = this.last < 0 ? 1 / 60 : clamp((now - this.last) / 1000, 0, 0.1)), c = sc.cap; this.last = now; this.t += dt; // real seconds, whatever the display's refresh rate
    this.thr += ((sc.lit ? 1 : 0) - this.thr) * Math.min(1, dt * 8);
    if (c && this.tRel < 0) {                                                  // released: where it will come down, and how long that takes
      this.tRel = sc.time.now; this.pu = c.u; this.swept = 0;
      const l = sc.landing(c);
      if (l) { this.sw0 = l.sw; this.total = l.sw; this.north = sc.score(l.u, l.t, l.sw, c.u).along * DEG * RE_KM; this.rate = clamp((l.t - c.t) / FALL, 12, 110); }
      else { this.sw0 = 40; this.rate = 110; }
    }
    if (c) { this.swept += wrapDeg(c.u - this.pu); this.pu = c.u; }
    if (this.view === 'orbit' && c && sc.time.now - this.tRel > 2400) { this.view = 'fall'; this.eng.cut(); }
    if (this.view === 'orbit') this.travel += (sc.phasing > 0 ? 420 : 45) * dt;
    let hot = 0;
    if (c && this.view !== 'land') { const v = c.speed; hot = Math.pow(clamp((Math.sqrt(1.225 * Math.exp(-Math.max(0, c.alt) / 7200)) * v * v * v) / 5e9, 0, 1), 1.2); } // heating goes as the root of the air's density and the cube of the speed: it peaks near 65 km and is gone by 30
    this.hot += (hot - this.hot) * (1 - Math.exp(-dt * 7.5)); this.glow = Math.max(this.glow - dt * 0.09, this.hot); this.scorch = Math.max(this.scorch, sstep(0.1, 1, this.hot) * 0.95);
  }
  /** The sun for a place on the orbit: the plane stays near the edge of night (as a dawn-dusk orbit does), and the range is on the dark side, as it was. */
  sun(u: number): V3 { const ph = (u - this.sc.uT) * DEG, A = 0.22; return norm([-0.45 + A * Math.sin(ph), -A * Math.cos(ph) * 0.97, 0.86]); }
  /** The spacecraft in orbit: a close camera that drifts round it, the Earth below. */
  orbitFrame(): Frame {
    const sc = this.sc, o = sc.o, t = this.t, step = sc.steps[Math.min(sc.si, sc.steps.length - 1)];
    const vt = (o.x * o.vy - o.y * o.vx) / o.r, gam = Math.atan2(o.vr, vt), pro = step.do === 'raise' || step.do === 'release' || !!sc.cap; // it points its engine against the way it must be pushed; for the release, the capsule forward
    const want = Math.PI / 2 - gam + (pro ? 0 : Math.PI);
    this.att = isNaN(this.att) ? want : this.att + wrapRad(want - this.att) * (1 - Math.exp(-this.dt * 2.1));
    const th = this.att, by: V3 = [Math.sin(th), Math.cos(th), 0], bz: V3 = [0, 0, 1], bx = cross(by, bz), tgt = mul(by, 9.0);
    const az = 0.3 * Math.sin(t * 0.05) - 0.1, cam = add(tgt, [6.6 * Math.sin(az) - 1.4, 2.5 + 0.6 * Math.sin(t * 0.07), 6.6 * Math.cos(az)]);
    const rel = this.tRel < 0 ? -1 : ((sc.time.now - this.tRel) / 1000) * 1.3, fast = sc.phasing > 0;
    return {
      time: t, cam, look: add(tgt, [0.9, -0.3, 0]), fov: 38, roll: 0, shake: this.thr * 0.02,
      alt: Math.max(o.alt, 90e3) / 1000, travel: [this.travel, 140], drop: 0, speed: [fast ? 420 : 45, 0],
      sun: this.sun(fast ? sc.uT + 180 : o.u), body: [...bx, ...by, ...bz], vel: [0, 1, 0], hot: 0, scorch: 0, glow: this.thr * 0.6, rcs: [0, 0, 0, 0],
      chuteAxis: [0, 1, 0], drogue: 0, main: 0, splash: -1, s2: [0, 1, 0, 0], ship: null, exposure: 0.3, flash: 0,
      launch: { s1: null, fairing: 99, plume: [this.thr, 1, 2], pad: [-1e7, -o.alt, 0], site: 0, padKm: 0, lamps: 0, smoke: -1, boom: -1, kick: [sc.cap ? 2 : 1, rel], pay: 5 },
    };
  }
  /** The capsule on its way down: from behind as it leaves, from ahead while it burns, from behind again as the ground comes up. */
  fallFrame(): Frame {
    const c = this.sc.cap!, t = this.t, alt = Math.max(c.alt, 0);
    const vt = (c.x * c.vy - c.y * c.vx) / c.r, gam = Math.atan2(c.vr, vt), vel: V3 = [Math.cos(gam), Math.sin(gam), 0];
    const by = mul(vel, -1), bz: V3 = [0, 0, 1], bx = cross(by, bz);
    const K = QUICK / this.rate, remain = Math.max(0, this.sw0 - this.swept) * DEG * RE_KM * K, vvis = (Math.abs(vt) / 1000) * QUICK;
    this.travel += vvis * this.dt; this.az += (lerp(0.55, 2.3, sstep(0.08, 0.6, this.hot)) - this.az) * (1 - Math.exp(-this.dt * 1.5));
    const az = this.az + 0.08 * Math.sin(t * 0.3), dir: V3 = norm([-vel[0] * Math.cos(az), -vel[1] * Math.cos(az) + 0.2, Math.sin(az)]);
    const cam = mul(dir, 7.6), look = mul(vel, lerp(1.6, -1.6, sstep(1.0, 2.2, az)));
    const sun = this.sun(c.u), dark = sstep(0.04, -0.14, sun[1]), onLand = this.north > -27;
    return {
      time: t, cam, look, fov: 34 + this.hot * 4, roll: -0.04, shake: this.hot * 0.5,
      alt: (onLand ? GROUND : 0) + alt / 1000, travel: [this.travel, 140], drop: -c.vr * this.rate, speed: [vvis, 0],
      sun, body: [...bx, ...by, ...bz], vel, hot: this.hot, scorch: this.scorch, glow: this.glow * 0.8, rcs: [0, 0, 0, 0],
      chuteAxis: [0, 1, 0], drogue: 0, main: 0, splash: -1, s2: [0, 1, 0, 0], ship: null, exposure: lerp(lerp(0.3, 1.7, dark * sstep(330e3, 120e3, alt)), 0.42, sstep(0.05, 0.7, this.hot)), flash: 0,
      launch: { mode: 2, s1: null, fairing: 99, plume: [0, 0, 0], pad: [remain * 1000, -alt - 0.15, 0], site: 3, padKm: GROUND, lamps: 0, smoke: -1, boom: -1, north: this.north, pay: 5 },
    };
  }
  /** The last of the fall: seen from the ground, the capsule under its parachute, and the parachute going over once it is down. */
  landFrame(): Frame {
    const t = this.t, tt = (this.sc.time.now - this.tLand) / 1000, down = sstep(0, 1.6, tt - CHUTE), h = 90 * Math.pow(Math.max(0, 1 - tt / CHUTE), 1.3), onLand = this.north > -27;
    const sway: V3 = norm([0.07 * Math.sin(tt * 1.3), 1, 0.05 * Math.cos(tt * 1.1)]), k = down * 1.2, ax: V3 = down > 0 ? norm([-Math.sin(k), Math.cos(k), -0.25 * down]) : sway;
    const by: V3 = down > 0 ? norm([Math.sin(1.25 * down), Math.cos(1.25 * down), 0.2 * down]) : sway, // nose down under the parachute, then over on to its side
      bz: V3 = norm(cross(cross(by, [0, 0, 1]), by)), bx = cross(by, bz);
    const c = this.sc.cap, sun = this.sun(c ? c.u : this.sc.uT);
    return {
      time: t, cam: [11, -h + 1.4, 14], look: [-2.5 * down, lerp(lerp(5, 1.6, down), 5, sstep(60, 150, h)), 0], fov: 46, roll: 0, shake: Math.exp(-Math.max(0, tt - CHUTE) * 5) * (tt > CHUTE ? 0.25 : 0),
      alt: (onLand ? GROUND : 0) + (h + 0.47) / 1000, travel: [this.travel, 140], drop: tt < CHUTE ? 30 : 0, speed: [0, 0],
      sun, body: [...bx, ...by, ...bz], vel: [0, -1, 0], hot: 0, scorch: this.scorch, glow: 0, rcs: [0, 0, 0, 0],
      chuteAxis: ax, drogue: 0, main: lerp(1, 0.32, down), splash: -1, s2: [0, 1, 0, 0], ship: null, exposure: 2.6, flash: 0,
      launch: { mode: 2, s1: null, fairing: 99, plume: [0, 0, 0], pad: [0, -h - 0.47, 0], site: 3, padKm: GROUND, lamps: 0, smoke: -1, boom: -1, north: this.north, pay: 5 },
    };
  }
  frame(): Frame { return this.view === 'land' ? this.landFrame() : this.view === 'fall' && this.sc.cap ? this.fallFrame() : this.orbitFrame(); }
  present() {
    if (this.off) return;
    if (this.sc.scene.isPaused()) { this.dt = 0; if (++this.idle > 40) return; } else { this.idle = 0; this.track(); }
    this.fit(); this.eng.render(this.frame()); this.hud();
  }
  /** Dev: the frame as a JPEG data URL, for the checks that run without a visible tab. */
  shot(q = 0.9) { this.fit(); this.eng.render(this.frame()); this.hud(); const c = document.createElement('canvas'); c.width = this.eng.canvas.width; c.height = this.eng.canvas.height; const x = c.getContext('2d')!; x.drawImage(this.eng.canvas, 0, 0); x.drawImage(this.hudC, 0, 0); return c.toDataURL('image/jpeg', q); }

  // ------------------------------------------------------------------ the consoles
  hud() {
    const sc = this.sc, cv = this.hudC, c = cv.getContext('2d')!, k = cv.height / 720, cap = sc.cap, step = sc.steps[Math.min(sc.si, sc.steps.length - 1)], ui = sc.ui;
    c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, 1280, 720);
    const F = (px: number, w = 600) => `${w} ${px}px "Chakra Petch", system-ui, sans-serif`;
    const txt = (str: string, x: number, y: number, px: number, col: string, al: CanvasTextAlign = 'left', w = 600, sp = 0) => { c.font = F(px, w); c.textAlign = al; (c as any).letterSpacing = sp + 'px'; c.shadowColor = 'rgba(0,0,0,.8)'; c.shadowBlur = 6; c.fillStyle = col; str.split('\n').forEach((ln, i) => c.fillText(ln, x, y + i * px * 1.3)); c.shadowBlur = 0; };
    const DIM = 'rgba(205,216,240,.75)', WH = 'rgba(255,255,255,.96)', GR = '#7fe08a', AM = '#ffcf6b', OR = '#ff9b4a';
    const plate = (x: number, y: number, w: number, h: number) => { c.fillStyle = 'rgba(4,8,18,.5)'; c.beginPath(); (c as any).roundRect(x, y, w, h, 8); c.fill(); c.strokeStyle = 'rgba(160,178,214,.16)'; c.lineWidth = 1; c.stroke(); };
    { const gr = c.createLinearGradient(0, 0, 0, 190); gr.addColorStop(0, 'rgba(2,5,12,.5)'); gr.addColorStop(1, 'rgba(2,5,12,0)'); c.fillStyle = gr; c.fillRect(0, 0, 1280, 190); const g2 = c.createLinearGradient(0, 720, 0, 500); g2.addColorStop(0, 'rgba(2,5,12,.5)'); g2.addColorStop(1, 'rgba(2,5,12,0)'); c.fillStyle = g2; c.fillRect(0, 500, 1280, 220); }
    // what the plan wants now, and what was just said
    const here = !!ui.mark?.[2] && !cap, head = cap ? (this.view === 'land' ? ((sc.time.now - this.tLand) / 1000 > CHUTE ? 'TOUCHDOWN' : 'UNDER THE PARACHUTE') : 'CAPSULE ON ITS WAY DOWN') : sc.phasing > 0 ? 'WAITING FOR THE PASS OVER THE RANGE' : sc.th.label(step);
    txt(sc.def.title.toUpperCase(), 44, 50, 13, DIM, 'left', 700, 2);
    txt(head, 640, 62, 26, here ? GR : AM, 'center', 700, 2);
    if (here && !sc.lit) txt(step.do === 'release' ? 'SPACE · RELEASE NOW' : 'AT THE MARKER · HOLD SPACE', 640, 90, 14, GR, 'center', 700, 1.5);
    txt(sc.call.text, 640, 690, 16, AM, 'center', 600, 0.4);
    if (this.t < 6) { const h = hero(sc.def), a = Math.min(1, this.t * 3) * sstep(6, 5, this.t); c.globalAlpha = a; txt(h.name.toUpperCase(), 44, 80, 14, WH, 'left', 700, 1.5); txt(sc.def.role || sc.th.role, 44, 98, 12, AM, 'left', 600, 0.5); c.globalAlpha = 1; }
    // the plan
    { const lines = sc.list.text.split('\n'); plate(28, 130, 350, 26 + lines.length * 21); txt('FLIGHT PLAN', 42, 150, 11, DIM, 'left', 700, 1.5); lines.forEach((ln, i) => txt(ln, 42, 174 + i * 21, 13, ln.startsWith('▶') ? AM : ln.startsWith('✓') ? GR : WH, 'left', 600, 0.4)); }
    // the orbit's numbers, or the capsule's
    if (cap) {
      const real = Math.max(0, this.sw0 - this.swept) * DEG * RE_KM, v = cap.speed;
      plate(902, 130, 350, 132); txt('CAPSULE', 916, 150, 11, DIM, 'left', 700, 1.5);
      const row = (l: string, v2: string, i: number) => { txt(l, 916, 176 + i * 22, 12, DIM, 'left', 700, 1); txt(v2, 1238, 176 + i * 22, 14, WH, 'right', 700); };
      row('ALTITUDE', this.view === 'land' ? 'under 15 km' : `${km(Math.max(cap.alt, 0))} km`, 0); row('SPEED', this.view === 'land' ? '—' : `${Math.round(v * 3.6).toLocaleString('en-US')} km/h`, 1); row('TO TOUCHDOWN', this.view === 'land' ? '—' : `${Math.round(real).toLocaleString('en-US')} km`, 2);
      txt('HEATING', 916, 176 + 3 * 22, 12, DIM, 'left', 700, 1); c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(1038, 234, 200, 8); c.fillStyle = OR; c.fillRect(1038, 234, 200 * clamp(this.hot, 0, 1), 8);
    } else {
      const lines = sc.info.text.split('\n'); plate(902, 130, 350, 30 + lines.length * 21); txt('ORBIT', 916, 150, 11, DIM, 'left', 700, 1.5);
      lines.forEach((ln, i) => txt(ln, 916, 174 + i * 21, 13, i === lines.length - 1 && sc.pred && sc.pred.miss < 80 ? GR : WH, 'left', 600, 0.3));
    }
    // the ground track
    { const s = 1.44, x0 = 814, y0 = 478, PX = (x: number) => x0 + (x - MX) * s, PY = (y: number) => y0 + (y - MY) * s, tg = sc.p.target;
      const X = (lon: number) => MX + ((((lon - L0) % 360) + 360) % 360) * (MW / 360), Y = (lat: number) => MY + (90 - lat) * (MH / 180);
      plate(802, 452, 456, 198); txt('GROUND TRACK', 816, 470, 11, DIM, 'left', 700, 1.5);
      if (this.map) { c.globalAlpha = 0.88; c.drawImage(this.map, x0, y0, MW * s, MH * s); c.globalAlpha = 1; }
      const path = (pts: number[][], col: string, wd: number) => { c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); pts.forEach((q, i) => (i && Math.abs(q[0] - pts[i - 1][0]) < 40 ? c.lineTo(PX(q[0]), PY(q[1])) : c.moveTo(PX(q[0]), PY(q[1])))); c.stroke(); };
      c.save(); c.beginPath(); c.rect(x0, y0, MW * s, MH * s); c.clip();
      path(sc.trail, 'rgba(127,180,255,.7)', 1.2); path(ui.ahead, 'rgba(255,255,255,.9)', 1.3);
      c.strokeStyle = AM; c.lineWidth = 1.4; c.beginPath(); c.arc(PX(X(tg.lon)), PY(Y(tg.lat)), 6, 0, 7); c.stroke(); c.fillStyle = AM; c.beginPath(); c.arc(PX(X(tg.lon)), PY(Y(tg.lat)), 1.6, 0, 7); c.fill();
      if (ui.mark && !cap && !(sc.phasing > 0)) { c.strokeStyle = ui.mark[2] ? GR : AM; c.lineWidth = 1.6; c.beginPath(); c.arc(PX(ui.mark[0]), PY(ui.mark[1]), 5.5 + 1.6 * Math.sin(this.t * 6), 0, 7); c.stroke(); }
      if (ui.pred) { const px = PX(ui.pred[0]), py = PY(ui.pred[1]); c.strokeStyle = ui.pred[2] ? GR : OR; c.lineWidth = 1.8; c.beginPath(); c.moveTo(px - 5, py - 5); c.lineTo(px + 5, py + 5); c.moveTo(px - 5, py + 5); c.lineTo(px + 5, py - 5); c.stroke(); }
      if (ui.cap) { c.fillStyle = WH; c.beginPath(); c.arc(PX(ui.cap[0]), PY(ui.cap[1]), 2.6, 0, 7); c.fill(); }
      if (!cap || sc.o.alt > 100e3) { const px = PX(ui.x), py = PY(ui.y); if (sc.lit) { c.fillStyle = 'rgba(255,179,71,.9)'; c.beginPath(); c.arc(px, py, 6 + Math.random() * 2, 0, 7); c.fill(); } c.fillStyle = WH; c.beginPath(); c.arc(px, py, 3.2, 0, 7); c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1; c.stroke(); }
      c.restore();
      txt(tg.name, clamp(PX(X(tg.lon)) + 10, x0, x0 + MW * s - 150), PY(Y(tg.lat)) + 16, 10, AM, 'left', 700, 0.8);
    }
  }
}
