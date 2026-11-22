import Phaser from 'phaser';
import { W, H, HX } from './core';
import { D, S, C2 } from './art';

// The hi-fi layer: a cinematic look a scrolling level can opt into, without changing how it plays.
// A level's theme names a Look (hifiLooks.ts); the scene makes one HiFi and calls a handful of hooks.
// Everything is still drawn in code. What it adds over the plain renderer:
//   - a deep parallax stack with soft, hazy far layers, light shafts, dust and an out-of-focus foreground;
//   - Light2D lighting on the ground, the hero and the enemies, with normal maps generated from each texture;
//   - contact shadows and floor reflections, and squash, stretch and lean on the hero;
//   - one post pass over the play camera: thresholded bloom, a colour grade, vignette and film grain.
// The HUD moves to its own camera so the post pass never touches it. Without WebGL the art and the
// animation stay and the lighting and post pass are skipped; `?hifi=0` turns the whole layer off.

export const HIFI_OFF = new URLSearchParams(location.search).get('hifi') === '0';

export interface Grade { threshold: number; bloom: number; exposure: number; contrast: number; saturation: number; shadows: [number, number, number]; highs: [number, number, number]; vignette: number; grain: number; fringe: number }
/** `w` is the width in units of the parallax layer a thing rides on (as for a level's own layers); leave it out for world space. */
export interface LayerDef { key: string; w: number; add?: boolean; alpha?: number; depth?: number; y?: number }
export interface LightDef { x: number; y: number; r: number; color: number; i: number; w?: number; flicker?: number }
export interface Look {
  /** Draws this look's textures. Called once, the first time a level uses the look. */
  build(scene: Phaser.Scene): void;
  /** The parallax stack, back to front. */
  layers: LayerDef[];
  /** Tile set: textures `t_<tiles>`, `t_<tiles>_fill` and `p_<tiles>`, the same sizes as the plain ones. */
  tiles: string;
  /** Light2D ambient colour: what an unlit surface is multiplied by. */
  ambient: number;
  lights: LightDef[];
  /** A soft light that follows the hero, so the lead always reads. */
  heroLight?: { r: number; color: number; i: number };
  /** A strip of the scene mirrored into the top of the floor: a texture drawn for the layer `w` wide. */
  reflect?: { key: string; w: number; alpha: number };
  /** Dust in the air: tint and how many motes are alive at once. */
  motes?: { tint: number; count: number };
  grade: Grade;
  /** The look's own moving parts (screens, signs, birds). */
  live?(hf: HiFi): void;
  step?(hf: HiFi, dt: number): void;
}
export interface World { LW: number; TS: number; ground: number[][]; plats: number[][] }

/** Texture resolution (pixels per unit) by key: far layers are drawn coarse on purpose, which reads as depth of field. */
const RES: Record<string, number> = {};
export function texAt(scene: Phaser.Scene, key: string, w: number, h: number, res: number, fn: (c: C2, w: number, h: number) => void) {
  const t = scene.textures.createCanvas(key, Math.ceil(w * res), Math.ceil(h * res))!;
  const c = t.getContext();
  c.scale(res, res); c.lineJoin = 'round'; c.lineCap = 'round';
  fn(c, w, h); t.refresh(); RES[key] = res;
  return t;
}

