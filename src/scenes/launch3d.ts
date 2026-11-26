import Phaser from 'phaser';
import { hero } from '../core';
import * as L from '../launchSim';
import { getEngine, Engine, Frame, V3, norm } from '../gfx3d/engine';
import { DEPLOY_DIR } from './Launch';
import type { LaunchScene } from './Launch';

const DEG = Math.PI / 180, clamp = Phaser.Math.Clamp, lerp = Phaser.Math.Linear;
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
const km = (m: number) => (m / 1000).toFixed(0);

/** The coast each site is drawn as (the game's own, not a map): 1 a headland with cliffs, 2 a flat shore; and how high the pad stands, km. */
export const SITES_3D: Record<string, { kind: number; padKm: number }> = { mahia: { kind: 1, padKm: 0.1 }, wallops: { kind: 2, padKm: 0.004 } };
/** The light: where the sun is, the exposure, and how much the pad's floodlights are on. */
const LIGHT = {
  day: { sun: norm([-0.42, 0.6, 0.62]), exp: 0.27, lamps: 0 },
  dusk: { sun: norm([-0.8, -0.03, 0.42]), exp: 1.5, lamps: 0.7 },
  night: { sun: norm([-0.6, -0.45, 0.4]), exp: 2.6, lamps: 1 },
  low: { sun: norm([-0.62, 0.2, 0.6]), exp: 0.34, lamps: 0 },
};
/** Flights whose real hour differs from the level's day, dusk or night: late-afternoon sun for the first flight (4:20 pm in May) and the hundredth (6:30 pm in November); full dark for the first from Virginia, 45 minutes after sunset. */
const HOUR: Record<string, keyof typeof LIGHT> = { 'its-a-test': 'low', 'the-mountain-god-rises': 'low', 'lc-2': 'night' };
const MOUNT = 8.7;
/** What each flight's kick stage is drawn carrying (the game's own shapes, by kind): CubeSats on a dispenser, a radar satellite, three microsatellites; otherwise one satellite. */
const PAYLOAD: Record<string, number> = { 'its-a-test': 6, haste: 7, 'still-testing': 1, 'its-business-time': 1, 'lc-2': 4, 'paschens-law': 3, 'the-mountain-god-rises': 3 }; // metres from the pad's deck up to the vehicle's origin (the middle of stage one) as it stands

/**
 * Launch control drawn by the game's own 3D renderer (src/gfx3d), for XG graphics: the count and the climb to SECO.
 * The launch scene keeps the rules, the physics, the keys and the sound; this reads its state each frame, hands the
 * renderer a picture of it, and redraws the consoles on a canvas of its own. Then the kick stage in orbit: the stage itself
 * over the Earth, with the orbit plot, the flight plan and the deployment dial redrawn beside it.
 */
