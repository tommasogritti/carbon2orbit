import { D, C2, el, line, poly, lg, rg, rng, drawSite } from '../art';
import { texAt, soft, add, halo, sheet } from '../hifi';
import type { Look } from '../hifi';
import { spaceTextures, SPACE, puffy, ascentLive, ascentStep } from './flight';

// ------------------------------------------------------------------ Ātea-1: Great Mercury Island, 30 November 2009, 14:23
// The level's own account gives the time: 14:23 local, on the last day of spring, which on New Zealand summer time is a
// little over an hour after the sun's highest point. So this is hard early-afternoon light: a deep sky, a white sun, short
// shadows falling away from it, glitter on the water under it, and the shallows round the island showing turquoise.
// Launch control places its own backdrop, so this look has no layer stack: it redraws the textures the scene asks for
// (`swap`), by the same site code as the plain one (`drawSite`); what moves on the way up is shared with the other
// launch looks (flight.ts).
const SUN = [208, 80], HZ = 82; // where the plain sky has its sun, moved clear of the consoles; the horizon of the site drawing

function sky(c: C2) {
  const [sx, sy] = SUN, r = rng(3);
  c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#083a94'], [0.3, '#1f6ac8'], [0.62, '#5ea6e4'], [0.86, '#a4d0f0'], [1, '#d0e9f8']); c.fillRect(0, 0, 320, 180);
  soft(c, 2.2); for (let i = 0; i < 16; i++) { const x = r() * 340 - 10, y = 8 + r() * 60, len = 26 + r() * 60; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len * 0.5, y - 3 - r() * 4, x + len, y - 1 - r() * 6); c.strokeStyle = `rgba(255,255,255,${0.08 + r() * 0.14})`; c.lineWidth = 0.8 + r() * 1.6; c.stroke(); } soft(c, 0); // mare's tails, very high
  halo(c, sx, sy, 120, '255,250,232', 0.26); halo(c, sx, sy, 42, '255,252,240', 0.6);
  add(c, () => { for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.283 + r() * 0.2, len = 30 + r() * 46, w = 0.035 + r() * 0.03; c.fillStyle = rg(c, sx, sy, 4, len, [0, 'rgba(255,252,236,.14)'], [1, 'rgba(255,252,236,0)']); c.beginPath(); c.moveTo(sx, sy); c.arc(sx, sy, len, a - w, a + w); c.closePath(); c.fill(); } });
  el(c, sx, sy, 6.6, 6.6, '#fffef8'); halo(c, sx, sy, 16, '255,255,250', 0.95);
}
/** The site: the plain drawing's sea, headlands, island and everything standing on it, under an afternoon sun. */
function site(c: C2) {
  const r = rng(7), sx = SUN[0];
  c.fillStyle = lg(c, 0, HZ, 0, 150, [0, '#a9d8ee'], [0.04, '#4b9fd0'], [0.2, '#186eb8'], [0.6, '#0d4e9a'], [1, '#08326e']); c.fillRect(0, HZ, 320, 68);
  soft(c, 3); for (const [x, y, w] of [[40, 96, 46], [262, 104, 54], [120, 138, 70], [300, 132, 40]]) el(c, x, y, w, 2.6 + (y - HZ) * 0.05, 'rgba(6,36,92,.24)'); soft(c, 0); // cloud shadows crossing the water
  for (let i = 0; i < 300; i++) { const k = r() ** 1.5, y = HZ + 0.8 + k * 67, x = r() * 336 - 8, len = 1.6 + k * 13; line(c, x, y, x + len, y, `rgba(${k < 0.35 ? '236,248,255' : '168,214,246'},${0.08 + r() * 0.2})`, 0.2 + k * 0.4); } // swell, closer together toward the horizon
  for (let i = 0; i < 260; i++) { const k = r(), y = HZ + 0.5 + k * k * 62, hw = 3 + (y - HZ) * 0.5, x = sx + (r() - 0.5) * 2 * hw; line(c, x - 0.5 - r() * 2.2, y, x + 0.5 + r() * 2.2, y, `rgba(255,${252 - k * 24},${232 - k * 44},${0.9 - k * 0.55})`, 0.34); } // the sun on the water
  halo(c, sx, HZ + 1.5, 44, '255,246,218', 0.26);
  // far: the Coromandel ranges eight kilometres off, then the plain drawing's two headlands, each paler with distance
  { const pts = [0, HZ]; for (let x = 0; x <= 320; x += 6) pts.push(x, HZ - 5.5 - 3 * Math.sin(x * 0.031 + 1) - 2 * Math.sin(x * 0.083) - (x > 110 && x < 215 ? -3.5 * Math.sin(((x - 110) / 105) * Math.PI) : 0)); pts.push(320, HZ); poly(c, pts, '#a6c6e2'); }
  c.drawImage(sheet(320, 150, D, (t) => { drawSite(t, true, 4); t.globalCompositeOperation = 'source-atop'; t.fillStyle = lg(t, 0, 72, 0, 85, [0, 'rgba(176,208,234,.30)'], [1, 'rgba(196,224,244,.66)']); t.fillRect(0, 0, 320, 150); }), 0, 0, 320, 150);
  c.fillStyle = lg(c, 0, HZ - 7, 0, HZ + 5, [0, 'rgba(226,242,252,0)'], [0.6, 'rgba(226,242,252,.34)'], [1, 'rgba(226,242,252,0)']); c.fillRect(0, HZ - 7, 320, 12); // sea haze along the horizon
  soft(c, 3); el(c, 163, 119.5, 136, 9.5, 'rgba(40,190,196,.42)'); el(c, 163, 121, 126, 5.5, 'rgba(120,232,220,.42)'); soft(c, 0); // the shallows
  // what stands on the island, and the shadow it throws away from the sun
  const things = sheet(320, 150, D, (t) => drawSite(t, true, 8));
  const shade = sheet(320, 150, D, (t) => { t.drawImage(things, 0, 0, 320, 150); t.globalCompositeOperation = 'source-in'; t.fillStyle = '#04201a'; t.fillRect(0, 0, 320, 150); });
  c.drawImage(sheet(320, 150, D, (t) => {
    drawSite(t, true, 2); t.globalCompositeOperation = 'source-atop';
    const q = rng(19); for (let i = 0; i < 900; i++) { const x = 40 + q() * 250, y = 86 + q() * 44, k = q(); line(t, x, y, x + (q() - 0.5) * 1.2, y - 0.5 - q() * 0.9, k < 0.5 ? 'rgba(18,84,44,.22)' : k < 0.85 ? 'rgba(214,246,150,.20)' : 'rgba(250,244,214,.25)', 0.22); } // pasture and dry sand
    t.fillStyle = lg(t, 70, 124, 240, 88, [0, 'rgba(8,44,48,.36)'], [0.5, 'rgba(8,44,48,0)'], [1, 'rgba(255,248,186,.30)']); t.fillRect(0, 0, 320, 150);                                          // the slope turned to the sun, and the one turned away
    t.fillStyle = lg(t, 0, 112, 0, 132, [0, 'rgba(255,255,240,0)'], [0.5, 'rgba(255,255,240,.25)'], [1, 'rgba(120,96,60,.30)']); t.fillRect(0, 108, 320, 30);                                      // dry sand above, wet sand at the water
    soft(t, 0.7); t.globalAlpha = 0.5; t.drawImage(shade, -3, 1.7, 320, 150); t.globalAlpha = 1; soft(t, 0);
  }), 0, 0, 320, 150);
  c.beginPath(); c.moveTo(40, 112.4); c.quadraticCurveTo(160, 134.6, 286, 114.4); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 0.55; c.stroke(); // the wash on the beach
  for (let i = 0; i < 40; i++) { const k = r(), x = 40 + k * 246, y = (1 - k) * (1 - k) * 112.4 + 2 * (1 - k) * k * 134.6 + k * k * 114.4 + 0.5 + r() * 1.4; line(c, x, y, x + 1.5 + r() * 3, y, 'rgba(255,255,255,.5)', 0.3); }
  c.drawImage(sheet(320, 150, D, (t) => { t.drawImage(things, 0, 0, 320, 150); t.globalCompositeOperation = 'source-atop'; t.fillStyle = lg(t, 0, 104, 30, 62, [0, 'rgba(6,30,34,.30)'], [0.55, 'rgba(6,30,34,0)'], [1, 'rgba(255,250,210,.30)']); t.fillRect(0, 0, 320, 150); }), 0, 0, 320, 150);
}
export const mercuryLook: Look = {
  build(scene) {
    texAt(scene, 'hf_mc_sky', 320, 180, D, sky); texAt(scene, 'hf_mc_site', 320, 150, D, site); spaceTextures(scene);
    texAt(scene, 'hf_mc_cloud1', 70, 24, D, puffy(1)); texAt(scene, 'hf_mc_cloud2', 100, 30, D, puffy(2)); texAt(scene, 'hf_mc_cloud3', 46, 16, D, puffy(6));
  },
  layers: [],
  swap: { ...SPACE, sky_day: 'hf_mc_sky', site_island: 'hf_mc_site', cloud1: 'hf_mc_cloud1', cloud2: 'hf_mc_cloud2', cloud3: 'hf_mc_cloud3' },
  grade: { threshold: 0.9, bloom: 0.42, exposure: 1.0, contrast: 1.12, saturation: 1.16, shadows: [0.92, 1.0, 1.12], highs: [1.05, 1.02, 0.95], vignette: 0.36, grain: 0.018, fringe: 0.005 },
  live(hf) { ascentLive(hf, { sun: SUN as [number, number], glint: { x: SUN[0], y0: -17, y1: 30 } }); },
  step: ascentStep,
};