// ------------------------------------------------------------------ normal maps
const NORMALS = new Set<string>();
/** Gives a texture a normal map made from its own outline: the silhouette is treated as a rounded, raised shape, so lights pick out its edges. */
export function bevelNormals(scene: Phaser.Scene, key: string, depth = 5, strength = 2.4) {
  if (NORMALS.has(key)) return; NORMALS.add(key);
  if (!scene.textures.exists(key)) return;
  const t = scene.textures.get(key), src = t.getSourceImage() as HTMLCanvasElement, w = src.width, h = src.height;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d', { willReadFrequently: true })!; c.drawImage(src, 0, 0);
  const im = c.getImageData(0, 0, w, h), d = im.data;
  let a = new Float32Array(w * h), b = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3] / 255;
  const blur = (from: Float32Array, to: Float32Array, n: number, step: number, lines: number, stride: number) => { // one box-blur pass along one axis
    for (let l = 0; l < lines; l++) {
      let sum = 0; const o = l * stride;
      for (let i = -depth; i <= depth; i++) sum += i >= 0 && i < n ? from[o + i * step] : 0;
      for (let i = 0; i < n; i++) { to[o + i * step] = sum / (depth * 2 + 1); const out = i - depth, inn = i + depth + 1; sum += (inn < n ? from[o + inn * step] : 0) - (out >= 0 ? from[o + out * step] : 0); }
    }
  };
  for (let k = 0; k < 2; k++) { blur(a, b, w, 1, h, w); blur(b, a, h, w, w, 1); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, dx = (x < w - 1 ? a[i + 1] : 0) - (x > 0 ? a[i - 1] : 0), dy = (y < h - 1 ? a[i + w] : 0) - (y > 0 ? a[i - w] : 0);
    const nx = -dx * strength * depth, ny = dy * strength * depth, len = Math.hypot(nx, ny, 1);
    d[i * 4] = (nx / len * 0.5 + 0.5) * 255; d[i * 4 + 1] = (ny / len * 0.5 + 0.5) * 255; d[i * 4 + 2] = (1 / len * 0.5 + 0.5) * 255; d[i * 4 + 3] = 255;
  }
  c.putImageData(im, 0, 0); t.setDataSource(cv);
}
/** Gives a texture a normal map drawn by hand: `fn` paints normals as colours (flat is #8080ff, facing up is greener, facing right is redder). */
export function paintNormals(scene: Phaser.Scene, key: string, fn: (c: C2, w: number, h: number) => void) {
  if (NORMALS.has(key)) return; NORMALS.add(key);
  const src = scene.textures.get(key).getSourceImage() as HTMLCanvasElement, cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
  const c = cv.getContext('2d')!; c.fillStyle = '#8080ff'; c.fillRect(0, 0, cv.width, cv.height); c.scale(D, D); fn(c, cv.width / D, cv.height / D);
  scene.textures.get(key).setDataSource(cv);
}

