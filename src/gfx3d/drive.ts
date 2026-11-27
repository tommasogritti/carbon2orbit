// The drive's world, for the 3D engine (engine.ts): Road to Māhia, at ground level. It is the SCENE program with its own
// main(): the planet, the air, the clouds and the sea come from there unchanged, and this adds the land at a scale of
// centimetres, from the real road and the real ground (src/drive/stages.json, laid into textures by src/drive/world.ts).
//
// Units: metres, in the stage's frame (x east, z south, y up from mean sea level), from its origin where the truck starts.
// What it reads:
//   uRoadT  per texel of the stage's box: lateral distance from the road's centre line (+ right of travel), distance along
//           it, the road's height there, and the ground's height (the LINZ elevation model, with the sea bed under water)
//   uProfT  per 4 m of road: width, kind bits (1 gravel, 2 bridge, 4 centre line, 8 edge lines, 16 town), centre line kind
//           (0 none, 1 dashed, 2 no-overtaking), lean of the bank
//   uMaskT  water, wood, scrub, sand;  uMask2T town, farm, cliff, the old railway (distance to its centre, 0..8 m)
//   uGridT  per 6 m cell, the indices of up to eight things standing in it;  uObjT the things, two texels each
//   uRegT   the region's ground, 300 m cells, for the far hills and the far coast;  uAtlasT the faces of the road signs
import { SCENE } from './shaders';

