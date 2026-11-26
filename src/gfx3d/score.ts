// The score for a descent: an orchestra made of oscillators, written here and played live, so it can follow the fall.
// Five movements over one progression in D minor (i · VI · III · VII), each a set of layers the scene fades between:
// space (drone, glass, a slow theme) · the wall (low strings in eighths, drums, brass) · free fall · under the
// parachutes (the theme, full) · and the water, where it turns to D major and holds.
// Everything goes through a hall (a generated impulse response) and into the game's music bus, so mute still works.
import { musicOut } from '../audio';

export type Mood = 'space' | 'wall' | 'fall' | 'drogue' | 'main' | 'down' | 'lost';
const BPM = 76, STEP = 60 / BPM / 4; // a sixteenth
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
/** The bars: root (MIDI), and the chord's notes above middle C. */
const BARS: [number, number[]][] = [[38, [62, 65, 69, 76]], [34, [58, 62, 65, 69]], [41, [60, 65, 69, 72]], [36, [60, 64, 67, 74]]];
const HOME: [number, number[]] = [38, [62, 66, 69, 74, 78]]; // D major, for the water
/** The theme, two notes a bar over eight bars: [step in the bar, MIDI note]. */
const THEME: [number, number][][] = [[[0, 69], [8, 74]], [[0, 72], [10, 70]], [[0, 69], [8, 65]], [[0, 67], [8, 64]], [[0, 69], [8, 77]], [[0, 74], [10, 72]], [[0, 72], [6, 69], [12, 67]], [[0, 64], [8, 62]]];

