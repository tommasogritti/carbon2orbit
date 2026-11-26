// GLSL for the 3D engine (src/gfx3d/engine.ts). Everything on screen is worked out per pixel from formulas: there is
// no mesh, no texture file and no model. Units: kilometres for the planet, metres for the vehicle (vehicle at the origin).

export const VERT = `#version 300 es
out vec2 vUV;
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUV = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

const HASH = `
vec3 hash33(vec3 p){ uvec3 q = uvec3(ivec3(p)) * uvec3(1597334673U, 3812015801U, 2798796415U); q = (q.x ^ q.y ^ q.z) * uvec3(1597334673U, 3812015801U, 2798796415U); return vec3(q) * (1.0 / 4294967295.0); }
`;

/** Tileable gradient and cell noise, used once at start-up to fill the noise textures. */
const NOISE = HASH + `
float gnoise(vec3 x, float per){
  vec3 i = floor(x), f = fract(x); vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  #define GR(o) dot(hash33(mod(i + o, per)) * 2.0 - 1.0, f - o)
  return mix(mix(mix(GR(vec3(0,0,0)), GR(vec3(1,0,0)), u.x), mix(GR(vec3(0,1,0)), GR(vec3(1,1,0)), u.x), u.y),
             mix(mix(GR(vec3(0,0,1)), GR(vec3(1,0,1)), u.x), mix(GR(vec3(0,1,1)), GR(vec3(1,1,1)), u.x), u.y), u.z);
}
float worley(vec3 x, float per){
  vec3 i = floor(x), f = fract(x); float d = 1.0;
  for (int a = -1; a <= 1; a++) for (int b = -1; b <= 1; b++) for (int c = -1; c <= 1; c++) {
    vec3 o = vec3(float(a), float(b), float(c)); vec3 r = o + hash33(mod(i + o, per)) - f; d = min(d, dot(r, r));
  }
  return 1.0 - sqrt(d);
}
float fbm(vec3 p, float per, int oct){ float s = 0.0, a = 0.5; for (int i = 0; i < oct; i++) { s += a * gnoise(p * per, per); per *= 2.0; a *= 0.5; } return s; }
float wfbm(vec3 p, float per){ return worley(p * per, per) * 0.625 + worley(p * per * 2.0, per * 2.0) * 0.25 + worley(p * per * 4.0, per * 4.0) * 0.125; }
float remap(float v, float a, float b, float c, float d){ return c + (v - a) / (b - a) * (d - c); }
`;

/** One layer of the 3D cloud noise: R Perlin-Worley, G B A Worley at rising frequency. */
export const GEN_N3 = `#version 300 es
precision highp float; precision highp int;
in vec2 vUV; out vec4 o; uniform float uZ;
${NOISE}
void main(){
  vec3 p = vec3(vUV, uZ);
  float pf = clamp(fbm(p, 4.0, 5) * 0.9 + 0.5, 0.0, 1.0);
  float wa = wfbm(p, 4.0), wb = wfbm(p, 8.0), wc = wfbm(p, 16.0);
  o = vec4(clamp(remap(pf, wa - 1.0, 1.0, 0.0, 1.0), 0.0, 1.0), wa, wb, wc);
}`;

/** The weather map, 2,400 km a side: R cover, G how tall, B mesoscale cells, A streaks for the cirrus. */
export const GEN_WX = `#version 300 es
precision highp float; precision highp int;
in vec2 vUV; out vec4 o;
${NOISE}
void main(){
  vec2 uv = vUV;
  // two lows: the air turns round them, and whatever cloud there is gets wound into bands
  vec2 c1 = uv - vec2(0.43, 0.20), c2 = uv - vec2(0.80, 0.66); float r1 = length(c1), r2 = length(c2);
  float a1 = 2.6 * exp(-r1 * r1 / 0.010) / (r1 * 9.0 + 0.35), a2 = -1.7 * exp(-r2 * r2 / 0.006) / (r2 * 9.0 + 0.35);
  uv = vec2(0.43, 0.20) + mat2(cos(a1), -sin(a1), sin(a1), cos(a1)) * c1; c2 = uv - vec2(0.80, 0.66);
  uv = vec2(0.80, 0.66) + mat2(cos(a2), -sin(a2), sin(a2), cos(a2)) * c2;
  vec3 p = vec3(uv, 0.37);
  vec2 w = vec2(fbm(p + vec3(0.0, 0.0, 0.31), 3.0, 4), fbm(p + vec3(0.0, 0.0, 0.67), 3.0, 4));
  vec3 q = vec3(uv + w * 0.22, 0.11);
  float big = fbm(q, 3.0, 7) * 1.25 + 0.5;                      // fronts and clear ocean, hundreds of km
  float fronts = 1.0 - abs(fbm(q + vec3(0.0, 0.0, 0.5), 2.0, 5)) * 3.2; // long curved bands
  float cover = clamp(mix(big, fronts, 0.45), 0.0, 1.0);
  cover = smoothstep(0.36, 0.9, cover);
  cover = max(cover, 0.95 * exp(-r1 * r1 / 0.0016) * (0.55 + 0.6 * fbm(q, 9.0, 4))) * (1.0 - 0.9 * exp(-r1 * r1 / 0.00002)); // the low's own overcast, with an eye
  float tall = clamp(fbm(q + vec3(0.0, 0.0, 0.83), 6.0, 5) * 1.3 + 0.45 + 0.5 * exp(-r1 * r1 / 0.004), 0.0, 1.0) * smoothstep(0.25, 0.8, cover);
  float cells = clamp(worley(vec3(vUV + w * 0.05, 0.2) * 56.0, 56.0) * 0.7 + worley(vec3(vUV, 0.6) * 112.0, 112.0) * 0.5, 0.0, 1.0);
  vec3 s = vec3(vUV * vec2(1.0, 1.0) + w * 0.6, 0.9);
  float streak = clamp(fbm(s, 12.0, 5) * 1.5 + 0.5, 0.0, 1.0) * clamp(fbm(q + vec3(0.0, 0.0, 0.21), 4.0, 3) * 2.0 + 0.45, 0.0, 1.0);
  o = vec4(cover, tall, cells, streak);
}`;

/** 2D noise for the sea and small things: R G smooth, B cells, A white. */
export const GEN_N2 = `#version 300 es
precision highp float; precision highp int;
in vec2 vUV; out vec4 o;
${NOISE}
void main(){
  vec3 p = vec3(vUV, 0.5);
  o = vec4(clamp(fbm(p, 8.0, 4) * 0.9 + 0.5, 0.0, 1.0), clamp(fbm(p + vec3(0.0, 0.0, 0.25), 8.0, 4) * 0.9 + 0.5, 0.0, 1.0), worley(p * 16.0, 16.0), hash33(vec3(gl_FragCoord.xy, 7.0)).x);
}`;

export const SCENE = `#version 300 es
precision highp float; precision highp int; precision highp sampler3D;
in vec2 vUV; out vec4 o;
uniform vec2 uRes, uJit; uniform float uTime, uFrame;
uniform vec3 uCam; uniform mat3 uCamM; uniform float uTan;
uniform float uAlt;            // camera altitude, km
uniform vec2 uXZ, uWave;       // where the camera is over the planet: km for the weather, m for the waves
uniform vec3 uSun;
uniform mat3 uBody;            // body to world; body +Y is the nose, -Y the engines
uniform vec3 uVel;             // unit velocity
uniform float uHot, uScorch, uGlow;
uniform vec4 uRcs;             // thrusters firing: +x -x +z -z (body)
uniform vec3 uChA; uniform float uDrogue, uMain;
uniform float uSea;            // metres from the vehicle's centre down to the sea
uniform float uSplash;         // seconds since the splash, negative before
uniform vec4 uS2;              // stage two: direction and brightness
uniform vec3 uShip;            // recovery ship, metres from the vehicle (y is the waterline); x > 1e5 hides it
uniform vec3 uHeli, uHook; uniform mat3 uHeliM; uniform float uRotor, uTrail;   // a helicopter with a hook on a long line; a drogue trailing above the main chute
uniform int uMode;              // 0: a stage coming down. 1: a rocket going up. 2: a capsule coming down over land (uTilt: how far north of the range it lands, km)
uniform vec3 uS1;               // launch: stage one, metres from where it sits in the stack (x > 1e5: gone)
uniform float uFair;            // seconds since the fairing went; negative while it is on
uniform vec4 uPlume;            // throttle; how far the exhaust has spread (0 at sea level, 1 in vacuum); 1 for the single vacuum engine; brightness (turned down as the exposure opens up)
uniform vec3 uPad; uniform vec2 uPadK; // the pad's deck: metres from the vehicle, and km from the camera over the ground
uniform vec4 uSite;             // 0 no land, 1 a headland with cliffs, 2 a flat coast, 3 the outback behind the Great Australian Bight; the pad's height, km; lamps 0..1; seconds since ignition (negative: none)
uniform float uBoom;            // seconds since the vehicle broke up; negative before
uniform float uFrost, uTilt;      // frost on the liquid-oxygen tanks, 0..1; how far the strongback has leant back, radians
uniform float uPay;              // what rides on the kick stage: 0 one satellite with two panels, 1 a dispenser of CubeSats, 3 a radar satellite with its antenna furled, 4 three microsatellites
uniform vec2 uKick;             // the kick stage on its own: 0 no, 1 with its payload, 2 without; and how far the last payload let go has drifted, m (negative: none)
uniform int uCloudN, uAtmN;
uniform sampler3D uN3; uniform sampler2D uWx, uN2;
uniform sampler2D uPatchT; uniform float uPatchA;   // the mission patch on the fairing: its picture, and its height over its width (0: none)

#define PI 3.14159265
#define SUN 20.0
const float RG = 6360.0, RT = 6460.0;
const vec3 BR = vec3(5.802e-3, 13.558e-3, 33.1e-3); const float BM = 3.996e-3, BMA = 4.4e-3; const vec3 BO = vec3(0.650e-3, 1.881e-3, 0.085e-3);
const float CB = 0.9, CTOP = 8.5, SIG = 22.0;
vec3 Cc; float Rc; vec3 gA; vec3 gBx, gBz;
float gDay;
float hullB(float x); float ggx(float nh, float a); float sdEll(vec3 p, vec3 r); float cloudShadow(vec3 p); vec3 lampsE(vec3 pm, vec3 N);
${HASH}
float ign(vec2 p, float f){ p += 5.588238 * mod(f, 64.0); return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)); }

// ---------------------------------------------------------------- planet
/** Altitude of a point given from the camera, without losing it in the planet's radius. */
float altOf(vec3 p){ float rr = Rc + p.y; float d2 = dot(p.xz, p.xz); return uAlt + p.y + d2 / (rr + sqrt(rr * rr + d2)); }
/** Where a camera ray meets the shell at altitude hs: near and far. */
vec2 shellCam(vec3 rd, float hs){
  float b = Rc * rd.y, c = (uAlt - hs) * (2.0 * RG + uAlt + hs), h = b * b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  if (b < 0.0) { float q = -b + h; return vec2(c / q, q); }
  float q = -b - h; return vec2(q, c / q);
}
vec3 sunT(float a, float mu){
  float m = max(mu, 0.07); a = max(a, 0.0);
  vec3 od = BR * 8.0 * exp(-a / 8.0) + (BM + BMA) * 1.2 * exp(-a / 1.2) + BO * 15.0 * clamp(1.0 - (a - 10.0) / 30.0, 0.0, 1.0);
  return exp(-od / m) * smoothstep(-0.10, 0.03, mu);
}
/** Light scattered into a ray by the air, and what the air lets through. p0 is from the camera. */
void scatter(vec3 p0, vec3 rd, float tMax, float jit, int N, out vec3 L, out vec3 T){
  L = vec3(0.0); T = vec3(1.0);
  vec3 oc = p0 - Cc; float b = dot(oc, rd), c = dot(oc, oc) - RT * RT, h = b * b - c;
  if (h < 0.0) return;
  h = sqrt(h); float t0 = max(-b - h, 0.0), t1 = min(-b + h, tMax);
  if (t1 <= t0) return;
  float tm = clamp(-b, t0, t1), f = (tm - t0) / (t1 - t0);
  float mu = dot(rd, uSun), phR = 3.0 / (16.0 * PI) * (1.0 + mu * mu), g = 0.8;
  float phM = 3.0 / (8.0 * PI) * ((1.0 - g * g) * (1.0 + mu * mu)) / ((2.0 + g * g) * pow(1.0 + g * g - 2.0 * g * mu, 1.5));
  float tp = t0;
  for (int i = 0; i < N; i++) {
    float u = float(i + 1) / float(N), tn;
    if (u < f) { float k = 1.0 - u / f; tn = t0 + (tm - t0) * (1.0 - k * k); } else { float k = (u - f) / (1.0 - f + 1e-6); tn = tm + (t1 - tm) * k * k; }
    float dt = tn - tp, t = tp + dt * jit; tp = tn;
    vec3 p = oc + rd * t; float r = length(p), a = r - RG;
    float dr = exp(-a / 8.0), dm = exp(-a / 1.2), dz = max(0.0, 1.0 - abs(a - 25.0) / 15.0);
    vec3 ext = BR * dr + (BM + BMA) * dm + BO * dz;
    vec3 S = (BR * dr * (phR + 0.035) * 1.5 + BM * dm * phM) * sunT(a, dot(p, uSun) / r) * SUN;
    vec3 Ts = exp(-ext * dt);
    L += T * S * (1.0 - Ts) / max(ext, vec3(1e-7)); T *= Ts;
  }
}

// ---------------------------------------------------------------- clouds
float cloudD(vec3 p, bool fine){
  float a = altOf(p);
  if (a < CB || a > CTOP) return 0.0;
  vec2 w = p.xz + uXZ;
  vec4 wx = textureLod(uWx, w / 2400.0, 0.0), w2 = textureLod(uWx, w.yx / 613.0 + 0.21, 0.0);   // the weather, and a second reading at another scale
  float tall = wx.g * wx.g * smoothstep(0.25, 0.7, w2.a + wx.g * 0.5);
  float top = mix(1.7 + 1.3 * w2.g, CTOP, tall), hf = (a - CB) / (top - CB);
  if (hf > 1.0) return 0.0;
  float cov = wx.r * mix(1.0, 0.2 + wx.b * 1.1, 0.65 * (1.0 - wx.g));       // open cells where the cloud is low
  cov = clamp(cov * (0.75 + 0.9 * w2.r) + (w2.b - 0.45) * 0.35 * smoothstep(0.05, 0.4, wx.r) + 0.10 * w2.a, 0.0, 1.0);
  if (cov < 0.02) return 0.0;
  float shape = smoothstep(0.0, 0.14, hf) * (1.0 - smoothstep(0.5 + 0.3 * tall, 1.0, hf));
  vec3 q = vec3(w.x, a * 1.4, w.y) + vec3(w2.b - 0.5, 0.0, w2.g - 0.5) * 14.0;   // pushed about, so the noise's own tile never shows
  float base = textureLod(uN3, q / 15.0 + vec3(0.0, 0.0, uTime * 0.0004), 0.0).r * 0.5 + textureLod(uN3, q.zyx / 41.0 + 0.37, 0.0).r * 0.3 + textureLod(uN3, q / 113.0 + 0.71, 0.0).r * 0.2;
  float thr = 1.0 - cov * 0.8; float d = clamp((base * shape - thr) / (1.0 - thr), 0.0, 1.0);
  if (d <= 0.0 || !fine) return d;
  float lod = log2(max(length(p) * (2.0 * uTan / uRes.y) / 0.025, 1.0));
  vec4 n = textureLod(uN3, q / 2.4 + vec3(uTime * 0.002, -uTime * 0.001, 0.0), lod);
  float er = 1.0 - (n.g * 0.6 + n.b * 0.28 + n.a * 0.12);
  return clamp((d - er * 0.38 * (1.0 - d * 0.6)) / (1.0 - er * 0.38), 0.0, 1.0);
}
float hg(float mu, float g){ return (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5); }
/** March the cloud layer along a camera ray. rgb is the light, a what gets through; tC is where the cloud is. */
vec4 clouds(vec3 rd, float tMax, float jit, out float tC){
  tC = tMax;
  vec2 top = shellCam(rd, CTOP), bot = shellCam(rd, CB); float t0, t1;
  if (uAlt > CTOP) { if (top.x < 0.0 && top.y < 0.0 || top.y < 0.0) return vec4(0.0, 0.0, 0.0, 1.0); if (top.x <= 0.0) return vec4(0.0, 0.0, 0.0, 1.0); t0 = top.x; t1 = bot.x > 0.0 ? bot.x : top.y; }
  else if (uAlt > CB) { t0 = 0.0; t1 = bot.x > 0.0 ? bot.x : top.y; }
  else { t0 = bot.y; t1 = top.y; }
  t1 = min(t1, tMax);
  if (t1 <= t0) return vec4(0.0, 0.0, 0.0, 1.0);
  float N = float(uCloudN), dt0 = clamp((t1 - t0) / N, 0.045, 0.7), t = t0, dt = dt0;
  float mu = dot(rd, uSun), ph = mix(1.0, 0.25 * (hg(mu, 0.75) * 0.6 + hg(mu, -0.2) * 0.4) * 4.0, 0.55);
  vec3 L = vec3(0.0); float T = 1.0; bool first = true;
  t += dt * jit;
  for (int i = 0; i < uCloudN; i++) {
    if (t > t1 || T < 0.015) break;
    vec3 p = rd * t;
    float d = cloudD(p, true);
    dt = max(dt0, 0.065 * (t - t0));
    if (d > 0.002) {
      float od = 0.0, ls = 0.11;
      for (int j = 0; j < 5; j++) { od += cloudD(p + uSun * ls * (float(j) + 0.6), false) * ls * (j == 4 ? 3.0 : 1.0); ls *= 1.9; }
      float tau = od * SIG;
      float lightT = exp(-tau) + 0.5 * exp(-tau * 0.35) + 0.25 * exp(-tau * 0.09);
      float a = altOf(p), hf = clamp((a - CB) / 5.0, 0.0, 1.0);
      vec3 sunC = sunT(a, uSun.y) * SUN;
      vec3 lum = sunC * 0.17 * lightT * ph + (vec3(0.26, 0.38, 0.62) * (0.35 + 0.65 * hf) + vec3(0.10, 0.13, 0.17) * (1.0 - hf)) * SUN * 0.07 * gDay;
      float Ts = exp(-d * SIG * dt);
      L += T * lum * (1.0 - Ts);
      if (first && T * Ts < 0.6) { tC = t; first = false; }
      T *= Ts;
    }
    t += dt;
  }
  return vec4(L, T);
}
float cloudShadow(vec3 p){
  float s = 0.0;
  for (int i = 0; i < 3; i++) { float h = 1.5 + float(i) * 1.9; s += cloudD(p + uSun * (h / max(uSun.y, 0.25)), false); }
  return exp(-s * 7.0);
}

