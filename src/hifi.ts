import Phaser from 'phaser';
import { W, H, HX, hifiOn } from './core';
import { D, S, C2, lg, rg } from './art';
import { fxSprite, FxKind } from './hifiFx';

// The hi-fi layer: a cinematic look a level can opt into, without changing how it plays.
// A level's theme names a Look (hifiLooks.ts); the scene makes one HiFi and calls a handful of hooks.
// The engine is the same for every kind of scene. A platform level uses all of it; a single-screen scene (launch control,
// a mini-game) or a ride uses the parts that fit: the post pass, the HUD camera, layers, lights, `swap` and `state`.
// Everything is still drawn in code. What it adds over the plain renderer:
//   - a deep parallax stack with soft, hazy far layers, light shafts, dust and an out-of-focus foreground;
//   - Light2D lighting on the ground, the hero and the enemies, with normal maps generated from each texture;
//   - contact shadows and floor reflections, and squash, stretch and lean on the hero;
//   - one post pass over the play camera: thresholded bloom, a colour grade, vignette and film grain; and, where a look
//     asks: shafts of light that whatever stands before the sun cuts into (`rays`), the sideways streak of a film lens
//     (`Grade.streak`), pressure waves that bend the picture as they pass (`shock`), a camera that shakes (`shake`) and
//     an exposure that is caught out by a sudden light (`flash`);
//   - sprites drawn by a shader of their own (hifiFx.ts): a rocket plume with its shock diamonds (`fx`).
// The HUD moves to its own camera so the post pass never touches it (the map and the title bring their own way: `ownHud`). Without WebGL the art and the
// animation stay and the lighting and post pass are skipped. Players switch it with the Graphics button or G
// (remembered, high by default); `?hifi=0` turns it off for one visit.



export interface Grade { threshold: number; bloom: number; exposure: number; contrast: number; saturation: number; shadows: [number, number, number]; highs: [number, number, number]; vignette: number; grain: number; fringe: number; /** The streak a film lens draws sideways through anything bright (none unless given). */ streak?: number }
type Obj = Phaser.GameObjects.GameObject;
/** `w` is the width in units of the parallax layer a thing rides on (as for a level's own layers); leave it out for world space. */
export interface LayerDef { key: string; w: number; add?: boolean; alpha?: number; depth?: number; y?: number; /** Light it with Light2D, with a normal map from its outline. */ lit?: boolean }
export interface LightDef { x: number; y: number; r: number; color: number; i: number; w?: number; flicker?: number }
/** A light the scene's own things give off, by texture: where it sits on the sprite, its colour and reach; `arc` flashes like a welder. */
export interface FlareDef { dx: number; dy: number; color: number; r: number; i: number; size: number; arc?: boolean }
export interface Look {
  /** Draws this look's textures. Called once, the first time a level uses the look. */
  build(scene: Phaser.Scene): void;
  /** The parallax stack, back to front. A scene that places its own backdrop (launch control) leaves it empty and uses `swap`. */
  layers: LayerDef[];
  /** Tile set (platform levels): textures `t_<tiles>`, `t_<tiles>_fill` and `p_<tiles>`, the same sizes as the plain ones. */
  tiles?: string;
  /** Textures the scene asks for by their plain name and this look redraws: `hf.key('sky_day')` gives the look's own, or the plain one. */
  swap?: Record<string, string>;
  /** Light2D ambient colour: what an unlit surface is multiplied by. Without it nothing is lit. */
  ambient?: number;
  lights?: LightDef[];
  /** Lights for things the scene places (`hf.flare(sprite)`), by texture key. */
  flares?: Record<string, FlareDef>;
  /** Light the scene's standing props (signs, vents, machines) as well as the ground. */
  deco?: boolean;
  /** How strongly the floor mirrors whoever stands on it (0.3 unless given; 0 for grass and dirt). */
  mirror?: number;
  /** The shade laid into the pits between ground spans: 'hf_pit' unless given; null when the look fills them itself (the sea). */
  pit?: string | null;
  /** A soft light that follows the hero, so the lead always reads; `dx`, `dy` set it off to one side (a low sun). */
  heroLight?: { r: number; color: number; i: number; dx?: number; dy?: number };
  /** A strip of the scene mirrored into the top of the floor: a texture drawn for the layer `w` wide. */
  reflect?: { key: string; w: number; alpha: number };
  /** Dust in the air: tint and how many motes are alive at once. */
  motes?: { tint: number; count: number };
  grade: Grade;
  /** The look's own moving parts (screens, signs, birds). */
  live?(hf: HiFi): void;
  step?(hf: HiFi, dt: number): void;
}
/**
 * What the layer needs to know about the level: its width in units (W for a single-screen scene), and whichever of these
 * the scene has: a tile grid (platform levels), or a ground height and its gaps (rides).
 */
