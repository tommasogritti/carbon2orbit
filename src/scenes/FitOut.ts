import Phaser from 'phaser';
import { W, H, T, held, just, finish, cam, img, panel, who } from '../core';
import { snd, music, stopLoops, loop, Loop } from '../audio';
import { P, tex, lg, rg, rr, el, poly, line, text, rng, OUT } from '../art';
import type { C2 } from '../art';
import type { LevelDef } from '../content';

const AUTO = new URLSearchParams(location.search).has('auto');
// ---- act one: the yard, seen side-on
const QX = 120, QY = 127, WY = 136; // where the quay ends, its top, and the water
const GY = 24, TX0 = 10, TX1 = 310; // the gantry's rail, and how far the trolley runs along it
const BX = 218, HL = 176, DECK = 123.5, DEPTH = 13; // the hull: its middle, its length, the deck when light, its depth
const VMAX = 56, ACC = 28, HOIST = 40, LMIN = 8, LSAFE = 30, GRAV = 220, DAMP = 0.9; // trolley, hoist and the swing of the load
const TOL = 2.6, SWAY = 8; // a load is set down within TOL of its mark, moving sideways slower than SWAY
// ---- act two: the basin, seen from above
const QEDGE = 40, BANK = 36, BL = 110, BW = 29; // the quay's edge (it is on the left, as in act one) and the far bank's; the hull's length and beam
const THRUST = 10, DRAG = 0.45, LAG = 0.6, TWIST = 0.55, TDRAG = 1.1; // how the hull answers its thrusters

/** What can be lifted: its size on the quay (units) and how it is drawn from the side. Top views are in `deckPlan`. */
const KINDS: Record<string, { w: number; h: number; draw: (c: C2) => void }> = {
  thruster: { w: 9, h: 9, draw: (c) => { rr(c, 0.3, 7.4, 8.4, 1.4, 0.3, '#f2d14a', OUT, 0.25); rr(c, 1.6, 2.2, 5.8, 5.4, 0.8, lg(c, 0, 2, 0, 8, [0, '#f4f6fa'], [1, '#aab2c0']), OUT, 0.3); rr(c, 1.6, 4.2, 5.8, 1.2, 0, '#2f6fc0'); el(c, 4.5, 1.4, 1.1, 1.1, undefined, '#4a5066', 0.5); for (const x of [2.6, 6.4]) el(c, x, 6.6, 0.4, 0.4, '#4a5066'); } },
  power: { w: 16, h: 8, draw: (c) => { rr(c, 0.3, 1.8, 15.4, 6, 0.4, lg(c, 0, 1.8, 0, 8, [0, '#f4f6fa'], [1, '#b8c0cc']), OUT, 0.3); for (let x = 1.6; x < 9; x += 1.1) line(c, x, 3.2, x, 6.4, 'rgba(60,70,90,.55)', 0.3); rr(c, 10.2, 3, 4.4, 3.6, 0.3, '#3a4057', OUT, 0.2); el(c, 11.4, 4.2, 0.45, 0.45, '#7cc56b'); el(c, 13, 4.2, 0.45, 0.45, '#f2d14a'); for (const x of [3, 6]) rr(c, x, 0.3, 1.4, 1.8, 0.2, '#5b6275', OUT, 0.2); rr(c, 0.3, 7.2, 15.4, 0.7, 0, '#2f6fc0'); } },
  shield: { w: 21, h: 11, draw: (c) => { poly(c, [0.4, 11, 0.4, 3.4, 3.4, 0.4, 17.6, 0.4, 20.6, 3.4, 20.6, 11, 18.8, 11, 18.8, 4.2, 16.8, 2.2, 4.2, 2.2, 2.2, 4.2, 2.2, 11], lg(c, 0, 0, 0, 11, [0, '#5b6275'], [1, '#2a2e3c']), OUT, 0.3); poly(c, [2.2, 11, 2.2, 4.2, 4.2, 2.2, 16.8, 2.2, 18.8, 4.2, 18.8, 11], 'rgba(30,34,46,.42)'); for (const x of [5, 8.4, 11.8, 15.2]) line(c, x, 0.9, x + 0.8, 1.7, 'rgba(240,140,60,.7)', 0.35); for (const y of [5.4, 8]) { line(c, 0.9, y, 1.7, y, '#8b93a7', 0.3); line(c, 19.3, y, 20.1, y, '#8b93a7', 0.3); } } },
  cradle: { w: 24, h: 6, draw: (c) => { rr(c, 0.3, 4.4, 23.4, 1.4, 0.3, '#f2d14a', OUT, 0.25); for (const [x, d] of [[3, 1], [8, 1], [16, -1], [21, -1]] as [number, number][]) { poly(c, [x - 0.8, 4.4, x + 0.8, 4.4, x + 0.8 + d * 2.2, 0.6, x - 0.4 + d * 2.2, 0.6], '#aab2c0', OUT, 0.25); el(c, x + d * 2, 0.9, 0.7, 0.7, '#d8452e', OUT, 0.2); } el(c, 12, 3.6, 3.4, 1, undefined, '#4a5066', 0.5); } },
};
const CABIN = (c: C2) => { rr(c, 0.3, 1.6, 9.4, 6.4, 0.4, lg(c, 0, 1.6, 0, 8, [0, '#f4f6fa'], [1, '#b8c0cc']), OUT, 0.3); rr(c, 0, 0.6, 10, 1.4, 0.3, '#3a4057', OUT, 0.2); for (const x of [1.6, 4.2, 6.8]) rr(c, x, 3, 1.8, 1.8, 0.2, '#4d7fb0', OUT, 0.15); };
const LEG = (c: C2) => { rr(c, 1.9, 0, 1.2, 6, 0.2, '#8b93a7', OUT, 0.2); el(c, 2.5, 7.4, 2.2, 2.4, 'rgba(20,24,34,.85)', '#b8c0cc', 0.6); line(c, 1, 7.4, 4, 7.4, '#f2d14a', 0.5); line(c, 2.5, 5.6, 2.5, 9.2, '#f2d14a', 0.5); };