const DRIVE_CODE = /* glsl */ `
uniform sampler2D uRoadT, uProfT, uMaskT, uMask2T, uGridT, uObjT, uRegT, uAtlasT;
uniform vec4 uBox;        // the stage's box: x0, z0, 1 / size, size
uniform vec4 uProf;       // the road table: s of its first row, 1 / (rows * 4 m), rows, the stage's length
uniform vec4 uGrid;       // the grid: x0, z0, cell size, cells per side
uniform vec4 uReg;        // the region: x0, z0 (stage metres), 1 / width, 1 / depth
uniform vec3 uTruckP;     // the truck: where it stands (between the rear axles, on the road)
uniform mat3 uTruckM;     // and its axes: right, up, forward
uniform vec4 uDrv;        // steering angle (rad), wheel turn (rad), brake lights 0..1, how far the load has shifted (m)
uniform vec4 uSheep[6];   // sheep: x, z, heading, step (x > 1e5: none)
uniform vec4 uPadP;       // the launch pad's deck (x, y, z) and its heading; x > 1e5 off
uniform vec4 uBridge;     // the bridge: s from, s to (none when from > to), deck thickness, rail height
uniform vec4 uBridgeB;    // and the box it stands in: x0, z0, x1, z1
uniform vec4 uLook;       // dust behind the wheels 0..1, wet road 0..1, how far the wind bends the grass, the stage (0..5)
uniform float uSea0;      // mean sea level, m (0); kept as a uniform for the tide
uniform float uHmax;      // nothing on the stage or in the region stands higher
uniform float uDbg;       // dev: paint over-bright pixels by what they are
uniform sampler2D uOccT;  // what stands, as heights: lowest leaf or eave (inverted), top, how solid, the top blurred

#define TAU 6.2831853
const float RE = 6.36e6;
float n2(vec2 p){ return textureLod(uN2, p, 0.0).r; }
float lumi(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float sq(float x){ return x * x; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
bool inBox(vec2 xz){ vec2 u = (xz - uBox.xy) * uBox.z; return u.x > 0.002 && u.y > 0.002 && u.x < 0.998 && u.y < 0.998; }
vec4 roadAt(vec2 xz){ return textureLod(uRoadT, (xz - uBox.xy) * uBox.z, 0.0); }
vec4 profAt(float s){ return textureLod(uProfT, vec2((s - uProf.x) * uProf.y, 0.5), 0.0); }
vec4 maskAt(vec2 xz){ return textureLod(uMaskT, (xz - uBox.xy) * uBox.z, 0.0); }
vec4 mask2At(vec2 xz){ return textureLod(uMask2T, (xz - uBox.xy) * uBox.z, 0.0); }
bool bit(float k, float b){ return mod(floor(k / b), 2.0) > 0.5; }

// ---------------------------------------------------------------- the ground
struct Gnd { float h; float d; float s; float w2; float kind; float base; float edge; };
/** The ground's height at a point, and where it lies from the road. The road's cut and fill into the ground (a crowned
    carriageway, a shoulder, a drain on the high side, a batter up or down to the hillside) is baked into uRoadT on the CPU,
    exactly as the truck's wheels feel it; only a town's kerbs are added here. */
float regionH(vec2 xz){
  vec2 u = (xz - uReg.xy) * uReg.zw; float h = textureLod(uRegT, u, 0.0).r;
  return h + (n2(xz / 1900.0) - 0.5) * 18.0 * smoothstep(5.0, 60.0, h) + (n2(xz / 410.0 + 0.3) - 0.5) * 7.0 * smoothstep(3.0, 30.0, h);
}
float kerb(float ad, float w2){ return 0.13 * smoothstep(w2, w2 + 0.03, ad) * (1.0 - smoothstep(w2 + 1.9, w2 + 2.4, ad)); }
Gnd ground(vec2 xz){
  Gnd g; g.d = 1e4; g.s = 0.0; g.w2 = 3.0; g.kind = 0.0; g.edge = 1e4;
  if (!inBox(xz)) { g.h = regionH(xz); g.base = g.h; return g; }
  vec4 R = roadAt(xz);
  g.d = R.x; g.s = R.y; g.base = R.z; g.h = R.w; g.edge = abs(R.x) - 3.0;
  if (abs(R.x) < 30.0) { vec4 P = profAt(R.y); g.w2 = P.x * 0.5; g.kind = P.y; g.edge = abs(R.x) - g.w2; if (bit(P.y, 16.0)) g.h += kerb(abs(R.x), g.w2); }
  return g;
}
float gH(vec2 xz){
  if (!inBox(xz)) return regionH(xz);
  vec4 R = roadAt(xz); float h = R.w;
  if (abs(R.x) < 12.0) { vec4 P = profAt(R.y); if (bit(P.y, 16.0)) h += kerb(abs(R.x), P.x * 0.5); }
  return h;
}
/** What a ray meets of the ground (or the water over it): the earth curves away under a long view. */
float marchGround(vec3 ro, vec3 rd, float tMax, float jit){
  float t = 0.15 + 0.2 * jit, tp = t, hp = 1e3;
  float k = dot(rd.xz, rd.xz) / (2.0 * RE);
  for (int i = 0; i < 160; i++) {
    vec3 p = ro + rd * t; float y = p.y + k * t * t;
    if (rd.y > 0.0 && y > uHmax) break;                                   // above everything, and climbing
    float hh = y - max(gH(p.xz), uSea0);
    if (hh < 0.0012 * t) { return hh < 0.0 && hp < 1e2 ? mix(tp, t, hp / max(hp - hh, 1e-6)) : t; }
    tp = t; hp = hh;
    t += max(hh * (t < 60.0 ? 0.5 : 0.7), 0.012 + t * 0.003);
    if (t > tMax) break;
  }
  return 1e9;
}
vec4 occAt(vec2 xz){ return textureLod(uOccT, (xz - uBox.xy) * uBox.z, 0.0); }

// ---------------------------------------------------------------- things: a grid of what stands near the road
// An object is two texels: (x, z, y of its foot, kind), (heading, a, b, c). Kinds:
//  1 house (a b half sizes, c wall height + roof colour * 16)  2 shed  3 shop or hall (flat roof, verandah to the road)
//  4 the lighthouse  5 power pole  6 tree (a height, b crown radius, c species: 0 pine 1 macrocarpa 2 Norfolk pine 3 broadleaf
//  4 cabbage tree 5 palm 6 kānuka 7 gorse, in flower)  7 edge marker post (a: side)  8 fence post  9 sign (a b half sizes, c atlas cell)
//  10 toetoe  11 flax  12 water tank  13 driftwood log  14 gate post  15 cattle stop  16 mailbox
//  20 power span (second texel: x1, z1, y1, sag)  21 fence span (x1, z1, y1, wires)
vec4 obj0(float i){ return texelFetch(uObjT, ivec2(int(mod(i, 2048.0)) * 2, int(i / 2048.0)), 0); }
vec4 obj1(float i){ return texelFetch(uObjT, ivec2(int(mod(i, 2048.0)) * 2 + 1, int(i / 2048.0)), 0); }

float sdCap(vec3 p, vec3 a, vec3 b, float r){ return sdSeg(p, a, b) - r; }
float sdPrismX(vec3 p, float hw, float hh, float hl){ vec3 q = abs(p); return max(q.z - hl, max(q.x * hh / hw + p.y - hh, -p.y) * (hw / length(vec2(hw, hh)))); }
float sdRoundBox(vec3 p, vec3 b, float r){ return sdBox(p, b - r) - r; }
/** Foliage: a crown as an ellipsoid broken up into clumps of leaves, coarser for the bigger trees. */
float leaves(vec3 q, vec3 r, float clump, float seed){
  float d = sdEll(q, r);
  if (d > 1.2 * clump) return d;
  float n = textureLod(uN3, q / (clump * 6.0) + seed, 0.0).r, m = textureLod(uN3, q / (clump * 1.7) + seed * 1.7, 0.0).g;
  return d + (n - 0.5) * clump * 1.9 + (m - 0.5) * clump * 0.8 + clump * 0.35;
}
/** A broadleaf or conifer crown as a cluster of leafy clumps round a core: irregular, lobed, open at the edges. */
float crown(vec3 q, vec3 R, float clump, float seed, int n){
  float d = sdEll(q, R * 0.62);
  for (int k = 0; k < 7; k++) {
    if (k >= n) break;
    vec3 h = hash33(vec3(seed * 13.0 + float(k) * 7.0, seed * 3.0, float(k)));
    vec3 dir = normalize(h * 2.0 - 1.0 + vec3(0.0, 0.35, 0.0));
    vec3 c = dir * R * 0.55; float rr = (0.38 + 0.22 * h.x) * min(R.x, R.y);
    d = smin(d, length(q - c) - rr, rr * 0.6);
  }
  if (d > 1.6 * clump) return d;
  float n1 = textureLod(uN3, q / (clump * 5.5) + seed, 0.0).r, n2v = textureLod(uN3, q / (clump * 1.6) + seed * 1.7, 0.0).g, n3v = textureLod(uN3, q / (clump * 3.2) + seed * 0.3, 0.0).b;
  d = d + (n1 - 0.5) * clump * 2.6 + (n2v - 0.5) * clump * 1.1 + clump * 0.5;
  return max(d, (0.36 - n3v) * clump * 3.0 * smoothstep(-clump * 2.5, 0.0, d));       // gaps between the clumps, where the light gets through
}
/** The distance to one object, in its own frame (y up from its foot), and what it is made of. */
vec2 objSD(vec3 p, vec4 a, vec4 b){
  float k = a.w; vec3 q = p - vec3(a.x, a.z, a.y); q.xz = rot(b.x) * q.xz;
  if (k < 1.5) {                                                    // a house: weatherboards under a gabled iron roof
    float wall = mod(b.w, 16.0), hx = b.y, hz = b.z;
    float body = sdBox(q - vec3(0.0, wall * 0.5, 0.0), vec3(hx, wall * 0.5, hz));
    bool alongX = hx > hz; vec3 rq = alongX ? q.zyx : q; float rw = (alongX ? hz : hx) + 0.45, rl = (alongX ? hx : hz) + 0.45, rh = rw * 0.42;
    float roof = sdPrismX(rq - vec3(0.0, wall, 0.0), rw, rh, rl);
    if (fract(a.x * 0.0731 + a.y * 0.0413) < 0.55) roof = max(max(roof, sdPrismX(rq.zyx - vec3(0.0, wall, 0.0), rl, rh, rw)), -(rq.y - wall + 0.25));   // hipped, as most houses of the 1950s to 70s are
    else roof = max(roof, -sdPrismX(rq - vec3(0.0, wall - 0.12, 0.0), rw - 0.1, rh - 0.05, rl + 1.0));  // gabled: a sheet, not a solid
    float chim = sdBox(q - vec3(hx * 0.4, wall + rh * 0.8, hz * 0.2), vec3(0.3, rh * 0.6, 0.3));
    vec2 r = vec2(body, 1.0); if (roof < r.x) r = vec2(roof, 2.0); if (chim < r.x) r = vec2(chim, 3.0);
    return r;
  }
  if (k < 2.5) {                                                    // a shed: corrugated iron, a low gable, a dark open bay
    float hx = b.y, hz = b.z, wall = 3.2;
    float body = sdBox(q - vec3(0.0, wall * 0.5, 0.0), vec3(hx, wall * 0.5, hz));
    bool alongX = hx > hz; vec3 rq = alongX ? q.zyx : q; float rw = (alongX ? hz : hx) + 0.25, rl = (alongX ? hx : hz) + 0.25;
    float roof = max(sdPrismX(rq - vec3(0.0, wall, 0.0), rw, rw * 0.22, rl), -sdPrismX(rq - vec3(0.0, wall - 0.1, 0.0), rw - 0.08, rw * 0.22 - 0.03, rl + 1.0));
    vec2 r = vec2(body, 4.0); if (roof < r.x) r = vec2(roof, 2.0); return r;
  }
  if (k < 3.5) {                                                    // a shop or hall: two storeys, a parapet, a verandah over the footpath
    float hx = b.y, hz = b.z, lv = max(1.0, mod(b.w, 16.0)), hgt = 3.6 * lv + 0.7;
    float body = sdBox(q - vec3(0.0, hgt * 0.5, 0.0), vec3(hx, hgt * 0.5, hz));
    float ver = sdBox(q - vec3(0.0, 3.25, hz + 1.4), vec3(hx, 0.09, 1.45));                            // the verandah, on the road side (+z)
    float post = sdBox(vec3(mod(q.x + hx, 3.6) - 1.8, q.y - 1.6, q.z - hz - 2.7), vec3(0.06, 1.6, 0.06));
    post = max(post, abs(q.x) - hx);
    vec2 r = vec2(body, 5.0); if (ver < r.x) r = vec2(ver, 6.0); if (post < r.x) r = vec2(post, 6.0); return r;
  }
  if (k < 4.5) {                                                    // the lighthouse: a white timber tower, its gallery, its lantern
    float y = q.y, rr = mix(2.3, 1.45, clamp(y / 9.5, 0.0, 1.0)), ang = atan(q.z, q.x);
    float hexr = length(q.xz) * cos(mod(ang + PI / 6.0, PI / 3.0) - PI / 6.0);
    float tower = max(hexr - rr, max(-y, y - 9.5));
    float gal = sdCyl(q - vec3(0.0, 9.6, 0.0), 2.0, 0.12);
    float rail = max(abs(length(q.xz) - 1.95) - 0.03, abs(y - 10.15) - 0.5); rail = max(rail, -max(abs(fract(ang * 5.0) - 0.5) - 0.42, abs(y - 10.1) - 0.38));
    float lan = sdCyl(q - vec3(0.0, 10.6, 0.0), 1.1, 0.9), dome = max(length(q - vec3(0.0, 11.4, 0.0)) - 1.15, 11.4 - y);
    float vent = sdCyl(q - vec3(0.0, 12.65, 0.0), 0.2, 0.25);
    vec2 r = vec2(tower, 7.0); if (gal < r.x) r = vec2(gal, 7.0); if (rail < r.x) r = vec2(rail, 8.0); if (lan < r.x) r = vec2(lan, 9.0); if (min(dome, vent) < r.x) r = vec2(min(dome, vent), 8.0);
    return r;
  }
  if (k < 5.5) {                                                    // a power pole: a timber pole, a crossarm, insulators
    float hgt = b.y > 0.0 ? b.y : 9.5;
    float pole = sdCap(q, vec3(0.0), vec3(0.0, hgt, 0.0), mix(0.15, 0.11, q.y / hgt));
    float arm = sdBox(q - vec3(0.0, hgt - 0.6, 0.0), vec3(1.2, 0.06, 0.05));
    float ins = sdBox(vec3(abs(q.x) - 1.0, q.y - hgt - 0.5, q.z), vec3(0.05, 0.12, 0.05)); ins = min(ins, sdBox(q - vec3(0.0, hgt + 0.1, 0.0), vec3(0.05, 0.14, 0.05)));
    vec2 r = vec2(pole, 10.0); if (arm < r.x) r = vec2(arm, 10.0); if (ins < r.x) r = vec2(ins, 11.0); return r;
  }
  if (k < 6.5) {                                                    // a tree
    float hgt = b.y, cr = b.z, sp = b.w, seed = fract(a.x * 0.137 + a.y * 0.073) * 7.0;
    vec3 w = q + vec3(sin(uTime * 0.9 + seed) , 0.0, cos(uTime * 0.7 + seed)) * 0.04 * max(q.y, 0.0) / max(hgt, 1.0);   // the wind
    float trunk, cro; vec2 r;
    float cr2 = 1e3;
    if (sp < 0.5) {         // radiata pine: a tall trunk bare to half way, a dark ragged crown in big separate clumps
      trunk = sdCap(w, vec3(0.0), vec3(0.0, hgt * 0.86, 0.0), mix(0.34, 0.1, q.y / hgt) * max(cr, 2.5) / 4.5);
      trunk = min(trunk, sdCap(w, vec3(0.0, hgt * 0.55, 0.0), vec3(cr * 0.7, hgt * 0.68, cr * 0.2), 0.12));
      cr2 = crown(w - vec3(0.0, hgt * 0.72, 0.0), vec3(cr, hgt * 0.26, cr), 1.1, seed, 7);
    } else if (sp < 1.5) {  // macrocarpa: massive, dense, low-branching, flat-topped with age
      trunk = min(sdCap(w, vec3(0.0), vec3(0.4, hgt * 0.45, 0.0), 0.5 * cr / 5.0), sdCap(w, vec3(0.0, 1.5, 0.0), vec3(-cr * 0.5, hgt * 0.5, cr * 0.3), 0.3));
      cr2 = crown(w - vec3(0.0, hgt * 0.55, 0.0), vec3(cr, hgt * 0.46, cr * 0.92), 0.95, seed, 7);
    } else if (sp < 2.5) {  // Norfolk Island pine: a straight stem; tiers of five or six level branches, each a brush of foliage, upturned at the tip
      trunk = sdCap(w, vec3(0.0), vec3(0.0, hgt, 0.0), mix(0.45, 0.07, q.y / hgt));
      float tier = 1.25 + 0.15 * sin(seed * 3.0), y0 = hgt * 0.28, ti = clamp(floor((w.y - y0) / tier + 0.5), 0.0, floor((hgt - y0) / tier));
      for (int j = -1; j <= 0; j++) {
        float tj = ti + float(j), ty = y0 + tj * tier; if (ty < y0 - 0.1 || ty > hgt) continue;
        float rr = cr * clamp(1.05 - (ty - y0) / (hgt - y0), 0.1, 1.0) * (0.85 + 0.3 * fract(sin(tj * 12.7 + seed) * 43758.5));
        vec3 l = w - vec3(0.0, ty, 0.0); float nb = 5.0 + mod(tj, 2.0), sec = TAU / nb, an = atan(l.z, l.x) + tj * 0.9 + seed, ai = floor(an / sec + 0.5), al = an - ai * sec;
        vec2 rl = vec2(cos(al), sin(al)) * length(l.xz); vec3 b3 = vec3(rl.x, l.y - 0.06 * rl.x * rl.x / max(rr, 1.0) + 0.25 * smoothstep(rr * 0.6, rr, rl.x), rl.y);
        float br = sdCap(b3, vec3(0.0), vec3(rr, 0.0, 0.0), 0.05);
        float fol = max(length(b3.yz) - (0.34 + 0.12 * smoothstep(0.0, rr, rl.x)), max(-b3.x + 0.4, b3.x - rr - 0.3));
        fol += (textureLod(uN3, b3 * 1.4 + seed + tj, 0.0).r - 0.5) * 0.35;
        trunk = min(trunk, br); cr2 = min(cr2, fol);
      }
      cr2 = min(cr2, sdEll(w - vec3(0.0, hgt - 0.4, 0.0), vec3(0.5, 1.1, 0.5)) + (textureLod(uN3, w * 1.3 + seed, 0.0).r - 0.5) * 0.3);   // the leader
    } else if (sp < 3.5) {  // a broad dome: pōhutukawa, a fig, an oak, a gum: spreading limbs under clumped foliage
      trunk = min(sdCap(w, vec3(0.0), vec3(0.5, hgt * 0.42, 0.2), 0.32 * max(cr, 3.0) / 4.5), min(sdCap(w, vec3(0.3, hgt * 0.3, 0.1), vec3(-cr * 0.55, hgt * 0.55, -cr * 0.2), 0.18), sdCap(w, vec3(0.3, hgt * 0.32, 0.1), vec3(cr * 0.5, hgt * 0.6, cr * 0.35), 0.16)));
      cr2 = crown(w - vec3(0.0, hgt * 0.6, 0.0), vec3(cr, hgt * 0.38, cr * 0.95), 0.75, seed, 7);
    } else if (sp < 4.5) {  // cabbage tree, tī kōuka: a slender trunk forking into arms, each with a ball of long sword leaves and a skirt of dead ones
      trunk = sdCap(w, vec3(0.0), vec3(0.0, hgt * 0.58, 0.0), 0.17);
      for (int j = 0; j < 3; j++) { float an = float(j) * 2.1 + seed; vec3 tip = vec3(cos(an) * 0.95, hgt * (0.86 + 0.07 * float(j == 1)), sin(an) * 0.95);
        trunk = min(trunk, sdCap(w, vec3(0.0, hgt * 0.58, 0.0), tip, 0.1));
        vec3 l = w - tip - vec3(0.0, 0.3, 0.0); float rl = length(l); vec3 dn = l / max(rl, 1e-3);
        float sp2 = textureLod(uN3, dn * 3.2 + seed + float(j), 0.0).r * 0.6 + textureLod(uN3, dn * 7.5 + seed, 0.0).g * 0.4;
        float ball = rl - 0.95 * (0.55 + 0.6 * smoothstep(0.35, 0.75, sp2)) * (dn.y < -0.3 ? 0.75 : 1.0);
        cr2 = min(cr2, ball * 0.6);
        trunk = min(trunk, sdEll(l + vec3(0.0, 0.55, 0.0), vec3(0.32, 0.5, 0.32)) + 0.02); }        // the dead leaves hanging under each head
    } else if (sp < 5.5) {  // a palm: a stout trunk and a burst of arching fronds
      trunk = sdCap(w, vec3(0.0), vec3(0.0, hgt, 0.0), 0.24);
      vec3 l = w - vec3(0.0, hgt, 0.0); float an = atan(l.z, l.x), sec = TAU / 11.0, ai = floor(an / sec + 0.5), al = an - ai * sec;
      vec2 rl = vec2(cos(al), sin(al)) * length(l.xz); vec3 f = vec3(rl.x, l.y + 0.18 * rl.x * rl.x - 0.5 * rl.x, rl.y);
      cr2 = max(max(abs(f.y) - 0.05, abs(f.z) - 0.35 * (1.0 - rl.x / cr)), max(-f.x, f.x - cr)) - 0.02;
    } else {                // kānuka scrub, or gorse: low, dense, finely textured
      trunk = sdCap(w, vec3(0.0), vec3(0.0, hgt * 0.4, 0.0), 0.07);
      cr2 = crown(w - vec3(0.0, hgt * 0.55, 0.0), vec3(cr, hgt * 0.5, cr * 0.9), sp > 6.5 ? 0.26 : 0.38, seed, 5);
    }
    cro = cr2;
    r = vec2(trunk, 12.0); if (cro < r.x) r = vec2(cro, 13.0 + sp * 0.01); return r;
  }
  if (k < 7.5) {                                                    // an edge marker post
    float post = sdBox(q - vec3(0.0, 0.55, 0.0), vec3(0.05, 0.55, 0.06));
    return vec2(post, 14.0 + b.y * 0.1);
  }
  if (k < 8.5) return vec2(sdCap(q, vec3(0.0), vec3(0.0, 1.25, 0.0), 0.07), 15.0);                 // a fence post, round timber
  if (k < 9.5) {                                                    // a sign: a board on a galvanised post
    float hx = b.y, hy = b.z, cy = 1.6 + hy;
    vec3 bq = q - vec3(0.0, cy, 0.0); if (b.w > 63.5) { bq.xy = rot(0.7853982) * bq.xy; hx *= 0.7071; hy *= 0.7071; }
    float board = sdBox(bq, vec3(hx, hy, 0.02));
    float post = sdCap(q, vec3(0.0, 0.0, -0.06), vec3(0.0, cy + hy * 0.6, -0.06), 0.035);
    vec2 r = vec2(board, 16.0); if (post < r.x) r = vec2(post, 17.0); return r;
  }
  if (k < 10.5) {                                                   // toetoe: a fountain of long arching blades; a few canes carry drooping cream plumes
    float hgt = b.y; vec3 w = q; float sway = sin(uTime * 1.3 + a.x) * 0.05 + sin(uTime * 2.9 + a.y) * 0.02; w.xz += vec2(sway, sway * 0.6) * max(q.y, 0.0);
    float rr = length(w.xz), an = atan(w.z, w.x) + a.x, clump = 1e3;
    for (int L = 0; L < 2; L++) {
      float n = L == 0 ? 13.0 : 9.0, sec = TAU / n, off = float(L) * 0.5 * sec, ai = floor((an + off) / sec + 0.5), al = an + off - ai * sec;
      float h1 = fract(sin(ai * 17.3 + float(L) * 5.1 + a.y) * 43758.5), el = L == 0 ? 0.9 + 0.35 * h1 : 1.25 + 0.25 * h1, len = 1.2 + 0.6 * h1;
      vec2 pl = vec2(cos(al), sin(al)) * rr; float u = pl.x;                                     // along the blade's line out from the centre, and across it
      float yc = u * tan(el) - 0.55 * u * u / max(len * 0.35, 0.2);                          // it rises steeply, then arches over
      float bl = max(max(abs(w.y - yc) * 0.5 - 0.02, abs(pl.y) - 0.035 * (1.0 - u / len) - 0.006), max(-u, u - len));
      clump = min(clump, bl);
    }
    clump = min(clump, sdEll(w - vec3(0.0, 0.25, 0.0), vec3(0.32, 0.35, 0.32)));               // the dense base of the tussock
    float plume = 1e3;
    for (int j = 0; j < 3; j++) { float aj = float(j) * 2.2 + a.y, hj = hgt - float(j) * 0.3; vec3 base = vec3(0.0, 0.4, 0.0), top = vec3(cos(aj) * 0.45, hj, sin(aj) * 0.45);
      plume = min(plume, sdCap(w, base, top, 0.011));
      vec3 pq = w - top - vec3(cos(aj), 0.0, sin(aj)) * 0.12; pq.y += 0.3; pq.xz -= vec2(cos(aj), sin(aj)) * max(-pq.y, 0.0) * 0.3;
      plume = min(plume, sdEll(pq, vec3(0.07, 0.4, 0.07)) + (textureLod(uN3, pq * 9.0 + a.x, 0.0).g - 0.5) * 0.04); }
    vec2 r = vec2(clump, 18.0); if (plume < r.x) r = vec2(plume, 19.0); return r;
  }
  if (k < 11.5) {                                                   // harakeke, flax: a fan of stiff, keeled sword leaves, and now and then an old flower stalk
    float d = 1e3;
    for (int j = 0; j < 9; j++) { float an = float(j) * 0.71 + a.x, lean = 0.12 + 0.07 * float(j % 4), len = 1.3 + 0.45 * fract(float(j) * 0.618 + a.y); vec3 l = q; l.xz = rot(an) * l.xz;
      float u = clamp(l.y / len, 0.0, 1.0); l.x -= lean * l.y + 0.35 * u * u * len;                 // bending out towards the tip
      d = min(d, max(sdBox(l - vec3(0.0, len * 0.5, 0.0), vec3(0.012 + 0.02 * (1.0 - u), len * 0.5, 0.05 * (1.0 - u * 0.85) + 0.01)), -l.y)); }
    if (fract(a.y * 3.7) > 0.55) d = min(d, sdCap(q, vec3(0.0), vec3(0.15, 2.6, 0.05), 0.025));                // last summer's flower stalk, dry (harakeke flowers from November)
    return vec2(d - 0.004, 20.0);
  }
  if (k < 12.5) return vec2(sdCyl(q - vec3(0.0, 1.15, 0.0), 1.6, 1.15) - 0.02, 21.0);              // a corrugated water tank
  if (k < 13.5) return vec2(sdCap(q, vec3(-b.y, 0.25, 0.0), vec3(b.y, 0.2 + b.z, 0.0), 0.22), 22.0); // driftwood
  if (k < 14.5) {                                                   // a gate post and the gate, swung open
    float post = sdBox(q - vec3(0.0, 0.7, 0.0), vec3(0.11, 0.7, 0.11));
    vec3 g = q - vec3(0.0, 0.0, 0.0); g.xz = rot(1.35) * g.xz;
    float gate = max(sdBox(g - vec3(2.0, 0.65, 0.0), vec3(2.0, 0.55, 0.02)), -max(abs(mod(g.y - 0.1, 0.27) - 0.135) - 0.11, abs(g.x - 2.0) - 1.92));
    vec2 r = vec2(post, 15.0); if (gate < r.x) r = vec2(gate, 23.0); return r;
  }
  if (k < 15.5) {                                                   // a cattle stop: steel rails over a pit, concrete wings
    float rails = max(sdBox(q - vec3(0.0, -0.05, 0.0), vec3(b.y, 0.06, 1.3)), -sdBox(vec3(q.x, q.y, mod(q.z + 1.3, 0.22) - 0.11), vec3(b.y + 1.0, 0.2, 0.065)));
    float wing = sdBox(vec3(abs(q.x) - b.y - 0.2, q.y - 0.35, q.z), vec3(0.2, 0.35, 1.4));
    vec2 r = vec2(rails, 24.0); if (wing < r.x) r = vec2(wing, 25.0); return r;
  }
  if (k < 16.5) return vec2(sdBox(q - vec3(0.0, 0.55, 0.0), vec3(0.2, 0.55, 0.18)), 23.0);           // a mailbox
  if (k < 17.5) {                                                   // a garden gnome: a red hat, a white beard, a blue coat
    float body = sdCone(q - vec3(0.0, 0.1, 0.0), 0.1, 0.09, 0.06), head = length(q - vec3(0.0, 0.25, 0.0)) - 0.055;
    float hat = sdCone(q - vec3(0.0, 0.34, 0.0), 0.07, 0.056, 0.004), beard = sdEll(q - vec3(0.0, 0.21, 0.04), vec3(0.045, 0.06, 0.03));
    vec2 r = vec2(body, 28.0); if (head < r.x) r = vec2(head, 27.0); if (beard < r.x) r = vec2(beard, 27.0); if (hat < r.x) r = vec2(hat, 26.0); return r;
  }
  return vec2(sdBox(q - vec3(0.0, 0.01, 0.0), vec3(0.42, 0.01, 0.3)) , 29.0);                        // a blueprint, blown off the deck
}
/** How big an object can be, for the march to skip it: a bounding sphere in its frame. */
vec4 objBound(vec4 a, vec4 b){
  float k = a.w;
  if (k < 3.5) { float h = k < 1.5 ? mod(b.w, 16.0) + max(b.y, b.z) * 0.5 : k < 2.5 ? 4.5 : 3.6 * max(1.0, mod(b.w, 16.0)) + 0.7; return vec4(a.x, a.z + h * 0.5, a.y, length(vec3(b.y + 3.0, h * 0.5, b.z + 3.0))); }
  if (k < 4.5) return vec4(a.x, a.z + 6.5, a.y, 7.2);
  if (k < 5.5) return vec4(a.x, a.z + 5.0, a.y, 5.6);
  if (k < 6.5) return vec4(a.x, a.z + b.y * 0.5, a.y, max(b.y * 0.55, b.z) + 1.5);
  if (k < 9.5) return vec4(a.x, a.z + 1.6, a.y, max(b.y, 1.8) + 1.8);
  if (k < 11.5) return vec4(a.x, a.z + 1.4, a.y, 2.4);
  if (k < 13.5) return vec4(a.x, a.z + 1.2, a.y, max(b.y, 1.6) + 0.6);
  return vec4(a.x, a.z + 0.8, a.y, max(b.y, 2.4) + 2.0);
}
/** Closest approach of a ray to a wire, and where along the ray. */
vec2 wireDist(vec3 ro, vec3 rd, vec3 a, vec3 b){
  vec3 ba = b - a, oa = ro - a; float bb = dot(ba, ba), bd = dot(ba, rd), od = dot(oa, rd), ob = dot(oa, ba);
  float den = bb - bd * bd; float u = clamp((ob - od * bd) / max(den, 1e-6), 0.0, 1.0);
  float t = max(dot(a + ba * u - ro, rd), 0.0);
  return vec2(length(ro + rd * t - a - ba * u), t);
}

struct Hit { float t; float m; float id; vec3 n; };
float wireA; vec3 wireC; float wireT;
/** Walk the grid along a ray: test what stands in each cell it crosses; gather the wires it passes on the way. */
Hit traceThings(vec3 ro, vec3 rd, float tMax, bool wires){
  Hit h; h.t = 1e9; h.m = 0.0; h.id = -1.0;
  float cs = uGrid.z; vec2 o = (ro.xz - uGrid.xy) / cs, dir = rd.xz;
  if (length(dir) < 1e-5) dir = vec2(1e-5);
  vec2 cell = floor(o), st = sign(dir), inv = 1.0 / max(abs(dir), vec2(1e-6));
  vec2 tN = ((cell + max(st, 0.0)) - o) * cs * inv * st;                            // where the ray leaves the cell, x and z
  vec2 tD = cs * inv;
  float t0 = 0.0, foot = 2.0 * uTan / uRes.y;
  for (int i = 0; i < 80; i++) {
    float t1 = min(tN.x, tN.y);
    if (cell.x >= 0.0 && cell.y >= 0.0 && cell.x < uGrid.w && cell.y < uGrid.w) {
      for (int k = 0; k < 2; k++) {
        vec4 ids = texelFetch(uGridT, ivec2(int(cell.x) * 2 + k, int(cell.y)), 0);
        for (int j = 0; j < 4; j++) {
          float id = ids[j] - 1.0; if (id < 0.0) break;
          vec4 a = obj0(id), b = obj1(id);
          if (a.w > 19.5) {                                         // a wire, or a fence's wires
            if (!wires) continue;
            vec3 p0 = vec3(a.x, a.z, a.y), p1 = vec3(b.x, b.z, b.y);
            int n = a.w < 20.5 ? 2 : 6;
            for (int w = 0; w < 6; w++) {
              if (w >= n) break;
              vec3 q0, q1, q2; float r;
              if (a.w < 20.5) { float side = float(w) - 0.5; vec3 off = normalize(cross(p1 - p0, vec3(0.0, 1.0, 0.0))) * side * 1.6; q0 = p0 + off; q2 = p1 + off; q1 = (q0 + q2) * 0.5 - vec3(0.0, b.w, 0.0); r = 0.008; }
              else { float y = 0.2 + float(w) * 0.19; q0 = p0 + vec3(0.0, y, 0.0); q2 = p1 + vec3(0.0, y, 0.0); q1 = (q0 + q2) * 0.5 - vec3(0.0, 0.03, 0.0); r = 0.0021; }
              vec2 d1 = wireDist(ro, rd, q0, q1), d2 = wireDist(ro, rd, q1, q2); vec2 dw = d1.x < d2.x ? d1 : d2;
              if (dw.y < min(h.t, tMax) && dw.y > 0.3) { float fw = foot * dw.y, cov = clamp(2.0 * r / fw, 0.0, 1.0) * (1.0 - smoothstep(r, r + fw, dw.x)); if (cov > wireA) { wireA = cov; wireT = dw.y; wireC = a.w < 20.5 ? vec3(0.03) : vec3(0.16, 0.16, 0.15); } }
            }
            continue;
          }
          vec4 bs = objBound(a, b); vec2 sp = sphere(ro, rd, bs.xyz, bs.w);
          if (sp.y < 0.0 || sp.x > min(h.t, tMax)) continue;
          float t = max(sp.x, 0.0);
          for (int s = 0; s < 40; s++) {
            vec2 d = objSD(ro + rd * t, a, b);
            if (d.x < 0.0015 * t + 0.002) { if (t < h.t) { h.t = t; h.m = d.y; h.id = id; } break; }
            t += d.x; if (t > sp.y || t > h.t) break;
          }
        }
      }
    }
    if (h.t < t1 + 4.0 || t1 > tMax) break;
    if (tN.x < tN.y) { tN.x += tD.x; cell.x += st.x; } else { tN.y += tD.y; cell.y += st.y; }
    t0 = t1;
  }
  return h;
}
vec2 thingSD(vec3 p, float id){ return objSD(p, obj0(id), obj1(id)); }

// ---------------------------------------------------------------- the truck, the sheep, the bridge, the pad
// The truck: a cab-over rigid with a steel tray deck and the pad's liquid-oxygen tank strapped down on saddles. Its
// frame: x right, y up, z forward, from the road between the rear axles. Materials: 30 cab paint, 31 black trim and
// chassis, 32 the tray's floor, 33 steel, 34 tyres, 35 rims, 36 the tank, 37 saddles, 38 straps, 39 glass, 42 lamps.
vec2 truckSD(vec3 p){
  vec3 q = transpose(uTruckM) * (p - uTruckP);
  vec2 r = vec2(1e3, 0.0);
  if (length(q - vec3(0.0, 1.8, 1.0)) > 7.0) return vec2(length(q - vec3(0.0, 1.8, 1.0)) - 6.5, 0.0);
  // the cab: a rounded box, its front raked back above the windscreen line, a roof deflector
  vec3 c = q - vec3(0.0, 2.3, 5.0);
  float cab = sdRoundBox(c, vec3(1.2, 1.35, 1.0), 0.16);
  cab = max(cab, dot(c - vec3(0.0, 1.35, 1.0), normalize(vec3(0.0, 0.55, 1.0))) + 0.05);
  U(cab, 30.0)
  U(max(sdRoundBox(c - vec3(0.0, 1.55, -0.15), vec3(1.15, 0.28, 0.8), 0.25), -c.y + 1.4), 30.0)              // the deflector on the roof
  U(sdRoundBox(c - vec3(0.0, 0.32, 1.04), vec3(0.95, 0.42, 0.04), 0.03), 31.0)                              // the grille
  U(sdRoundBox(q - vec3(0.0, 0.62, 6.08), vec3(1.24, 0.24, 0.14), 0.05), 31.0)                              // bumper
  U(sdRoundBox(vec3(abs(q.x) - 0.92, q.y - 0.86, q.z - 6.16), vec3(0.2, 0.08, 0.03), 0.02), 42.0)           // headlamps
  U(sdBox(vec3(abs(q.x) - 1.27, q.y - 0.85, q.z - 5.2), vec3(0.05, 0.05, 0.45)), 33.0)                       // the steps
  U(sdBox(vec3(abs(q.x) - 1.52, q.y - 2.5, q.z - 5.85), vec3(0.04, 0.26, 0.11)), 31.0)                       // mirrors on their arms
  U(sdCap(vec3(abs(q.x), q.y, q.z), vec3(1.2, 2.6, 5.8), vec3(1.5, 2.6, 5.85), 0.025), 33.0)
  U(sdCap(q, vec3(1.0, 1.8, 3.82), vec3(1.0, 3.95, 3.82), 0.07), 33.0)                                        // the exhaust stack behind the cab
  U(max(sdCyl((q - vec3(-1.02, 0.95, 2.4)).yxz, 0.32, 0.45), 0.0), 33.0)                                     // fuel tank
  U(sdBox(q - vec3(0.0, 0.92, 1.0), vec3(0.48, 0.16, 4.75)), 31.0)                                            // chassis rails
  // the tray: a floor, side rails, a headboard of steel tube, a light bar across the back
  U(sdBox(q - vec3(0.0, 1.28, -0.2), vec3(1.25, 0.07, 3.95)), 32.0)
  U(sdBox(vec3(abs(q.x) - 1.23, q.y - 1.15, q.z + 0.2), vec3(0.04, 0.13, 3.95)), 33.0)
  U(sdBox(q - vec3(0.0, 1.15, -4.13), vec3(1.25, 0.13, 0.05)), 33.0)
  float hb = max(sdBox(q - vec3(0.0, 2.35, 3.72), vec3(1.25, 1.0, 0.04)), -sdBox(vec3(q.x, mod(q.y - 1.45, 0.3) - 0.15, q.z - 3.72), vec3(1.15, 0.11, 0.2)));
  U(hb, 33.0)
  U(sdRoundBox(vec3(abs(q.x) - 0.95, q.y - 0.88, q.z + 4.2), vec3(0.22, 0.07, 0.03), 0.02), 42.0)          // tail lamps
  U(sdBox(vec3(abs(q.x) - 1.05, q.y - 0.42, q.z + 4.05), vec3(0.2, 0.2, 0.008)), 31.0)                       // mud flaps
  U(sdBox(q - vec3(0.0, 0.78, -4.19), vec3(0.26, 0.08, 0.01)), 43.0)                                       // the number plate
  // mudguards over the wheels
  U(max(abs(length((q - vec3(0.0, 0.52, 4.85)).yz) - 0.66) - 0.025, max(abs(abs(q.x) - 1.03) - 0.2, -(q.y - 0.55))), 31.0)
  U(max(abs(length((q - vec3(0.0, 0.52, 0.0)).yz * vec2(1.0, 0.62)) - 0.68) - 0.025, max(abs(abs(q.x) - 0.98) - 0.33, -(q.y - 0.75))), 31.0)
  // wheels: steered at the front, duals behind
  for (int i = 0; i < 3; i++) {
    float az = i == 0 ? 4.85 : i == 1 ? 0.7 : -0.7;
    vec3 w = vec3(abs(q.x) - (i == 0 ? 1.03 : 0.98), q.y - 0.52, q.z - az);
    if (i == 0) w.xz = rot(-uDrv.x * sign(q.x)) * w.xz;
    float hw = i == 0 ? 0.16 : 0.3, rr = length(w.yz);
    float tyre = sdRoundBox(vec3(w.x, rr - 0.37, 0.0), vec3(hw, 0.15, 1.0), 0.07);
    U(tyre, 34.0)
    U(max(rr - 0.29, abs(w.x) - hw - 0.005), 35.0)
  }
  // the load: a cryogenic tank, white, on two saddles, held by ratchet straps, its valve box at the back
  vec3 l = q - vec3(uDrv.w, 2.45, -0.45);
  float tank = length(vec3(l.x, l.y, max(abs(l.z) - 2.55, 0.0) * 1.7)) - 1.05;
  U(tank, 36.0)
  U(max(sdBox(vec3(l.x, l.y + 0.82, abs(l.z) - 1.6), vec3(0.98, 0.36, 0.2)), 0.98 - length(l.xy)), 37.0)
  U(max(abs(length(l.xy) - 1.07) - 0.012, abs(abs(l.z) - 1.05) - 0.03), 38.0)
  U(max(abs(length(l.xy) - 1.07) - 0.012, abs(abs(l.z) - 2.1) - 0.03), 38.0)
  U(sdRoundBox(l - vec3(0.0, -0.2, -3.25), vec3(0.45, 0.4, 0.22), 0.04), 33.0)
  U(sdCap(l, vec3(-0.3, 0.2, -3.2), vec3(-0.3, 0.9, -3.0), 0.04), 33.0)
  return r;
}
vec2 sheepSD(vec3 p, vec4 s, float gy){
  // a Romney ewe: a deep, round fleece on short legs; a white face, a dark nose, ears out to the side
  vec3 q = p - vec3(s.x, gy, s.y); q.xz = rot(-s.z) * q.xz;
  float wool = sdEll(q - vec3(0.0, 0.66, -0.02), vec3(0.4, 0.34, 0.6));
  wool = smin(wool, sdEll(q - vec3(0.0, 0.72, 0.36), vec3(0.3, 0.3, 0.3)), 0.12);
  wool += (textureLod(uN3, q * 3.1 + s.x, 0.0).r - 0.5) * 0.07 + (textureLod(uN3, q * 8.0 + s.y, 0.0).g - 0.5) * 0.025;
  vec2 r = vec2(wool, 40.0);
  vec3 hq = q - vec3(0.0, 0.84, 0.66); hq.yz = rot(0.55 + 0.25 * sin(s.w * 0.7)) * hq.yz;
  float head = sdEll(hq, vec3(0.09, 0.1, 0.17)); head = smin(head, sdEll(hq - vec3(0.0, -0.03, 0.12), vec3(0.065, 0.07, 0.09)), 0.04);
  U(head, 41.0)
  U(sdEll(vec3(abs(hq.x) - 0.11, hq.y - 0.05, hq.z + 0.05), vec3(0.08, 0.025, 0.04)), 41.0)       // ears
  U(length(hq - vec3(0.0, -0.04, 0.2)) - 0.035, 44.0)                                            // the nose
  for (int i = 0; i < 4; i++) { float sx = i < 2 ? 1.0 : -1.0, sz = mod(float(i), 2.0) < 0.5 ? 1.0 : -1.0, sw = sin(s.w * 6.0 + float(i) * 1.6) * 0.1;
    U(sdCap(q, vec3(0.17 * sx, 0.42, 0.34 * sz), vec3(0.17 * sx, 0.03, 0.34 * sz + sw), 0.032), 45.0) }
  return r;
}
vec2 sceneSD(vec3 p){
  vec2 r = vec2(1e3, 0.0);
  vec2 t = truckSD(p); if (t.x < r.x) r = t;
  for (int i = 0; i < 6; i++) { if (uSheep[i].x > 1e5) continue; if (length(p.xz - uSheep[i].xy) > 3.0) { r.x = min(r.x, length(p.xz - uSheep[i].xy) - 1.5); continue; } vec2 s = sheepSD(p, uSheep[i], uSheep[i].w > -1e4 ? gH(uSheep[i].xy) : 0.0); if (s.x < r.x) r = s; }
  return r;
}
/** The bridge: a concrete deck on piers, a footpath each side behind a kerb, and a steel rail. In road space. */
vec2 bridgeSD(vec3 p){
  vec4 R = roadAt(p.xz); if (R.y < uBridge.x - 6.0 || R.y > uBridge.y + 6.0 || abs(R.x) > 30.0) return vec2(1e3, 0.0);
  vec4 P = profAt(R.y); float w2 = P.x * 0.5, ad = abs(R.x), y = p.y - P.w;
  float along = max(uBridge.x - R.y, R.y - uBridge.y);
  float deck = max(max(ad - w2 - 1.9, abs(y + 0.45) - 0.45), along);
  float path = max(max(abs(ad - w2 - 0.9) - 0.9, abs(y - 0.08) - 0.08), along);
  float post = max(max(abs(ad - w2 - 1.75) - 0.05, abs(mod(R.y, 2.1) - 1.05) - 0.05), max(abs(y - 0.6) - 0.55, along));
  float rail = max(length(vec2(ad - w2 - 1.75, y - 1.12)) - 0.05, along); rail = min(rail, max(length(vec2(ad - w2 - 1.75, y - 0.62)) - 0.03, along));
  float pier = max(max(length(vec2(ad - w2 * 0.6, mod(R.y - uBridge.x, 18.5) - 9.25)) - 0.6, y + 0.4), -y - 12.0); pier = max(pier, along + 2.0);
  vec2 r = vec2(deck, 50.0); if (path < r.x) r = vec2(path, 51.0); if (min(post, rail) < r.x) r = vec2(min(post, rail), 52.0); if (pier < r.x) r = vec2(pier, 50.0);
  return r;
}
vec3 padP(vec3 p){ vec3 q = p - uPadP.xyz; q.xz = rot(uPadP.w) * q.xz; return q; }

// ---------------------------------------------------------------- light
vec3 sunCol(){ return sunT(0.02, uSun.y) * SUN; }
vec3 skyAmb(vec3 N){ float k = N.y * 0.5 + 0.5; return (mix(vec3(0.11, 0.14, 0.08), vec3(0.2, 0.31, 0.52), k) + vec3(0.12, 0.11, 0.08) * max(dot(N, uSun), 0.0) * 0.5) * SUN * 0.12 * gDay; }
/** Sunlight reaching a point: a march towards the sun over the ground and over the map of what stands on it. */
float sunVis(vec3 p, float t0){
  float s = 1.0, t = t0;
  for (int i = 0; i < 22; i++) {
    vec3 q = p + uSun * t;
    if (q.y > uHmax) break;
    float hg = gH(q.xz), y = q.y - hg;
    s = min(s, 7.0 * y / t);
    if (inBox(q.xz)) { vec4 O = occAt(q.xz); float bot = (1.0 - O.r) * 63.75, top = O.g * 63.75;
      if (top > 0.4 && y > bot && y < top) s *= mix(0.32, 0.0, O.b * O.b); }
    if (s < 0.02) break;
    t += max(0.3, t * 0.3);
  }
  return clamp(s, 0.0, 1.0);
}
float shapeShadow(vec3 p){
  float s = 1.0;
  vec2 b = sphere(p, uSun, uTruckP + uTruckM * vec3(0.0, 1.8, 1.0), 6.2);
  if (b.y > 0.0) { float t = max(b.x, 0.06); for (int i = 0; i < 20; i++) { float d = truckSD(p + uSun * t).x; s = min(s, 10.0 * d / t); t += clamp(d, 0.05, 1.5); if (s < 0.02 || t > b.y) break; } }
  if (s > 0.02 && uBridge.x < uBridge.y && inBox(p.xz)) { vec4 R = roadAt(p.xz); if (R.y > uBridge.x - 14.0 && R.y < uBridge.y + 14.0 && abs(R.x) < 22.0) { float t = 0.1; for (int i = 0; i < 14; i++) { float d = bridgeSD(p + uSun * t).x; s = min(s, 12.0 * d / t); t += clamp(d, 0.1, 3.0); if (s < 0.02 || t > 30.0) break; } } }
  if (s > 0.02 && uPadP.x < 1e5) { vec2 c = sphere(p, uSun, uPadP.xyz + vec3(-30.0, 8.0, -10.0), 80.0); if (c.y > 0.0) { float t = max(c.x, 0.2); for (int i = 0; i < 18; i++) { float d = mapPad(padP(p + uSun * t)).x; s = min(s, 8.0 * d / t); t += clamp(d, 0.12, 4.0); if (s < 0.02 || t > c.y) break; } } }
  return clamp(s, 0.0, 1.0);
}
float thingShadow(vec3 p, float far){ return sunVis(p, 0.25) * (far < 600.0 ? shapeShadow(p) : 1.0); }
/** Light a surface: sun, sky, a little bounce, and a sheen. */
vec3 lit(vec3 alb, vec3 N, vec3 V, float rough, float spec, float sh, float ao){
  vec3 sc = sunCol(); float nl = max(dot(N, uSun), 0.0), nv = max(dot(N, V), 0.03);
  vec3 H = normalize(uSun + V); float nh = max(dot(N, H), 0.0);
  vec3 col = alb / PI * (sc * nl * sh + skyAmb(N) * ao * 3.6 + vec3(0.07, 0.09, 0.04) * SUN * 0.09 * (1.0 - abs(N.y) * 0.7) * ao * gDay * max(uSun.y, 0.0));
  col += spec * (0.04 + 0.96 * pow(1.0 - max(dot(H, V), 0.0), 5.0)) * min(ggx(nh, max(rough, 0.15)), 12.0) * 0.25 / max(nv, 0.3) * nl * sh * sc;
  return col;
}

// ---------------------------------------------------------------- what the ground is made of
vec3 rd_g;
/** The road's surface: chip seal (or limestone gravel on the station), worn into wheel tracks, with its markings. */
vec3 roadAlb(vec3 p, Gnd g, float foot, inout vec3 N, out float rough, out float spec, out float wetK){
  float ad = abs(g.d), s = g.s, w2 = g.w2; vec4 P = profAt(s);
  float gravel = bit(g.kind, 1.0) ? 1.0 : 0.0; rough = 0.8; spec = 0.25; wetK = 0.0;
  float fine = 1.0 - smoothstep(0.004, 0.05, foot), mid = 1.0 - smoothstep(0.03, 0.5, foot);
  float n1 = n2(p.xz / 9.0), n3 = n2(p.xz / 0.9 + 0.2), nf = textureLod(uN2, p.xz / 0.07, log2(max(foot / 0.07 * 512.0, 1.0))).r;
  // where the wheels run: two tracks a lane on the seal, two on the gravel
  float lane = gravel > 0.5 ? 0.0 : w2 * 0.5 * sign(g.d);
  float tr = min(abs(g.d - lane - 0.9), abs(g.d - lane + 0.9));
  float track = 1.0 - smoothstep(0.25, 0.6, tr + (n3 - 0.5) * 0.3);
  vec3 col;
  if (gravel > 0.5) {
    col = mix(vec3(0.42, 0.40, 0.35), vec3(0.55, 0.53, 0.47), n1) * (0.85 + 0.3 * n3);                 // pale papa and limestone gravel
    col = mix(col, vec3(0.36, 0.34, 0.30), track * 0.6);                                                    // packed where the wheels go
    float windrow = smoothstep(w2 - 0.9, w2 - 0.2, ad) * (1.0 - smoothstep(w2 + 0.3, w2 + 0.9, ad)) + exp(-sq(g.d / 0.35)) * 0.6;
    col = mix(col, vec3(0.5, 0.48, 0.43) * (0.7 + 0.6 * nf), windrow * 0.7);                                // loose stones thrown to the edges and the crown
    col *= mix(1.0, 0.55 + 0.9 * nf, fine * 0.9 + mid * 0.1);
    col = mix(col, vec3(0.2, 0.32, 0.1) * (0.7 + 0.5 * n3), exp(-sq(g.d / 0.3)) * smoothstep(0.55, 0.75, n2(p.xz / 3.0)) * 0.7);   // grass on the crown
    if (mid > 0.01) { vec2 tg = normalize(vec2(roadAt(p.xz + vec2(0.5, 0.0)).y - s, roadAt(p.xz + vec2(0.0, 0.5)).y - s) + 1e-6);   // corrugations across the wheel tracks
      float corr = cos(s * TAU / 0.62 + n3 * 2.0) * track * mid; N = normalize(N - vec3(tg.x, 0.0, tg.y) * corr * 0.12); }
    float hole = smoothstep(0.7, 0.75, n2(p.xz / 5.1 + 0.7)) * smoothstep(0.4, 0.6, n2(p.xz / 37.0)) * (1.0 - track * 0.3);   // the odd pothole, with water in some
    col = mix(col, vec3(0.26, 0.24, 0.2), hole * 0.6); wetK = hole * smoothstep(0.73, 0.75, n2(p.xz / 5.1 + 0.7)) * 0.7;
    rough = 0.9; spec = 0.1;
  } else {
    float tone = bit(g.kind, 64.0) ? 0.27 + 0.04 * n1 : 0.115 + 0.035 * n1 + 0.02 * (n2(p.xz / 31.0) - 0.5);
    col = vec3(tone, tone * 1.005, tone * 1.02) * (0.93 + 0.14 * n3);                                     // chip seal, grey, laid in runs
    float chips = textureLod(uN2, p.xz / 0.035, log2(max(foot / 0.035 * 512.0, 1.0))).g;
    col *= mix(1.0, 0.6 + 0.85 * chips, fine) * mix(1.0, 0.85 + 0.3 * nf, mid * (1.0 - fine));             // the stones themselves, and the light between them
    col = mix(col, col * 0.78, track * 0.6);                                                                // darker and smoother in the wheel paths
    float bleed = smoothstep(0.78, 0.86, n2(p.xz / 4.1 + 0.3) * track) * smoothstep(0.45, 0.6, n2(p.xz / 47.0)); col = mix(col, vec3(0.04), bleed * 0.55);
    float patchK = smoothstep(0.7, 0.72, n2(floor(p.xz / 5.0) / 64.0 + 0.3)) * smoothstep(0.5, 0.6, n2(p.xz / 90.0)); col = mix(col, col * (0.82 + 0.2 * n1), patchK * smoothstep(w2, w2 - 1.0, ad));
    float crack = smoothstep(w2 - 0.25, w2 + 0.05, ad); col = mix(col, vec3(0.2, 0.19, 0.16) * (0.6 + 0.6 * nf), crack * 0.5);   // the edge breaking up
    rough = mix(0.75, 0.45, track * 0.6 + bleed); spec = mix(0.22, 0.4, track);
    // markings: edge lines, the centre line (dashed white; yellow where overtaking is not allowed), raised markers
    float lw = 0.1, mk = 0.0; vec3 mc = vec3(0.86, 0.86, 0.82);
    if (bit(g.kind, 8.0)) mk = max(mk, 1.0 - smoothstep(lw * 0.5, lw * 0.5 + foot, abs(ad - (w2 - 0.3))));
    if (bit(g.kind, 4.0)) {
      float dash = step(fract(s / 10.0), 0.3);
      if (P.z > 1.5) {                                                                                       // a no-overtaking line on the side of the traffic it binds, beside the dashes
        float y = bit(P.z, 4.0) ? 1.0 - smoothstep(lw * 0.5, lw * 0.5 + foot, abs(g.d - 0.16)) : 0.0, yy = bit(P.z, 2.0) ? 1.0 - smoothstep(lw * 0.5, lw * 0.5 + foot, abs(g.d + 0.16)) : 0.0;
        float wd = (1.0 - smoothstep(lw * 0.5, lw * 0.5 + foot, abs(g.d))) * dash;
        if (max(y, yy) > mk) { mk = max(y, yy); mc = vec3(0.82, 0.62, 0.08); }
        mk = max(mk, wd * (1.0 - max(y, yy)));
      } else mk = max(mk, (1.0 - smoothstep(lw * 0.5, lw * 0.5 + foot, abs(g.d))) * dash * (P.z > 0.5 ? 1.0 : 0.0));
    }
    mk *= 0.82 + 0.18 * nf; mk *= 1.0 - 0.35 * smoothstep(0.55, 0.8, n2(p.xz / 1.3)) * track;                // worn under the wheels
    col = mix(col, mc * (0.85 + 0.15 * n3), mk); rough = mix(rough, 0.5, mk); spec = mix(spec, 0.5, mk);
  }
  if (uLook.y > 0.01) wetK = max(wetK, uLook.y * (0.35 + 0.65 * track));
  return col;
}
/** Everything that is not the road: verges, pasture, bush, beaches, cuttings, gardens, the old railway. */
vec3 landAlb(vec3 p, Gnd g, float foot, inout vec3 N, out float rough, out float spec, out float grassH, out float wetK){
  vec4 M = maskAt(p.xz), M2 = mask2At(p.xz);
  float n1 = n2(p.xz / 57.0), nm = n2(p.xz / 13.0 + 0.4), n3 = n2(p.xz / 2.1), nf = textureLod(uN2, p.xz / 0.21, log2(max(foot / 0.21 * 512.0, 1.0))).g;
  float slope = 1.0 - N.y; rough = 0.9; spec = 0.08; wetK = 0.0;
  float paddock = textureLod(uN2, floor(p.xz / 160.0 + n1 * 0.6) / 97.0 + 0.11, 0.0).a;
  // pasture in spring: ryegrass and clover, paddock by paddock a little different; drier on the sunny faces, lusher in the hollows
  vec3 lush = vec3(0.058, 0.105, 0.028), dry = vec3(0.15, 0.15, 0.065), clov = vec3(0.045, 0.092, 0.035);
  vec3 col = mix(lush, mix(lush * 1.3, dry, 0.45), smoothstep(0.25, 0.85, paddock * 0.55 + nm * 0.45));
  col = mix(col, dry, smoothstep(0.55, 0.95, dot(N, uSun) * 0.6 + n1 * 0.6) * 0.35);
  col = mix(col, clov, smoothstep(0.52, 0.68, n2(p.xz / 3.3 + 0.37)) * 0.55);
  float spot = smoothstep(0.78, 0.84, n2(p.xz / 1.9 + 0.71)); col = mix(col, vec3(0.04, 0.09, 0.025), spot * 0.7);             // dung patches, greener and ranker
  float rush = smoothstep(0.7, 0.8, n2(p.xz / 11.0 + 0.2)) * smoothstep(3.0, 0.5, g.base - g.h + 2.0);
  col = mix(col, vec3(0.07, 0.08, 0.035), rush * 0.6);                                                                     // rushes where it is wet
  col *= 0.8 + 0.4 * n3 * (0.55 + 0.45 * nf);
  grassH = 0.13 + 0.07 * nm;
  // sheep tracks on the steep faces: narrow terraces along the contour, bare and a little darker
  float terr = smoothstep(0.14, 0.3, slope) * (1.0 - smoothstep(0.4, 0.5, slope)) * smoothstep(0.3, 0.6, n2(p.xz / 31.0 + 0.5));
  float ct = fract(p.y * 1.25 + (n2(p.xz / 14.0) - 0.5) * 0.55);
  float stripe = smoothstep(0.0, 0.08, ct) * (1.0 - smoothstep(0.08, 0.2, ct));
  col = mix(col, vec3(0.09, 0.075, 0.045), stripe * terr * 0.45); N = normalize(N + vec3(0.0, (stripe - 0.25) * terr * 0.22, 0.0));
  // the verge: mown near the seal, long and seeding further out
  float ad = abs(g.d), verge = g.edge > 0.0 ? 1.0 - smoothstep(4.0, 9.0, g.edge) : 0.0;
  col = mix(col, mix(vec3(0.11, 0.17, 0.05), vec3(0.27, 0.25, 0.12), smoothstep(1.5, 4.0, g.edge) * nm) * (0.8 + 0.4 * n3), verge * 0.8);
  grassH = mix(grassH, mix(0.08, 0.45, smoothstep(1.0, 3.5, g.edge)), verge);
  float shoulder = 1.0 - smoothstep(0.1, 0.9, g.edge); col = mix(col, vec3(0.3, 0.28, 0.24) * (0.7 + 0.5 * nf), shoulder * 0.8 * (bit(g.kind, 16.0) ? 0.0 : 1.0));
  // a town's footpaths and lawns
  if (bit(g.kind, 16.0) && g.edge > 0.0 && g.edge < 2.1) { col = vec3(0.42, 0.41, 0.38) * (0.85 + 0.25 * n3) * (0.8 + 0.4 * nf); grassH = 0.0; rough = 0.8; }
  col = mix(col, vec3(0.1, 0.19, 0.05) * (0.85 + 0.3 * n3), M2.r * (1.0 - shoulder) * 0.6);
  // scrub and bush on the ground under the trees, and bare banks
  col = mix(col, vec3(0.05, 0.07, 0.03) * (0.7 + 0.6 * n3), max(M.g, M.b * 0.8) * 0.85);
  grassH *= 1.0 - max(M.g, M.b) * 0.7;
  float bare = smoothstep(0.46, 0.78, slope + (n2(p.xz / 31.0 + 0.2) - 0.5) * 0.16) * (1.0 - smoothstep(0.9, 1.0, N.y)), cliff = max(bare, M2.b * smoothstep(0.32, 0.6, slope));
  // the coast's pale mudstone and sandstone: beds that follow the height, runnels down the face, plants on the ledges
  float bedN = n2(vec2(p.y * 0.55 + n2(p.xz / 60.0) * 3.0, (p.x - p.z) * 0.004));
  float run = n2(vec2((p.x + p.z) * 0.35, p.y * 0.04)) * n2(vec2((p.x - p.z) * 1.3, p.y * 0.1));
  vec3 papa = mix(vec3(0.42, 0.41, 0.36), vec3(0.64, 0.63, 0.57), smoothstep(0.25, 0.75, bedN)) * (0.82 + 0.3 * nf);
  papa = mix(papa, papa * 0.62, smoothstep(0.35, 0.6, run));
  papa = mix(papa, vec3(0.3, 0.27, 0.2), smoothstep(0.2, 0.0, p.y - g.base + 0.5) * 0.4);                                      // slumped clay at the foot
  float ledge = smoothstep(0.25, 0.4, N.y) * smoothstep(0.45, 0.65, n2(p.xz / 4.0 + p.y * 0.1));
  vec3 rockc = mix(papa, vec3(0.06, 0.09, 0.035) * (0.7 + 0.6 * n3), ledge * 0.75);
  col = mix(col, rockc, cliff * (1.0 - M.g * 0.6)); grassH *= 1.0 - cliff;
  N = normalize(N + vec3((run - 0.5) * 0.3, 0.0, (bedN - 0.5) * 0.3) * cliff);
  // sand: Hawke Bay's grey beaches, wet below the tide line
  float sand = max(M.a, smoothstep(2.5, 0.6, g.base) * smoothstep(-0.4, 0.2, g.base) * (1.0 - cliff));
  float wet = smoothstep(0.9, 0.25, g.h) * sand;
  vec3 sc = mix(vec3(0.38, 0.35, 0.3), vec3(0.47, 0.44, 0.38), n3) * (0.82 + 0.3 * nf);
  col = mix(col, mix(sc, sc * 0.55, wet), sand); grassH *= 1.0 - sand; wetK = max(wetK, wet);
  // the range's hard standing: compacted gravel, and concrete slabs round the launch mount
  if (uPadP.x < 1e5) { vec3 pq = padP(p); float ap = max(max(-pq.x - 96.0, pq.x - 48.0), max(-pq.z - 46.0, pq.z - 30.0));
    if (ap < 4.0) { float k = smoothstep(4.0, 0.0, ap); col = mix(col, mix(vec3(0.2, 0.19, 0.17), vec3(0.27, 0.25, 0.22), n2(pq.xz / 7.0)) * (0.65 + 0.55 * nf) * (0.85 + 0.3 * n3), k); grassH *= 1.0 - k;
      float sl = max(abs(pq.x + 4.0) - 22.0, abs(pq.z) - 22.0); if (sl < 0.0) { vec2 jg = abs(fract(pq.xz / 6.0) - 0.5); col = vec3(0.26, 0.26, 0.25) * (0.85 + 0.2 * n3) * (0.9 + 0.2 * textureLod(uN2, (floor(pq.xz / 6.0) + 0.5) / 512.0, 0.0).a) * (1.0 - 0.5 * (1.0 - smoothstep(0.0, 0.02, min(jg.x, jg.y)))); } } }
  // the old railway: ballast, sleepers, two rusty rails 1067 mm apart
  if (M2.a > 0.003) {
    float rd = abs((M2.a * 255.0 - 1.0) / 254.0 * 2.0 - 1.0) * 8.0;                                     // metres from its centre line
    float bal = 1.0 - smoothstep(1.6, 2.4, rd);
    col = mix(col, vec3(0.3, 0.28, 0.26) * (0.6 + 0.7 * nf), bal * 0.9); grassH *= 1.0 - bal * 0.85;
    float rail = 1.0 - smoothstep(0.035, 0.035 + foot, abs(rd - 0.534)); col = mix(col, vec3(0.22, 0.12, 0.06), rail * 0.9);
  }
  return col;
}

/** Grass blades, as a thin volume over the ground near the camera: what makes a verge look soft. */
vec4 grassVol(vec3 ro, vec3 rd, float tHit, vec3 hitP, float gh, vec3 base, float sh){
  if (gh < 0.03 || tHit > 45.0) return vec4(0.0);
  float tIn = tHit - gh / max(-rd.y, 0.06); tIn = max(tIn, 0.2);
  float T = 1.0; vec3 L = vec3(0.0); float dt = (tHit - tIn) / 10.0;
  vec3 sc = sunCol();
  for (int i = 0; i < 10; i++) {
    float t = tIn + dt * (float(i) + 0.5); vec3 p = ro + rd * t; float y = p.y - gH(p.xz);
    if (y > gh || y < 0.0) continue;
    float f = y / gh; vec2 w = p.xz + vec2(sin(uTime * 1.7 + p.x * 0.3), cos(uTime * 1.3 + p.z * 0.3)) * 0.04 * f * uLook.z;
    float b = textureLod(uN2, w / 0.11, 0.0).r * textureLod(uN2, w / 0.037 + 0.3, 0.0).g;
    float dens = smoothstep(0.16 + f * 0.3, 0.26 + f * 0.3, b) * 34.0;
    float a = 1.0 - exp(-dens * dt);
    vec3 c = mix(base, base * vec3(1.5, 1.4, 0.8), f * 0.6) * (0.5 + 0.9 * f) * (sc * (0.4 + 0.6 * f) * max(uSun.y, 0.0) * sh / PI + skyAmb(vec3(0.0, 1.0, 0.0)) * f / PI * 2.0);
    c += base * sc * 0.12 * pow(max(dot(rd, uSun), 0.0), 6.0) * sh;                                     // the sun through the blades
    L += T * c * a; T *= 1.0 - a; if (T < 0.05) break;
  }
  return vec4(L, 1.0 - T);
}

/** Dust thrown up behind the wheels on gravel: a soft volume that trails the truck and drifts in the wind. */
vec4 dustVol(vec3 ro, vec3 rd, float tHit, float jit){
  if (uLook.x < 0.01) return vec4(0.0);
  vec3 c = uTruckP + uTruckM * vec3(0.0, 1.4, -9.0);
  vec2 b = sphere(ro, rd, c, 11.0); if (b.y < 0.0 || b.x > tHit) return vec4(0.0);
  float t0 = max(b.x, 0.0), t1 = min(b.y, tHit), dt = (t1 - t0) / 12.0; float T = 1.0; vec3 L = vec3(0.0);
  vec3 sc = sunCol();
  for (int i = 0; i < 12; i++) {
    float tt = t0 + dt * (float(i) + jit); vec3 p = ro + rd * tt; vec3 q = transpose(uTruckM) * (p - uTruckP);
    float along = -q.z - 3.5; if (along < 0.0) continue;
    float w = 1.6 + along * 0.28, hgt = 0.9 + along * 0.16;
    float shape = exp(-sq(q.x / w)) * exp(-sq(max(q.y, 0.0) / hgt)) * smoothstep(0.0, 1.5, along) * exp(-along / 9.0);
    float n = textureLod(uN3, p * 0.16 + vec3(0.0, uTime * 0.05, uTime * 0.12), 0.0).r * 0.7 + textureLod(uN3, p * 0.5 - uTime * 0.07, 0.0).g * 0.3;
    float dens = shape * smoothstep(0.28, 0.7, n) * uLook.x * 1.9 * smoothstep(1.0, 9.0, tt);   // thinner where the camera is in it
    if (dens < 0.002) continue;
    float a = 1.0 - exp(-dens * dt);
    vec3 col = vec3(0.62, 0.57, 0.48) * (sc * (0.35 + 0.25 * hg(dot(rd, uSun), 0.4)) * max(uSun.y, 0.1) + skyAmb(vec3(0.0, 1.0, 0.0)) * 2.5) / PI;
    L += T * col * a; T *= 1.0 - a; if (T < 0.05) break;
  }
  return vec4(L, 1.0 - T);
}
/** The sea and the water inland: Hawke Bay's swell, its surf on the beaches and the rocks, the river's still water. */
vec3 waterCol(vec3 p, vec3 rd, float t, Gnd g, float sh){
  vec3 up = vec3(0.0, 1.0, 0.0); float foot = t * 2.0 * uTan / uRes.y / max(-rd.y, 0.03);
  float depth = max(-g.base, 0.0), calm = maskAt(p.xz).r > 0.5 && g.base > -2.5 ? 0.7 : 0.0;
  float unres; vec2 gs = waveSlope(p.xz + uWave, foot, unres) * (1.0 - calm * 0.85);
  // the swell steepens and breaks as the bottom comes up: bands of white water running in to the beach
  float shoal = smoothstep(6.0, 0.4, depth) * (1.0 - calm);
  float ph = depth * 1.1 - uTime * 0.55 + n2(p.xz / 60.0) * 3.0;
  float crest = pow(0.5 + 0.5 * sin(ph * TAU / 3.2), 6.0) * shoal;
  vec3 N = normalize(up + vec3(-gs.x, 0.0, -gs.y)); float rough = sqrt(1.3 * sqrt(unres) + 0.012) * (1.0 - calm * 0.6);
  float lace = n2(p.xz / 7.0 + uTime * vec2(0.01, 0.02)) * n2(p.xz / 2.3 - uTime * 0.03);
  float foam = clamp(crest * (0.6 + 0.8 * lace) + smoothstep(0.9, 0.0, depth) * (0.4 + 0.6 * lace) * (1.0 - calm) + smoothstep(0.55, 0.75, lace) * 0.06, 0.0, 1.0);
  vec3 V = -rd; float nv = max(dot(N, V), 0.02);
  float F = 0.02 + 0.98 * pow(1.0 - nv, 5.0) * (1.0 - rough * 0.9);
  vec3 R = reflect(rd, N); R.y = abs(R.y);
  vec3 sky = skyAt(normalize(vec3(0.0, 1.0, 0.0)), R);
  vec3 H = normalize(uSun + V); float nh = max(dot(N, H), 0.0);
  vec3 sc = sunCol();
  vec3 spec = sc * min(ggx(nh, max(rough, 0.05)), 140.0) * 0.25 / max(nv, 0.15) * (0.02 + 0.98 * pow(1.0 - max(dot(H, V), 0.0), 5.0)) * sh * max(uSun.y, 0.0);
  vec3 E = sc * max(uSun.y, 0.0) * sh + vec3(0.16, 0.27, 0.5) * SUN * 0.12 * gDay;
  vec3 deep = mix(vec3(0.006, 0.03, 0.05), vec3(0.01, 0.045, 0.055), n2(p.xz / 3000.0));
  vec3 shallow = calm > 0.0 ? vec3(0.04, 0.06, 0.04) : vec3(0.06, 0.13, 0.12);
  vec3 wc = mix(deep, shallow, smoothstep(9.0, 0.5, depth)) + vec3(0.03, 0.025, 0.015) * shoal * 0.8;        // sand stirred up in the surf
  vec3 col = wc * E / PI * 1.5 * (1.0 - F) + sky * F + spec;
  return mix(col, vec3(0.85, 0.87, 0.86) * E / PI, foam);
}
`;