export interface World { LW: number; TS?: number; ground?: number[][]; plats?: number[][]; height?: (x: number) => number; gaps?: number[][]; /** The scene already keeps its HUD on a camera of its own (the map): the layer adds none and sorts nothing. */ ownHud?: boolean }

/** Texture resolution (pixels per unit) by key: far layers are drawn coarse on purpose, which reads as depth of field. */
const RES: Record<string, number> = {};
export function texAt(scene: Phaser.Scene, key: string, w: number, h: number, res: number, fn: (c: C2, w: number, h: number) => void) {
  const t = scene.textures.createCanvas(key, Math.ceil(w * res), Math.ceil(h * res))!;
  const c = t.getContext();
  c.scale(res, res); c.lineJoin = 'round'; c.lineCap = 'round';
  fn(c, w, h); t.refresh(); RES[key] = res;
  return t;
}

// ------------------------------------------------------------------ drawing helpers for looks
export const soft = (c: C2, px: number) => { if ('filter' in c) c.filter = px ? `blur(${px}px)` : 'none'; }; // where the browser has no canvas filter, the coarse layer resolution does the softening
export const add = (c: C2, fn: () => void) => { c.save(); c.globalCompositeOperation = 'lighter'; fn(); c.restore(); };
export const halo = (c: C2, x: number, y: number, r: number, rgb: string, a: number) => add(c, () => { c.fillStyle = rg(c, x, y, 0, r, [0, `rgba(${rgb},${a})`], [0.4, `rgba(${rgb},${a * 0.35})`], [1, `rgba(${rgb},0)`]); c.fillRect(x - r, y - r, r * 2, r * 2); });
/** A drawing `w` by `h` units on a canvas of its own, at `res` pixels per unit. */
export function sheet(w: number, h: number, res: number, fn?: (c: C2) => void) {
  const cv = document.createElement('canvas'); cv.width = Math.ceil(w * res); cv.height = Math.ceil(h * res);
  const c = cv.getContext('2d')!; c.scale(res, res); c.lineJoin = 'round'; c.lineCap = 'round'; fn?.(c);
  return cv;
}
/**
 * Relights a drawing for a dark scene: `src` is laid down under the shade `dark`, and again at full strength wherever
 * `pools` paints (any colour: only its alpha counts). Lamps then show the true colours of what is under them.
 */
