// Three alternative soundtracks, each a complete original score for every song the game plays (see SONGS in audio.ts
// for the default one). Like everything else here they are synthesised with Web Audio: a soundtrack is a set of tunes
// (data) plus the instruments that play them (`step`), and optionally an effect such as an echo or a reverb (`fx`).
// To add a soundtrack, add an entry to SOUNDTRACKS with a tune for every song name in SONG_NAMES.

export type Note = [step: number, midi: number, len: number];
type Pat = (number | null)[];
export interface Tune {
  bpm: number;
  steps?: number; // sixteenths per bar: 16 (4/4) unless given, 12 is 3/4
  chords: number[][]; // per bar: [root (bass octave), ...intervals]
  bass: Pat; // per step: semitones above the root
  drive?: Pat; // a busier bass line that takes over from intensity 1
  arp?: Pat; // per step: index into the chord tones
  drums?: { k?: string; s?: string; h?: string }; // kick, snare, hat (each soundtrack has its own kit)
  lead?: Note[][]; // per bar
  layers?: Partial<Record<'drums' | 'arp' | 'lead', number>>; // minimum intensity for a layer to sound
  pad?: number; // pad level, 1 unless given
  vol?: number; // trim for the whole tune, 1 unless given: set so it is as loud as the default score's song of the same name
  arpVoice?: 'strings' | 'mallet' | 'single'; // ambient: bowed or struck instead of plucked; chiptune: one note per step
  leadVoice?: 'horn' | 'bell'; // ambient: instead of the flute
}
/** What an instrument needs: the context, where dry and echoing sounds go, and a noise buffer. */
export interface Kit { c: BaseAudioContext; dry: AudioNode; wet: AudioNode; noise: AudioBuffer }
export interface Soundtrack {
  id: string; name: string; style: string;
  gain: number; // trim so every soundtrack sits at the level of the default score, under the sound effects
  tunes: Record<string, Tune>;
  fx?(c: BaseAudioContext, out: AudioNode, tune: Tune, noise: AudioBuffer): { dry: AudioNode; wet: AudioNode };
  step(k: Kit, tune: Tune, bar: number, s: number, t: number, spb: number, level: number): void;
}
/** Every song name a scene can ask for. A soundtrack must have them all. */
export const SONG_NAMES = ['map', 'workshop', 'mahia', 'factory', 'delta', 'launch', 'heli', 'space'] as const;

const _ = null;
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const on = (tu: Tune, layer: 'drums' | 'arp' | 'lead', level: number) => level >= (tu.layers?.[layer] ?? 0);
const chordTones = (ch: number[]) => { const [root, ...iv] = ch; return [root + 12, ...iv.map((i) => root + 12 + i)]; };

// ---------------------------------------------------------------- shared building blocks
function osc(c: BaseAudioContext, type: OscillatorType | PeriodicWave, f: number, t: number, end: number, detune = 0) {
  const o = c.createOscillator();
  if (type instanceof PeriodicWave) o.setPeriodicWave(type); else o.type = type;
  o.frequency.value = f; o.detune.value = detune; o.start(t); o.stop(end);
  return o;
}
function lowpass(c: BaseAudioContext, f: number, q = 0.7) { const l = c.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = f; l.Q.value = q; return l; }
/** A gain that is shut until its note starts: a source that begins a sample early must not get through at full level. */
function shut(c: BaseAudioContext) { const g = c.createGain(); g.gain.value = 0; return g; }
/** A gain that rises in `a` seconds, falls away to nothing at `t + dur`. */
function pluck(c: BaseAudioContext, t: number, a: number, vol: number, dur: number) {
  const g = shut(c); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  return g;
}
/** A gain that rises in `a` seconds, holds, and lets go over `r` seconds ending at `t + dur`. */
function held(c: BaseAudioContext, t: number, a: number, vol: number, dur: number, r: number) {
  const g = shut(c); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.setValueAtTime(vol, Math.max(t + a, t + dur - r)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  return g;
}
function vibrato(c: BaseAudioContext, o: OscillatorNode, f: number, t: number, end: number, depth: number, rate = 5.5) {
  const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = rate; lg.gain.value = f * depth; l.connect(lg).connect(o.frequency); l.start(t); l.stop(end);
}
function hit(k: Kit, t: number, dur: number, vol: number, type: BiquadFilterType, f: number, q: number, dest: AudioNode, a = 0.002) {
  const { c } = k, s = c.createBufferSource(), fl = c.createBiquadFilter(); s.buffer = k.noise; s.loop = true;
  fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  s.connect(fl).connect(pluck(c, t, a, vol, dur)).connect(dest); s.start(t, (t * 7.13) % 1.5); s.stop(t + dur + 0.05);
}
function thump(k: Kit, t: number, f0: number, f1: number, dur: number, vol: number, dest: AudioNode, type: OscillatorType = 'sine') {
  const { c } = k, o = osc(c, type, f0, t, t + dur + 0.05), g = shut(c);
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
}

// ---------------------------------------------------------------- 1. Night Launch: 1980s synthwave
// Sawtooth pads that duck under a four-on-the-floor kick, a filtered sequencer bass, a gated snare, an echoing lead.
function synthwave(k: Kit, tu: Tune, bar: number, s: number, t: number, spb: number, level: number) {
  const { c } = k, ch = tu.chords[bar], root = ch[0], n = tu.steps ?? 16, tones = [...chordTones(ch), root + 24];
  const drums = tu.drums && on(tu, 'drums', level) ? tu.drums : undefined;
  if (s === 0) { // pad, pumping with the kick when there is one
    const dur = spb * n, v = 0.03 * (tu.pad ?? 1), g = shut(c), lp = lowpass(c, 1250);
    g.gain.setValueAtTime(0.0001, t);
    if (drums?.k) for (let b = 0; b < n; b += 4) {
      const tb = t + b * spb;
      if (b) g.gain.setValueAtTime(v, tb - 0.02);
      g.gain.linearRampToValueAtTime(v * 0.3, tb + (b ? 0 : 0.02)); g.gain.linearRampToValueAtTime(v, tb + spb * 3);
    } else g.gain.linearRampToValueAtTime(v, t + 0.3);
    g.gain.setValueAtTime(v, t + dur - 0.02); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.04);
    for (const m of chordTones(ch)) for (const det of [-9, 9]) osc(c, 'sawtooth', hz(m + 12), t, t + dur + 0.1, det).connect(lp);
    lp.connect(g).connect(k.dry);
  }
  const b = (level >= 1 && tu.drive ? tu.drive : tu.bass)[s];
  if (b !== null && b !== undefined) { // sequencer bass: a saw through a closing filter, over a sine for weight
    const line = level >= 1 && tu.drive ? tu.drive : tu.bass, next = line[(s + 1) % n];
    const f = hz(root + b), dur = spb * (next === null || next === undefined ? 1.9 : 1.05), lp = lowpass(c, 1100, 5), v = drums?.k?.[s] === 'x' ? 0.6 : 1; // make room for the kick
    lp.frequency.setValueAtTime(1100, t); lp.frequency.exponentialRampToValueAtTime(220, t + dur * 0.8);
    osc(c, 'sawtooth', f, t, t + dur + 0.05).connect(lp).connect(pluck(c, t, 0.004, 0.16 * v, dur)).connect(k.dry);
    osc(c, 'sine', f, t, t + dur + 0.05).connect(pluck(c, t, 0.004, 0.11 * v, dur)).connect(k.dry);
  }
  const a = tu.arp?.[s];
  if (a !== null && a !== undefined && on(tu, 'arp', level)) { // plucked saw, into the echo
    const dur = spb * 1.7, lp = lowpass(c, 2600, 2);
    lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(600, t + dur);
    osc(c, 'sawtooth', hz(tones[a % tones.length] + 12), t, t + dur + 0.05).connect(lp).connect(pluck(c, t, 0.003, 0.062, dur)).connect(k.wet);
  }
  if (drums) {
    if (drums.k?.[s] === 'x') { thump(k, t, 165, 42, 0.24, 0.36, k.dry); hit(k, t, 0.02, 0.1, 'highpass', 3000, 0.7, k.dry); }
    if (drums.s?.[s] === 'x') { // gated: a long burst of noise that is cut short
      const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = shut(c); src.buffer = k.noise; src.loop = true; bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.5;
      g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.15); g.gain.linearRampToValueAtTime(0.0001, t + 0.19);
      src.connect(bp).connect(g).connect(k.dry); src.start(t, (t * 3.7) % 1.5); src.stop(t + 0.25);
      thump(k, t, 220, 150, 0.1, 0.16, k.dry, 'triangle');
    }
    if (drums.h?.[s] === 'x') hit(k, t, 0.045, s % 4 === 2 ? 0.04 : 0.025, 'highpass', 8000, 0.7, k.dry);
  }
  if (on(tu, 'lead', level)) for (const [ls, m, len] of tu.lead?.[bar % (tu.lead?.length || 1)] || []) if (ls === s) { // two detuned saws
    const dur = spb * len * 0.94, lp = lowpass(c, 1900, 1), g = held(c, t, 0.02, 0.085, dur, 0.07);
    for (const det of [-11, 11]) { const o = osc(c, 'sawtooth', hz(m), t, t + dur + 0.05, det); if (len >= 4) vibrato(c, o, hz(m), t + 0.2, t + dur + 0.05, 0.004); o.connect(lp); }
    lp.connect(g).connect(k.wet);
  }
}
/** A dotted-eighth echo, darker on every repeat. */
function echo(c: BaseAudioContext, out: AudioNode, tu: Tune) {
  const send = c.createGain(), level = c.createGain(), d = c.createDelay(1.5), fb = c.createGain(), lp = lowpass(c, 2400);
  d.delayTime.value = (60 / tu.bpm / 4) * 3; level.gain.value = 0.3; fb.gain.value = 0.36;
  send.connect(out); send.connect(level).connect(d).connect(lp).connect(out); lp.connect(fb).connect(d);
  return { dry: out, wet: send };
}