// ---------------------------------------------------------------- land: the coast a rocket leaves from
// Each site's coast is laid out from the real geography in a few shapes (not survey data): Māhia Peninsula on its sand
// isthmus at the north-east end of Hawke Bay, with the North Island's east coast behind it; Wallops Island on the
// Atlantic shore of the Delmarva Peninsula, the marsh behind the barrier islands, and Chesapeake Bay beyond.
float sdSeg2(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
/** East and north of the pad, km, from the scene's own axes (x downrange): Māhia flies south, Wallops east-south-east. */
vec2 mapEN(vec2 q){ return uSite.x < 1.5 ? vec2(-q.y, -q.x) : vec2(0.94 * q.x - 0.34 * q.y, -0.34 * q.x - 0.94 * q.y); }
/** How far inland a point is, km; negative out at sea. q is km from the pad, x downrange. */
float coast(vec2 q){
  vec2 m = mapEN(q); float l = length(q);
  float n = textureLod(uN2, q / 9.0 + 0.3, 0.0).r - 0.5, n2 = textureLod(uN2, q / 2.1 + 0.7, 0.0).g - 0.5, n3 = textureLod(uN2, q / 47.0 + 0.13, 0.0).r - 0.5;
  float w = n * 1.5 * smoothstep(0.6, 8.0, l) + n2 * 0.3 * smoothstep(0.12, 1.0, l) + n3 * 7.0 * smoothstep(6.0, 40.0, l);
  if (uSite.x > 2.5) {                                                        // q.x runs along the capsule's track (north-north-west) from where it comes down, q.y to its right; the shore is 31 km back along the track from the range
    float s = q.x + uTilt + 31.5 + 2.2 * max(q.y - 10.0, 0.0) - 0.9 * max(-q.y - 30.0, 0.0);                         // it runs away south-east on the right, and comes north on the left
    float bay = 4.0 * (exp(-pow((q.y + 16.0) / 5.0, 2.0)) + exp(-pow(q.y / 5.0, 2.0))) * smoothstep(14.0, 0.0, s);   // Tourville Bay and Denial Bay
    float isle = 2.2 - length(vec2(q.y + 6.0, (q.x + uTilt + 45.5) * 0.9));                                           // St Peter Island
    return max(s - bay + n * 1.2 + n2 * 0.3 + n3 * 4.0 * smoothstep(40.0, 0.0, s), isle + n2 * 0.4);
  }
  if (uSite.x < 1.5) {
    float pen = 0.55 + 0.4 * clamp(m.y, 0.0, 12.75) - sdSeg2(m, vec2(0.05, 0.25), vec2(4.8, 14.5));                    // the peninsula: a triangle with the pad at its southern point, 11 km across at Table Cape
    float isle = 0.4 - sdSeg2(m, vec2(0.1, -2.8), vec2(0.1, -4.7));                                                  // Portland Island, off the point
    float neck = 1.3 - sdSeg2(m, vec2(1.5, 19.0), vec2(2.2, 23.5));                                                  // its sand isthmus
    vec2 d = m - vec2(-62.0, -70.0); float south = -(d.x * 0.869 - d.y * 0.495);                                     // the east coast: south of Hawke Bay, running north-north-east
    float north = -((m.x - 2.0) * 0.992 - (m.y - 24.0) * 0.124);                                                     // and north of the isthmus, running nearly north
    float main = min(mix(south, north, smoothstep(-45.0, -35.0, m.y)), length(m - vec2(-30.0, -25.0)) - 50.0);       // with Hawke Bay taken out of it
    return max(max(max(pen + w, isle + n2 * 0.2), neck + w * 0.25), main + w);
  }
  vec2 dir = vec2(0.38, 0.925); float s = dot(m, dir), u = -(m.x * dir.y - m.y * dir.x) + 0.27;                      // along the shore, and inland of it
  u += 10.5 * smoothstep(3.0, 9.0, s);                                                                              // Chincoteague and Assateague stand out to sea, north of the pad
  float uw = clamp((s + 90.0) * 1.2, 0.0, 23.0) + 0.9 * clamp(s - 2.0, 0.0, 35.0) + max(s - 37.0, 0.0) * 0.25;      // the Delmarva's bay shore: 23 km across here, wider to the north
  return max(min(u, uw - u), u - uw - 28.0 - 0.3 * clamp(s + 60.0, 0.0, 60.0)) + w * 0.45;                           // and Chesapeake Bay beyond it
}
/** Height of the land, km; negative where it is sea. */
float landH(vec2 q){
  float c = coast(q); if (c <= 0.0) return c * 0.05;
  float l = length(q), h;
  if (uSite.x < 1.5) {
    float n = textureLod(uN2, q / 6.5 + 0.11, 0.0).g, m = textureLod(uN2, q / 0.8, 0.0).r, r = textureLod(uN2, q / 38.0 + 0.4, 0.0).r, r2 = textureLod(uN2, q / 11.0 + 0.2, 0.0).g;
    h = uSite.y * smoothstep(0.0, 0.075, c) * (0.82 + 0.18 * smoothstep(0.05, 0.3, c)) + 0.3 * n * n * smoothstep(0.35, 4.0, c) + 0.014 * (m - 0.5) * smoothstep(0.08, 0.3, c);
    h += (1.0 - abs(2.0 * r - 1.0)) * (0.5 + r2) * 0.9 * smoothstep(7.0, 45.0, c);                                   // the ranges inland
  } else if (uSite.x < 2.5) h = uSite.y * smoothstep(0.0, 0.04, c) + 0.004 * textureLod(uN2, q / 1.7, 0.0).r * smoothstep(0.2, 2.0, c) + 0.02 * textureLod(uN2, q / 23.0, 0.0).g * smoothstep(8.0, 30.0, c);
  else h = uSite.y * smoothstep(0.0, 0.06, c) + (0.005 * textureLod(uN2, q / 2.3, 0.0).r + 0.022 * textureLod(uN2, q / 19.0 + 0.3, 0.0).g) * smoothstep(0.4, 3.0, c);   // low cliffs at the shore, then plain and long low dunes
  return mix(uSite.y, h, smoothstep(0.1, 0.26, l));                          // level ground round the pad
}
// ---------------------------------------------------------------- sea
/** Slope of the sea at a point: a dozen wave trains round the wind's direction; those too short for a pixel are handed back as roughness. */
vec2 waveSlope(vec2 x, float foot, out float unres){
  vec2 g = vec2(0.0); unres = 0.0; float lam = 64.0;
  // gusts and slicks: where the wind has been at the water and where it has not, over hundreds of metres
  float gust = 0.5 + 1.9 * texture(uN2, x / 2300.0 + uTime * 0.0007).r * texture(uN2, x.yx / 870.0 - uTime * 0.0011).g * 2.0;
  vec2 xw = x + (texture(uN2, x / 530.0).rg - 0.5) * 26.0 + (texture(uN2, x / 131.0 + 0.3).rg - 0.5) * 5.0;
  for (int i = 0; i < 19; i++) {
    vec3 h = hash33(vec3(float(i) + 3.0, 5.0, 11.0));
    float ang = 0.35 + (h.x - 0.5) * 3.4 * (0.2 + 0.8 * float(i) / 18.0), k = 6.2831853 / lam, w = sqrt(9.81 * k); // the swell keeps its line, the chop goes every way
    vec2 d = vec2(cos(ang), sin(ang));
    float grp = 0.25 + 1.5 * texture(uN2, xw / (lam * 7.0) + h.yz + uTime * 0.003).r;                                  // each train comes in groups
    float sl = (0.026 + 0.05 * float(i) / 18.0) * grp * mix(1.0, gust, float(i) / 18.0), ph = dot(d, xw) * k + w * uTime + h.z * 40.0;
    float keep = smoothstep(1.5, 3.5, lam / foot);
    g += d * sl * cos(ph) * (1.0 + 0.6 * sin(ph)) * keep; unres += sl * sl * 0.5 * (1.0 - keep);
    lam *= 0.69 + 0.14 * h.y;
  }
  return g;
}
vec3 skyAt(vec3 up, vec3 d){ vec3 L, T; d = normalize(d + up * max(0.03 - dot(d, up), 0.0)); scatter(up * (RG + 0.002) + Cc, d, 1e9, 0.5, 6, L, T); return L; }
vec3 ocean(vec3 p, vec3 rd, float t){
  vec3 up = normalize(p - Cc); float mus = max(dot(up, uSun), 0.0); vec3 Ts = sunT(0.0, dot(up, uSun));
  float sh = cloudShadow(p);
  float foot = t * 1000.0 * (2.0 * uTan / uRes.y) / max(dot(-rd, up), 0.04); // metres of sea under one pixel
  vec2 wp = p.xz * 1000.0 + uWave; vec3 N; float rough, foam = 0.012;
  vec3 pm = p * 1000.0 + uCam;                                             // metres from the vehicle
  float unres; vec2 gs = waveSlope(wp, foot, unres);
  if (uSplash >= 0.0) {                                                     // rings going out from where it went in
    float r = length(pm.xz), fr = 2.6 * uSplash + 1.5, e = (r - fr) / (2.0 + uSplash * 0.8);
    gs += pm.xz / max(r, 0.1) * 0.38 * sin((r - 2.6 * uSplash) * 2.4) * exp(-e * e) * exp(-uSplash * 0.22) * smoothstep(0.0, 0.3, uSplash);
  }
  N = normalize(up + vec3(-gs.x, 0.0, -gs.y)); rough = sqrt(1.3 * sqrt(unres) + 0.012);
  if (foot < 60.0) {
    float k = 1.0 - smoothstep(1.5, 60.0, foot);
    vec2 mi = (texture(uN2, wp / 7.0 + uTime * vec2(0.03, 0.02)).rg - 0.5) * 0.09 * k; N = normalize(N + vec3(mi.x, 0.0, mi.y));
    float caps = texture(uN2, wp / 97.0 + uTime * 0.01).r * texture(uN2, wp / 31.0 - uTime * 0.013).g;
    foam = mix(foam, smoothstep(0.40, 0.5, caps) * smoothstep(0.3, 0.7, texture(uN2, wp / 9.0).r) * 0.55, k);
    if (uSplash >= 0.0) {                                                   // the ring the stage leaves
      float r = length(pm.xz), rr = 2.0 + 7.0 * sqrt(uSplash), n = texture(uN2, pm.xz / 14.0).r;
      float lace = smoothstep(0.25, 0.75, texture(uN2, pm.xz / 5.0).g);
      foam = max(foam, smoothstep(rr + 1.5, rr - 1.0, r + n * 3.0) * smoothstep(-1.0, 3.0, r + n * 3.0 - rr * 0.55) * exp(-uSplash * 0.25) * lace * 0.9);
      foam = max(foam, smoothstep(2.6, 0.5, r + n) * exp(-uSplash * 0.05) * lace * 0.8);
    }
    if (uShip.x < 1e5) {                                                    // and the ship's wake
      vec2 s = pm.xz - uShip.xz; float along = -s.x - 19.0, wd = abs(s.y), n = texture(uN2, s / 23.0).g, lace = smoothstep(0.3, 0.7, texture(uN2, s / 6.0 + uTime * 0.02).r);
      foam = max(foam, smoothstep(-2.0, 3.0, along) * (1.0 - smoothstep(2.5 + along * 0.1, 5.0 + along * 0.16, wd + n * 2.5)) * exp(-max(along, 0.0) / 80.0) * (0.35 + 0.65 * lace) * 0.85);   // the wake astern
      foam = max(foam, (1.0 - smoothstep(0.2, 1.8 + n * 2.0, max(wd - hullB(s.x), abs(s.x) - 21.0))) * lace * 0.7);                                                         // and the wash along the sides
    }
  }
  vec3 V = -rd; float nv = max(dot(N, V), 0.02);
  float F = 0.02 + 0.98 * pow(1.0 - nv, 5.0) * (1.0 - rough * 1.1);
  vec3 R = reflect(rd, N);
  vec3 sky = skyAt(up, R) * mix(0.55, 1.0, sh);
  vec3 H = normalize(uSun + V); float nh = max(dot(N, H), 0.0), a2 = rough * rough; a2 *= a2;
  float D = a2 / (PI * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0));
  vec3 spec = Ts * SUN * min(D, 400.0) * 0.25 / max(nv, 0.12) * (0.02 + 0.98 * pow(1.0 - max(dot(H, V), 0.0), 5.0)) * sh * mus;
  vec3 E = Ts * SUN * mus * sh + vec3(0.16, 0.27, 0.5) * SUN * 0.12 * gDay;
  vec3 wc = mix(vec3(0.008, 0.034, 0.078), vec3(0.012, 0.052, 0.086), texture(uN2, wp / 9100.0).g);
  if (uSite.x > 0.5) {                                                      // shoal water and surf where the land comes up
    float c = coast(p.xz - uPadK);
    wc = mix(wc, vec3(0.03, 0.12, 0.11), smoothstep(-0.35, 0.0, c) * 0.8);
    if (foot < 60.0) { float lace = texture(uN2, wp / 13.0 + uTime * vec2(0.012, 0.02)).r, run = 0.5 + 0.5 * sin(c * 260.0 + uTime * 0.9 + lace * 5.0); foam = max(foam, smoothstep(-0.05, -0.004, c) * smoothstep(0.35, 0.7, lace * (0.55 + 0.6 * run)) * 0.8 * (1.0 - smoothstep(1.5, 60.0, foot))); }
    E += lampsE(pm, up);
  }
  vec3 water = wc * E / PI * 1.6;
  vec3 col = water * (1.0 - F) + sky * F + spec;
  return mix(col, vec3(0.86) * E / PI, clamp(foam, 0.0, 1.0));
}