interface Theme {
  music: string; role: string; heads: [lift: string, trial: string];
  /** The yard from the side (act one) and the basin from above (act two), each 320 x 180. */
  yard: (c: C2) => void; basin: (c: C2) => void;
  hull: [top: string, bottom: string, boot: string];
  liftTitle: string; liftText: (knocks: number, secs: number) => string;
  trialTitle: string; trialText: (secs: number, scrapes: number) => string;
  eggSay: string;
}
/** South Louisiana: a fabrication shed, a gantry, bald cypress hung with Spanish moss on the far bank, and brown water. */
function ameliaYard(c: C2) {
  c.fillStyle = lg(c, 0, 0, 0, 136, [0, '#7fb6dc'], [0.6, '#cfe0d8'], [1, '#f1dfb4']); c.fillRect(0, 0, 320, 136);
  c.fillStyle = rg(c, 250, 58, 4, 70, [0, 'rgba(255,246,214,.95)'], [0.2, 'rgba(255,240,200,.45)'], [1, 'rgba(255,240,200,0)']); c.fillRect(170, 0, 150, 130);
  const r = rng(41);
  // the far bank: marsh grass, then cypress with moss
  rr(c, 100, 112, 220, 26, 0, lg(c, 0, 112, 0, 138, [0, '#7d9163'], [1, '#55693f']));
  for (let x = 104; x < 324; x += 7 + r() * 9) { // bald cypress: a flared foot, a straight trunk, a flat feathery crown, moss hanging from it
    const h = 20 + r() * 16, w = 6 + r() * 5, y = 115 - r() * 2, g1 = r() > 0.5 ? '#4f7a55' : '#5b8659', g2 = '#3e6648';
    poly(c, [x - 1.8, y, x - 0.6, y - 4, x - 0.5, y - h * 0.7, x + 0.5, y - h * 0.7, x + 0.6, y - 4, x + 1.8, y], '#5a4732');
    for (let k = 0; k < 7; k++) { const t = k / 6, cx = x + (r() - 0.5) * w * 1.5, cy = y - h * (0.62 + 0.38 * t) + (r() - 0.5) * 2; el(c, cx, cy, w * (0.75 - 0.4 * t) + r() * 1.4, 2.2 + r() * 1.6, k % 2 ? g1 : g2); }
    for (let k = 0; k < 5; k++) { const mx = x + (r() - 0.5) * w * 1.6, my = y - h * (0.56 + r() * 0.16); line(c, mx, my, mx + (r() - 0.5) * 0.8, my + 2.5 + r() * 4.5, 'rgba(176,184,158,.75)', 0.4); }
  }
  for (let x = 100; x < 320; x += 1.6) line(c, x, 116 + r() * 2, x + (r() - 0.5), 112.6 + r() * 2, r() > 0.5 ? '#9aa86a' : '#7c8f58', 0.35);
  // the water: brown-green, slow
  c.fillStyle = lg(c, 0, WY, 0, 180, [0, '#77805a'], [0.35, '#4f5d41'], [1, '#29332a']); c.fillRect(QX - 2, WY, 204, 180 - WY);
  rr(c, QX - 2, 117, 204, 20, 0, lg(c, 0, 117, 0, 137, [0, 'rgba(119,128,90,0)'], [1, 'rgba(119,128,90,1)']));
  for (let i = 0; i < 80; i++) { const x = QX + r() * 200, y = WY + 1 + r() * 42, l = 3 + r() * 9; line(c, x, y, x + l, y, `rgba(220,226,190,${0.08 + r() * 0.16})`, 0.35); }
  // the shed and the laydown area
  rr(c, -2, 62, 78, 66, 0, lg(c, 0, 62, 0, 128, [0, '#b9c6cf'], [1, '#8d9aa5']), OUT, 0.3); poly(c, [-2, 62, 37, 50, 76, 62], '#9aa7b2', OUT, 0.3);
  for (let x = 1; x < 76; x += 2.4) line(c, x, 63, x, 127, 'rgba(60,72,84,.2)', 0.3);
  rr(c, 18, 84, 40, 44, 0.6, lg(c, 18, 0, 58, 0, [0, '#1d232e'], [0.5, '#2c3442'], [1, '#161b24']), OUT, 0.3); for (let y = 88; y < 127; y += 4) line(c, 18.4, y, 57.6, y, 'rgba(255,255,255,.05)', 0.3);
  rr(c, 21, 70, 34, 8, 0.8, '#f4f2ea', OUT, 0.25); text(c, 'AMELIA YARD', 38, 74.2, 4.2, '#1b3a6b', 700);
  for (const x of [84, 100]) { line(c, x, 127, x, 92, '#5b6275', 0.7); rr(c, x - 2.4, 90.4, 4.8, 1.8, 0.4, '#f4f2ea', OUT, 0.2); }
  // the quay: concrete, timber piles and tyres at its edge
  c.fillStyle = lg(c, 0, QY, 0, 180, [0, '#c2bfb3'], [0.12, '#a5a296'], [1, '#6f6d66']); c.fillRect(0, QY, QX, 180 - QY); line(c, 0, QY + 0.2, QX, QY + 0.2, '#e4e1d4', 0.5);
  for (let x = 8; x < QX; x += 16) line(c, x, QY + 1, x, 180, 'rgba(0,0,0,.08)', 0.3);
  for (let i = 0; i < 60; i++) { const x = r() * QX, y = QY + 2 + r() * 50; el(c, x, y, 0.4 + r(), 0.3, 'rgba(60,58,50,.18)'); }
  rr(c, QX - 2.4, QY - 0.6, 3.2, 54, 0.4, lg(c, QX - 2, 0, QX + 1, 0, [0, '#6b4a2b'], [1, '#3d2a18']), OUT, 0.25);
  for (const y of [QY + 4, QY + 12]) { el(c, QX + 0.4, y, 1.8, 2.6, '#15171f', OUT, 0.3); el(c, QX + 0.4, y, 0.8, 1.4, '#3a3f4f'); }
  for (const x of [QX - 8, QX - 30]) { rr(c, x - 1.4, QY - 2.2, 2.8, 2.4, 0.5, '#2a2e3c', OUT, 0.25); rr(c, x - 2, QY - 2.8, 4, 0.9, 0.4, '#3a4057', OUT, 0.2); }
  // the gantry: a truss on two legs, one on the quay and one on a concrete pier in the water
  rr(c, 302, 126, 16, 12, 0.6, lg(c, 0, 126, 0, 138, [0, '#b5b2a6'], [1, '#77756c']), OUT, 0.3);
  for (const [x, d] of [[6, 1], [314, -1]] as [number, number][]) { poly(c, [x - 1.4, GY + 5, x + 1.4, GY + 5, x + 1.4 - d * 3.4, 127, x - 1.4 - d * 3.4, 127], '#e2b93a', OUT, 0.3); poly(c, [x - 1, GY + 5, x + 1, GY + 5, x + 5 * d, 127, x + 3 * d, 127], '#f2d14a', OUT, 0.3); line(c, x - d * 2.6, 96, x + d * 3.4, 96, '#b99422', 0.7); line(c, x - d * 1.4, 62, x + d * 1.8, 62, '#b99422', 0.7); }
  rr(c, 2, GY - 6, 316, 1.6, 0.3, '#f2d14a', OUT, 0.25); rr(c, 2, GY + 2, 316, 2.2, 0.3, '#f2d14a', OUT, 0.25);
  for (let x = 2; x < 316; x += 7) { line(c, x, GY + 2, x + 3.5, GY - 4.6, '#d9b530', 0.5); line(c, x + 3.5, GY - 4.6, x + 7, GY + 2, '#d9b530', 0.5); }
  // a brown pelican on the pier: Louisiana is the Pelican State
  c.save(); c.translate(303, 119); el(c, 0, 2.6, 3.2, 2.4, '#6f5f4c', OUT, 0.25); el(c, 1.8, -0.6, 1.3, 1.5, '#f1ead2', OUT, 0.25); poly(c, [2.6, -0.8, 7, 0.9, 2.6, 1], '#c9a15a', OUT, 0.2); line(c, 0.4, 0.8, 1.6, 0.6, '#f1ead2', 1); el(c, 2.2, -1, 0.25, 0.25, '#15171f'); line(c, -0.4, 4.8, -0.4, 6.8, '#3a3f4f', 0.4); line(c, 1, 4.8, 1, 6.8, '#3a3f4f', 0.4); c.restore();
}
function ameliaBasin(c: C2) {
  const r = rng(53);
  c.fillStyle = lg(c, 0, 20, 0, 180, [0, '#6f7b56'], [1, '#48573f']); c.fillRect(0, 0, 320, 180);
  for (let i = 0; i < 260; i++) { const x = QEDGE + r() * 280, y = BANK + r() * 144, l = 2 + r() * 7; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 0.8, x + l, y); c.strokeStyle = `rgba(214,222,184,${0.06 + r() * 0.13})`; c.lineWidth = 0.35; c.stroke(); }
  // the far bank along the top: marsh, and the crowns of the cypress
  c.fillStyle = lg(c, 0, 0, 0, BANK, [0, '#55693f'], [1, '#7d9163']); c.fillRect(0, 0, 320, BANK - 2);
  for (let x = QEDGE; x < 320; x += 1.5) line(c, x, BANK - 2.6 + r() * 2, x + (r() - 0.5), BANK - 0.4 + r() * 1.6, r() > 0.5 ? '#9aa86a' : '#7c8f58', 0.4);
  for (let x = QEDGE + 4; x < 324; x += 6 + r() * 7) el(c, x, 22 + r() * 6, 4 + r() * 4, 3.4 + r() * 3, r() > 0.5 ? '#3f6a48' : '#4f7a55', 'rgba(20,40,26,.5)', 0.25);
  // the quay down the left: concrete, the shed's roof, bollards, tyres, and the marks where the loads stood
  c.fillStyle = lg(c, 0, 0, QEDGE, 0, [0, '#8f8d83'], [1, '#bdbaae']); c.fillRect(0, 0, QEDGE, 180); rr(c, QEDGE - 1.4, 0, 1.8, 180, 0, '#5b4226');
  for (let y = 30; y < 180; y += 24) line(c, 0, y, QEDGE - 1.4, y, 'rgba(0,0,0,.08)', 0.3);
  rr(c, -2, 88, 26, 70, 0.6, lg(c, -2, 0, 24, 0, [0, '#93a0ab'], [0.5, '#c8d3da'], [1, '#aebbc5']), OUT, 0.3); line(c, 11, 88, 11, 158, 'rgba(40,50,60,.5)', 0.4); for (let y = 91; y < 158; y += 3) line(c, -1.4, y, 23.4, y, 'rgba(60,72,84,.16)', 0.3);
  for (let y = 60; y < 180; y += 40) { el(c, QEDGE - 5, y, 1.6, 1.6, '#2a2e3c', OUT, 0.25); el(c, QEDGE - 5, y, 0.7, 0.7, '#5b6275'); }
  for (let y = 46; y < 180; y += 18) { el(c, QEDGE + 0.8, y, 1.5, 2.6, '#15171f', OUT, 0.25); el(c, QEDGE + 0.8, y, 0.6, 1.3, '#3a3f4f'); }
  for (const [y, h] of [[96, 8], [107, 8], [118, 12], [133, 14]] as [number, number][]) { c.setLineDash([1.2, 1]); rr(c, 27, y, 8, h, 0.3, undefined, 'rgba(255,255,255,.5)', 0.35); c.setLineDash([]); }
  // the gantry's feet: one on the quay, one on its pier, with the pelican still there
  rr(c, 3, 66, 7, 8, 0.4, '#f2d14a', OUT, 0.3); rr(c, 302, 63, 16, 14, 0.6, lg(c, 0, 63, 0, 77, [0, '#bdbaae'], [1, '#8f8d83']), OUT, 0.3); rr(c, 310, 66, 6, 8, 0.4, '#f2d14a', OUT, 0.3);
  el(c, 305.4, 73.4, 1.9, 1.4, '#6f5f4c', OUT, 0.2); el(c, 306.8, 72.6, 0.8, 0.8, '#f1ead2', OUT, 0.15); line(c, 307.4, 72.4, 309.4, 71.6, '#c9a15a', 0.5);
}
const THEMES: Record<string, Theme> = {
  amelia: {
    music: 'factory', role: 'At the yard · on the crane', heads: ['BOLLINGER SHIPYARDS · AMELIA, LA · FIT-OUT', 'BOLLINGER SHIPYARDS · AMELIA, LA · THRUSTER TRIAL'],
    yard: ameliaYard, basin: ameliaBasin, hull: ['#3a3f4c', '#15171f', '#8a3a2a'],
    liftTitle: 'Fitted out', liftText: (k, s) => `Everything on the list is aboard, in ${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s on the crane${k ? `, with ${k} knock${k > 1 ? 's' : ''} along the way` : ' and without a single knock'}. The barge that came in as Oceanus has its new name on the side.`,
    trialTitle: 'She holds station', trialText: (s, n) => `Every box held, in ${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s${n ? `, after ${n} brush${n > 1 ? 'es' : ''} with the quay` : ' and never a touch on the quay'}. A platform that can hold station is one a rocket can aim for.`,
    eggSay: 'The old name comes off: OCEANUS',
  },
};