// ---------------------------------------------------------------- 2. 8-Bit Electron: chiptune
// Three square-ish voices and a noise channel, in the manner of an early games console: pulse waves, chords played
// as fast arpeggios because there are not enough voices for a chord, a triangle bass, drums made of noise.
const waves = new WeakMap<BaseAudioContext, Record<number, PeriodicWave>>();
function pulse(c: BaseAudioContext, duty: number) {
  let set = waves.get(c); if (!set) waves.set(c, (set = {}));
  if (!set[duty]) {
    const N = 40, re = new Float32Array(N), im = new Float32Array(N);
    for (let i = 1; i < N; i++) re[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    set[duty] = c.createPeriodicWave(re, im);
  }
  return set[duty];
}
/** A note that switches on and off, with no fade to speak of. */
function blip(c: BaseAudioContext, type: OscillatorType | PeriodicWave, f: number, t: number, dur: number, vol: number, dest: AudioNode, decay = 1, vib = 0) {
  const o = osc(c, type, f, t, t + dur + 0.03), g = shut(c);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.linearRampToValueAtTime(vol * decay, t + dur - 0.008); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  if (vib) vibrato(c, o, f, t + 0.16, t + dur + 0.03, vib, 6.5);
  o.connect(g).connect(dest);
}
function chiptune(k: Kit, tu: Tune, bar: number, s: number, t: number, spb: number, level: number) {
  const { c } = k, ch = tu.chords[bar], root = ch[0], tones = chordTones(ch);
  const b = (level >= 1 && tu.drive ? tu.drive : tu.bass)[s], kick = tu.drums && on(tu, 'drums', level) && tu.drums.k?.[s] === 'x' ? 0.07 : 0;
  if (b !== null && b !== undefined) blip(c, 'triangle', hz(root + b + 12), t + kick, spb * 1.7 - kick, 0.19, k.dry); // the bass waits for the kick, as if they shared a channel
  const a = tu.arp?.[s];
  if (a !== null && a !== undefined && on(tu, 'arp', level)) {
    if (tu.arpVoice === 'single') blip(c, pulse(c, 0.5), hz(tones[a % tones.length] + 12), t, spb * 1.8, 0.03, k.dry, 0.4);
    else for (let j = 0; j < 2; j++) blip(c, pulse(c, 0.5), hz(tones[(a + s * 2 + j) % tones.length] + 12), t + (j * spb) / 2, spb / 2, 0.03, k.dry);
  }
  if (tu.drums && on(tu, 'drums', level)) {
    if (kick) thump(k, t, 210, 48, 0.09, 0.26, k.dry, 'triangle');
    if (tu.drums.s?.[s] === 'x') hit(k, t, 0.1, 0.13, 'highpass', 1400, 0.5, k.dry, 0.001);
    if (tu.drums.h?.[s] === 'x') hit(k, t, 0.025, 0.05, 'highpass', 9000, 0.5, k.dry, 0.001);
  }
  if (on(tu, 'lead', level)) for (const [ls, m, len] of tu.lead?.[bar % (tu.lead?.length || 1)] || []) if (ls === s) {
    const dur = spb * len * 0.9;
    blip(c, pulse(c, 0.25), hz(m), t, dur, 0.062, k.dry, 0.7, len >= 4 ? 0.005 : 0);
    blip(c, pulse(c, 0.125), hz(m), t + spb * 3, Math.min(dur, spb * 4), 0.018, k.dry, 0.7); // the echo a spare channel would play
  }
}

// ---------------------------------------------------------------- 3. Long White Cloud: slow, wide and cinematic
// Soft pads that fade into one another, plucked and struck notes in a large hall, a breathy flute for the tune,
// and for the launch a string ostinato, low drums and a horn. Mostly in three-time or very slow four.
function ambient(k: Kit, tu: Tune, bar: number, s: number, t: number, spb: number, level: number) {
  const { c } = k, ch = tu.chords[bar], root = ch[0], n = tu.steps ?? 16, tones = [...chordTones(ch), root + 24];
  if (s === 0) { // pad: each chord swells in under the last one's tail
    const dur = spb * n, v = 0.026 * (tu.pad ?? 1), g = shut(c), lp = lowpass(c, 1200);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.45); g.gain.setValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.5);
    for (const m of chordTones(ch)) { for (const det of [-5, 5]) osc(c, 'sine', hz(m + 12), t, t + dur * 1.5 + 0.1, det).connect(g); const tr = c.createGain(); tr.gain.value = 0.35; osc(c, 'triangle', hz(m + 24), t, t + dur * 1.5 + 0.1, 3).connect(tr).connect(lp); }
    lp.connect(g); osc(c, 'sine', hz(root + 12), t, t + dur * 1.5 + 0.1).connect(g);
    g.connect(k.wet);
  }
  const b = (level >= 1 && tu.drive ? tu.drive : tu.bass)[s];
  if (b !== null && b !== undefined) osc(c, 'sine', hz(root + b), t, t + spb * 7).connect(pluck(c, t, 0.06, 0.2, spb * 6.5)).connect(k.dry);
  const a = tu.arp?.[s];
  if (a !== null && a !== undefined && on(tu, 'arp', level)) {
    const f = hz(tones[a % tones.length] + 12);
    if (tu.arpVoice === 'strings') { // short bow strokes
      const dur = spb * 0.95, lp = lowpass(c, 1500), g = held(c, t, 0.02, 0.034, dur, 0.06);
      for (const det of [-7, 7]) osc(c, 'sawtooth', f / 2, t, t + dur + 0.05, det).connect(lp); lp.connect(g).connect(k.wet);
    } else if (tu.arpVoice === 'mallet') { // a struck wooden bar
      osc(c, 'sine', f, t, t + 0.5).connect(pluck(c, t, 0.003, 0.085, 0.45)).connect(k.wet);
      osc(c, 'sine', f * 4, t, t + 0.12).connect(pluck(c, t, 0.002, 0.02, 0.09)).connect(k.wet);
    } else { // a plucked string, ringing on
      osc(c, 'sine', f, t, t + 2.3).connect(pluck(c, t, 0.004, 0.075, 2.2)).connect(k.wet);
      osc(c, 'triangle', f, t, t + 0.5).connect(pluck(c, t, 0.003, 0.03, 0.4)).connect(k.wet);
    }
  }
  if (tu.drums && on(tu, 'drums', level)) {
    if (tu.drums.k?.[s] === 'x') { thump(k, t, 82, 40, 0.55, 0.4, k.dry); hit(k, t, 0.12, 0.18, 'lowpass', 300, 0.7, k.wet); } // a big, soft drum
    if (tu.drums.s?.[s] === 'x') { thump(k, t, 130, 70, 0.4, 0.3, k.wet); hit(k, t, 0.3, 0.16, 'lowpass', 900, 0.7, k.wet); } // a higher drum, with skin
    if (tu.drums.h?.[s] === 'x') hit(k, t, 0.07, 0.03, 'bandpass', 6000, 1.5, k.wet, 0.02); // a shaker
  }
  if (on(tu, 'lead', level)) for (const [ls, m, len] of tu.lead?.[bar % (tu.lead?.length || 1)] || []) if (ls === s) {
    const f = hz(m), dur = spb * len;
    if (tu.leadVoice === 'bell') {
      osc(c, 'sine', f, t, t + 3.6).connect(pluck(c, t, 0.004, 0.11, 3.5)).connect(k.wet);
      osc(c, 'sine', f * 2.76, t, t + 1.3).connect(pluck(c, t, 0.004, 0.022, 1.2)).connect(k.wet);
    } else if (tu.leadVoice === 'horn') { // brass far off: saws behind a filter that opens as the note swells
      const lp = lowpass(c, 500), g = held(c, t, 0.14, 0.12, dur, 0.25);
      lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1300, t + Math.min(0.5, dur * 0.5));
      for (const det of [-6, 6]) osc(c, 'sawtooth', f, t, t + dur + 0.05, det).connect(lp); lp.connect(g).connect(k.wet);
    } else { // flute: a sine with a little breath
      const o = osc(c, 'sine', f, t, t + dur + 0.05), g = held(c, t, 0.09, 0.1, dur, Math.min(0.3, dur * 0.4)), o2 = osc(c, 'triangle', f * 2, t, t + dur + 0.05), g2 = c.createGain(); g2.gain.value = 0.12;
      vibrato(c, o, f, t + 0.25, t + dur + 0.05, 0.005, 4.8);
      o.connect(g); o2.connect(g2).connect(g); g.connect(k.wet);
      hit(k, t, Math.min(dur, 0.5), 0.02, 'bandpass', f * 2, 3, k.wet, 0.05);
    }
  }
}
/** A large hall, made by convolving with a few seconds of fading noise. */
const halls = new WeakMap<BaseAudioContext, AudioBuffer>();
function hall(c: BaseAudioContext, out: AudioNode) {
  let ir = halls.get(c);
  if (!ir) {
    const len = Math.floor(c.sampleRate * 3.2); ir = c.createBuffer(2, len, c.sampleRate);
    for (let chn = 0; chn < 2; chn++) { const d = ir.getChannelData(chn); let y = 0; for (let i = 0; i < len; i++) { y += 0.28 * (Math.random() * 2 - 1 - y); d[i] = y * Math.pow(1 - i / len, 3); } } // darkened noise, fading
    halls.set(c, ir);
  }
  const send = c.createGain(), conv = c.createConvolver(), level = c.createGain(); conv.buffer = ir; level.gain.value = 0.9;
  send.connect(out); send.connect(conv).connect(level).connect(out);
  return { dry: out, wet: send };
}

