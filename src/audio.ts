// All sound is synthesised with the Web Audio API: no audio files, nothing to license.
// Three parts: one-shot effects (`snd`), continuous loops (`loop`) and a small step sequencer (`music`).
// The sequencer plays the default score (SONGS, below) or one of the alternative soundtracks in soundtracks.ts.
import { SOUNDTRACKS } from './soundtracks';

const PREF = 'carbon-to-orbit-audio';
let ctx: AudioContext | undefined;
let master: GainNode, out: DynamicsCompressorNode, musicBus: GainNode, sfxBus: GainNode, noiseBuf: AudioBuffer;
let recDest: MediaStreamAudioDestinationNode | undefined;
let isMuted = false;
try { isMuted = localStorage.getItem(PREF) === 'off'; } catch { /* default on */ }
const LEVEL = 0.85;

function ac(): AudioContext {
  if (ctx) return ctx;
  ctx = new AudioContext();
  // iOS treats Web Audio as "ambient" sound, which the ring/silent switch on the side of the phone mutes. A game's
  // music is "playback": it plays whatever the switch says, and the 🔊 button is how a player silences it. (Safari 16.4+.)
  try { const s = (navigator as { audioSession?: { type: string } }).audioSession; if (s) s.type = 'playback'; } catch { /* older browsers: the switch decides */ }
  wire(ctx, isMuted ? 0 : LEVEL);
  return ctx;
}
/** Build the mixer on a context: music and effects buses into the master gain, then a compressor. */
function wire(c: BaseAudioContext, level: number) {
  master = c.createGain(); master.gain.value = level;
  out = c.createDynamicsCompressor(); out.threshold.value = -16; out.ratio.value = 5; out.attack.value = 0.004; out.release.value = 0.2;
  master.connect(out).connect(c.destination);
  musicBus = c.createGain(); musicBus.gain.value = 0.62; musicBus.connect(master);
  sfxBus = c.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
  noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
/**
 * Browsers only start audio after a user gesture; call this from every key press, click and tap (it is cheap once the
 * sound is running). Not only "suspended": iOS puts the context in "interrupted" after a phone call or a trip to
 * another app, and it stays silent until the next gesture resumes it.
 */
export function unlock() { const c = ac(); if (c.state !== 'running') c.resume().catch(() => { /* not a gesture the browser accepts; the next one will be */ }); }
/** Back from another tab or app: start the sound again where the browser allows it without a tap. */
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (ctx && !document.hidden && ctx.state !== 'running') ctx.resume().catch(() => { /* the next tap resumes it */ }); });
export const muted = () => isMuted;
export function setMuted(m: boolean) {
  isMuted = m; const c = ac(); master.gain.setTargetAtTime(m ? 0 : LEVEL, c.currentTime, 0.03);
  try { localStorage.setItem(PREF, m ? 'off' : 'on'); } catch { /* private mode */ }
  const b = document.getElementById('mute'); if (b) b.textContent = m ? '🔇' : '🔊';
}
/** Audio stream for the dev gameplay recorder: the whole mix, or only the sound effects (for footage that gets its own music). */
export function recStream(sfxOnly = false) {
  const c = ac();
  if (!recDest) { recDest = c.createMediaStreamDestination(); if (sfxOnly) { const g = c.createGain(); g.gain.value = 0.7; sfxBus.connect(g).connect(recDest); } else out.connect(recDest); }
  return recDest.stream;
}
/** For a level that brings its own score (gfx3d/score.ts): the context and the music bus, so mute and the mix still apply. */
export function musicOut() { const c = ac(); return { ctx: c, bus: musicBus as AudioNode }; }
/** For tests: the context state and how many loops are running. */
export const audioState = () => ({ state: ctx?.state, muted: isMuted, song: playing?.name, loops: loops.size });

// ---------------------------------------------------------------- primitives
interface ToneOpt { f: number; to?: number; dur: number; type?: OscillatorType; vol?: number; at?: number; a?: number; bus?: AudioNode; vib?: number; lp?: number }
function tone(o: ToneOpt) {
  const c = ac(), t = c.currentTime + (o.at || 0), a = o.a ?? 0.005;
  const osc = c.createOscillator(), g = c.createGain();
  osc.type = o.type || 'triangle'; osc.frequency.setValueAtTime(o.f, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + o.dur);
  if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.value = o.f * o.vib; l.connect(lg).connect(osc.frequency); l.start(t + 0.08); l.stop(t + o.dur + 0.1); }
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol ?? 0.15, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  let node: AudioNode = osc;
  if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; node.connect(f); node = f; }
  node.connect(g).connect(o.bus || sfxBus);
  osc.start(t); osc.stop(t + o.dur + 0.05);
}
interface NoiseOpt { dur: number; vol?: number; type?: BiquadFilterType; f?: number; to?: number; q?: number; at?: number; a?: number; bus?: AudioNode }
function noise(o: NoiseOpt) {
  const c = ac(), t = c.currentTime + (o.at || 0), a = o.a ?? 0.005;
  const src = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noiseBuf; src.loop = true;
  flt.type = o.type || 'lowpass'; flt.frequency.setValueAtTime(o.f || 1000, t); flt.Q.value = o.q ?? 0.7;
  if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol ?? 0.2, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(flt).connect(g).connect(o.bus || sfxBus);
  src.start(t, Math.random()); src.stop(t + o.dur + 0.05);
}
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Kept for older call sites: a plain beep with an optional pitch slide in Hz. */
export function beep(freq = 440, dur = 0.08, type: OscillatorType = 'square', vol = 0.04, slide = 0) {
  tone({ f: freq, to: slide ? Math.max(30, freq + slide) : undefined, dur, type, vol: vol * 2.2, lp: type === 'square' || type === 'sawtooth' ? 2600 : undefined });
}