interface Item { key: string; kind: string; label: string; s: number; wt: number; needs?: string; home: number; w: number; h: number; x: number; y: number; state: 0 | 1 | 2; o: Phaser.GameObjects.Image; chip?: Phaser.GameObjects.Text }
interface Step { say: string; at: [number, number]; hdg: number; hold: number; wind?: [number, number, number?, number?] }
const itemsOf = (p: any) => (p.items as [string, string, string, number, number, string?][]).map(([key, kind, label, s, wt, needs]) => ({ key, kind, label, s, wt, needs }));
/** The deck from above, with whatever the level's list puts on it. Used for the hull in act two. */
function deckPlan(c: C2, th: Theme, list: ReturnType<typeof itemsOf>, cabin?: number) {
  poly(c, [3, 0.4, BL - 3, 0.4, BL - 0.4, 3, BL - 0.4, BW - 3, BL - 3, BW - 0.4, 3, BW - 0.4, 0.4, BW - 3, 0.4, 3], lg(c, 0, 0, 0, BW, [0, '#9aa1ab'], [0.5, '#858c97'], [1, '#737a85']), OUT, 0.4);
  poly(c, [3.6, 1.6, BL - 3.6, 1.6, BL - 1.6, 3.6, BL - 1.6, BW - 3.6, BL - 3.6, BW - 1.6, 3.6, BW - 1.6, 1.6, BW - 3.6, 1.6, 3.6], undefined, th.hull[0], 0.9);
  for (let x = 12; x < BL - 6; x += 11) line(c, x, 2.4, x, BW - 2.4, 'rgba(30,36,48,.14)', 0.3);
  const X = (s: number) => BL / 2 + (s * (BL - 12)) / 2, thr = list.filter((i) => i.kind === 'thruster'), end = (sg: number) => { const e = thr.filter((i) => Math.sign(i.s) === sg); return e.reduce((m, i) => m + i.s, 0) / (e.length || 1); }; const side = [0, 0];
  if (cabin !== undefined) { rr(c, X(cabin) - 3, BW / 2 - 6, 6, 12, 0.5, '#f4f6fa', OUT, 0.3); rr(c, X(cabin) - 2, BW / 2 - 5, 4, 10, 0.3, '#3a4057'); }
  for (const it of list) {
    let x = X(it.s);
    if (it.kind === 'thruster') { const k = it.s < 0 ? 0 : 1, y = side[k]++ % 2 ? BW - 4.6 : 4.6; x = X(end(Math.sign(it.s))); /* a pair at each end sits on the two corners */ el(c, x, y, 3, 3, '#f4f6fa', OUT, 0.3); el(c, x, y, 1.7, 1.7, '#2f6fc0', OUT, 0.2); rr(c, x - 3.6, y - 3.6, 7.2, 7.2, 0.6, undefined, '#f2d14a', 0.4); }
    else if (it.kind === 'power') { rr(c, x - 8, BW / 2 - 5, 16, 10, 0.5, '#e8ebf0', OUT, 0.3); for (let k = 0; k < 5; k++) line(c, x - 6.4 + k * 1.6, BW / 2 - 3.6, x - 6.4 + k * 1.6, BW / 2 + 3.6, 'rgba(60,70,90,.45)', 0.3); }
    else if (it.kind === 'shield') { rr(c, x - 10.5, BW / 2 - 7, 21, 14, 0.8, 'rgba(42,46,60,.82)', OUT, 0.3); for (let k = 0; k < 4; k++) line(c, x - 7 + k * 4.6, BW / 2 - 5.6, x - 5 + k * 4.6, BW / 2 - 3.6, 'rgba(240,140,60,.6)', 0.4); }
    else { el(c, x, BW / 2, 11.4, 11.4, undefined, 'rgba(244,246,250,.85)', 0.8); el(c, x, BW / 2, 5, 5, undefined, '#f2d14a', 0.9); for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k * Math.PI) / 2; line(c, x + Math.cos(a) * 5, BW / 2 + Math.sin(a) * 5, x + Math.cos(a) * 8.4, BW / 2 + Math.sin(a) * 8.4, '#aab2c0', 1.1); el(c, x + Math.cos(a) * 8.4, BW / 2 + Math.sin(a) * 8.4, 0.9, 0.9, '#d8452e', OUT, 0.2); } }
  }
  poly(c, [BL - 9, BW / 2 - 2.2, BL - 5, BW / 2, BL - 9, BW / 2 + 2.2], 'rgba(244,246,250,.8)'); // which end is the bow
}