// ---------------------------------------------------------------- the scores
const NIGHT_LAUNCH: Record<string, Tune> = {
  // World map: E minor, a steady night drive
  map: {
    bpm: 100, vol: 1.15,
    chords: [[40, 3, 7, 10], [36, 4, 7, 11], [43, 4, 7], [38, 4, 7], [40, 3, 7, 10], [36, 4, 7, 11], [45, 3, 7, 10], [35, 4, 7, 10]],
    bass: [0, _, 0, _, 0, _, 0, _, 0, _, 0, _, 0, _, 12, _],
    arp: [0, 2, 1, 2, 3, 2, 1, 2, 0, 2, 1, 2, 3, 2, 1, 2],
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.' },
    lead: [
      [[0, 71, 6], [6, 74, 2], [8, 76, 8]], [[0, 79, 6], [6, 76, 2], [8, 74, 4], [12, 72, 4]],
      [[0, 71, 6], [6, 74, 2], [8, 79, 8]], [[0, 78, 6], [6, 76, 2], [8, 74, 4], [12, 69, 4]],
      [[0, 71, 6], [6, 74, 2], [8, 76, 4], [12, 79, 4]], [[0, 83, 6], [6, 81, 2], [8, 79, 8]],
      [[0, 76, 4], [4, 81, 4], [8, 79, 4], [12, 76, 4]], [[0, 78, 8], [8, 75, 4], [12, 78, 4]],
    ],
  },
  // 1990s workshop: D minor, synth-funk
  workshop: {
    bpm: 112, vol: 1.2, pad: 0.7,
    chords: [[38, 3, 7, 10], [38, 3, 7, 10], [34, 4, 7, 11], [36, 4, 7], [38, 3, 7, 10], [43, 3, 7, 10], [34, 4, 7], [33, 4, 7]],
    bass: [0, _, _, 0, _, _, 12, _, _, 0, _, _, 7, _, 12, _],
    arp: [_, _, 2, _, _, 1, _, _, 2, _, _, 3, _, _, 1, _],
    drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' },
    lead: [
      [[0, 74, 2], [3, 77, 2], [6, 79, 2], [8, 81, 4], [14, 79, 2]], [[0, 77, 3], [3, 74, 3], [6, 72, 2], [8, 74, 8]],
      [[0, 77, 2], [3, 81, 2], [6, 82, 2], [8, 84, 4], [14, 82, 2]], [[0, 79, 3], [3, 76, 3], [6, 72, 2], [8, 76, 8]],
      [[0, 74, 2], [3, 77, 2], [6, 79, 2], [8, 81, 4], [14, 79, 2]], [[0, 82, 3], [3, 79, 3], [6, 77, 2], [8, 74, 8]],
      [[0, 77, 4], [4, 82, 4], [8, 86, 8]], [[0, 85, 4], [4, 81, 4], [8, 76, 8]],
    ],
  },
  // Māhia: D major, wide and unhurried
  mahia: {
    bpm: 96, vol: 1.12,
    chords: [[38, 4, 7], [35, 3, 7, 10], [43, 4, 7, 11], [45, 4, 7], [38, 4, 7], [42, 3, 7, 10], [43, 4, 7, 11], [45, 4, 7]],
    bass: [0, _, _, _, 0, _, _, _, 0, _, _, _, 0, _, 7, _],
    arp: [0, _, 1, _, 2, _, 3, _, 2, _, 1, _, 2, _, 3, _],
    drums: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    lead: [
      [[0, 78, 8], [8, 81, 4], [12, 78, 4]], [[0, 74, 8], [8, 78, 8]],
      [[0, 79, 6], [6, 78, 2], [8, 74, 8]], [[0, 76, 12], [12, 73, 4]],
      [[0, 78, 8], [8, 81, 4], [12, 86, 4]], [[0, 85, 6], [6, 81, 2], [8, 78, 8]],
      [[0, 79, 4], [4, 83, 4], [8, 86, 8]], [[0, 85, 8], [8, 81, 4], [12, 76, 4]],
    ],
  },
  // The Auckland factory: C minor, sequenced like a production line
  factory: {
    bpm: 120, vol: 1.1, pad: 0.8,
    chords: [[36, 3, 7], [32, 4, 7], [39, 4, 7], [34, 4, 7], [36, 3, 7], [36, 3, 7], [32, 4, 7, 11], [34, 4, 7]],
    bass: [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 12, 0, 12],
    arp: [3, _, 2, 1, _, 2, 3, _, 2, 1, _, 2, 3, 2, 1, _],
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    lead: [
      [[0, 72, 2], [2, 75, 2], [4, 79, 2], [8, 75, 2], [10, 79, 2], [12, 84, 4]], [[0, 84, 2], [2, 80, 2], [4, 75, 4], [8, 80, 8]],
      [[0, 79, 2], [2, 82, 2], [4, 87, 4], [8, 82, 8]], [[0, 77, 2], [2, 82, 2], [4, 86, 4], [8, 82, 4], [12, 77, 4]],
      [[0, 72, 2], [2, 75, 2], [4, 79, 2], [8, 84, 2], [10, 87, 2], [12, 91, 4]], [[0, 91, 2], [2, 87, 2], [4, 84, 4], [8, 79, 8]],
      [[0, 80, 4], [4, 84, 4], [8, 87, 8]], [[0, 86, 4], [4, 82, 4], [8, 77, 8]],
    ],
  },
  // Stennis to Wallops: B minor, half-time, the long wait
  delta: {
    bpm: 88, vol: 1.2,
    chords: [[35, 3, 7, 10], [43, 4, 7, 11], [38, 4, 7], [45, 4, 7], [35, 3, 7, 10], [43, 4, 7], [40, 3, 7, 10], [42, 4, 7]],
    bass: [0, _, _, _, _, _, 0, _, 0, _, _, _, _, _, 7, _],
    arp: [_, _, 0, _, 1, _, 2, _, 3, _, 2, _, 1, _, 2, _],
    drums: { k: 'x.........x.....', s: '........x.......', h: 'x...x...x...x...' },
    lead: [
      [[0, 78, 12], [12, 76, 4]], [[0, 74, 8], [8, 71, 8]],
      [[0, 69, 4], [4, 74, 4], [8, 78, 8]], [[0, 76, 12], [12, 73, 4]],
      [[0, 78, 8], [8, 83, 8]], [[0, 81, 6], [6, 79, 2], [8, 74, 8]],
      [[0, 76, 4], [4, 79, 4], [8, 83, 8]], [[0, 82, 8], [8, 78, 8]],
    ],
  },
  // Launch: F minor. 0 the count (pad and pulse), 1 the ascent (drums, sixteenths, arpeggio), 2 stage two (the tune)
  launch: {
    bpm: 120, vol: 1.15, layers: { drums: 1, arp: 1, lead: 2 },
    chords: [[41, 3, 7], [44, 4, 7], [39, 4, 7], [37, 4, 7], [41, 3, 7], [44, 4, 7], [34, 3, 7], [36, 4, 7]],
    bass: [0, _, 0, _, 0, _, 0, _, 0, _, 0, _, 0, _, 0, _],
    drive: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0],
    arp: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 3, 2, 1, 2],
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...xx' },
    lead: [
      [[0, 72, 6], [6, 77, 2], [8, 80, 8]], [[0, 80, 4], [4, 84, 4], [8, 87, 8]],
      [[0, 86, 2], [2, 82, 6], [8, 79, 8]], [[0, 77, 6], [6, 80, 2], [8, 85, 8]],
      [[0, 72, 6], [6, 77, 2], [8, 80, 4], [12, 84, 4]], [[0, 87, 8], [8, 84, 4], [12, 80, 4]],
      [[0, 82, 6], [6, 85, 2], [8, 89, 8]], [[0, 88, 8], [8, 84, 4], [12, 79, 4]],
    ],
  },
  // Helicopter catch: G minor, a gallop
  heli: {
    bpm: 124, vol: 1.15, pad: 0.8,
    chords: [[43, 3, 7], [39, 4, 7], [34, 4, 7], [41, 4, 7], [43, 3, 7], [39, 4, 7], [36, 3, 7], [38, 4, 7]],
    bass: [0, _, 0, 0, 0, _, 0, 0, 0, _, 0, 0, 0, _, 12, 12],
    arp: [2, 1, 0, 1, 2, 1, 0, 1, 3, 2, 1, 2, 3, 2, 1, 2],
    drums: { k: 'x...x...x...x.x.', s: '....x.......x...', h: 'xx.xxx.xxx.xxx.x' },
    lead: [
      [[0, 79, 3], [3, 82, 3], [6, 86, 2], [8, 82, 4], [12, 79, 4]], [[0, 82, 3], [3, 79, 3], [6, 75, 2], [8, 79, 8]],
      [[0, 77, 3], [3, 82, 3], [6, 86, 2], [8, 89, 8]], [[0, 84, 4], [4, 81, 4], [8, 77, 8]],
      [[0, 79, 3], [3, 82, 3], [6, 86, 2], [8, 91, 8]], [[0, 87, 4], [4, 82, 4], [8, 79, 8]],
      [[0, 84, 3], [3, 87, 3], [6, 91, 2], [8, 87, 8]], [[0, 86, 4], [4, 81, 4], [8, 78, 8]],
    ],
  },
  // Space: A major, a slow ballad for the Moon and for orbit
  space: {
    bpm: 80, vol: 1.05, pad: 1.5,
    chords: [[45, 4, 7, 11], [42, 3, 7, 10], [38, 4, 7, 11], [40, 4, 7], [45, 4, 7, 11], [37, 3, 7, 10], [38, 4, 7, 11], [40, 4, 7]],
    bass: [0, _, _, _, _, _, _, _, 0, _, _, _, _, _, 7, _],
    arp: [0, _, 2, _, 3, _, 4, _, 3, _, 2, _, 3, _, 1, _],
    drums: { k: 'x...............', s: '........x.......' },
    lead: [
      [[0, 76, 8], [8, 80, 8]], [[0, 81, 12], [12, 78, 4]], [[0, 78, 8], [8, 73, 8]], [[0, 71, 8], [8, 76, 8]],
      [[0, 76, 8], [8, 83, 8]], [[0, 85, 8], [8, 80, 8]], [[0, 81, 8], [8, 85, 8]], [[0, 83, 12], [12, 80, 4]],
    ],
  },
};