export class Launch3D {
  eng: Engine; box: HTMLDivElement; hudC: HTMLCanvasElement;
  t = 0; dt = 1 / 60; last = -1; thr = 0; tIgn = -1; tGo = -1; tSep = -1; tFair = -1; tBoom = -1; tLost = -1; idle = 0; settle = false; off = false; kTravel = 0; nRel = 0; tRel = -1; wasKick = false; th0 = 0;
  constructor(public sc: LaunchScene) {
    this.eng = getEngine();
    const box = (this.box = document.createElement('div')); box.id = 'gfx3d';
    box.style.cssText = 'position:absolute;z-index:3;pointer-events:none;overflow:hidden';
    const hud = (this.hudC = document.createElement('canvas'));
    for (const c of [this.eng.canvas, hud]) { c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'; box.appendChild(c); }
    document.getElementById('stage')!.appendChild(box); this.fit(); this.eng.cut();
    const pk = 'patch_' + sc.def.id; this.eng.setPatch(sc.textures.exists(pk) ? (sc.textures.get(pk).getSourceImage() as TexImageSource) : null); // the mission patch, where the file is present
    const draw = () => this.present();
    sc.game.events.on('postrender', draw);
    sc.events.once('shutdown', () => { sc.game.events.off('postrender', draw); box.remove(); this.off = true; });
  }
  light() { const p = this.sc.p; return LIGHT[HOUR[this.sc.def.id] || (p.night ? 'night' : p.dusk ? 'dusk' : 'day')]; }
  fit() {
    const box = this.box, r = this.sc.game.canvas.getBoundingClientRect(), s = document.getElementById('stage')!.getBoundingClientRect();
    const key = `${r.left - s.left}|${r.top - s.top}|${r.width}|${r.height}`;
    if (box.dataset.k === key) return;
    box.dataset.k = key; Object.assign(box.style, { left: r.left - s.left + 'px', top: r.top - s.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    const dpr = Math.min(window.devicePixelRatio || 1, 2), k = Math.min(1, 2560 / Math.max(1, r.width * dpr)), w = Math.max(320, r.width * dpr * k), h = Math.max(180, r.height * dpr * k);
    this.eng.resize(w, h); this.hudC.width = Math.round(w); this.hudC.height = Math.round(h);
  }
  /** The ground lost the picture (the first flight): static for a moment, then the scene's own screen. */
  lost() { this.tLost = this.t; }
  /** Follow the scene: what has lit, gone or come off since the last frame. */
  track() {
    const sc = this.sc, s = sc.s, now = sc.time.now, dt = (this.dt = this.last < 0 ? 1 / 60 : clamp((now - this.last) / 1000, 0, 0.1)); this.last = now; this.t += dt; // real seconds: a display may refresh at 60 or 120, and the dev fast-forward draws one step in several
    const burning = s.lit && !s.starved && !sc.ended;
    this.thr += ((burning ? Math.max(0.35, s.throttle) : 0) - this.thr) * Math.min(1, dt * 7);
    if (s.held && !s.lit) { this.tIgn = -1; this.tGo = -1; } else if (this.tIgn < 0) this.tIgn = this.t;
    if (!s.held && this.tGo < 0) this.tGo = this.t;
    if (s.ev.sep !== undefined && this.tSep < 0) { this.tSep = this.t; }
    if (s.ev.fairing !== undefined && this.tFair < 0) this.tFair = this.t;
    if (sc.ended && !sc.rocket.visible && this.tBoom < 0) this.tBoom = this.t;
    if (sc.kick) {
      if (!this.wasKick) { this.wasKick = true; this.th0 = Math.atan2(s.x, s.y); this.eng.cut(); }
      this.kTravel += 45 * dt;                                               // the ground goes by quicker than life, slower than the clock
      const n = (sc.dep ? sc.dep.i : 0) + sc.planLog.length + (sc.banner && !sc.dep && !sc.p.plan ? 1 : 0);
      if (n > this.nRel) { this.nRel = n; this.tRel = this.t; }
    }
  }
  /** The kick stage in orbit: a close camera that drifts round it, the Earth below. */
  kickFrame(): Frame {
    const sc = this.sc, s = sc.s, t = this.t, d = sc.dep;
    const gam = Math.atan2(s.vr, s.vt), th = Math.PI / 2 - gam + (s.retro ? Math.PI : 0) + (d ? d.ang * DEG : 0);
    const by: V3 = [Math.sin(th), Math.cos(th), 0], bz: V3 = [0, 0, 1], bx = cross(by, bz), tgt = mul(by, 9.0);
    const az = 0.25 * Math.sin(t * 0.05) - 0.1, cam = add(tgt, [6.2 * Math.sin(az) - 1.5, 2.6 + 0.6 * Math.sin(t * 0.07), 6.2 * Math.cos(az)]);
    const n = d ? d.names.length : (sc.p.plan as { do: string }[] | undefined)?.filter((q) => q.do === 'deploy').length ?? 1, rel = this.tRel < 0 ? -1 : (this.t - this.tRel) * 1.6;
    const boom = this.tBoom < 0 ? -1 : t - this.tBoom, burn = s.lit ? 1 : 0; this.thr += (burn - this.thr) * (1 - Math.exp(-this.dt * 13));
    // the sun where the launch left it, then round the sky as the stage goes round the Earth: a dusk flight meets the night, and then a sunrise
    const l0 = this.light(), a = Math.atan2(s.x, s.y) - this.th0, ca = Math.cos(a), sa = Math.sin(a);
    const sun: V3 = norm([l0.sun[0] * ca - l0.sun[1] * sa, l0.sun[0] * sa + l0.sun[1] * ca, l0.sun[2]]), dark = sstep(0.04, -0.14, sun[1]);
    return {
      time: t, cam, look: add(tgt, [1.2, -0.4, 0]), fov: 38, roll: 0, shake: this.thr * 0.02 + (boom >= 0 ? Math.exp(-boom * 2) * 0.8 : 0),
      alt: s.alt / 1000, travel: [this.kTravel + 900, 140], drop: 0, speed: [45, 0],
      sun, body: [...bx, ...by, ...bz], vel: [0, 1, 0], hot: 0, scorch: 0, glow: this.thr * 0.6, rcs: [0, 0, 0, 0],
      chuteAxis: [0, 1, 0], drogue: 0, main: 0, splash: -1, s2: [0, 1, 0, 0], ship: null, exposure: lerp(0.27, 1.7, dark), flash: boom >= 0 ? Math.exp(-boom * 5) * 0.6 : 0,
      launch: { s1: null, fairing: 99, plume: [this.thr, 1, 2], pad: [-1e7, -s.alt, 0], site: 0, padKm: 0, lamps: 0, smoke: -1, boom, kick: [this.nRel >= n ? 2 : 1, rel >= 0 && rel < 22 ? rel : -1], pay: PAYLOAD[sc.def.id] || 0 },
    };
  }
  frame(): Frame {
    if (this.sc.kick) return this.kickFrame();
    const sc = this.sc, s = sc.s, p = sc.p, t = this.t, up = s.stage >= 1;
    const th = sc.rocket.rotation, by: V3 = [Math.sin(th), Math.cos(th), 0], bz: V3 = [0, 0, 1], bx = cross(by, bz);
    const site = SITES_3D[p.site], light = this.light();
    const pad: V3 = [-s.down, -s.alt - MOUNT, 0];
    const ts = this.tSep < 0 ? -1 : t - this.tSep, d1 = ts < 0 ? 0 : 1.2 * ts + 3.5 * ts * ts;
    const s1: V3 | null = ts < 0 ? [0, 0, 0] : d1 > 700 ? null : add(mul(by, -d1), mul(bx, -0.5 * ts));
    // cameras: by the pad for the count, a long lens on the ground for the first seconds, then alongside
    const tgt: V3 = mul(by, lerp(2.7, 7.4, up ? sstep(0, 2.5, ts) : 0)), deck = add(pad, [0, 0, 0]);
    const az = 0.85 + 0.22 * Math.sin(t * 0.06), c0: V3 = add(deck, [60 * Math.sin(az), 3.2, 60 * Math.cos(az)]), l0: V3 = add(deck, [4.5, 11.5, 0]);
    const g: V3 = add(deck, [46, 2.6, 78]), dist = Math.hypot(...sub(tgt, g)), lg: V3 = add(tgt, [0.06 * dist, 0.03 * dist, 0]), fg = clamp(2 * Math.atan(15 / dist) / DEG, 5, 34);
    const far = up ? sstep(0, 2.5, ts) : 0, drift: V3 = [5 * Math.sin(t * 0.11), 2 * Math.sin(t * 0.07), 0];
    const back = sstep(900, 5000, s.alt) * (1 - far); // on the way up the camera goes ahead and above and looks back, so the coast it left is in the picture
    const cc: V3 = add(add(tgt, mix3(mix3([-11, 7, 48], [30, 24, 36], back), [-6, 4, 25], far)), drift), lc: V3 = add(tgt, [lerp(5.5, 3, far) * (1 - back) - 11 * back, 0, 9 * back]);
    const kGo = this.tGo < 0 ? 0 : sstep(0, 1.2, t - this.tGo), kUp = sstep(350, 1600, s.alt);
    const cam = mix3(mix3(c0, g, kGo), cc, kUp), look = mix3(mix3(l0, lg, kGo), lc, kUp), fov = lerp(lerp(34, fg, kGo), 36 + 10 * back, kUp);
    cam[1] = Math.max(cam[1], pad[1] + 1.2);
    const q = sc.v.qLimit ? clamp(s.q / sc.v.qLimit, 0, 1.3) : 0, low = 1 - sstep(300, 2500, s.alt);
    const age = this.tIgn < 0 ? -1 : t - this.tIgn, boom = this.tBoom < 0 ? -1 : t - this.tBoom;
    return {
      time: t, cam, look, fov, roll: 0, shake: this.thr * (0.04 + 0.2 * low * (s.held ? 0.5 : 1)) + q * q * 0.12 + (boom >= 0 ? Math.exp(-boom * 2) * 0.8 : 0),
      alt: site.padKm + (s.alt + MOUNT) / 1000, travel: [s.down / 1000 + 260, 140], drop: -s.vr * sc.warp, speed: [(s.vt / 1000) * sc.warp, 0],
      sun: light.sun, body: [...bx, ...by, ...bz], vel: [0, 1, 0], hot: 0, scorch: 0, glow: this.thr * 0.7, rcs: [0, 0, 0, 0],
      chuteAxis: [0, 1, 0], drogue: 0, main: 0, splash: -1, s2: [0, 1, 0, 0], ship: null,
      exposure: light.exp * (1 - 0.35 * this.thr * low * (light.exp > 1 ? 1 : 0.25)), flash: boom >= 0 ? Math.exp(-boom * 5) * 0.6 : 0,
      launch: { s1, fairing: this.tFair < 0 ? -1 : t - this.tFair, plume: [this.thr, up ? 1 : 1 - Math.exp(-s.alt / 15e3), up ? 1 : 0], pad, site: site.kind, padKm: site.padKm, lamps: light.lamps, smoke: age, boom, pay: PAYLOAD[sc.def.id] || 0, frost: 1 - sstep(4e3, 45e3, s.alt), tilt: this.tGo < 0 ? 0 : 0.26 * sstep(0, 1.6, t - this.tGo) },
    };
  }
  present() {
    if (this.off) return;
    const sc = this.sc, hide = this.tLost >= 0 && this.t - this.tLost > 1.6;
    this.box.style.display = hide ? 'none' : '';
    if (hide) return;
    if (sc.scene.isPaused()) { this.dt = 0; if (++this.idle > 40) return; } else { this.idle = 0; this.track(); }
    this.fit(); const f = this.frame(); this.eng.render(f); this.hud(f);
  }
  /** Dev: the frame as a JPEG data URL, for the checks that run without a visible tab. */
  shot(q = 0.9) { this.fit(); const f = this.frame(); this.eng.render(f); this.hud(f); const c = document.createElement('canvas'); c.width = this.eng.canvas.width; c.height = this.eng.canvas.height; const x = c.getContext('2d')!; x.drawImage(this.eng.canvas, 0, 0); x.drawImage(this.hudC, 0, 0); return c.toDataURL('image/jpeg', q); }

  // ------------------------------------------------------------------ the consoles
  hud(_f: Frame) {
    const sc = this.sc, s = sc.s, cv = this.hudC, c = cv.getContext('2d')!, k = cv.height / 720;
    c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, 1280, 720);
    const F = (px: number, w = 600) => `${w} ${px}px "Chakra Petch", system-ui, sans-serif`;
    const txt = (str: string, x: number, y: number, px: number, col: string, al: CanvasTextAlign = 'left', w = 600, sp = 0) => { c.font = F(px, w); c.textAlign = al; (c as any).letterSpacing = sp + 'px'; c.shadowColor = 'rgba(0,0,0,.8)'; c.shadowBlur = 6; c.fillStyle = col; str.split('\n').forEach((ln, i) => c.fillText(ln, x, y + i * px * 1.3)); c.shadowBlur = 0; };
    const DIM = 'rgba(205,216,240,.75)', WH = 'rgba(255,255,255,.96)', GR = '#7fe08a', AM = '#ffcf6b', RD = '#ff6a50', LINE = 'rgba(160,178,214,.6)';
    const plate = (x: number, y: number, w: number, h: number) => { c.fillStyle = 'rgba(4,8,18,.42)'; c.beginPath(); (c as any).roundRect(x, y, w, h, 8); c.fill(); c.strokeStyle = 'rgba(160,178,214,.16)'; c.lineWidth = 1; c.stroke(); };
    { const gr = c.createLinearGradient(0, 0, 0, 190); gr.addColorStop(0, 'rgba(2,5,12,.45)'); gr.addColorStop(1, 'rgba(2,5,12,0)'); c.fillStyle = gr; c.fillRect(0, 0, 1280, 190); const g2 = c.createLinearGradient(0, 720, 0, 520); g2.addColorStop(0, 'rgba(2,5,12,.45)'); g2.addColorStop(1, 'rgba(2,5,12,0)'); c.fillStyle = g2; c.fillRect(0, 520, 1280, 200); }
    if (sc.kick) {                                                            // the kick stage's consoles
      const kk = sc.kick, o = L.orbit(s), d = sc.dep;
      txt(sc.kickT[0]?.text || '', 640, 62, 26, AM, 'center', 700, 2); txt(sc.kickT[1]?.text || '', 640, 88, 13, DIM, 'center', 600, 0.6);
      const lines = kk.info.text.split('\n'); plate(28, 150, 330, 34 + lines.length * 19);
      lines.forEach((ln, i) => txt(ln, 44, 178 + i * 19, 13, ln.startsWith('▶') ? AM : ln.startsWith('✓') ? GR : WH, 'left', 600, 0.5));
      // the orbit, altitudes exaggerated so the ellipse reads
      { const cx = 1070, cy = 300, top = Math.max(o.bound ? o.ap : 0, s.alt, sc.m.ha, ...sc.kRings), f = Math.min(3.5, 166 / (sc.kr[0] + (top / 1000) * sc.kr[1])), RD = (alt: number) => (sc.kr[0] + (alt / 1000) * sc.kr[1]) * f, th = Math.atan2(s.x, s.y), w = th - o.nu;
        plate(888, 110, 364, 380); txt('ORBIT', 902, 132, 11, DIM, 'left', 700, 1.5);
        const gr = c.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, sc.kr[0] * f); gr.addColorStop(0, '#3f7fd0'); gr.addColorStop(1, '#0b2c5c'); c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, sc.kr[0] * f, 0, 7); c.fill();
        for (const ring of sc.kRings.length ? sc.kRings : [sc.m.ha]) { c.strokeStyle = 'rgba(127,224,138,.6)'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, RD(ring), 0, 7); c.stroke(); }
        c.strokeStyle = AM; c.lineWidth = 2; c.beginPath();
        for (let i = 0; i <= 72; i++) { const nu = (i / 72) * Math.PI * 2, r = (o.a * (1 - o.ecc * o.ecc)) / (1 + o.ecc * Math.cos(nu)), dd = RD(r - L.RE), x = cx + Math.sin(w + nu) * dd, y = cy - Math.cos(w + nu) * dd; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
        c.stroke();
        c.fillStyle = AM; c.beginPath(); c.arc(cx + Math.sin(w + Math.PI) * RD(o.ap), cy - Math.cos(w + Math.PI) * RD(o.ap), 5, 0, 7); c.fill();
        const px = cx + Math.sin(th) * RD(s.alt), py = cy - Math.cos(th) * RD(s.alt);
        if (s.lit) { c.fillStyle = 'rgba(255,179,71,.9)'; c.beginPath(); c.arc(px, py, 8 + Math.random() * 3, 0, 7); c.fill(); }
        c.fillStyle = WH; c.beginPath(); c.arc(px, py, 4.5, 0, 7); c.fill();
      }
      if (d) {                                                                // the dispenser's heading, the commanded one, and the body rate
        const cx = 1070, cy = 590, R = 62, n = d.names.length, tg = DEPLOY_DIR[d.i % DEPLOY_DIR.length], diff = Phaser.Math.Angle.WrapDegrees(tg - d.ang);
        const pt = (deg: number, r: number): [number, number] => [cx + Math.cos((deg - 90) * DEG) * r, cy + Math.sin((deg - 90) * DEG) * r];
        plate(888, 500, 364, 200); txt('DEPLOY HEADING', 902, 522, 11, DIM, 'left', 700, 1.5);
        c.strokeStyle = LINE; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
        for (let a = 0; a < 360; a += 30) { c.beginPath(); c.moveTo(...pt(a, R)); c.lineTo(...pt(a, R - (a % 90 ? 5 : 10))); c.stroke(); }
        if (d.i < n) { c.fillStyle = Math.abs(diff) <= 6 ? GR : AM; c.beginPath(); c.moveTo(...pt(tg, R + 3)); c.lineTo(...pt(tg + 6, R + 18)); c.lineTo(...pt(tg - 6, R + 18)); c.fill(); }
        c.strokeStyle = WH; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(...pt(d.ang, R - 4)); c.stroke(); c.lineCap = 'butt';
        const rate = Math.min(1, Math.abs(d.rate) / 60); txt('BODY RATE', 902, 690, 10, DIM, 'left', 700, 1.5); c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(990, 682, 240, 7); c.fillStyle = Math.abs(d.rate) < 14 ? GR : RD; c.fillRect(990, 682, 240 * rate, 7);
      }
      if (sc.banner) txt(sc.banner, 640, 130, 24, GR, 'center', 700, 2);
      if (sc.call.text) txt(sc.call.text, 640, 640, 15, AM, 'center', 600, 0.5);
      txt(kk.tip.text, 640, 676, 19, String(kk.tip.style.color || WH), 'center', 700, 0.5);
      return;
    }
    // clock and telemetry
    txt(sc.clockT.text, 44, 66, 34, AM, 'left', 700, 1); if (sc.warpT.text) txt('TIME ' + sc.warpT.text, 44, 88, 12, DIM, 'left', 700, 2);
    txt(sc.tele.text, 44, 114, 14, WH, 'left', 600, 0.6);
    if (this.t < 6) { const h = hero(sc.def), a = Math.min(1, this.t * 3) * sstep(6, 5, this.t); c.globalAlpha = a; txt(h.name.toUpperCase(), 44, 196, 14, WH, 'left', 700, 1.5); txt(sc.def.role || 'CEO · calling the launch', 44, 214, 12, AM, 'left', 600, 0.5); c.globalAlpha = 1; }
    // the timeline, as on the webcast; under it, the poll during the count
    const tEnd = sc.tEnd(), X = (tt: number) => 420 + clamp(tt / tEnd, 0, 1) * 440;
    c.strokeStyle = LINE; c.lineWidth = 1.5; c.beginPath(); c.moveTo(420, 52); c.lineTo(860, 52); c.stroke();
    if (!s.held) { c.strokeStyle = AM; c.lineWidth = 3; c.beginPath(); c.moveTo(420, 52); c.lineTo(X(s.t), 52); c.stroke(); c.fillStyle = WH; c.beginPath(); c.moveTo(X(s.t) - 6, 38); c.lineTo(X(s.t) + 6, 38); c.lineTo(X(s.t), 48); c.fill(); }
    sc.tlKeys.forEach(([key, name, side], i) => { const done = s.ev[key] !== undefined && (key !== 'maxq' || sc.said.maxq), x = X(sc.ref!.ev[key]), last = i === sc.tlKeys.length - 1; c.fillStyle = done ? GR : 'rgba(160,178,214,.9)'; c.beginPath(); c.arc(x, 52, 4.5, 0, 7); c.fill(); txt(name, last ? 866 : x, side < 0 ? 32 : 76, 11, done ? GR : DIM, last ? 'right' : 'center', 700, 1.2); });
    if (s.held) sc.poll.forEach((pt, i) => { const st = sc.station(i), blink = st === 'nogo' && Math.floor(this.t * 5.5) % 2 === 0, x = 460 + i * 90; c.fillStyle = st === 'go' ? GR : st === 'nogo' ? (blink ? '#ffffff' : RD) : 'rgba(90,100,128,.85)'; c.beginPath(); (c as any).roundRect(x - 40, 96, 80, 22, 6); c.fill(); c.font = F(11, 700); c.textAlign = 'center'; (c as any).letterSpacing = '1px'; c.fillStyle = '#0b0e18'; c.fillText(pt.text, x, 111); });
    // gauges
    plate(972, 28, 280, 150);
    txt(String(sc.p.payload).toUpperCase(), 1238, 50, 12, DIM, 'right', 700, 1.2);
    sc.rows().forEach((r, i) => {
      const y = 76 + i * 20, x = 1090, w = 84;
      txt(r.l, 986, y, 11, DIM, 'left', 700, 1); txt(r.t, 1238, y, 12, WH, 'right', 700);
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(x, y - 8, w, 7); c.fillStyle = hex(r.col); c.fillRect(x, y - 8, w * clamp(r.f, 0, 1), 7);
      if (r.tick) { c.fillStyle = WH; c.fillRect(x + w * r.tick - 0.75, y - 11, 1.5, 13); }
    });
    if (sc.p.hundred) txt('ELECTRON LAUNCH #100', 1238, 200, 15, AM, 'right', 700, 1.5);
    // flight director: the white needle is the body axis, the green bug the pitch guidance wants, the amber ring prograde
    { const cx = 70, cy = 660, R = 138, pt = (ang: number, r: number): [number, number] => [cx + Math.cos(ang) * r, cy - Math.sin(ang) * r];
      plate(28, 486, 232, 206); txt('FLIGHT DIRECTOR', 42, 506, 11, DIM, 'left', 700, 1.5);
      c.strokeStyle = LINE; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, R, 15 * DEG, -92 * DEG, true); c.stroke();
      for (let d = -15; d <= 90; d += 15) { const a = pt(d * DEG, R), b = pt(d * DEG, R - (d % 30 ? 6 : 12)); c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke(); }
      const cue = L.cue(s, sc.m, sc.ref), gam = Math.atan2(s.vr, s.vt), offc = Math.abs(cue - s.pitch) / DEG;
      if (s.speed > 30) { const pp = pt(gam, R - 24); c.strokeStyle = AM; c.lineWidth = 2; c.beginPath(); c.arc(pp[0], pp[1], 6, 0, 7); c.stroke(); }
      const b0 = pt(cue, R + 3), b1 = pt(cue + 3.4 * DEG, R + 20), b2 = pt(cue - 3.4 * DEG, R + 20), c1 = pt(cue, R - 44);
      c.fillStyle = offc > 4 ? RD : GR; c.beginPath(); c.moveTo(...b0); c.lineTo(...b1); c.lineTo(...b2); c.fill(); c.strokeStyle = 'rgba(127,224,138,.6)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(...b0); c.lineTo(...c1); c.stroke();
      const e = pt(s.pitch, R - 3); c.strokeStyle = WH; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(...e); c.stroke(); c.lineCap = 'butt'; c.fillStyle = WH; c.beginPath(); c.arc(cx, cy, 5, 0, 7); c.fill();
      txt(`PITCH ${(s.pitch / DEG).toFixed(1)}°\nCUE ${(cue / DEG).toFixed(1)}°`, 248, 506, 13, offc > 4 ? RD : WH, 'right', 700);
    }
    // trajectory: altitude against downrange, the plan and where the vehicle has been
    { const x0 = 1000, y0 = 672, w = 236, h = 132, upS = s.stage >= 1, ref = sc.ref!;
      plate(972, 500, 280, 192); txt('TRAJECTORY', 986, 520, 11, DIM, 'left', 700, 1.5);
      const xm = upS ? ref.pts[ref.pts.length - 1].down * 1.05 : 260e3, ym = upS ? (sc.v.suborbital ? sc.m.hp * 1.5 : Math.max(360e3, sc.m.hp * 1.35)) : 125e3;
      const PX = (d: number) => x0 + clamp(d / xm, 0, 1) * w, PY = (a: number) => y0 - clamp(a / ym, 0, 1) * h;
      c.strokeStyle = LINE; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y0 - h); c.lineTo(x0, y0); c.lineTo(x0 + w, y0); c.stroke();
      txt(`alt ${km(ym)} km`, 1238, 520, 10, DIM, 'right'); txt(`downrange ${km(xm)} km`, 1238, 686, 10, DIM, 'right');
      const line = (all: { down: number; alt: number }[], col: string, wd: number) => { const pts = all.filter((q) => q.down <= xm && q.alt <= ym && q.alt >= 0); c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(PX(q.down), PY(q.alt)) : c.moveTo(PX(q.down), PY(q.alt)))); c.stroke(); };
      line(ref.pts, 'rgba(160,178,214,.75)', 1.2);
      if (sc.p.afts && s.ev.seco === undefined) for (const sg of [-1, 1]) line(ref.pts.map((q) => ({ down: q.down, alt: q.alt + sg * L.corridor(q.alt) })), 'rgba(255,106,80,.8)', 1);
      if (sc.v.suborbital && upS) { const r = sc.m.relAlt!, xa = PX(ref.pts.find((q) => q.t >= ref.ev.seco)!.down); c.fillStyle = 'rgba(127,224,138,.55)'; c.fillRect(xa, PY(r + 2500), x0 + w - xa, Math.max(3, PY(r - 2500) - PY(r + 2500))); }
      if (sc.trail.length > 1) line(sc.trail.map((q) => ({ down: q.d, alt: q.a })), AM, 2.2);
      if (!s.held) { c.fillStyle = WH; c.beginPath(); c.arc(PX(s.down), PY(s.alt), 3.6, 0, 7); c.fill(); }
      if (sc.aftsTxt?.text) txt(sc.aftsTxt.text, 1238, 490, 11, String(sc.aftsTxt.style.color), 'right', 700, 1);
    }
    // what to do, and what was just said
    if (sc.prompt.text) txt(sc.prompt.text, 640, 150, 27, String(sc.prompt.style.color || WH), 'center', 700, 1);
    if (sc.hint.text) txt(sc.hint.text, 640, 178, 14, 'rgba(215,224,244,.95)', 'center', 600, 0.6);
    txt(sc.call.text, 640, 676, 18, AM, 'center', 600, 0.5);
    if (this.tLost >= 0) { for (let i = 0; i < 46; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.8)' : 'rgba(16,19,28,.85)'; c.fillRect(0, Math.random() * 720, 1280, 2 + Math.random() * 16); } }
  }
}