/**
 * Fitting out a vessel, in two acts joined by `params.then`. Act one (`act: "lift"`) is the yard from the side: a gantry
 * crane, a swinging load, a list of things to set down on their marks on a hull that trims as the weight goes on. Act two
 * (`act: "trial"`) is the basin from above: the fitted hull is driven on its thrusters into a series of boxes and held
 * there against wind. What is fitted, where, how heavy, and what the trial asks all come from the level's params; the
 * setting (yard, water, hull colours, words) is a theme.
 */
export class FitOutScene extends Phaser.Scene {
  def!: LevelDef; p: any; th!: Theme; act: 'lift' | 'trial' = 'lift'; ended = false; t = 0; knocks = 0; cool = 0; egg = false; started = false;
  g!: Phaser.GameObjects.Graphics; hud!: Phaser.GameObjects.Graphics; call!: Phaser.GameObjects.Text; stat!: Phaser.GameObjects.Text; hum!: Loop; water?: Loop;
  // act one
  items: Item[] = []; tx = 60; vx = 0; L = LSAFE; ph = 0; om = 0; hx = 60; hy = 60; lvx = 0; carry?: Item; trimA = 0; deckY = DECK; hull!: Phaser.GameObjects.Container; nameT!: Phaser.GameObjects.Text; trolley!: Phaser.GameObjects.Image; hook!: Phaser.GameObjects.Image; warn = 0;
  bot = { i: -1 }; labels: Phaser.GameObjects.Text[] = [];
  // act two
  steps: Step[] = []; si = 0; holdT = 0; x = 0; y = 0; ux = 0; uy = 0; hd = 0; w = 0; f = [0, 0, 0]; barge!: Phaser.GameObjects.Image; spray: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  constructor() { super('FitOut'); }
  /** The controls panel (H or the ? button): what the keys do right now, in this level and this act. */
  help(): { title: string; rows: [keys: string, does: string][]; note?: string } {
    if (this.act === 'trial') return { title: 'Thruster trial', rows: [['← ↑ ↓ →', 'Thrust that way. All the thrusters swing round together, and they take a moment to answer.'], ['Space', 'Twist the hull anticlockwise.'], ['Enter', 'Twist the hull clockwise.']], note: 'Bring the hull into the dashed box, pointing the way the box points, and keep it there until the ring is full. The windsock shows what is pushing on it.' };
    return { title: 'The yard crane', rows: [['← →', 'Run the trolley along the gantry. The load swings when the trolley starts and stops.'], ['↑ ↓', 'Hoist and lower.'], ['Space', this.carry ? 'Set the load down: over its outline, touching, and steady.' : 'Hook on, with the hook on top of a load.']], note: 'Fit everything on the list at the bottom. Watch the trim gauge: with too much weight at one end the hull will take no more there until the other end is loaded.' };
  }
  init(d: { def: LevelDef }) {
    this.def = d.def; this.p = d.def.params; this.th = THEMES[this.p.theme]; this.act = this.p.act === 'trial' ? 'trial' : 'lift';
    this.ended = false; this.t = 0; this.knocks = 0; this.cool = 0; this.egg = false; this.started = false; this.items = []; this.carry = undefined;
    this.tx = 60; this.vx = 0; this.L = LSAFE; this.ph = 0; this.om = 0; this.lvx = 0; this.trimA = 0; this.deckY = DECK; this.warn = 0; this.bot = { i: -1 }; this.labels = []; this.spray = [];
    this.si = 0; this.holdT = 0; this.ux = 0; this.uy = 0; this.w = 0; this.f = [0, 0, 0];
  }
  create() {
    cam(this); stopLoops(); music.play(this.th.music); this.hum = loop('whine'); this.hum.set(0);
    for (const [k, d] of Object.entries(KINDS)) if (!this.textures.exists('fo_' + k)) tex(this, 'fo_' + k, d.w, d.h, d.draw);
    if (!this.textures.exists('fo_leg')) tex(this, 'fo_leg', 5, 10, LEG);
    if (!this.textures.exists('fo_cabin')) tex(this, 'fo_cabin', 10, 8, CABIN);
    if (!this.textures.exists('fo_trolley')) tex(this, 'fo_trolley', 12, 7, (c) => { rr(c, 0.3, 0.3, 11.4, 4.4, 0.6, '#d8452e', OUT, 0.3); for (const x of [2.4, 9.6]) el(c, x, 0.9, 0.9, 0.9, '#15171f'); rr(c, 4.4, 4.4, 3.2, 2.2, 0.3, '#3a4057', OUT, 0.25); });
    if (!this.textures.exists('fo_hook')) tex(this, 'fo_hook', 5, 6, (c) => { rr(c, 1.2, 0, 2.6, 2.2, 0.4, '#f2d14a', OUT, 0.25); c.beginPath(); c.arc(2.5, 3.6, 1.5, -0.4, Math.PI * 1.1); c.strokeStyle = '#15171f'; c.lineWidth = 0.9; c.stroke(); });
    this.hud = this.add.graphics().setDepth(22);
    panel(this, 4, 4, W - 8, 15, 0.9).setDepth(20); T(this, 9, 6.6, this.th.heads[this.act === 'lift' ? 0 : 1], '#ffffff', 5.4, '700').setDepth(21);
    this.stat = T(this, W - 34, 7, '', '#aab4d4', 4.6, '700').setOrigin(1, 0).setDepth(21); // the page's own buttons sit over the top right corner
    this.call = T(this, W / 2, this.act === 'lift' ? 150 : 158, '', '#ffe98a', 5.4, '700').setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(300).setShadow(0, 1, '#000000', 4).setDepth(21);
    if (this.act === 'lift') this.createLift(); else this.createTrial();
    who(this, { ...this.def, role: this.def.role || this.th.role }, this.act === 'lift' ? 4 : 66, 22);
  }
  say(s: string) { this.call.setText(s); }
  knock(msg: string) { if (this.cool > 0) return; this.cool = 0.9; this.knocks++; snd.clank(); this.cameras.main.shake(140, 0.004); this.say(msg); }