// ---------------------------------------------------------------- named effects
export const snd = {
  // interface
  move: () => tone({ f: 620, to: 780, dur: 0.06, vol: 0.1 }),
  select: () => { tone({ f: 660, dur: 0.07, vol: 0.12 }); tone({ f: 990, dur: 0.12, vol: 0.12, at: 0.06 }); },
  deny: () => { tone({ f: 150, dur: 0.14, type: 'sawtooth', vol: 0.12, lp: 900 }); tone({ f: 112, dur: 0.18, type: 'sawtooth', vol: 0.12, lp: 900, at: 0.1 }); },
  step: () => noise({ dur: 0.05, vol: 0.07, type: 'bandpass', f: 500, q: 1.5 }),
  // platform levels
  jump: () => tone({ f: 300, to: 620, dur: 0.14, type: 'sine', vol: 0.16 }),
  land: () => noise({ dur: 0.07, vol: 0.09, f: 320 }),
  pickup: () => { tone({ f: 880, dur: 0.08, vol: 0.14 }); tone({ f: 1320, dur: 0.16, vol: 0.14, at: 0.07 }); tone({ f: 2640, dur: 0.2, type: 'sine', vol: 0.04, at: 0.07 }); },
  egg: () => [1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone({ f, dur: 0.5, type: 'sine', vol: 0.11, at: i * 0.07 })),
  hurt: () => { tone({ f: 320, to: 90, dur: 0.3, type: 'sawtooth', vol: 0.16, lp: 1400 }); noise({ dur: 0.25, vol: 0.14, type: 'highpass', f: 2500 }); },
  splash: () => { noise({ dur: 0.5, vol: 0.3, type: 'bandpass', f: 1800, to: 300, q: 0.6 }); tone({ f: 160, to: 60, dur: 0.3, type: 'sine', vol: 0.2 }); },
  baa: () => { // a sheep: a nasal, wobbling tone
    const c = ac(), t = c.currentTime, osc = c.createOscillator(), wob = c.createOscillator(), wg = c.createGain(), bp = c.createBiquadFilter(), g = c.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(430, t); osc.frequency.linearRampToValueAtTime(360, t + 0.5);
    wob.frequency.value = 11; wg.gain.value = 26; wob.connect(wg).connect(osc.frequency);
    bp.type = 'bandpass'; bp.frequency.value = 1150; bp.Q.value = 2.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.3, t + 0.05); g.gain.setValueAtTime(0.3, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    osc.connect(bp).connect(g).connect(sfxBus); osc.start(t); wob.start(t); osc.stop(t + 0.6); wob.stop(t + 0.6);
  },
  stomp: () => { tone({ f: 420, to: 120, dur: 0.16, type: 'triangle', vol: 0.22 }); noise({ dur: 0.1, vol: 0.2, f: 900 }); tone({ f: 900, to: 1500, dur: 0.1, type: 'sine', vol: 0.08, at: 0.05 }); },
  squawk: () => { tone({ f: 1250, to: 820, dur: 0.16, type: 'sawtooth', vol: 0.09, lp: 3200 }); tone({ f: 1150, to: 760, dur: 0.18, type: 'sawtooth', vol: 0.09, lp: 3200, at: 0.2 }); },
  snort: () => { noise({ dur: 0.22, vol: 0.22, type: 'bandpass', f: 380, q: 1.4 }); tone({ f: 150, to: 95, dur: 0.22, type: 'sawtooth', vol: 0.1, lp: 600 }); },
  sizzle: () => noise({ dur: 0.12, vol: 0.07, type: 'highpass', f: 5000 }),
  power: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, dur: 0.14, vol: 0.14, at: i * 0.055 })),
  powerEnd: () => { tone({ f: 660, to: 330, dur: 0.25, vol: 0.12 }); },
  secret: () => { [784, 988, 1175, 1568, 1976, 2349].forEach((f, i) => tone({ f, dur: 0.6, type: 'sine', vol: 0.12, at: i * 0.09 })); tone({ f: 196, dur: 1.2, vol: 0.16, at: 0.5 }); },
  crash: () => { noise({ dur: 0.7, vol: 0.5, f: 1800, to: 200 }); tone({ f: 200, to: 60, dur: 0.5, type: 'sawtooth', vol: 0.2, lp: 900 }); },
  bikeGo: () => { noise({ dur: 1.3, vol: 0.35, type: 'bandpass', f: 600, to: 3200, q: 0.8, a: 0.05 }); tone({ f: 90, to: 380, dur: 1.2, type: 'sawtooth', vol: 0.12, lp: 1200 }); },
  // launch control
  count: () => tone({ f: 880, dur: 0.12, type: 'sine', vol: 0.16 }),
  ignition: () => { noise({ dur: 1.1, vol: 0.4, f: 220, to: 900, a: 0.08 }); tone({ f: 46, dur: 1.0, type: 'sine', vol: 0.35, a: 0.05 }); },
  liftoff: () => { tone({ f: 1320, dur: 0.5, type: 'sine', vol: 0.14 }); noise({ dur: 1.6, vol: 0.4, f: 500, to: 160, a: 0.02 }); },
  abort: () => [0, 0.32, 0.64].forEach((at) => { tone({ f: 370, dur: 0.24, type: 'sawtooth', vol: 0.14, lp: 1500, at }); tone({ f: 277, dur: 0.24, type: 'sawtooth', vol: 0.1, lp: 1500, at }); }),
  alarm: () => { tone({ f: 990, dur: 0.09, type: 'square', vol: 0.07, lp: 3000 }); tone({ f: 740, dur: 0.09, type: 'square', vol: 0.07, lp: 3000, at: 0.11 }); },
  cutoff: () => { tone({ f: 120, to: 40, dur: 0.35, type: 'sine', vol: 0.3 }); noise({ dur: 0.3, vol: 0.12, f: 700, to: 120 }); },
  stage: () => { noise({ dur: 0.09, vol: 0.4, f: 1800 }); tone({ f: 95, to: 50, dur: 0.25, type: 'sine', vol: 0.4 }); noise({ dur: 0.7, vol: 0.12, type: 'highpass', f: 4000, at: 0.08 }); },
  fairing: () => { noise({ dur: 0.06, vol: 0.3, type: 'bandpass', f: 2400 }); noise({ dur: 0.06, vol: 0.3, type: 'bandpass', f: 2000, at: 0.09 }); tone({ f: 1500, to: 700, dur: 0.25, type: 'sine', vol: 0.06, at: 0.02 }); },
  shutter: () => { noise({ dur: 0.03, vol: 0.32, type: 'bandpass', f: 3400, q: 1.5 }); noise({ dur: 0.05, vol: 0.22, type: 'bandpass', f: 2200, q: 1.5, at: 0.06 }); tone({ f: 2200, to: 4200, dur: 0.5, type: 'sine', vol: 0.035, at: 0.12 }); }, // a camera: shutter, then the flash recharging
  door: (open: boolean) => { tone({ f: open ? 1320 : 520, dur: 0.08, type: 'sine', vol: 0.06 }); noise({ dur: 0.22, vol: 0.08, type: 'bandpass', f: open ? 900 : 600, to: open ? 1500 : 380, q: 0.8, at: 0.04 }); }, // a badge beep, and the door sliding
  ring: () => { for (let i = 0; i < 6; i++) tone({ f: i % 2 ? 2350 : 2500, dur: 0.035, type: 'square', vol: 0.025, lp: 4200, at: i * 0.045 }); }, // a wind-up alarm clock
  hoot: () => { tone({ f: 520, to: 470, dur: 0.22, type: 'sine', vol: 0.07 }); tone({ f: 440, to: 400, dur: 0.3, type: 'sine', vol: 0.07, at: 0.3 }); }, // more-pork
  click: () => { noise({ dur: 0.04, vol: 0.25, type: 'bandpass', f: 3000, q: 2 }); noise({ dur: 0.04, vol: 0.25, type: 'bandpass', f: 2600, q: 2, at: 0.1 }); },
  seco: () => { tone({ f: 100, to: 45, dur: 0.3, type: 'sine', vol: 0.25 }); tone({ f: 784, dur: 0.5, type: 'sine', vol: 0.1, at: 0.15 }); tone({ f: 1175, dur: 0.7, type: 'sine', vol: 0.08, at: 0.3 }); },
  staticBurst: () => noise({ dur: 0.07, vol: 0.2, type: 'bandpass', f: 600 + Math.random() * 5000, q: 1.2 }),
  boom: () => { noise({ dur: 1.6, vol: 0.7, f: 2400, to: 90, a: 0.004 }); tone({ f: 140, to: 28, dur: 1.2, type: 'sine', vol: 0.6 }); noise({ dur: 0.5, vol: 0.3, type: 'highpass', f: 3000, at: 0.02 }); },
  far: () => { noise({ dur: 2.6, vol: 0.34, f: 380, to: 60, a: 0.06 }); tone({ f: 62, to: 26, dur: 2.2, type: 'sine', vol: 0.42, a: 0.04 }); noise({ dur: 1.2, vol: 0.08, type: 'bandpass', f: 900, to: 300, q: 0.6, at: 0.3 }); }, // an explosion a long way off: all rumble, no crack
  burn: (q = 1) => { noise({ dur: 0.5, vol: 0.28, type: 'bandpass', f: 500 + q * 500, to: 220, q: 0.7, a: 0.02 }); tone({ f: 70 + q * 40, to: 45, dur: 0.45, type: 'sine', vol: 0.28 }); tone({ f: 520 + q * 520, dur: 0.35, type: 'sine', vol: 0.07, at: 0.05 }); },
  dud: () => { tone({ f: 130, to: 70, dur: 0.2, type: 'sawtooth', vol: 0.14, lp: 700 }); },
  // mini-games
  clank: () => { [1740, 2310, 3120].forEach((f) => tone({ f, dur: 0.5, type: 'sine', vol: 0.07 })); noise({ dur: 0.05, vol: 0.3, type: 'highpass', f: 3500 }); tone({ f: 190, to: 110, dur: 0.2, type: 'triangle', vol: 0.2 }); },
  powerdown: () => { tone({ f: 620, to: 60, dur: 1.1, type: 'sawtooth', vol: 0.14, lp: 1500 }); },
  tick: () => tone({ f: 1400, dur: 0.05, type: 'sine', vol: 0.08 }),
  // results
  win: () => {
    [72, 76, 79, 84].forEach((m, i) => tone({ f: hz(m), dur: 0.22, vol: 0.16, at: i * 0.1, bus: musicBus }));
    [72, 76, 79, 84, 88].forEach((m) => tone({ f: hz(m), dur: 1.3, type: 'sine', vol: 0.1, at: 0.42, bus: musicBus, a: 0.02 }));
    tone({ f: hz(48), dur: 1.3, vol: 0.2, at: 0.42, bus: musicBus });
  },
  lose: () => { [64, 63, 60, 55].forEach((m, i) => tone({ f: hz(m), dur: 0.5, vol: 0.15, at: i * 0.22, bus: musicBus, vib: 0.006 })); tone({ f: hz(31), dur: 1.4, type: 'sine', vol: 0.25, at: 0.66, bus: musicBus }); },
};