export class Score {
  private c: AudioContext; private out: GainNode; private wet: GainNode; private timer?: number; private next = 0; private step = 0;
  private mood: Mood = 'space'; private heat = 0; private lvl: Record<string, number> = { pad: 0, glass: 0, theme: 0, ost: 0, drum: 0, brass: 0, choir: 0 };
  private noise: AudioBuffer; private done = false; private endAt = -1;
  constructor() {
    const { ctx, bus } = musicOut(); const c = (this.c = ctx);
    this.out = c.createGain(); this.out.gain.value = 0; this.out.connect(bus);
    // the hall: four seconds of decaying noise, darker as it dies
    const len = Math.floor(c.sampleRate * 4.2), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let lp = 0; for (let i = 0; i < len; i++) { const t = i / len, k = 0.5 * (1 - t) + 0.04; lp += k * (Math.random() * 2 - 1 - lp); d[i] = lp * (1 - t) ** 2.6 * (i < 400 ? i / 400 : 1); } }
    const hall = c.createConvolver(); hall.buffer = ir; this.wet = c.createGain(); this.wet.gain.value = 1.4; this.wet.connect(hall).connect(bus);
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const nd = this.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }
  start() { const c = this.c; this.out.gain.setTargetAtTime(0.9, c.currentTime, 0.5); this.next = c.currentTime + 0.1; this.step = 0; this.timer = window.setInterval(() => this.tick(), 45); }
  /** Where the fall is, and how hard the air is working (0 to 1). */
  set(mood: Mood, heat = 0) {
    if (mood !== this.mood) {
      const t = this.c.currentTime + 0.02;
      if (mood === 'wall') { this.riser(t, 2.4, 0.5); this.boom(t + 2.4, 1); }
      if (mood === 'drogue' || mood === 'main') { this.boom(t, 0.9); this.cymbal(t, 0.5); }
      if (mood === 'down') { this.boom(t, 1); this.cymbal(t, 0.7); this.endAt = this.step + 16 * 5; }
      if (mood === 'lost') { this.boom(t, 1); this.out.gain.setTargetAtTime(0, t + 0.3, 0.8); this.done = true; }
    }
    this.mood = mood; this.heat = heat;
  }
  stop(fade = 1.2) { if (this.timer !== undefined) clearInterval(this.timer); this.timer = undefined; const c = this.c, o = this.out, w = this.wet; o.gain.setTargetAtTime(0, c.currentTime, fade / 3); w.gain.setTargetAtTime(0, c.currentTime + fade, 0.8); setTimeout(() => { o.disconnect(); w.disconnect(); }, (fade + 5) * 1000); }

  // ---- instruments
  private env(g: GainNode, t: number, a: number, peak: number, dur: number, rel: number) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + Math.max(a, dur)); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a, dur) + rel); }
  private send(n: AudioNode, dry: number, wet: number, pan = 0) { const p = this.c.createStereoPanner(); p.pan.value = pan; n.connect(p); const d = this.c.createGain(); d.gain.value = dry; p.connect(d).connect(this.out); const w = this.c.createGain(); w.gain.value = wet; p.connect(w).connect(this.wet); }
  private osc(type: OscillatorType, f: number, t: number, end: number, det = 0) { const o = this.c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.start(t); o.stop(end); return o; }
  /** Strings held: detuned saws under a slow filter. */
  private pad(notes: number[], t: number, dur: number, vol: number, bright: number) {
    const c = this.c, f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.Q.value = 0.4; f.frequency.setValueAtTime(bright * 0.6, t); f.frequency.linearRampToValueAtTime(bright, t + dur * 0.6); f.frequency.linearRampToValueAtTime(bright * 0.7, t + dur + 2);
    for (const n of notes) for (const d of [-9, 7]) this.osc('sawtooth', hz(n), t, t + dur + 3.2, d).connect(f);
    f.connect(g); this.env(g, t, 1.3, vol / notes.length, dur, 2.6); this.send(g, 0.55, 0.6);
  }
  /** A voice-like pad: the same saws through three fixed resonances. */
  private choir(notes: number[], t: number, dur: number, vol: number) {
    const c = this.c, g = c.createGain(), mix = c.createGain();
    for (const [fq, q, a] of [[640, 5, 1], [1150, 7, 0.55], [2700, 8, 0.2]]) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fq; b.Q.value = q; const ga = c.createGain(); ga.gain.value = a; mix.connect(b).connect(ga).connect(g); }
    for (const n of notes) for (const d of [-11, 0, 12]) { const o = this.osc('sawtooth', hz(n), t, t + dur + 3.4, d); const v = c.createOscillator(), vg = c.createGain(); v.frequency.value = 4.6 + Math.random(); vg.gain.value = 5; v.connect(vg).connect(o.detune); v.start(t); v.stop(t + dur + 3.4); o.connect(mix); }
    this.env(g, t, 1.6, (vol * 2.4) / notes.length, dur, 2.8); this.send(g, 0.4, 0.9);
  }
  /** Glass: a sine with a slow bloom, far back in the hall. */
  private glass(n: number, t: number, vol: number, pan: number) { const g = this.c.createGain(); this.osc('sine', hz(n), t, t + 5).connect(g); const g2 = this.c.createGain(); g2.gain.value = 0.25; this.osc('sine', hz(n + 12) * 1.003, t, t + 5).connect(g2).connect(g); this.env(g, t, 0.02, vol, 0.05, 3.6); this.send(g, 0.25, 1, pan); }
  /** The theme's voice: a horn, more or less. Saws that open as the note swells. */
  private horn(n: number, t: number, dur: number, vol: number) {
    const c = this.c, f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(350, t); f.frequency.linearRampToValueAtTime(1500 + 900 * vol, t + 0.35); f.frequency.linearRampToValueAtTime(700, t + dur + 0.6);
    for (const [m, d] of [[n, -6], [n, 6], [n - 12, 0]]) this.osc('sawtooth', hz(m), t, t + dur + 1.4, d).connect(f);
    f.connect(g); this.env(g, t, 0.18, vol * 0.2, dur, 0.9); this.send(g, 0.6, 0.75, -0.15);
  }
  /** Low strings, short: the engine of the wall. */
  private spic(n: number, t: number, vol: number, bright: number) {
    const c = this.c, f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.Q.value = 1.6; f.frequency.setValueAtTime(bright, t); f.frequency.exponentialRampToValueAtTime(Math.max(180, bright * 0.3), t + 0.16);
    for (const [m, d] of [[n, -8], [n, 8], [n + 12, 0]]) this.osc('sawtooth', hz(m), t, t + 0.4, d).connect(f);
    f.connect(g); this.env(g, t, 0.006, vol * 0.24, 0.03, 0.22); this.send(g, 0.8, 0.35);
  }
  /** A great drum. */
  private boom(t: number, vol: number) {
    const c = this.c, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(96, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.5); o.start(t); o.stop(t + 1.8); o.connect(g); this.env(g, t, 0.004, vol * 0.95, 0.05, 1.5); this.send(g, 0.9, 0.5);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g2 = c.createGain(); s.buffer = this.noise; f.type = 'lowpass'; f.frequency.value = 420; s.connect(f).connect(g2); s.start(t); s.stop(t + 0.5); this.env(g2, t, 0.002, vol * 0.5, 0.01, 0.3); this.send(g2, 0.7, 0.6);
  }
  private cymbal(t: number, vol: number) { const c = this.c, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; s.loop = true; f.type = 'highpass'; f.frequency.value = 5200; s.connect(f).connect(g); s.start(t); s.stop(t + 5); this.env(g, t, 0.01, vol * 0.16, 0.05, 3.8); this.send(g, 0.3, 0.9); }
  private riser(t: number, dur: number, vol: number) { const c = this.c, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; s.loop = true; f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(5200, t + dur); s.connect(f).connect(g); s.start(t); s.stop(t + dur + 0.1); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * 0.3, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.06); this.send(g, 0.5, 0.7); }

  // ---- the sequencer: one sixteenth at a time, a little ahead of the clock
  private tick() { const c = this.c; if (c.state !== 'running') { this.next = c.currentTime + 0.1; return; } while (this.next < c.currentTime + 0.25) { this.play(this.step, this.next); this.step++; this.next += STEP; } }
  private play(step: number, t: number) {
    if (this.done) return;
    const m = this.mood, s = step % 16, bar = Math.floor(step / 16), down = m === 'down';
    if (down && this.endAt >= 0 && step > this.endAt) return;
    // each layer moves towards what the movement asks of it, so a change of movement is a cross-fade and never a cut
    const want: Record<Mood, number[]> = { space: [0.8, 1, 0.55, 0, 0, 0, 0], wall: [0.7, 0.2, 0, 1, 1, 0.9, 0.35], fall: [0.9, 0.6, 0.5, 0.35, 0.3, 0.2, 0.3], drogue: [0.9, 0.7, 0.9, 0.3, 0.4, 0.4, 0.5], main: [1, 0.9, 1, 0, 0.25, 0.5, 0.8], down: [1, 1, 0, 0, 0, 0.6, 1], lost: [0, 0, 0, 0, 0, 0, 0] };
    Object.keys(this.lvl).forEach((k, i) => (this.lvl[k] += (want[m][i] - this.lvl[k]) * (s === 0 ? 0.6 : 0.12)));
    const L = this.lvl, [root, chord] = down ? HOME : BARS[bar % 4];
    if (s === 0) {
      const len = STEP * 16;
      if (L.pad > 0.05) this.pad([root, root + 7, ...chord.slice(0, 3)], t, len, 0.5 * L.pad, 500 + 1500 * L.theme + 900 * this.heat + (down ? 1400 : 0));
      if (L.pad > 0.05) { const g = this.c.createGain(); this.osc('sine', hz(root - 12), t, t + len + 1).connect(g); this.env(g, t, 0.4, 0.3 * L.pad, len - 0.4, 0.8); this.send(g, 1, 0.1); }
      if (L.choir > 0.1) this.choir(chord.slice(1), t, len, 0.5 * L.choir);
      if (L.brass > 0.1) this.horn(root + 12, t, len * 0.8, 0.9 * L.brass);
      if (down && bar % 2 === 0) this.cymbal(t, 0.4);
    }
    if (L.glass > 0.05 && (s === 2 || s === 7 || s === 11 || s === 14) && Math.random() < 0.75 * L.glass) this.glass(chord[Math.floor(Math.random() * chord.length)] + 12 + (Math.random() < 0.3 ? 12 : 0), t, 0.07 * L.glass, Math.random() * 1.6 - 0.8);
    if (L.theme > 0.1) for (const [at, n] of THEME[bar % 8]) if (at === s) this.horn(n + (m === 'main' ? 0 : -12), t, STEP * 7, L.theme);
    if (down && s % 4 === 0 && bar < 3) this.glass(HOME[1][(bar * 4 + s / 4) % 5] + 12, t, 0.09, (s / 4 - 1.5) * 0.4);
    if (L.ost > 0.1 && s % 2 === 0) { const acc = s % 8 === 0 ? 1 : s % 4 === 0 ? 0.75 : 0.5; this.spic(root + (s === 6 || s === 14 ? 7 : s === 10 ? 12 : 0), t, acc * L.ost * (0.6 + 0.5 * this.heat), 500 + 2600 * this.heat * acc); }
    if (L.drum > 0.15) { if (s === 0) this.boom(t, 0.8 * L.drum); if (s === 10 || (s === 14 && bar % 2 === 1)) this.boom(t, 0.5 * L.drum); if (bar % 4 === 3 && s === 12 && m === 'wall') this.riser(t, STEP * 4, 0.25); }
  }
}