// ---------------------------------------------------------------- the stage, its parachutes, the ship
float sdCyl(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdSeg(vec3 p, vec3 a, vec3 b){ vec3 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
float sdCone(vec3 p, float h, float r1, float r2){
  vec2 q = vec2(length(p.xz), p.y), k1 = vec2(r2, h), k2 = vec2(r2 - r1, 2.0 * h);
  vec2 ca = vec2(q.x - min(q.x, (q.y < 0.0) ? r1 : r2), abs(q.y) - h), cb = q - k1 + k2 * clamp(dot(k1 - q, k2) / dot(k2, k2), 0.0, 1.0);
  return ((cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0) * sqrt(min(dot(ca, ca), dot(cb, cb)));
}
float nozzle(vec3 p){ return max(sdCone(p, 0.22, 0.125, 0.05), -sdCone(p + vec3(0.0, 0.035, 0.0), 0.22, 0.113, 0.038)); }
vec2 mapBody(vec3 p){
  float r = length(p.xz), ang = atan(p.z, p.x);
  float seam = min(min(abs(p.y + 4.3), abs(p.y - 0.8)), min(abs(p.y - 4.7), abs(p.y + 5.35)));
  float d = sdCyl(p - vec3(0.0, 0.25, 0.0), 0.6, 5.85) - 0.005 * smoothstep(0.06, 0.03, seam);
  d = max(d, -sdCyl(p - vec3(0.0, 6.1, 0.0), 0.565, 0.75));                  // the open interstage
  float m = 1.0;
  float rw = sdBox(p - vec3(0.615, 0.3, 0.0), vec3(0.022, 4.7, 0.05)) - 0.012; if (rw < d) { d = rw; m = 1.0; }
  float ts = sdCyl(p - vec3(0.0, -5.74, 0.0), 0.585, 0.15) - 0.01; if (ts < d) { d = ts; m = 2.0; }
  float k = PI / 4.0, a = mod(ang + k * 0.5, k) - k * 0.5;
  float nz = min(nozzle(vec3(r * cos(a) - 0.41, p.y + 6.08, r * sin(a))), nozzle(p + vec3(0.0, 6.08, 0.0))); if (nz < d) { d = nz; m = 3.0; }
  float k3 = PI / 2.0, a3 = mod(ang + k3 * 0.5, k3) - k3 * 0.5;
  float pod = sdBox(vec3(r * cos(a3) - 0.625, p.y - 5.45, r * sin(a3)), vec3(0.035, 0.13, 0.075)) - 0.015; if (pod < d && uMode != 1) { d = pod; m = 4.0; }   // thruster pods: on the boosters that come back, not on the launches drawn here
  return vec2(d, m);
}
vec2 mapChute(vec3 p, vec3 A, float R, float Ln, float infl, float n, float mat){
  vec3 q = p - A; float s = dot(q, uChA); vec3 lat = q - uChA * s; float rho = length(lat);
  float phi = atan(dot(lat, gBz), dot(lat, gBx)), k = 2.0 * PI / n, dphi = mod(phi + k * 0.5, k) - k * 0.5;
  float Rr = R * (0.2 + 0.8 * infl), sq = mix(2.4, 0.82, infl), bulge = 1.0 + 0.055 * infl * cos(dphi * n);
  float dc = (abs(length(vec2(rho, (s - Ln) / sq)) - Rr * bulge) - 0.02) * min(sq, 1.0) * 0.8;
  dc = max(dc, Ln - s + 0.1 * Rr * (0.5 - 0.5 * cos(dphi * n)));              // open below, the hem scalloped
  dc = max(dc, 0.1 * Rr - rho);                                             // the vent at the top
  vec2 r = vec2(dc, mat);
  float da = abs(dphi) - k * 0.5;
  float dl = sdSeg(vec3(rho * cos(da), rho * sin(da), s), vec3(Rr, 0.0, Ln), vec3(0.0, 0.0, Ln * 0.3)) - 0.014;
  dl = min(dl, sdSeg(vec3(rho, 0.0, s), vec3(0.0), vec3(0.0, 0.0, Ln * 0.3)) - 0.022);
  if (dl < r.x) r = vec2(dl, 7.0);
  return r;
}
/** The fairing: 1.2 m across and 2.5 m tall, a short barrel under a tangent ogive that comes to a point. */
float fairing(vec3 p){ float u = clamp(p.y - 9.4, 0.0, 1.75), rr = sqrt(max(8.1225 - u * u, 0.0)) - 2.25; return max(max((length(p.xz) - max(rr, 0.0)) * 0.8, 8.6 - p.y), p.y - 11.14) - 0.012; }
/** A re-entry capsule, 0.9 m across: the heat shield is a steep blunted cone (white, charred after the fall), the aft body a short cone in gold foil. p from the middle of its widest ring; the shield's nose is at -Y. */
vec2 capsule(vec3 p){
  float r = length(p.xz);
  float fore = max(max((r - (0.45 + p.y * 0.82)) * 0.773, p.y), -p.y - 0.42);                                         // the shield: a cone of about 50 degrees, cut off short
  fore = min(fore, length(p - vec3(0.0, -0.395, 0.0)) - 0.128);                                                      // and closed with a rounded nose
  float aft = max(max((r - (0.45 - p.y * 0.75)) * 0.8, -p.y), p.y - 0.2);                                            // the aft body: a short cone, in foil
  float d = min(fore, aft) - 0.01;
  return vec2(d, p.y > 0.0 ? 8.0 : 10.0);
}
/** The payload, standing on the kick stage's plate (p from the plate). one: just a single satellite of that kind, for the one drifting off. */
vec2 payload(vec3 p, float one){
  vec2 r = vec2(1e9, 8.0);
  if (uPay > 6.5) { float r = length(p.xz); return vec2(max(max((r - (0.36 - p.y * 0.3)) * 0.95, -p.y), p.y - 0.95) - 0.02, 2.0); }   // a test article nobody has described: a plain dark shroud
  if (uPay > 5.5) { float bx = sdBox(p - vec3(0.0, 0.07, 0.0), vec3(0.2, 0.07, 0.2)) - 0.01; return vec2(min(bx, sdCyl(p - vec3(0.24, 0.1, 0.24), 0.05, 0.1)), 4.0); }   // no satellite: instruments bolted to the plate
  if (uPay > 4.5) return capsule(vec3(p.x, 0.2 - p.y, p.z));                  // a capsule, heat shield outward
  if (uPay < 0.5) { r = vec2(sdBox(p - vec3(0.0, 0.46, 0.0), vec3(0.3, 0.42, 0.3)) - 0.03, 8.0); float pan = sdBox(vec3(abs(p.x) - 0.75, p.y - 0.46, p.z), vec3(0.42, 0.34, 0.012)); if (pan < r.x) r = vec2(pan, 9.0); }
  else if (uPay < 1.5) {
    if (one > 0.5) return vec2(sdBox(p - vec3(0.0, 0.46, 0.0), vec3(0.05, 0.17, 0.05)) - 0.005, 9.0);
    r = vec2(sdBox(p - vec3(0.0, 0.42, 0.0), vec3(0.09, 0.42, 0.09)), 4.0);
    float ang = atan(p.z, p.x), k6 = PI / 3.0, a6 = mod(ang + k6 * 0.5, k6) - k6 * 0.5, rr = length(p.xz);
    float cu = max(sdBox(vec3(rr * cos(a6) - 0.21, mod(p.y - 0.04, 0.42) - 0.21, rr * sin(a6)), vec3(0.05, 0.17, 0.05)) - 0.005, abs(p.y - 0.44) - 0.42); if (cu < r.x) r = vec2(cu, 9.0);
  } else if (uPay < 3.5) {
    r = vec2(sdCyl(p - vec3(0.0, 0.3, 0.0), 0.3, 0.28) - 0.02, 8.0);
    float ant = sdCyl(p - vec3(0.0, 0.9, 0.0), 0.2, 0.34) - 0.02; if (ant < r.x) r = vec2(ant, 4.0);                 // the antenna, furled like an umbrella
    float pan = sdBox(vec3(abs(p.x) - 0.62, p.y - 0.3, p.z), vec3(0.3, 0.26, 0.012)); if (pan < r.x) r = vec2(pan, 9.0);
  } else {
    float qx = one > 0.5 ? p.x : p.x - 0.25 * clamp(floor(p.x / 0.25 + 0.5), -1.0, 1.0);
    r = vec2(sdBox(vec3(qx, p.y - 0.36, p.z), vec3(0.1, 0.32, 0.17)) - 0.01, 8.0);
    float pan = sdBox(vec3(qx, p.y - 0.36, abs(p.z) - 0.19), vec3(0.09, 0.3, 0.008)); if (pan < r.x) r = vec2(pan, 9.0);
  }
  return r;
}
/** A rocket going up: stage one (while it is there), stage two with its vacuum engine, and the fairing or what was under it. */
vec2 mapStack(vec3 pw){
  vec3 p = pw * uBody; vec2 r = vec2(1e9, 1.0);
  if (uKick.x > 0.5) {                                                        // the kick stage alone: a flat carbon deck, six tanks, one small engine, and what it carries
    float ang = atan(p.z, p.x), rr = length(p.xz);
    r = vec2(sdCyl(p - vec3(0.0, 8.76, 0.0), 0.52, 0.035), 1.0);                                                    // a flat carbon plate, the full width of the rocket
    float rim = max(abs(rr - 0.56) - 0.035, abs(p.y - 8.72) - 0.09); if (rim < r.x) r = vec2(rim, 10.0);             // in a white ring frame
    float k8 = PI / 4.0, a8 = mod(ang + k8 * 0.5, k8) - k8 * 0.5;
    float brk = sdBox(vec3(rr * cos(a8) - 0.5, p.y - 8.82, rr * sin(a8)), vec3(0.05, 0.035, 0.035)); if (brk < r.x) r = vec2(brk, 4.0);   // fittings round the rim
    float adp = sdBox(p - vec3(0.0, 8.83, 0.0), vec3(0.17, 0.04, 0.17)) - 0.01; if (adp < r.x) r = vec2(adp, 4.0);   // the payload plate in the middle
    float k6 = PI / 3.0, a6 = mod(ang + k6 * 0.5, k6) - k6 * 0.5;
    float tank = length(vec3(rr * cos(a6) - 0.34, p.y - 8.56, rr * sin(a6))) - 0.13; if (tank < r.x) r = vec2(tank, 10.0);   // tanks under it
    float nz = max(sdCone(p - vec3(0.0, 8.46, 0.0), 0.14, 0.11, 0.035), -sdCone(p - vec3(0.0, 8.44, 0.0), 0.14, 0.10, 0.028)); if (nz < r.x) r = vec2(nz, 3.0);
    if (abs(uPay - 5.0) < 0.5) {                                              // a spacecraft, not a stage: solar panels hinged at the deck and folded out flat, like a skirt
      vec2 a2 = abs(p.xz); vec2 pq = a2.x > a2.y ? a2 : a2.yx;
      float wing = sdBox(vec3(pq.x - 1.16, p.y - 8.7, pq.y), vec3(0.56, 0.012, 0.36)); if (wing < r.x) r = vec2(wing, 9.0);
      float foil = sdBox(p - vec3(0.0, 8.58, 0.0), vec3(0.37, 0.13, 0.37)) - 0.02; if (foil < r.x) r = vec2(foil, 8.0);   // the bus under the deck: a box in gold foil
    }
    if (uKick.x < 1.5) { vec2 pl = payload(p - vec3(0.0, 8.9, 0.0), 0.0); if (pl.x < r.x) r = pl; }
    if (uKick.y >= 0.0) { vec3 q = p - vec3(0.35 * uKick.y, 9.38 + uKick.y, 0.0); float a = uKick.y * 0.3; q.xy = mat2(cos(a), -sin(a), sin(a), cos(a)) * q.xy; vec2 pl = payload(q + vec3(0.0, 0.46, 0.0), 1.0); if (pl.x < r.x) r = pl; }
    return r;
  }
  if (uS1.x < 1e5) r = mapBody((pw - uS1) * uBody);
  float d = min(sdCyl(p - vec3(0.0, 7.72, 0.0), 0.6, 0.88) - 0.004 * smoothstep(0.05, 0.02, abs(p.y - 7.3)), sdCyl(p - vec3(0.0, 6.4, 0.0), 0.5, 0.5));
  if (d < r.x) r = vec2(d, 1.0);
  float nz = max(sdCone(p - vec3(0.0, 5.55, 0.0), 0.4, 0.42, 0.1), -sdCone(p - vec3(0.0, 5.52, 0.0), 0.4, 0.40, 0.085)); if (nz < r.x) r = vec2(nz, 3.0);
  if (uFair < 0.0) { float f = fairing(p); if (f < r.x) r = vec2(f, 1.0); }
  else {
    float ks = sdCyl(p - vec3(0.0, 8.74, 0.0), 0.5, 0.14); if (ks < r.x) r = vec2(ks, 4.0);                        // the kick stage's deck
    vec2 pl = payload(p - vec3(0.0, 8.9, 0.0), 0.0); if (pl.x < r.x) r = pl;                                       // the payload
    if (uFair < 3.0) for (int i = 0; i < 2; i++) {                                                                 // the two halves, falling behind
      float sg = i == 0 ? 1.0 : -1.0, a = sg * 0.55 * uFair; vec3 q = p - vec3(sg * (0.35 + 3.0 * uFair), -6.0 * uFair * uFair, 0.0);
      q.y -= 9.4; q.xy = mat2(cos(a), -sin(a), sin(a), cos(a)) * q.xy; q.y += 9.4;
      float f = fairing(q), h = max(max(f, -f - 0.035), -sg * q.x); if (h < r.x) r = vec2(h, 1.0);
    }
  }
  return r;
}
vec2 map(vec3 p){
  if (uMode == 1) return mapStack(p);
  if (uMode == 2) {
    vec2 r = capsule(p * uBody);
    if (uDrogue > 0.001) { vec2 c = mapChute(p, gA, 0.6, 5.0, uDrogue, 8.0, 5.0); if (c.x < r.x) r = c; }
    if (uMain > 0.001) { vec2 c = mapChute(p, gA, 2.9, 11.0, uMain, 16.0, 6.0); if (c.x < r.x) r = c; }
    return r;
  }
  vec2 r = mapBody(p * uBody);
  if (uDrogue > 0.001) { vec2 c = mapChute(p, gA, 1.15, 10.0, uDrogue, 8.0, 5.0); if (c.x < r.x) r = c; }
  if (uMain > 0.001) { vec2 c = mapChute(p, gA, 4.9, 23.0, uMain, 16.0, 6.0); if (c.x < r.x) r = c; }
  if (uTrail > 0.001) { vec2 c = mapChute(p, gA + uChA * 27.2, 1.15, 19.0, uTrail, 8.0, 5.0); if (c.x < r.x) r = c; }   // the drogue, still flying above the main chute: its line is what a hook can take
  return r;
}
vec3 calcN(vec3 p){ vec2 e = vec2(0.003, 0.0); return normalize(vec3(map(p + e.xyy).x - map(p - e.xyy).x, map(p + e.yxy).x - map(p - e.yxy).x, map(p + e.yyx).x - map(p - e.yyx).x)); }
float shadow(vec3 p, vec3 l){ float r = 1.0, t = 0.06; for (int i = 0; i < 22; i++) { float d = map(p + l * t).x; r = min(r, 9.0 * d / t); t += clamp(d, 0.04, 2.0); if (r < 0.01 || t > 45.0) break; } return clamp(r, 0.0, 1.0); }
float occl(vec3 p, vec3 n){ float o = 0.0, s = 1.0; for (int i = 1; i <= 4; i++) { float h = 0.06 * float(i * i); o += (h - map(p + n * h).x) * s; s *= 0.6; } return clamp(1.0 - 1.6 * o, 0.0, 1.0); }
vec2 sphere(vec3 ro, vec3 rd, vec3 c, float r){ vec3 oc = ro - c; float b = dot(oc, rd), h = b * b - dot(oc, oc) + r * r; if (h < 0.0) return vec2(-1.0); h = sqrt(h); return vec2(-b - h, -b + h); }

/** The recovery ship: an offshore work boat, 42 m, modelled in its own frame and riding the swell. */
vec3 shipP(vec3 p){
  p -= uShip; p.y -= 0.22 * sin(uTime * 0.8);
  float a = 0.035 * sin(uTime * 0.9), b = 0.016 * sin(uTime * 0.63 + 1.0);
  p.yz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.yz; p.xy = mat2(cos(b), -sin(b), sin(b), cos(b)) * p.xy; return p;
}
float hullB(float x){ float f = clamp((x - 2.0) / 19.0, 0.0, 1.0); return 4.5 * (1.0 - pow(f, 2.1)) * (1.0 - 0.1 * (1.0 - smoothstep(-21.0, -13.0, x))); }
float deckY(float x){ float f = smoothstep(3.0, 21.0, x); return 2.5 + 1.9 * f * f; }
vec2 mapShip(vec3 p){
  float deck = deckY(p.x), b = hullB(p.x) * (0.66 + 0.34 * smoothstep(-2.6, 2.2, p.y)) + 0.5 * smoothstep(10.0, 21.0, p.x) * smoothstep(1.0, 4.5, p.y) * (1.0 - smoothstep(19.0, 21.0, p.x));
  float hull = max(max(abs(p.z) - b, p.y - (deck + 1.05)), max(-2.6 - p.y, abs(p.x) - 21.0));
  float well = max(max(abs(p.z) - (b - 0.2), deck - p.y), max(p.x - 3.6, -20.7 - p.x));     // the working deck, inside the bulwarks
  vec2 r = vec2(max(hull, -well) * 0.55, 1.0);
  #define U(d, m) { float dd = d; if (dd < r.x) r = vec2(dd, m); }
  U(sdBox(p - vec3(9.2, 4.9, 0.0), vec3(5.6, 1.5, 3.7)) - 0.1, 3.0)
  vec3 q = p - vec3(10.4, 7.75, 0.0); q.x -= 0.22 * q.y;
  U(sdBox(q, vec3(3.3, 1.3, 3.25)) - 0.08, 4.0)                                           // the bridge
  U(sdBox(p - vec3(10.5, 9.2, 0.0), vec3(4.0, 0.09, 3.7)) - 0.03, 3.0)
  U(sdBox(p - vec3(4.9, 8.0, 0.0), vec3(0.8, 1.9, 1.15)) - 0.2, 5.0)                       // funnel
  float mast = min(sdSeg(p, vec3(11.0, 9.3, 0.0), vec3(10.6, 15.6, 0.0)) - 0.11, sdSeg(p, vec3(10.7, 13.7, -1.9), vec3(10.7, 13.7, 1.9)) - 0.05);
  U(min(mast, sdBox(p - vec3(11.0, 12.1, 0.0), vec3(0.12, 0.09, 1.2))), 6.0)
  U(sdSeg(vec3(p.x, p.y, abs(p.z)), vec3(5.0, 7.1, 3.95), vec3(7.6, 7.1, 3.95)) - 0.55, 7.0)   // lifeboats
  float cr = min(sdCyl(p - vec3(-4.5, 5.0, 3.0), 0.5, 2.5), sdSeg(p, vec3(-4.5, 7.6, 3.0), vec3(-15.0, 10.6, 0.4)) - 0.24);
  U(min(cr, sdSeg(p, vec3(-15.0, 10.6, 0.4), vec3(-15.0, 6.6, 0.4)) - 0.035), 7.0)        // deck crane and its fall
  U(min(sdSeg(vec3(p.x, p.y, abs(p.z)), vec3(-18.8, 2.5, 3.5), vec3(-21.6, 9.2, 3.5)), sdSeg(p, vec3(-21.6, 9.2, -3.5), vec3(-21.6, 9.2, 3.5))) - 0.2, 6.0) // A-frame
  U(min(sdBox(vec3(p.x + 11.0, p.y - 2.95, abs(p.z) - 1.1), vec3(5.6, 0.32, 0.12)), sdBox(vec3(abs(p.x + 11.0) - 4.2, p.y - 3.0, p.z), vec3(0.15, 0.42, 1.5))), 7.0) // the cradle for the stage
  U(sdBox(p - vec3(1.3, 3.75, -2.1), vec3(1.5, 1.25, 1.2)) - 0.03, 8.0)
  U(sdBox(p - vec3(1.3, 3.75, 1.7), vec3(1.5, 1.25, 1.2)) - 0.03, 9.0)
  // rails round the upper decks
  vec3 rp = vec3(p.x - 9.2, p.y - 7.0, abs(p.z) - 3.7); U(max(min(abs(rp.y) - 0.02, abs(rp.y + 0.3) - 0.015), max(abs(rp.z) - 0.02, abs(rp.x) - 5.6)), 6.0)
  return r;
}
vec3 shadeShip(vec3 p, vec3 rd, float m){
  vec2 e = vec2(0.03, 0.0);
  vec3 N = normalize(vec3(mapShip(p + e.xyy).x - mapShip(p - e.xyy).x, mapShip(p + e.yxy).x - mapShip(p - e.yxy).x, mapShip(p + e.yyx).x - mapShip(p - e.yyx).x));
  float n = textureLod(uN3, p * vec3(0.05, 0.4, 0.05), 0.0).r, n2 = textureLod(uN3, p * 0.5, 0.0).g;
  vec3 base; float rough = 0.6, glass = 0.0;
  if (m < 1.5) {
    float deck = deckY(p.x);
    if (N.y > 0.7 && p.y < deck + 0.3) { base = vec3(0.10, 0.17, 0.14) * (0.7 + 0.6 * n2); rough = 0.75; }                   // deck paint, scuffed
    else if (p.y < 0.45) base = vec3(0.30, 0.045, 0.035);                                                                     // boot-topping
    else if (p.y < 0.62) base = vec3(0.8);
    else if (abs(p.z) < hullB(p.x) * 0.9 - 0.3 && p.x < 3.6) base = vec3(0.7, 0.72, 0.7);                                      // inside of the bulwarks
    else { base = vec3(0.018, 0.045, 0.10); base = mix(base, vec3(0.2, 0.09, 0.04), smoothstep(0.62, 0.85, n) * 0.5 * (1.0 - smoothstep(0.6, 3.5, p.y))); rough = 0.42; } // navy, rust weeping near the water
  } else if (m < 3.5) base = vec3(0.80, 0.82, 0.84) * (0.86 + 0.2 * n) - vec3(0.0, 0.03, 0.06) * smoothstep(0.7, 0.9, n);
  else if (m < 4.5) {
    vec3 q = p - vec3(10.4, 7.75, 0.0); float u = abs(N.z) > 0.6 ? p.x : p.z;
    base = vec3(0.80, 0.82, 0.84);
    if (abs(q.y - 0.3) < 0.52 && abs(N.y) < 0.5 && fract(u / 1.1 + 0.5) > 0.13) { base = vec3(0.012, 0.018, 0.022); glass = 1.0; rough = 0.08; }
  }
  else if (m < 5.5) base = p.y > 8.9 ? vec3(0.85, 0.3, 0.04) : vec3(0.018, 0.045, 0.10);
  else if (m < 6.5) { base = vec3(0.09, 0.09, 0.1); rough = 0.5; }
  else if (m < 7.5) { base = vec3(0.86, 0.30, 0.04) * (0.85 + 0.3 * n2); rough = 0.5; }
  else base = (m < 8.5 ? vec3(0.04, 0.17, 0.36) : vec3(0.36, 0.10, 0.05)) * (0.7 + 0.5 * step(0.5, fract(p.x * 2.2))) ;         // containers, ribbed
  float sh = 1.0, t = 0.15; for (int i = 0; i < 18; i++) { float d = mapShip(p + N * 0.03 + uSun * t).x; sh = min(sh, 7.0 * d / t); t += clamp(d, 0.1, 2.5); if (sh < 0.02 || t > 30.0) break; } sh = clamp(sh, 0.0, 1.0);
  float ao = clamp(0.35 + 1.4 * mapShip(p + N * 0.5).x + 0.5 * mapShip(p + N * 1.4).x, 0.0, 1.0);
  vec3 sunC = sunT(0.0, uSun.y) * SUN, V = -rd, H = normalize(uSun + V); float nl = max(dot(N, uSun), 0.0), nv = max(dot(N, V), 0.03);
  vec3 col = base / PI * nl * sh * sunC + 0.04 * min(ggx(max(dot(N, H), 0.0), rough), 80.0) * 0.25 / max(nv, 0.25) * nl * sh * sunC;
  vec3 up = vec3(0.0, 1.0, 0.0);
  col += base / PI * mix(vec3(0.10, 0.20, 0.34) * 2.6, skyAt(up, vec3(N.x * 0.3, 1.0, N.z * 0.3)) * PI * 1.5, N.y * 0.5 + 0.5) * ao;
  float F = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  col += skyAt(up, reflect(rd, N)) * F * mix(0.25, 1.0, glass) * ao;
  return col;
}

/** What a mirror on the stage sees: the planet with its real weather, the air and the sky. */
vec3 env(vec3 d){
  vec3 col = vec3(0.0); float tP = 1e9; vec2 g = shellCam(d, 0.0);
  if (g.x > 0.0) {
    tP = g.x; vec3 p = d * tP, up = normalize(p - Cc); float mus = max(dot(up, uSun), 0.0);
    float cov = smoothstep(0.38, 0.8, textureLod(uWx, (p.xz + uXZ) / 2400.0, 2.5).r);
    col = mix(vec3(0.012, 0.04, 0.08), vec3(0.7), cov) * SUN * mus / PI * sunT(0.0, mus);
  }
  vec3 L, T; scatter(vec3(0.0), d, tP, 0.5, 6, L, T);
  return col * T + L;
}
float ggx(float nh, float a){ float a2 = a * a; a2 *= a2; return a2 / (PI * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0)); }

// ---------------------------------------------------------------- the helicopter: a big twin-engined machine with a hook on a long line
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float sdEll(vec3 p, vec3 r){ float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / k1; }
vec2 mapHeli(vec3 pw){
  vec3 p = (pw - uHeli) * uHeliM;                                             // its own frame: x to the nose, y up, z to starboard
  float d = sdBox(p - vec3(0.4, 0.0, 0.0), vec3(4.4, 0.75, 0.75)) - 0.6;      // cabin
  d = smin(d, sdEll(p - vec3(5.2, -0.2, 0.0), vec3(2.3, 1.2, 1.3)), 0.7);     // nose
  d = smin(d, sdEll(p - vec3(0.3, 1.5, 0.0), vec3(3.5, 0.75, 0.95)), 0.45);   // engines and gearbox
  float bk = clamp((-p.x - 4.4) / 6.0, 0.0, 1.0);
  d = smin(d, sdSeg(p, vec3(-4.4, 0.55, 0.0), vec3(-10.4, 1.25, 0.0)) - mix(0.8, 0.3, bk), 0.6);   // tail boom
  d = smin(d, sdSeg(vec3(p.x, p.y, p.z * 2.4), vec3(-10.1, 1.2, 0.0), vec3(-11.3, 3.7, 0.0)) - 0.32, 0.25);  // fin
  d = min(d, sdBox(p - vec3(-10.5, 1.6, 1.0), vec3(0.5, 0.06, 1.0)) - 0.03);  // tailplane
  d = smin(d, sdEll(vec3(p.x + 0.7, p.y + 0.95, abs(p.z) - 1.45), vec3(2.3, 0.45, 0.55)), 0.3);    // sponsons
  d = min(d, sdCyl(p - vec3(0.25, 2.55, 0.0), 0.22, 0.5));                    // mast
  vec2 r = vec2(d, 1.0);
  float wh = min(length(vec3(p.x - 4.9, p.y + 1.75, abs(p.z) - 0.2)) - 0.3, length(vec3(p.x + 1.1, p.y + 1.65, abs(p.z) - 1.55)) - 0.36);
  wh = min(wh, min(sdSeg(p, vec3(4.9, -1.0, 0.0), vec3(4.9, -1.7, 0.0)), sdSeg(vec3(p.x, p.y, abs(p.z)), vec3(-1.1, -1.0, 1.5), vec3(-1.1, -1.6, 1.55))) - 0.07);
  if (wh < r.x) r = vec2(wh, 2.0);
  float cable = sdSeg(pw, uHeli - uHeliM[1] * 1.2, uHook) - 0.035; if (cable < r.x) r = vec2(cable, 3.0);
  float hk = min(sdSeg(pw, uHook, uHook - vec3(0.0, 0.9, 0.0)) - 0.1, sdSeg(pw, uHook - vec3(0.0, 0.9, 0.0), uHook + vec3(0.45, -0.35, 0.0)) - 0.07); if (hk < r.x) r = vec2(hk, 4.0);
  return r;
}
vec3 shadeHeli(vec3 pw, vec3 rd, float m){
  vec2 e = vec2(0.01, 0.0);
  vec3 N = normalize(vec3(mapHeli(pw + e.xyy).x - mapHeli(pw - e.xyy).x, mapHeli(pw + e.yxy).x - mapHeli(pw - e.yxy).x, mapHeli(pw + e.yyx).x - mapHeli(pw - e.yyx).x));
  vec3 p = (pw - uHeli) * uHeliM, Nl = N * uHeliM; vec3 base = vec3(0.82, 0.83, 0.84); float rough = 0.32, glass = 0.0, metal = 0.0;
  if (m < 1.5) {
    if (p.y < -0.72) base = vec3(0.02, 0.05, 0.11);                            // dark belly
    else if (abs(p.y + 0.5) < 0.16 && p.x > -9.5) base = vec3(0.80, 0.16, 0.05);  // a stripe along the side
    if (p.y > 1.05 && p.x > -3.2) { base = vec3(0.30, 0.31, 0.33); rough = 0.5; }  // engine cowls
    bool screen = p.x > 5.05 && p.y > -0.05 && p.y < 0.95 - (p.x - 5.0) * 0.36 && abs(fract(p.z / 1.25 + 0.5) - 0.5) > 0.045;
    bool win = abs(Nl.z) > 0.6 && p.y > 0.0 && p.y < 0.72 && p.x > -3.9 && p.x < 4.6 && fract(p.x / 1.35) > 0.3;
    if (screen || win) { base = vec3(0.012, 0.018, 0.024); glass = 1.0; rough = 0.06; }
    if (p.x < -10.2 && p.y > 2.2) base = vec3(0.80, 0.16, 0.05);              // fin tip
  } else if (m < 2.5) { base = vec3(0.03); rough = 0.8; }
  else if (m < 3.5) { base = vec3(0.10); rough = 0.6; }
  else { base = vec3(0.95, 0.72, 0.05); rough = 0.4; metal = 0.6; }
  float ao = clamp(0.45 + 1.2 * mapHeli(pw + N * 0.35).x, 0.0, 1.0), nl = max(dot(N, uSun), 0.0), nv = max(dot(N, -rd), 0.03);
  float sh = 1.0, t = 0.2; for (int i = 0; i < 10; i++) { float d = mapHeli(pw + N * 0.03 + uSun * t).x; sh = min(sh, 8.0 * d / t); t += clamp(d, 0.15, 2.0); if (sh < 0.02 || t > 14.0) break; } sh = clamp(sh, 0.0, 1.0);
  vec3 sunC = sunT(uAlt, uSun.y) * SUN, H = normalize(uSun - rd);
  vec3 F0 = mix(vec3(0.045), base, metal);
  vec3 col = (base * (1.0 - metal) / PI + F0 * min(ggx(max(dot(N, H), 0.0), rough), 90.0) * 0.25 / max(nv, 0.2)) * nl * sh * sunC;
  vec3 day = exp(-uAlt / vec3(11.0, 9.0, 7.0));
  col += base * (1.0 - metal) * mix(vec3(0.16, 0.26, 0.42) * 1.5, vec3(0.20, 0.42, 1.0) * day * 1.7 + 0.05, N.y * 0.5 + 0.5) * SUN * 0.11 * ao;
  col += env(reflect(rd, N)) * (F0 + (1.0 - F0) * pow(1.0 - nv, 5.0)) * mix(0.35, 1.0, glass) * ao;
  return col;
}
// ---------------------------------------------------------------- the launch site
/** Light that is not the sun's: the pad's floodlights and the engines. pm is metres from the vehicle. */
vec3 lampsE(vec3 pm, vec3 N){
  vec3 E = vec3(0.0); if (uMode != 1) return E;
  if (uSite.z > 0.001) for (int i = 0; i < 2; i++) { vec3 d = uPad + vec3(-17.2, 20.6, i == 0 ? 16.0 : -16.0) - pm; float r2 = dot(d, d); if (r2 < 6.0e5) E += vec3(1.0, 0.86, 0.66) * uSite.z * 2600.0 * max(dot(N, d) * inversesqrt(r2), 0.0) / (r2 + 4.0); }
  float thr = uPlume.x * (1.0 - 0.85 * uPlume.y);
  if (thr > 0.01) { vec3 d = (uPlume.z > 0.5 ? uBody * vec3(0.0, 3.0, 0.0) : uS1 + uBody * vec3(0.0, -10.0, 0.0)) - pm; float r2 = dot(d, d); if (r2 < 9.0e6) E += vec3(1.0, 0.62, 0.3) * thr * 16000.0 * max(dot(N, d) * inversesqrt(r2) * 0.8 + 0.2, 0.0) / (r2 + 30.0); }
  return E;
}
vec3 shadeLand(vec3 p, vec3 rd, float t){
  vec2 q = p.xz - uPadK, mq = q * 1000.0; float e = max(0.0015, t * 0.0015);
  float h = landH(q), hx = landH(q + vec2(e, 0.0)), hz = landH(q + vec2(0.0, e));
  vec3 N = normalize(vec3(h - hx, e, h - hz));
  float c = coast(q), n1 = texture(uN2, q / 1.3).r, n2 = texture(uN2, q / 0.11).g, n3 = texture(uN2, q / 0.017).r;
  float near = 1.0 - smoothstep(0.15, 0.9, t), f1 = texture(uN2, mq / 2.3).r, f2 = texture(uN2, mq / 0.37).g, f3 = texture(uN2, mq / 0.061).r, st = texture(uN2, mq / 19.0).g;
  vec3 alb; float wet = 0.0;
  if (uSite.x < 1.5) {
    alb = mix(vec3(0.085, 0.14, 0.035), vec3(0.21, 0.21, 0.07), smoothstep(0.3, 0.7, n1 * 0.6 + n2 * 0.4)) * (0.8 + 0.4 * n3);   // pasture, greener in the hollows
    float bush = smoothstep(0.42, 0.62, texture(uN2, q / 17.0 + 0.6).g + 0.25 * smoothstep(5.0, 30.0, c)) * smoothstep(1.5, 9.0, c);
    alb = mix(alb, vec3(0.028, 0.06, 0.026) * (0.7 + 0.6 * n1), bush);                                                           // native bush on the ranges
    alb = mix(alb, vec3(0.36, 0.31, 0.24) * (0.7 + 0.6 * n2), smoothstep(0.88, 0.66, N.y) * (1.0 - bush * 0.7));                 // the cliffs: pale mudstone
  } else if (uSite.x > 2.5) {
    float tone = textureLod(uN2, (floor(q / 1.6) + 0.5) / 512.0, 0.0).a, belt = texture(uN2, q / 7.0 + 0.2).r, far = texture(uN2, q / 31.0 + 0.5).g;
    alb = mix(vec3(0.40, 0.17, 0.08), vec3(0.50, 0.27, 0.13), smoothstep(0.3, 0.7, n1)) * (0.8 + 0.4 * n3);                       // red earth
    float pdk = (1.0 - smoothstep(20.0, 32.0, c + 8.0 * far)) * smoothstep(0.3, 1.5, c);
    alb = mix(alb, mix(vec3(0.50, 0.41, 0.22), vec3(0.42, 0.25, 0.13), step(0.55, tone)) * (0.85 + 0.3 * n2), pdk * 0.85);        // paddocks near the coast: stubble, or turned earth
    float mallee = smoothstep(0.46, 0.58, belt * 0.65 + n2 * 0.35 + 0.12 * smoothstep(25.0, 60.0, c)) * (1.0 - 0.6 * pdk);
    alb = mix(alb, vec3(0.06, 0.085, 0.045) * (0.7 + 0.6 * n3), mallee * 0.85);                                                  // mallee scrub in belts, thicker inland
    alb = mix(alb, vec3(0.56, 0.36, 0.20) * (0.9 + 0.2 * n2), smoothstep(0.62, 0.74, far) * smoothstep(30.0, 50.0, c) * (1.0 - mallee));   // sand dunes, north of the dog fence
  } else {
    float cell = texture(uN2, q / 5.0).b, tone = textureLod(uN2, (floor(q / 0.9) + 0.5) / 512.0, 0.0).a;                                    // fields, a kilometre or so across
    alb = mix(vec3(0.27, 0.23, 0.14), vec3(0.11, 0.17, 0.06), step(0.5, tone)) * (0.85 + 0.3 * n1);
    alb = mix(alb, vec3(0.035, 0.07, 0.03), smoothstep(0.5, 0.62, texture(uN2, q / 11.0 + 0.2).r + 0.1 * cell));                 // woods
    float marsh = 1.0 - smoothstep(4.5, 7.5, c);
    alb = mix(alb, mix(vec3(0.10, 0.13, 0.05), vec3(0.22, 0.20, 0.10), smoothstep(0.35, 0.65, n1)) * (0.8 + 0.4 * n3), marsh);   // salt marsh behind the islands
    wet = marsh * smoothstep(0.7, 1.4, c) * smoothstep(0.50, 0.56, texture(uN2, q / 6.3 + 0.37).g * 0.7 + texture(uN2, q / 1.4).r * 0.3);   // lagoons and creeks
    alb = mix(alb, vec3(0.02, 0.05, 0.06), max(wet, smoothstep(0.64, 0.7, n2) * smoothstep(0.3, 0.6, c) * marsh));
  }
  alb = mix(alb, vec3(0.46, 0.41, 0.31) * (0.85 + 0.3 * n3), smoothstep(0.045, 0.0, c));                                        // sand at the water's edge
  alb *= mix(1.0, (0.62 + 0.5 * f1) * (0.7 + 0.6 * f2) * (0.8 + 0.4 * f3), near);                                                                 // tussock and bare patches, close to
  float road = smoothstep(0.0055, 0.004, abs(q.y + 0.03 - 0.05 * sin(q.x * 2.3))) * step(q.x, -0.09) * step(0.03, c) * step(uSite.x, 2.5);
  alb = mix(alb, vec3(0.20, 0.20, 0.20) * (0.8 + 0.4 * f2), road);
  // the pad's hard standing: slabs with joints, stains, a scorched ring under the engines, a painted keep-out line, gravel round the edge
  float ap = max(abs(mq.x + 34.0) - 62.0, abs(mq.y + 6.0) - 44.0);
  if (ap < 6.0 && uSite.x < 2.5) {
    vec3 grav = vec3(0.30, 0.28, 0.25) * (0.5 + 0.7 * f3 * f2 + 0.3 * f1 + 0.3 * f3);
    alb = mix(alb, grav, smoothstep(6.0, 3.5, ap));
    vec2 jg = abs(fract(mq / 6.0) - 0.5); float jw = max(0.012, t * 1000.0 * (2.0 * uTan / uRes.y) / max(-rd.y, 0.04) / 6.0), joint = (1.0 - smoothstep(jw * 0.3, jw, min(jg.x, jg.y))) * min(1.0, 0.012 / jw), slab = textureLod(uN2, (floor(mq / 6.0) + 0.5) / 512.0, 0.0).a;
    vec3 conc = vec3(0.30, 0.30, 0.29) * (0.86 + 0.2 * slab) * (0.8 + 0.3 * f1) * (0.86 + 0.28 * f2) * (0.9 + 0.2 * f3);
    conc = mix(conc, vec3(0.16, 0.15, 0.14), 0.55 * smoothstep(0.55, 0.8, st));                           // stains
    conc *= 1.0 - 0.7 * joint;
    float rr = length(mq);
    conc = mix(conc, vec3(0.05, 0.045, 0.04), smoothstep(13.0, 3.0, rr + f1 * 5.0) * 0.85);                                      // where the flame has been
    conc = mix(conc, vec3(0.75, 0.6, 0.08), smoothstep(0.22, 0.14, abs(rr - 17.0)) * step(0.3, fract(atan(mq.y, mq.x) * 9.0)) * 0.8);
    alb = mix(alb, conc, smoothstep(0.3, -0.1, ap));
  }
  if (uSite.x > 2.5) { float cl = smoothstep(0.52, 0.64, f1 * 0.55 + f2 * 0.45) * near; alb = mix(alb, vec3(0.10, 0.11, 0.06), cl * 0.8); ap = 1.0; }   // saltbush and spinifex in clumps, close to
  N = normalize(N + vec3(f1 - 0.5, 0.0, f2 - 0.5) * 0.22 * near * step(0.3, ap));
  vec3 up = normalize(p - Cc);
  vec3 sunC = sunT(altOf(p), dot(up, uSun)) * SUN * cloudShadow(p);
  vec3 E = sunC * max(dot(N, uSun), 0.0) + vec3(0.16, 0.27, 0.5) * SUN * 0.12 * (0.6 + 0.4 * N.y) * gDay;
  E += lampsE(p * 1000.0 + uCam, N);
  if (uMode == 2) E += vec3(0.55, 0.66, 1.0) * mix(0.07, 0.55, smoothstep(40.0, 8.0, uAlt)) * (0.6 + 0.4 * N.y) * (1.0 - gDay);   // starlight, as a camera with the gain up sees it
  vec3 col = alb / PI * E;
  if (wet > 0.01) { vec3 H = normalize(uSun - rd); col += sunC * wet * min(ggx(max(dot(up, H), 0.0), 0.16), 300.0) * 0.02 + skyAt(up, reflect(rd, up)) * wet * 0.25; }   // still water takes the sky
  return col;
}/** What stands at the pad: the launch mount, the strongback (a steel lattice), two lamp masts, tanks, the hangar. Metres from the deck under the rocket. */
float lattice(vec3 p, vec2 hw, float cell, float r){
  vec2 a = abs(p.xz) - hw; float post = length(a) - r * 1.5;                                     // four legs
  float yy = (fract(p.y / cell) - 0.5) * cell, tri = (abs(fract(p.y / (2.0 * cell)) - 0.5) * 4.0 - 1.0);   // zig-zag up each face
  float ring = min(length(vec2(a.x, yy)), length(vec2(a.y, yy))) - r;
  float dx = length(vec2(a.x, (p.z - tri * hw.y) * 0.75)) - r, dz = length(vec2(a.y, (p.x - tri * hw.x) * 0.6)) - r;
  float d = min(post, min(max(ring, max(a.x, a.y)), min(dx, dz)));
  return max(d, max(a.x, a.y) - r * 2.0);
}
vec2 mapPad(vec3 p){
  // the launch mount: a black steel box the rocket stands on, railed round the top, with steps up to it
  vec2 r = vec2(max(sdBox(p - vec3(0.0, 1.2, 0.0), vec3(1.9, 1.2, 1.9)) - 0.03, -sdCyl(p - vec3(0.0, 1.2, 0.0), 1.0, 2.0)), 3.0);
  vec3 rl = vec3(abs(p.x), p.y - 2.4, abs(p.z));
  float rail = max(min(abs(rl.y - 1.0), abs(rl.y - 0.5)) - 0.025, abs(max(rl.x, rl.z) - 1.88) - 0.025);
  rail = min(rail, max(length(vec2(mod(rl.x, 0.95) - 0.475, rl.z - 1.88)) - 0.03, rl.y - 1.0)); rail = max(rail, max(-rl.y, max(rl.x, rl.z) - 1.93));
  U(rail, 8.0)
  U(max(sdBox(p - vec3(1.2, 1.2, 2.6), vec3(1.5, 1.2, 0.5)), (p.y - 2.4 + (p.x + 0.3) * 0.8) * 0.78), 3.0)        // steps
  // the strongback: a black mast hinged at its foot, which lets go and leans back as the rocket leaves
  vec3 t = p - vec3(-2.6, 2.2, 0.0); float ct = cos(uTilt), st = sin(uTilt); t.xy = mat2(ct, st, -st, ct) * t.xy;
  float tp = clamp(t.y / 16.0, 0.0, 1.0);
  U(sdBox(t - vec3(-0.25, 8.0, 0.0), vec3(mix(0.42, 0.24, tp), 8.0, mix(0.5, 0.3, tp))) - 0.02, 2.0)
  U(sdBox(vec3(t.x - 0.55, abs(t.y - 12.4) - 3.0, abs(t.z) - 0.3), vec3(0.75, 0.07, 0.05)), 2.0)                   // the arms that hold it
  U(sdBox(t - vec3(0.4, 16.1, 0.0), vec3(0.9, 0.14, 0.4)), 2.0)
  U(sdSeg(t, vec3(0.1, 15.4, 0.36), vec3(0.25, 9.0 + 2.0 * st, 0.55)) - 0.07, 2.0)                                 // hoses
  U(sdBox(p - vec3(-2.9, 1.1, 0.0), vec3(0.9, 1.1, 1.1)), 3.0)
  U(sdCyl(p - vec3(34.0, 3.6, -20.0), 6.0, 3.6) - 0.05, 3.0)                                                       // the water tank
  U(sdSeg(vec3(p.x, p.y, abs(p.z)), vec3(-18.0, 0.0, 16.0), vec3(-18.0, 21.0, 16.0)) - 0.16 * (1.25 - p.y / 60.0), 3.0)
  U(sdBox(vec3(p.x + 17.6, p.y - 21.0, abs(p.z) - 16.0), vec3(0.5, 0.35, 0.9)), 6.0)
  // the hangar: a steel-clad shed with a pitched roof, a roller door facing the pad, a lean-to and a radome
  vec3 b = p - vec3(-74.0, 0.0, -34.0);
  float shed = max(sdBox(b - vec3(0.0, 6.0, 0.0), vec3(15.0, 6.0, 9.0)), (b.y - 6.9 - (9.0 - abs(b.z)) * 0.26) * 0.96);
  U(shed, 4.0)
  U(max(sdBox(b - vec3(0.0, 9.0, 0.0), vec3(15.5, 3.0, 9.5)), abs(b.y - 7.0 - (9.0 - abs(b.z)) * 0.26) * 0.96 - 0.07), 7.0)   // the roof sheet, oversailing
  U(sdBox(b - vec3(-19.0, 2.1, 2.0), vec3(4.0, 2.1, 6.0)), 4.0)
  U(min(length(b - vec3(-19.0, 6.6, 2.0)) - 1.5, sdCyl(b - vec3(-19.0, 4.7, 2.0), 0.25, 0.6)), 5.0)
  U(sdSeg(vec3(p.x, p.y, abs(p.z - 24.0) - 2.4), vec3(-22.0, 2.4, 0.0), vec3(-34.0, 2.4, 0.0)) - 1.7, 5.0)   // propellant tanks on saddles
  U(sdBox(vec3(abs(p.x + 28.0) - 4.0, p.y - 0.5, abs(p.z - 24.0) - 2.4), vec3(0.25, 0.5, 1.5)), 1.0)
  return r;
}
vec3 shadePad(vec3 p, vec3 pm, vec3 rd, float m){
  vec2 e = vec2(0.012, 0.0);
  vec3 N = normalize(vec3(mapPad(p + e.xyy).x - mapPad(p - e.xyy).x, mapPad(p + e.yxy).x - mapPad(p - e.yxy).x, mapPad(p + e.yyx).x - mapPad(p - e.yyx).x));
  float n = textureLod(uN3, p * vec3(0.3, 0.06, 0.3), 0.0).r, n2 = textureLod(uN3, p * 1.7, 0.0).g;
  vec3 base; float rough = 0.7, glass = 0.0;
  if (m < 1.5) base = vec3(0.30) * (0.8 + 0.3 * n2);
  else if (m < 2.5) { base = vec3(0.035, 0.036, 0.04) * (0.8 + 0.5 * n) * (0.8 + 0.2 * step(0.12, fract(p.y * 0.55))); rough = 0.4; }   // black paint, in panels
  else if (m < 3.5) { base = vec3(0.16, 0.165, 0.17); rough = 0.45; }
  else if (m < 4.5) {
    vec3 b = p - vec3(-74.0, 0.0, -34.0);
    float rib = 0.5 + 0.5 * cos((abs(N.x) > 0.6 ? b.z : b.x) * 20.9);                                                      // box-rib cladding, 30 cm
    base = vec3(0.60, 0.64, 0.66) * (0.86 + 0.14 * rib) * (0.9 + 0.2 * n); N = normalize(N + (abs(N.x) > 0.6 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)) * (rib - 0.5) * 0.35 * step(abs(N.y), 0.5));
    if (b.y < 0.9) base = vec3(0.17, 0.18, 0.19);                                                                          // a dark plinth
    if (abs(b.y - 3.9) < 0.22) base = vec3(0.07, 0.19, 0.30);                                                               // a painted band
    if (N.x > 0.6 && abs(b.z) < 5.2 && b.y < 6.6 && b.x > 14.0) { float sl = 0.5 + 0.5 * cos(b.y * 31.0); base = vec3(0.50, 0.51, 0.52) * (0.75 + 0.25 * sl); N = normalize(N + vec3(0.0, sl - 0.5, 0.0) * 0.5); rough = 0.45; }   // the roller door
    if (N.z > 0.6 && b.y > 4.6 && b.y < 5.6 && abs(b.x) < 12.5 && fract(b.x / 2.5) > 0.12) { base = vec3(0.015, 0.02, 0.026); glass = 1.0; rough = 0.08; }   // a strip of windows
    if (N.z > 0.6 && b.y < 2.2 && abs(b.x + 9.0) < 0.55) base = vec3(0.07, 0.19, 0.30);                                      // a door
    base *= 1.0 - 0.35 * smoothstep(0.55, 0.85, textureLod(uN3, vec3(b.x * 0.25, b.y * 0.03, b.z * 0.25), 0.0).g) * smoothstep(8.0, 2.0, b.y);   // streaks down the walls
  }
  else if (m < 5.5) { base = vec3(0.80, 0.81, 0.80) * (0.9 + 0.15 * n); rough = 0.35; }
  else if (m < 6.5) base = vec3(0.2);
  else if (m > 7.5) { base = vec3(0.62, 0.06, 0.04); rough = 0.45; }                                              // red safety rails
  else { vec3 b = p - vec3(-74.0, 0.0, -34.0); float rib = 0.5 + 0.5 * cos(b.x * 15.7); base = vec3(0.30, 0.33, 0.36) * (0.85 + 0.15 * rib) * (0.85 + 0.3 * n); N = normalize(N + vec3(rib - 0.5, 0.0, 0.0) * 0.3); rough = 0.4; }
  float sh = 1.0, t = 0.2; for (int i = 0; i < 16; i++) { float d = min(mapPad(p + N * 0.04 + uSun * t).x, map(pm + N * 0.04 + uSun * t).x); sh = min(sh, 8.0 * d / t); t += clamp(d, 0.12, 3.0); if (sh < 0.02 || t > 40.0) break; } sh = clamp(sh, 0.0, 1.0);
  float ao = clamp(0.35 + 1.6 * mapPad(p + N * 0.3).x + 0.4 * mapPad(p + N * 1.2).x, 0.0, 1.0);
  vec3 sunC = sunT(uSite.y, uSun.y) * SUN, V = -rd, H = normalize(uSun + V), up = vec3(0.0, 1.0, 0.0); float nl = max(dot(N, uSun), 0.0), nv = max(dot(N, V), 0.03);
  vec3 E = sunC * nl * sh + mix(vec3(0.10, 0.11, 0.07) * 1.6, vec3(0.16, 0.27, 0.5) * 1.3, N.y * 0.5 + 0.5) * SUN * 0.12 * gDay * ao + lampsE(pm, N) * ao;
  vec3 col = base / PI * E + 0.04 * min(ggx(max(dot(N, H), 0.0), rough), 60.0) * 0.25 / max(nv, 0.25) * nl * sh * sunC;
  col += skyAt(up, reflect(rd, N)) * (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * mix(0.12, 1.0, glass) * ao;
  if (m > 5.5 && m < 6.5) col += vec3(1.0, 0.9, 0.72) * uSite.z * 9.0;
  return col;
}

vec3 shadeVeh(vec3 p, vec3 rd, float m){
  vec3 N = calcN(p), V = -rd, pb = p * uBody;
  vec3 base = vec3(0.02); float rough = 0.36, metal = 0.0, coat = 1.0, thru = 0.0;
  float n = textureLod(uN3, pb * vec3(0.7, 0.09, 0.7), 0.0).r;
  if (m < 1.5) {
    rough += (n - 0.5) * 0.16;
    float twill = sin((pb.y * 2.0 + atan(pb.z, pb.x) * 1.2) * 60.0) * sin((pb.y * 2.0 - atan(pb.z, pb.x) * 1.2) * 60.0);
    base *= 1.0 + 0.35 * twill;
    if (pb.y > 5.3) { base = vec3(0.035); rough = 0.5; coat = 0.4; }
    if (uMode == 1 && uKick.x < 0.5 && (abs(pb.y + 5.2) < 0.16 || abs(pb.y - 7.0) < 0.1 || abs(pb.y - 8.48) < 0.1)) { base = vec3(0.78, 0.79, 0.8); rough = 0.45; coat = 0.25; }   // the white rings: above the power pack, and at each end of stage two
    if (uMode == 1 && uKick.x < 0.5 && uFrost > 0.01) {                                             // frost on the cold tanks: stage one's upper two thirds, and stage two
      float fn = textureLod(uN3, pb * vec3(1.3, 0.35, 1.3), 0.0).r, f2 = textureLod(uN3, pb * vec3(5.0, 2.0, 5.0) + 0.3, 0.0).g;
      float fr = max(smoothstep(-1.5, -1.1, pb.y + (fn - 0.5) * 0.5) * (1.0 - smoothstep(4.45, 4.6, pb.y)), smoothstep(6.95, 7.05, pb.y) * (1.0 - smoothstep(8.45, 8.55, pb.y)));
      fr *= smoothstep(1.0 - uFrost * 1.25, 1.0 - uFrost * 1.25 + 0.25, fn * 0.6 + f2 * 0.4 + 0.25);       // it comes off in patches on the way up
      base = mix(base, vec3(0.84, 0.87, 0.9) * (0.88 + 0.2 * f2), fr); rough = mix(rough, 0.85, fr); coat *= 1.0 - fr;
    }
    if (uMode == 1 && uPatchA > 0.0 && uFair < 0.0 && pb.y > 8.3) {                 // the mission patch, on the side of the fairing the cameras see
      float w = 0.8 / max(uPatchA, 1.0), pa = atan(pb.x, pb.z) - 0.45; vec2 uv = abs(pa) < 1.4 ? vec2(pa * 0.6 / w, (pb.y - 9.2) / (w * uPatchA)) + 0.5 : vec2(-1.0);
      if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) { vec4 pt = texture(uPatchT, uv); pt.rgb = pow(pt.rgb, vec3(2.2)); base = mix(base, pt.rgb * 0.8, pt.a); rough = mix(rough, 0.55, pt.a); coat *= 1.0 - 0.6 * pt.a; }
    }
    float sc = uScorch * smoothstep(2.5, -5.6, pb.y - n * 3.0);
    float streak = textureLod(uN3, pb * vec3(2.6, 0.05, 2.6) + 0.2, 0.0).g;
    base = mix(base, mix(vec3(0.02, 0.014, 0.01), vec3(0.16, 0.13, 0.11), streak * streak * smoothstep(-1.0, -5.0, pb.y - n * 2.0)), sc); rough = mix(rough, 0.78, sc); coat *= 1.0 - sc * 0.8;
  } else if (m < 2.5) { base = vec3(0.045, 0.045, 0.05); rough = 0.62; coat = 0.0; }
  else if (m < 3.5) { base = vec3(0.42, 0.36, 0.31); metal = 1.0; rough = 0.34; coat = 0.0; }
  else if (m < 4.5) { base = vec3(0.55); metal = 1.0; rough = 0.42; coat = 0.0; }
  else if (m < 6.5) {
    vec3 q = p - gA; float s = dot(q, uChA); vec3 lat = q - uChA * s; float nn = m < 5.5 ? 8.0 : 16.0;
    float gi = floor((atan(dot(lat, gBz), dot(lat, gBx)) + PI) / (2.0 * PI / nn));
    base = mod(gi, 2.0) < 0.5 && uMode != 2 ? vec3(0.92, 0.33, 0.07) : vec3(0.9, 0.9, 0.86);   // the capsule's parachute is plain white
    rough = 0.85; coat = 0.0; thru = 0.55;
  } else if (m < 7.5) { base = vec3(0.8); rough = 0.8; coat = 0.0; }
  else if (m < 8.5) { base = vec3(0.92, 0.66, 0.24); metal = 1.0; rough = 0.3 + 0.2 * n; coat = 0.0; if (uMode == 2) base = mix(base, vec3(0.25, 0.2, 0.15), uScorch * 0.6); }
  else if (m < 9.5) { vec2 cg = abs(fract((abs((N * uBody).y) > 0.7 ? pb.xz : pb.xy) * vec2(8.0, 6.0)) - 0.5); base = vec3(0.012, 0.02, 0.07) * (1.0 - 0.6 * step(0.46, max(cg.x, cg.y))); rough = 0.18; coat = 1.0; }   // solar cells
  else if (m < 10.5) {
    base = vec3(0.78, 0.79, 0.8) * (0.9 + 0.2 * n); rough = 0.45; coat = 0.25;                                // white paint
    if (uMode == 2) { float sc = uScorch * (0.75 + 0.5 * n); base = mix(base, vec3(0.085, 0.08, 0.08) * (0.7 + 0.6 * n), min(sc, 1.0)); rough = mix(rough, 0.85, min(sc, 1.0)); coat *= 1.0 - min(sc, 1.0); }   // the shield comes back charred dark grey
  } else { base = mix(vec3(0.27, 0.21, 0.16), vec3(0.03, 0.025, 0.02), uScorch) * (0.75 + 0.5 * n); rough = 0.9; coat = 0.0; }   // the heat shield: tan, then char
  float sh = shadow(p + N * 0.02, uSun), ao = occl(p, N), nl = dot(N, uSun), nv = max(dot(N, V), 0.03);
  vec3 sunC = sunT(uAlt, uSun.y) * SUN, H = normalize(uSun + V); float nh = max(dot(N, H), 0.0), vh = max(dot(V, H), 0.0);
  vec3 F0 = mix(vec3(0.04), base, metal), F = F0 + (1.0 - F0) * pow(1.0 - vh, 5.0);
  vec3 col = (base * (1.0 - metal) / PI + F * min(ggx(nh, rough), 60.0) * 0.25 / max(nv, 0.2)) * max(nl, 0.0) * sh * sunC;
  col += base * thru / PI * max(-nl, 0.0) * sunC * 0.9 + base * thru / PI * sunC * 0.12;      // sun through the cloth
  float Fc = 0.04 + 0.96 * pow(1.0 - vh, 5.0);
  col += coat * Fc * min(ggx(nh, 0.09), 220.0) * 0.25 / max(nv, 0.2) * max(nl, 0.0) * sh * sunC;
  // the world around it: the Earth below, the sky above, mirrored in the lacquer
  vec3 R = reflect(rd, N); vec3 e = env(normalize(mix(R, N, rough * rough)));
  float Fe = 0.11 + 0.89 * pow(1.0 - nv, 4.0);
  col += e * (mix(vec3(Fe * coat), F0 + (1.0 - F0) * pow(1.0 - nv, 5.0), metal) * (1.0 - rough * 0.5) + (1.0 - coat) * (1.0 - metal) * 0.02) * ao;
  float dn = N.y * 0.5 + 0.5; vec3 day = exp(-uAlt / vec3(11.0, 9.0, 7.0));
  vec3 hemi = mix(vec3(0.30, 0.38, 0.52) * 1.25, vec3(0.20, 0.42, 1.0) * day * 1.6 + 0.05, dn) * SUN * 0.11 * gDay;
  if (uMode >= 1) { vec3 ml = normalize(vec3(0.45, 0.55, 0.7)); col += (base * (1.0 - metal) / PI * max(dot(N, ml), 0.0) + mix(vec3(0.04 * coat), base, metal) * min(ggx(max(dot(N, normalize(ml + V)), 0.0), max(rough, 0.2)), 30.0) * 0.1) * vec3(0.6, 0.72, 1.0) * (uMode == 2 ? 0.3 : 0.5) * (1.0 - gDay); }   // moonlight, once the sun is gone (for the capsule: starlight, with the gain up)
  if (uMode == 1) { col += ((base * (1.0 - metal) / PI + 0.004) * lampsE(p, N) + (coat * 0.02 + metal * 0.1 * base) * lampsE(p, R)) * ao * 0.3; }
  col += base * (1.0 - metal) * hemi * ao + base * thru * hemi * 0.6;
  // the shock in front lights whatever faces it, and the windward skin glows
  float face = max(dot(N, uVel), 0.0), hot = uHot * (m < 4.5 ? 1.0 : m > 9.5 || (uMode == 2 && m > 7.5) ? 0.22 : 0.0);
  col += (base + 0.03) * vec3(1.0, 0.45, 0.2) * hot * (face * 0.8 + 0.2) * 30.0 * ao;
  col += vec3(1.0, 0.32, 0.07) * pow(face, 2.0) * hot * hot * 22.0 * (0.6 + 0.8 * n);
  if (m > 1.5 && m < 3.5) col += vec3(1.0, 0.25, 0.04) * uGlow * 5.0 * (0.4 + n);
  if (m > 9.5 && uMode == 2) col += vec3(1.0, 0.27, 0.05) * max(uGlow - uHot, 0.0) * 2.2 * smoothstep(0.05, -0.3, pb.y) * (0.4 + n);       // the shield, still glowing after the fire has gone
  return col;
}

// ---------------------------------------------------------------- the wall: shock layer and wake, as a glowing volume
vec4 plasma(vec3 ro, vec3 rd, float tHit, float jit){
  if (uHot < 0.004) return vec4(0.0);
  bool cap = uMode == 2; if (cap) { ro *= 2.0; tHit *= 2.0; }                 // a capsule: the same fire at half the size
  // a cylinder round the line of flight
  float Rw = 7.0; float rv = dot(rd, uVel), ov = dot(ro, uVel); vec3 rl = rd - uVel * rv, ol = ro - uVel * ov;
  float A = dot(rl, rl), B = dot(rl, ol), C = dot(ol, ol) - Rw * Rw, h = B * B - A * C;
  if (h < 0.0 || A < 1e-6) return vec4(0.0);
  h = sqrt(h); float t0 = max((-B - h) / A, 0.0), t1 = min((-B + h) / A, tHit);
  if (t1 <= t0) return vec4(0.0);
  const int N = 26; float dt = (t1 - t0) / float(N); vec3 L = vec3(0.0); float T = 1.0;
  for (int i = 0; i < N; i++) {
    vec3 x = ro + rd * (t0 + dt * (float(i) + jit)); float s = dot(x, uVel);
    if (s > 9.0 || s < -90.0) continue;
    vec3 lat = x - uVel * s; float rho = length(lat);
    vec3 pb = x * uBody; float dB, dU;
    if (cap) { dB = capsule(pb * 0.5).x * 2.0; dU = capsule(((x + uVel * 0.6) * uBody) * 0.5).x * 2.0; s -= 5.0; }
    else { dB = sdCyl(pb, 0.62, 6.25); dU = sdCyl((x + uVel * 0.6) * uBody, 0.62, 6.25); }
    float face = clamp((dU - dB) / 0.6, 0.0, 1.0);
    vec3 nc = lat * 0.42 + uVel * (s * 0.022 + uTime * 4.0);
    float tu = textureLod(uN3, nc, 0.0).r, tf = textureLod(uN3, nc * 3.1 + 0.3, 0.0).g;
    // the bow shock stands off the windward faces
    float shock = face * face * (exp(-max(dB, 0.0) / 0.22) * 1.4 + exp(-pow((dB - 0.42 - tu * 0.12) / 0.11, 2.0)) * 1.1) * smoothstep(-0.02, 0.05, dB);
    // behind it, a sheath streaming back and a wake that widens and breaks up
    float back = max(-s - 2.0, 0.0), w = 0.85 + back * 0.03;
    float sheath = exp(-pow((rho - w) / (0.22 + back * 0.012), 2.0)) * smoothstep(8.0, -2.0, s) * exp(-back / 22.0);
    float core = exp(-pow(rho / (w * 0.75), 2.0)) * smoothstep(-5.0, -9.0, s) * exp(-back / 40.0) * 0.5;
    float skin = exp(-max(dB, 0.0) / 0.13) * (1.0 - face) * (0.25 + 1.5 * tu * tu) * 0.55 * smoothstep(-7.5, -3.0, s);
    float wake = (sheath * (0.04 + 2.6 * tu * tu * tu) * 0.3 + core * tf * tf * 0.5) * smoothstep(0.0, 0.35, dB) + skin * smoothstep(0.0, 0.06, dB);
    float e = (shock * 2.4 + wake) * uHot * (cap ? 0.13 : 1.0);
    vec3 c = mix(vec3(1.0, 0.24, 0.05), vec3(1.0, 0.62, 0.3), clamp(shock + wake * 0.5, 0.0, 1.0));
    c = mix(c, vec3(1.0, 0.9, 0.95), clamp(shock * 0.7, 0.0, 1.0)) + vec3(0.35, 0.2, 1.0) * face * exp(-pow((dB - 0.62) / 0.16, 2.0)) * 0.9;
    L += T * c * e * dt * 16.0; T *= exp(-e * dt * 0.05);
  }
  return vec4(L, 1.0 - T);
}
/** Cold nitrogen from the thrusters at the top of the stage: a short white fan in the sun. */
vec3 jets(vec3 ro, vec3 rd, float tHit, float jit){
  if (dot(uRcs, uRcs) < 1e-4) return vec3(0.0);
  vec3 top = uBody * vec3(0.0, 5.45, 0.0); vec2 b = sphere(ro, rd, top, 4.2);
  if (b.y < 0.0) return vec3(0.0);
  float t0 = max(b.x, 0.0), t1 = min(b.y, tHit); if (t1 <= t0) return vec3(0.0);
  const int N = 14; float dt = (t1 - t0) / float(N), s = 0.0;
  for (int i = 0; i < N; i++) {
    vec3 x = (ro + rd * (t0 + dt * (float(i) + jit))) * uBody - vec3(0.0, 5.45, 0.0);
    for (int j = 0; j < 4; j++) {
      float on = uRcs[j]; if (on < 0.01) continue;
      vec3 dir = j == 0 ? vec3(1.0, 0.0, 0.0) : j == 1 ? vec3(-1.0, 0.0, 0.0) : j == 2 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 0.0, -1.0);
      vec3 q = x - dir * 0.66; float u = dot(q, dir), rr = length(q - dir * u);
      float n = textureLod(uN3, q * 0.9 - dir * uTime * 2.0, 0.0).g;
      s += on * smoothstep(0.0, 0.08, u) * exp(-u / 1.1) * exp(-pow(rr / (0.04 + 0.3 * u), 2.0)) * (0.5 + n) * dt;
    }
  }
  return vec3(0.85, 0.93, 1.0) * s * SUN * 0.55;
}
/**
 * The splash. Water thrown by a twelve-metre cylinder going in at nine metres a second: a crown, a thin sheet that
 * flares out, tears into fingers at its rim and falls back; a jet up the middle as the hole it made closes; drops
 * on their own arcs; and a mist that hangs and drifts. Lit from behind by the sun, which is what makes spray shine.
 */
