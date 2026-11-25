import Phaser from 'phaser';
import { W, H, T, just, finish, cam, img, panel } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import { P, S, tex, lg, rg, rr, el, line, text, rng, OUT } from '../art';
import type { C2 } from '../art';
import type { LevelDef } from '../content';
import { newSim, step, bot, command, throttle, pressure, tighten, strikes, stars, settles, wallC, LINEUP } from '../chillSim';
import type { Sim, Valve, Act, Ev } from '../chillSim';

const AUTO = new URLSearchParams(location.search).has('auto');
const SITE = 60, PY = 60, RH = 49; // the picture's height, the panel's top, a row's height
// where things stand along a row of the panel, left to right
const XS = 10, XSUP = 48, XDRN = 62, XFLOW = 80, X0 = 92, X1 = 210, XFILL = 218, XT = 236, TW = 26, XV = 274, XSTK = 288, XG = 298;
const JX = [106, 134, 162, 190, 229]; // the joints: four flanges along the line, then the quick disconnect where it meets the thing under test
const DEAD = 0x46506e, GAS = 0xd8dde6, COLD = 0xeaf7ff;
const ACT_NAME: Record<Act, string> = { lineup: 'FUNCTIONAL', chill: 'CRYOGENIC', press: 'HIGH PRESSURE' };
const TAG: Record<Valve | 'flow', string> = { supply: 'SUPPLY', drain: 'DRAIN', fill: 'FILL', vent: 'VENT', press: 'PRESSURANT', flow: 'FLOW' };
const mix = (a: number, b: number, t: number) => { const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t); return (ch(16) << 16) | (ch(8) << 8) | ch(0); };
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// ---------------------------------------------------------------- the setting
interface Theme {
  music: string; head: string; /** Who the player is: a game role, not a real person. */ plate: [name: string, role: string];
  /** What the lines run to, in capitals for the panel and in a sentence. */ unit: [caps: string, word: string];
  /** The place the panel is plumbed to, 320 x 60, with the sky behind the heading. */ site: (c: C2) => void;
  /** On that picture, where each line's vapour leaves, and the part that frosts over as its tank chills. */ vents: [x: number, y: number][]; frost: [x: number, y: number, w: number, h: number][];
  /** The tabs along the top of the panel, as the real console shows them, and which of them this panel is. */ tabs?: { name: string; all: string[]; lit: string[] };
  title: string; text: (time: string, lifts: number, bursts: number, spills: number, left: string) => string;
  fail: Record<'empty' | 'bursts' | 'time', [title: string, text: string]>;
}
/**
 * Launch Complex 3 on Wallops Island, looking east to the Atlantic at first light (the hour is the game's choice). What
 * Rocket Lab lists for the site: propellant farms for LOX and LNG, three vertical liquid-nitrogen tanks, a 9 m launch
 * mount, launch equipment vaults, and a water tower over 200 ft tall. From its video of the campaign: the thrust module
 * on the mount as a white drum under a conical cap, the red railing round the mount's deck, four masts ringing it, and
 * beside the pad a crane and the stand the second stage hangs in. There is no strongback, by design. Not to scale; the
 * pipe run and the two thin vent stacks are drawn as the game needs them.
 */