// ---------------------------------------------------------------- continuous loops
export interface Loop { set(level: number, tone?: number): void; stop(): void }
type LoopKind = 'rumble' | 'rotor' | 'sea' | 'hiss' | 'whine';
const loops = new Set<Loop>();
export function loop(kind: LoopKind): Loop {
  const c = ac(), t = c.currentTime, g = c.createGain(); g.gain.value = 0; g.connect(sfxBus);
  const nodes: (AudioScheduledSourceNode)[] = [];
  const src = () => { const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t, Math.random()); nodes.push(s); return s; };
  const osc = (type: OscillatorType, f: number) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.start(t); nodes.push(o); return o; };
  let tune: (x: number) => void = () => {}, peak = 0.5;
  if (kind === 'rumble') { // rocket engine: low roar plus crackle
    const lp = c.createBiquadFilter(), lp2 = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp2.type = 'lowpass'; lp2.frequency.value = 700; src().connect(lp).connect(lp2).connect(g);
    const bp = c.createBiquadFilter(), cg = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.2; cg.gain.value = 0.08; src().connect(bp).connect(cg).connect(g);
    const sub = osc('sine', 48), sg = c.createGain(); sg.gain.value = 0.5; sub.connect(sg).connect(g);
    tune = (x) => { lp.frequency.setTargetAtTime(120 + 300 * x, c.currentTime, 0.1); cg.gain.setTargetAtTime(0.02 + 0.09 * x, c.currentTime, 0.1); }; peak = 0.6;
  } else if (kind === 'rotor') { // helicopter: chopped low noise
    const lp = c.createBiquadFilter(), chop = c.createGain(), lfo = osc('sawtooth', 21), lg = c.createGain(); lp.type = 'lowpass'; lp.frequency.value = 520;
    chop.gain.value = 0.55; lg.gain.value = 0.45; lfo.connect(lg).connect(chop.gain); src().connect(lp).connect(chop).connect(g);
    const hum = osc('sawtooth', 63), hf = c.createBiquadFilter(), hg = c.createGain(); hf.type = 'lowpass'; hf.frequency.value = 240; hg.gain.value = 0.25; hum.connect(hf).connect(hg).connect(g);
    tune = (x) => lfo.frequency.setTargetAtTime(19 + 5 * x, c.currentTime, 0.2); peak = 0.28;
  } else if (kind === 'sea') { // waves: slow swell of filtered noise
    const lp = c.createBiquadFilter(), sw = c.createGain(), lfo = osc('sine', 0.13), lg = c.createGain(); lp.type = 'lowpass'; lp.frequency.value = 650;
    sw.gain.value = 0.6; lg.gain.value = 0.4; lfo.connect(lg).connect(sw.gain); src().connect(lp).connect(sw).connect(g); peak = 0.11;
  } else if (kind === 'hiss') { // steam
    const hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 5200; hp.Q.value = 0.9; src().connect(hp).connect(g); peak = 0.05;
  } else { // whine: electric pump motor
    const o = osc('sawtooth', 300), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 3; o.connect(bp).connect(g);
    tune = (x) => { o.frequency.setTargetAtTime(160 + 900 * x, c.currentTime, 0.06); bp.frequency.setTargetAtTime(500 + 1800 * x, c.currentTime, 0.06); }; peak = 0.12;
  }
  const me: Loop = {
    set(level, tn) { g.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * peak, c.currentTime, 0.08); if (tn !== undefined) tune(tn); },
    stop() { if (!loops.delete(me)) return; g.gain.setTargetAtTime(0, c.currentTime, 0.05); nodes.forEach((n) => n.stop(c.currentTime + 0.4)); },
  };
  loops.add(me);
  return me;
}
export function stopLoops() { [...loops].forEach((l) => l.stop()); }