vec4 spray(vec3 ro, vec3 rd, float tHit, float jit){
  float ts = uSplash;
  if (ts < 0.0 || ts > 9.0) return vec4(0.0);
  vec3 c = vec3(0.0, -uSea, 0.0); vec2 b = sphere(ro, rd, c, 24.0);
  if (b.y < 0.0) return vec4(0.0);
  float t0 = max(b.x, 0.0), t1 = min(b.y, tHit); if (t1 <= t0) return vec4(0.0);
  float mu = dot(rd, uSun), shine = 0.22 + 0.14 * hg(mu, 0.6) + 0.08 * hg(mu, -0.3);
  vec3 lit = sunT(0.0, uSun.y) * SUN * shine + vec3(0.2, 0.3, 0.5) * SUN * 0.07;
  // ---- the sheets and the mist, as a volume
  const int N = 30; float dt = (t1 - t0) / float(N), T = 1.0, L = 0.0;
  float hc = max(11.5 * ts - 4.9 * ts * ts, 0.0), tj = ts - 0.5, hj = max(14.0 * tj - 4.9 * tj * tj, 0.0);
  for (int i = 0; i < N; i++) {
    vec3 x = ro + rd * (t0 + dt * (float(i) + jit)) - c; if (x.y < 0.0) continue;
    float r = length(x.xz), phi = atan(x.z, x.x);
    float n = textureLod(uN3, vec3(phi * 0.9, x.y * 0.12 - ts * 0.25, r * 0.15), 0.0).r, fine = textureLod(uN3, x * 0.85 + vec3(0.0, ts * 1.6, 0.0), 0.0).g;
    float d = 0.0;
    if (hc > 0.0) {                                                         // the crown
      float top = hc * (0.5 + 0.5 * pow(0.5 + 0.5 * cos(phi * 15.0 + n * 9.0), 0.6) * (0.5 + n)), k = x.y / max(top, 0.01);
      float rc = 1.1 + 3.0 * ts + 0.5 * x.y, th = 0.10 + 0.07 * ts + 0.1 * k;
      d += exp(-pow((r - rc) / th, 2.0)) * (1.0 - smoothstep(0.75, 1.0, k)) * mix(1.0, smoothstep(0.42, 0.7, fine) * 1.6, smoothstep(0.2, 0.85, k)) * 4.6 / (1.0 + ts * 1.8);
    }
    if (hj > 0.0) {                                                         // the jet
      float k = x.y / hj, rj = (0.95 - 0.55 * k) * (1.0 + 0.4 * n);
      d += exp(-pow(r / rj, 2.0)) * (1.0 - smoothstep(0.8, 1.0, k)) * mix(1.0, smoothstep(0.4, 0.7, fine) * 1.8, smoothstep(0.3, 0.95, k)) * 5.0 * exp(-max(tj - 1.6, 0.0) * 1.5);
    }
    vec2 dr = x.xz - vec2(0.8, 0.5) * ts;                                   // the mist, going with the wind
    d += exp(-dot(dr, dr) / (10.0 + 9.0 * ts)) * exp(-x.y / (1.2 + 0.9 * ts)) * (0.25 + fine) * 0.42 * smoothstep(0.1, 0.8, ts) * exp(-ts * 0.42);
    float Ts = exp(-d * dt); L += T * (1.0 - Ts); T *= Ts;
  }
  vec3 col = lit * L * 0.42; float alpha = 1.0 - T;
  // ---- the drops: each on its own arc, drawn where the ray passes it
  float pix = 2.0 * uTan / uRes.y, dl = 0.0;
  for (int i = 0; i < 130; i++) {
    vec3 h = hash33(vec3(float(i), 3.0, 17.0)), h2 = hash33(vec3(float(i), 29.0, 5.0));
    float tt = ts - h2.x * 0.55; if (tt < 0.0) continue;
    float ang = h.x * 6.2831853, vr = 1.5 + 6.5 * h.y * h.y, vy = 5.0 + 11.0 * h.z, y = vy * tt - 4.9 * tt * tt; if (y < 0.0) continue;
    vec3 pos = c + vec3(cos(ang) * (1.0 + vr * tt), y, sin(ang) * (1.0 + vr * tt)), dv = pos - ro;
    float tca = dot(dv, rd); if (tca < 0.0 || tca > tHit) continue;
    vec3 vel = vec3(cos(ang) * vr, vy - 9.8 * tt, sin(ang) * vr), off = dv - rd * tca;       // smeared along its flight, as a shutter would
    vec3 vp = vel - rd * dot(vel, rd); float sm = dot(off, vp) / max(dot(vp, vp), 1e-4); off -= vp * clamp(sm, -0.006, 0.006);
    float sz = 0.02 + 0.045 * h2.y * h2.y, se = max(sz, tca * pix * 0.6);
    dl += exp(-dot(off, off) / (se * se)) * (sz * sz) / (se * se) * 1.6;
  }
  col += lit * min(dl, 3.0) * 0.5;
  return vec4(col, alpha);
}