// ------------------------------------------------------------------ the post pass
const VARY = 'precision mediump float; uniform sampler2D uMainSampler; varying vec2 outTexCoord;';
const BRIGHT = `#define SHADER_NAME HIFI_BRIGHT
${VARY} uniform float uThreshold;
void main () { vec3 c = texture2D(uMainSampler, outTexCoord).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uThreshold, uThreshold + 0.3, l), 1.0); }`;
const BLUR = `#define SHADER_NAME HIFI_BLUR
${VARY} uniform vec2 uDir;
void main () {
  vec4 c = texture2D(uMainSampler, outTexCoord) * 0.227027;
  c += (texture2D(uMainSampler, outTexCoord + uDir * 1.3846) + texture2D(uMainSampler, outTexCoord - uDir * 1.3846)) * 0.316216;
  c += (texture2D(uMainSampler, outTexCoord + uDir * 3.2308) + texture2D(uMainSampler, outTexCoord - uDir * 3.2308)) * 0.070270;
  gl_FragColor = c;
}`;
const FINAL = `#define SHADER_NAME HIFI_FINAL
${VARY} uniform sampler2D uBloom; uniform float uTime; uniform float uBloomAmt; uniform float uExposure; uniform float uContrast; uniform float uSaturation;
uniform vec3 uShadows; uniform vec3 uHighs; uniform float uVignette; uniform float uGrain; uniform float uFringe;
void main () {
  vec2 uv = outTexCoord, d = uv - 0.5; float r2 = dot(d, d);
  vec2 f = d * r2 * uFringe;                                              // a little colour fringing toward the corners, like a real lens
  vec3 col = vec3(texture2D(uMainSampler, uv + f).r, texture2D(uMainSampler, uv).g, texture2D(uMainSampler, uv - f).b);
  col += texture2D(uBloom, uv).rgb * uBloomAmt;
  col *= uExposure;
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col *= mix(uShadows, vec3(1.0), smoothstep(0.0, 0.45, l));               // split toning: shadows one way,
  col *= mix(vec3(1.0), uHighs, smoothstep(0.45, 1.0, l));                 // highlights the other
  col = mix(vec3(l), col, uSaturation);
  col = (col - 0.5) * uContrast + 0.5;
  col = col / (1.0 + max(col - 0.8, 0.0) * 0.9);                           // soft shoulder, so bloom rolls off and never clips flat
  col *= 1.0 - uVignette * smoothstep(0.08, 0.62, r2);
  col += (fract(sin(dot(gl_FragCoord.xy + uTime * 61.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * uGrain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
class HiFiPost extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  grade?: Grade; time = 0;
  constructor(game: Phaser.Game) { super({ game, name: 'HiFiPost', shaders: [{ name: 'bright', fragShader: BRIGHT }, { name: 'blur', fragShader: BLUR }, { name: 'final', fragShader: FINAL }] } as any); }
  onDraw(src: Phaser.Renderer.WebGL.RenderTarget) {
    const g = this.grade, [bright, blur, fin] = this.shaders, a = this.halfFrame1, b = this.halfFrame2;
    if (!g) { this.bindAndDraw(src); return; }
    this.set1f('uThreshold', g.threshold, bright); this.bindAndDraw(src, a, true, true, bright);
    for (const k of [1, 2.2, 4]) { // three widening blurs at half size: a broad, soft glow for the price of a few small passes
      this.set2f('uDir', k / a.width, 0, blur); this.bindAndDraw(a, b, true, true, blur);
      this.set2f('uDir', 0, k / a.height, blur); this.bindAndDraw(b, a, true, true, blur);
    }
    this.time = (this.time + 1 / 60) % 100;
    this.set1i('uBloom', 1, fin); this.set1f('uTime', this.time, fin); this.set1f('uBloomAmt', g.bloom, fin); this.set1f('uExposure', g.exposure, fin); this.set1f('uContrast', g.contrast, fin); this.set1f('uSaturation', g.saturation, fin);
    this.set3f('uShadows', ...g.shadows, fin); this.set3f('uHighs', ...g.highs, fin); this.set1f('uVignette', g.vignette, fin); this.set1f('uGrain', g.grain, fin); this.set1f('uFringe', g.fringe, fin);
    this.bindTexture(a.texture, 1);
    this.bindAndDraw(src, undefined, true, true, fin);
  }
}

// ------------------------------------------------------------------ the layer itself
type Sprite = Phaser.GameObjects.Image;
interface Actor { o: Sprite; lit: boolean; waddle: number; shadow: Sprite; mirror: Sprite; hero?: { px: Sprite; q: number; qv: number; lean: number; down: boolean; vy: number; step: number } }

export class HiFi {
  readonly gl: boolean; readonly tiles: string; t = 0;
  private own = new WeakSet<object>(); private ui?: Phaser.Cameras.Scene2D.Camera; private actors: Actor[] = []; private glows: { o: Sprite; g: Sprite }[] = [];
  private lamps: { l: Phaser.GameObjects.Light; def: LightDef; f: number }[] = []; private heroLamp?: Phaser.GameObjects.Light; private hero?: Sprite; private dust?: Phaser.GameObjects.Particles.ParticleEmitter;
  constructor(readonly scene: Phaser.Scene, readonly look: Look, readonly world: World) {
    this.gl = scene.game.renderer.type === Phaser.WEBGL; this.tiles = look.tiles;
    if (!scene.textures.exists('hf_shadow')) {
      texAt(scene, 'hf_shadow', 24, 6, 2, (c) => { const g = c.createRadialGradient(12, 3, 0, 12, 3, 12); g.addColorStop(0, 'rgba(2,3,10,.75)'); g.addColorStop(0.6, 'rgba(2,3,10,.28)'); g.addColorStop(1, 'rgba(2,3,10,0)'); c.save(); c.translate(0, 2.25); c.scale(1, 0.25); c.fillStyle = g; c.fillRect(0, -9, 24, 24); c.restore(); });
      texAt(scene, 'hf_pit', 4, 36, 2, (c) => { const g = c.createLinearGradient(0, 0, 0, 36); g.addColorStop(0, 'rgba(6,7,16,.0)'); g.addColorStop(0.25, 'rgba(5,6,14,.85)'); g.addColorStop(1, '#030409'); c.fillStyle = g; c.fillRect(0, 0, 4, 36); });
    }
    if (!scene.textures.exists(look.layers[0].key)) look.build(scene);
    if (this.gl) {
      // the HUD gets a camera of its own, so bloom, grade and grain stay on the world; until `ready` sorts them, new objects belong to the play camera
      this.ui = scene.cameras.add(0, 0, W * D, H * D).setZoom(D).setName('hud');
      scene.events.on('addedtoscene', this.claim, this);
      scene.lights.enable().setAmbientColor(look.ambient);
      const pm = (scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
      if (!pm.postPipelineClasses.has('HiFiPost')) pm.addPostPipeline('HiFiPost', HiFiPost);
    }
    scene.events.on('postupdate', this.step, this);
    scene.events.once('shutdown', this.stop, this);
  }
  private claim(o: Phaser.GameObjects.GameObject) { o.cameraFilter |= this.ui!.id; }
  private stop() {
    this.scene.events.off('addedtoscene', this.claim, this); this.scene.events.off('postupdate', this.step, this);
    if (this.gl) this.scene.lights.disable();
    this.actors = []; this.glows = []; this.lamps = [];
  }
  private f(w: number) { return (w - W) / (this.world.LW - W); }
  /** Puts a texture on the parallax layer `w` units wide, at that layer's own coordinates. */
  on(w: number, x: number, y: number, key: string) {
    const f = this.f(w), o = this.scene.add.image(HX * (1 - f) + x, y, key).setScale(1 / (RES[key] || D)).setScrollFactor(f, 1);
    this.own.add(o); return o;
  }
  /** Builds the parallax stack, in place of a theme's plain layers. */
  backdrop() {
    this.look.layers.forEach((l, i) => { const o = this.on(l.w, 0, l.y || 0, l.key).setOrigin(0).setDepth(l.depth ?? -10 + i * 0.5).setAlpha(l.alpha ?? 1); if (l.add) o.setBlendMode('ADD'); });
  }
  private lit(o: Sprite) { if (this.gl) o.setPipeline('Light2D'); return o; }
  /** A soft glow that follows a small bright thing (a pickup, a falling spark) until it is gone. */
  glow(o: Sprite, tint: number, size = 1.6, alpha = 0.5) {
    const g = this.scene.add.image(o.x, o.y, 'puff').setScale(S * size).setTint(tint).setAlpha(this.gl ? alpha : alpha * 0.4).setBlendMode('ADD').setDepth(o.depth - 0.1);
    this.glows.push({ o, g }); return o;
  }
  /** Lights a moving character and gives it a contact shadow and a floor reflection. The hero also gets squash, stretch, lean and dust; `waddle` rocks a walker from foot to foot. */
  actor(o: Sprite, hero = false, waddle = false) {
    const s = this.scene, a: Actor = { o, lit: this.gl, waddle: waddle ? 1 + Math.random() : 0, shadow: s.add.image(o.x, o.y, 'hf_shadow').setScale(0.5).setDepth(0.8).setVisible(false), mirror: s.add.image(o.x, o.y, o.texture.key).setScale(S).setFlipY(true).setDepth(0.7).setVisible(false).setTint(0x8f9fd0) };
    if (hero) { a.hero = { px: this.lit(s.add.image(o.x, o.y, o.texture.key).setScale(S).setOrigin(0.5, 1).setDepth(o.depth)), q: 0, qv: 0, lean: 0, down: true, vy: 0, step: 0 }; o.setVisible(false); this.hero = o; } else this.lit(o);
    this.actors.push(a); return o;
  }
  /** Call once the level is built: sorts the HUD onto its own camera, lights the ground and starts the look. */
  ready(o: { hero: Sprite; solids: Phaser.GameObjects.GameObject[]; props?: Sprite[] }) {
    const s = this.scene, w = this.world, look = this.look, cam = s.cameras.main;
    this.actor(o.hero, true);
    for (const t of o.solids) this.lit(t as Sprite);
    for (const p of o.props || []) { bevelNormals(s, p.texture.key); this.lit(p); }
    // funding gaps: the floor's reflection strip must not shine in the pits
    const spans = [...w.ground].sort((a, b) => a[0] - b[0]);
    let x = 0; for (const [x0, x1] of [...spans, [w.LW / w.TS, 0]]) { if (x0 > x) s.add.image(x * w.TS, H - 36, 'hf_pit').setOrigin(0).setScale(((x0 - x) * w.TS) / 8, 0.5).setDepth(0.6); x = Math.max(x, x1 + 1); }
    if (look.reflect) this.on(look.reflect.w, 0, spans[0][2] * w.TS, look.reflect.key).setOrigin(0).setDepth(0.5).setBlendMode('ADD').setAlpha(look.reflect.alpha);
    if (look.motes) this.own.add(s.add.particles(0, 0, 'puff', { x: { min: 0, max: w.LW }, y: { min: 18, max: 138 }, lifespan: { min: 5000, max: 9000 }, speedX: { min: -3, max: 5 }, speedY: { min: -2.5, max: 1.5 }, scale: { min: S * 0.05, max: S * 0.16 }, alpha: { values: [0, 0.7, 0.5, 0.7, 0] } as any, tint: look.motes.tint, blendMode: 'ADD', frequency: 7000 / look.motes.count, advance: 6000 }).setDepth(7));
    this.dust = s.add.particles(0, 0, 'puff', { speedX: { min: -16, max: 16 }, speedY: { min: -14, max: -3 }, lifespan: { min: 260, max: 460 }, scale: { start: S * 0.22, end: S * 0.6 }, alpha: { start: 0.32, end: 0 }, tint: 0xb8c0dc, emitting: false }).setDepth(4.5);
    if (this.gl) {
      for (const d of look.lights) this.lamps.push({ l: s.lights.addLight(d.x, d.y, d.r, d.color, d.i), def: d, f: d.w ? this.f(d.w) : 1 });
      if (look.heroLight) this.heroLamp = s.lights.addLight(o.hero.x, o.hero.y, look.heroLight.r, look.heroLight.color, look.heroLight.i);
      // everything pinned to the screen is HUD: it leaves the play camera for the HUD camera
      for (const c of s.children.list as any[]) if (c.scrollFactorX === 0 && !this.own.has(c)) c.cameraFilter = cam.id;
      cam.setPostPipeline('HiFiPost'); (cam.getPostPipeline('HiFiPost') as HiFiPost).grade = look.grade;
    }
    look.live?.(this);
  }
  /** Top of the surface under a point, or undefined over a pit; `ground` says whether it is the floor (which reflects) or a platform. */
  private floor(x: number, feet: number): { y: number; ground: boolean } | undefined {
    const w = this.world, tx = x / w.TS; let best: { y: number; ground: boolean } | undefined;
    for (const [px, row, pw] of w.plats) if (tx >= px && tx < px + pw && row * w.TS >= feet - 4 && (!best || row * w.TS < best.y)) best = { y: row * w.TS, ground: false };
    for (const [x0, x1, row] of w.ground) if (tx >= x0 && tx < x1 + 1 && row * w.TS >= feet - 4 && (!best || row * w.TS < best.y)) best = { y: row * w.TS, ground: true };
    return best;
  }
  private step(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000), s = this.scene, view = s.cameras.main.scrollX + HX; this.t += dt;
    for (const { l, def, f } of this.lamps) { l.x = def.x + view * (1 - f); if (def.flicker) l.intensity = def.i * (1 + def.flicker * (Math.sin(this.t * 13 + def.x) * 0.5 + Math.sin(this.t * 31 + def.y) * 0.5)); }
    if (this.heroLamp && this.hero) this.heroLamp.setPosition(this.hero.x, this.hero.y - 8);
    this.glows = this.glows.filter(({ o, g }) => { if (!o.active) { g.destroy(); return false; } g.setPosition(o.x, o.y); return true; });
    this.actors = this.actors.filter((a) => {
      const o = a.o, h = a.hero;
      if (!o.active) { a.shadow.destroy(); a.mirror.destroy(); h?.px.destroy(); return false; }
      const key = o.texture.key, body = o.body as Phaser.Physics.Arcade.Body | null, feet = body ? body.bottom : o.y + o.displayHeight / 2;
      if (a.lit) bevelNormals(s, key);
      if (a.waddle) o.setRotation(Math.sin(this.t * 9 * a.waddle) * 0.05); // rotation only: the physics body does not turn, so nothing about the play changes
      const fl = this.floor(o.x, feet), gap = fl ? Math.max(0, fl.y - feet) : 0, k = 1 / (1 + gap / 26), show = !!fl && o.alpha > 0.5;
      a.shadow.setVisible(show); if (fl) a.shadow.setPosition(o.x, fl.y + 0.4).setScale(0.5 * (o.displayWidth / 22) * (0.55 + 0.45 * k), 0.5).setAlpha(0.9 * k);
      const mir = show && fl!.ground && gap < 40;
      a.mirror.setVisible(mir);
      if (mir) { const fh = o.frame.height, n = Math.min(fh, 13 * D); a.mirror.setTexture(key).setFlipX(o.flipX).setRotation(-o.rotation).setScale(o.scaleX, o.scaleY).setPosition(o.x, 2 * fl!.y - o.y - (fh - n) * o.scaleY).setCrop(0, 0, o.frame.width, n).setAlpha(0.3 * k); }
      if (h) { // the hero is drawn by a stand-in, so squash, stretch and lean never touch the physics body
        const px = h.px, down = !!body?.blocked.down, vx = body?.velocity.x || 0, vy = body?.velocity.y || 0;
        if (down && !h.down) { h.q = -Math.min(0.24, 0.06 + h.vy / 1500); h.qv = 0; this.dust?.emitParticleAt(o.x, feet, 7); }
        if (!down && h.down && vy < -60) { h.q = 0.15; h.qv = 0; this.dust?.emitParticleAt(o.x, feet, 4); }
        h.qv += (-h.q * 260 - h.qv * 17) * dt; h.q += h.qv * dt; h.down = down; h.vy = vy;
        if (down && Math.abs(vx) > 40) { h.step -= dt; if (h.step <= 0) { h.step = 0.24; this.dust?.emitParticleAt(o.x - Math.sign(vx) * 3, feet, 1); } }
        const air = down ? 0 : Phaser.Math.Clamp(Math.abs(vy) / 1800, 0, 0.09), idle = down && Math.abs(vx) < 5 ? Math.sin(this.t * 2.7) * 0.012 : 0;
        h.lean += (Phaser.Math.Clamp(vx / 95, -1, 1) * (down ? 3.5 : 6) - h.lean) * Math.min(1, dt * 12);
        px.setTexture(key).setFlipX(o.flipX).setAlpha(o.alpha).setDepth(o.depth).setVisible(true);
        if (Math.abs(o.angle) > 1) px.setOrigin(0.5).setPosition(o.x, o.y).setAngle(o.angle).setScale(o.scaleX, o.scaleY); // something else is posing the hero (a ride-off): copy it as it is
        else px.setOrigin(0.5, 1).setPosition(o.x, o.y + o.displayHeight / 2).setAngle(h.lean).setScale(o.scaleX * (1 - (h.q + air) * 0.7), o.scaleY * (1 + h.q + air + idle));
      }
      return true;
    });
    this.look.step?.(this, dt);
  }
}

/** The hi-fi layer for a level, or undefined when its theme has no look or the player turned it off with `?hifi=0`. */
export function hifi(scene: Phaser.Scene, look: Look | undefined, world: World) {
  return look && !HIFI_OFF ? new HiFi(scene, look, world) : undefined;
}