const DRIVE_MAIN = /* glsl */ `
void main(){
  Rc = RG + uAlt; Cc = vec3(0.0, -Rc, 0.0); gDay = smoothstep(-0.14, 0.04, uSun.y) * 0.985 + 0.015;
  vec2 pc = (gl_FragCoord.xy + uJit - 0.5 * uRes) / (0.5 * uRes.y);
  vec3 rd = normalize(uCamM * vec3(pc * uTan, 1.0)); rd_g = rd;
  vec3 ro = uTruckP + uCam;
  float jit = ign(gl_FragCoord.xy, uFrame), jit2 = ign(gl_FragCoord.yx + 17.0, uFrame);
  float foot = 2.0 * uTan / uRes.y;
  wireA = 0.0; wireT = 1e9; wireC = vec3(0.0);

  // ---- what the ray meets: the ground (or water), the things by the road, the truck and the sheep, the bridge, the pad
  float tG = marchGround(ro, rd, 32000.0, jit);
  Hit th = traceThings(ro, rd, min(tG, 420.0), true);
  float tS = 1e9, mS = 0.0;
  { vec2 b = sphere(ro, rd, uTruckP + uTruckM * vec3(0.0, 1.8, 1.5), 6.4);
    if (b.y > 0.0) { float t = max(b.x, 0.0); for (int i = 0; i < 80; i++) { vec2 d = truckSD(ro + rd * t); if (d.x < 0.0008 * t + 0.0005) { tS = t; mS = d.y; break; } t += d.x; if (t > b.y) break; } } }
  for (int i = 0; i < 6; i++) { if (uSheep[i].x > 1e5) continue; vec3 c = vec3(uSheep[i].x, gH(uSheep[i].xy) + 0.6, uSheep[i].y); vec2 b = sphere(ro, rd, c, 1.2);
    if (b.y > 0.0 && b.x < min(tS, tG)) { float t = max(b.x, 0.0); for (int k = 0; k < 40; k++) { vec2 d = sheepSD(ro + rd * t, uSheep[i], c.y - 0.6); if (d.x < 0.001 * t + 0.001) { if (t < tS) { tS = t; mS = d.y + float(i) * 0.01; } break; } t += d.x; if (t > b.y) break; } } }
  float tB = 1e9, mB = 0.0;
  if (uBridge.x < uBridge.y) {                                                   // the bridge: only inside its box
    vec3 b0 = vec3(uBridgeB.x, -14.0, uBridgeB.y), b1 = vec3(uBridgeB.z, 14.0, uBridgeB.w), iv = 1.0 / rd, ta = (b0 - ro) * iv, tb = (b1 - ro) * iv, tn = min(ta, tb), tf = max(ta, tb);
    float t0 = max(max(tn.x, tn.y), max(tn.z, 0.0)), t1 = min(min(tf.x, tf.y), tf.z);
    if (t1 > t0 && t0 < tG) { float t = t0; for (int i = 0; i < 70; i++) { vec2 d = bridgeSD(ro + rd * t); if (d.x < 0.001 * t + 0.002) { tB = t; mB = d.y; break; } t += clamp(d.x, 0.02, 4.0); if (t > min(t1, tG)) break; } }
  }
  float tP = 1e9, mP = 0.0;
  if (uPadP.x < 1e5) { vec2 b = sphere(ro, rd, uPadP.xyz + vec3(0.0, 10.0, 0.0), 95.0); if (b.y > 0.0) { float t = max(b.x, 0.0); for (int i = 0; i < 90; i++) { vec2 d = mapPad(padP(ro + rd * t)); if (d.x < 0.0012 * t) { tP = t; mP = d.y; break; } t += d.x; if (t > b.y) break; } } }

  float tHit = min(min(min(tG, th.t), min(tS, tB)), tP);
  vec3 col; float depth;
  if (tHit > 1e8) {
    // ---- the sky
    col = vec3(0.0); float sd = dot(rd, uSun); col += vec3(1.0, 0.96, 0.9) * SUN * 220.0 * smoothstep(0.99994, 0.99998, sd);
    depth = 3000.0;
  } else {
    vec3 p = ro + rd * tHit, V = -rd; float fp = foot * tHit;
    float cs = cloudShadow((p - ro) * 0.001), sh = cs;
    if (tHit == tG) {
      Gnd g = ground(p.xz);
      bool water = g.h < uSea0 - 0.02;
      float e = max(0.02, fp * 1.5);
      if (water) { sh *= thingShadow(p, tHit); col = waterCol(p, rd, tHit, g, sh); }
      else {
        vec3 N = normalize(vec3(gH(p.xz - vec2(e, 0.0)) - gH(p.xz + vec2(e, 0.0)), 2.0 * e, gH(p.xz - vec2(0.0, e)) - gH(p.xz + vec2(0.0, e))));
        float rough, spec, gh = 0.0, wetK; vec3 alb;
        if (g.edge < 0.0 && !(bit(g.kind, 2.0) && g.s > uBridge.x && g.s < uBridge.y)) { alb = roadAlb(p, g, fp, N, rough, spec, wetK); }
        else alb = landAlb(p, g, fp, N, rough, spec, gh, wetK);
        // far trees: the bush's canopy seen from a distance, as colour (the trees themselves stand in the grid near by)
        if (tHit > 420.0) { vec4 M = maskAt(p.xz); alb = mix(alb, vec3(0.03, 0.05, 0.025), max(M.g, M.b) * smoothstep(420.0, 600.0, tHit) * 0.9); }
        float ts = thingShadow(p, tHit); sh *= ts;
        vec4 O = occAt(p.xz); float oTop = O.g * 63.75, oBot = (1.0 - O.r) * 63.75, yy = p.y - g.h, under = oTop > 0.5 && yy < oBot ? 1.0 : 0.0;
        float ao = 1.0 - 0.45 * under - 0.3 * smoothstep(0.5, 9.0, O.a * 63.75) * (1.0 - under);
        if (length(p - uTruckP) < 9.0) ao *= 0.55 + 0.45 * clamp(length(transpose(uTruckM) * (p - uTruckP) * vec3(0.8, 1.0, 0.33)) / 2.6, 0.0, 1.0);
        rough = mix(rough, 0.16, wetK); spec = mix(spec, 0.5, wetK); alb *= 1.0 - 0.45 * wetK;
        col = lit(alb, N, V, rough, spec, sh, ao);
        if (wetK > 0.01) col += skyAt(vec3(0.0, 1.0, 0.0), reflect(rd, vec3(0.0, 1.0, 0.0))) * wetK * (0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0)) * 0.8;
        vec4 gv = grassVol(ro, rd, tHit, p, gh, alb, sh); col = col * (1.0 - gv.a) + gv.rgb;
      }
    } else if (tHit == th.t) {
      // ---- a thing by the road
      float id = th.id, m = th.m; vec4 a = obj0(id), b = obj1(id);
      vec2 e2 = vec2(clamp(fp * 0.7, 0.004, a.w > 6.5 && a.w < 9.5 ? 0.012 : 0.2), 0.0);
      vec3 N = normalize(vec3(thingSD(p + e2.xyy, id).x - thingSD(p - e2.xyy, id).x, thingSD(p + e2.yxy, id).x - thingSD(p - e2.yxy, id).x, thingSD(p + e2.yyx, id).x - thingSD(p - e2.yyx, id).x));
      vec3 q = p - vec3(a.x, a.z, a.y); q.xz = rot(b.x) * q.xz; vec3 NL = N; NL.xz = rot(b.x) * N.xz;
      float seed = fract(a.x * 0.0137 + a.y * 0.0293) , n = textureLod(uN3, q * vec3(0.4, 0.1, 0.4), 0.0).r;
      vec3 alb = vec3(0.5); float rough = 0.7, spec = 0.2, thru = 0.0, glass = 0.0;
      if (m < 1.5) {               // weatherboards, painted; windows in white frames; a door; a dark band of piles under the floor
        vec3 pal[6] = vec3[6](vec3(0.8, 0.78, 0.72), vec3(0.6, 0.65, 0.6), vec3(0.74, 0.69, 0.55), vec3(0.4, 0.48, 0.54), vec3(0.77, 0.75, 0.69), vec3(0.5, 0.36, 0.27));
        alb = pal[int(seed * 5.99)] * (0.9 + 0.15 * n);
        bool wall = abs(NL.y) < 0.5; float wb = fract(q.y / 0.17);
        if (wall) { N = normalize(N + vec3(0.0, (0.5 - wb) * 0.5, 0.0)); alb *= 0.82 + 0.18 * smoothstep(0.0, 0.2, wb); }
        vec2 f = abs(NL.x) > 0.5 ? vec2(q.z, q.y) : vec2(q.x, q.y); float wl = abs(NL.x) > 0.5 ? b.z : b.y;
        float cx = fract(f.x / 3.1 + seed) - 0.5, frame = step(abs(cx), 0.2) * step(abs(f.y - 1.6), 0.62), pane = step(abs(cx), 0.18) * step(abs(f.y - 1.6), 0.56);
        if (wall && frame > 0.5 && abs(f.x) < wl - 0.6) { alb = vec3(0.85); if (pane > 0.5 && abs(fract(cx * 2.0 + 0.5) - 0.5) > 0.03) { alb = vec3(0.012, 0.014, 0.018); glass = 1.0; rough = 0.04; } }
        if (wall && abs(f.x - wl * 0.35) < 0.45 && f.y < 2.05 && NL.z > 0.5) alb = pal[int(fract(seed * 3.3) * 5.99)] * 0.5;
        if (q.y < 0.42) alb = vec3(0.12, 0.11, 0.1);
      } else if (m < 2.5) {        // corrugated iron roof: red, green, grey, or plain galvanised
        vec3 pal[5] = vec3[5](vec3(0.32, 0.07, 0.05), vec3(0.12, 0.2, 0.13), vec3(0.22, 0.23, 0.24), vec3(0.45, 0.46, 0.46), vec3(0.08, 0.09, 0.11));
        alb = pal[int(fract(seed * 7.3) * 4.99)] * (0.85 + 0.25 * n);
        float cor = sin((abs(b.y) > abs(b.z) ? q.x : q.z) * TAU / 0.076); N = normalize(N + (abs(b.y) > abs(b.z) ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0)) * cor * 0.12 * (1.0 - smoothstep(0.02, 0.2, fp)));
        rough = 0.4; spec = 0.6;
      } else if (m < 3.5) { alb = vec3(0.45, 0.25, 0.18) * (0.8 + 0.3 * n); }
      else if (m < 4.5) {         // a shed's corrugated walls
        alb = mix(vec3(0.42, 0.43, 0.43), vec3(0.28, 0.12, 0.08), step(0.6, seed)) * (0.8 + 0.3 * n);
        float cor = sin((abs(NL.x) > 0.5 ? q.z : q.x) * TAU / 0.076); alb *= 0.88 + 0.12 * cor;
        if (abs(NL.x) < 0.5 && abs(q.x) < b.y * 0.45 && q.y < 2.6 && NL.z > 0.5) alb = vec3(0.03);              // the open bay
        rough = 0.45; spec = 0.4;
      } else if (m < 5.5) {        // a shop: plastered and painted, shop windows under the verandah
        vec3 pal[6] = vec3[6](vec3(0.78, 0.74, 0.62), vec3(0.62, 0.68, 0.72), vec3(0.66, 0.42, 0.32), vec3(0.55, 0.63, 0.52), vec3(0.85, 0.84, 0.8), vec3(0.74, 0.6, 0.34));
        alb = pal[int(seed * 5.99)] * (0.85 + 0.2 * n);
        if (q.y > 3.6 && fract(q.x / 7.2 + seed) < 0.06) alb *= 0.8;                                                        // pilasters between the shopfronts
        if (NL.z > 0.5 && q.y < 3.0 && q.y > 0.55 && fract(q.x / 3.6) > 0.06) { alb = vec3(0.02, 0.024, 0.028); glass = 1.0; rough = 0.04; }   // shop windows under the verandah
        if (NL.z > 0.5 && q.y > 0.0 && q.y < 0.55) alb = vec3(0.3, 0.29, 0.27);
        if (NL.z > 0.5 && q.y > 4.0 && fract(q.x / 2.4) > 0.3 && fract(q.y / 3.6) > 0.35 && fract(q.y / 3.6) < 0.8) { alb = vec3(0.04); glass = 1.0; rough = 0.06; }
        if (NL.z > 0.5 && q.y > 3.4 && q.y < 4.0) alb = pal[int(fract(seed * 7.7) * 5.99)] * 0.55;                          // the fascia over the verandah, where the shop's name would be
        if (q.y > 3.6 * max(1.0, mod(b.w, 16.0)) + 0.35) alb *= 0.85;
      } else if (m < 6.5) { alb = vec3(0.6, 0.6, 0.58) * (0.8 + 0.2 * n); rough = 0.5; }
      else if (m < 7.5) { alb = vec3(0.86, 0.86, 0.84) * (0.9 + 0.1 * n); float wb = fract(q.y / 0.2); N = normalize(N + vec3(0.0, (wb - 0.5) * 0.15, 0.0)); }   // the lighthouse's white boards
      else if (m < 8.5) { alb = q.y > 10.9 ? vec3(0.42, 0.22, 0.12) * (0.8 + 0.3 * n) : vec3(0.6, 0.08, 0.05); rough = 0.4; spec = 0.5; }        // its red gallery rail, and the copper dome, uncovered when it was restored in 2016
      else if (m < 9.5) { alb = vec3(0.03, 0.035, 0.03); glass = 1.0; rough = 0.04; }
      else if (m < 10.5) { alb = vec3(0.33, 0.29, 0.24) * (0.75 + 0.4 * textureLod(uN3, q * vec3(2.0, 0.2, 2.0), 0.0).g); }        // weathered timber
      else if (m < 11.5) { alb = vec3(0.6, 0.58, 0.55); rough = 0.3; spec = 0.5; }
      else if (m < 12.5) { alb = vec3(0.17, 0.13, 0.1) * (0.7 + 0.5 * n); }                // bark
      else if (m < 13.9) {         // leaves
        float sp = fract(m) * 100.0 + 0.001; float ln = textureLod(uN3, q * 1.9 + seed * 7.0, 0.0).g, lf = textureLod(uN3, q * 6.3 + seed, 0.0).r;
        vec3 base = sp < 0.5 ? vec3(0.022, 0.04, 0.026) : sp < 1.5 ? vec3(0.025, 0.045, 0.02) : sp < 2.5 ? vec3(0.03, 0.065, 0.032) : sp < 3.5 ? vec3(0.035, 0.06, 0.022) : sp < 4.5 ? vec3(0.13, 0.15, 0.07) : sp < 5.5 ? vec3(0.07, 0.11, 0.045) : sp < 6.5 ? vec3(0.06, 0.07, 0.04) : vec3(0.05, 0.075, 0.025);
        float outer = clamp(thingSD(p + N * 0.6, id).x / 0.6, 0.0, 1.0);
        alb = base * (0.55 + 0.9 * ln) * (0.8 + 0.4 * seed) * (0.85 + 0.35 * outer) * mix(vec3(1.0), vec3(1.25, 1.18, 0.75), lf * outer * 0.6);
        float fl = textureLod(uN3, q * 11.0 + seed * 3.0, 0.0).g;
        if (sp > 6.5 && fl > 0.66 && ln > 0.45) alb = vec3(0.5, 0.36, 0.015) * (0.7 + 0.5 * fl);                        // gorse in flower in September, in scattered clusters
        if (sp > 3.5 && sp < 4.5 && q.y < b.y * 0.86) alb = vec3(0.32, 0.26, 0.17) * (0.6 + 0.5 * ln);                  // the cabbage tree's dead leaves
        N = normalize(N + (textureLod(uN3, q * 3.1, 0.0).rgb - 0.5) * 1.6); rough = 0.7; spec = sp > 2.5 && sp < 3.5 ? 0.45 : 0.25; thru = 0.45;
      }
      else if (m < 14.9) {         // an edge marker post: white, a red band, a reflector (white on the left of the road, yellow on the right)
        alb = vec3(0.85); bool rightSide = fract(m) > 0.05;
        if (!rightSide) { if (q.y > 0.72 && q.y < 0.86) alb = vec3(0.6, 0.04, 0.03); if (q.y > 0.9 && q.y < 1.06) { alb = vec3(0.95); spec = 0.45; rough = 0.35; } }
        else { if (q.y > 0.94 && q.y < 1.06) alb = vec3(0.6, 0.04, 0.03); if (q.y > 0.8 && q.y < 0.92) { alb = vec3(0.9, 0.7, 0.1); spec = 0.45; rough = 0.35; } }
      }
      else if (m < 15.5) { alb = vec3(0.32, 0.3, 0.26) * (0.7 + 0.5 * textureLod(uN3, q * vec3(4.0, 0.3, 4.0), 0.0).g); }          // a weathered post
      else if (m < 16.5) {         // a sign's face, from the atlas, or its galvanised back (a flat board: its normal is the board's, not the field's)
        { vec2 nz = rot(-b.x) * vec2(0.0, 1.0); float side = sign(dot(vec3(nz.x, 0.0, nz.y), -rd)); N = vec3(nz.x, 0.0, nz.y) * side; NL = vec3(0.0, 0.0, side); }
        float cell = mod(b.w, 64.0); vec3 bq = q - vec3(0.0, 1.6 + b.z, 0.0); float hx2 = b.y, hy2 = b.z; if (b.w > 63.5) { bq.xy = rot(0.7853982) * bq.xy; hx2 *= 0.7071; hy2 *= 0.7071; }
        vec2 uv = vec2(bq.x / hx2, bq.y / hy2) * 0.5 + 0.5;
        if (NL.z > 0.0) { vec2 at = (vec2(mod(cell, 8.0), floor(cell / 8.0)) + vec2(uv.x, 1.0 - uv.y)) / vec2(8.0, 4.0); vec4 s = texture(uAtlasT, at); alb = pow(s.rgb, vec3(2.2)); spec = 0.35; rough = 0.45; }
        else alb = vec3(0.5);
      }
      else if (m < 17.5) { alb = vec3(0.55); rough = 0.4; spec = 0.6; }
      else if (m < 18.5) { float yb = clamp(q.y / 1.5, 0.0, 1.0); alb = mix(vec3(0.07, 0.1, 0.035), vec3(0.24, 0.22, 0.1), textureLod(uN3, q * vec3(1.0, 4.0, 1.0), 0.0).r * 0.7 + yb * 0.3) * (0.7 + 0.5 * yb); thru = 0.5; N = normalize(N + (textureLod(uN3, q * 5.0, 0.0).rgb - 0.5) * 1.4); spec = 0.3; }   // toetoe leaves, yellowing at the tips
      else if (m < 19.5) { alb = vec3(0.62, 0.55, 0.4) * (0.8 + 0.3 * textureLod(uN3, q * 6.0, 0.0).r); thru = 0.8; rough = 0.95; spec = 0.05; }                // the plumes, last season's, bleached
      else if (m < 20.5) { alb = mix(vec3(0.035, 0.06, 0.03), vec3(0.12, 0.09, 0.04), smoothstep(0.7, 1.0, q.y / 1.8)); if (q.y > 1.9) alb = vec3(0.06, 0.03, 0.02); spec = 0.55; rough = 0.35; thru = 0.25; }   // flax
      else if (m < 21.5) { alb = mix(vec3(0.07, 0.15, 0.09), vec3(0.5), step(0.5, seed)) * (0.85 + 0.15 * sin(atan(q.z, q.x) * 120.0)); spec = 0.5; rough = 0.45; }   // water tank
      else if (m < 22.5) { alb = vec3(0.55, 0.52, 0.47) * (0.75 + 0.35 * n); }               // driftwood, bleached
      else if (m < 23.5) { alb = vec3(0.55, 0.56, 0.55); spec = 0.6; rough = 0.35; }          // galvanised gate
      else if (m < 24.5) { alb = vec3(0.25, 0.22, 0.2); spec = 0.5; rough = 0.4; }            // cattle stop rails
      else if (m < 25.5) { alb = vec3(0.5, 0.5, 0.47) * (0.8 + 0.3 * n); }
      else if (m < 26.5) { alb = vec3(0.6, 0.04, 0.03); spec = 0.6; rough = 0.3; }            // the gnome's hat
      else if (m < 27.5) { alb = vec3(0.85, 0.8, 0.72); }
      else if (m < 28.5) { alb = vec3(0.05, 0.12, 0.4); spec = 0.6; rough = 0.3; }
      else { alb = mix(vec3(0.08, 0.22, 0.6), vec3(0.85), step(0.93, max(fract(q.x * 12.0), fract(q.z * 12.0)))); }   // blueprint paper
      float ts = sunVis(p + N * 0.05, m > 12.5 && m < 13.9 ? max(b.z, 1.5) * 0.9 : 0.6) * shapeShadow(p); sh *= ts;
      float ao = clamp(0.4 + 0.6 * thingSD(p + N * 0.5, id).x / 0.5, 0.2, 1.0);
      if (m > 12.5 && m < 13.9) ao *= clamp(0.35 + 0.65 * (q.y / max(b.y, 1.0)), 0.3, 1.0);               // deep in the crown it is dark
      col = lit(alb, N, V, rough, spec, sh, ao);
      col += alb * thru * sunCol() * max(dot(rd, uSun), 0.0) * 0.6 * sh / PI;                                   // the sun through the leaves
      if (glass > 0.5) col += skyAt(vec3(0.0, 1.0, 0.0), reflect(rd, N)) * (0.06 + 0.9 * pow(1.0 - max(dot(N, V), 0.0), 5.0));
    } else if (tHit == tS) {
      // ---- the truck, or a sheep
      vec2 e2 = vec2(0.003, 0.0);
      vec3 N = normalize(vec3(sceneSD(p + e2.xyy).x - sceneSD(p - e2.xyy).x, sceneSD(p + e2.yxy).x - sceneSD(p - e2.yxy).x, sceneSD(p + e2.yyx).x - sceneSD(p - e2.yyx).x));
      vec3 q = transpose(uTruckM) * (p - uTruckP); float n = textureLod(uN3, q * 0.6, 0.0).r;
      vec3 alb = vec3(0.5); float rough = 0.5, spec = 0.5, metal = 0.0, glass = 0.0, coat = 0.0; vec3 emit = vec3(0.0);
      float m = mS; vec3 c = q - vec3(0.0, 2.3, 5.0);
      if (m < 30.5) {                                                                // the cab: white paint under a clear coat; windows; a grille
        alb = vec3(0.8, 0.81, 0.8); rough = 0.3; spec = 0.5; coat = 1.0;
        bool front = c.z > 0.95 && N.z * dot(N, uTruckM[2]) > -1.0 && dot(N, uTruckM[2]) > 0.6;
        float side = abs(dot(N, uTruckM[0]));
        if (dot(N, uTruckM[2]) > 0.55 && c.y > 0.25 && abs(c.x) < 1.08) { alb = vec3(0.006); glass = 1.0; rough = 0.02; coat = 1.0; }        // the windscreen
        if (side > 0.7 && c.y > 0.35 && c.y < 1.2 && c.z > -0.55 && c.z < 0.85) { alb = vec3(0.008); glass = 1.0; rough = 0.03; coat = 1.0; } // side windows
        if (side > 0.7 && abs(c.z - 0.9) < 0.012 && c.y < 0.35) alb *= 0.3;                                                            // the door's shut line
        if (c.y < -0.35) { alb = vec3(0.035); coat = 0.0; rough = 0.6; }
      }
      else if (m < 31.5) { alb = vec3(0.025); rough = 0.55; spec = 0.3; if (q.z > 6.0 && q.y > 0.95) alb *= 0.6 + 0.4 * step(0.5, fract(q.y * 14.0)); }
      else if (m < 32.5) { alb = vec3(0.3, 0.3, 0.29) * (0.75 + 0.4 * textureLod(uN3, q * vec3(0.5, 2.0, 3.0), 0.0).g); rough = 0.55; metal = 0.6; }   // a steel chequer-plate floor
      else if (m < 33.5) { alb = vec3(0.45, 0.46, 0.47); metal = 1.0; rough = 0.42; }
      else if (m < 34.5) { alb = vec3(0.018); rough = 0.82; spec = 0.15; float rr = length((q - vec3(0.0, 0.52, 0.0)).yz); }
      else if (m < 35.5) { alb = vec3(0.75, 0.76, 0.76); metal = 0.0; rough = 0.35; float a2 = atan(q.y - 0.52, q.z - (q.z > 2.5 ? 4.85 : q.z > 0.0 ? 0.7 : -0.7)) + uDrv.y; alb *= 0.55 + 0.45 * step(0.35, fract(a2 * 5.0 / TAU)); }
      else if (m < 36.5) { alb = vec3(0.86, 0.87, 0.87) * (0.96 + 0.06 * n); rough = 0.42; spec = 0.35; }            // the tank: white, satin
      else if (m < 37.5) { alb = vec3(0.05, 0.08, 0.16); rough = 0.5; }
      else if (m < 38.5) { alb = vec3(0.8, 0.45, 0.03); rough = 0.75; spec = 0.1; }
      else if (m < 40.6) { vec3 s = p; alb = vec3(0.6, 0.57, 0.5) * (0.8 + 0.3 * textureLod(uN3, s * 3.0, 0.0).r); rough = 0.95; spec = 0.05; N = normalize(N + (textureLod(uN3, s * 5.0, 0.0).rgb - 0.5) * 0.8); }   // wool, a bit grubby
      else if (m < 41.5) { alb = vec3(0.78, 0.75, 0.68); rough = 0.75; }                       // the face
      else if (m > 43.5 && m < 44.5) { alb = vec3(0.04, 0.035, 0.035); rough = 0.4; spec = 0.4; }
      else if (m > 44.5) { alb = vec3(0.42, 0.39, 0.34); rough = 0.8; if (dot(p - vec3(0.0), vec3(0.0, 1.0, 0.0)) - gH(p.xz) < 0.08) alb = vec3(0.05); }   // legs, and the hooves
      else if (m < 42.5) { if (q.z < 0.0) { alb = vec3(0.35, 0.01, 0.005); rough = 0.15; spec = 0.8; emit = vec3(0.7, 0.02, 0.01) * (0.04 + uDrv.z * 1.6); if (abs(abs(q.x) - 0.95) > 0.12) { alb = vec3(0.45, 0.25, 0.02); emit = vec3(0.0); } } else { alb = vec3(0.8); glass = 1.0; rough = 0.08; } }
      else { alb = vec3(0.85, 0.85, 0.8); rough = 0.4; if (abs(q.y - 0.78) < 0.035 && abs(q.x) < 0.2 && fract(q.x * 9.0) > 0.35) alb = vec3(0.04); }   // a plate, white with black characters
      float ts = 1.0; { float t = 0.06; for (int i = 0; i < 24; i++) { float d = sceneSD(p + N * 0.02 + uSun * t).x; ts = min(ts, 10.0 * d / t); t += clamp(d, 0.03, 1.0); if (ts < 0.02 || t > 14.0) break; } }
      sh *= clamp(ts, 0.0, 1.0) * sunVis(p + N * 0.05, 0.4);
      float ao = clamp(0.35 + 0.65 * sceneSD(p + N * 0.3).x / 0.3, 0.25, 1.0) * clamp(0.5 + 0.5 * (p.y - gH(p.xz)) / 1.0, 0.3, 1.0);
      vec3 F0 = mix(vec3(0.04), alb, metal);
      col = lit(alb * (1.0 - metal), N, V, rough, spec, sh, ao);
      vec3 R = reflect(rd, N); float Fe = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
      vec3 env2 = R.y > 0.0 ? skyAt(vec3(0.0, 1.0, 0.0), R) : mix(vec3(0.05, 0.07, 0.035), vec3(0.09), 0.3) * SUN * 0.035 * (0.4 + 0.6 * sh);   // the sky above, the green ground below
      float gloss = (1.0 - rough) * (1.0 - rough);
      col += env2 * (mix(vec3(Fe * max(coat, gloss * 0.5)), F0 * gloss, metal)) * ao;
      if (coat > 0.5) col += sunCol() * sh * coat * Fe * min(ggx(max(dot(N, normalize(uSun + V)), 0.0), 0.1), 40.0) * 0.05 * max(dot(N, uSun), 0.0);
      col += emit * SUN * 0.3;
    } else if (tHit == tB) {
      // ---- the bridge
      vec2 e2 = vec2(0.01, 0.0);
      vec3 N = normalize(vec3(bridgeSD(p + e2.xyy).x - bridgeSD(p - e2.xyy).x, bridgeSD(p + e2.yxy).x - bridgeSD(p - e2.yxy).x, bridgeSD(p + e2.yyx).x - bridgeSD(p - e2.yyx).x));
      Gnd g = ground(p.xz); float rough = 0.8, spec = 0.2, wetK; vec3 alb;
      if (mB < 50.5 && N.y > 0.9 && abs(g.d) < g.w2) { g.kind = profAt(g.s).y; g.edge = -1.0; alb = roadAlb(p, g, fp, N, rough, spec, wetK); }
      else if (mB < 51.5) alb = vec3(0.45, 0.44, 0.41) * (0.85 + 0.3 * n2(p.xz / 1.3));
      else if (mB < 52.5) { alb = vec3(0.7, 0.72, 0.72); rough = 0.35; spec = 0.6; }
      else alb = vec3(0.5, 0.49, 0.46) * (0.8 + 0.3 * n2(p.xy / 3.0));
      if (mB < 50.5 && N.y < 0.5) alb = vec3(0.45, 0.44, 0.41) * (0.75 + 0.3 * n2(p.xy / 2.0)) * (0.6 + 0.4 * smoothstep(-6.0, 0.0, p.y - g.h - 6.0));
      sh *= thingShadow(p + N * 0.05, tHit);
      col = lit(alb, N, V, rough, spec, sh, 1.0);
    } else {
      // ---- the launch pad, as it stood in 2016: the mount, the strongback, the hangar
      vec3 q = padP(p); vec2 e2 = vec2(0.012, 0.0);
      vec3 N = normalize(vec3(mapPad(q + e2.xyy).x - mapPad(q - e2.xyy).x, mapPad(q + e2.yxy).x - mapPad(q - e2.yxy).x, mapPad(q + e2.yyx).x - mapPad(q - e2.yyx).x));
      N.xz = rot(-uPadP.w) * N.xz;
      vec3 alb = vec3(0.3); float rough = 0.6, spec = 0.3; float n = textureLod(uN3, q * 0.3, 0.0).r;
      if (mP < 1.5) alb = vec3(0.3) * (0.8 + 0.3 * n); else if (mP < 2.5) { alb = vec3(0.035) * (0.8 + 0.5 * n); rough = 0.4; spec = 0.5; }
      else if (mP < 3.5) alb = vec3(0.16, 0.165, 0.17); else if (mP < 4.5) { vec3 bq = q - vec3(-74.0, 0.0, -34.0); float rib = 0.5 + 0.5 * cos((abs(N.x) > 0.6 ? bq.z : bq.x) * 20.9); alb = vec3(0.6, 0.64, 0.66) * (0.86 + 0.14 * rib); if (bq.y < 0.9) alb = vec3(0.17); }
      else if (mP < 5.5) alb = vec3(0.8); else if (mP < 7.5) { alb = vec3(0.3, 0.33, 0.36); spec = 0.5; } else { alb = vec3(0.62, 0.06, 0.04); spec = 0.5; rough = 0.45; }
      sh *= thingShadow(p + N * 0.05, tHit);
      col = lit(alb, N, V, rough, spec, sh, clamp(0.35 + 1.6 * mapPad(q + vec3(0.0, 0.3, 0.0)).x, 0.3, 1.0));
    }
    depth = tHit == tS ? -tHit : tHit * 0.001;
  }
  if (uDbg > 0.5 && max(col.r, max(col.g, col.b)) > 40.0) col = (tHit == tG ? vec3(1, 0, 0) : tHit == th.t ? vec3(0, 1, 0) * (1.0 + th.m) : tHit == tS ? vec3(0, 0, 1) : vec3(1, 1, 0)) * 50.0;
  { vec4 dv = dustVol(ro, rd, tHit > 1e8 ? 1e4 : tHit, jit2); col = col * (1.0 - dv.a) + dv.rgb; }
  // ---- wires in front of whatever is behind them
  if (wireA > 0.0 && wireT < tHit) { vec3 wc = wireC * (sunCol() * max(uSun.y, 0.0) * 0.5 + skyAmb(vec3(0.0, 1.0, 0.0)) * 2.0) / PI; wc += sunCol() * 0.02 * pow(max(dot(reflect(rd, vec3(0.0, 1.0, 0.0)), uSun), 0.0), 40.0); col = mix(col, wc, wireA * 0.9); }
  // ---- clouds and the air between
  float tKm = min(tHit, 3e6) * 0.001;
  float tC; vec4 cl = clouds(rd, tHit > 1e8 ? 1e9 : tKm, jit, tC);
  col = col * cl.a + cl.rgb;
  float tEnd = tHit > 1e8 ? mix(tC, 1e9, cl.a) : tKm;
  if (!(tEnd > 1e-5 && tEnd < 1e10)) tEnd = 1e-3;                                 // a ray whose length came out undefined: keep the air out of it
  vec3 L, Tr; scatter(vec3(0.0), rd, tEnd, jit2, uAtmN, L, Tr);
  if (!(L.r + L.g + L.b < 1e6 && Tr.r + Tr.g + Tr.b < 4.0)) { L = vec3(0.0); Tr = vec3(1.0); }
  col = col * Tr + L;
  { float tH = min(tEnd, 60.0), hz = 1.0 - exp(-tH / 38.0 * (0.6 + 0.4 * exp(-max(rd.y, 0.0) * 40.0)));
    vec3 hc = skyAt(vec3(0.0, 1.0, 0.0), normalize(vec3(rd.x, max(rd.y, 0.0) * 0.2 + 0.02, rd.z))) * 0.95 + sunCol() * 0.012 * pow(max(dot(rd, uSun), 0.0), 6.0);
    col = mix(col, hc, hz * 0.55); }
  o = vec4(min(col, vec3(30000.0)), depth);
}`;

/** The drive's fragment shader: the SCENE program's library with this main(). */
export const DRIVE = SCENE.replace(/void main\(\)\{[\s\S]*$/, DRIVE_CODE + DRIVE_MAIN);