/** The exhaust: nine kerosene engines at sea level, a tight bright flame with shock diamonds; higher, it spreads into a wide pale fan; in vacuum, one engine's faint bell. */
vec4 plume(vec3 ro, vec3 rd, float tHit, float jit){
  float thr = uPlume.x; if (thr < 0.01) return vec4(0.0);
  float ex = uPlume.y; bool vac = uPlume.z > 0.5, kick = uPlume.z > 1.5;
  vec3 ax = -uBody[1], org = kick ? uBody * vec3(0.0, 8.27, 0.0) : vac ? uBody * vec3(0.0, 5.18, 0.0) : uS1 + uBody * vec3(0.0, -6.28, 0.0);
  float len = kick ? 3.2 : vac ? 30.0 : mix(15.0, 85.0, ex) * (0.55 + 0.45 * thr), spread = vac ? 0.30 : mix(0.018, 0.24, ex * ex), r0 = kick ? 0.12 : vac ? 0.4 : 0.56, Rw = (r0 + len * spread) * 1.5;
  vec3 oc = ro - org; float rv = dot(rd, ax), ov = dot(oc, ax); vec3 rl = rd - ax * rv, ol = oc - ax * ov;
  float A = dot(rl, rl), B = dot(rl, ol), C = dot(ol, ol) - Rw * Rw, h = B * B - A * C; float t0, t1;
  if (A < 1e-6) { if (C > 0.0) return vec4(0.0); t0 = 0.0; t1 = tHit; } else { if (h < 0.0) return vec4(0.0); h = sqrt(h); t0 = max((-B - h) / A, 0.0); t1 = min((-B + h) / A, tHit); }
  if (abs(rv) > 1e-5) { float ta = -ov / rv, tb = (len - ov) / rv; t0 = max(t0, min(ta, tb)); t1 = min(t1, max(ta, tb)); } else if (ov < 0.0 || ov > len) return vec4(0.0);
  if (t1 <= t0) return vec4(0.0);
  const int N = 30; float dt = (t1 - t0) / float(N); vec3 L = vec3(0.0); float T = 1.0;
  for (int i = 0; i < N; i++) {
    vec3 x = oc + rd * (t0 + dt * (float(i) + jit)); float s = dot(x, ax), k = s / len; vec3 lat = x - ax * s; float rho = length(lat), w = r0 + s * spread;
    vec3 nc = lat * (0.35 / w) + ax * (s * 0.045 - uTime * 7.0);
    float tu = textureLod(uN3, nc, 0.0).r, tf = textureLod(uN3, nc * 2.7 + 0.4, 0.0).g;
    float core = exp(-pow(rho / (w * 0.5), 2.0)) * exp(-k * mix(3.0, 5.5, ex));
    float shell = exp(-pow((rho - w * 0.72) / (w * 0.3), 2.0)) * exp(-k * 2.2) * (0.25 + 1.5 * tu * tu);
    float dia = vac ? 0.0 : (1.0 - ex) * exp(-pow(rho / (w * 0.42), 2.0)) * pow(0.5 + 0.5 * cos(s * 2.3 - 0.6), 5.0) * exp(-k * 3.5);
    float fade = (1.0 - smoothstep(0.8, 1.0, k)) * smoothstep(0.0, 0.25, s);
    float e = kick ? (core * 0.5 * exp(-k * 2.5) + shell * 0.012) : vac ? (core * 0.16 * exp(-k * 4.0) + shell * 0.006) : core * (0.7 + 0.6 * tf) * mix(3.2, 0.5, ex) + shell * mix(0.9, 0.1, ex) + dia * 2.0;
    e *= thr * fade * (vac ? 1.0 : mix(1.0, 0.3, ex * ex));
    vec3 c = mix(vec3(1.0, 0.5, 0.16), vec3(1.0, 0.92, 0.78), clamp(core * 1.6 + dia, 0.0, 1.0));
    c = mix(c, vec3(0.62, 0.76, 1.0), (vac ? 0.85 : ex * 0.75) * (1.0 - 0.6 * core));
    L += T * c * e * dt * 46.0 * uPlume.w; T *= exp(-e * dt * 0.035);
  }
  return vec4(L, 1.0 - T);
}
/** Steam and dust rolling out from the pad at ignition, lit by the sun, the sky and the flame. */
vec4 padSmoke(vec3 ro, vec3 rd, float tHit, float jit){
  float age = uSite.w; if (age < 0.0 || age > 70.0) return vec4(0.0);
  float Rs = 10.0 + 27.0 * sqrt(age), Hs = 3.0 + 3.4 * sqrt(age), thin = 1.0 - exp(-age / 22.0);
  vec2 b = sphere(ro, rd, uPad, Rs * 1.15); if (b.y < 0.0) return vec4(0.0);
  float t0 = max(b.x, 0.0), t1 = min(b.y, tHit); if (t1 <= t0) return vec4(0.0);
  const int N = 34; float dt = (t1 - t0) / float(N), T = 1.0; vec3 L = vec3(0.0);
  vec3 sunC = sunT(uSite.y, uSun.y) * SUN; float mu = dot(rd, uSun);
  for (int i = 0; i < N; i++) {
    if (T < 0.02) break;
    vec3 pm = ro + rd * (t0 + dt * (float(i) + jit)), x = pm - uPad; if (x.y < 0.0) continue;
    float r = length(x.xz); vec3 out3 = vec3(x.x, 0.0, x.z) / max(r, 0.1);
    vec3 q = x - out3 * age * 1.6 + vec3(0.0, -age * 0.9, 0.0);                                   // the lumps roll outward and up
    float big = textureLod(uN3, q * 0.021, 0.0).r, mid = textureLod(uN3, q * 0.07 + 0.3, 0.0).g, fine = textureLod(uN3, q * 0.24 + 0.6, 0.0).b;
    float top = Hs * (0.35 + 1.1 * big) * (0.4 + 0.6 * smoothstep(0.0, Rs * 0.5, r));           // low by the mount, heaped up further out
    float shape = (1.0 - smoothstep(Rs * 0.55, Rs, r + (big - 0.5) * Rs * 0.5)) * (1.0 - smoothstep(top * 0.6, top, x.y)) * smoothstep(2.5, 9.0, r);
    float d = smoothstep(0.38 + 0.4 * thin, 0.50 + 0.4 * thin, shape * (0.32 + 1.05 * mid) - (1.0 - fine) * 0.26) * smoothstep(0.0, 1.0, age) * 0.4;
    if (d < 1e-3) continue;
    // lit like a cumulus: the sun on the lumps, shade in the folds and underneath
    float sh = textureLod(uN3, (q + uSun * 5.0) * 0.07 + 0.3, 0.0).g, lit = clamp(0.35 + (mid - sh) * 3.0 + 0.5 * clamp(x.y / top, 0.0, 1.0), 0.08, 1.2);
    vec3 lum = sunC * (0.11 + 0.05 * hg(mu, 0.4)) * lit + vec3(0.2, 0.3, 0.48) * SUN * 0.08 * gDay + lampsE(pm, normalize(vec3(0.0, 3.0, 0.0) - x)) * 0.06 + lampsE(pm, vec3(0.0, 1.0, 0.0)) * 0.02;
    float Ts = exp(-d * dt); L += T * lum * (1.0 - Ts); T *= Ts;
  }
  return vec4(L, 1.0 - T);
}
/** The vehicle breaking up: a ball of burning propellant that swells, darkens and thins. */
vec4 boom(vec3 ro, vec3 rd, float tHit, float jit){
  float tb = uBoom; if (tb < 0.0 || tb > 4.0) return vec4(0.0);
  float R = 5.0 + 34.0 * pow(tb, 0.55); vec2 b = sphere(ro, rd, vec3(0.0, 2.0, 0.0), R); if (b.y < 0.0) return vec4(0.0);
  float t0 = max(b.x, 0.0), t1 = min(b.y, tHit); if (t1 <= t0) return vec4(0.0);
  const int N = 24; float dt = (t1 - t0) / float(N), T = 1.0; vec3 L = vec3(0.0);
  for (int i = 0; i < N; i++) {
    vec3 x = ro + rd * (t0 + dt * (float(i) + jit)) - vec3(0.0, 2.0, 0.0); float r = length(x) / R;
    float n = textureLod(uN3, x * (0.9 / R) + tb * 0.12, 0.0).r, f = textureLod(uN3, x * (3.1 / R) - tb * 0.2, 0.0).g;
    float d = smoothstep(1.0, 0.25, r + (0.5 - n) * 0.7) * smoothstep(0.2, 0.7, n * 0.6 + f * 0.6) * 9.0 / R;
    float hot = exp(-tb * 1.7) * (1.0 - r * 0.6);
    vec3 c = mix(vec3(1.0, 0.36, 0.08), vec3(1.0, 0.9, 0.7), hot * f) * hot * 520.0 + vec3(0.05, 0.045, 0.04) * (sunT(uAlt, uSun.y) * SUN * 0.3 + 0.2);
    float Ts = exp(-d * dt * (0.4 + tb)); L += T * c * (1.0 - Ts); T *= Ts;
  }
  return vec4(L, (1.0 - T) * exp(-max(tb - 1.5, 0.0) * 1.2));
}