const EIGHT_BIT: Record<string, Tune> = {
  // World map: G major, off on an adventure
  map: {
    bpm: 152, vol: 1.14,
    chords: [[43, 4, 7], [36, 4, 7], [38, 4, 7], [43, 4, 7], [40, 3, 7], [36, 4, 7], [38, 4, 7], [38, 4, 7]],
    bass: [0, _, 7, _, 12, _, 7, _, 0, _, 7, _, 12, _, 7, _],
    arp: [0, _, 0, 0, _, 0, 0, _, 0, _, 0, 0, _, 0, 0, _],
    drums: { k: 'x.......x..x....', s: '....x.......x.xx', h: 'x.x.x.x.x.x.x.x.' },
    lead: [
      [[0, 74, 2], [2, 79, 2], [4, 81, 2], [6, 83, 4], [10, 81, 2], [12, 79, 4]], [[0, 76, 2], [2, 79, 2], [4, 84, 4], [8, 83, 2], [10, 81, 2], [12, 79, 4]],
      [[0, 78, 2], [2, 81, 2], [4, 86, 4], [8, 84, 2], [10, 81, 2], [12, 78, 4]], [[0, 79, 6], [6, 74, 2], [8, 79, 2], [10, 83, 2], [12, 86, 4]],
      [[0, 88, 4], [4, 86, 2], [6, 83, 2], [8, 79, 4], [12, 76, 4]], [[0, 84, 4], [4, 83, 2], [6, 79, 2], [8, 76, 4], [12, 72, 4]],
      [[0, 74, 2], [2, 78, 2], [4, 81, 2], [6, 84, 2], [8, 86, 4], [12, 90, 4]], [[0, 86, 4], [4, 84, 2], [6, 81, 2], [8, 78, 2], [10, 81, 2], [12, 86, 4]],
    ],
  },
  // 1990s workshop: E minor, a busy riff
  workshop: {
    bpm: 160, vol: 1.11,
    chords: [[40, 3, 7], [40, 3, 7], [43, 4, 7], [38, 4, 7], [40, 3, 7], [40, 3, 7], [36, 4, 7], [35, 4, 7]],
    bass: [0, _, 0, 12, _, 0, _, 7, _, 0, 12, _, 7, _, 7, 12],
    arp: [_, _, 0, _, _, _, 0, _, _, _, 0, _, _, 0, _, 0],
    drums: { k: 'x..x..x...x..x..', s: '....x.......x...', h: '..x...x...x...xx' },
    lead: [
      [[0, 76, 2], [2, 79, 1], [3, 81, 3], [6, 83, 2], [8, 81, 2], [10, 79, 2], [12, 76, 4]], [[0, 74, 2], [2, 76, 4], [8, 79, 2], [10, 81, 2], [12, 83, 4]],
      [[0, 86, 2], [2, 83, 1], [3, 86, 3], [6, 91, 2], [8, 86, 4], [12, 83, 4]], [[0, 81, 2], [2, 78, 2], [4, 74, 4], [8, 78, 2], [10, 81, 2], [12, 86, 4]],
      [[0, 76, 2], [2, 79, 1], [3, 81, 3], [6, 83, 2], [8, 81, 2], [10, 79, 2], [12, 76, 4]], [[0, 88, 4], [4, 86, 2], [6, 83, 2], [8, 79, 4], [12, 83, 4]],
      [[0, 84, 2], [2, 79, 2], [4, 76, 4], [8, 79, 2], [10, 84, 2], [12, 88, 4]], [[0, 87, 4], [4, 83, 4], [8, 78, 4], [12, 75, 4]],
    ],
  },
  // Māhia: C major, a skipping tune for the coast road
  mahia: {
    bpm: 138, vol: 1.35,
    chords: [[36, 4, 7], [41, 4, 7], [36, 4, 7], [43, 4, 7], [45, 3, 7], [41, 4, 7], [43, 4, 7], [36, 4, 7]],
    bass: [0, _, _, _, 7, _, _, _, 12, _, _, _, 7, _, _, _],
    arp: [_, _, 0, _, _, _, 0, _, _, _, 0, _, _, _, 0, 0],
    drums: { k: 'x.......x.......', s: '....x.......x...', h: '..xx..xx..xx..xx' },
    lead: [
      [[0, 76, 3], [3, 79, 1], [4, 84, 4], [8, 81, 3], [11, 79, 1], [12, 76, 4]], [[0, 77, 3], [3, 81, 1], [4, 84, 4], [8, 81, 4], [12, 77, 4]],
      [[0, 79, 3], [3, 84, 1], [4, 88, 4], [8, 86, 3], [11, 84, 1], [12, 79, 4]], [[0, 83, 4], [4, 86, 4], [8, 79, 8]],
      [[0, 81, 3], [3, 84, 1], [4, 88, 4], [8, 84, 4], [12, 81, 4]], [[0, 77, 3], [3, 81, 1], [4, 84, 4], [8, 89, 4], [12, 84, 4]],
      [[0, 86, 3], [3, 83, 1], [4, 79, 4], [8, 83, 4], [12, 86, 4]], [[0, 84, 8], [8, 79, 4], [12, 76, 4]],
    ],
  },
  // The Auckland factory: A minor, machines in step
  factory: {
    bpm: 168, vol: 1.17,
    chords: [[45, 3, 7], [45, 3, 7], [41, 4, 7], [43, 4, 7], [45, 3, 7], [45, 3, 7], [38, 3, 7], [40, 4, 7]],
    bass: [0, _, 0, 0, 12, _, 0, 0, 0, _, 0, 0, 12, _, 12, 0],
    arp: [0, _, _, _, 0, _, _, _, 0, _, _, _, 0, _, 0, _],
    drums: { k: 'x...x...x...x...', s: '....x..x....x...', h: '..x...x...x.x.x.' },
    lead: [
      [[0, 81, 1], [2, 81, 1], [4, 84, 2], [6, 81, 2], [8, 76, 2], [10, 81, 2], [12, 84, 4]], [[0, 83, 1], [2, 83, 1], [4, 86, 2], [6, 83, 2], [8, 79, 2], [10, 83, 2], [12, 88, 4]],
      [[0, 81, 1], [2, 81, 1], [4, 84, 2], [6, 89, 2], [8, 84, 2], [10, 81, 2], [12, 77, 4]], [[0, 83, 1], [2, 83, 1], [4, 86, 2], [6, 91, 2], [8, 86, 2], [10, 83, 2], [12, 79, 4]],
      [[0, 88, 2], [2, 84, 2], [4, 81, 2], [6, 84, 2], [8, 88, 2], [10, 93, 2], [12, 88, 4]], [[0, 86, 2], [2, 84, 2], [4, 83, 2], [6, 84, 2], [8, 81, 8]],
      [[0, 86, 2], [2, 89, 2], [4, 86, 2], [6, 81, 2], [8, 86, 4], [12, 89, 4]], [[0, 88, 4], [4, 83, 4], [8, 80, 4], [12, 83, 4]],
    ],
  },
  // Stennis to Wallops: F major, a little waltz for the long wait
  delta: {
    bpm: 132, vol: 1.35, steps: 12,
    chords: [[41, 4, 7], [34, 4, 7], [41, 4, 7], [36, 4, 7], [38, 3, 7], [34, 4, 7], [36, 4, 7], [41, 4, 7]],
    bass: [0, _, _, _, 7, _, _, _, 7, _, _, _],
    arp: [_, _, _, _, 0, _, _, _, 0, _, _, _],
    drums: { k: 'x...........', s: '....x...x...' },
    lead: [
      [[0, 81, 4], [4, 84, 4], [8, 89, 4]], [[0, 86, 8], [8, 82, 4]], [[0, 81, 4], [4, 84, 4], [8, 81, 4]], [[0, 79, 8], [8, 76, 4]],
      [[0, 77, 4], [4, 81, 4], [8, 86, 4]], [[0, 89, 8], [8, 86, 4]], [[0, 84, 4], [4, 88, 4], [8, 91, 4]], [[0, 89, 12]],
    ],
  },
  // Launch: F sharp minor. 0 the count (a ticking bass), 1 the ascent (drums, gallop, racing arpeggio), 2 stage two
  launch: {
    bpm: 172, vol: 0.95, layers: { drums: 1, arp: 1, lead: 2 },
    chords: [[42, 3, 7], [42, 3, 7], [38, 4, 7], [40, 4, 7], [42, 3, 7], [45, 4, 7], [38, 4, 7], [37, 4, 7]],
    bass: [0, _, _, _, 0, _, _, _, 0, _, _, _, 0, _, 0, _],
    drive: [0, 0, _, 0, 0, _, 0, 0, _, 0, 0, _, 0, 0, 12, 12],
    arp: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx' },
    lead: [
      [[0, 73, 4], [4, 78, 4], [8, 81, 6], [14, 80, 2]], [[0, 78, 4], [4, 81, 4], [8, 85, 8]],
      [[0, 86, 4], [4, 85, 2], [6, 81, 2], [8, 78, 8]], [[0, 80, 4], [4, 83, 4], [8, 88, 8]],
      [[0, 85, 4], [4, 81, 4], [8, 85, 4], [12, 90, 4]], [[0, 88, 6], [6, 85, 2], [8, 81, 8]],
      [[0, 78, 4], [4, 81, 4], [8, 86, 8]], [[0, 85, 4], [4, 80, 4], [8, 77, 8]],
    ],
  },
  // Helicopter catch: D minor, flat out
  heli: {
    bpm: 180, vol: 1.15,
    chords: [[38, 3, 7], [34, 4, 7], [36, 4, 7], [33, 4, 7], [38, 3, 7], [34, 4, 7], [43, 3, 7], [33, 4, 7]],
    bass: [0, _, 12, 0, _, 12, 0, _, 12, 0, _, 12, 0, _, 12, _],
    arp: [0, _, _, 0, _, _, 0, _, _, 0, _, _, 0, _, 0, _],
    drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    lead: [
      [[0, 74, 2], [2, 77, 2], [4, 81, 2], [6, 86, 2], [8, 84, 2], [10, 81, 2], [12, 77, 4]], [[0, 82, 2], [2, 77, 2], [4, 74, 2], [6, 77, 2], [8, 82, 4], [12, 86, 4]],
      [[0, 84, 2], [2, 79, 2], [4, 76, 2], [6, 79, 2], [8, 84, 4], [12, 88, 4]], [[0, 85, 4], [4, 81, 4], [8, 76, 4], [12, 81, 4]],
      [[0, 86, 4], [4, 89, 4], [8, 86, 2], [10, 84, 2], [12, 81, 4]], [[0, 82, 4], [4, 86, 4], [8, 89, 8]],
      [[0, 91, 2], [2, 86, 2], [4, 82, 2], [6, 79, 2], [8, 82, 4], [12, 86, 4]], [[0, 88, 4], [4, 85, 4], [8, 81, 8]],
    ],
  },
  // Space: E major, slow single notes, no drums
  space: {
    bpm: 100, vol: 1.35, arpVoice: 'single',
    chords: [[40, 4, 7], [37, 3, 7], [45, 4, 7], [35, 4, 7], [40, 4, 7], [44, 3, 7], [45, 4, 7], [35, 4, 7]],
    bass: [0, _, _, _, _, _, _, _, 7, _, _, _, _, _, _, _],
    arp: [0, _, 2, _, 1, _, 2, _, 0, _, 2, _, 1, _, 2, _],
    lead: [
      [[0, 83, 8], [8, 80, 8]], [[0, 76, 8], [8, 85, 8]], [[0, 81, 8], [8, 85, 4], [12, 88, 4]], [[0, 87, 8], [8, 83, 8]],
      [[0, 83, 8], [8, 88, 8]], [[0, 87, 8], [8, 83, 8]], [[0, 85, 8], [8, 81, 8]], [[0, 78, 8], [8, 83, 8]],
    ],
  },
};

