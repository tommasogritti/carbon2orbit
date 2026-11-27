// A small 3D renderer of its own, used by the levels that are one continuous shot in three dimensions (scenes/Descent.ts).
// It shares nothing with Phaser: its own WebGL2 context on its own canvas, laid over the game's. Every pixel is ray-marched:
// a planet with a real atmosphere, volumetric clouds, a sea, and the vehicle as signed-distance geometry (shaders.ts).
// Frame: scene at reduced size, jittered, in HDR -> temporal upsampling -> bloom chain -> lens and film.
import { VERT, GEN_N3, GEN_WX, GEN_N2, SCENE, TAA, DOWN, UP, POST } from './shaders';
import { DRIVE } from './drive';

export type V3 = [number, number, number];
/** What the scene hands the renderer for one frame. Lengths in metres from the vehicle unless said otherwise. */
export interface Frame {
  time: number;                // seconds, the scene's own clock
  cam: V3; look: V3; fov: number; // camera position, what it looks at, vertical field of view in degrees
  roll: number; shake: number;
  alt: number;                 // vehicle altitude, km
  travel: [number, number];    // how far the vehicle has gone over the planet, km
  drop: number;                // metres per second the world rises past the vehicle (for the temporal filter)
  speed: [number, number];     // km per second over the planet (same)
  sun: V3; body: number[]; vel: V3;
  hot: number; scorch: number; glow: number; rcs: [number, number, number, number];
  chuteAxis: V3; drogue: number; main: number;
  splash: number; s2: [number, number, number, number]; ship: V3 | null;
  exposure: number; flash: number;
  /** A helicopter: where it is, its axes (nose, up, starboard), where its hook hangs, and the rotor's angle. */
  heli?: { pos: V3; m: number[]; hook: V3; rotor: number };
  /** The drogue still flying above the main chute, 0 to 1. */
  trail?: number;
  /** A rocket going up, in place of a stage coming down. The vehicle's origin is the middle of stage one as it sits in the stack. */
  launch?: {
    s1: V3 | null;             // stage one: metres from its place in the stack, or null once it is out of sight
    fairing: number;           // seconds since the fairing went, negative while it is on
    plume: [number, number, number]; // throttle; spread (0 sea level, 1 vacuum); 1 for the vacuum engine
    pad: V3;                   // the pad's deck, metres from the vehicle
    site: number; padKm: number; lamps: number; smoke: number; // 1 headland, 2 flat coast; the pad's height, km; floodlights 0..1; seconds since ignition or -1
    boom: number;              // seconds since the vehicle broke up, or -1
    frost?: number; tilt?: number; // frost on the cold tanks, 0..1; the strongback's lean, radians
    pay?: number;              // the kind of payload: 0 one satellite, 1 CubeSats on a dispenser, 3 a radar satellite, 4 three microsatellites, 5 a re-entry capsule (on a spacecraft with solar wings)
    kick?: [number, number];   // the kick stage alone: 1 with its payload, 2 without; and how far the last payload released has drifted, m (or -1)
    /** 2: not a rocket but a capsule coming down over land (site 3). `pad` is then where it lands, and `north` how far north of the range that is, km. */
    mode?: number; north?: number;
  };
  /** A drive along a road, at ground level (scenes/Drive.ts): the world is the stage's, in metres from its origin; `cam` is from the truck. */
  drive?: {
    truck: V3; m: number[];            // where the truck stands, and its axes (right, up, forward) as nine numbers
    drv: [number, number, number, number]; // steering angle, wheel turn, brake lights, how far the load has shifted
    sheep: Float32Array;               // six vec4s: x, z, heading, step (x > 1e5: none)
    pad: [number, number, number, number]; bridge: [number, number, number, number]; bridgeB: [number, number, number, number]; look: [number, number, number, number];
  };
}
/** The textures of one stretch of road, laid out by src/drive/world.ts. */
export interface DriveTex {
  road: Float32Array; mask: Uint8Array; mask2: Uint8Array; occ: Uint8Array; n: number; hmax: number; // n x n over the stage's box; the highest ground or thing
  prof: Float32Array; rows: number;                                         // per 4 m of road
  grid: Float32Array; cells: number;                                        // (cells * 2) x cells, four indices a texel
  objs: Float32Array; objRows: number;                                      // 4096 x objRows
  region?: { h: Float32Array; nx: number; nz: number };
  atlas?: TexImageSource;
  box: [number, number, number, number]; profU: [number, number, number, number]; gridU: [number, number, number, number]; reg: [number, number, number, number];
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

let supported: boolean | undefined;
/** True when this browser can run the renderer: WebGL2 with float render targets. */
export function can3d() {
  if (supported !== undefined) return supported;
  try { const gl = document.createElement('canvas').getContext('webgl2'); supported = !!(gl && gl.getExtension('EXT_color_buffer_float')); gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { supported = false; }
  return supported;
}

interface Target { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }
interface Prog { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }

export class Engine {
  canvas = document.createElement('canvas');
  gl: WebGL2RenderingContext;
  private progs: Record<string, Prog> = {};
  private n3!: WebGLTexture; private wx!: WebGLTexture; private n2!: WebGLTexture;
  private sceneT?: Target; private hist: Target[] = []; private bloom: Target[] = [];
  private frame = 0; private prev?: { m: number[]; cam: V3 }; private reset = true; private last = -1;
  private timer: any; private query: WebGLQuery | null = null; private pending: WebGLQuery | null = null;
  /** Share of the canvas's pixels the scene is ray-marched at; the engine moves it to hold the frame time. */
  scale = 0.72; gpuMs = 0; quality = 1; lost = false;
  constructor() {
    const gl = this.canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false })!;
    this.gl = gl; gl.getExtension('EXT_color_buffer_float'); gl.getExtension('OES_texture_float_linear');
    this.timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
    for (const [k, fs] of Object.entries({ n3: GEN_N3, wx: GEN_WX, n2: GEN_N2, scene: SCENE, taa: TAA, down: DOWN, up: UP, post: POST })) this.progs[k] = this.program(fs, k);
    // the drive's program is big, and only one level uses it: it is built the first time that level asks (drive())
    gl.bindVertexArray(gl.createVertexArray());
    this.noise();
  }
  private program(fs: string, name: string): Prog {
    const gl = this.gl, p = gl.createProgram()!;
    for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, fs]] as [number, string][]) {
      const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`gfx3d shader "${name}": ${gl.getShaderInfoLog(s)}`);
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`gfx3d program "${name}": ${gl.getProgramInfoLog(p)}`);
    const u: Prog['u'] = {};
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const a = gl.getActiveUniform(p, i)!; u[a.name.replace('[0]', '')] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  }
  /** Use a program and set its uniforms: numbers, vectors by length, 3x3 matrices as nine numbers, textures as [texture, unit, 3D?]. */
  private use(name: string, vals: Record<string, number | number[] | Float32Array | [WebGLTexture, number, boolean?]>, ints: string[] = []) {
    const gl = this.gl, pr = this.progs[name]; gl.useProgram(pr.p);
    for (const [k, v] of Object.entries(vals)) {
      const loc = pr.u[k]; if (!loc) continue;
      if (typeof v === 'number') { if (ints.includes(k)) gl.uniform1i(loc, v); else gl.uniform1f(loc, v); }
      else if (v instanceof Float32Array) gl.uniform4fv(loc, v);
      else if (v[0] instanceof WebGLTexture) { gl.activeTexture(gl.TEXTURE0 + (v[1] as number)); gl.bindTexture(v[2] ? gl.TEXTURE_3D : gl.TEXTURE_2D, v[0]); gl.uniform1i(loc, v[1] as number); }
      else if (v.length === 2) gl.uniform2fv(loc, v as number[]); else if (v.length === 3) gl.uniform3fv(loc, v as number[]); else if (v.length === 4) gl.uniform4fv(loc, v as number[]); else gl.uniformMatrix3fv(loc, false, v as number[]);
    }
  }
  private target(w: number, h: number, half = true, mip = false): Target {
    const gl = this.gl, tex = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, tex);
    if (half) gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, w, h); else gl.texStorage2D(gl.TEXTURE_2D, mip ? Math.floor(Math.log2(Math.max(w, h))) + 1 : 1, gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const wrap = half ? gl.CLAMP_TO_EDGE : gl.REPEAT; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    const fb = gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fb, tex, w, h };
  }
  private free(t?: Target) { if (t) { this.gl.deleteFramebuffer(t.fb); this.gl.deleteTexture(t.tex); } }
  private draw(t: Target | null, w?: number, h?: number) { const gl = this.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fb : null); gl.viewport(0, 0, t ? t.w : w!, t ? t.h : h!); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  /** The noise everything is made of, worked out once on the graphics card: a cloud volume, a weather map, and a sheet for the sea. */
  private noise() {
    const gl = this.gl, N = 96;
    this.n3 = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_3D, this.n3); gl.texStorage3D(gl.TEXTURE_3D, 7, gl.RGBA8, N, N, N);
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, p, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const fb = gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, N, N);
    for (let z = 0; z < N; z++) { gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.n3, 0, z); this.use('n3', { uZ: (z + 0.5) / N }); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    gl.deleteFramebuffer(fb); gl.bindTexture(gl.TEXTURE_3D, this.n3); gl.generateMipmap(gl.TEXTURE_3D);
    const wx = this.target(1024, 1024, false, true); this.use('wx', {}); this.draw(wx); this.wx = wx.tex; gl.bindTexture(gl.TEXTURE_2D, wx.tex); gl.generateMipmap(gl.TEXTURE_2D); gl.deleteFramebuffer(wx.fb);
    const n2 = this.target(512, 512, false, true); this.use('n2', {}); this.draw(n2); this.n2 = n2.tex; gl.bindTexture(gl.TEXTURE_2D, n2.tex); gl.generateMipmap(gl.TEXTURE_2D); gl.deleteFramebuffer(n2.fb);
  }
  private patch: WebGLTexture | null = null; private patchA = 0;
  /** The mission patch a launch carries on its fairing, or null for none. */
  setPatch(img: TexImageSource | null) {
    const gl = this.gl; if (this.patch) gl.deleteTexture(this.patch); this.patch = null; this.patchA = 0; if (!img) return;
    const w = (img as any).naturalWidth || (img as any).width, h = (img as any).naturalHeight || (img as any).height; if (!w || !h) return;
    this.patch = gl.createTexture(); gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.patch);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); this.patchA = h / w;
  }
  private dt: Record<string, WebGLTexture> = {}; private du?: DriveTex;
  /** Build the drive's program (once: it takes a moment), so the level can say so while it waits. */
  drive() { if (!this.progs.drive) this.progs.drive = this.program(DRIVE, 'drive'); }
  /** Hand the engine the textures of the stretch of road being driven. */
  setDrive(d: DriveTex) {
    const gl = this.gl; this.drive(); this.du = d;
    const tex = (key: string, w: number, h: number, fmt: number, ifmt: number, type: number, data: ArrayBufferView | null, lin: boolean) => {
      if (this.dt[key]) gl.deleteTexture(this.dt[key]);
      const t = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data);
      const f = lin ? gl.LINEAR : gl.NEAREST; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.dt[key] = t;
    };
    tex('road', d.n, d.n, gl.RGBA, gl.RGBA32F, gl.FLOAT, d.road, true);
    tex('mask', d.n, d.n, gl.RGBA, gl.RGBA8, gl.UNSIGNED_BYTE, d.mask, true);
    tex('mask2', d.n, d.n, gl.RGBA, gl.RGBA8, gl.UNSIGNED_BYTE, d.mask2, true);
    tex('occ', d.n, d.n, gl.RGBA, gl.RGBA8, gl.UNSIGNED_BYTE, d.occ, true);
    tex('prof', d.rows, 1, gl.RGBA, gl.RGBA32F, gl.FLOAT, d.prof, true);
    tex('grid', d.cells * 2, d.cells, gl.RGBA, gl.RGBA32F, gl.FLOAT, d.grid, false);
    tex('objs', 4096, d.objRows, gl.RGBA, gl.RGBA32F, gl.FLOAT, d.objs, false);
    if (d.region) tex('reg', d.region.nx, d.region.nz, gl.RED, gl.R32F, gl.FLOAT, d.region.h, true);
    if (d.atlas) { if (this.dt.atlas) gl.deleteTexture(this.dt.atlas); const t = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, d.atlas); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); this.dt.atlas = t; }
    this.reset = true;
  }
  /** Size the canvas in device pixels; the targets follow at the next frame. */
  resize(w: number, h: number) { w = Math.max(16, Math.round(w)); h = Math.max(16, Math.round(h)); if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; this.reset = true; } }
  private targets() {
    const W = this.canvas.width, H = this.canvas.height; this.scale = Math.min(this.scale, Math.sqrt(1.1e6 / (W * H)));   // never ray-march more than about a million pixels: a 4K canvas is filled from a smaller picture over time
    const sw = Math.max(8, Math.round(W * this.scale / 2) * 2), sh = Math.max(8, Math.round(H * this.scale / 2) * 2);
    if (!this.sceneT || this.sceneT.w !== sw || this.sceneT.h !== sh) { this.free(this.sceneT); this.sceneT = this.target(sw, sh); }
    if (!this.hist[0] || this.hist[0].w !== W || this.hist[0].h !== H) {
      this.hist.forEach((t) => this.free(t)); this.bloom.forEach((t) => this.free(t));
      this.hist = [this.target(W, H), this.target(W, H)]; this.bloom = [];
      for (let i = 0, w = W >> 1, h = H >> 1; i < 7 && w > 4 && h > 4; i++, w >>= 1, h >>= 1) this.bloom.push(this.target(w, h));
      this.reset = true;
    }
  }
  render(f: Frame) {
    const gl = this.gl; if (this.lost) return;
    this.targets();
    const st = this.sceneT!, W = this.canvas.width, H = this.canvas.height;
    // the camera: a look-at with a little roll, and a shake that is all rotation
    const sk = f.shake, t = f.time;
    const look: V3 = [f.look[0] + sk * 0.5 * Math.sin(t * 37.1), f.look[1] + sk * 0.5 * Math.sin(t * 41.7 + 1), f.look[2] + sk * 0.5 * Math.sin(t * 29.3 + 2)];
    const fw = norm(sub(look, f.cam)); let rt = norm(cross(fw, [0, 1, 0])); let up = cross(rt, fw);
    const rr = f.roll + sk * 0.012 * Math.sin(t * 23.7), cr = Math.cos(rr), sr = Math.sin(rr);
    [rt, up] = [[rt[0] * cr + up[0] * sr, rt[1] * cr + up[1] * sr, rt[2] * cr + up[2] * sr], [up[0] * cr - rt[0] * sr, up[1] * cr - rt[1] * sr, up[2] * cr - rt[2] * sr]];
    const m = [...rt, ...up, ...fw], tan = Math.tan((f.fov * Math.PI) / 360);
    const hal = (i: number, b: number) => { let r = 0, k = 1 / b; for (; i > 0; i = Math.floor(i / b), k /= b) r += k * (i % b); return r; };
    const jit = [hal((this.frame % 16) + 1, 2) - 0.5, hal((this.frame % 16) + 1, 3) - 0.5];
    const camAlt = f.alt + f.cam[1] / 1000, camXZ = [f.travel[0] + f.cam[0] / 1000 + 600, f.travel[1] + f.cam[2] / 1000 + 900];
    if (this.timer && !this.pending && !this.query) { this.query = gl.createQuery(); gl.beginQuery(this.timer.TIME_ELAPSED_EXT, this.query!); }
    const dv = f.drive, du = this.du, D = this.dt;
    if (dv && du) this.use('drive', {
      uRes: [st.w, st.h], uJit: jit, uTime: f.time, uFrame: this.frame % 1024, uCam: f.cam, uCamM: m, uTan: tan, uAlt: camAlt, uXZ: camXZ, uWave: [f.travel[0] * 1000 + f.cam[0], f.travel[1] * 1000 + f.cam[2]], uSun: f.sun,
      uMode: 3, uSite: [0, 0, 0, -1], uTilt: 0, uPlume: [0, 0, 0, 0], uS1: [1e6, 0, 0], uKick: [0, -1], uPad: [0, 0, 0],
      uCloudN: Math.round(28 + 28 * this.quality), uAtmN: Math.round(10 + 8 * this.quality), uN3: [this.n3, 0, true], uWx: [this.wx, 1], uN2: [this.n2, 2],
      uRoadT: [D.road, 4], uProfT: [D.prof, 5], uMaskT: [D.mask, 6], uMask2T: [D.mask2, 7], uGridT: [D.grid, 8], uObjT: [D.objs, 9], uRegT: [D.reg || D.road, 10], uAtlasT: [D.atlas || this.n2, 11], uOccT: [D.occ, 12], uHmax: du.hmax, uDbg: (window as any).__drvDbg || 0,
      uBox: du.box, uProf: du.profU, uGrid: du.gridU, uReg: du.reg, uTruckP: dv.truck, uTruckM: dv.m, uDrv: dv.drv, uSheep: dv.sheep, uPadP: dv.pad, uBridge: dv.bridge, uBridgeB: dv.bridgeB, uLook: dv.look, uSea0: 0,
    }, ['uCloudN', 'uAtmN', 'uMode']);
    else this.use('scene', {
      uRes: [st.w, st.h], uJit: jit, uTime: f.time, uFrame: this.frame % 1024, uCam: f.cam, uCamM: m, uTan: tan, uAlt: camAlt, uXZ: camXZ,
      uWave: [f.travel[0] * 1000 + f.cam[0], f.travel[1] * 1000 + f.cam[2]], uSun: f.sun, uBody: f.body, uVel: f.vel, uHot: f.hot, uScorch: f.scorch, uGlow: f.glow, uRcs: f.rcs,
      uChA: f.chuteAxis, uDrogue: f.drogue, uMain: f.main, uSea: f.alt * 1000, uSplash: f.splash, uS2: f.s2, uShip: f.ship || [1e6, 0, 0], uHeli: f.heli ? f.heli.pos : [1e6, 0, 0], uHeliM: f.heli ? f.heli.m : [1, 0, 0, 0, 1, 0, 0, 0, 1], uHook: f.heli ? f.heli.hook : [1e6, -30, 0], uRotor: f.heli ? f.heli.rotor : 0, uTrail: f.trail || 0,
      ...(f.launch ? { uMode: f.launch.mode || 1, uS1: f.launch.s1 || [1e6, 0, 0], uFair: f.launch.fairing, uPlume: [...f.launch.plume, Math.min(1, 0.4 / f.exposure)], uPad: f.launch.pad, uPadK: [(f.launch.pad[0] - f.cam[0]) / 1000, (f.launch.pad[2] - f.cam[2]) / 1000], uSite: [f.launch.site, f.launch.padKm, f.launch.lamps, f.launch.smoke], uBoom: f.launch.boom, uKick: f.launch.kick || [0, -1], uPay: f.launch.pay || 0, uFrost: f.launch.frost || 0, uTilt: f.launch.tilt || f.launch.north || 0 } : { uMode: 0, uS1: [0, 0, 0], uFair: -1, uPlume: [0, 0, 0, 0], uPad: [0, 0, 0], uPadK: [0, 0], uSite: [0, 0, 0, -1], uBoom: -1, uKick: [0, -1], uFrost: 0, uTilt: 0, uPay: 0 }),
      uCloudN: Math.round(40 + 32 * this.quality), uAtmN: Math.round(12 + 12 * this.quality), uN3: [this.n3, 0, true], uWx: [this.wx, 1], uN2: [this.n2, 2], uPatchT: [this.patch || this.n2, 3], uPatchA: f.launch && this.patch ? this.patchA : 0,
    }, ['uCloudN', 'uAtmN', 'uMode']);
    this.draw(st);
    // gather it at full size over time
    const [h0, h1] = this.frame % 2 ? [this.hist[0], this.hist[1]] : [this.hist[1], this.hist[0]], pv = this.prev || { m, cam: f.cam }, dt = this.last < 0 || this.reset ? 1 / 60 : Math.min(Math.max(f.time - this.last, 0), 0.1); // the scene's own clock: the display may refresh at 60, 120 or anything else
    this.last = f.time;
    const camD = sub(f.cam, pv.cam), worldD: V3 = [camD[0] + f.speed[0] * 1000 * dt, camD[1] - f.drop * dt, camD[2] + f.speed[1] * 1000 * dt];
    this.use('taa', { uCur: [st.tex, 0], uHist: [h0.tex, 1], uCurRes: [st.w, st.h], uJit: jit, uCamM: m, uPrevM: pv.m, uCamD: camD, uWorldD: worldD, uTan: tan, uAspect: W / H, uReset: this.reset ? 1 : 0 });
    this.draw(h1); this.prev = { m, cam: f.cam }; this.reset = false;
    // bloom: down the chain and back up
    let src = h1;
    this.bloom.forEach((b, i) => { this.use('down', { uTex: [src.tex, 0], uPx: [1 / src.w, 1 / src.h], uFirst: i ? 0 : 1, uKnee: 1.1 / Math.max(f.exposure, 0.01) }); this.draw(b); src = b; });
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = this.bloom.length - 1; i > 0; i--) { const s = this.bloom[i]; this.use('up', { uTex: [s.tex, 0], uPx: [1 / s.w, 1 / s.h] }); this.draw(this.bloom[i - 1]); }
    gl.disable(gl.BLEND);
    this.use('post', { uTex: [h1.tex, 0], uBloom: [this.bloom[0].tex, 1], uBloomS: [this.bloom[Math.min(3, this.bloom.length - 1)].tex, 2], uPx: [1 / W, 1 / H], uExp: f.exposure, uTime: f.time, uShake: f.shake, uFlash: f.flash, uAspect: W / H, uGhost: (f.launch || f.drive ? 1e4 : 1.6) / Math.max(f.exposure, 0.01) });
    this.draw(null, W, H);
    if (this.query) { gl.endQuery(this.timer.TIME_ELAPSED_EXT); this.pending = this.query; this.query = null; }
    else if (this.pending && gl.getQueryParameter(this.pending, gl.QUERY_RESULT_AVAILABLE)) {
      if (!gl.getParameter(this.timer.GPU_DISJOINT_EXT)) { const ms = gl.getQueryParameter(this.pending, gl.QUERY_RESULT) / 1e6; this.gpuMs = this.gpuMs ? this.gpuMs * 0.8 + ms * 0.2 : ms; this.adapt(); }
      gl.deleteQuery(this.pending); this.pending = null;
    }
    this.frame++;
  }
  /** Hold about 11 ms of graphics-card time a frame by changing how many pixels are ray-marched, then how many steps. */
  private since = 0;
  private adapt() {
    if (++this.since < 12) return;
    const ms = this.gpuMs;
    if (ms > 12.5) { if (this.scale > 0.28) this.scale = Math.max(0.28, this.scale * Math.max(0.7, Math.sqrt(11 / ms))); else this.quality = Math.max(0, this.quality - 0.25); this.since = 0; this.gpuMs = 0; }
    else if (ms < 7.5) { if (this.quality < 1) this.quality = Math.min(1, this.quality + 0.25); else if (this.scale < 1) this.scale = Math.min(1, this.scale * 1.08); this.since = 0; this.gpuMs = 0; }
  }
  /** Start the history again: after a cut, so nothing of the last shot ghosts into the next. */
  cut() { this.reset = true; }
}

let engine: Engine | undefined;
/** One engine for the whole visit: the shaders and the noise are built the first time a 3D level starts. */
export function getEngine() { if (!engine || engine.lost) engine = new Engine(); return engine; }