vec3 stars(vec3 d){
  vec3 c = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 140.0 : 310.0; vec3 q = d * sc, i = floor(q), h = hash33(i), f = q - i - 0.5 - (h - 0.5) * 0.7;
    c += pow(h.z, k == 0 ? 22.0 : 12.0) * smoothstep(0.11, 0.0, length(f)) * mix(vec3(1.0, 0.82, 0.66), vec3(0.72, 0.84, 1.0), h.y) * (k == 0 ? 9.0 : 1.6);
  }
  float band = exp(-pow(dot(d, normalize(vec3(0.35, 0.5, 0.79))) * 4.0, 2.0));
  return c + vec3(0.05, 0.055, 0.075) * band * (0.4 + textureLod(uN3, d * 1.7, 0.0).r) * 0.5;
}

void main(){
  Rc = RG + uAlt; Cc = vec3(0.0, -Rc, 0.0); gDay = smoothstep(-0.14, 0.04, uSun.y) * 0.985 + 0.015;
  gA = uBody * vec3(0.0, uMode == 2 ? 0.2 : 6.1, 0.0); gBx = normalize(cross(uChA, vec3(0.0, 0.0, 1.0))); gBz = cross(uChA, gBx);
  vec2 pc = (gl_FragCoord.xy + uJit - 0.5 * uRes) / (0.5 * uRes.y);
  vec3 rd = normalize(uCamM * vec3(pc * uTan, 1.0));
  float jit = ign(gl_FragCoord.xy, uFrame), jit2 = ign(gl_FragCoord.yx + 17.0, uFrame);

  // ---- the stage and its parachutes
  float tV = 1e9, mV = 0.0;
  {
    float t0 = 1e9, t1 = -1.0;
    #define BND(c, r) { vec2 b = sphere(uCam, rd, c, r); if (b.y > 0.0) { t0 = min(t0, max(b.x, 0.0)); t1 = max(t1, b.y); } }
    if (uMode == 1) { if (uS1.x < 1e5) BND(uS1, 7.6) if (uBoom < 0.0) { if (uKick.x > 0.5) BND(uBody * vec3(0.0, 9.0, 0.0), (abs(uPay - 5.0) < 0.5 ? 2.2 : 1.7) + max(uKick.y, 0.0) * 1.1) else BND(uBody * vec3(0.0, 8.2, 0.0), 3.7 + (uFair >= 0.0 && uFair < 3.0 ? 4.0 * uFair + 6.0 * uFair * uFair : 0.0)) } }
    else BND(vec3(0.0), uMode == 2 ? 1.1 : 7.6)
    if (uDrogue > 0.001 || uMain > 0.001) { float Ln = uMode == 2 ? (uMain > 0.001 ? 11.0 : 5.0) : uTrail > 0.001 ? 50.0 : uMain > 0.001 ? 23.0 : 10.0; vec2 c = sphere(uCam, rd, gA + uChA * Ln * 0.62, Ln * 0.62 + 2.0); if (c.y > 0.0) { t0 = min(t0, max(c.x, 0.0)); t1 = max(t1, c.y); } }
    if (t1 > 0.0) { float t = t0; for (int i = 0; i < 110; i++) { vec2 d = map(uCam + rd * t); if (d.x < 0.0012 * t) { tV = t; mV = d.y; break; } t += d.x * 0.9; if (t > t1) break; } }
  }
  float tH = 1e9, mH = 0.0;
  if (uHeli.x < 1e5) {
    vec3 mid = (uHeli + uHook) * 0.5; vec2 b = sphere(uCam, rd, mid, 0.5 * length(uHeli - uHook) + 12.5);
    if (b.y > 0.0) { float t = max(b.x, 0.0); for (int i = 0; i < 90; i++) { vec2 d = mapHeli(uCam + rd * t); if (d.x < 0.0012 * t) { tH = t; mH = d.y; break; } t += d.x * 0.9; if (t > b.y) break; } }
  }
  // ---- the planet
  vec2 g = shellCam(rd, 0.0); float tP = g.x > 0.0 ? g.x : 1e9;
  vec3 col; float depth = 3000.0;
  float tL = 1e9;
  if (uSite.x > 0.5) {                                                         // the land: a height field near by, a flat map from far off
    float hmax = uSite.x < 1.5 ? 0.45 : uSite.x < 2.5 ? 0.012 : 0.09; vec2 top = shellCam(rd, hmax);
    float ta = uAlt > hmax ? top.x : 0.0, tb = tP < 1e8 ? tP : top.y;
    if (ta >= 0.0 && tb > ta) {
      if (uAlt > 14.0 || ta > 45.0) { if (tP < 1e8 && landH(rd.xz * tP - uPadK) > 0.0) tL = tP; }
      else { float t = ta + 1e-4, tp = t, hp = 1.0; for (int i = 0; i < 72; i++) { vec3 p = rd * t; float hh = altOf(p) - landH(p.xz - uPadK); if (hh < 0.0002 * t + 0.00002) { tL = hh < 0.0 ? mix(tp, t, hp / max(hp - hh, 1e-7)) : t; break; } tp = t; hp = hh; t += max(hh * 0.45, 0.0008 + 0.003 * t); if (t > tb) { if (tP < 1e8 && landH(rd.xz * tP - uPadK) > 0.0) tL = tP; break; } } }
    }
  }
  if (tL < 1e8) { col = shadeLand(rd * tL, rd, tL); tP = tL; depth = min(tP, 2900.0); }
  else if (tP < 1e8) { col = ocean(rd * tP, rd, tP); depth = min(tP, 2900.0); }
  else {
    col = stars(rd) * 1.6 * max(smoothstep(20.0, 48.0, uAlt), 0.22 * smoothstep(0.0, -0.14, uSun.y));
    float sd = dot(rd, uSun); col += vec3(1.0, 0.96, 0.9) * SUN * 220.0 * smoothstep(0.99994, 0.99998, sd);
  }
  // ---- cirrus high up, the cloud deck under it, then the air over everything
  float tC; vec4 cl = clouds(rd, tP, jit, tC);
  vec2 ci = shellCam(rd, 10.6); float tci = uAlt > 10.6 ? ci.x : ci.y; vec4 cir = vec4(0.0, 0.0, 0.0, 1.0);
  if (tci > 0.0 && tci < tP) {
    vec3 p = rd * tci; vec2 w = p.xz + uXZ; vec4 wx = texture(uWx, w / 2400.0 + 0.37);
    float a = smoothstep(0.42, 0.95, wx.a * (0.55 + 0.9 * texture(uN2, w / vec2(90.0, 23.0)).r)) * 0.42 * smoothstep(0.0, 6.0, abs(uAlt - 10.6) + 3.0);
    float mu = dot(rd, uSun);
    cir = vec4(sunT(10.6, uSun.y) * SUN * (0.17 + 0.07 * hg(mu, 0.7)) * a, 1.0 - a);
  }
  if (uAlt > 10.6) { col = col * cl.a + cl.rgb; col = col * cir.a + cir.rgb; } else { col = col * cir.a + cir.rgb; col = col * cl.a + cl.rgb; }
  float tEnd = mix(tC, tP, cl.a); if (cl.a < 0.5) depth = min(tC, 2900.0);
  vec3 L, T; scatter(vec3(0.0), rd, tEnd, jit2, uAtmN, L, T);
  col = col * T + L;
  // stage two, already a long way off: a point of light and its plume
  if (uS2.w > 0.001) { float a = acos(clamp(dot(rd, uS2.xyz), -1.0, 1.0)); vec3 dv = rd - uS2.xyz; float tail = max(dot(dv, normalize(vec3(-0.8, -0.5, 0.1))), 0.0);
    col += vec3(0.75, 0.86, 1.0) * uS2.w * (exp(-a * a * 4.0e5) * 60.0 + exp(-a * 900.0) * 2.0 + exp(-a * a * 2.0e4) * exp(-tail * 60.0) * smoothstep(0.0, 0.004, tail) * 6.0); }

  // ---- the recovery ship
  if (uShip.x < 1e5) {
    vec2 b = sphere(uCam, rd, uShip + vec3(0.0, 5.0, 0.0), 27.0);
    if (b.y > 0.0 && b.x < tP * 1000.0) {
      float t = max(b.x, 0.0), m = 0.0; bool hit = false;
      for (int i = 0; i < 80; i++) { vec2 d = mapShip(shipP(uCam + rd * t)); if (d.x < 0.0015 * t) { hit = true; m = d.y; break; } t += d.x; if (t > b.y) break; }
      if (hit && t < tP * 1000.0 && t < tV) {
        vec3 sc = shadeShip(shipP(uCam + rd * t), rd, m);
        vec3 Ls, Tsx; scatter(vec3(0.0), rd, t * 0.001, 0.5, 3, Ls, Tsx); col = sc * Tsx + Ls; depth = t * 0.001;
      }
    }
  }
  // ---- the stage over the world, and the volumes round it
  float seaM = tP * 1000.0;
  if (uMode == 1 && uSite.x > 0.5) {                                          // what stands at the pad
    vec2 b = sphere(uCam, rd, uPad + vec3(-32.0, 8.0, -6.0), 78.0);
    if (b.y > 0.0 && b.x < seaM) {
      float t = max(b.x, 0.0), m = 0.0; bool hit = false;
      for (int i = 0; i < 80; i++) { vec2 d = mapPad(uCam + rd * t - uPad); if (d.x < 0.0015 * t) { hit = true; m = d.y; break; } t += d.x; if (t > b.y) break; }
      if (hit && t < seaM) { vec3 pm = uCam + rd * t, sc = shadePad(pm - uPad, pm, rd, m); vec3 Ls, Tsx; scatter(vec3(0.0), rd, t * 0.001, 0.5, 3, Ls, Tsx); col = sc * Tsx + Ls; depth = t * 0.001; seaM = t; }
    }
  }
  bool veh = tV < 1e8 && tV < seaM;
  if (veh) {
    col = shadeVeh(uCam + rd * tV, rd, mV);
    float fog = cloudD(vec3(0.0), true) * SIG * tV * 0.001;                 // inside a cloud the stage fades
    if (fog > 0.0) { vec3 sunC = sunT(uAlt, uSun.y) * SUN; col = mix(sunC * 0.33 + vec3(0.26, 0.38, 0.62) * SUN * 0.08, col, exp(-fog)); }
    depth = -tV;
  }
  if (tH < 1e8 && tH < min(tV, seaM)) { col = shadeHeli(uCam + rd * tH, rd, mH); depth = -tH; }
  float tLim = min(min(tV, tH), seaM);
  if (uHeli.x < 1e5) {                                                         // the rotors: discs of blur, the blades just told apart
    for (int k = 0; k < 2; k++) {
      vec3 hub = uHeli + uHeliM * (k == 0 ? vec3(0.25, 3.05, 0.0) : vec3(-11.3, 3.7, -0.45)), nn = k == 0 ? uHeliM[1] : uHeliM[2]; float R = k == 0 ? 8.6 : 1.7;
      float dn = dot(rd, nn); if (abs(dn) < 1e-4) continue;
      float t = dot(hub - uCam, nn) / dn; if (t < 0.0 || t > tLim) continue;
      vec3 q = (uCam + rd * t - hub) * uHeliM; vec2 uv = k == 0 ? q.xz : q.xy; float r = length(uv); if (r > R) continue;
      float a = (0.10 + 0.30 * pow(0.5 + 0.5 * cos(4.0 * (atan(uv.y, uv.x) - uRotor * (k == 0 ? 1.0 : 3.1))), 5.0)) * (1.0 - smoothstep(R * 0.97, R, r)) * smoothstep(R * 0.03, R * 0.1, r) * clamp(abs(dn) * 6.0 + 0.5, 0.0, 1.0);
      vec3 rc = mix(vec3(0.03), vec3(0.9, 0.7, 0.05), smoothstep(R * 0.94, R * 0.96, r)) * (sunT(uAlt, uSun.y) * SUN * (0.12 + 0.3 * abs(dot(nn, uSun))) + 0.4);
      col = mix(col, rc, a);
    }
  }
  if (uMode == 1) {
    vec4 sm = padSmoke(uCam, rd, tLim, jit2); col = col * (1.0 - sm.a) + sm.rgb;
    vec4 pf = plume(uCam, rd, tLim, jit); col = col * (1.0 - pf.a) + pf.rgb;
    vec4 bm = boom(uCam, rd, tLim, jit); col = col * (1.0 - bm.a) + bm.rgb;
  }
  vec4 pl = plasma(uCam, rd, tLim, jit); col = col * (1.0 - pl.a) + pl.rgb;
  col += jets(uCam, rd, tLim, jit2);
  vec4 sp = spray(uCam, rd, tLim, jit); col = col * (1.0 - sp.a) + sp.rgb;
  o = vec4(min(col, vec3(30000.0)), depth);
}`;

/** Temporal anti-aliasing that also upsamples: the scene is drawn small and jittered, and gathered here at full size. */
export const TAA = `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o;
uniform sampler2D uCur, uHist; uniform vec2 uCurRes, uJit; uniform mat3 uCamM, uPrevM; uniform vec3 uCamD, uWorldD; uniform float uTan, uAspect, uReset;
vec3 tm(vec3 c){ return c / (1.0 + max(c.r, max(c.g, c.b))); }
vec3 itm(vec3 c){ return c / max(1.0 - max(c.r, max(c.g, c.b)), 1e-4); }
void main(){
  vec2 uv = vUV - uJit / uCurRes, px = 1.0 / uCurRes;
  vec4 c4 = texture(uCur, uv); vec3 c = tm(c4.rgb);
  vec3 m1 = c, m2 = c * c; float dn = texture(uCur, (floor(uv * uCurRes) + 0.5) * px).a;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { if (x == 0 && y == 0) continue; vec4 s = texture(uCur, uv + vec2(float(x), float(y)) * px); vec3 t = tm(s.rgb); m1 += t; m2 += t * t; if (s.a < 0.0 && (dn >= 0.0 || s.a > dn)) dn = s.a; }
  m1 /= 9.0; vec3 sg = sqrt(max(m2 / 9.0 - m1 * m1, 0.0));
  vec3 dir = normalize(uCamM * vec3((vUV * 2.0 - 1.0) * vec2(uAspect, 1.0) * uTan, 1.0));
  vec3 P = dn < 0.0 ? dir * (-dn) + uCamD : dn >= 2950.0 ? dir * 1.0e7 : dir * dn * 1000.0 + uWorldD;
  vec3 pl = P * uPrevM; vec2 puv = pl.xy / (pl.z * uTan * vec2(uAspect, 1.0)) * 0.5 + 0.5;
  float w = 0.1;
  if (uReset > 0.5 || pl.z <= 0.0 || any(lessThan(puv, vec2(0.0))) || any(greaterThan(puv, vec2(1.0)))) w = 1.0;
  vec3 h = tm(texture(uHist, puv).rgb);
  h = clamp(h, m1 - sg * 1.35 - 0.002, m1 + sg * 1.35 + 0.002);
  o = vec4(itm(mix(h, c, w)), 1.0);
}`;

export const DOWN = `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o; uniform sampler2D uTex; uniform vec2 uPx; uniform float uFirst, uKnee;
void main(){
  vec3 a = texture(uTex, vUV + uPx * vec2(-2, -2)).rgb, b = texture(uTex, vUV + uPx * vec2(0, -2)).rgb, c = texture(uTex, vUV + uPx * vec2(2, -2)).rgb;
  vec3 d = texture(uTex, vUV + uPx * vec2(-2, 0)).rgb, e = texture(uTex, vUV).rgb, f = texture(uTex, vUV + uPx * vec2(2, 0)).rgb;
  vec3 g = texture(uTex, vUV + uPx * vec2(-2, 2)).rgb, h = texture(uTex, vUV + uPx * vec2(0, 2)).rgb, i = texture(uTex, vUV + uPx * vec2(2, 2)).rgb;
  vec3 j = texture(uTex, vUV + uPx * vec2(-1, -1)).rgb, k = texture(uTex, vUV + uPx * vec2(1, -1)).rgb, l = texture(uTex, vUV + uPx * vec2(-1, 1)).rgb, m = texture(uTex, vUV + uPx * vec2(1, 1)).rgb;
  vec3 s = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  if (uFirst > 0.5) { float br = max(s.r, max(s.g, s.b)); s *= max(br - uKnee, 0.0) / max(br, 1e-4); s = min(s, vec3(400.0)); }
  o = vec4(s, 1.0);
}`;

export const UP = `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o; uniform sampler2D uTex; uniform vec2 uPx;
void main(){
  vec3 s = texture(uTex, vUV).rgb * 4.0;
  s += (texture(uTex, vUV + uPx * vec2(-1, 0)).rgb + texture(uTex, vUV + uPx * vec2(1, 0)).rgb + texture(uTex, vUV + uPx * vec2(0, -1)).rgb + texture(uTex, vUV + uPx * vec2(0, 1)).rgb) * 2.0;
  s += texture(uTex, vUV + uPx * vec2(-1, -1)).rgb + texture(uTex, vUV + uPx * vec2(1, -1)).rgb + texture(uTex, vUV + uPx * vec2(-1, 1)).rgb + texture(uTex, vUV + uPx * vec2(1, 1)).rgb;
  o = vec4(s / 16.0, 1.0);
}`;

/** The lens and the film: bloom, ghosts, streak, fringing, exposure, tone curve, vignette, grain. */
export const POST = `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o;
uniform sampler2D uTex, uBloom, uBloomS; uniform vec2 uPx; uniform float uExp, uTime, uShake, uFlash, uAspect, uGhost;
vec3 aces(vec3 x){ x = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777) * x; vec3 a = x * (x + 0.0245786) - 0.000090537, b = x * (0.983729 * x + 0.4329510) + 0.238081; x = a / b; return clamp(mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602) * x, 0.0, 1.0); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 c = vUV - 0.5; float r2 = dot(c * vec2(uAspect, 1.0), c * vec2(uAspect, 1.0));
  vec2 uv = 0.5 + c * (1.0 - 0.018 * r2 - uShake * 0.01 * r2);              // a little barrel, more under load
  vec2 ca = c * (0.0005 + 0.003 * uShake) * (0.4 + r2 * 2.2);
  vec3 col = vec3(texture(uTex, uv + ca).r, texture(uTex, uv).g, texture(uTex, uv - ca).b);
  vec3 n = texture(uTex, uv + vec2(uPx.x, 0.0)).rgb + texture(uTex, uv - vec2(uPx.x, 0.0)).rgb + texture(uTex, uv + vec2(0.0, uPx.y)).rgb + texture(uTex, uv - vec2(0.0, uPx.y)).rgb;
  col = max(col + (col - n * 0.25) * 0.35, 0.0);                             // sharpen what the upsampling softened
  vec3 bl = texture(uBloom, uv).rgb;
  col += bl * 0.11;
  // ghosts and a halo from the brightest things, through the middle of the lens
  vec2 gv = 0.5 - c; vec3 gh = vec3(0.0);
  gh += texture(uBloomS, 0.5 + (gv - 0.5) * 0.55).rgb * vec3(0.5, 0.75, 1.0) * 0.5;
  gh += texture(uBloomS, 0.5 + (gv - 0.5) * 1.6).rgb * vec3(1.0, 0.6, 0.4) * 0.28;
  gh += texture(uBloomS, 0.5 + (uv - 0.5) * -0.28).rgb * vec3(0.6, 1.0, 0.7) * 0.2;
  col += max(gh - uGhost, 0.0) * 0.03 * smoothstep(0.75, 0.2, sqrt(r2));
  col += max(texture(uBloomS, vec2(uv.x * 0.35 + 0.325, uv.y)).rgb - uGhost * 0.5, 0.0) * vec3(0.5, 0.7, 1.0) * 0.02;  // the sideways streak of the lens
  col *= uExp * (1.0 + uFlash * 2.5);
  col *= mix(1.0, 0.66, smoothstep(0.15, 1.1, r2));
  col = aces(col * 1.7);
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.22);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, 1.06) * mix(vec3(0.97, 1.0, 1.05), vec3(1.04, 1.0, 0.95), smoothstep(0.1, 0.8, l)); // cool shadows, warm lights
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5) * 0.022 + (hash(gl_FragCoord.yx * 1.3 + 3.1) - 0.5) / 255.0;
  o = vec4(col, 1.0);
}`;