export function relight(c: C2, src: HTMLCanvasElement, w: number, h: number, dark: string | CanvasGradient, pools: (m: C2) => void) {
  const res = src.width / w;
  c.drawImage(sheet(w, h, res, (a) => { a.drawImage(src, 0, 0, w, h); a.globalCompositeOperation = 'source-atop'; a.fillStyle = dark; a.fillRect(0, 0, w, h); }), 0, 0, w, h);
  c.drawImage(sheet(w, h, res, (b) => { pools(b); b.globalCompositeOperation = 'source-in'; b.drawImage(src, 0, 0, w, h); }), 0, 0, w, h);
}
/** A strip `h` units tall for `Look.reflect`: the band y0..y1 of the given layers squeezed, flipped and faded out with depth. */
export function mirrorStrip(c: C2, scene: Phaser.Scene, keys: string[], w: number, h: number, y0 = 40, y1 = 144) {
  c.save(); c.translate(0, h); c.scale(1, -1);
  for (const key of keys) { const im = scene.textures.get(key).getSourceImage() as HTMLCanvasElement, k = im.width / w; c.drawImage(im, 0, y0 * k, w * k, (y1 - y0) * k, 0, 0, w, h); }
  c.restore();
  c.globalCompositeOperation = 'destination-in'; c.fillStyle = lg(c, 0, 0, 0, h, [0, 'rgba(0,0,0,.95)'], [0.25, 'rgba(0,0,0,.5)'], [1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over';
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
// Shafts of light. Each point looks along its line to the light, over the stretch of it that lies nearest the light: the
// more of that stretch is bright, the more light reaches the point. Whatever stands close before the light (a mast, a
// rocket, the edge of the Earth) so throws a shaft of shadow away from it, and the light wraps round its edges.
const RAYS = `#define SHADER_NAME HIFI_RAYS
${VARY} uniform vec4 uSun; uniform float uTime;
void main () {
  vec2 ar = vec2(1.7778, 1.0), d = outTexCoord - uSun.xy; float far = length(d * ar);
  vec2 stp = d * min(1.0, uSun.z / max(far, 0.0001)) / 32.0;
  vec2 p = uSun.xy + stp * fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime) * 43758.5453);   // a different start for every point: the steps never show as bands
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 32; i++) { acc += texture2D(uMainSampler, p).rgb; p += stp; }
  acc /= 32.0;
  gl_FragColor = vec4(acc * acc * uSun.z / (far + uSun.z) * smoothstep(uSun.w, 0.0, far), 1.0);
}`;
// The streak of an anamorphic lens: what is bright, drawn out a long way sideways and hardly at all up and down. Two
// passes at quarter size, the second with a longer stride, reach a third of the frame for the price of fifty small taps.
const STREAK = `#define SHADER_NAME HIFI_STREAK
${VARY} uniform vec2 uPx;
void main () {
  vec3 c = vec3(0.0); float tw = 0.0;
  for (int i = -12; i <= 12; i++) { float f = float(i), w = exp(-abs(f) / 4.5); c += texture2D(uMainSampler, outTexCoord + vec2(f * uPx.x, 0.0)).rgb * w; tw += w; }
  gl_FragColor = vec4(c / tw * uPx.y, 1.0);
}`;
const FINAL = `#define SHADER_NAME HIFI_FINAL
${VARY} uniform sampler2D uBloom; uniform sampler2D uRays; uniform sampler2D uStreaks; uniform float uTime; uniform float uBloomAmt; uniform float uExposure; uniform float uContrast; uniform float uSaturation;
uniform vec3 uShadows; uniform vec3 uHighs; uniform float uVignette; uniform float uGrain; uniform float uFringe; uniform vec4 uHeat;
uniform vec3 uRayCol; uniform float uStreak; uniform vec3 uShake; uniform vec4 uShock0; uniform vec4 uShock1; uniform vec4 uShock2;
vec2 wave (vec2 uv, vec4 s) {                                             // a pressure wave: a ring that pushes the picture outward as it passes
  vec2 d = (uv - s.xy) * vec2(1.7778, 1.0); float r = length(d) - s.z;
  return s.w * r * exp(-r * r * 700.0) * d / (length(d) + 0.0001) * vec2(0.5625, 1.0);
}
void main () {
  vec2 uv = (outTexCoord - 0.5) * (1.0 - uShake.z) + 0.5 + uShake.xy;      // the camera shakes here, after the HUD has gone its own way: the instruments hold still
  uv -= wave(uv, uShock0) + wave(uv, uShock1) + wave(uv, uShock2);
  float hk = uHeat.w * smoothstep(uHeat.z, 0.0, length((uv - uHeat.xy) * vec2(1.7778, 1.0)));   // hot air over a flame bends what is behind it
  uv += hk * vec2(sin(uv.y * 110.0 - uTime * 31.0) + sin(uv.y * 47.0 + uTime * 19.0), cos(uv.x * 83.0 - uTime * 23.0)) * 0.0022;
  vec2 d = uv - 0.5; float r2 = dot(d, d);
  vec2 f = d * r2 * uFringe;                                              // a little colour fringing toward the corners, like a real lens
  vec3 col = vec3(texture2D(uMainSampler, uv + f).r, texture2D(uMainSampler, uv).g, texture2D(uMainSampler, uv - f).b);
  vec3 glow = texture2D(uBloom, uv).rgb;
  col += glow * uBloomAmt;
  col += texture2D(uRays, uv).rgb * uRayCol;
  col += max(texture2D(uStreaks, uv).rgb - glow * 0.9, 0.0) * uStreak * vec3(0.55, 0.78, 1.0);   // the streak belongs to small bright things, not to a bright sky; it runs cool, as it does through real glass
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
  grade?: Grade; time = 0; heat = [0.5, 0.5, 0.1, 0];
  /** Shafts of light: where the light is on screen, how big it is and how far from it shafts are seen (both in screen heights), then their colour (black is off). */
  sun = [0.5, 0.5, 0.12, 1.2, 0, 0, 0];
  shake = [0, 0, 0]; flash = 0; /** The lens streak for now, where the look moves it; the grade's own otherwise. */ streak?: number; shocks = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  constructor(game: Phaser.Game) { super({ game, name: 'HiFiPost', renderTarget: [{ scale: 1 }, { scale: 0.5 }, { scale: 0.25 }, { scale: 0.25 }], shaders: [{ name: 'bright', fragShader: BRIGHT }, { name: 'blur', fragShader: BLUR }, { name: 'final', fragShader: FINAL }, { name: 'rays', fragShader: RAYS }, { name: 'streak', fragShader: STREAK }] } as any); }
  onDraw(src: Phaser.Renderer.WebGL.RenderTarget) {
    const g = this.grade, [bright, blur, fin, rays, streak] = this.shaders, a = this.halfFrame1, b = this.halfFrame2, [, c, q1, q2] = this.renderTargets, sun = this.sun, sk = this.streak ?? g?.streak ?? 0;
    if (!g) { this.bindAndDraw(src); return; }
    this.time = (this.time + 1 / 60) % 100;
    this.set1f('uThreshold', g.threshold, bright); this.bindAndDraw(src, a, true, true, bright);
    const lit = sun[4] + sun[5] + sun[6] > 0;                              // the shafts are cut from what is bright before it is blurred, so a mast or a rocket throws a clean one
    if (lit) { this.set4f('uSun', sun[0], sun[1], sun[2], sun[3], rays); this.set1f('uTime', this.time, rays); this.bindAndDraw(a, c, true, true, rays); }
    if (sk) { this.set2f('uPx', 1.5 / q1.width, 1, streak); this.bindAndDraw(a, q1, true, true, streak); this.set2f('uPx', 5 / q1.width, 7, streak); this.bindAndDraw(q1, q2, true, true, streak); }
    for (const k of [1, 2.2, 4]) { // three widening blurs at half size: a broad, soft glow for the price of a few small passes
      this.set2f('uDir', k / a.width, 0, blur); this.bindAndDraw(a, b, true, true, blur);
      this.set2f('uDir', 0, k / a.height, blur); this.bindAndDraw(b, a, true, true, blur);
    }
    this.set1i('uBloom', 1, fin); this.set1i('uRays', 2, fin); this.set1i('uStreaks', 3, fin);
    this.set1f('uTime', this.time, fin); this.set1f('uBloomAmt', g.bloom, fin); this.set1f('uExposure', g.exposure * (1 + this.flash), fin); this.set1f('uContrast', g.contrast, fin); this.set1f('uSaturation', g.saturation, fin);
    this.set3f('uShadows', ...g.shadows, fin); this.set3f('uHighs', ...g.highs, fin); this.set1f('uVignette', g.vignette, fin); this.set1f('uGrain', g.grain, fin); this.set1f('uFringe', g.fringe, fin); this.set4f('uHeat', this.heat[0], this.heat[1], this.heat[2], this.heat[3], fin);
    this.set3f('uRayCol', lit ? sun[4] : 0, lit ? sun[5] : 0, lit ? sun[6] : 0, fin); this.set1f('uStreak', sk, fin); this.set3f('uShake', this.shake[0], this.shake[1], this.shake[2], fin);
    this.shocks.forEach((s, i) => this.set4f('uShock' + i, s[0], s[1], s[2], s[3], fin));
    this.bindTexture(a.texture, 1); this.bindTexture(c.texture, 2); this.bindTexture(q2.texture, 3);
    this.bindAndDraw(src, undefined, true, true, fin);
  }
}

// ------------------------------------------------------------------ the layer itself
type Sprite = Phaser.GameObjects.Image;
const BUILT = new Set<Look>();
interface Actor { o: Sprite; lit: boolean; waddle: number; shadow: Sprite; mirror: Sprite; hero?: { px: Sprite; q: number; qv: number; lean: number; down: boolean; vy: number; step: number } }

export class HiFi {
  readonly gl: boolean; readonly tiles: string; t = 0;
  /** What the scene tells its look each step (`set`): numbers such as altitude, chamber pressure or the rider's position. */
  readonly state: Record<string, number> = {};
  private own = new WeakSet<object>(); private ui?: Phaser.Cameras.Scene2D.Camera; private actors: Actor[] = []; private glows: { o: Sprite; g: Sprite }[] = [];
  private lamps: { l: Phaser.GameObjects.Light; def: LightDef; f: number; k: number }[] = []; private heroLamp?: Phaser.GameObjects.Light; private hero?: Sprite; private dust?: Phaser.GameObjects.Particles.ParticleEmitter;
  private flaring: { g: Sprite; l?: Phaser.GameObjects.Light; d: FlareDef; ph: number }[] = []; private still: boolean; private sorted = false; private lateHud = false; private post?: HiFiPost;
  private sunAt?: number[]; private lens?: number; private trauma = 0; private glare = 0; private waves: { x: number; y: number; power: number; age: number }[] = []; private drawn: Sprite[] = [];
  constructor(readonly scene: Phaser.Scene, readonly look: Look, readonly world: World) {
    this.gl = scene.game.renderer.type === Phaser.WEBGL; this.tiles = look.tiles || ''; this.still = world.LW <= W;
    if (!scene.textures.exists('hf_shadow')) {
      texAt(scene, 'hf_shadow', 24, 6, 2, (c) => { const g = c.createRadialGradient(12, 3, 0, 12, 3, 12); g.addColorStop(0, 'rgba(2,3,10,.75)'); g.addColorStop(0.6, 'rgba(2,3,10,.28)'); g.addColorStop(1, 'rgba(2,3,10,0)'); c.save(); c.translate(0, 2.25); c.scale(1, 0.25); c.fillStyle = g; c.fillRect(0, -9, 24, 24); c.restore(); });
      texAt(scene, 'hf_px', 1, 1, 4, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 1, 1); });
      texAt(scene, 'hf_pit', 4, 36, 2, (c) => { const g = c.createLinearGradient(0, 0, 0, 36); g.addColorStop(0, 'rgba(6,7,16,.0)'); g.addColorStop(0.25, 'rgba(5,6,14,.85)'); g.addColorStop(1, '#030409'); c.fillStyle = g; c.fillRect(0, 0, 4, 36); });
    }
    if (!BUILT.has(look)) { BUILT.add(look); look.build(scene); }
    if (this.gl) {
      // the HUD gets a camera of its own, so bloom, grade and grain stay on the world; until `ready` sorts them, new objects belong to the play camera
      if (!world.ownHud) {
        this.ui = scene.cameras.add(0, 0, W * D, H * D).setZoom(D).setName('hud');
        if (this.still) this.ui.centerOn(W / 2, H / 2); // a single-screen scene draws its HUD in world units, like everything else in it
        scene.events.on('addedtoscene', this.claim, this);
      }
      if (look.ambient !== undefined) scene.lights.enable().setAmbientColor(look.ambient);
      const pm = (scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
      if (!pm.postPipelineClasses.has('HiFiPost')) pm.addPostPipeline('HiFiPost', HiFiPost);
    }
    scene.events.on('postupdate', this.step, this);
    scene.events.once('shutdown', this.stop, this);
  }
  private claim(o: Obj) { o.cameraFilter |= this.sorted && this.lateHud ? this.scene.cameras.main.id : this.ui!.id; }
  /** The look's own texture for a plain one, where it has redrawn it. */
  key(k: string) { return this.look.swap?.[k] ?? k; }
  /** The scene's numbers for this step, for the look to animate from. */
  set(o: Record<string, number>) { Object.assign(this.state, o); }
  /** Things of the scene's that a look may need to find: the scene names them (`tag`), the look slips its own in above or below one. */
  readonly tags: Record<string, Obj> = {};
  tag(o: Record<string, Obj>) { Object.assign(this.tags, o); }
  above<T extends Obj>(o: T, name: string) { return this.beside(o, name, 1); }
  below<T extends Obj>(o: T, name: string) { return this.beside(o, name, 0); }
  private beside<T extends Obj>(o: T, name: string, after: number) { // Phaser's own moveAbove leaves a thing where it is when it is already somewhere above
    const l = this.scene.children, t = this.tags[name]; if (!t || !l.exists(t) || !l.exists(o)) return o;
    const at = l.getIndex(t), cur = l.getIndex(o); l.moveTo(o as Obj, Math.min(l.length - 1, at + after - (cur < at ? 1 : 0)));
    return o;
  }
  /** Sends things to the HUD camera, out of reach of the post pass. Scenes without scroll factors (single-screen ones) name their HUD this way. */
  hud(...list: (Obj | undefined)[]) { if (this.ui) for (const o of list) if (o) o.cameraFilter = this.scene.cameras.main.id; }
  /** Lights a sprite with Light2D, with a normal map made from its outline. */
  shade(o: Sprite, depth?: number, strength?: number) { if (this.gl && this.look.ambient !== undefined) { bevelNormals(this.scene, o.texture.key, depth, strength); o.setPipeline('Light2D'); } return o; }
  /** Turns one of the look's lights up or down (1 is as written). */
  power(i: number, k: number) { if (this.lamps[i]) this.lamps[i].k = k; }
  /** Hot air: bends the picture round a point in the world, `r` units wide; `amt` 0 switches it off. */
  heat(x: number, y: number, r: number, amt: number) { const v = this.scene.cameras.main.worldView; if (this.post) this.post.heat = [(x - v.x) / v.width, 1 - (y - v.y) / v.height, r / v.height, amt]; }
  /**
   * Shafts of light from a point in the world (the sun, a floodlight, a plume in the dark), in `tint` at strength `amt`.
   * Whatever stands between the light and the eye cuts into them. `size` is how big the light itself is, in units: only
   * what is bright within it counts as the light. `reach` is how far from it shafts show, in screen heights. `amt` 0 switches them off.
   */
  rays(x: number, y: number, amt: number, tint = 0xffffff, size = 22, reach = 1.2) { this.sunAt = amt > 0 ? [x, y, reach, ((tint >> 16) & 255) / 255 * amt, ((tint >> 8) & 255) / 255 * amt, (tint & 255) / 255 * amt, size] : undefined; }
  /** A pressure wave from a point in the world: a ring that bends the picture as it travels out. Three at a time. */
  shock(x: number, y: number, power = 1) { this.waves.push({ x, y, power, age: 0 }); if (this.waves.length > 3) this.waves.shift(); }
  /** Shakes the picture, never the HUD and never the scene's camera: 0 to 1, and it dies away by itself. Call it each step for a rumble that lasts. */
  shake(k: number) { this.trauma = Math.max(this.trauma, Math.min(1, k)); }
  /** The lens streak, where a look moves it as the scene darkens or brightens (`Grade.streak` is where it starts). */
  streak(k: number) { this.lens = k; }
  /** A sudden light that catches the exposure out (1 doubles it); it settles within the second. */
  flash(k: number) { this.glare = Math.max(this.glare, k); }
  /**
   * A sprite drawn by a shader of its own (hifiFx.ts), `w` by `h` units: place, turn, tint and fade it like any image, and
   * hand it its numbers with `fxSet()`. Without WebGL there is none, and the look keeps its plain stand-in.
   */
  fx(kind: FxKind, x: number, y: number, w: number, h: number) { if (!this.gl) return undefined; const o = fxSprite(this.scene, kind, x, y, w, h); this.drawn.push(o); return o; }
  private stop() {
    this.scene.events.off('addedtoscene', this.claim, this); this.scene.events.off('postupdate', this.step, this);
    if (this.gl && this.look.ambient !== undefined) this.scene.lights.disable();
    this.actors = []; this.glows = []; this.lamps = []; this.flaring = []; this.waves = []; this.drawn = []; this.post = undefined;
  }
  /** Scroll factor of a layer `w` units wide: just fast enough to show all of itself over the level. */
  f(w: number) { return this.still ? 1 : (w - W) / (this.world.LW - W); }
  /** Puts a texture on the parallax layer `w` units wide, at that layer's own coordinates. */
  on(w: number, x: number, y: number, key: string) {
    const f = this.f(w), o = this.scene.add.image(HX * (1 - f) + x, y, key).setScale(1 / (RES[key] || D)).setScrollFactor(f, 1);
    this.own.add(o); return o;
  }
  /** Builds the parallax stack, in place of a theme's plain layers. */
  backdrop() {
    this.look.layers.forEach((l, i) => { const o = this.on(l.w, 0, l.y || 0, l.key).setOrigin(0).setDepth(l.depth ?? -10 + i * 0.5).setAlpha(l.alpha ?? 1); if (l.add) o.setBlendMode('ADD'); if (l.lit) this.shade(o); });
  }
  private lit(o: Sprite) { if (this.gl && this.look.ambient !== undefined) o.setPipeline('Light2D'); return o; }
  /** A soft glow that follows a small bright thing (a pickup, a falling spark) until it is gone. */
  glow(o: Sprite, tint: number, size = 1.6, alpha = 0.5) {
    const g = this.scene.add.image(o.x, o.y, 'puff').setScale(S * size).setTint(tint).setAlpha(this.gl ? alpha : alpha * 0.4).setBlendMode('ADD').setDepth(o.depth - 0.1);
    this.glows.push({ o, g }); return o;
  }
  /** Gives one of the scene's own things its light, if the look has one for its texture (a welding arm's arc, a vent's lamp). */
  flare(o: Sprite) {
    const d = this.look.flares?.[o.texture.key]; if (!d) return o;
    const x = o.x + d.dx, y = o.y + d.dy, g = this.scene.add.image(x, y, 'puff').setScale(S * d.size).setTint(d.color).setBlendMode('ADD').setDepth(o.depth + 0.1);
    this.flaring.push({ g, d, ph: x * 0.37, l: d.i > 0 && this.gl && this.look.ambient !== undefined ? this.scene.lights.addLight(x, y, d.r, d.color, d.i) : undefined });
    return o;
  }
  /** Lights a moving character and gives it a contact shadow and a floor reflection. The hero also gets squash, stretch, lean and dust; `waddle` rocks a walker from foot to foot. */
  actor(o: Sprite, hero = false, waddle = false) {
    const s = this.scene, a: Actor = { o, lit: this.gl, waddle: waddle ? 1 + Math.random() : 0, shadow: s.add.image(o.x, o.y, 'hf_shadow').setScale(0.5).setDepth(0.8).setVisible(false), mirror: s.add.image(o.x, o.y, o.texture.key).setScale(S).setFlipY(true).setDepth(0.7).setVisible(false).setTint(0x8f9fd0) };
    if (hero) { a.hero = { px: this.lit(s.add.image(o.x, o.y, o.texture.key).setScale(S).setOrigin(0.5, 1).setDepth(o.depth)), q: 0, qv: 0, lean: 0, down: true, vy: 0, step: 0 }; o.setVisible(false); this.hero = o; } else this.lit(o);
    this.actors.push(a); return o;
  }
  /** The pits between ground spans of a tile level, as [x0, x1] in units. */
  pits() {
    const w = this.world, out: number[][] = []; if (!w.ground || !w.TS) return out;
    let x = 0; for (const [x0, x1] of [...[...w.ground].sort((a, b) => a[0] - b[0]), [w.LW / w.TS, 0]]) { if (x0 > x) out.push([x * w.TS, x0 * w.TS]); x = Math.max(x, x1 + 1); }
    return out;
  }
  /**
   * Call once the scene is built: sorts the HUD onto its own camera, lights the ground and starts the look.
   * A platform level gives its `hero`, `solids` and `props`. Any scene can name its HUD with `hud`; `lateHud` says that whatever
   * the scene adds from now on is HUD too (launch control's later panels), where the default is that it belongs to the world.
   */
  ready(o: { hero?: Sprite; solids?: Obj[]; props?: Sprite[]; deco?: Sprite[]; hud?: (Obj | undefined)[]; lateHud?: boolean } = {}) {
    const s = this.scene, w = this.world, look = this.look, cam = s.cameras.main;
    if (o.hero) this.actor(o.hero, true);
    for (const t of o.solids || []) this.lit(t as Sprite);
    for (const p of [...(o.props || []), ...(look.deco ? o.deco || [] : [])]) { bevelNormals(s, p.texture.key); this.lit(p); }
    // pits: the floor's reflection strip must not shine in them
    const pit = look.pit === undefined ? 'hf_pit' : look.pit;
    if (pit) for (const [x0, x1] of this.pits()) s.add.image(x0, H - 36, pit).setOrigin(0).setScale((x1 - x0) / 8, 0.5).setDepth(0.6);
    if (look.reflect && w.ground && w.TS) this.on(look.reflect.w, 0, w.ground[0][2] * w.TS, look.reflect.key).setOrigin(0).setDepth(0.5).setBlendMode('ADD').setAlpha(look.reflect.alpha);
    if (look.motes) this.own.add(s.add.particles(0, 0, 'puff', { x: { min: 0, max: w.LW }, y: { min: 18, max: 138 }, lifespan: { min: 5000, max: 9000 }, speedX: { min: -3, max: 5 }, speedY: { min: -2.5, max: 1.5 }, scale: { min: S * 0.05, max: S * 0.16 }, alpha: { values: [0, 0.7, 0.5, 0.7, 0] } as any, tint: look.motes.tint, blendMode: 'ADD', frequency: 7000 / look.motes.count, advance: 6000 }).setDepth(7));
    if (o.hero) this.dust = s.add.particles(0, 0, 'puff', { speedX: { min: -16, max: 16 }, speedY: { min: -14, max: -3 }, lifespan: { min: 260, max: 460 }, scale: { start: S * 0.22, end: S * 0.6 }, alpha: { start: 0.32, end: 0 }, tint: 0xb8c0dc, emitting: false }).setDepth(4.5);
    if (this.gl) {
      if (look.ambient !== undefined) for (const d of look.lights || []) this.lamps.push({ l: s.lights.addLight(d.x, d.y, d.r, d.color, d.i), def: d, f: d.w ? this.f(d.w) : 1, k: 1 });
      if (look.heroLight && look.ambient !== undefined) this.heroLamp = s.lights.addLight(o.hero?.x || 0, o.hero?.y || 0, look.heroLight.r, look.heroLight.color, look.heroLight.i);
      // everything pinned to the screen is HUD: it leaves the play camera for the HUD camera
      if (this.ui) for (const c of s.children.list as any[]) if (c.scrollFactorX === 0 && !this.own.has(c)) c.cameraFilter = cam.id;
      this.hud(...(o.hud || []));
      cam.setPostPipeline('HiFiPost'); this.post = cam.getPostPipeline('HiFiPost') as HiFiPost; this.post.grade = look.grade; this.post.heat = [0.5, 0.5, 0.1, 0]; this.post.sun = [0.5, 0.5, 0.12, 1.2, 0, 0, 0]; this.post.shake = [0, 0, 0]; this.post.flash = 0; this.post.streak = undefined; this.post.shocks = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    }
    look.live?.(this);
    this.sorted = true; this.lateHud = !!o.lateHud; // the look's own things are world; what the scene adds later is as it said
  }
  /** Top of the surface under a point, or undefined over a pit; `ground` says whether it is the floor (which reflects) or a platform. */
  private floor(x: number, feet: number): { y: number; ground: boolean } | undefined {
    const w = this.world, TS = w.TS || 16, tx = x / TS; let best: { y: number; ground: boolean } | undefined;
    for (const [px, row, pw] of w.plats || []) if (tx >= px && tx < px + pw && row * TS >= feet - 4 && (!best || row * TS < best.y)) best = { y: row * TS, ground: false };
    for (const [x0, x1, row] of w.ground || []) if (tx >= x0 && tx < x1 + 1 && row * TS >= feet - 4 && (!best || row * TS < best.y)) best = { y: row * TS, ground: true };
    return best;
  }
  private step(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000), s = this.scene, view = s.cameras.main.scrollX + HX; this.t += dt;
    for (const { l, def, f, k } of this.lamps) { l.x = def.x + view * (1 - f); l.intensity = def.i * k * (def.flicker ? 1 + def.flicker * (Math.sin(this.t * 13 + def.x) * 0.5 + Math.sin(this.t * 31 + def.y) * 0.5) : 1); }
    if (this.heroLamp) { const hl = this.look.heroLight!; if (this.hero) this.heroLamp.setPosition(this.hero.x + (hl.dx || 0), this.hero.y + (hl.dy ?? -8)); else if (this.state.x !== undefined) this.heroLamp.setPosition(this.state.x + (hl.dx || 0), this.state.y + (hl.dy || 0)); } // a scene without a hero sprite gives the lead's place as state x, y
    for (const { g, l, d, ph } of this.flaring) { // an arc spits in bursts; anything else breathes
      const k = d.arc ? Math.max(0, Math.sin(this.t * 2.1 + ph)) * (0.35 + 0.65 * Math.abs(Math.sin(this.t * 47 + ph) * Math.sin(this.t * 29 + ph * 2))) : 0.85 + 0.15 * Math.sin(this.t * 3 + ph);
      g.setAlpha(k * 0.9).setScale(S * d.size * (0.7 + 0.5 * k)); if (l) l.intensity = d.i * k;
    }
    this.glows = this.glows.filter(({ o, g }) => { if (!o.active) { g.destroy(); return false; } g.setPosition(o.x, o.y); return true; });
    const mirror = this.look.mirror ?? 0.3;
    this.actors = this.actors.filter((a) => {
      const o = a.o, h = a.hero;
      if (!o.active) { a.shadow.destroy(); a.mirror.destroy(); h?.px.destroy(); return false; }
      const key = o.texture.key, body = o.body as Phaser.Physics.Arcade.Body | null, feet = body ? body.bottom : o.y + o.displayHeight / 2;
      if (a.lit) bevelNormals(s, key);
      if (a.waddle) o.setRotation(Math.sin(this.t * 9 * a.waddle) * 0.05); // rotation only: the physics body does not turn, so nothing about the play changes
      const fl = this.floor(o.x, feet), gap = fl ? Math.max(0, fl.y - feet) : 0, k = 1 / (1 + gap / 26), show = !!fl && o.alpha > 0.5;
      a.shadow.setVisible(show); if (fl) a.shadow.setPosition(o.x, fl.y + 0.4).setScale(0.5 * (o.displayWidth / 22) * (0.55 + 0.45 * k), 0.5).setAlpha(0.9 * k);
      const mir = show && fl!.ground && gap < 40 && mirror > 0;
      a.mirror.setVisible(mir);
      if (mir) { const fh = o.frame.height, n = Math.min(fh, 13 * D); a.mirror.setTexture(key).setFlipX(o.flipX).setRotation(-o.rotation).setScale(o.scaleX, o.scaleY).setPosition(o.x, 2 * fl!.y - o.y - (fh - n) * o.scaleY).setCrop(0, 0, o.frame.width, n).setAlpha(mirror * k); }
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
    this.drawn = this.drawn.filter((o) => { if (!o.active) return false; (o.pipelineData as any).t = this.t; return true; });
    const p = this.post; if (!p) return;
    const v = s.cameras.main.worldView, sx = (x: number) => (x - v.x) / v.width, sy = (y: number) => 1 - (y - v.y) / v.height, q = this.trauma * this.trauma, t = this.t;
    p.sun = this.sunAt ? [sx(this.sunAt[0]), sy(this.sunAt[1]), this.sunAt[6] / v.height, this.sunAt[2], this.sunAt[3], this.sunAt[4], this.sunAt[5]] : [0.5, 0.5, 0.12, 1.2, 0, 0, 0];
    p.shake = [q * 0.0045 * (Math.sin(t * 67) + Math.sin(t * 41.3 + 1)), q * 0.006 * (Math.sin(t * 59 + 2) + Math.sin(t * 33.7)), q * 0.026]; // zoomed in a little while it shakes, so no edge shows
    this.trauma = Math.max(0, this.trauma - dt * 1.6); this.glare *= Math.exp(-dt * 6); p.flash = this.glare; p.streak = this.lens;
    this.waves = this.waves.filter((w) => (w.age += dt) < 1.5);
    p.shocks = [0, 1, 2].map((i) => { const w = this.waves[i]; return w ? [sx(w.x), sy(w.y), 0.02 + w.age * 0.95, w.power * (1 - w.age / 1.5) ** 2] : [0, 0, 0, 0]; });
  }
}

/** The hi-fi layer for a level, or undefined when its theme has no look or the player chose standard graphics. A single-screen scene leaves `world` out. */
export function hifi(scene: Phaser.Scene, look: Look | undefined, world: World = { LW: W }) {
  return look && hifiOn() ? new HiFi(scene, look, world) : undefined;
}