// ---------------------------------------------------------------- music
type Note = [step: number, midi: number, len: number];
interface Song {
  name: string; bpm: number;
  chords: number[][]; // per bar: [root (bass octave), ...intervals]
  bass: (number | null)[]; // 16 steps: semitones above the root
  arp?: (number | null)[]; // 16 steps: index into the chord tones
  drums?: { k: string; s: string; h: string };
  lead?: Note[][]; // per bar
  bell?: boolean; // play the lead as bells
  layers?: Partial<Record<'drums' | 'arp' | 'lead', number>>; // minimum intensity for a layer to sound
  pad?: number;
}
const _ = null;
const SONGS: Record<string, Song> = {
  // World map: bright, adventurous, C major
  map: {
    name: 'map', bpm: 108, pad: 1,
    chords: [[48, 4, 7], [43, 4, 7], [45, 3, 7], [41, 4, 7], [48, 4, 7], [43, 4, 7], [41, 4, 7], [43, 4, 7]],
    bass: [0, _, _, _, 0, _, 7, _, 0, _, _, _, 12, _, 7, _],
    arp: [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 2, 3],
    drums: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xx' },
    lead: [
      [[0, 76, 4], [4, 79, 4], [8, 84, 6], [14, 79, 2]], [[0, 83, 6], [6, 81, 2], [8, 79, 8]],
      [[0, 81, 4], [4, 84, 4], [8, 88, 6], [14, 84, 2]], [[0, 81, 6], [6, 79, 2], [8, 77, 8]],
      [[0, 76, 4], [4, 79, 4], [8, 84, 4], [12, 88, 4]], [[0, 86, 6], [6, 83, 2], [8, 79, 8]],
      [[0, 81, 4], [4, 84, 4], [8, 89, 4], [12, 88, 4]], [[0, 86, 8], [8, 79, 4], [12, 83, 4]],
    ],
  },
  // 1990s workshop: after-hours tinkering, A minor, a bit funky
  workshop: {
    name: 'workshop', bpm: 118, pad: 0.7,
    chords: [[45, 3, 7], [45, 3, 7], [41, 4, 7], [43, 4, 7], [45, 3, 7], [45, 3, 7], [41, 4, 7], [40, 4, 7]],
    bass: [0, _, 0, _, _, 12, _, 0, _, 0, 7, _, 10, _, 12, _],
    arp: [_, _, 2, _, 3, _, 2, _, _, 1, _, 2, _, 3, _, 2],
    drums: { k: 'x..x......x.x...', s: '....x.......x..x', h: 'x.xxx.xxx.xxx.xx' },
    lead: [
      [[0, 69, 2], [2, 72, 2], [4, 76, 4], [8, 74, 2], [10, 72, 2], [12, 69, 4]], [[4, 72, 2], [6, 74, 2], [8, 76, 6]],
      [[0, 77, 4], [4, 76, 2], [6, 72, 2], [8, 69, 8]], [[0, 67, 2], [2, 71, 2], [4, 74, 4], [8, 71, 8]],
      [[0, 69, 2], [2, 72, 2], [4, 76, 4], [8, 74, 2], [10, 72, 2], [12, 69, 4]], [[0, 76, 2], [2, 79, 2], [4, 81, 6], [10, 79, 2], [12, 76, 4]],
      [[0, 77, 4], [4, 81, 4], [8, 84, 8]], [[0, 83, 4], [4, 80, 4], [8, 76, 8]],
    ],
  },
  // Māhia: open air, pastoral, G major
  mahia: {
    name: 'mahia', bpm: 112, pad: 1,
    chords: [[43, 4, 7], [38, 4, 7], [40, 3, 7], [36, 4, 7], [43, 4, 7], [38, 4, 7], [36, 4, 7], [38, 4, 7]],
    bass: [0, _, _, 0, _, _, 7, _, 0, _, _, 0, _, _, 7, _],
    arp: [0, _, 2, _, 3, _, 2, _, 1, _, 2, _, 3, _, 2, _],
    drums: { k: 'x.....x.x.......', s: '....x.......x...', h: '..x...x...x...x.' },
    lead: [
      [[0, 71, 4], [4, 74, 4], [8, 79, 8]], [[0, 78, 4], [4, 76, 4], [8, 74, 8]],
      [[0, 76, 4], [4, 79, 4], [8, 83, 6], [14, 81, 2]], [[0, 79, 8], [8, 76, 8]],
      [[0, 71, 4], [4, 74, 4], [8, 79, 4], [12, 83, 4]], [[0, 81, 6], [6, 78, 2], [8, 74, 8]],
      [[0, 76, 4], [4, 79, 4], [8, 84, 4], [12, 83, 4]], [[0, 81, 12], [12, 74, 4]],
    ],
  },
  // The Auckland factory: bright and mechanical, F major, a steady machine pulse
  factory: {
    name: 'factory', bpm: 122, pad: 0.8,
    chords: [[41, 4, 7], [45, 3, 7], [46, 4, 7], [48, 4, 7], [41, 4, 7], [45, 3, 7], [46, 4, 7], [43, 3, 7]],
    bass: [0, _, 12, _, 0, _, 12, _, 0, _, 12, _, 7, _, 12, _],
    arp: [0, 2, 1, 2, 0, 2, 1, 3, 0, 2, 1, 2, 0, 3, 1, 2],
    drums: { k: 'x...x...x...x...', s: '....x.......x.x.', h: 'xxx.xxx.xxx.xxx.' },
    lead: [
      [[0, 77, 2], [2, 81, 2], [4, 84, 4], [8, 81, 2], [10, 84, 2], [12, 89, 4]], [[0, 88, 4], [4, 84, 4], [8, 81, 8]],
      [[0, 82, 2], [2, 86, 2], [4, 89, 4], [8, 86, 4], [12, 82, 4]], [[0, 84, 6], [6, 88, 2], [8, 91, 8]],
      [[0, 77, 2], [2, 81, 2], [4, 84, 4], [8, 89, 4], [12, 93, 4]], [[0, 91, 4], [4, 88, 4], [8, 84, 8]],
      [[0, 89, 4], [4, 86, 4], [8, 82, 4], [12, 86, 4]], [[0, 86, 8], [8, 82, 4], [12, 79, 4]],
    ],
  },
  // A beach party: four on the floor in C major, an octave-hopping bass and a tune to whistle
  party: {
    name: 'party', bpm: 124, pad: 0.6,
    chords: [[48, 4, 7], [45, 3, 7], [41, 4, 7], [43, 4, 7], [48, 4, 7], [45, 3, 7], [41, 4, 7], [43, 4, 7]],
    bass: [0, _, 12, _, 0, _, 12, 7, 0, _, 12, _, 0, 7, 12, 7],
    arp: [_, 1, 2, _, 1, 2, _, 1, 2, _, 1, 2, 3, 2, 1, _],
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...xx' },
    lead: [
      [[0, 76, 2], [2, 79, 2], [4, 84, 3], [8, 81, 2], [10, 79, 2], [12, 76, 4]], [[0, 81, 3], [4, 84, 2], [6, 81, 2], [8, 79, 4], [12, 76, 2], [14, 79, 2]],
      [[0, 77, 2], [2, 81, 2], [4, 84, 4], [8, 81, 2], [10, 77, 2], [12, 81, 4]], [[0, 79, 3], [4, 83, 2], [6, 86, 2], [8, 83, 4], [12, 79, 4]],
      [[0, 84, 2], [2, 88, 2], [4, 84, 2], [6, 79, 2], [8, 84, 4], [12, 88, 4]], [[0, 88, 3], [4, 84, 2], [6, 81, 2], [8, 84, 6], [14, 81, 2]],
      [[0, 81, 2], [2, 84, 2], [4, 89, 4], [8, 88, 2], [10, 84, 2], [12, 81, 4]], [[0, 86, 4], [4, 83, 4], [8, 79, 2], [10, 83, 2], [12, 86, 4]],
    ],
  },
  // Stennis to Wallops: a slow shuffle in E, for the Gulf coast and the long wait
  delta: {
    name: 'delta', bpm: 96, pad: 1,
    chords: [[40, 4, 7, 10], [40, 4, 7, 10], [45, 4, 7, 10], [40, 4, 7, 10], [47, 4, 7, 10], [45, 4, 7, 10], [40, 4, 7, 10], [47, 4, 7, 10]],
    bass: [0, _, _, 0, 4, _, _, 4, 7, _, _, 7, 9, _, 7, _],
    arp: [_, _, 2, _, _, _, 3, _, _, _, 2, _, _, 1, _, _],
    drums: { k: 'x.....x.x.......', s: '....x.......x...', h: 'x..xx..xx..xx..x' },
    lead: [
      [[0, 76, 3], [3, 79, 3], [6, 80, 2], [8, 83, 8]], [[0, 86, 3], [3, 83, 3], [6, 79, 2], [8, 76, 8]],
      [[0, 81, 3], [3, 84, 3], [6, 85, 2], [8, 88, 8]], [[0, 83, 3], [3, 79, 3], [6, 76, 10]],
      [[0, 83, 3], [3, 86, 3], [6, 87, 2], [8, 90, 8]], [[0, 88, 3], [3, 85, 3], [6, 81, 10]],
      [[0, 76, 3], [3, 79, 3], [6, 80, 2], [8, 83, 4], [12, 79, 4]], [[0, 78, 6], [6, 75, 2], [8, 71, 8]],
    ],
  },
  // Launch: D minor pulse that builds with intensity (0 countdown, 1 ascent, 2 stage two)
  launch: {
    name: 'launch', bpm: 128, pad: 1, layers: { drums: 1, arp: 1, lead: 2 },
    chords: [[38, 3, 7], [38, 3, 7], [34, 4, 7], [36, 4, 7]],
    bass: [0, _, 0, 0, _, 0, 0, _, 0, _, 0, 0, _, 0, 12, _],
    arp: [0, 2, 3, 2, 1, 2, 3, 2, 0, 2, 3, 2, 1, 2, 3, 2],
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.' },
    lead: [[[0, 74, 2], [4, 77, 2], [8, 81, 6]], [[0, 79, 2], [4, 77, 2], [8, 74, 8]], [[0, 74, 2], [4, 77, 2], [8, 82, 6]], [[0, 81, 4], [4, 79, 4], [8, 76, 8]]],
  },
  // Helicopter catch: fast, E minor
  heli: {
    name: 'heli', bpm: 138, pad: 0.8,
    chords: [[40, 3, 7], [36, 4, 7], [43, 4, 7], [38, 4, 7]],
    bass: [0, 0, _, 0, 0, _, 0, _, 0, 0, _, 0, 7, _, 12, _],
    arp: [0, 2, 1, 2, 3, 2, 1, 2, 0, 2, 1, 2, 3, 2, 1, 2],
    drums: { k: 'x.....x.x.....x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    lead: [[[0, 76, 2], [2, 79, 2], [4, 83, 4], [8, 79, 2], [10, 76, 2], [12, 71, 4]], [[0, 72, 2], [2, 76, 2], [4, 79, 4], [8, 76, 8]], [[0, 74, 2], [2, 79, 2], [4, 83, 4], [8, 86, 8]], [[0, 81, 4], [4, 78, 4], [8, 74, 8]]],
  },
  // Space: slow and still, for the Moon and for orbit
  space: {
    name: 'space', bpm: 76, pad: 1.7, bell: true,
    chords: [[48, 4, 7, 11], [45, 3, 7, 10], [41, 4, 7, 11], [43, 4, 7, 9]],
    bass: [0, _, _, _, _, _, _, _, _, _, _, _, 7, _, _, _],
    arp: [_, _, _, _, 2, _, _, _, _, _, 3, _, _, _, 1, _],
    lead: [[[0, 79, 8], [8, 88, 8]], [[4, 84, 10]], [[0, 81, 8], [8, 88, 8]], [[4, 86, 12]]],
  },
};
/** A song that has been set up to play: the default score's, or the current soundtrack's tune of the same name. */
interface Cued { name: string; bpm: number; steps: number; play(step: number, t: number, spb: number): void }
let playing: Cued | undefined, step = 0, nextT = 0, timer: number | undefined, intensity = 2, songGain: GainNode | undefined;

// The soundtrack: the default score, or one of the alternatives. The choice is remembered.
const TRACK_PREF = 'carbon-to-orbit-soundtrack';
const ORIGINAL = { id: 'original', name: 'Original', style: 'the first score' };
let trackId = ORIGINAL.id;
try { const s = localStorage.getItem(TRACK_PREF); if (SOUNDTRACKS.some((x) => x.id === s)) trackId = s!; } catch { /* default score */ }
export const soundtracks = () => [ORIGINAL, ...SOUNDTRACKS].map(({ id, name, style }) => ({ id, name, style }));
export const soundtrack = () => soundtracks().find((s) => s.id === trackId)!;
/** Change soundtrack. Whatever is playing starts again in the new one. */
export function setSoundtrack(id: string) {
  if (!soundtracks().some((s) => s.id === id)) return soundtrack();
  trackId = id;
  try { localStorage.setItem(TRACK_PREF, id); } catch { /* private mode */ }
  if (playing) { const name = playing.name, level = intensity; music.stop(0.2); music.play(name, level); }
  return soundtrack();
}
export function nextSoundtrack() { const all = soundtracks(); return setSoundtrack(all[(all.findIndex((s) => s.id === trackId) + 1) % all.length].id); }
/** A song's tune in an alternative soundtrack, if that soundtrack is known and has one. */
function tuneOf(name: string, track: string) { const alt = SOUNDTRACKS.find((s) => s.id === track), tune = alt?.tunes[name]; return alt && tune ? { alt, tune } : undefined; }
/** Set a song up to play into `dest`. A soundtrack with no tune of that name falls back to the default score, so no level is ever silent. */
function cue(name: string, c: BaseAudioContext, dest: AudioNode, track = trackId): Cued | undefined {
  const t = tuneOf(name, track);
  if (t) {
    const { alt, tune } = t, n = tune.steps ?? 16, trim = c.createGain(); trim.gain.value = alt.gain * (tune.vol ?? 1); trim.connect(dest);
    const kit = { c, noise: noiseBuf, ...(alt.fx ? alt.fx(c, trim, tune, noiseBuf) : { dry: trim, wet: trim }) };
    return { name, bpm: tune.bpm, steps: n, play: (st, at, spb) => alt.step(kit, tune, Math.floor(st / n) % tune.chords.length, st % n, at, spb, intensity) };
  }
  const song = SONGS[name];
  return song && { name, bpm: song.bpm, steps: 16, play: (st, at, spb) => classicStep(song, st, at, spb, dest) };
}

function voicePad(f: number, t: number, dur: number, vol: number, bus: AudioNode) {
  const c = ac(), lp = c.createBiquadFilter(), g = c.createGain(); lp.type = 'lowpass'; lp.frequency.value = 1100;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.25); g.gain.setValueAtTime(vol, t + dur - 0.1); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.3);
  for (const det of [-7, 7]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.35); }
  lp.connect(g).connect(bus);
}
function voice(type: OscillatorType, f: number, t: number, dur: number, vol: number, bus: AudioNode, lpf?: number, vib = 0) {
  const c = ac(), o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
  if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.value = f * vib; l.connect(lg).connect(o.frequency); l.start(t + 0.12); l.stop(t + dur + 0.1); }
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * 0.5), t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let n: AudioNode = o; if (lpf) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lpf; o.connect(fl); n = fl; }
  n.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
