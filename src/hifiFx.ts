import Phaser from 'phaser';

// Sprites drawn by a shader of their own: the parts of a hi-fi look that no still drawing can be, because they never hold
// still (a rocket plume). Each is an ordinary image on a one-colour texture, so a look places, turns, layers, tints and
// fades it like any other; its pipeline swaps the fragment shader for one that draws the thing from nothing, from the
// eight numbers `fxSet()` hands it and the scene's own clock. WebGL only: `HiFi.fx()` gives none without it.

const HEAD = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMainSampler; uniform float uTime; uniform vec4 uA; uniform vec4 uB;
varying vec2 outTexCoord; varying vec4 outTint;
float hash (vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise (vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm (vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; } return s; }
`;

const FX = {
  // A rocket plume, from the nozzles (the top edge of the sprite) down its length.
  // A: throttle; how thin the air is (0 at the pad, 1 in space); how far down the ground cuts it off (1 or more: not at all); a seed.
  // B: how strongly the shock diamonds show; how closely they are spaced (1 unless given: one every eleventh of the sprite).
  // In thick air the jet is a pencil: the air squeezes it and lets it go again, over and over, and each squeeze is a bright
  // knot (a shock diamond). As the air thins there is less and less to hold it in: it swells into a wide, pale bell.
  plume: `
void main () {
  float x = (outTexCoord.x - 0.5) * 2.0, y = outTexCoord.y, thr = uA.x, thin = uA.y, t = uTime + uA.w;
  float n1 = fbm(vec2(x * 2.4, y * 5.0 - t * 8.0)), n2 = fbm(vec2(x * 5.0 + 9.0, y * 11.0 - t * 15.0));   // turbulence, carried down the jet
  float dia = (1.0 - thin) * exp(-y * 3.4) * uB.x, ph = y * 70.0 * (uB.y > 0.0 ? uB.y : 1.0) - 1.4, sq = cos(ph);
  float w = mix(0.15 + 0.2 * pow(y, 0.8), 0.16 + 0.9 * pow(y, 0.55), thin) * (1.0 - 0.3 * dia * sq);
  float r = abs(x) / w + (n1 - 0.5) * 0.8 * smoothstep(0.03, 0.4, y);
  float len = mix(0.5, 1.0, thr);
  float along = smoothstep(0.0, 0.01, y) * (1.0 - smoothstep(len * 0.3, len, y + (n2 - 0.5) * 0.3));
  float body = (1.0 - smoothstep(0.25, 1.0, r)) * along, core = exp(-r * r * 8.0) * along * (1.0 - 0.75 * smoothstep(0.0, len * 0.6, y));
  float knots = pow(max(0.0, sq), 2.0) * dia * exp(-r * r * 5.0);
  vec3 hot = mix(vec3(1.0, 0.24, 0.03), vec3(1.0, 0.6, 0.14), smoothstep(0.0, 0.7, body));                // soot burning in the air: red at the edge, orange, then yellow
  hot = mix(hot, vec3(1.0, 0.82, 0.42), smoothstep(0.1, 0.8, core));
  hot = mix(hot, vec3(1.0, 1.0, 0.95), clamp(knots * 1.5 + core * (1.0 - dia) * 0.8 + smoothstep(0.1, 0.0, y) * core, 0.0, 1.0));
  hot *= 1.0 - 0.3 * dia * (1.0 - knots) * smoothstep(0.0, 0.06, y);                                      // between the diamonds the jet is a little darker, so they show
  float exit = exp(-r * r * 3.0) * smoothstep(0.0, 0.01, y) * exp(-y * 9.0);                              // in space the flame is brightest where it leaves the nozzle
  vec3 cold = mix(vec3(0.4, 0.58, 1.0), vec3(0.92, 0.96, 1.0), clamp(core + exit, 0.0, 1.0));             // no air to burn the soot in: a pale ghost of a flame
  float ghost = smoothstep(0.25, 0.95, thin);
  vec3 col = mix(hot, cold, ghost) * outTint.bgr;
  float flick = 0.93 + 0.07 * sin(t * 61.0) * sin(t * 37.0), power = (0.6 + 0.4 * thr) * flick;
  float glow = mix(0.5 + 0.5 * body + 0.5 * core + knots, body * 0.42 + core * 0.9 + exit * 1.6, ghost) * power;
  float solid = body * mix(0.92, 0.0, ghost);                                                             // at the pad it hides what is behind it; in space it is only light
  float halo = exp(-r * r * 0.22) * along * mix(0.16, 0.05, ghost) * power;                               // the air round it, lit
  float cut = 1.0 - smoothstep(uA.z - 0.04, uA.z + 0.02, y);
  gl_FragColor = (vec4(col * glow * max(solid, max(body, exit * ghost)), solid) + vec4(mix(vec3(1.0, 0.5, 0.16), vec3(0.5, 0.66, 1.0), ghost) * outTint.bgr * halo, 0.0)) * cut * outTint.a;
}`,
};
export type FxKind = keyof typeof FX;

class FxPipe extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
  constructor(game: Phaser.Game, kind: FxKind) { super({ game, name: 'HiFiFx_' + kind, fragShader: `#define SHADER_NAME HIFI_FX_${kind.toUpperCase()}\n${HEAD}${FX[kind]}` } as any); }
  onBind(o?: Phaser.GameObjects.GameObject) { const d = (o as any)?.pipelineData; if (!d?.a) return; this.set1f('uTime', d.t); this.set4f('uA', d.a[0], d.a[1], d.a[2], d.a[3]); this.set4f('uB', d.b[0], d.b[1], d.b[2], d.b[3]); }
  onBatch(o?: Phaser.GameObjects.GameObject) { if (o) this.flush(); } // one sprite, one draw: each has its own numbers
}

/** An image drawn by the shader `kind`, `w` by `h` units. The scene must be on WebGL. */
export function fxSprite(scene: Phaser.Scene, kind: FxKind, x: number, y: number, w: number, h: number) {
  const pm = (scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines, name = 'HiFiFx_' + kind;
  if (!pm.has(name)) pm.add(name, new FxPipe(scene.game, kind));
  const o = scene.add.image(x, y, 'hf_px').setDisplaySize(w, h).setPipeline(name);
  o.pipelineData = { t: 0, a: [0, 0, 0, 0], b: [0, 0, 0, 0] };
  return o;
}
/** Hands a shader sprite its numbers: up to eight, in the order its shader lists them (A, then B). */
export function fxSet(o: Phaser.GameObjects.Image | undefined, ...n: number[]) {
  if (!o) return; const d = o.pipelineData as { a: number[]; b: number[] };
  for (let i = 0; i < 8; i++) (i < 4 ? d.a : d.b)[i % 4] = n[i] ?? 0;
}