const LONG_WHITE_CLOUD: Record<string, Tune> = {
  // World map: D, in three, a flute over open chords
  map: {
    bpm: 66, vol: 0.94, steps: 12,
    chords: [[38, 2, 7], [35, 3, 7, 10], [43, 4, 7, 11], [45, 5, 7], [38, 2, 7], [42, 3, 7, 10], [43, 4, 7, 11], [45, 4, 7]],
    bass: [0, _, _, _, _, _, _, _, _, _, _, _],
    arp: [0, _, 1, _, 2, _, 3, _, 2, _, 1, _],
    lead: [
      [[0, 78, 6], [6, 81, 6]], [[0, 83, 8], [8, 81, 4]], [[0, 78, 6], [6, 74, 6]], [[0, 76, 12]],
      [[0, 78, 6], [6, 81, 6]], [[0, 85, 8], [8, 81, 4]], [[0, 83, 6], [6, 86, 6]], [[0, 81, 6], [6, 76, 6]],
    ],
  },
  // 1990s workshop: A Dorian, a marimba figure ticking over after hours
  workshop: {
    bpm: 72, arpVoice: 'mallet', pad: 0.8,
    chords: [[45, 3, 7, 10], [38, 4, 7], [45, 3, 7, 10], [38, 4, 7], [41, 4, 7, 11], [43, 4, 7], [45, 3, 7, 10], [45, 3, 7, 10]],
    bass: [0, _, _, _, _, _, _, _, 0, _, _, _, _, _, 7, _],
    arp: [0, _, 2, 3, _, 2, _, 1, 0, _, 2, 3, _, 2, 1, _],
    drums: { k: 'x.......x.......', h: '....x.......x...' },
    lead: [
      [[0, 76, 6], [6, 79, 2], [8, 81, 8]], [[0, 78, 8], [8, 74, 8]], [[0, 76, 6], [6, 79, 2], [8, 84, 8]], [[0, 81, 8], [8, 78, 8]],
      [[0, 81, 8], [8, 84, 8]], [[0, 83, 8], [8, 79, 8]], [[0, 76, 16]], [],
    ],
  },
  // Māhia: G, in three and very slow, for the sea and the hills
  mahia: {
    bpm: 60, vol: 0.8, steps: 12,
    chords: [[43, 4, 7], [40, 3, 7, 10], [36, 4, 7, 14], [38, 5, 7], [43, 4, 7], [35, 3, 7, 10], [36, 4, 7, 14], [38, 4, 7]],
    bass: [0, _, _, _, _, _, _, _, _, _, _, _],
    arp: [0, _, _, _, 2, _, 3, _, _, _, 1, _],
    lead: [
      [[0, 74, 4], [4, 79, 8]], [[0, 76, 4], [4, 83, 8]], [[0, 81, 4], [4, 79, 4], [8, 76, 4]], [[0, 74, 12]],
      [[0, 74, 4], [4, 79, 4], [8, 83, 4]], [[0, 86, 8], [8, 83, 4]], [[0, 88, 4], [4, 86, 4], [8, 79, 4]], [[0, 81, 12]],
    ],
  },
  // The Auckland factory: E flat, mallets pulsing in sixteenths under long notes
  factory: {
    bpm: 76, arpVoice: 'mallet', leadVoice: 'horn', pad: 0.8,
    chords: [[39, 4, 7, 11], [36, 3, 7, 10], [44, 4, 7, 11], [34, 4, 7], [39, 4, 7, 11], [36, 3, 7, 10], [44, 4, 7, 11], [34, 4, 7]],
    bass: [0, _, _, _, _, _, _, _, _, _, 0, _, _, _, _, _],
    arp: [0, 2, 1, 2, 3, 2, 1, 2, 0, 2, 1, 2, 3, 2, 4, 2],
    drums: { k: 'x.......x.......', h: 'x.x.x.x.x.x.x.x.' },
    lead: [
      [[0, 79, 16]], [[0, 82, 12], [12, 79, 4]], [[0, 84, 16]], [[0, 86, 8], [8, 82, 8]],
      [[0, 87, 16]], [[0, 86, 8], [8, 84, 8]], [[0, 84, 8], [8, 87, 8]], [[0, 89, 8], [8, 86, 8]],
    ],
  },
  // Stennis to Wallops: E Mixolydian, almost still
  delta: {
    bpm: 56, vol: 0.9, pad: 1.2,
    chords: [[40, 4, 7], [38, 4, 7], [45, 4, 7], [40, 4, 7], [40, 4, 7], [38, 4, 7], [45, 4, 7], [40, 4, 7]],
    bass: [0, _, _, _, _, _, _, _, _, _, _, _, 7, _, _, _],
    arp: [_, _, 0, _, _, _, 2, _, _, 1, _, _, 3, _, _, _],
    drums: { k: 'x...............' },
    lead: [
      [[0, 71, 8], [8, 76, 8]], [[0, 78, 12], [12, 74, 4]], [[0, 73, 8], [8, 76, 8]], [[0, 80, 16]],
      [[0, 83, 8], [8, 80, 8]], [[0, 81, 8], [8, 78, 8]], [[0, 76, 8], [8, 73, 8]], [[0, 71, 16]],
    ],
  },
  // Launch: B minor. 0 the count (a drone and a slow pulse), 1 the ascent (string ostinato, big drums), 2 stage two (horns)
  launch: {
    bpm: 84, vol: 0.86, arpVoice: 'strings', leadVoice: 'horn', layers: { drums: 1, arp: 1, lead: 2 },
    chords: [[35, 3, 7], [35, 3, 7], [43, 4, 7], [40, 3, 7], [35, 3, 7], [38, 4, 7], [43, 4, 7], [42, 4, 7]],
    bass: [0, _, _, _, _, _, _, _, 0, _, _, _, _, _, _, _],
    drive: [0, _, _, _, 0, _, _, _, 0, _, _, _, 0, _, 7, _],
    arp: [0, 0, 2, 0, 1, 0, 2, 0, 0, 0, 2, 0, 3, 0, 2, 0],
    drums: { k: 'x.....x...x.....', s: '........x.....xx' },
    lead: [
      [[0, 66, 8], [8, 71, 8]], [[0, 74, 12], [12, 73, 4]], [[0, 71, 8], [8, 74, 8]], [[0, 76, 12], [12, 74, 4]],
      [[0, 78, 8], [8, 74, 8]], [[0, 81, 12], [12, 78, 4]], [[0, 79, 8], [8, 83, 8]], [[0, 82, 8], [8, 78, 8]],
    ],
  },
  // Helicopter catch: F sharp minor, strings circling, a drum that will not settle
  heli: {
    bpm: 80, vol: 0.87, arpVoice: 'strings',
    chords: [[42, 3, 7], [38, 4, 7], [45, 4, 7], [40, 4, 7], [42, 3, 7], [38, 4, 7], [35, 3, 7], [37, 4, 7]],
    bass: [0, _, _, 0, _, _, 0, _, _, _, 0, _, _, _, _, _],
    arp: [3, 2, 0, 2, 3, 2, 1, 2, 3, 2, 0, 2, 3, 1, 2, 1],
    drums: { k: 'x..x..x...x..x..', s: '............x...' },
    lead: [
      [[0, 73, 6], [6, 76, 2], [8, 78, 8]], [[0, 81, 8], [8, 78, 8]], [[0, 76, 6], [6, 80, 2], [8, 81, 8]], [[0, 83, 8], [8, 80, 8]],
      [[0, 85, 8], [8, 81, 8]], [[0, 78, 8], [8, 74, 8]], [[0, 74, 4], [4, 78, 4], [8, 83, 8]], [[0, 80, 8], [8, 77, 8]],
    ],
  },
  // Space: D drifting to C and back, bells a long way apart
  space: {
    bpm: 50, vol: 0.83, leadVoice: 'bell', pad: 1.4,
    chords: [[38, 4, 7, 11], [36, 4, 7, 11], [38, 4, 7, 11], [35, 3, 7, 10]],
    bass: [0, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    arp: [_, _, _, 2, _, _, _, _, _, 3, _, _, _, 1, _, _],
    lead: [[[0, 81, 8], [10, 85, 6]], [[4, 83, 12]], [[0, 78, 8], [8, 90, 8]], [[4, 86, 12]]],
  },
};

export const SOUNDTRACKS: Soundtrack[] = [
  { id: 'synthwave', name: 'Night Launch', style: '1980s synthwave', gain: 1, tunes: NIGHT_LAUNCH, step: synthwave, fx: echo },
  { id: 'chiptune', name: '8-Bit Electron', style: 'chiptune', gain: 1, tunes: EIGHT_BIT, step: chiptune },
  { id: 'ambient', name: 'Long White Cloud', style: 'slow and cinematic', gain: 1, tunes: LONG_WHITE_CLOUD, step: ambient, fx: hall },
];