function drum(kind: 'k' | 's' | 'h', t: number, bus: AudioNode) {
  const c = ac();
  if (kind === 'k') { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g).connect(bus); o.start(t); o.stop(t + 0.2); return; }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = noiseBuf; s.loop = true;
  if (kind === 's') { f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8; g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13); }
  else { f.type = 'highpass'; f.frequency.value = 7500; g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04); }
  s.connect(f).connect(g).connect(bus); s.start(t, Math.random()); s.stop(t + 0.2);
}
/** One sixteenth of the default score. */
function classicStep(song: Song, step: number, t: number, spb: number, bus: AudioNode) {
  const bar = Math.floor(step / 16) % song.chords.length, s = step % 16, [root, ...iv] = song.chords[bar];
  const tones = [root + 12, ...iv.map((i) => root + 12 + i), root + 24];
  const on = (layer: 'drums' | 'arp' | 'lead') => intensity >= (song.layers?.[layer] ?? 0);
  if (s === 0) for (const m of [root + 12, ...iv.map((i) => root + 12 + i)]) voicePad(hz(m + 12), t, spb * 16, 0.022 * (song.pad ?? 1), bus);
  const b = song.bass[s]; if (b !== null && b !== undefined) voice('triangle', hz(root + b), t, spb * 2.2, 0.26, bus, 700);
  const a = song.arp?.[s]; if (a !== null && a !== undefined && on('arp')) voice(song.bell ? 'sine' : 'square', hz(tones[a % tones.length] + 12), t, song.bell ? 1.2 : spb * 1.6, song.bell ? 0.05 : 0.045, bus, song.bell ? undefined : 2400);
  if (song.drums && on('drums')) { if (song.drums.k[s] === 'x') drum('k', t, bus); if (song.drums.s[s] === 'x') drum('s', t, bus); if (song.drums.h[s] === 'x') drum('h', t, bus); }
  if (on('lead')) for (const [ls, m, len] of song.lead?.[bar % (song.lead?.length || 1)] || []) if (ls === s) {
    if (song.bell) { voice('sine', hz(m), t, 2.4, 0.11, bus); voice('sine', hz(m) * 2.01, t, 1.2, 0.025, bus); }
    else { voice('triangle', hz(m), t, spb * len * 0.95, 0.15, bus, undefined, 0.004); voice('sine', hz(m) * 2, t, spb * len * 0.6, 0.03, bus); }
  }
}
function schedule() {
  const c = ac(), p = playing;
  if (!p || !songGain) return;
  const spb = 60 / p.bpm / 4; // seconds per 16th
  while (nextT < c.currentTime + 0.18) { p.play(step, nextT, spb); step++; nextT += spb; }
}
export const music = {
  /** Start a song (no-op if it is already playing). */
  play(name: keyof typeof SONGS | string, level = 2) {
    intensity = level;
    if (playing?.name === name) return;
    this.stop(0.25);
    const c = ac(); if (!SONGS[name]) return;
    songGain = c.createGain(); songGain.gain.setValueAtTime(0.0001, c.currentTime); songGain.gain.linearRampToValueAtTime(1, c.currentTime + 0.4); songGain.connect(musicBus);
    playing = cue(name, c, songGain);
    step = 0; nextT = c.currentTime + 0.12;
    timer = window.setInterval(schedule, 40);
  },
  /** 0 = sparse, 1 = with drums, 2 = everything. Only some songs use it. */
  intensity(n: number) { intensity = n; },
  stop(fade = 0.4) {
    if (timer !== undefined) { clearInterval(timer); timer = undefined; }
    if (songGain && ctx) { const g = songGain; g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setTargetAtTime(0, ctx.currentTime, fade / 3); setTimeout(() => g.disconnect(), fade * 1000 + 600); }
    songGain = undefined; playing = undefined;
  },
};