  // ------------------------------------------------------------------ act one: the crane
  createLift() {
    const key = 'fo_yard_' + this.p.theme, p = this.p, th = this.th;
    if (!this.textures.exists(key)) tex(this, key, W, H, th.yard);
    img(this, 0, 0, key).setOrigin(0);
    // the hull: raked ends, a boot-topping stripe, bitts; it sinks and trims as the weight goes on
    const hk = 'fo_hull_' + p.theme;
    if (!this.textures.exists(hk)) tex(this, hk, HL + 2, DEPTH + 3, (c) => { poly(c, [1, 1.4, HL + 1, 1.4, HL - 7, DEPTH + 1, 9, DEPTH + 1], lg(c, 0, 1, 0, DEPTH + 1, [0, th.hull[0]], [1, th.hull[1]]), OUT, 0.4); poly(c, [5.4, DEPTH - 3.4, HL - 3.4, DEPTH - 3.4, HL - 7, DEPTH + 1, 9, DEPTH + 1], th.hull[2]); rr(c, 0.4, 0.4, HL + 1.2, 1.8, 0.4, '#8d949e', OUT, 0.3); for (let x = 14; x < HL; x += 22) line(c, x, 2.6, x, DEPTH - 3.6, 'rgba(255,255,255,.06)', 0.3); for (const x of [8, HL - 6]) for (let k = 0; k < 4; k++) line(c, x, 4 + k * 1.8, x + 1.4, 4 + k * 1.8, 'rgba(244,246,250,.7)', 0.3); });
    this.hull = this.add.container(BX, DECK).setDepth(2);
    this.hull.add(img(this, 0, -0.4, hk).setOrigin(0.5, 0));
    if (p.hull.cabin !== undefined) this.hull.add(img(this, (p.hull.cabin * HL) / 2, 0, 'fo_cabin').setOrigin(0.5, 1));
    this.nameT = T(this, -HL / 2 + 16, 4, p.hull.was || p.hull.name, '#e8e6df', 4.6, '700'); this.hull.add(this.nameT);
    if (p.hull.was) this.tweens.add({ targets: this.nameT, alpha: 0.6, duration: 900, yoyo: true, repeat: -1 }); // the old name glints: there is something to find here
    if (!this.textures.exists('fo_water')) tex(this, 'fo_water', 204, 46, (c) => { c.fillStyle = lg(c, 0, 0, 0, 46, [0, 'rgba(119,128,90,.5)'], [0.3, 'rgba(79,93,65,.82)'], [1, 'rgba(41,51,42,.96)']); c.fillRect(0, 0, 204, 46); const r = rng(9); for (let i = 0; i < 26; i++) { const x = r() * 200, l = 4 + r() * 10; line(c, x, 0.6 + r() * 2, x + l, 0.6 + r() * 2, 'rgba(230,236,200,.4)', 0.35); } });
    const sea = img(this, QX - 2, WY, 'fo_water').setOrigin(0).setDepth(3);
    this.tweens.add({ targets: sea, x: QX - 4, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // the list, laid out along the quay in the order it is given
    let x = 5;
    for (const d of itemsOf(p)) {
      const k = KINDS[d.kind]; x += k.w / 2;
      this.items.push({ ...d, w: k.w, h: k.h, home: x, x, y: QY, state: 0, o: img(this, x, QY, 'fo_' + d.kind).setOrigin(0.5, 1).setDepth(4) });
      x += k.w / 2 + 2.4;
    }
    this.trolley = img(this, this.tx, GY + 1, 'fo_trolley').setOrigin(0.5, 0).setDepth(6); this.hook = img(this, 0, 0, 'fo_hook').setOrigin(0.5, 0).setDepth(6);
    this.g = this.add.graphics().setDepth(5);
    // the list as chips along the bottom
    panel(this, 4, 161, W - 8, 15, 0.86).setDepth(20);
    const cw = (W - 16) / this.items.length;
    this.items.forEach((it, i) => (it.chip = T(this, 8 + i * cw + cw / 2, 164.6, '', '#aab4d4', 3.9, '700').setOrigin(0.5, 0).setAlign('center').setDepth(21)));
    this.labels = [T(this, W - 133, 7, 'TRIM · STERN', '#aab4d4', 4.6, '700').setOrigin(1, 0).setDepth(21), T(this, W - 85, 7, 'BOW', '#aab4d4', 4.6, '700').setDepth(21)];
    this.say('← → run the trolley · ↑ ↓ hoist and lower · SPACE hooks on and sets down');
  }
  /** Where a mark on the deck is now, the hull having sunk and trimmed. */
  slot(s: number) { return { x: BX + ((s * HL) / 2) * Math.cos(this.trimA), y: this.deckY + ((s * HL) / 2) * Math.sin(this.trimA) }; }
  fitted(key?: string) { return !key || this.items.some((i) => i.key === key && i.state === 2); }
  moment() { return this.items.reduce((m, i) => m + (i.state === 2 ? i.wt * i.s : 0), 0); }
  /** The highest thing under a load at x, half-width hw: the quay, the deck, something already fitted, or the water. */
  floor(x: number, hw: number, self?: Item) {
    let y = x - hw < QX ? QY : WY + 2.5;
    if (x + hw > BX - HL / 2 && x - hw < BX + HL / 2) y = Math.min(y, this.deckY + (x - BX) * Math.sin(this.trimA) - 0.2);
    for (const it of this.items) if (it !== self && it.state === 2 && self?.needs !== it.key && Math.abs(x - it.x) < hw + it.w / 2 - 0.6) y = Math.min(y, it.y - it.h);
    const cab = this.p.hull.cabin; if (cab !== undefined) { const c = this.slot(cab); if (Math.abs(x - c.x) < hw + 4.4) y = Math.min(y, c.y - 8); }
    return y;
  }
  place(it: Item) {
    const sl = this.slot(it.s), heavy = Math.abs(this.moment() + it.wt * it.s) > this.p.trim;
    if (it.x < QX) {
      if (Math.abs(it.x - it.home) < 5 && QY - it.y < 4) { it.state = 0; it.x = it.home; it.y = QY; it.o.setPosition(it.x, it.y).setRotation(0); this.carry = undefined; snd.land(); return this.say('Back on its mark.'); }
      snd.deny(); return this.say('Set it down on its own mark on the quay, or take it across to the hull.');
    }
    const deny = (s: string) => { snd.deny(); this.say(s); };
    if (Math.abs(it.x - sl.x) > TOL) return deny(`Not over its mark. ${it.label} goes where its outline is on the deck.`);
    if (sl.y - it.y > 3.5) return deny('Too high: lower it until it touches the deck.');
    if (Math.abs(this.lvx) > SWAY) return deny('Still swinging: steady the load first.');
    if (!this.fitted(it.needs)) return deny(`${it.label} goes over the ${this.items.find((i) => i.key === it.needs)!.label.toLowerCase()}: fit that first.`);
    if (heavy) { this.warn = 1.6; snd.alarm(); return this.say(`Too much weight at the ${it.s > 0 ? 'bow' : 'stern'}: she would trim too far. Fit something at the other end first.`); }
    it.state = 2; this.carry = undefined; snd.stage(); this.cameras.main.shake(90, 0.002);
    it.o.setPosition((it.s * HL) / 2, 0).setRotation(0).setDepth(0); this.hull.add(it.o);
    if (it.kind === 'thruster') { const leg = img(this, (it.s * HL) / 2, DEPTH - 3, 'fo_leg').setOrigin(0.5, 0).setAlpha(0); this.hull.addAt(leg, 0); this.tweens.add({ targets: leg, alpha: 1, y: DEPTH + 0.4, duration: 600 }); }
    if (it.needs) this.hull.bringToTop(it.o);
    const left = this.items.filter((i) => i.state !== 2).length;
    this.say(left ? `${it.label}: fitted. ${left} to go.` : 'That is the list.');
    if (!left) this.liftDone();
  }
  liftDone() {
    this.ended = true; this.hum.set(0);
    const p = this.p, stars = this.knocks <= 1 && this.t <= p.par ? 3 : this.knocks <= 4 ? 2 : 1;
    if (p.hull.was) this.tweens.add({ targets: this.nameT, alpha: 0, duration: 400, onComplete: () => { this.nameT.setText(p.hull.name).setColor('#ffffff'); this.tweens.add({ targets: this.nameT, alpha: 1, duration: 600 }); snd.pickup(); } });
    this.time.delayedCall(2200, () => finish(this, this.def, { success: true, stars, egg: this.egg, title: this.th.liftTitle, text: this.th.liftText(this.knocks, this.t) + (stars < 3 ? ` For three stars: no more than one knock, inside ${Math.round(p.par / 60)} minutes.` : '') }));
  }
  updateLift(dt: number) {
    const p = this.p; let dir = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), hoist = (held('down') ? 1 : 0) - (held('up') ? 1 : 0), act = just('a');
    if (AUTO) [dir, hoist, act] = this.botLift();
    if (dir || hoist || act) this.started = true;
    if (this.started) this.t += dt;
    // trolley and hoist
    const v0 = this.vx; this.vx += Phaser.Math.Clamp(dir * VMAX - this.vx, -ACC * dt, ACC * dt); this.tx += this.vx * dt;
    if (this.tx < TX0 || this.tx > TX1) { this.tx = Phaser.Math.Clamp(this.tx, TX0, TX1); this.vx = 0; }
    const acc = Phaser.Math.Clamp((this.vx - v0) / dt, -ACC * 1.5, ACC * 1.5);
    this.L = Math.max(LMIN, this.L + hoist * HOIST * dt);
    // the load is a pendulum under the trolley
    const Le = Math.max(18, this.L + (this.carry ? this.carry.h / 2 : 0));
    this.om += (-(GRAV / Le) * Math.sin(this.ph) - (acc / Le) * Math.cos(this.ph) - (this.carry ? DAMP : DAMP * 2.6) * this.om) * dt; this.ph += this.om * dt; // a bare hook settles quickly
    const px = this.hx; let hx = this.tx + this.L * Math.sin(this.ph), hy = GY + 6 + this.L * Math.cos(this.ph);
    const it = this.carry, hw = it ? it.w / 2 : 0, bottom = hy + (it ? it.h : 3), fl = it ? this.floor(hx, hw, it) : hx < QX ? QY : WY + 2; // the bare hook passes in front of the hull
    if (bottom > fl) { // it has met something: the cable goes slack, and a load that arrived sideways has hit it
      const pen = bottom - fl, side = it && pen > 2.6 && bottom - this.floor(px, hw, it) < 0.8;
      if (side) { this.knock(`${it!.label} swung into something. Lift it clear before you travel.`); this.tx -= this.vx * dt * 3; this.vx *= -0.3; this.om = -this.om * 0.5; this.ph -= ((hx - px) / Math.max(this.L, 12)) * 2; }
      else { if (it && Math.abs(this.lvx) > 16) this.knock(`${it.label} came down swinging. Steady it before it touches.`); this.L = Math.max(LMIN, this.L - pen / Math.max(0.5, Math.cos(this.ph))); }
      hx = this.tx + this.L * Math.sin(this.ph); hy = GY + 6 + this.L * Math.cos(this.ph);
    }
    this.lvx = (hx - px) / dt; this.hx = hx; this.hy = hy;
    if (it) { it.x = hx; it.y = hy + it.h; it.o.setPosition(it.x, it.y).setRotation(-this.ph * 0.6); }
    this.hum.set(dir || hoist ? 0.5 : 0, 0.12 + Math.abs(this.vx) / VMAX * 0.25 + (hoist ? 0.2 : 0));
    // hooking on and setting down
    if (act && it) this.place(it);
    else if (act) {
      const near = this.items.find((i) => i.state === 0 && Math.abs(hx - i.x) < i.w / 2 + 3 && Math.abs(hy + 3 - (i.y - i.h)) < 6);
      const nm = this.slot(-1), onName = !this.egg && p.hull.was && Math.abs(hx - (nm.x + 28)) < 16 && hy > this.deckY - 4;
      if (near) { near.state = 1; this.carry = near; const dy = near.y - near.h - GY - 6; this.L = Math.max(LMIN, Math.hypot(near.x - this.tx, dy)); this.ph = Math.atan2(near.x - this.tx, dy); this.om = 0; this.hx = near.x; this.lvx = 0; this.cool = Math.max(this.cool, 0.5); snd.click(); this.say(`${near.label} on the hook. Its outline is on the deck.`); }
      else if (onName) { this.egg = true; snd.egg(); this.say(this.th.eggSay); this.tweens.killTweensOf(this.nameT); this.tweens.add({ targets: this.nameT, alpha: 0.22, duration: 500 }); }
      else { snd.deny(); this.say('Nothing under the hook. Lower it onto the top of a load.'); }
    }
    // the hull answers the weight on it
    const wt = this.items.reduce((m, i) => m + (i.state === 2 ? i.wt : 0), 0);
    this.trimA += (this.moment() * p.trimAngle - this.trimA) * Math.min(1, dt * 1.6);
    this.deckY = DECK + wt * 0.1 + Math.sin(this.t * 1.1) * 0.25;
    this.hull.setPosition(BX, this.deckY).setRotation(this.trimA);
    for (const f of this.items) if (f.state === 2) { const sl = this.slot(f.s); f.x = sl.x; f.y = sl.y; }
    this.warn = Math.max(0, this.warn - dt);
    this.drawLift();
  }
  drawLift() {
    const g = this.g, p = this.p; g.clear();
    this.trolley.setX(this.tx); this.hook.setPosition(this.hx, this.hy).setRotation(-this.ph);
    g.lineStyle(0.5, 0x15171f, 1).lineBetween(this.tx, GY + 6, this.hx, this.hy + 0.6);
    // marks: on the quay for each thing still ashore, on the deck for what is on the hook (or, faintly, for all of it)
    for (const it of this.items) {
      if (it.state !== 2) { const sl = this.slot(it.s), on = it === this.carry, a = on ? 0.55 + 0.4 * Math.sin(this.t * 7) : this.carry ? 0 : 0.22; if (a > 0) { const ok = Math.abs(it.x - sl.x) <= TOL; g.lineStyle(on ? 0.6 : 0.4, on && ok ? 0x7cc56b : 0xffffff, a).strokeRect(sl.x - it.w / 2, sl.y - it.h, it.w, it.h); if (on) g.lineStyle(0.4, ok ? 0x7cc56b : 0xffffff, a).lineBetween(sl.x, sl.y - it.h - 5, sl.x, sl.y - it.h - 1.4); } }
      if (it.state === 1) g.lineStyle(0.35, 0xffffff, 0.35).strokeRect(it.home - it.w / 2, QY - 1.2, it.w, 1.2);
      it.chip!.setText(`${it.state === 2 ? '✓' : it.state === 1 ? '▲' : '☐'} ${it.label}`).setColor(it.state === 2 ? '#7cc56b' : it.state === 1 ? '#ffe98a' : '#aab4d4');
    }
    // trim gauge, in the heading bar
    const h = this.hud, gx = W - 130, gw = 42, m = this.moment() / p.trim, bad = this.warn > 0 && Math.floor(this.warn * 8) % 2 === 0; h.clear();
    h.fillStyle(0x000000, 0.5).fillRoundedRect(gx, 9.4, gw, 4, 2); h.fillStyle(bad ? P.red : P.lgreen, 0.4).fillRect(gx + 2, 9.4, gw - 4, 4);
    h.fillStyle(bad ? P.red : 0xffffff).fillCircle(gx + gw / 2 + Phaser.Math.Clamp(m, -1.15, 1.15) * (gw / 2 - 2), 11.4, 1.7); h.fillStyle(0xffffff, 0.7).fillRect(gx + gw / 2 - 0.2, 8.8, 0.4, 5.2);
    this.stat.setText(`KNOCKS ${this.knocks}`);
  }
  /**
   * The bot: one thing at a time. It hoists a load to the one cable length at which the swing's period equals the time the
   * trolley takes to reach full speed, so that speeding up and slowing down each leave the load hanging still; then it
   * lowers and sets down. It takes the old name off the hull first.
   */
  botLift(): [number, number, boolean] {
    const b = this.bot, p = this.p, it = this.carry;
    const go = (X: number, depth: number, ready: () => boolean): [number, number, boolean] => { // travel to X, then lower while `depth` is positive
      const far = Math.abs(X - this.tx), d = Math.sign(X - this.tx), Lt = it ? Math.max(LMIN + 2, GRAV * (VMAX / ACC / (2 * Math.PI)) ** 2 - it.h / 2) : LSAFE;
      if (far > 1) {
        if (it && this.L > Lt + 0.4 && Math.abs(this.vx) < 0.5) return [0, -1, false];
        return [Math.abs(this.vx) < Math.sqrt(2 * ACC * Math.max(0, far - 0.5)) || this.vx * d < 0 ? d : 0, !it && this.L > Lt ? -1 : 0, false];
      }
      if (Math.abs(this.vx) > 1.5 || (it && (Math.abs(this.lvx) > 3.5 || Math.abs(this.hx - X) > 1.6))) return [0, 0, false];
      if (depth > 0) return [0, 1, false];
      return [0, 0, ready()];
    };
    if (!it) {
      if (p.hull.was && !this.egg) return go(this.slot(-1).x + 28, this.deckY - 2 - this.hy, () => true);
      if (b.i < 0 || this.items[b.i].state !== 0) b.i = this.items.findIndex((i) => i.state === 0 && this.fitted(i.needs) && Math.abs(this.moment() + i.wt * i.s) <= p.trim);
      const nx = this.items[b.i]; if (!nx) return [0, 0, false];
      return go(nx.x, nx.y - nx.h - 2.4 - this.hy, () => Math.abs(this.hx - nx.x) < nx.w / 2);
    }
    const sl = this.slot(it.s);
    return go(sl.x, sl.y - it.y - 1.2, () => Math.abs(it.x - sl.x) <= TOL - 0.6 && Math.abs(this.lvx) < SWAY - 3);
  }

  // ------------------------------------------------------------------ act two: the thruster trial
  createTrial() {
    const p = this.p, key = 'fo_basin_' + p.theme, bk = 'fo_deck_' + this.def.id;
    if (!this.textures.exists(key)) tex(this, key, W, H, this.th.basin);
    if (!this.textures.exists(bk)) tex(this, bk, BL, BW, (c) => deckPlan(c, this.th, itemsOf(p), p.hull?.cabin));
    img(this, 0, 0, key).setOrigin(0);
    this.steps = p.steps; [this.x, this.y] = p.start; this.hd = 0;
    this.g = this.add.graphics().setDepth(1);
    this.barge = img(this, this.x, this.y, bk).setDepth(3);
    if (!this.textures.exists('fo_girder')) tex(this, 'fo_girder', 304, 5, (c) => { rr(c, 0, 0.3, 304, 0.9, 0.2, '#f2d14a', OUT, 0.2); rr(c, 0, 3.8, 304, 0.9, 0.2, '#f2d14a', OUT, 0.2); for (let x = 0; x < 304; x += 6) { line(c, x, 0.8, x + 3, 4.2, '#d9b530', 0.45); line(c, x + 3, 4.2, x + 6, 0.8, '#d9b530', 0.45); } });
    img(this, 8, 70, 'fo_girder').setOrigin(0, 0.5).setDepth(4).setAlpha(0.5); // the gantry of act one, overhead
    panel(this, 4, 22, 58, 30, 0.86).setDepth(20); T(this, 8, 24.4, 'WIND', '#aab4d4', 4.2, '700').setDepth(21);
    this.water = loop('sea'); this.water.set(0.6);
    this.say(this.steps[0].say);
  }
  wind() { const s = this.steps[Math.min(this.si, this.steps.length - 1)], w = s.wind || [0, 0], g = 1 + (w[2] || 0) * (0.6 * Math.sin(this.t * 1.7) + 0.4 * Math.sin(this.t * 4.1 + 1)); return { x: w[0] * g, y: w[1] * g, tw: (w[3] || 0) * g }; }
  inBox() { const s = this.steps[this.si], p = this.p; return Math.hypot(this.x - s.at[0], this.y - s.at[1]) <= p.box && Math.abs(Phaser.Math.Angle.WrapDegrees(Phaser.Math.RadToDeg(this.hd) - s.hdg)) <= p.deg; }
  updateTrial(dt: number) {
    const p = this.p, s = this.steps[this.si], wd = this.wind();
    let cx = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), cy = (held('down') ? 1 : 0) - (held('up') ? 1 : 0), ct = (held('b') ? 1 : 0) - (held('a') ? 1 : 0);
    if (AUTO) { // a position-keeping loop of the plainest kind: push towards the box, against the drift and the wind, in pulses
      const pulse = (a: number, full: number) => (Math.abs(a) / full > (this.t * 6) % 1 ? Math.sign(a) : 0);
      cx = pulse(1.2 * (s.at[0] - this.x) - 2.4 * this.ux - wd.x, THRUST); cy = pulse(1.2 * (s.at[1] - this.y) - 2.4 * this.uy - wd.y, THRUST);
      ct = pulse(3 * Phaser.Math.DegToRad(Phaser.Math.Angle.WrapDegrees(s.hdg - Phaser.Math.RadToDeg(this.hd))) - 2.6 * this.w - wd.tw, TWIST);
    }
    if (cx || cy || ct) this.started = true;
    if (this.started) this.t += dt;
    const k = Math.min(1, dt / LAG); this.f[0] += (cx - this.f[0]) * k; this.f[1] += (cy - this.f[1]) * k; this.f[2] += (ct - this.f[2]) * k;
    this.ux += (this.f[0] * THRUST + wd.x - DRAG * this.ux) * dt; this.uy += (this.f[1] * THRUST + wd.y - DRAG * this.uy) * dt; this.w += (this.f[2] * TWIST + wd.tw - TDRAG * this.w) * dt;
    this.x += this.ux * dt; this.y += this.uy * dt; this.hd += this.w * dt;
    // corners: against the quay, and inside the trial area
    const cs = Math.cos(this.hd), sn = Math.sin(this.hd), corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [this.x + (a * BL * cs - b * BW * sn) / 2, this.y + (a * BL * sn + b * BW * cs) / 2]);
    const left = Math.min(...corners.map((c) => c[0]));
    if (left < QEDGE + 1.6) { this.x += QEDGE + 1.6 - left; if (this.ux < -4) this.knock('She touched the quay. Thrust away before you turn or slide.'); if (this.ux < 0) this.ux *= -0.2; }
    for (const [cxw, cyw] of corners) { if (cyw < BANK + 2) { this.y += BANK + 2 - cyw; this.uy = Math.max(0, this.uy); } if (cxw > W - 4) { this.x -= cxw - (W - 4); this.ux = Math.min(0, this.ux); } if (cyw > 174) { this.y -= cyw - 174; this.uy = Math.min(0, this.uy); } }
    // holding
    if (this.inBox()) { this.holdT += dt; if (this.holdT >= s.hold) { this.si++; this.holdT = 0; snd.pickup(); if (this.si >= this.steps.length) return this.trialDone(); this.say(this.steps[this.si].say); } }
    if (this.t > p.limit) { this.ended = true; this.water?.set(0); this.hum.set(0); return void finish(this, this.def, { success: false, title: 'The trial ran out of day', text: 'The hull has to sit in each box, pointing the right way, until the ring fills. Thrust early and in short bursts: she is heavy, the thrusters take a moment to answer, and nothing stops a slide but a push the other way.' }); }
    this.drawTrial(corners, wd);
  }
  trialDone() {
    this.ended = true; this.water?.set(0); this.hum.set(0);
    const p = this.p, stars = this.t <= p.par && this.knocks === 0 ? 3 : this.t <= p.par * 1.6 ? 2 : 1;
    this.say('Trial complete.');
    this.time.delayedCall(1400, () => finish(this, this.def, { success: true, stars, title: this.th.trialTitle, text: this.th.trialText(this.t, this.knocks) + (stars < 3 ? ` For three stars: inside ${Math.floor(p.par / 60)} min ${String(p.par % 60).padStart(2, '0')} s without touching the quay.` : '') }));
  }
  drawTrial(corners: number[][], wd: { x: number; y: number; tw: number }) {
    const g = this.g, p = this.p, s = this.steps[this.si]; g.clear();
    this.barge.setPosition(this.x, this.y).setRotation(this.hd);
    // the box to hold: the hull's outline, pointing the way it should point, and a ring that fills while she is in it
    const a = Phaser.Math.DegToRad(s.hdg), c0 = Math.cos(a), s0 = Math.sin(a), ok = this.inBox(), col = ok ? 0x7cc56b : 0xffffff;
    const pts = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([u, v]) => new Phaser.Math.Vector2(s.at[0] + (u * (BL + 4) * c0 - v * (BW + 4) * s0) / 2, s.at[1] + (u * (BL + 4) * s0 + v * (BW + 4) * c0) / 2));
    for (let i = 0; i < 4; i++) { const A = pts[i], B = pts[(i + 1) % 4], n = Math.round(A.distance(B) / 5); for (let k = 0; k < n; k += 2) g.lineStyle(0.6, col, 0.8).lineBetween(A.x + ((B.x - A.x) * k) / n, A.y + ((B.y - A.y) * k) / n, A.x + ((B.x - A.x) * (k + 1)) / n, A.y + ((B.y - A.y) * (k + 1)) / n); }
    g.fillStyle(col, 0.9).fillTriangle(s.at[0] + c0 * (BL / 2 + 9), s.at[1] + s0 * (BL / 2 + 9), s.at[0] + c0 * (BL / 2 + 4) - s0 * 3, s.at[1] + s0 * (BL / 2 + 4) + c0 * 3, s.at[0] + c0 * (BL / 2 + 4) + s0 * 3, s.at[1] + s0 * (BL / 2 + 4) - c0 * 3);
    g.lineStyle(0.5, 0xffffff, 0.35).strokeCircle(s.at[0], s.at[1], p.box);
    // thruster wash: each corner pushes water the opposite way to its share of the thrust
    const fx = this.f[0], fy = this.f[1], ft = this.f[2]; let load = 0;
    for (const [cxw, cyw] of corners) { const rx = cxw - this.x, ry = cyw - this.y, r = Math.hypot(rx, ry), tx = fx + (-ry / r) * ft * 0.8, ty = fy + (rx / r) * ft * 0.8, m = Math.hypot(tx, ty); load += m; if (m > 0.12 && Math.random() < m * 0.9) this.spray.push({ x: cxw * 0.92 + this.x * 0.08 - tx * 2, y: cyw * 0.92 + this.y * 0.08 - ty * 2, vx: -tx * 26 + (Math.random() - 0.5) * 8, vy: -ty * 26 + (Math.random() - 0.5) * 8, life: 1 }); }
    this.spray = this.spray.filter((q) => (q.life -= 0.028) > 0); for (const q of this.spray) { q.x += q.vx / 60; q.y += q.vy / 60; q.vx *= 0.96; q.vy *= 0.96; g.fillStyle(0xe6ecc8, q.life * 0.5).fillCircle(q.x, q.y, 0.7 + (1 - q.life) * 1.8); }
    this.hum.set(Math.min(1, load / 3), 0.1 + Math.min(1, load / 4) * 0.3);
    // the ring, the windsock and the clock
    const hg = this.hud; hg.clear();
    if (this.holdT > 0) { hg.lineStyle(1.4, 0x7cc56b, 1).beginPath(); hg.arc(s.at[0], s.at[1], p.box, -Math.PI / 2, -Math.PI / 2 + (this.holdT / s.hold) * Math.PI * 2); hg.strokePath(); }
    const wx = 44, wy = 38, wm = Math.hypot(wd.x, wd.y), wa = Math.atan2(wd.y, wd.x);
    hg.lineStyle(0.5, 0x8fa3c8, 0.8).strokeCircle(wx, wy, 10);
    if (wm > 0.15) { const l = Math.min(9, 3 + wm * 1.6), ex = wx + Math.cos(wa) * l, ey = wy + Math.sin(wa) * l; hg.lineStyle(1.3, P.orange, 1).lineBetween(wx - Math.cos(wa) * l, wy - Math.sin(wa) * l, ex, ey); hg.fillStyle(P.orange).fillTriangle(ex + Math.cos(wa) * 2.4, ey + Math.sin(wa) * 2.4, ex + Math.cos(wa + 2.4) * 2.6, ey + Math.sin(wa + 2.4) * 2.6, ex + Math.cos(wa - 2.4) * 2.6, ey + Math.sin(wa - 2.4) * 2.6); } else hg.fillStyle(0x8fa3c8).fillCircle(wx, wy, 1.2);
    for (let i = 0; i < 5; i++) hg.fillStyle(i < Math.round(wm) ? P.orange : 0x3a4057).fillRect(8 + i * 4.4, 44 - i * 1.6, 3.2, 3 + i * 1.6);
    const ms = (v: number) => `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, '0')}`;
    this.stat.setText(`BOX ${Math.min(this.si + 1, this.steps.length)} OF ${this.steps.length} · ${ms(this.t)} · PAR ${ms(p.par)}`).setColor(this.t <= p.par ? '#aab4d4' : '#f28c28');
  }

  update(_t: number, dms: number) {
    if (this.ended) return;
    const dt = Math.min(0.05, dms / 1000); this.cool = Math.max(0, this.cool - dt);
    if (this.act === 'lift') {
      this.updateLift(dt);
      if (!this.ended && this.knocks > this.p.maxKnocks) { this.ended = true; this.hum.set(0); finish(this, this.def, { success: false, title: 'The yard stops the lift', text: 'Too many knocks. Hoist a load well clear before you travel, ease the trolley to a stop so the swing stays small, and wait for it to settle before you lower.' }); }
    } else this.updateTrial(dt);
  }
}