const lc3: Theme = {
  music: 'launch', head: 'LAUNCH COMPLEX 3 · WALLOPS ISLAND', plate: ['THE FLUIDS CONSOLE', 'a game role: nobody real'], unit: ['MODULE', 'module'],
  site: (c) => {
    const r = rng(41);
    c.fillStyle = lg(c, 0, 0, 0, 44, [0, '#1d2a52'], [0.5, '#5a5f8f'], [0.82, '#e59a7a'], [1, '#ffd7a0']); c.fillRect(0, 0, 320, 44);
    c.fillStyle = rg(c, 232, 44, 1, 70, [0, 'rgba(255,236,190,.95)'], [0.25, 'rgba(255,200,140,.4)'], [1, 'rgba(255,200,140,0)']); c.fillRect(0, 0, 320, 44);
    for (let i = 0; i < 7; i++) { const x = r() * 320, y = 21 + r() * 17, w = 20 + r() * 40; el(c, x, y, w / 2, 0.9 + r(), 'rgba(60,54,96,.45)'); el(c, x - 2, y + 0.9, w / 2.4, 0.6, 'rgba(255,190,140,.55)'); }
    c.fillStyle = lg(c, 0, 44, 0, 49, [0, '#f0b890'], [0.3, '#7d86a8'], [1, '#33507c']); c.fillRect(0, 44, 320, 5); // the Atlantic
    for (let i = 0; i < 40; i++) { const x = 232 + (r() - 0.5) * 70, y = 44.4 + r() * 4; line(c, x, y, x + 1 + r() * 4, y, 'rgba(255,232,190,.6)', 0.3); }
    c.fillStyle = lg(c, 0, 48, 0, 60, [0, '#c9bd8e'], [0.4, '#a9a074'], [1, '#6f6b50']); c.fillRect(0, 48, 320, 12); // a low barrier island
    for (let i = 0; i < 70; i++) { const x = r() * 320, y = 49 + r() * 10; el(c, x, y, 1.5 + r() * 3, 0.5 + r() * 0.5, i % 3 ? 'rgba(86,118,66,.55)' : 'rgba(140,150,84,.5)'); }
    rr(c, 100, 53.4, 150, 3, 0.6, lg(c, 0, 53, 0, 57, [0, '#c9cdd4'], [1, '#7e8698']), OUT, 0.25); // the pad's concrete
    // the propellant farms: horizontal tanks on saddles, LOX and LNG, and three vertical tanks of liquid nitrogen
    const tank = (x: number, y: number, w: number, h: number, tag: string, col: string) => { for (const sx of [x + 3, x + w - 4]) rr(c, sx, y + h - 0.6, 1.4, 2.8, 0, '#5b6275'); rr(c, x, y, w, h, h / 2, lg(c, 0, y, 0, y + h, [0, '#ffffff'], [0.55, '#dfe4ec'], [1, '#8f98ab']), OUT, 0.3); text(c, tag, x + w / 2, y + h / 2 + 0.2, 2.6, col, 700); };
    tank(10, 45.6, 30, 7.4, 'LOX', '#1d5a8a'); tank(46, 46.6, 26, 6.4, 'LNG', '#2f7a47');
    for (const x of [79, 85, 91]) { rr(c, x, 41.6, 4.4, 13.4, 2.1, lg(c, x, 0, x + 4.4, 0, [0, '#ffffff'], [1, '#98a1b3']), OUT, 0.3); rr(c, x + 0.6, 55, 3.2, 0.9, 0, '#5b6275'); }
    text(c, 'LN₂', 87.2, 39.4, 2.6, '#f4f6fa', 700);
    // the pipe run, on low supports, from the farms to the mount
    for (let x = 104; x < 176; x += 8) rr(c, x, 54.4, 0.8, 2.4, 0, '#5b6275');
    line(c, 40, 52.4, 98, 54.6, '#dfe4ec', 0.7); line(c, 72, 52.8, 98, 55.6, '#cfe0c8', 0.7); line(c, 98, 54.6, 178, 54.6, '#dfe4ec', 0.7); line(c, 98, 55.6, 178, 55.6, '#cfe0c8', 0.7);
    // the launch mount: 9 m of steel with a red-railed deck and no strongback, ringed by four masts
    for (const [x, top] of [[163, 20], [169, 22.4], [211, 22.4], [217, 20]]) { line(c, x, 55, x, top, '#8b93a7', 0.45); line(c, x, top, x, top + 3, '#d8452e', 0.7); el(c, x, top + 5, 0.9, 0.6, '#fff3cf'); }
    rr(c, 174, 42.6, 32, 11.4, 0.8, lg(c, 0, 42, 0, 54, [0, '#8b93a7'], [1, '#3a4052']), OUT, 0.3); rr(c, 183, 47.4, 14, 6.6, 0.3, '#12141b'); for (let x = 176.4; x < 204; x += 4.6) line(c, x, 43.4, x + 2.3, 46.6, 'rgba(255,255,255,.14)', 0.3);
    line(c, 174, 41.2, 206, 41.2, '#d8452e', 0.35); for (let x = 174.2; x <= 206; x += 3.2) line(c, x, 41.2, x, 42.6, '#d8452e', 0.3); // the railing
    // on it the thrust module, the foot of Neutron, as Rocket Lab's video shows it: a white drum under a conical cap
    rr(c, 179.4, 32.2, 21.2, 9, 0.8, lg(c, 179, 0, 201, 0, [0, '#ffffff'], [0.45, '#e9edf3'], [1, '#9aa3b5']), OUT, 0.35);
    c.beginPath(); c.moveTo(179.4, 32.6); c.lineTo(185, 27.8); c.lineTo(195, 27.8); c.lineTo(200.6, 32.6); c.closePath(); c.fillStyle = lg(c, 179, 0, 201, 0, [0, '#ffffff'], [1, '#a8b0c0']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.35; c.stroke();
    for (const y of [35.2, 38.2]) line(c, 179.8, y, 200.2, y, 'rgba(40,48,70,.2)', 0.25);
    line(c, 178, 55, 178, 43, '#dfe4ec', 0.6); // up through the mount, to the module's quick disconnects
    line(c, 224, 56, 224, 31, '#aab2c0', 0.5); line(c, 228, 56, 228, 33, '#aab2c0', 0.5); // vent stacks
    // beside the pad: the stand the second stage hangs in, and the crane that puts it there
    for (const x of [238, 246]) line(c, x, 55, x, 30, '#5b6275', 0.6); for (let y = 30; y < 54; y += 6) { line(c, 238, y, 246, y + 6, '#7e8698', 0.3); line(c, 246, y, 238, y + 6, '#7e8698', 0.3); } rr(c, 236.6, 29, 10.8, 1.4, 0.3, '#5b6275', OUT, 0.2);
    rr(c, 252, 51.6, 8, 3.6, 0.5, '#f2c230', OUT, 0.25); line(c, 255, 51.6, 246, 21, '#f2c230', 0.7); line(c, 246, 21, 246, 27, '#3a3f4f', 0.25);
    // the water tower
    line(c, 286, 55, 286, 28, '#d7dbe4', 1.8); line(c, 282.4, 55, 286, 42, '#aab2c0', 0.4); line(c, 289.6, 55, 286, 42, '#aab2c0', 0.4); el(c, 286, 24.4, 7, 4.6, lg(c, 279, 0, 293, 0, [0, '#ffffff'], [1, '#a8b0c0']), OUT, 0.3); rr(c, 283.6, 28, 4.8, 2, 0.4, '#c2c8d2', OUT, 0.25);
    for (const x of [126, 146, 302]) rr(c, x, 51.2, 12, 3.6, 0.4, '#c9cdd4', OUT, 0.25); // launch equipment vaults: low concrete
  },
  vents: [[224, 30], [228, 32]], frost: [[179.6, 36.8, 20.8, 4.2], [179.6, 32.6, 20.8, 4.2]],
  tabs: { name: 'LC3 GC HMI', all: ['OVERVIEW', 'HYDRAULICS', 'DELUGE', 'GHE', 'HVAC', 'LNG', 'LOX', 'NITROGEN', 'TTS', 'SYSTEM'], lit: ['LNG', 'LOX'] }, // the heading and tabs of the console in Rocket Lab's video
  title: 'Chilled, held and tight',
  text: (time, lifts, bursts, spills, left) => `Line-up, chilldown and pressure steps in ${time}. Relief valves lifted ${lifts === 0 ? 'not once' : lifts === 1 ? 'once' : lifts + ' times'}${bursts ? `, ${bursts === 1 ? 'one joint' : bursts + ' joints'} let go` : ''}${spills ? `, and some went down a drain` : ''}. Left in the farm: ${left}.`,
  fail: {
    empty: ['You vented it all', 'The store ran dry before the module was cold right through: every time a relief valve lifts, part of the store goes up the vent stack. Start each line from a trickle, open up only as the line frosts over, and ease back just before the liquid reaches the warm module.'],
    bursts: ['Test stood down', 'Too many joints let go. A leak shows twice: the pressure sags under its step, and the sniffer at one joint lights up. Vent that line right down, re-make the joint, and only then bring the pressure back.'],
    time: ['Out of time', 'The test window closed with the work unfinished. A cold line takes far more flow than a warm one: keep opening the valve as the pressure falls away.'],
  },
};
const THEMES: Record<string, Theme> = { lc3 };

type Item = Valve | 'flow' | number; // what the cursor can stand on: a valve, the flow valve, or a joint by number
const ITEMS: Record<Act, Item[]> = { lineup: ['supply', 'drain', 'fill', 'vent', 'press'], chill: ['flow'], press: [0, 1, 2, 3, 4, 'vent', 'press'] };

/**
 * A loading console: one or two cryogenic lines on a piping diagram, under a picture of the place they are plumbed to.
 * The level's params say which of three tests are worked and with what numbers (chillSim.ts has the model and the bot):
 * a functional line-up of the valves, a chilldown metered by hand against a relief valve, and a pressure test
 * in held steps with leaks to find. The place, its picture and its words are a theme.
 */
export class ChillDownScene extends Phaser.Scene {
  def!: LevelDef; th!: Theme; sim!: Sim; line = 0; k = 0; ended = false; hinted: Record<string, boolean> = {}; alarmT = 0; clock = 0;
  g!: Phaser.GameObjects.Graphics; fg!: Phaser.GameObjects.Graphics; call!: Phaser.GameObjects.Text; actT: Phaser.GameObjects.Text[] = []; clockT!: Phaser.GameObjects.Text;
  rows: { title: Phaser.GameObjects.Text; status: Phaser.GameObjects.Text; store: Phaser.GameObjects.Text; tank: Phaser.GameObjects.Text; temp: Phaser.GameObjects.Text; gauge: Phaser.GameObjects.Text; tags: Record<string, Phaser.GameObjects.Text>; puff: Phaser.GameObjects.Particles.ParticleEmitter; plume: Phaser.GameObjects.Particles.ParticleEmitter }[] = [];
  hiss!: Loop; hum!: Loop;
  constructor() { super('ChillDown'); }
  get act() { return this.sim.act; }
  /** The controls panel (H or the ? button): what the keys do in the test being worked now. */
  help(): { title: string; rows: [keys: string, does: string][]; note?: string } {
    const two = this.sim.lines.length > 1, pick: [string, string][] = two ? [['↑ ↓', 'Choose a line.']] : [];
    if (this.act === 'lineup') return { title: 'Functional test: the line-up', rows: [...pick, ['← →', 'Choose a valve.'], ['Space', 'Command the chosen valve open or shut. It takes a moment to travel.']], note: 'Each line needs a way open from the farm to the far end (supply and fill), its drain shut, its vent open and the pressurant shut. Shut a drain before you open the supply above it. A valve that does not answer wants commanding again.' };
    if (this.act === 'chill') return { title: 'Cryogenic test: chilldown', rows: [...pick, ['→', 'Open the flow valve a notch.'], ['←', 'Close it a notch.'], ['Enter', 'Shut the flow valve at once.']], note: 'Liquid boils in a warm line, and the vapour is the pressure on the gauge. The white arrow beside the gauge shows where the pressure is heading with the valve as it is now: keep the arrow under the red line and the pressure will stay there too. Open up as the line frosts over, and close a notch or two when the arrow climbs again as the liquid reaches the far end, which is still warm. A lift trips the flow valve shut for a few seconds and vents part of the store: more, the harder you were pushing.' };
    return { title: 'Pressure test: step, hold, look for leaks', rows: [...pick, ['← →', 'Move along the joints and the two valves at the far end.'], ['Space on PRESSURANT', 'Raise the pressure to the next step, once the present step has been held.'], ['Space on VENT', 'Vent the line right down.'], ['Space on a joint', 'Re-make it: only with the line vented right down.'], ['I', 'A hint: which joint, and what to do next.']], note: 'A step is held when the ring closes. A leak shows as pressure sagging under its step and a sniffer lighting up at one joint; it grows faster the higher the pressure.' };
  }
  /** A hint (I, or the 💡 button): the next thing to do where the player is now, named. It costs nothing. */
  hint(): { title: string; text: string } | undefined {
    const s = this.sim, N = s.p.notches;
    if (this.act === 'lineup') {
      for (const l of s.lines) for (const k of ['drain', 'press', 'vent', 'fill', 'supply'] as Valve[]) if (l.v[k].open !== LINEUP[k] && !l.v[k].t) return { title: `${l.d.short}: ${LINEUP[k] ? 'open' : 'shut'} ${TAG[k]}`, text: `On the ${l.d.short} line, move to ${TAG[k]} (← →, and ↑ ↓ to change line) and press Space.${k === 'drain' ? ' Drains come first: liquid let into a line whose drain is open goes down the drain.' : k === 'supply' ? ' The supply goes last, once the drain below it is shut.' : ''} A valve that does not answer wants Space again.` };
      return { title: 'Lined up', text: 'Every valve is where it should be. The next test starts by itself.' };
    }
    if (this.act === 'chill') {
      const best = (l: Sim['lines'][0]) => { let n = 0; while (n < N && settles(s, l, n + 1) <= 0.85) n++; return n; };
      const open = s.lines.filter((l) => !l.loaded), l = open.find((q) => settles(s, q, q.q) > 1) || open.sort((a, b) => Math.abs(best(b) - b.q) - Math.abs(best(a) - a.q))[0];
      if (!l) return { title: 'Cold right through', text: 'Both lines are done. The next test starts by itself.' };
      const n = best(l);
      return { title: `${l.d.short}: flow ${n} of ${N}`, text: `Right now the ${l.d.short} line takes ${n} of ${N} notches (it is on ${l.q}): ${n > l.q ? '→ to open' : n < l.q ? '← to close' : 'leave it there for the moment'}. The number goes up as the line frosts over, and comes down for a while when the liquid reaches the ${this.th.unit[1]}. You never need the number: keep the white arrow beside the gauge just under the red line, and look at the other line every few seconds.` };
    }
    const leaky = s.lines.find((l) => l.leak);
    if (leaky) { const j = s.p.joints[leaky.leak!.joint]; return { title: `${leaky.d.short}: the leak is at ${j.toLowerCase()}`, text: leaky.pp > s.p.safe ? `Go to the ${leaky.d.short} line (↑ ↓), move to VENT (← →) and press Space once: the line vents right down. When the gauge reaches the blue mark, move to ${j.toLowerCase()} (${leaky.leak!.joint < 4 ? `the ${['first', 'second', 'third', 'fourth'][leaky.leak!.joint]} joint from the left` : 'the last joint before the ' + this.th.unit[1]}) and press Space.` : `The ${leaky.d.short} line is vented. Move to ${j.toLowerCase()} (${leaky.leak!.joint < 4 ? `the ${['first', 'second', 'third', 'fourth'][leaky.leak!.joint]} joint from the left` : 'the last joint before the ' + this.th.unit[1]}) with ← → and press Space. Then Space on PRESSURANT to bring the pressure back.` }; }
    const ready = s.lines.find((l) => l.set <= l.held && l.held < s.p.steps);
    if (ready) return { title: `${ready.d.short}: next step`, text: `On the ${ready.d.short} line (↑ ↓), move to PRESSURANT (← →) and press Space. Then leave it alone until the ring closes.` };
    return { title: 'Wait for the ring', text: 'Each step has to hold until its ring closes. While you wait, watch both gauges: one that sinks under its yellow mark means a joint on that line is leaking.' };
  }
  init(d: { def: LevelDef }) { this.def = d.def; this.th = THEMES[d.def.params.theme]; this.sim = newSim(d.def.params); this.line = 0; this.k = 0; this.ended = false; this.hinted = {}; this.alarmT = 0; this.clock = 0; this.rows = []; this.actT = []; }
  /** A row's top, and its pipe's height. One line sits in the middle of the panel. */
  top(i: number) { return PY + 2 + (this.sim.lines.length > 1 ? i * RH : RH / 2); }
  say(s: string) { this.call.setText(s); }
  mk(key: string, w: number, h: number, fn: (c: C2) => void) { if (!this.textures.exists(key)) tex(this, key, w, h, fn); return key; }

  create() {
    cam(this); stopLoops(); music.play(this.th.music, 0); this.hiss = loop('hiss'); this.hum = loop('whine'); this.hum.set(0, 0.2);
    this.cameras.main.setBackgroundColor('#080b16');
    const th = this.th, s = this.sim;
    img(this, 0, 0, this.mk('cd_site_' + this.def.params.theme, W, SITE, th.site)).setOrigin(0);
    this.g = this.add.graphics().setDepth(3); this.fg = this.add.graphics().setDepth(6);
    panel(this, 4, 4, W - 8, 14, 0.9).setDepth(8); T(this, 9, 6.6, th.head, '#ffffff', 5.6, '700').setDepth(9);
    let ax = 148; s.p.acts.forEach((a, i) => { const t = T(this, ax, 7.4, `${i + 1} ${ACT_NAME[a]}`, '#7483a6', 4.4, '700').setDepth(9); this.actT.push(t); ax += t.width + 7; });
    this.clockT = T(this, W - 9, 7.4, '', '#ffe98a', 4.4, '700').setOrigin(1, 0).setDepth(9);
    panel(this, 4, PY, W - 8, 100, 0.94).setDepth(2);
    if (th.tabs) { // the real console's heading and tabs, with this panel's lit
      this.add.graphics().setDepth(2).fillStyle(0x0b0e18, 0.94).fillRoundedRect(4, PY - 5, W - 8, 7, { tl: 2, tr: 2, bl: 0, br: 0 });
      let tx = T(this, 9, PY - 3.8, th.tabs.name, '#cfd6e6', 3, '700').setDepth(5).width + 16;
      for (const name of th.tabs.all) { const lit = th.tabs.lit.includes(name), t = T(this, tx, PY - 3.8, name, lit ? '#ffe98a' : '#5f6b8c', 3, '700').setDepth(5); if (lit) this.add.graphics().setDepth(5).fillStyle(0xffe98a, 1).fillRect(tx, PY + 0.4, t.width, 0.4); tx += t.width + 6; }
    }
    s.lines.forEach((l, i) => {
      const Y = this.top(i), A = Y + 30, col = hex(l.d.color), tag = (x: number, y: number, str: string) => T(this, x, y, str, '#aab4d4', 3.2, '700').setOrigin(0.5, 0).setDepth(5);
      const tags: Record<string, Phaser.GameObjects.Text> = { supply: tag(XSUP, A - 11.4, TAG.supply), drain: tag(XDRN + 4.6, A + 7, TAG.drain).setOrigin(0, 0), flow: tag(XFLOW, A - 18.4, TAG.flow), fill: tag(XFILL, A - 11.4, TAG.fill), vent: tag(XV, A - 10, TAG.vent), press: tag(XV, A + 12, TAG.press) };
      this.rows.push({
        title: T(this, 9, Y + 1.4, `${l.d.name} · boils at ${String(l.d.boil).replace('-', '−')} °C`, col, 4.4, '700').setDepth(5),
        status: T(this, XT - 6, Y + 1.8, '', '#ffffff', 3.6, '700').setOrigin(1, 0).setDepth(5),
        store: T(this, XS + 11, A + 15, '', '#aab4d4', 3.2, '700').setOrigin(0.5, 0).setDepth(5),
        tank: T(this, XT + TW / 2, A - 5.4, '', '#ffffff', 4.6, '700').setOrigin(0.5, 0).setAlign('center').setLineSpacing(-0.4).setDepth(5).setShadow(0, 0.6, '#000000', 2),
        temp: T(this, (X0 + X1) / 2, A + 4.6, '', '#aab4d4', 3.6, '700').setOrigin(0.5, 0).setDepth(5),
        gauge: T(this, XG + 3.5, A + 9.6, '', '#ffffff', 3.4, '700').setOrigin(0.5, 0).setAlign('center').setLineSpacing(-0.6).setDepth(5),
        tags,
        puff: this.add.particles(XSTK, A - 25, 'puff', { speedY: { min: -16, max: -7 }, speedX: { min: -3, max: 5 }, lifespan: 700, scale: { start: S * 0.18, end: S * 0.6 }, alpha: { start: 0.75, end: 0 }, frequency: 70, emitting: false }).setDepth(4),
        plume: this.add.particles(th.vents[i][0], th.vents[i][1], 'puff', { speedY: { min: -9, max: -4 }, speedX: { min: 2, max: 8 }, lifespan: 1700, scale: { start: S * 0.2, end: S * 1.1 }, alpha: { start: 0.8, end: 0 }, frequency: 90, emitting: false }).setDepth(1),
      });
      T(this, XS + 11, A - 21.6, 'FARM', '#aab4d4', 3.2, '700').setOrigin(0.5, 0).setDepth(5); T(this, XT + TW / 2, A - 24.6, th.unit[0], '#aab4d4', 3.2, '700').setOrigin(0.5, 0).setDepth(5);
    });
    this.call = T(this, W / 2, 162.4, '', '#ffe98a', 4.9, '700').setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(306).setLineSpacing(-0.2).setShadow(0, 1, '#000000', 3).setDepth(9);
    const plate = [panel(this, 4, 22, 104, 20, 0.9).setDepth(48), T(this, 9, 25, th.plate[0], '#ffffff', 6.4, '700').setDepth(49), T(this, 9, 33.6, th.plate[1], '#ffe98a', 4.2).setDepth(49)];
    plate.forEach((o) => o.setAlpha(0)); this.tweens.add({ targets: plate, alpha: 1, duration: 250 }); this.tweens.add({ targets: plate, alpha: 0, delay: 4200, duration: 600, onComplete: () => plate.forEach((o) => o.destroy()) });
    this.events.once('shutdown', () => { this.rows = []; });
    this.hear(); this.draw();
  }

  /** Where the cursor's item is on row `i`. */
  at(it: Item, i: number): [number, number] {
    const A = this.top(i) + 30;
    return typeof it === 'number' ? [JX[it], A] : it === 'supply' ? [XSUP, A] : it === 'drain' ? [XDRN, A + 9] : it === 'flow' ? [XFLOW, A] : it === 'fill' ? [XFILL, A] : it === 'vent' ? [XV, A - 14] : [XV, A + 8];
  }
  /** Sounds and call-outs for what the model says has happened. */
  hear() {
    const s = this.sim, S_ = s.p.steps, u = this.th.unit[1];
    for (const e of s.ev as Ev[]) {
      const l = 'line' in e ? s.lines[e.line] : undefined, n = l?.d.short;
      if (e.kind === 'act') {
        this.k = e.act === 'press' ? ITEMS.press.indexOf('press') : e.act === 'lineup' ? ITEMS.lineup.indexOf('drain') : 0;
        this.actT.forEach((t, i) => t.setColor(i === s.ai ? '#ffe98a' : i < s.ai ? '#7cc56b' : '#7483a6'));
        if (e.act !== 'done' && s.ai > 0) snd.select();
        if (e.act === 'lineup') this.say(`FUNCTIONAL TEST. Shut each DRAIN first. Then give each line a way from the farm to the ${u} (SUPPLY and FILL open), VENT open, PRESSURANT shut.\n← → choose a valve · ↑ ↓ change line · SPACE commands it · I for a hint`);
        else if (e.act === 'chill') { music.play(this.th.music, 1); this.say('CRYOGENIC TEST. Two or three notches to start, more as a line frosts over. Keep the white arrow under the red line.\n→ opens the flow valve a notch · ← closes one · ↑ ↓ change line · ENTER shuts it at once'); }
        else if (e.act === 'press') { music.play(this.th.music, 2); this.say(`PRESSURE TEST. ${S_} steps to test pressure, each one held. Watch the joints.\nSPACE on PRESSURANT raises a step · on VENT vents the line right down · on a joint re-makes it, once vented`); }
        else this.done();
      } else if (e.kind === 'moved') snd.click();
      else if (e.kind === 'stuck') { snd.deny(); this.say(`${n} ${TAG[e.valve]} did not answer. That is what a functional test is for: command it again.`); }
      else if (e.kind === 'spill') { snd.alarm(); this.say(`${n} is going down the drain! Shut the drain valve.`); }
      else if (e.kind === 'near') this.say(`${n}: the cold is nearly at the ${u}, and the ${u} is still warm. Watch the white arrow climb, and close a notch or two as it nears the red line.`);
      else if (e.kind === 'liquid') { snd.pickup(); this.say(`${n}: liquid at the ${u}. Open up again as it cools.`); }
      else if (e.kind === 'lift') { snd.boom(); this.cameras.main.shake(260, 0.006); this.rows[e.line].plume.explode(26); this.rows[e.line].puff.explode(14); this.say(`${n} RELIEF VALVE LIFTED: too much liquid into warm metal. The flow valve has tripped shut for a few seconds and part of the store has gone up the stack. Start again from two notches.`); }
      else if (e.kind === 'loaded') { snd.power(); this.say(`${n}: cold right through the ${u}, and running clear.`); }
      else if (e.kind === 'held') { snd.pickup(); this.say(l!.held >= S_ ? `${n}: at test pressure, and holding.` : `${n}: step ${l!.held} of ${S_} held. Next step.`); }
      else if (e.kind === 'fixed') { snd.clank(); this.say(`${n}: ${s.p.joints[e.joint].toLowerCase()} re-made. Bring the pressure back up.`); }
      else if (e.kind === 'wasted') { snd.dud(); this.say(`${n}: ${s.p.joints[e.joint].toLowerCase()} was tight. The sniffer shows which joint it is.`); }
      else if (e.kind === 'burst') { snd.boom(); this.cameras.main.shake(320, 0.008); this.rows[e.line].plume.explode(30); this.rows[e.line].puff.explode(16); this.say(`${n}: the joint let go. The line has vented itself and the seal is being replaced. Bring it back up from the bottom.`); }
    }
    s.ev.length = 0;
  }
  done() {
    this.ended = true; const s = this.sim; this.draw(); this.hiss.set(0.5); this.hum.set(0);
    this.rows.forEach((r) => { r.plume.emitting = true; r.puff.emitting = true; }); // everything is vented down at the end of the day
    this.say('Every step held. Test complete: venting down.');
    const left = s.lines.map((l) => `${l.d.short} ${Math.round(l.store * 100)}%`).join(', '), clean = strikes(s) === 0 && s.wasted === 0;
    this.time.delayedCall(1700, () => finish(this, this.def, { success: true, stars: stars(s), egg: clean, title: this.th.title, text: this.th.text(mmss(s.t), s.lifts, s.bursts, s.spills, left) + (stars(s) < 3 ? ` Three stars: no more than two strikes, inside ${mmss(s.p.par)}.` : '') }));
  }
  fail() {
    this.ended = true; this.draw(); this.hiss.set(0); this.hum.set(0); const [title, text] = this.th.fail[this.sim.failed!];
    this.time.delayedCall(900, () => finish(this, this.def, { success: false, title, text }));
  }

  update(_t: number, dms: number) {
    if (this.ended) return;
    const dt = Math.min(0.05, dms / 1000), s = this.sim, n = s.lines.length, act = this.act as Act, items = ITEMS[act];
    this.clock += dt;
    if (AUTO) bot(s, dt);
    else {
      if (n > 1 && (just('up') || just('down'))) { this.line = (this.line + (just('down') ? 1 : n - 1)) % n; snd.tick(); }
      const dx = (just('right') ? 1 : 0) - (just('left') ? 1 : 0), i = this.line, l = s.lines[i];
      if (act === 'chill') {
        if (dx) { if (throttle(s, i, dx)) snd.tick(); else snd.deny(); }
        if (just('b') && l.q > 0) { l.q = 0; snd.click(); }
      } else {
        if (dx) { this.k = (this.k + dx + items.length) % items.length; snd.tick(); }
        if (just('a')) {
          const it = items[this.k];
          if (act === 'lineup') { if (command(s, i, it as Valve)) snd.select(); else snd.deny(); }
          else if (typeof it === 'number') { const r = tighten(s, i, it); if (r === 'pressure') { snd.deny(); this.say(`Not under pressure. Vent ${l.d.short} first: SPACE on VENT, then wait for the gauge to reach the blue mark.`); } else if (r !== true) snd.deny(); }
          else {
            const r = pressure(s, i, it === 'press' ? 1 : -1);
            if (r === true) snd.select(); else { snd.deny(); if (r === 'hold') this.say(`${l.d.short}: this step has not been held yet. Wait for the ring to close.`); else if (r === 'leak') this.say(`${l.d.short} will not hold: it is leaking. Find the joint, vent down, re-make it.`); else if (r === 'top') this.say(`${l.d.short} is at test pressure. It only has to hold.`); }
          }
        }
      }
    }
    step(s, dt); this.hear();
    // a leak nobody has gone after gets one prompt, and no more
    s.lines.forEach((l, i) => { if (l.leak && l.leak.sev > 0.12 && !this.hinted[i + ':' + l.leak.joint]) { this.hinted[i + ':' + l.leak.joint] = true; snd.alarm(); this.say(`${l.d.short} is sagging under its step: a joint is leaking. Find the lit sniffer, vent the line (SPACE on VENT), then SPACE on that joint.`); } });
    if (act === 'chill' && s.lines.some((l) => !l.loaded && l.lift <= 0 && (l.p > 0.9 || settles(s, l, l.q) > 1)) && (this.alarmT -= dt) <= 0) { this.alarmT = 0.5; snd.alarm(); }
    const vent = Math.max(...s.lines.map((l) => (act === 'chill' ? l.p * 0.7 + (l.lift > 0 ? 0.6 : 0) : act === 'press' ? (l.leak ? 0.25 + l.leak.sev * 0.5 : 0) : l.spilling ? 0.6 : 0)));
    this.hiss.set(Math.min(1, vent)); this.hum.set(act === 'chill' ? Math.max(...s.lines.map((l) => l.q / s.p.notches)) * 0.5 : 0, 0.3);
    if (s.failed) return this.fail();
    if (!this.ended) this.draw();
  }

  draw() {
    const g = this.g, fg = this.fg, s = this.sim, act = this.act, now = this.clock, N = s.p.notches, St = s.p.steps;
    g.clear(); fg.clear();
    const valve = (x: number, y: number, v: { open: boolean; t: number }, up = false) => {
      const col = v.t > 0 ? (Math.floor(now * 10) % 2 ? P.yellow : 0x7a6a25) : v.open ? P.lgreen : 0x1a2032, a = 3.2, b = 2.5;
      g.fillStyle(col, 1).lineStyle(0.45, v.open || v.t > 0 ? 0x0b0e18 : 0xcfd6e6, 1);
      if (up) { g.fillTriangle(x - b, y - a, x + b, y - a, x, y).strokeTriangle(x - b, y - a, x + b, y - a, x, y); g.fillTriangle(x - b, y + a, x + b, y + a, x, y).strokeTriangle(x - b, y + a, x + b, y + a, x, y); }
      else { g.fillTriangle(x - a, y - b, x - a, y + b, x, y).strokeTriangle(x - a, y - b, x - a, y + b, x, y); g.fillTriangle(x + a, y - b, x + a, y + b, x, y).strokeTriangle(x + a, y - b, x + a, y + b, x, y); }
    };
    const pipe = (x0: number, y0: number, x1: number, y1: number, col: number, w = 1.5) => g.lineStyle(w, col, 1).lineBetween(x0, y0, x1, y1);
    s.lines.forEach((l, i) => {
      const Y = this.top(i), A = Y + 30, R = this.rows[i], c = l.d.color, v = l.v, f = l.q / N;
      const live = v.supply.open, flowing = act === 'chill' && f > 0, pressed = act === 'press' || act === 'done';
      // ---- the store at the farm
      g.fillStyle(0x0d1322, 1).fillRoundedRect(XS, A - 17, 22, 30, 5); g.fillStyle(c, 0.85).fillRoundedRect(XS + 1, A + 12 - 28 * l.store, 20, Math.max(0.1, 28 * l.store), Math.min(4, 14 * l.store));
      g.lineStyle(0.5, l.store < 0.2 ? P.red : 0xcfd6e6, 1).strokeRoundedRect(XS, A - 17, 22, 30, 5);
      R.store.setText(`${Math.round(l.store * 100)}% LEFT`).setColor(l.store < 0.2 ? '#ff8a70' : '#aab4d4');
      // ---- supply, the drain tee, the flow valve
      pipe(XS + 22, A, XSUP, A, c); pipe(XSUP, A, XFLOW, A, live ? c : DEAD); pipe(XDRN, A, XDRN, A + 13, live && v.drain.open ? c : DEAD);
      g.lineStyle(0.5, 0xcfd6e6, 0.8).lineBetween(XDRN - 2.6, A + 13.4, XDRN + 2.6, A + 13.4).lineBetween(XDRN - 1.4, A + 14.6, XDRN + 1.4, A + 14.6);
      if (l.spilling) for (let k = 0; k < 3; k++) g.fillStyle(c, 0.9).fillCircle(XDRN + Math.sin(now * 9 + k * 2) * 1.6, A + 15.4 + ((now * 14 + k * 3) % 6), 0.6);
      valve(XSUP, A, v.supply); valve(XDRN, A + 9, v.drain, true);
      valve(XFLOW, A, { open: l.q > 0, t: 0 }); g.lineStyle(0.45, 0xcfd6e6, 1).lineBetween(XFLOW, A - 0.4, XFLOW, A - 4.4); g.fillStyle(l.lift > 0 ? P.red : 0x2a3350, 1).fillRoundedRect(XFLOW - 3, A - 7.6, 6, 3.4, 1.4).lineStyle(0.4, 0xcfd6e6, 1).strokeRoundedRect(XFLOW - 3, A - 7.6, 6, 3.4, 1.4);
      for (let k = 0; k < N; k++) g.fillStyle(k < l.q ? (k >= N - 2 ? P.yellow : P.lgreen) : 0x1a2032, 1).fillRect(XFLOW - N * 1.5 + k * 3, A - 13.2, 2.2, 3.4 + 0); // the notches
      // ---- the transfer line: cold from the farm end, as far as the chill has got
      const cold = X0 + (X1 - X0) * Math.min(1, l.chill);
      pipe(XFLOW, A, X0, A, flowing || pressed ? c : DEAD); pipe(X0, A, X1, A, flowing ? mix(c, 0x10131c, 0.35) : pressed ? mix(GAS, 0x10131c, 0.5 - 0.3 * l.pp) : DEAD, 3);
      if (l.chill > 0 && !pressed) { pipe(X0, A, cold, A, COLD, 3); g.fillStyle(0xffffff, 0.9); for (let x = X0 + 2; x < cold - 1; x += 5) g.fillCircle(x + Math.sin(x) * 0.8, A - 1.9, 0.5); if (l.chill < 1) g.fillStyle(0xffffff, 0.5 + 0.4 * Math.sin(now * 9)).fillCircle(cold, A, 2.2); }
      if (pressed) pipe(X0, A, X1, A, mix(COLD, c, 0.45), 3);
      if (flowing) { g.fillStyle(0x10131c, 0.55); for (let x = X0 + ((now * (10 + f * 34)) % 8); x < X1 - 2; x += 8) g.fillRect(x, A - 0.5, 2.6, 1); }
      pipe(X1, A, XT, A, (flowing && l.chill >= 0.98) || pressed ? c : DEAD); valve(XFILL, A, v.fill);
      // ---- joints, and in a pressure test their sniffers
      JX.forEach((x, j) => {
        const leak = l.leak && l.leak.joint === j ? l.leak.sev : -1, sel = act === 'press' && this.line === i && !AUTO && ITEMS.press[this.k] === j, ly = A - (j < 4 ? 6.6 : 7.6);
        g.fillStyle(0x8b93a7, 1).lineStyle(0.3, 0x0b0e18, 1);
        if (j < 4) g.fillRect(x - 1, A - 3.3, 2, 6.6).strokeRect(x - 1, A - 3.3, 2, 6.6); else for (const dx of [-1.9, 0.5]) g.fillRect(x + dx, A - 4.3, 1.4, 8.6).strokeRect(x + dx, A - 4.3, 1.4, 8.6); // a quick disconnect: two halves that part
        if (act !== 'press') return;
        if (leak >= 0) { const k = Math.min(1, leak * 1.4); fg.fillStyle(mix(0xf2d14a, 0xff3a2a, k), 0.5 + 0.5 * Math.abs(Math.sin(now * (4 + k * 8)))).fillCircle(x, ly, 1.3 + k * 1.1); fg.lineStyle(0.5, 0xffb347, 0.9 * (1 - ((now * 1.4) % 1))).strokeCircle(x, A, 4 + ((now * 1.4) % 1) * 5); for (let w = 0; w < 3; w++) { const u = (now * 0.9 + w / 3) % 1; fg.fillStyle(0xffffff, (1 - u) * (0.15 + k * 0.6)).fillCircle(x + Math.sin(u * 5 + w) * (1 + k * 2), ly - 1.5 - u * (3 + k * 5), 0.5 + u * (0.8 + k)); } }
        else fg.fillStyle(l.fixed.includes(j) ? P.lgreen : 0x2f6b3a, 1).fillCircle(x, ly, 0.7);
        if (l.mended > 0 && l.fixed[l.fixed.length - 1] === j) fg.lineStyle(0.5, P.lgreen, l.mended / 2).strokeCircle(x, A, 5 + (2 - l.mended) * 2);
        if (sel) fg.lineStyle(0.7, 0xffe98a, 1).strokeRoundedRect(x - 4.4, A - 9.4, 8.8, 15, 1.6);
      });
      // ---- the thing under test: level, frost, and in a pressure test the ring that closes as a step is held
      g.fillStyle(0x0d1322, 1).fillRoundedRect(XT, A - 20, TW, 34, 8);
      if (l.level > 0.01) g.fillStyle(c, 0.8).fillRoundedRect(XT + 1, A + 13 - 32 * l.level, TW - 2, 32 * l.level, Math.min(7, 16 * l.level));
      if (l.tank > 0) g.fillStyle(0xffffff, 0.22 * l.tank).fillRoundedRect(XT, A - 20, TW, 34, 8);
      g.lineStyle(0.6, l.tank > 0.5 ? COLD : 0xcfd6e6, 1).strokeRoundedRect(XT, A - 20, TW, 34, 8);
      if (act === 'press') {
        const cx = XT + TW / 2, cy = A - 2, frac = l.held >= St ? 1 : l.set > l.held ? l.holdT / s.p.hold : 0;
        fg.lineStyle(1.1, 0x10131c, 0.7).strokeCircle(cx, cy, 9.6); if (frac > 0) { fg.lineStyle(1.1, l.held >= St ? P.lgreen : 0xffe98a, 1).beginPath(); fg.arc(cx, cy, 9.6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac)); fg.strokePath(); }
        R.tank.setText(l.busy > 0 && l.pp < 0.1 && l.set === 0 && l.held < St ? '…' : l.held >= St ? 'HELD' : `STEP\n${l.set}/${St}`).setFontSize(l.held >= St ? '4.4px' : '3.8px').setY(A - (l.held >= St ? 4.6 : 6.4));
      } else R.tank.setText(act === 'done' ? 'HELD' : l.loaded ? 'COLD' : l.level > 0.005 ? `${Math.round(l.level * 100)}%` : '').setFontSize('4.6px').setY(A - 5.4);
      // ---- the vent and its stack, the pressurant
      const venting = (act === 'chill' && (l.p > 0.04 || l.lift > 0)) || (act === 'press' && l.pp > l.set / St + 0.04) || act === 'done';
      pipe(XT + TW, A - 14, XSTK, A - 14, venting && v.vent.open ? GAS : venting ? GAS : DEAD); pipe(XSTK, A - 14, XSTK, A - 24, venting ? GAS : DEAD); g.fillStyle(venting ? GAS : DEAD, 1).fillTriangle(XSTK - 1.8, A - 23.6, XSTK + 1.8, A - 23.6, XSTK, A - 26.6);
      const feeding = act === 'press' && l.set > 0 && l.pp < l.set / St - 0.02;
      pipe(XT + TW, A + 8, XSTK - 2.4, A + 8, feeding ? GAS : DEAD); g.fillStyle(0x2a3350, 1).fillRoundedRect(XSTK - 2.6, A + 3.4, 5.2, 9.6, 2.4).lineStyle(0.4, 0xcfd6e6, 1).strokeRoundedRect(XSTK - 2.6, A + 3.4, 5.2, 9.6, 2.4);
      valve(XV, A - 14, act === 'press' ? { open: venting, t: 0 } : act === 'done' ? { open: true, t: 0 } : v.vent); valve(XV, A + 8, act === 'press' ? { open: feeding || (l.set > 0 && !venting), t: 0 } : v.press);
      R.puff.emitting = venting && (act !== 'chill' || l.p > 0.12); R.puff.frequency = 150 - 110 * Math.min(1, act === 'chill' ? l.p : 0.6);
      R.plume.emitting = R.puff.emitting; R.plume.frequency = R.puff.frequency * 1.3;
      // ---- frost on the thing itself, in the picture
      const [fx, fy, fw, fh] = this.th.frost[i]; if (l.tank > 0) g.fillStyle(0x8fd0ff, 0.42 * l.tank).fillRect(fx, fy, fw, fh);
      // ---- the gauge
      const gy = A - 20, gh = 28, yv = (p: number) => gy + gh * (1 - Phaser.Math.Clamp(p, 0, 1.04) / 1.04);
      g.fillStyle(0x05070d, 1).fillRoundedRect(XG, gy, 7, gh, 2).lineStyle(0.4, 0x5f6b8c, 1).strokeRoundedRect(XG, gy, 7, gh, 2);
      if (act === 'press' || act === 'done') {
        const pt = l.set / St, ok = Math.abs(l.pp - pt) < s.p.band, col = l.pp <= s.p.safe + 0.005 && l.set <= 1 && l.leak ? P.blue : l.leak ? P.orange : ok ? P.lgreen : 0xcfd6e6;
        g.fillStyle(col, 1).fillRoundedRect(XG + 1, yv(l.pp), 5, Math.max(0.2, gy + gh - yv(l.pp)), 1);
        for (let k = 1; k <= St; k++) g.fillStyle(k <= l.held ? P.lgreen : 0xcfd6e6, 1).fillRect(XG + 7, yv(k / St) - 0.2, k === St ? 3.4 : 2.2, 0.5);
        g.fillStyle(P.blue, 1); for (let x = XG - 3; x < XG + 7; x += 2) g.fillRect(x, yv(s.p.safe) - 0.15, 1.2, 0.4); // the safe mark
        g.fillStyle(0xffe98a, 1).fillTriangle(XG - 3.4, yv(pt) - 1.8, XG - 3.4, yv(pt) + 1.8, XG - 0.4, yv(pt));
        R.gauge.setText(`${Math.round(l.pp * 100)}%\nOF TEST`).setColor(hex(col));
        R.status.setText(l.held >= St ? 'AT TEST PRESSURE · HOLDING' : l.busy > 0 && l.set === 0 && l.pp > 0.02 && !l.leak && l.mended <= 0 ? 'VENTED · SEAL REPLACED' : l.leak && l.pp <= s.p.safe ? 'VENTED · SPACE ON THE LIT JOINT' : l.leak ? 'LEAKING · VENT IT (SPACE ON VENT)' : l.set > l.held && ok ? `STEP ${l.set} OF ${St} · HOLDING ${Math.max(0, s.p.hold - l.holdT).toFixed(1)} s` : l.set > l.held ? `STEP ${l.set} OF ${St} · RISING` : `STEP ${l.held} OF ${St} HELD`).setColor(l.leak ? (l.pp <= s.p.safe ? '#7fb4ff' : '#ffb070') : '#ffffff');
        R.temp.setText('LOCKED UP · UNDER GAS PRESSURE');
      } else {
        g.fillStyle(0x4a3a18, 1).fillRect(XG + 1, yv(1), 5, yv(0.8) - yv(1)); g.fillStyle(P.red, 1).fillRect(XG - 1, yv(1) - 0.3, 9, 0.6);
        const col = l.lift > 0 ? (Math.floor(now * 8) % 2 ? P.red : 0xffffff) : l.p > 0.8 ? P.orange : P.lgreen;
        if (act === 'chill') { g.fillStyle(col, 1).fillRoundedRect(XG + 1, yv(l.p), 5, Math.max(0.2, gy + gh - yv(l.p)), 1); const over = settles(s, l, l.q) > 1, h = yv(settles(s, l, l.q)); if (!l.loaded) g.fillStyle(over ? (Math.floor(now * 8) % 2 ? P.red : 0xffffff) : 0xffffff, 1).fillTriangle(XG - (over ? 4.6 : 3.4), h - (over ? 2.6 : 1.8), XG - (over ? 4.6 : 3.4), h + (over ? 2.6 : 1.8), XG - 0.4, h); }
        R.gauge.setText(act === 'chill' ? `${Math.round(l.p * 100)}%\nOF RELIEF` : 'LINE\nPRESS.').setColor(act === 'chill' ? hex(col) : '#aab4d4');
        if (act === 'lineup') {
          const ok = (b: boolean) => (b ? '✓' : '☐');
          R.status.setText(`${ok(v.supply.open && v.fill.open)} WAY TO THE ${this.th.unit[0]}   ${ok(!v.drain.open)} DRAIN SHUT   ${ok(v.vent.open)} VENT OPEN   ${ok(!v.press.open)} GAS SHUT`).setColor(Object.entries(LINEUP).every(([k, o]) => v[k as Valve].open === o) ? '#7cc56b' : '#ffffff');
          R.temp.setText(`LINE WALL +20 °C`);
        } else {
          R.status.setText(l.lift > 0 ? `RELIEF VALVE LIFTED · FLOW TRIPPED ${Math.ceil(l.lift)} s` : !l.loaded && settles(s, l, l.q) > 1 ? 'TOO MUCH FLOW: CLOSE A NOTCH (←)' : l.loaded ? 'COLD RIGHT THROUGH' : l.chill < 1 ? (l.q ? 'CHILLING THE LINE' : 'FLOW VALVE SHUT') : l.tank < 0.85 ? (l.q ? `CHILLING THE ${this.th.unit[0]}` : 'FLOW VALVE SHUT') : l.q ? `LIQUID THROUGH THE ${this.th.unit[0]}` : 'FLOW VALVE SHUT').setColor(l.lift > 0 || (!l.loaded && settles(s, l, l.q) > 1) ? '#ff8a70' : l.loaded ? '#7cc56b' : l.q ? '#ffffff' : '#ffe98a');
          const t = Math.round(wallC(l)); R.temp.setText(`LINE WALL ${t > 0 ? '+' : '−'}${Math.abs(t)} °C${l.chill >= 1 ? '' : l.chill > 0.8 ? ` · ${this.th.unit[0]} STILL WARM` : ''}`);
        }
      }
      // ---- the tags: lit when theirs is the valve in hand
      const cur = this.line === i && !AUTO ? ITEMS[act as Act]?.[this.k] : undefined;
      for (const [k, t] of Object.entries(R.tags)) t.setColor(cur === k ? '#ffe98a' : '#aab4d4').setText(k === 'flow' ? `FLOW ${l.q}/${N}` : TAG[k as Valve]);
      if (cur !== undefined && typeof cur !== 'number') { const [x, y] = this.at(cur, i); fg.lineStyle(0.7, 0xffe98a, 1).strokeRoundedRect(x - 5.4, y - 5, 10.8, 10, 2); }
      else if (this.line === i && !AUTO && s.lines.length > 1 && act === 'done') { /* nothing in hand once it is over */ }
    });
    // which line is in hand
    if (s.lines.length > 1 && !AUTO && act !== 'done') { const Y = this.top(this.line); fg.fillStyle(0xffe98a, 1).fillTriangle(5, Y + 2.2, 5, Y + 6.6, 8, Y + 4.4); }
    const k = strikes(s);
    this.clockT.setText(`T+${mmss(s.t)}${k ? ` · ${k} STRIKE${k > 1 ? 'S' : ''}` : ''}`).setColor(s.t > s.p.par ? '#ff8a70' : '#ffe98a');
  }
}