/**
 * Dev tool: render music offline, through the same mixer the game uses, and return it as a WAV file. `plan` lists
 * [song, bars, intensity]; consecutive entries for the same song carry on without a break, a new song follows a short
 * pause. Used to export the soundtrack previews in recordings/ (see `__g2o.renderMusic` in main.ts).
 */
export async function renderMusic(track: string, plan: [song: string, bars: number, level?: number][], tail = 2): Promise<Blob> {
  const SR = 48000, GAP = 0.5, T0 = 0.05;
  const len = (name: string, bars: number) => { const t = tuneOf(name, track)?.tune; return (bars * (t?.steps ?? 16) * 60) / (t?.bpm ?? SONGS[name].bpm) / 4; };
  const total = plan.reduce((sum, [name, bars], i) => sum + len(name, bars) + (i && plan[i - 1][0] !== name ? GAP : 0), T0) + tail;
  const off = new OfflineAudioContext(2, Math.ceil(total * SR), SR);
  const live = { ctx, master, out, musicBus, sfxBus, noiseBuf, intensity };
  ctx = off as unknown as AudioContext; wire(off, LEVEL); // every voice asks ac() for the context, so lend it the offline one while the notes are laid out
  try {
    let t = T0, cur: Cued | undefined, g: GainNode | undefined, st = 0;
    for (const [name, bars, level = 2] of plan) {
      if (cur?.name !== name) {
        if (g) { g.gain.setValueAtTime(1, t); g.gain.linearRampToValueAtTime(0.0001, t + GAP * 0.8); t += GAP; }
        g = off.createGain(); g.gain.setValueAtTime(0.0001, Math.max(0, t - 0.03)); g.gain.linearRampToValueAtTime(1, t); g.connect(musicBus);
        cur = cue(name, off, g, track); st = 0;
        if (!cur) throw new Error('no such song: ' + name);
      }
      intensity = level;
      const spb = 60 / cur.bpm / 4;
      for (let i = 0; i < bars * cur.steps; i++) { cur.play(st++, t, spb); t += spb; }
    }
    if (g) { g.gain.setValueAtTime(1, t); g.gain.linearRampToValueAtTime(0.0001, t + tail * 0.9); }
  } finally { ({ ctx, master, out, musicBus, sfxBus, noiseBuf, intensity } = live); }
  const buf = await off.startRendering(), n = buf.length, ch = [buf.getChannelData(0), buf.getChannelData(1)];
  const view = new DataView(new ArrayBuffer(44 + n * 4)), str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); view.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, SR, true); view.setUint32(28, SR * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) view.setInt16(44 + i * 4 + c * 2, Math.max(-1, Math.min(1, ch[c][i])) * 32767, true);
  return new Blob([view], { type: 'audio/wav' });
}
