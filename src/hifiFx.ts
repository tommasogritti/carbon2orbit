import Phaser from 'phaser';

// Sprites drawn by a shader of their own: the parts of a hi-fi look that no still drawing can be, because they never hold
// still (a rocket plume, the shock layer of a re-entry, an electric arc). Each is an ordinary image on a one-colour texture, so a look places, turns, layers, tints and
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
  // B: how strongly the shock diamonds show; how closely they are spaced (1 unless given: one every eleventh of the sprite);
  //    the fuel (0 kerosene: soot burning orange; 1 methane: a clean blue flame you can half see through).
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
  hot = mix(hot, hot.bgr, uB.z);                                                                          // methane leaves no soot: the same fire, blue, with its diamonds still white
  float exit = exp(-r * r * 3.0) * smoothstep(0.0, 0.01, y) * exp(-y * 9.0);                              // in space the flame is brightest where it leaves the nozzle
  vec3 cold = mix(vec3(0.4, 0.58, 1.0), vec3(0.92, 0.96, 1.0), clamp(core + exit, 0.0, 1.0));             // no air to burn the soot in: a pale ghost of a flame
  float ghost = smoothstep(0.25, 0.95, thin);
  vec3 col = mix(hot, cold, ghost) * outTint.bgr;
  float flick = 0.93 + 0.07 * sin(t * 61.0) * sin(t * 37.0), power = (0.6 + 0.4 * thr) * flick;
  float glow = mix(0.5 + 0.5 * body + 0.5 * core + knots, body * 0.42 + core * 0.9 + exit * 1.6, ghost) * power;
  float solid = body * mix(0.92, 0.0, ghost) * (1.0 - 0.3 * uB.z);                                        // at the pad it hides what is behind it; in space it is only light
  float halo = exp(-r * r * 0.22) * along * mix(0.16, 0.05, ghost) * power;                               // the air round it, lit
  float cut = 1.0 - smoothstep(uA.z - 0.04, uA.z + 0.02, y);
  gl_FragColor = (vec4(col * glow * max(solid, max(body, exit * ghost)), solid) + vec4(mix(vec3(1.0, 0.5, 0.16), vec3(0.5, 0.66, 1.0), max(ghost, uB.z)) * outTint.bgr * halo, 0.0)) * cut * outTint.a;
}`,
  // The shock layer of a re-entry: air that cannot get out of the way. It stands off the blunt end as a bow (apex a tenth
  // up from the bottom edge of the sprite) and streams back up past the body, turbulent, cooling from white to red.
  // A: how hot it is (0 to 1); a seed. It is light only: what is behind it shows through.
  entry: `
void main () {
  float x = (outTexCoord.x - 0.5) * 2.0, y = outTexCoord.y, heat = uA.x, t = uTime + uA.y;
  float n1 = fbm(vec2(x * 4.0, y * 3.0 + t * 6.0)), n2 = fbm(vec2(x * 13.0 + 5.0, y * 5.0 + t * 15.0));   // carried back along the wake
  float d = 0.9 - 0.98 * x * x - y + (n1 - 0.5) * 0.045;                                                   // how far behind the bow this point is
  float apex = exp(-x * x * 5.0);                                                                         // hottest where the air is brought to a stop
  float shell = exp(-pow(d / (0.018 + 0.03 * (1.0 - apex)), 2.0));                                        // the shock itself: thin and hard at the nose, softer down the flanks
  float inside = smoothstep(-0.015, 0.035, d);
  float gas = inside * exp(-d * (2.4 + 2.6 * (1.0 - apex))) * (0.35 + 1.1 * n1);                          // the hot gas behind it
  float lines = inside * smoothstep(0.42, 0.8, n2) * exp(-d * 1.6) * (0.4 + 0.6 * apex);                  // streamers torn off and carried up the track
  vec3 col = mix(vec3(1.0, 0.2, 0.05), vec3(1.0, 0.56, 0.2), clamp(gas * 1.4, 0.0, 1.0));
  col = mix(col, vec3(1.0, 0.95, 0.86), clamp(shell * (0.35 + 0.65 * apex) + gas * apex * 0.55, 0.0, 1.0));
  float edge = (1.0 - smoothstep(0.72, 1.0, abs(x))) * smoothstep(0.0, 0.3, y);
  float a = (shell * (0.45 + 0.55 * apex) + gas * 0.75 + lines * 0.5) * edge * heat * (0.92 + 0.08 * sin(t * 53.0) * sin(t * 31.0));
  gl_FragColor = vec4(col * outTint.bgr * a, 0.0) * outTint.a;
}`,
  // An electric arc, from one end of the sprite (the top edge) to the other. It does not move: it is struck again, along a
  // new path, some twenty-six times a second. A hard white core, the glow of the gas round it (tint the sprite for the
  // gas), a fainter second path, and a bloom at each end where it leaves the metal.
  // A: how strong it is (0 to 1); a seed.
  arc: `
float path (vec2 p, float seed, float amp) {
  float k = sin(3.14159 * clamp(p.y, 0.0, 1.0));                                                          // pinned at both ends
  return abs(p.x - ((fbm(vec2(p.y * 5.0 + seed * 7.3, seed)) - 0.5) * amp + (noise(vec2(p.y * 34.0, seed * 3.1)) - 0.5) * amp * 0.22) * k);
}
void main () {
  vec2 p = vec2((outTexCoord.x - 0.5) * 2.0, outTexCoord.y);
  float n = floor((uTime + uA.y) * 26.0), d1 = path(p, n, 1.0), d2 = path(p, n + 31.7, 1.5);
  float core = exp(-d1 * d1 * 1400.0), glow = exp(-d1 * 10.0) * 0.5 + exp(-d1 * 3.2) * 0.2;
  float side = exp(-d2 * d2 * 2600.0) * 0.45 + exp(-d2 * 14.0) * 0.12;
  float ends = exp(-length(vec2(p.x, (p.y - 0.04) * 2.0)) * 7.0) + exp(-length(vec2(p.x, (p.y - 0.96) * 2.0)) * 7.0);
  vec3 col = vec3(1.0) * core + (vec3(0.6, 0.5, 1.0) * (glow + side) + vec3(0.85, 0.75, 1.0) * ends * 0.7) * outTint.bgr;
  float edge = (1.0 - smoothstep(0.7, 1.0, abs(p.x))) * smoothstep(0.0, 0.03, p.y) * smoothstep(1.0, 0.97, p.y);
  gl_FragColor = vec4(col * edge * uA.x * (0.65 + 0.35 * hash(vec2(n, 1.0))), 0.0) * outTint.a;
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
