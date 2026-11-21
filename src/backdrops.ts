import Phaser from 'phaser';
import { tex, lg, rg, rr, el, poly, line, text, rng, cloud, electronFull, OUT, C2 } from './art';

// Platform backdrops. Rule: no repeating modules. Each backdrop is one long strip that reads left to right as a
// walk through that chapter of the story, built from things that were really there.

// ------------------------------------------------------------------ The Rocket Bike: appliance works, 1990s, after hours
function workshop(c: C2) {
  const W = 760;
  c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#252a3c'], [1, '#363c56']); c.fillRect(0, 0, W, 180);
  for (let y = 20; y < 180; y += 9) for (let x = (y / 9) % 2 ? 0 : -10; x < W; x += 20) rr(c, x + 0.4, y + 0.4, 19.2, 8.2, 0.4, 'rgba(255,255,255,.022)');
  const r = rng(14);
  // roof truss, duct and cable tray
  rr(c, 0, 0, W, 20, 0, '#1b1f2d');
  for (let x = 0; x < W; x += 30) { line(c, x, 18, x + 15, 2, '#30364a', 1); line(c, x + 15, 2, x + 30, 18, '#30364a', 1); }
  rr(c, 0, 17, W, 2.4, 0, '#3a4057'); rr(c, 0, 0, W, 2, 0, '#3a4057');
  rr(c, 96, 8, 250, 6, 3, lg(c, 0, 8, 0, 14, [0, '#7b8399'], [1, '#474d60'])); for (let x = 110; x < 340; x += 38) rr(c, x, 7, 2, 8, 0, '#2a2e3c');
  const lamp = (x: number, warm = 'rgba(255,235,170,') => {
    line(c, x, 19, x, 28, '#15171f', 0.5); poly(c, [x - 6, 33, x + 6, 33, x + 3, 28, x - 3, 28], '#4a5066', OUT, 0.3); el(c, x, 33.4, 3, 1, '#fff3c4');
    c.fillStyle = lg(c, 0, 33, 0, 150, [0, warm + '.2)'], [1, warm + '0)']); c.beginPath(); c.moveTo(x - 5, 33); c.lineTo(x + 5, 33); c.lineTo(x + 44, 150); c.lineTo(x - 44, 150); c.closePath(); c.fill();
  };
  const win = (x: number, y: number, w: number, h: number, sky: (x: number, y: number, w: number, h: number) => void) => {
    rr(c, x - 2, y - 2, w + 4, h + 4, 1.2, '#1a1f30', '#4a5066', 1.2); c.fillStyle = lg(c, 0, y, 0, y + h, [0, '#070d26'], [1, '#27407a']); c.fillRect(x, y, w, h);
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); sky(x, y, w, h); c.restore();
    line(c, x + w / 2, y, x + w / 2, y + h, '#4a5066', 1); line(c, x, y + h / 2, x + w, y + h / 2, '#4a5066', 1); rr(c, x - 3, y + h + 2, w + 6, 2, 0.4, '#5b6275');
  };
  const stars = (x: number, y: number, w: number, h: number, n: number) => { for (let i = 0; i < n; i++) el(c, x + r() * w, y + r() * h * 0.8, 0.25 + r() * 0.2, 0.25 + r() * 0.2, '#fff'); };
  const sign = (x: number, y: number, w: number, s: string, bg = '#1f5a34', fg = '#fff', size = 4.2) => { line(c, x + 6, 19, x + 6, y, '#15171f', 0.4); line(c, x + w - 6, 19, x + w - 6, y, '#15171f', 0.4); rr(c, x, y, w, 9, 1, bg, OUT, 0.35); text(c, s, x + w / 2, y + 4.8, size, fg, 700); };

  // ---- A. clocking in: night window with the Southern Cross, wall clock, time cards
  win(18, 34, 54, 50, (x, y, w, h) => {
    stars(x, y, w, h, 16); el(c, x + 42, y + 12, 5, 5, '#f4f2ea'); el(c, x + 44.4, y + 10.6, 4.4, 4.4, '#0b1430');
    for (const [dx, dy, q] of [[14, 12, 0.8], [14, 30, 0.9], [8, 21, 0.75], [20, 19, 0.65], [17, 24, 0.4], [31, 26, 0.8], [39, 29, 0.9]]) el(c, x + dx, y + dy, q, q, '#fff8dc'); // Crux and the Pointers
    poly(c, [x, y + h, x, y + h - 9, x + 16, y + h - 15, x + 30, y + h - 8, x + w, y + h - 13, x + w, y + h], '#0c1226');
  });
  el(c, 98, 44, 9, 9, '#f4f2ea', '#15171f', 1.2); for (let i = 0; i < 12; i++) line(c, 98 + Math.sin(i * 0.5236) * 7.4, 44 - Math.cos(i * 0.5236) * 7.4, 98 + Math.sin(i * 0.5236) * 8.2, 44 - Math.cos(i * 0.5236) * 8.2, '#15171f', 0.4);
  line(c, 98, 44, 96.2, 38.6, '#15171f', 0.9); line(c, 98, 44, 95, 39, '#d8452e', 0.5); line(c, 98, 44, 92, 43.2, '#15171f', 0.7); // twenty to midnight
  rr(c, 84, 60, 30, 28, 1, '#6b5238', OUT, 0.35); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) rr(c, 86.5 + i * 6.6, 62.5 + j * 8.2, 5, 6.6, 0.3, (i + j) % 4 ? '#f4f2ea' : '#ffe98a');
  text(c, 'TIME CARDS', 99, 92, 3, 'rgba(255,255,255,.4)', 700);
  rr(c, 84, 100, 22, 26, 0.6, '#f4f2ea', OUT, 0.3); rr(c, 84, 100, 22, 6, 0.6, '#d8452e'); text(c, '1999', 95, 103.2, 3.4, '#fff', 700); for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) el(c, 87 + j * 4, 110 + i * 4, 0.5, 0.5, '#8b93a7');
  sign(22, 22, 62, 'APPLIANCE WORKS', '#30508a');
  lamp(60);

  // ---- B. tool and die bay: press, lathe, tool board, die blocks
  sign(142, 24, 56, 'TOOL & DIE', '#f2d14a', '#15171f');
  rr(c, 140, 52, 12, 92, 0.6, lg(c, 140, 0, 152, 0, [0, '#5d86a8'], [1, '#2f4f6e']), OUT, 0.4); rr(c, 188, 52, 12, 92, 0.6, lg(c, 188, 0, 200, 0, [0, '#5d86a8'], [1, '#2f4f6e']), OUT, 0.4);
  rr(c, 136, 44, 68, 14, 1.4, lg(c, 0, 44, 0, 58, [0, '#6f9cc0'], [1, '#3a5f82']), OUT, 0.4); rr(c, 160, 58, 20, 30, 0.6, '#b8c0cc', OUT, 0.35); rr(c, 154, 88, 32, 8, 0.8, '#5b6275', OUT, 0.35); // ram and upper die
  rr(c, 152, 114, 36, 8, 0.8, '#8b93a7', OUT, 0.35); rr(c, 136, 122, 68, 22, 1, lg(c, 0, 122, 0, 144, [0, '#4a6f92'], [1, '#27425e']), OUT, 0.4);
  for (let x = 138; x < 200; x += 8) poly(c, [x, 122, x + 4, 122, x + 2, 125, x - 2, 125], '#f2d14a'); el(c, 146, 133, 3, 3, '#d8452e', OUT, 0.3); el(c, 156, 133, 3, 3, '#7cc56b', OUT, 0.3);
  rr(c, 214, 40, 62, 34, 1, '#6b5238', OUT, 0.35); // tool board
  for (let i = 0; i < 7; i++) { const tx = 220 + i * 8.2; if (i % 3 === 0) { line(c, tx, 46, tx, 66, '#b8c0cc', 1.1); el(c, tx, 45, 2, 2, undefined, '#b8c0cc', 1); } else if (i % 3 === 1) { line(c, tx, 50, tx, 68, '#8a6238', 1.4); rr(c, tx - 2.4, 44, 4.8, 6, 0.5, '#8b93a7', OUT, 0.25); } else { line(c, tx, 44, tx, 62, '#b8c0cc', 0.9); rr(c, tx - 1.2, 62, 2.4, 7, 0.8, '#d8452e'); } }
  rr(c, 212, 118, 70, 6, 1, '#5b6275', OUT, 0.35); rr(c, 214, 124, 6, 20, 0.4, '#3a3f4f'); rr(c, 274, 124, 6, 20, 0.4, '#3a3f4f'); // lathe
  rr(c, 214, 98, 20, 20, 1.4, lg(c, 0, 98, 0, 118, [0, '#7cb07a'], [1, '#3f7a4c']), OUT, 0.35); el(c, 238, 108, 5, 7, '#b8c0cc', OUT, 0.35); rr(c, 242, 106.4, 26, 3.2, 1, '#e4e8ee', OUT, 0.25); rr(c, 264, 100, 12, 18, 1, '#5b8f66', OUT, 0.35); el(c, 219, 104, 2, 2, '#15171f');
  rr(c, 214, 82, 62, 2, 0.3, '#8a6238', OUT, 0.25); for (let i = 0; i < 6; i++) rr(c, 216 + i * 10, 75 + (i % 2) * 2, 8, 7 - (i % 2) * 2, 0.4, i % 2 ? '#8b93a7' : '#5b6275', OUT, 0.25); // die blocks
  lamp(208); lamp(266);

  // ---- C. the DishDrawer line: conveyor, overhead hoist, drawers and ovens
  win(318, 40, 50, 40, (x, y, w, h) => { stars(x, y, w, h, 12); poly(c, [x, y + h, x, y + h - 6, x + 20, y + h - 12, x + w, y + h - 5, x + w, y + h], '#0c1226'); });
  sign(376, 24, 70, 'DISHDRAWER LINE', '#f4f2ea', '#15171f', 3.8);
  rr(c, 296, 92, 150, 2.4, 0, '#3a4057'); for (const hx of [330, 398]) { line(c, hx, 94, hx, 104, '#15171f', 0.5); rr(c, hx - 2, 91, 4, 4, 0.4, '#f2d14a', OUT, 0.25); } // hoist rail
  rr(c, 321, 104, 18, 9, 0.6, lg(c, 0, 104, 0, 113, [0, '#d2d8e2'], [1, '#8b93a7']), OUT, 0.3); rr(c, 324, 106, 12, 1, 0.4, '#5b6275'); // a drawer on the hook
  rr(c, 292, 130, 158, 5, 2, '#23262f', OUT, 0.35); for (let x = 296; x < 448; x += 9) el(c, x, 132.5, 1.6, 1.6, '#8b93a7'); for (const x of [298, 370, 440]) rr(c, x, 135, 4, 9, 0.3, '#3a3f4f');
  const drawer = (x: number, open = false) => { rr(c, x, 104, 22, 26, 1, lg(c, x, 0, x + 22, 0, [0, '#e4e8ee'], [1, '#9aa3b5']), OUT, 0.35); for (const y of [106, 118]) { rr(c, x + 1.6, y, 18.8, 10, 0.5, '#c2c8d2', 'rgba(0,0,0,.35)', 0.25); rr(c, x + 4.4, y + 1.4, 13, 1, 0.5, '#5b6275'); } if (open) { rr(c, x + 4, 99, 24, 6, 0.6, '#aab2c0', OUT, 0.3); for (let i = 0; i < 5; i++) line(c, x + 7 + i * 4.4, 99.6, x + 7 + i * 4.4, 96.6, '#e4e8ee', 0.5); } };
  drawer(346); drawer(408, true);
  rr(c, 374, 100, 26, 30, 1, lg(c, 374, 0, 400, 0, [0, '#f4f2ea'], [1, '#aab2c0']), OUT, 0.35); rr(c, 377, 110, 20, 16, 0.8, '#23262f', OUT, 0.25); rr(c, 379, 112, 16, 9, 0.5, 'rgba(255,170,80,.35)'); for (let i = 0; i < 4; i++) el(c, 379 + i * 5.2, 104.6, 1.3, 1.3, '#5b6275'); rr(c, 378, 127, 18, 1, 0.5, '#8b93a7'); // an oven
  rr(c, 296, 100, 14, 30, 0.8, '#30508a', OUT, 0.35); rr(c, 298, 103, 10, 7, 0.4, '#0f1a36'); el(c, 300, 116, 1.3, 1.3, '#7cc56b'); el(c, 305, 116, 1.3, 1.3, '#d8452e'); // line controller
  lamp(304); lamp(362);

  // ---- D. the design corner: whiteboard, drafting table, CAD screen, a telescope at the window
  rr(c, 458, 36, 60, 38, 1, '#f4f2ea', '#8b93a7', 1); // whiteboard: the rocket equation
  text(c, 'Δv = vₑ ln(m₀ / m₁)', 488, 44, 4.6, '#1d3a7a', 600);
  c.beginPath(); c.moveTo(466, 66); c.lineTo(466, 54); c.quadraticCurveTo(470, 48, 474, 54); c.lineTo(474, 66); c.closePath(); c.strokeStyle = '#d8452e'; c.lineWidth = 0.6; c.stroke(); poly(c, [466, 62, 462, 68, 466, 66], undefined, '#d8452e', 0.6); poly(c, [474, 62, 478, 68, 474, 66], undefined, '#d8452e', 0.6);
  line(c, 484, 66, 512, 52, '#2f7a47', 0.5); line(c, 484, 66, 484, 50, '#15171f', 0.4); line(c, 484, 66, 514, 66, '#15171f', 0.4); text(c, 'Isp ?', 502, 61, 3, '#2f7a47', 600);
  rr(c, 458, 75, 60, 2, 0.4, '#8b93a7');
  poly(c, [456, 132, 510, 112, 514, 118, 460, 138], '#2d5fa8', OUT, 0.35); // drafting table with the bike on blueprint
  for (const [bx, by] of [[474, 126], [496, 118]] as number[][]) el(c, bx, by, 4.4, 3.4, undefined, '#dbe9ff', 0.4); line(c, 474, 126, 482, 118, '#dbe9ff', 0.4); line(c, 482, 118, 494, 114, '#dbe9ff', 0.4); line(c, 494, 114, 496, 118, '#dbe9ff', 0.4); rr(c, 472, 121.4, 16, 2.2, 1, undefined, '#dbe9ff', 0.4);
  line(c, 470, 136, 466, 144, '#3a3f4f', 1.4); line(c, 506, 122, 510, 144, '#3a3f4f', 1.4);
  rr(c, 524, 118, 40, 4, 0.6, '#8a6238', OUT, 0.3); rr(c, 526, 122, 4, 22, 0.3, '#5b3d22'); rr(c, 558, 122, 4, 22, 0.3, '#5b3d22'); // desk and CRT
  rr(c, 530, 96, 26, 22, 2, '#d7dbe4', OUT, 0.35); rr(c, 532.4, 98.4, 21.2, 15, 1.4, '#0c1a14'); for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(543, 106, 8 - i * 1.6, 5.4, 0, 0, 6.3); c.strokeStyle = '#4fe07a'; c.lineWidth = 0.3; c.stroke(); } line(c, 535, 106, 551, 106, '#4fe07a', 0.3);
  rr(c, 528, 40, 30, 40, 0.6, '#0b1024', '#f4f2ea', 1); el(c, 543, 56, 9, 9, rg(c, 540, 53, 1, 12, [0, '#f1f1ee'], [1, '#8b90a2'])); el(c, 540, 54, 2, 2, 'rgba(120,125,145,.6)'); el(c, 546, 60, 1.5, 1.5, 'rgba(120,125,145,.6)'); text(c, 'TE MARAMA', 543, 73, 2.8, '#aab4d4', 700); // Moon poster
  win(574, 44, 34, 44, (x, y, w, h) => { stars(x, y, w, h, 14); el(c, x + 9, y + 9, 1.2, 1.2, '#ffd9a8'); });
  line(c, 598, 144, 590, 112, '#3a3f4f', 0.9); line(c, 582, 144, 590, 112, '#3a3f4f', 0.9); line(c, 590, 144, 590, 112, '#3a3f4f', 0.9); // telescope pointed at the window
  c.save(); c.translate(590, 110); c.rotate(-0.75); rr(c, -14, -3, 30, 6, 1.4, lg(c, 0, -3, 0, 3, [0, '#f4f2ea'], [1, '#8b93a7']), OUT, 0.35); rr(c, 14, -3.6, 4, 7.2, 0.6, '#23262f'); rr(c, -17, -1.6, 4, 3.2, 0.6, '#23262f'); c.restore();
  lamp(498, 'rgba(210,230,255,');

  // ---- E. the propellant corner: peroxide drums, glassware, the notice, a scorch mark
  rr(c, 628, 34, 68, 15, 1, '#f4f2ea', '#d8452e', 1.4); text(c, 'NO PROPELLANT', 662, 39, 3.6, '#d8452e', 700); text(c, 'MIXING ON SITE', 662, 44.4, 3.6, '#d8452e', 700);
  c.fillStyle = rg(c, 668, 84, 1, 22, [0, 'rgba(8,8,10,.75)'], [0.5, 'rgba(8,8,10,.35)'], [1, 'rgba(8,8,10,0)']); c.fillRect(640, 58, 60, 52);
  for (let i = 0; i < 11; i++) { const a = r() * 6.28; line(c, 668, 84, 668 + Math.cos(a) * (10 + r() * 14), 84 + Math.sin(a) * (8 + r() * 12), 'rgba(8,8,10,.4)', 0.5); }
  rr(c, 634, 116, 62, 3.4, 0.5, '#8a6238', OUT, 0.3); rr(c, 637, 119, 3, 25, 0.3, '#5b3d22'); rr(c, 690, 119, 3, 25, 0.3, '#5b3d22'); rr(c, 640, 126, 50, 2, 0.3, '#6b4a2b'); // workbench
  rr(c, 642, 108, 20, 8, 1.2, lg(c, 0, 108, 0, 116, [0, '#dfe5ee'], [0.5, '#9aa3b5'], [1, '#6f7890']), OUT, 0.35); el(c, 642, 112, 1.6, 4, '#c2c8d2', OUT, 0.3); // a billet of titanium
  line(c, 660, 110, 667, 104, '#8a6238', 0.3); rr(c, 665, 98, 22, 8, 0.6, '#f2e6c4', OUT, 0.25); text(c, 'TRAINING', 676, 100.6, 2.4, '#5b3d22', 700); text(c, 'PROJECT', 676, 103.6, 2.4, '#5b3d22', 700);
  rr(c, 670, 110, 9, 6, 0.6, '#d8452e', OUT, 0.3); rr(c, 671.4, 108, 6.2, 2.2, 0.6, '#8b93a7', OUT, 0.25); // a bench vice
  for (const wx of [648, 662]) { el(c, wx, 135, 6, 6, undefined, '#23262f', 1.2); el(c, wx, 135, 1, 1, '#8b93a7'); } // spare bike wheels under the bench
  line(c, 621, 52, 621, 58, '#15171f', 0.5); rr(c, 614, 58, 14, 22, 3, '#f2d14a', OUT, 0.35); rr(c, 616, 80, 4.4, 16, 1, '#f2d14a', OUT, 0.3); rr(c, 621.6, 80, 4.4, 16, 1, '#f2d14a', OUT, 0.3); rr(c, 617, 60, 8, 5, 1, '#23262f'); // yellow suit on its hook
  rr(c, 706, 116, 7, 22, 2, '#d8452e', OUT, 0.35); rr(c, 707.6, 112, 3.8, 4, 0.5, '#23262f'); line(c, 711, 113, 715, 118, '#23262f', 0.6);
  lamp(660);

  // ---- F. the roller door, open to Princes Street at night
  rr(c, 720, 46, 40, 98, 0, '#0a1024'); rr(c, 716, 36, 44, 10, 0.6, '#1f5a34', '#f4f2ea', 0.8); text(c, 'PRINCES ST', 738, 41.4, 4.2, '#fff', 700);
  c.save(); c.beginPath(); c.rect(720, 48, 40, 96); c.clip();
  c.fillStyle = lg(c, 0, 48, 0, 144, [0, '#0a1024'], [1, '#27407a']); c.fillRect(720, 48, 40, 96);
  for (let i = 0; i < 9; i++) el(c, 722 + r() * 36, 50 + r() * 30, 0.3, 0.3, '#fff');
  rr(c, 722, 96, 12, 34, 0.3, '#141b33'); rr(c, 736, 86, 10, 44, 0.3, '#182040'); poly(c, [739, 86, 741, 78, 743, 86], '#182040'); rr(c, 748, 100, 12, 30, 0.3, '#141b33'); for (let i = 0; i < 10; i++) rr(c, 723 + (i % 3) * 13 + r() * 6, 98 + r() * 26, 1.2, 1.6, 0, '#ffe98a');
  rr(c, 720, 130, 40, 14, 0, '#23262f'); for (let x = 722; x < 760; x += 8) rr(c, x, 136, 4, 1, 0, '#f4f2ea');
  line(c, 752, 130, 752, 104, '#5b6275', 0.8); el(c, 750, 104, 2.4, 1.2, '#fff3c4'); c.fillStyle = rg(c, 750, 108, 0.5, 16, [0, 'rgba(255,235,170,.5)'], [1, 'rgba(255,235,170,0)']); c.fillRect(734, 100, 26, 30);
  for (let i = 0; i < 6; i++) poly(c, [720 + i * 7, 52, 727 + i * 7, 52, 723.5 + i * 7, 58], i % 2 ? '#f4f2ea' : '#15171f'); // street-sprint bunting
  c.beginPath(); c.moveTo(733, 131); c.lineTo(735, 127.6); c.quadraticCurveTo(741, 124.4, 747, 125.6); c.lineTo(752, 127.4); c.lineTo(760, 128.4); c.lineTo(760, 131); c.closePath(); c.fillStyle = '#c8102e'; c.fill(); el(c, 739, 131, 2, 2, '#0b0c12'); el(c, 754, 131, 2, 2, '#0b0c12'); // a low red sports car waits at the line
  for (const dx of [722, 729]) { rr(c, dx, 124, 6, 11, 1, lg(c, dx, 0, dx + 6, 0, [0, '#4d9be8'], [1, '#163a70']), OUT, 0.3); poly(c, [dx + 3, 127, dx + 4.6, 129, dx + 3, 131, dx + 1.4, 129], '#f2d14a'); } // the peroxide stays outside
  c.restore();
  rr(c, 716, 46, 4, 98, 0.4, '#f2d14a', OUT, 0.3); for (let y = 50; y < 144; y += 10) poly(c, [716, y, 720, y + 4, 720, y + 8, 716, y + 4], '#15171f');
}

// ------------------------------------------------------------------ Road to Māhia, 2016
/** Far layer: sky, the long white cloud, Hawke Bay, Mokotahi, a dolphin, Portland Island and its light. */
function mahiaFar(c: C2) {
  const W = 520;
  c.fillStyle = '#12407f'; c.fillRect(0, 0, W, 180);
  c.translate(0, -15); // horizon sits above the middle layer's ridge so the bay, the island and the boat stay in view
  c.fillStyle = lg(c, 0, 0, 0, 120, [0, '#2a78d2'], [0.6, '#7cc0f0'], [1, '#d6ecfb']); c.fillRect(0, 0, W, 120);
  c.fillStyle = rg(c, 430, 34, 2, 76, [0, 'rgba(255,250,220,.95)'], [0.12, 'rgba(255,245,200,.5)'], [1, 'rgba(255,245,200,0)']); c.fillRect(330, 0, 190, 120); el(c, 430, 34, 7, 7, '#fffbe6');
  c.save(); c.translate(70, 40); c.scale(1, 0.55); cloud(c, 230, 34, 9, '#c8dcf0'); c.restore(); // ao tea roa: the long white cloud
  c.save(); c.translate(330, 62); cloud(c, 64, 16, 4, '#c8dcf0'); c.restore();
  c.fillStyle = lg(c, 0, 116, 0, 180, [0, '#8cc8f0'], [0.07, '#2f7fd0'], [1, '#12407f']); c.fillRect(0, 116, W, 64);
  const r = rng(52); for (let i = 0; i < 170; i++) { const x = r() * W, y = 120 + r() * 58; line(c, x, y, x + 3 + r() * 8, y, `rgba(220,240,255,${0.12 + r() * 0.28})`, 0.4); }
  // the hills behind Wairoa
  poly(c, [0, 117, 0, 92, 30, 84, 62, 94, 96, 88, 130, 104, 150, 117], lg(c, 0, 84, 0, 117, [0, '#6f9fb8'], [1, '#5a8aa6']));
  // Mokotahi: the pale headland at Māhia Beach
  c.beginPath(); c.moveTo(176, 117); c.lineTo(190, 100); c.quadraticCurveTo(206, 82, 224, 88); c.lineTo(236, 96); c.lineTo(244, 117); c.closePath(); c.fillStyle = lg(c, 0, 84, 0, 117, [0, '#7fb07a'], [1, '#5f9468']); c.fill();
  poly(c, [224, 88, 236, 96, 244, 117, 228, 117, 222, 100], '#efe6c8'); for (let i = 0; i < 5; i++) line(c, 226 + i * 3, 96 + i * 3, 228 + i * 3, 114, 'rgba(120,100,60,.3)', 0.4);
  // a dolphin in the bay, and a boat with crayfish pots
  c.beginPath(); c.moveTo(286, 121); c.quadraticCurveTo(294, 106, 304, 120); c.quadraticCurveTo(295, 114, 288, 122); c.closePath(); c.fillStyle = '#5b6b7e'; c.fill(); poly(c, [294, 112.4, 297.4, 108.4, 297.6, 113.4], '#5b6b7e'); for (const dx of [284, 306]) line(c, dx - 2, 122, dx + 2, 122, 'rgba(255,255,255,.8)', 0.6);
  poly(c, [340, 122, 364, 122, 360, 127, 343, 127], '#d8452e', OUT, 0.3); rr(c, 348, 116, 8, 6, 0.4, '#f4f2ea', OUT, 0.25); line(c, 358, 122, 358, 112, '#3a3f4f', 0.4); rr(c, 341.6, 119, 4, 3, 0.3, '#8a6238', OUT, 0.2);
  // Portland Island (Waikawa) off the tip of the peninsula, with its light
  c.beginPath(); c.moveTo(420, 117); c.quadraticCurveTo(440, 100, 470, 102); c.lineTo(498, 106); c.lineTo(508, 117); c.closePath(); c.fillStyle = lg(c, 0, 100, 0, 117, [0, '#7fb07a'], [1, '#5f9468']); c.fill(); poly(c, [498, 106, 508, 117, 494, 117], '#efe6c8');
  rr(c, 462, 92, 2.6, 10, 0.3, '#f4f2ea', OUT, 0.2); rr(c, 461.4, 90, 3.8, 2.4, 0.4, '#d8452e'); c.fillStyle = 'rgba(255,245,200,.35)'; c.beginPath(); c.moveTo(463, 91); c.lineTo(440, 86); c.lineTo(440, 94); c.closePath(); c.fill();
  // gannets
  for (const [gx, gy, s] of [[250, 44, 1], [262, 50, 0.8], [240, 54, 0.7], [388, 72, 0.9]] as number[][]) { c.beginPath(); c.moveTo(gx - 5 * s, gy); c.quadraticCurveTo(gx - 2 * s, gy - 3 * s, gx, gy); c.quadraticCurveTo(gx + 2 * s, gy - 3 * s, gx + 5 * s, gy); c.strokeStyle = '#f4f2ea'; c.lineWidth = 0.7; c.stroke(); el(c, gx - 5 * s, gy, 0.5, 0.4, '#15171f'); el(c, gx + 5 * s, gy, 0.5, 0.4, '#15171f'); }
}
/** Middle layer, transparent above the ridge, in the order you would drive it: Wairoa, Māhia Beach, the coast road, Onenui Station, the building site, the range. */
function mahiaMid(c: C2) {
  const W = 760, r = rng(61);
  const ridge = (x: number) => 104 + 9 * Math.sin(x * 0.016 + 0.6) + 5 * Math.sin(x * 0.041 + 2) - (x > 560 ? Math.min(10, (x - 560) * 0.06) : 0);
  c.beginPath(); c.moveTo(0, 138); for (let x = 0; x <= W; x += 4) c.lineTo(x, ridge(x)); c.lineTo(W, 138); c.closePath();
  c.fillStyle = lg(c, 0, 90, 0, 138, [0, '#7cc56b'], [0.5, '#5aa85c'], [1, '#3f8a4c']); c.fill();
  c.beginPath(); c.moveTo(0, 138); for (let x = 0; x <= W; x += 8) c.lineTo(x, 134 + 2 * Math.sin(x * 0.05)); c.lineTo(W, 141); c.lineTo(0, 141); c.closePath(); c.fillStyle = '#e6d9a8'; c.fill(); // beach
  for (let i = 0; i < 90; i++) { const x = r() * W, y = ridge(x) + 4 + r() * 24; el(c, x, y, 2 + r() * 3, 1 + r() * 1.4, 'rgba(40,110,60,.25)'); }
  const house = (x: number, w: number, h: number, wall: string, roof: string) => { const y = ridge(x + w / 2) + 3; rr(c, x, y - h, w, h, 0.3, wall, OUT, 0.3); poly(c, [x - 1.5, y - h, x + w / 2, y - h - w * 0.36, x + w + 1.5, y - h], roof, OUT, 0.3); rr(c, x + w * 0.4, y - h * 0.55, w * 0.2, h * 0.55, 0.2, '#3a3f4f'); };
  const cabbage = (x: number) => { const y = ridge(x) + 2; line(c, x, y, x + 0.6, y - 11, '#6b5238', 1); for (let i = 0; i < 9; i++) { const a = -1.57 + (i - 4) * 0.36; line(c, x + 0.6, y - 11, x + 0.6 + Math.cos(a) * 5, y - 11 + Math.sin(a) * 5, '#2f7a47', 0.7); } };
  const pohutukawa = (x: number) => { const y = ridge(x) + 2; line(c, x, y, x - 1, y - 7, '#5b3d22', 1.4); for (let i = 0; i < 7; i++) el(c, x - 6 + r() * 12, y - 9 - r() * 6, 3.4, 2.6, i % 2 ? '#2f6b3a' : '#3f8a4c'); for (let i = 0; i < 7; i++) el(c, x - 6 + r() * 12, y - 9 - r() * 6, 0.8, 0.7, '#c8102e'); };
  const fence = (x0: number, x1: number) => { for (let x = x0; x <= x1; x += 6) { const y = ridge(x); line(c, x, y + 1, x, y - 3, '#d9cfb4', 0.5); if (x + 6 <= x1) line(c, x, y - 2, x + 6, ridge(x + 6) - 2, '#d9cfb4', 0.3); } };
  const sheepDot = (x: number, dy: number) => { const y = ridge(x) + dy; el(c, x, y, 2, 1.3, '#f4f2ea'); el(c, x + 1.8, y - 0.4, 0.8, 0.7, '#2f2f38'); };
  const cow = (x: number, dy: number) => { const y = ridge(x) + dy; rr(c, x, y - 3, 6, 3, 1, '#23262f'); rr(c, x + 5, y - 4, 2.4, 2.2, 0.6, '#23262f'); line(c, x + 1, y, x + 1, y + 2, '#23262f', 0.5); line(c, x + 5, y, x + 5, y + 2, '#23262f', 0.5); };
  const road = (x0: number, x1: number) => { c.beginPath(); for (let x = x0; x <= x1; x += 4) { const y = ridge(x) + 13 + 3 * Math.sin(x * 0.03); x === x0 ? c.moveTo(x, y) : c.lineTo(x, y); } c.strokeStyle = '#cdbf9a'; c.lineWidth = 3.2; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 0.3; c.stroke(); };
  const roadY = (x: number) => ridge(x) + 13 + 3 * Math.sin(x * 0.03);
  road(40, 700);
  // ---- Wairoa: the river bridge, the town, and the old Portland Island lighthouse that now stands by the river
  rr(c, 4, 128, 46, 2, 0, '#8b93a7'); for (let x = 6; x < 48; x += 8) { line(c, x, 128, x + 4, 122, '#8b93a7', 0.6); line(c, x + 4, 122, x + 8, 128, '#8b93a7', 0.6); } line(c, 6, 122, 48, 122, '#8b93a7', 0.6); c.fillStyle = 'rgba(47,127,208,.8)'; c.fillRect(0, 130, 52, 8);
  house(58, 9, 6, '#f4f2ea', '#d8452e'); house(72, 8, 5, '#dbe9ff', '#5b6275'); house(98, 10, 6, '#f2e6c4', '#30508a');
  { const y = ridge(88) + 2; poly(c, [85.4, y, 86.4, y - 12, 89.6, y - 12, 90.6, y], '#f4f2ea', OUT, 0.3); rr(c, 85.6, y - 15, 4.8, 3, 0.4, '#bfe3ff', OUT, 0.25); poly(c, [85.2, y - 15, 88, y - 18, 90.8, y - 15], '#d8452e', OUT, 0.25); }
  cabbage(112); cabbage(118);
  // ---- Māhia Beach and the coast road: baches, pōhutukawa, a caravan, a tractor launching a boat, the first trucks
  house(132, 8, 5, '#dbe9ff', '#3fb0a0'); house(146, 9, 5, '#f2e6c4', '#d8452e');
  pohutukawa(166); pohutukawa(182); cabbage(196);
  { const x = 204, y = ridge(x) + 6; rr(c, x, y - 6, 12, 6, 1.6, '#f4f2ea', OUT, 0.3); rr(c, x + 2, y - 4.6, 4, 2.4, 0.3, '#bfe3ff'); rr(c, x, y - 2.4, 12, 0.8, 0, '#3fb0a0'); el(c, x + 6, y + 0.4, 1.4, 1.4, '#15171f'); line(c, x + 12, y - 1, x + 15, y - 1, '#3a3f4f', 0.4); }
  { const x = 224, y = 136; rr(c, x, y - 4.6, 7, 4, 0.8, '#30508a', OUT, 0.3); rr(c, x + 1, y - 7.6, 4, 3.2, 0.5, '#bfe3ff', OUT, 0.25); el(c, x + 1.6, y, 2.2, 2.2, '#15171f'); el(c, x + 6, y + 0.4, 1.4, 1.4, '#15171f'); line(c, x + 7, y - 1, x + 11, y - 1, '#3a3f4f', 0.5); poly(c, [x + 10, y - 3, x + 24, y - 3, x + 22, y + 0.6, x + 12, y + 0.6], '#f4f2ea', OUT, 0.3); rr(c, x + 14, y - 5.4, 4, 2.4, 0.3, '#d8452e', OUT, 0.2); el(c, x + 17, y + 1, 1.2, 1.2, '#15171f'); }
  { const x = 262, y = roadY(x + 12) - 1; rr(c, x, y - 2.4, 26, 1.6, 0.4, '#3a3f4f'); rr(c, x + 2, y - 8.4, 18, 6, 3, lg(c, 0, y - 8.4, 0, y - 2.4, [0, '#f4f4f0'], [1, '#aab2c0']), OUT, 0.3); text(c, 'LOX', x + 11, y - 5.2, 2.6, '#4a5066', 700); rr(c, x + 22, y - 8, 6, 6, 0.8, '#30508a', OUT, 0.3); rr(c, x + 24.4, y - 7, 3, 2.4, 0.3, '#bfe3ff'); for (const wx of [x + 3, x + 7, x + 17, x + 25]) el(c, wx, y, 1.6, 1.6, '#15171f'); }
  { const x = 302, y = roadY(x + 8) - 1; rr(c, x + 11, y - 7, 6, 6, 0.8, '#f2d14a', OUT, 0.3); rr(c, x + 13.4, y - 6, 3, 2.4, 0.3, '#bfe3ff'); c.save(); c.translate(x + 5, y - 5.4); c.rotate(-0.25); rr(c, -6, -3.4, 12, 6.8, 3, '#e4e8ee', OUT, 0.3); for (let i = -1; i < 2; i++) line(c, i * 3.4, -3.2, i * 3.4 + 1.4, 3.2, '#d8452e', 0.5); c.restore(); for (const wx of [x + 2, x + 8, x + 15]) el(c, wx, y, 1.6, 1.6, '#15171f'); }
  for (const cx2 of [246, 254, 294, 326]) { const y = roadY(cx2) + 2.4; poly(c, [cx2 - 1.2, y, cx2, y - 3.4, cx2 + 1.2, y], '#ff7a1a', OUT, 0.2); rr(c, cx2 - 0.8, y - 1.8, 1.6, 0.6, 0, '#fff'); } // road cones on the upgraded road
  for (let x = 250; x < 700; x += 38) { const y = roadY(x) - 3; line(c, x, y + 2, x, y - 9, '#6b5238', 0.5); line(c, x - 2.4, y - 8, x + 2.4, y - 8, '#6b5238', 0.5); if (x + 38 < 700) { c.beginPath(); c.moveTo(x, y - 8); c.quadraticCurveTo(x + 19, y - 4, x + 38, roadY(x + 38) - 11); c.strokeStyle = 'rgba(30,30,40,.5)'; c.lineWidth = 0.25; c.stroke(); } }
  // ---- Onenui Station, on Tawapata South land: the gate, the woolshed, sheep and beef
  { const x = 342, y = ridge(x) + 2; line(c, x - 9, y, x - 9, y - 9, '#6b5238', 0.9); line(c, x + 9, y, x + 9, y - 9, '#6b5238', 0.9); rr(c, x - 11, y - 15, 22, 7.4, 0.5, '#f4f2ea', OUT, 0.25); text(c, 'ONENUI STATION', x, y - 12.6, 2.4, '#1f5a34', 700); text(c, 'Tawapata South Inc.', x, y - 9.8, 1.9, '#1f5a34', 600); }
  fence(356, 500);
  house(366, 22, 9, '#b8452e', '#8f8a80'); for (let i = 0; i < 5; i++) line(c, 368 + i * 4.4, ridge(377) - 6, 368 + i * 4.4, ridge(377) + 2, 'rgba(0,0,0,.2)', 0.3);
  for (const [sx, dy] of [[396, 6], [404, 9], [412, 5], [420, 10], [392, 12], [430, 7]] as number[][]) sheepDot(sx, dy);
  for (const [cx2, dy] of [[448, 8], [460, 12], [472, 6]] as number[][]) cow(cx2, dy);
  { const x = 438, y = roadY(x) - 1; rr(c, x, y - 4.6, 7, 4, 0.8, '#d8452e', OUT, 0.3); rr(c, x + 1, y - 7.6, 4, 3.2, 0.5, '#bfe3ff', OUT, 0.25); el(c, x + 1.6, y, 2.2, 2.2, '#15171f'); el(c, x + 6, y + 0.4, 1.4, 1.4, '#15171f'); }
  for (const hx of [486, 494, 491]) el(c, hx, ridge(hx) + (hx === 491 ? 2 : 5), 2.6, 2.4, '#e2c877', '#a8801c', 0.3);
  // ---- the building site: crane, containers, site office, survey tripod, the tracking dish on the hill
  { const x = 522, y = ridge(x) + 3; line(c, x, y, x, y - 34, '#f2d14a', 1.4); line(c, x, y - 34, x + 26, y - 30, '#f2d14a', 1.1); line(c, x, y - 34, x - 8, y - 31, '#f2d14a', 1.1); line(c, x, y - 38, x + 26, y - 30, '#8b93a7', 0.3); line(c, x, y - 38, x, y - 34, '#f2d14a', 1); line(c, x + 22, y - 30.4, x + 22, y - 16, '#15171f', 0.3); rr(c, x + 16, y - 16, 12, 7, 0.3, '#e4e8ee', OUT, 0.3); rr(c, x - 4, y - 4, 8, 4, 0.5, '#f2d14a', OUT, 0.3); }
  { const y = ridge(566) + 4; for (const [dx, dy, col] of [[0, 0, '#d8452e'], [12, 0, '#30508a'], [4, -5, '#2f7a47'], [26, 0, '#f28c28']] as [number, number, string][]) { rr(c, 558 + dx, y - 5 + dy, 11, 5, 0.3, col, OUT, 0.3); for (let i = 1; i < 5; i++) line(c, 558 + dx + i * 2.2, y - 4.6 + dy, 558 + dx + i * 2.2, y - 0.4 + dy, 'rgba(0,0,0,.2)', 0.25); } }
  { const x = 600, y = ridge(x) + 4; rr(c, x, y - 6, 16, 6, 0.4, '#f4f2ea', OUT, 0.3); rr(c, x + 2, y - 4.6, 3, 2.4, 0.2, '#bfe3ff'); rr(c, x + 7, y - 4.6, 3, 2.4, 0.2, '#bfe3ff'); rr(c, x + 12, y - 4.6, 2.4, 4.6, 0.2, '#5b6275'); }
  { const x = 622, y = ridge(x) + 6; line(c, x, y - 7, x - 3, y, '#f2d14a', 0.5); line(c, x, y - 7, x + 3, y, '#f2d14a', 0.5); line(c, x, y - 7, x, y, '#f2d14a', 0.5); rr(c, x - 1.4, y - 9.4, 2.8, 2.4, 0.4, '#23262f'); }
  { const x = 636, y = ridge(x) + 1; line(c, x, y, x, y - 9, '#8b93a7', 1.2); c.save(); c.translate(x, y - 11); c.rotate(-0.6); c.beginPath(); c.ellipse(0, 0, 7, 2.6, 0, 0, 6.3); c.fillStyle = '#f4f4f0'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.3; c.stroke(); line(c, 0, 0, 0, -5, '#8b93a7', 0.5); el(c, 0, -5, 0.9, 0.9, '#d8452e'); c.restore(); }
  // ---- the range at the tip: hangar, range control, tanks, masts, the flag
  { const x = 648, y = ridge(x + 16) + 4; rr(c, x, y - 14, 34, 14, 0.4, '#eef1f5', OUT, 0.35); poly(c, [x - 1.6, y - 14, x + 17, y - 19, x + 35.6, y - 14], '#aab2c0', OUT, 0.3); rr(c, x + 5, y - 10, 13, 10, 0.3, '#5b6275'); for (let i = 1; i < 4; i++) line(c, x + 5 + i * 3.25, y - 10, x + 5 + i * 3.25, y, 'rgba(255,255,255,.2)', 0.25); rr(c, x + 22, y - 8, 8, 4, 0.3, '#bfe3ff', OUT, 0.2); }
  { const x = 690, y = ridge(x + 6) + 4; rr(c, x, y - 7, 14, 7, 0.4, '#dbe9ff', OUT, 0.3); rr(c, x + 2, y - 5.4, 10, 2.4, 0.2, '#30508a'); line(c, x + 11, y - 7, x + 11, y - 13, '#8b93a7', 0.4); }
  for (const tx of [712, 720]) { const y = ridge(tx) + 3; rr(c, tx, y - 9, 6, 9, 2.4, lg(c, tx, 0, tx + 6, 0, [0, '#f4f4f0'], [1, '#9aa3b5']), OUT, 0.3); }
  for (const mx of [706, 734, 748]) { const y = ridge(mx) + 2; line(c, mx, y, mx, y - 30, '#8b93a7', 0.5); line(c, mx, y - 30, mx, y - 27, '#d8452e', 0.7); }
  { const x = 741, y = ridge(x) + 2; rr(c, x - 3, y - 22, 1.4, 22, 0.2, '#5b6275'); rr(c, x - 0.6, y - 22, 1.4, 22, 0.2, '#5b6275'); for (let k = 2; k < 22; k += 4) line(c, x - 3, y - k, x + 0.8, y - k - 3, '#8b93a7', 0.3); } // the strongback, still waiting for its first rocket
  { const x = 682, y = ridge(x) + 2; line(c, x, y, x, y - 13, '#f4f2ea', 0.5); rr(c, x, y - 13, 7, 4.4, 0.2, '#1d3a7a', OUT, 0.2); rr(c, x, y - 13, 3, 2, 0, '#c8102e'); for (const [sx, sy] of [[5, -11.4], [5.6, -9.8], [4.2, -10.2]] as number[][]) el(c, x + sx, y + sy, 0.4, 0.4, '#c8102e'); }
  fence(640, 756);
}


// ------------------------------------------------------------------ RKLB rings the bell, 2021: from the Long Beach factory floor to the opening bell
function listing(c: C2, scene: Phaser.Scene) {
  const W = 760, r = rng(77);
  c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#27314d'], [1, '#3a4667']); c.fillRect(0, 0, W, 180);
  for (let x = 0; x < 566; x += 38) line(c, x, 16, x, 138, 'rgba(255,255,255,.035)', 0.6); // wall panels
  // ceiling: trusses and strip lights of a modern factory
  rr(c, 0, 0, 566, 16, 0, '#1b2236'); for (let x = 0; x < 560; x += 40) { line(c, x, 15, x + 20, 3, '#55607e', 0.9); line(c, x + 20, 3, x + 40, 15, '#55607e', 0.9); }
  rr(c, 0, 14.4, 566, 1.8, 0, '#55607e');
  for (let x = 30; x < 540; x += 92) { rr(c, x, 20, 44, 2.4, 1.2, '#f4f8ff'); c.fillStyle = lg(c, 0, 22, 0, 124, [0, 'rgba(210,230,255,.15)'], [1, 'rgba(210,230,255,0)']); c.beginPath(); c.moveTo(x, 22); c.lineTo(x + 44, 22); c.lineTo(x + 76, 124); c.lineTo(x - 32, 124); c.closePath(); c.fill(); }
  rr(c, 0, 138, 566, 6, 0, '#1f2740');
  const sign = (x: number, y: number, w: number, s: string, bg = '#101624', fg = '#fff', size = 4.2) => { rr(c, x, y, w, 9, 1, bg, OUT, 0.35); text(c, s, x + w / 2, y + 4.8, size, fg, 700); };

  // ---- A. the factory floor: Long Beach builds the Rutherford engines (the rockets themselves are built in Auckland)
  sign(14, 26, 84, 'LONG BEACH · HEADQUARTERS'); sign(104, 26, 76, 'RUTHERFORD PRODUCTION', '#1f5a34');
  for (const x of [28, 176]) rr(c, x, 46, 2.6, 92, 0.4, '#f2d14a', OUT, 0.3);
  rr(c, 26, 86, 154, 2.4, 0.4, '#f2d14a', OUT, 0.3);
  const eng = scene.textures.get('rutherford').getSourceImage() as HTMLCanvasElement;
  for (let i = 0; i < 6; i++) { c.drawImage(eng, 36 + i * 23.4, 52, 26, 33.8); rr(c, 40 + i * 23.4, 44, 18, 5, 0.6, '#f4f6fa', OUT, 0.25); text(c, 'S/N ' + (211 + i), 49 + i * 23.4, 46.7, 2.8, '#15171f', 700); }
  for (let i = 0; i < 4; i++) { const x = 40 + i * 34; c.drawImage(eng, x, 98, 26, 33.8); rr(c, x - 2, 132, 30, 2.4, 0.5, '#8b93a7', OUT, 0.3); for (const dx of [2, 24]) el(c, x + dx, 136, 1.8, 1.8, '#0b0c12'); }
  rr(c, 186, 108, 12, 30, 0.6, '#c8102e', OUT, 0.3); for (let i = 0; i < 4; i++) rr(c, 187.6, 110.5 + i * 6.6, 8.8, 5, 0.3, '#8a0b1f'); // tool chest

  // ---- B. mission control behind glass
  sign(214, 28, 64, 'MISSION CONTROL');
  rr(c, 206, 42, 82, 66, 1.2, '#0a1022', '#8b93a7', 1.1);
  rr(c, 212, 47, 70, 26, 0.6, '#0f2350'); c.save(); c.beginPath(); c.rect(212, 47, 70, 26); c.clip();
  for (const [x, y, w, h] of [[220, 54, 12, 9], [236, 52, 16, 12], [258, 58, 10, 7], [268, 53, 9, 6]]) el(c, x + w / 2, y + h / 2, w / 2, h / 2, '#2f7a47');
  c.beginPath(); for (let x = 212; x <= 282; x += 2) { const y = 60 + 9 * Math.sin((x - 212) * 0.09); if (x === 212) c.moveTo(x, y); else c.lineTo(x, y); } c.strokeStyle = '#ffe98a'; c.lineWidth = 0.6; c.stroke(); el(c, 262, 60 + 9 * Math.sin(50 * 0.09), 1.1, 1.1, '#fff'); c.restore();
  for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) { const x = 212 + i * 14.4 + row * 4, y = 80 + row * 13; rr(c, x, y, 9, 6, 0.4, i % 2 ? '#7fd0ff' : '#9fe6a8'); rr(c, x - 1, y + 6.6, 11, 1.6, 0.3, '#2a3350'); el(c, x + 4.5, y + 10.6, 2, 2, '#0b0c12'); }
  line(c, 247, 42, 247, 108, '#8b93a7', 0.8);

  // ---- C. the deal: the Neutron whiteboard of March 2021, three clocks, a desk run as a video roadshow
  rr(c, 302, 34, 78, 56, 1, '#f4f6fa', '#8b93a7', 1); text(c, 'NEUTRON', 322, 41, 5, '#c8102e', 700); text(c, 'MARCH 2021', 359, 41, 3.2, '#5b6275', 700);
  poly(c, [320, 84, 316, 60, 319, 48, 322, 45, 325, 48, 328, 60, 324, 84], '#e6e9f0', '#15171f', 0.5); line(c, 316.6, 64, 327.4, 64, '#15171f', 0.4); for (const d of [-1, 1]) line(c, 322 + d * 2.6, 84, 322 + d * 7, 88, '#15171f', 0.5);
  text(c, '8 t to LEO', 356, 50, 4, '#15171f', 700); text(c, '40 m tall', 356, 57, 4, '#15171f', 700); text(c, '4.5 m fairing', 356, 64, 4, '#15171f', 700); text(c, 'reusable', 356, 71.4, 4, '#1f5a34', 700); line(c, 340, 74.4, 372, 74.4, '#1f5a34', 0.5);
  text(c, '“never” ✗', 356, 82, 3.6, '#c8102e', 700);
  for (const [i, city, hh, mm] of [[0, 'AUCKLAND', 1.5, 30], [1, 'LONG BEACH', 6.5, 30], [2, 'NEW YORK', 9.5, 30]] as [number, string, number, number][]) {
    const x = 404 + i * 26; el(c, x, 46, 8, 8, '#f4f2ea', '#15171f', 1); line(c, x, 46, x + Math.sin((hh / 12) * 6.283) * 4.4, 46 - Math.cos((hh / 12) * 6.283) * 4.4, '#15171f', 0.9); line(c, x, 46, x + Math.sin((mm / 60) * 6.283) * 6.4, 46 - Math.cos((mm / 60) * 6.283) * 6.4, '#15171f', 0.5);
    text(c, city, x, 58.6, 2.9, 'rgba(255,255,255,.7)', 700); text(c, i ? 'WED' : 'THU', x, 63, 2.6, i ? 'rgba(255,255,255,.45)' : '#ffe98a', 700);
  }
  rr(c, 392, 116, 82, 3, 0.6, '#d9dee8', OUT, 0.3); for (const x of [398, 466]) rr(c, x, 119, 2, 19, 0, '#55607e');
  rr(c, 400, 92, 30, 20, 1, '#0b1226', '#8b93a7', 0.7); c.beginPath(); c.moveTo(403, 108); for (const [x, y] of [[408, 104], [412, 106], [417, 100], [421, 101], [427, 95]]) c.lineTo(x, y); c.strokeStyle = '#7cc56b'; c.lineWidth = 0.9; c.stroke(); rr(c, 413.4, 112, 3, 4, 0, '#55607e');
  rr(c, 436, 92, 30, 20, 1, '#0b1226', '#8b93a7', 0.7); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { rr(c, 438.4 + i * 9, 94.2 + j * 8.8, 7.6, 7, 0.4, '#27407a'); el(c, 442.2 + i * 9, 97 + j * 8.8, 1.5, 1.5, ['#e8b796', '#c98f6b', '#f0c9a8'][(i + j) % 3]); rr(c, 439.8 + i * 9, 99 + j * 8.8, 4.8, 2.2, 1, '#15171f'); } rr(c, 449.4, 112, 3, 4, 0, '#55607e');
  for (let i = 0; i < 4; i++) rr(c, 478, 132 - i * 4.4, 13, 4, 0.4, ['#27407a', '#c8102e', '#27407a', '#1f5a34'][i], OUT, 0.25); text(c, 'S-4', 484.5, 120.8, 2.8, '#fff', 700);

  // ---- D. the board: one ticker goes out, another comes in
  rr(c, 500, 36, 60, 44, 1.2, '#07090f', '#8b93a7', 1.1);
  text(c, 'VACQ', 530, 46, 6.4, 'rgba(255,255,255,.4)', 700); line(c, 518, 46, 542, 46, '#c8102e', 0.9);
  text(c, 'RKLB', 530, 59, 11, '#ffe98a', 700); text(c, 'NASDAQ · 25 AUG 2021', 530, 72, 3.2, '#7cc56b', 700);
  sign(506, 90, 48, '$777M TO BUILD', '#1f5a34', '#fff', 3.6);

  // ---- E. the far wall is one big screen: a live feed of Times Square at opening time, the curved tower lit up (nobody travelled; the bell was rung by video link)
  c.save(); c.beginPath(); c.rect(566, 0, 194, 144); c.clip();
  c.fillStyle = lg(c, 0, 0, 0, 144, [0, '#2f5fb0'], [0.6, '#8ec0ee'], [1, '#f0d9b8']); c.fillRect(566, 0, 194, 144);
  for (const [x, w, h, col] of [[566, 30, 118, '#3a4563'], [592, 22, 96, '#4b5878'], [690, 26, 124, '#34405e'], [714, 30, 100, '#46527a'], [740, 22, 132, '#2c3652']] as [number, number, number, string][]) {
    rr(c, x, 144 - h, w, h, 0, col); for (let y = 148 - h; y < 126; y += 6) for (let wx = x + 2; wx < x + w - 2; wx += 4.6) if (r() < 0.6) rr(c, wx, y, 2.4, 3.2, 0, r() < 0.3 ? '#ffe98a' : 'rgba(190,220,255,.5)');
  }
  rr(c, 716, 70, 26, 14, 0.6, '#c8102e'); rr(c, 692, 92, 22, 12, 0.6, '#2f9d8f'); rr(c, 742, 96, 16, 22, 0.6, '#f2d14a');
  // the cylindrical tower with its wrap-around screen
  c.fillStyle = lg(c, 622, 0, 678, 0, [0, '#0a1430'], [0.3, '#1b4fb0'], [0.55, '#3f8ff0'], [1, '#0a1430']); rr(c, 622, 28, 56, 116, 5); c.fill(); rr(c, 622, 28, 56, 116, 5, undefined, OUT, 0.5);
  for (let y = 36; y < 140; y += 5) line(c, 623, y, 677, y, 'rgba(0,0,0,.22)', 0.4); for (let x = 628; x < 678; x += 6) line(c, x, 29, x, 143, 'rgba(0,0,0,.14)', 0.4);
  text(c, 'RKLB', 650, 52, 13, '#ffffff', 700); text(c, 'WELCOME', 650, 66, 4.4, '#ffe98a', 700);
  poly(c, [650, 76, 646, 86, 646, 112, 654, 112, 654, 86], '#f4f6fa', OUT, 0.4); poly(c, [646, 106, 642, 114, 646, 112], '#f4f6fa', OUT, 0.3); poly(c, [654, 106, 658, 114, 654, 112], '#f4f6fa', OUT, 0.3); poly(c, [647.4, 112, 652.6, 112, 650, 122], '#ffb347'); // lift-off on the screen
  text(c, '▲ LISTED TODAY', 650, 132, 3.6, '#7cc56b', 700);
  rr(c, 566, 138, 194, 6, 0, '#2a2e3c'); line(c, 566, 141, 760, 141, 'rgba(255,255,255,.25)', 0.4);
  c.beginPath(); c.moveTo(580, 138); c.lineTo(582, 132.6); c.lineTo(590, 132); c.lineTo(593, 128.4); c.lineTo(604, 128.4); c.lineTo(607, 132); c.lineTo(614, 133); c.lineTo(615, 138); c.closePath(); c.fillStyle = '#f2c230'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.3; c.stroke(); rr(c, 594.4, 129.4, 9, 2.8, 0.4, '#27407a'); el(c, 587, 138, 2.2, 2.2, '#0b0c12'); el(c, 609, 138, 2.2, 2.2, '#0b0c12'); rr(c, 596, 126.6, 5, 1.8, 0.4, '#fff'); // a yellow cab
  c.restore();
  for (let y = 24; y < 144; y += 3) line(c, 566, y, 760, y, 'rgba(0,0,0,.07)', 0.5); // scan lines
  rr(c, 562, 0, 198, 22, 0, '#0b0e18'); rr(c, 562, 0, 5, 144, 0, '#0b0e18'); rr(c, 566.5, 22, 193.5, 122, 0.6, undefined, '#55607e', 1.2);
  el(c, 576, 11, 2.2, 2.2, '#ff5a4a'); text(c, 'LIVE · NASDAQ MARKETSITE · TIMES SQUARE, NEW YORK', 664, 11.4, 4.4, '#ffffff', 700);
}


// ------------------------------------------------------------------ Rosie the Robot, 2019: the Auckland production floor
/** One wall, read left to right: the door, the old way by hand, the cure oven, the rocket line, fairings and the clean room, then Rosie's cell. */
function factory(c: C2) {
  const W = 760, r = rng(91);
  c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#e4eaf1'], [0.7, '#c9d2de'], [1, '#aeb8c6']); c.fillRect(0, 0, W, 180);
  for (let x = 0; x < W; x += 38) line(c, x, 18, x, 138, 'rgba(60,80,110,.08)', 0.6);
  rr(c, 0, 0, W, 18, 0, '#f2f5f9'); for (let x = 0; x < W; x += 36) { line(c, x, 17, x + 18, 3, '#b3bdcb', 0.9); line(c, x + 18, 3, x + 36, 17, '#b3bdcb', 0.9); }
  rr(c, 0, 16.4, W, 1.8, 0, '#b3bdcb'); rr(c, 0, 9, W, 2.6, 0.6, '#f2d14a', OUT, 0.25); // overhead crane rail, the length of the building
  for (let x = 24; x < W; x += 84) { rr(c, x, 21, 40, 2, 1, '#ffffff'); c.fillStyle = lg(c, 0, 23, 0, 120, [0, 'rgba(255,255,255,.28)'], [1, 'rgba(255,255,255,0)']); c.beginPath(); c.moveTo(x, 23); c.lineTo(x + 40, 23); c.lineTo(x + 66, 120); c.lineTo(x - 26, 120); c.closePath(); c.fill(); }
  rr(c, 0, 138, W, 6, 0, '#8f99a8'); rr(c, 0, 137.4, W, 0.8, 0, '#4d9be8');
  const sign = (x: number, y: number, w: number, a: string, bg = '#15171f', fg = '#fff', size = 4) => { rr(c, x, y, w, 9, 1, bg, OUT, 0.35); text(c, a, x + w / 2, y + 4.8, size, fg, 700); };

  // ---- A. the door, open to an Auckland morning, and the year so far on the wall
  rr(c, 8, 40, 64, 98, 0.6, '#0b1024', '#5b6275', 1.4);
  c.save(); c.beginPath(); c.rect(9, 41, 62, 96); c.clip();
  c.fillStyle = lg(c, 0, 41, 0, 137, [0, '#58a8e8'], [0.7, '#bfe3ff'], [1, '#e8f4ff']); c.fillRect(9, 41, 62, 96);
  c.save(); c.translate(20, 52); cloud(c, 34, 9, 3, '#d6e6f6'); c.restore();
  poly(c, [9, 118, 22, 104, 30, 100, 38, 104, 50, 116, 71, 120, 71, 137, 9, 137], '#5f9468'); // a volcanic cone: the isthmus is built on them
  poly(c, [9, 126, 71, 122, 71, 137, 9, 137], '#7fb07a'); for (let i = 0; i < 9; i++) rr(c, 11 + i * 6.6, 124 - (i % 3), 4.4, 5 + (i % 3), 0.2, i % 2 ? '#f4f2ea' : '#dbe9ff');
  rr(c, 9, 132, 62, 5, 0, '#5b6275'); c.restore();
  for (let y = 41; y < 52; y += 2.6) rr(c, 8, y, 64, 1.8, 0, '#c2c8d2'); // the roller door, mostly up
  sign(6, 26, 92, 'AUCKLAND · PRODUCTION COMPLEX', '#15171f', '#fff', 3.9);
  rr(c, 80, 44, 48, 62, 1, '#f4f6fa', '#8b93a7', 0.8); text(c, '2019', 104, 50, 5, '#c8102e', 700); line(c, 84, 54, 124, 54, '#8b93a7', 0.3);
  ['Two Thumbs Up', 'That’s a Funny Looking Cactus', 'Make It Rain', 'Look Ma, No Hands', 'As The Crow Flies', 'Running Out Of Fingers'].forEach((m, i) => { el(c, 85, 59.6 + i * 7.6, 1.5, 1.5, '#2f9a4c'); line(c, 84.2, 59.6 + i * 7.6, 84.8, 60.4 + i * 7.6, '#fff', 0.35); line(c, 84.8, 60.4 + i * 7.6, 86, 58.8 + i * 7.6, '#fff', 0.35); text(c, m, 88, 59.8 + i * 7.6, m.length > 22 ? 2.5 : 3, '#15171f', 600, 'left'); });
  line(c, 132, 138, 132, 96, '#f4f2ea', 0.6); rr(c, 132, 96, 10, 6, 0.2, '#1d3a7a', OUT, 0.2); rr(c, 132, 96, 4.4, 3, 0, '#c8102e'); for (const [sx, sy] of [[139.4, 97.6], [140.4, 99.4], [138.4, 99.8], [139.6, 101]] as number[][]) el(c, sx, sy, 0.45, 0.45, '#c8102e');

  // ---- B. the old way: rolls of carbon fibre, a bench of hand tools, a tally of hours
  sign(150, 28, 74, 'BY HAND: 400+ HOURS', '#8a6238');
  for (let i = 0; i < 4; i++) { const y = 52 + i * 15; rr(c, 150, y + 8, 46, 1.6, 0.3, '#5b6275'); for (let k = 0; k < 3; k++) { el(c, 158 + k * 15, y + 2, 6, 6, '#15171f', OUT, 0.3); el(c, 158 + k * 15, y + 2, 4.4, 4.4, undefined, 'rgba(120,128,150,.5)', 0.4); el(c, 158 + k * 15, y + 2, 1.6, 1.6, '#c9a66b', OUT, 0.25); } }
  rr(c, 148, 48, 2, 90, 0.3, '#5b6275'); rr(c, 196, 48, 2, 90, 0.3, '#5b6275'); text(c, 'CARBON FIBRE', 173, 44, 3, '#5b6275', 700);
  rr(c, 204, 116, 62, 3.4, 0.5, '#d9dee8', OUT, 0.3); rr(c, 207, 119.4, 3, 18.6, 0.3, '#8b93a7'); rr(c, 260, 119.4, 3, 18.6, 0.3, '#8b93a7');
  for (const [x, col] of [[210, '#f28c28'], [222, '#f2d14a'], [234, '#f28c28']] as [number, string][]) { rr(c, x, 111, 8, 5, 1, col, OUT, 0.25); rr(c, x + 1, 109.6, 6, 1.6, 0.5, '#23262f'); } // sanding blocks
  rr(c, 246, 106, 12, 10, 0.6, '#c2c8d2', OUT, 0.25); line(c, 252, 106, 252, 100, '#5b6275', 0.8); el(c, 252, 99, 1.6, 1.6, '#d8452e'); // a hand drill on its stand
  rr(c, 206, 52, 56, 40, 1, '#f4f6fa', '#8b93a7', 0.8); text(c, 'HOURS PER ROCKET', 234, 58, 3.2, '#5b6275', 700);
  for (let i = 0; i < 40; i++) { const x = 210 + (i % 20) * 2.5, y = 63 + Math.floor(i / 20) * 9; line(c, x, y, x, y + 6, '#15171f', 0.4); if (i % 5 === 4) line(c, x - 10.5, y + 5, x + 0.5, y + 1, '#15171f', 0.4); }
  text(c, '… × 10', 250, 86, 3.4, '#c8102e', 700);

  // ---- C. the cure oven
  rr(c, 276, 50, 60, 88, 2, lg(c, 276, 0, 336, 0, [0, '#dfe5ee'], [1, '#9aa3b5']), OUT, 0.4); rr(c, 282, 58, 48, 76, 1.4, '#3a3f4f', OUT, 0.3);
  el(c, 306, 92, 13, 13, rg(c, 306, 92, 2, 13, [0, '#ffd27a'], [0.7, '#f28c28'], [1, '#7a2408']), OUT, 0.4); el(c, 306, 92, 15, 15, undefined, '#8b93a7', 1.4);
  for (let i = 0; i < 8; i++) el(c, 306 + Math.cos(i * 0.785) * 15, 92 + Math.sin(i * 0.785) * 15, 0.9, 0.9, '#23262f'); rr(c, 326, 86, 3, 12, 0.6, '#f2d14a', OUT, 0.25);
  sign(282, 38, 48, 'CURE OVEN', '#c8102e');

  // ---- D. the rocket line: an Electron on its cradles, engines arriving from California
  sign(350, 26, 112, 'ONE EVERY 30 DAYS  →  GOAL: ONE A WEEK', '#1f5a34', '#fff', 3.5);
  for (const y of [78, 116]) { c.save(); c.translate(346, y + 8); c.rotate(-Math.PI / 2); c.scale(1.9, 1.9); electronFull(c, 0, 0); c.restore(); for (const x of [366, 412, 458, 486]) { poly(c, [x - 6, y + 16, x + 6, y + 16, x + 4, y + 7, x - 4, y + 7], '#3f7fd0', OUT, 0.3); rr(c, x - 7, y + 16, 14, 2, 0.4, '#2a5fa8', OUT, 0.25); } }
  rr(c, 360, 96, 132, 2, 0.3, '#8b93a7', OUT, 0.25); for (const x of [362, 426, 488]) rr(c, x, 98, 2.4, 40, 0.2, '#8b93a7'); // the upper rack
  rr(c, 500, 112, 30, 26, 0.8, '#c9a66b', OUT, 0.35); line(c, 500, 120, 530, 120, 'rgba(90,60,20,.4)', 0.4); line(c, 515, 112, 515, 138, 'rgba(90,60,20,.4)', 0.4); text(c, 'RUTHERFORD ×9', 515, 116.4, 2.6, '#3a2715', 700); text(c, 'HUNTINGTON', 515, 126, 2.6, '#3a2715', 700); text(c, 'BEACH, CA', 515, 130, 2.6, '#3a2715', 700);

  // ---- E. fairing halves on their stands, and the clean room behind glass
  for (const [x, flip] of [[548, 1], [566, -1]] as number[][]) { c.save(); c.translate(x, 138); c.scale(flip, 1); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -34); c.quadraticCurveTo(1, -52, 9, -58); c.lineTo(9, 0); c.closePath(); c.fillStyle = lg(c, 0, 0, 9, 0, [0, '#0a0a0d'], [0.6, '#30323d'], [1, '#191a21']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.3; c.stroke(); rr(c, 2, -30, 4, 2.6, 0.2, '#e8e6df'); c.restore(); }
  rr(c, 584, 44, 60, 72, 1.2, '#dbe9ff', '#f4f6fa', 2); c.fillStyle = 'rgba(77,155,232,.18)'; c.fillRect(585, 45, 58, 70);
  rr(c, 596, 86, 16, 12, 1, lg(c, 0, 86, 0, 98, [0, '#f2d14a'], [1, '#a8801c']), OUT, 0.3); rr(c, 600, 80, 8, 6, 0.4, '#d7dbe4', OUT, 0.25); rr(c, 592, 98, 24, 3, 0.4, '#8b93a7', OUT, 0.25); rr(c, 602, 101, 4, 15, 0.2, '#8b93a7'); // a kick stage on its stand
  rr(c, 622, 54, 16, 22, 0.5, '#0b1024', '#f4f6fa', 0.6); el(c, 630, 62, 4, 4, lg(c, 626, 58, 634, 66, [0, '#f2d14a'], [1, '#a8801c'])); rr(c, 623, 60.6, 3, 2.8, 0.2, '#30508a'); rr(c, 634, 60.6, 3, 2.8, 0.2, '#30508a'); text(c, 'PHOTON', 630, 70, 2.6, '#fff', 700); text(c, 'APR 2019', 630, 73.4, 2, '#aab4d4', 600);
  line(c, 614, 45, 614, 115, 'rgba(255,255,255,.7)', 0.5); sign(588, 32, 52, 'CLEAN ROOM', '#4d9be8');

  // ---- F. Rosie's cell: fence, floor stripes, extraction duct, and the clock that matters
  rr(c, 650, 126, 110, 12, 0, 'rgba(242,209,74,.25)'); for (let x = 650; x < 760; x += 10) poly(c, [x, 138, x + 5, 138, x + 9, 132, x + 4, 132], '#f2d14a');
  for (let x = 654; x <= 756; x += 17) { rr(c, x, 96, 1.6, 42, 0.3, '#f2d14a', OUT, 0.2); } for (const y of [100, 112, 124]) line(c, 654, y, 757, y, 'rgba(242,209,74,.75)', 0.5);
  rr(c, 690, 18, 12, 30, 1, lg(c, 690, 0, 702, 0, [0, '#dfe5ee'], [1, '#9aa3b5']), OUT, 0.3); poly(c, [684, 54, 708, 54, 702, 48, 690, 48], '#b3bdcb', OUT, 0.3); // dust extraction
  rr(c, 656, 30, 30, 15, 1.2, '#c8102e', OUT, 0.4); text(c, 'ROSIE', 671, 37.8, 6.4, '#fff', 700);
  rr(c, 712, 30, 42, 15, 1.2, '#07090f', '#8b93a7', 0.6); text(c, '12:00:00', 733, 36.4, 5.4, '#7cf08a', 700); text(c, 'HOURS PER ROCKET', 733, 42, 2.2, '#7cc56b', 700);
  text(c, '140 m² · SIX AXES', 705, 64, 3, 'rgba(60,70,90,.7)', 700); text(c, 'MARK · CUT · DRILL · MILL · SAND', 705, 69, 2.6, 'rgba(60,70,90,.6)', 700);
  for (let i = 0; i < 30; i++) el(c, 650 + r() * 108, 139 + r() * 4, 0.5 + r() * 0.6, 0.3, 'rgba(20,20,26,.35)'); // a little black dust
}

export function makeBackdrops(scene: Phaser.Scene) {
  tex(scene, 'bg_listing', 760, 180, (c) => listing(c, scene));
  tex(scene, 'bg_factory', 760, 180, factory);
  tex(scene, 'bg_workshop', 760, 180, workshop);
  tex(scene, 'bg_mahia_far', 520, 180, mahiaFar);
  tex(scene, 'bg_mahia_mid', 760, 180, mahiaMid);

  // Mission control in Auckland the morning flight 13 was lost: dark room, live consoles, a wall clock on New Zealand time
  tex(scene, 'bg_review', 320, 180, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 180, [0, '#0a0f20'], [0.7, '#141c36'], [1, '#1c2646']); c.fillRect(0, 0, 320, 180);
    for (let x = 0; x < 320; x += 40) line(c, x, 0, x, 150, 'rgba(255,255,255,.03)', 0.6);
    rr(c, 0, 146, 320, 34, 0, '#0c1226'); line(c, 0, 146, 320, 146, 'rgba(127,208,255,.25)', 0.5);
    const r = rng(13);
    for (let i = 0; i < 7; i++) { const x = 112 + i * 30; rr(c, x, 152, 20, 12, 1, '#0b1020', '#3a4a70', 0.5); c.fillStyle = `rgba(${i % 3 ? '127,208,255' : '255,138,112'},.5)`; c.fillRect(x + 2, 154, 16, 8); for (let k = 0; k < 4; k++) line(c, x + 3, 156 + k * 1.6, x + 6 + r() * 11, 156 + k * 1.6, 'rgba(10,15,32,.7)', 0.5); rr(c, x + 8, 164, 4, 3, 0, '#3a4a70'); rr(c, x - 3, 167, 26, 2, 0.5, '#26304c'); c.fillStyle = rg(c, x + 10, 158, 1, 22, [0, 'rgba(127,208,255,.12)'], [1, 'rgba(127,208,255,0)']); c.fillRect(x - 12, 140, 44, 40); }
    rr(c, 274, 168, 5, 6, 0.6, '#e8e6df', OUT, 0.25); c.beginPath(); c.arc(280, 171, 1.6, -1.2, 1.2); c.strokeStyle = '#e8e6df'; c.lineWidth = 0.5; c.stroke(); // a cold cup of coffee
  });
  // ---- enemies
  tex(scene, 'scooter', 32, 24, (c) => { // the rocket scooter, off on its own
    el(c, 6, 20, 3.4, 3.4, '#15171f', OUT, 0.3); el(c, 26, 20, 3.4, 3.4, '#15171f', OUT, 0.3); el(c, 6, 20, 1.2, 1.2, '#8b93a7'); el(c, 26, 20, 1.2, 1.2, '#8b93a7');
    rr(c, 5, 16.4, 20, 2.2, 1, '#d8452e', OUT, 0.3); line(c, 25, 17, 28, 3, '#b8c0cc', 1.3); line(c, 24.4, 3, 31.6, 3, '#15171f', 1.4);
    rr(c, 2, 9.6, 17, 5.2, 2.4, lg(c, 0, 9.6, 0, 14.8, [0, '#f2f4f8'], [0.5, '#b8c0cc'], [1, '#6f7890']), OUT, 0.35); poly(c, [2, 10.6, 0, 9.6, 0, 14.8, 2, 13.8], '#5b6275', OUT, 0.25); rr(c, 9, 9.6, 1.2, 5.2, 0, '#d8452e');
    line(c, 8, 14.8, 8, 16.4, '#3a3f4f', 0.9); line(c, 15, 14.8, 15, 16.4, '#3a3f4f', 0.9);
    el(c, 28.6, 8, 1.3, 0.9, '#d8452e'); el(c, 24.6, 8, 1.3, 0.9, '#d8452e'); // glowing "eyes" on the stem clamp
  });
  for (const open of [0, 1]) tex(scene, 'drawerbot' + open, 26, 26, (c) => { // a DishDrawer with a mind of its own
    el(c, 6, 23.6, 2.2, 2.2, '#15171f'); el(c, 18, 23.6, 2.2, 2.2, '#15171f');
    rr(c, 1, 2, 20, 21, 1.2, lg(c, 0, 0, 22, 0, [0, '#e4e8ee'], [0.5, '#c2c8d2'], [1, '#8b93a7']), OUT, 0.4);
    rr(c, 2.6, 13.4, 16.8, 8, 0.6, '#aab2c0', 'rgba(0,0,0,.35)', 0.3); rr(c, 5, 15, 12, 1, 0.5, '#5b6275');
    if (open) { rr(c, 2.6, 4, 16.8, 8, 0.6, '#23262f'); rr(c, 8, 5.4, 17, 6, 0.6, '#aab2c0', OUT, 0.35); for (let i = 0; i < 5; i++) poly(c, [10 + i * 3, 5.4, 11.4 + i * 3, 2.6, 12.8 + i * 3, 5.4], '#f4f2ea', OUT, 0.2); rr(c, 22.6, 6.6, 1.6, 3.6, 0.5, '#5b6275'); }
    else { rr(c, 2.6, 4, 16.8, 8, 0.6, '#aab2c0', 'rgba(0,0,0,.35)', 0.3); rr(c, 5, 5.6, 12, 1, 0.5, '#5b6275'); }
    el(c, 6, 9.4, 1.1, 1.1, '#ff5a3c'); el(c, 15, 9.4, 1.1, 1.1, '#ff5a3c'); line(c, 4.4, 7.6, 7.6, 8.4, '#23262f', 0.5); line(c, 16.6, 7.6, 13.4, 8.4, '#23262f', 0.5);
  });
  tex(scene, 'welder', 22, 30, (c) => { rr(c, 6, 0, 10, 4, 0.6, '#3a4057', OUT, 0.3); line(c, 11, 4, 6, 14, '#f28c28', 2.2); line(c, 6, 14, 12, 24, '#f28c28', 1.8); el(c, 6, 14, 1.8, 1.8, '#3a3f4f', OUT, 0.3); rr(c, 10.4, 23, 3.4, 5, 0.6, '#5b6275', OUT, 0.3); el(c, 12, 28.6, 1.4, 1.2, '#fff3c4'); c.fillStyle = rg(c, 12, 28.6, 0.4, 6, [0, 'rgba(160,220,255,.8)'], [1, 'rgba(160,220,255,0)']); c.fillRect(4, 22, 16, 8); });
  tex(scene, 'spark', 5, 8, (c) => { c.fillStyle = rg(c, 2.5, 5, 0.3, 3, [0, '#ffffff'], [0.4, '#ffd27a'], [1, 'rgba(255,120,40,0)']); c.fillRect(0, 0, 5, 8); poly(c, [2.5, 0, 3.6, 4.6, 2.5, 6.6, 1.4, 4.6], '#fff3c4'); });
  tex(scene, 'ram', 28, 20, (c) => { // a ram: darker fleece, curled horns, a frown
    for (const x of [7, 10, 16, 19]) rr(c, x, 13, 1.7, 6.4, 0.5, '#23232b');
    const r = rng(8); for (let i = 0; i < 28; i++) el(c, 6 + r() * 13, 5.4 + r() * 7, 2.8, 2.6, i % 3 ? '#d9d3c4' : '#b9b2a2', 'rgba(90,85,70,.5)', 0.2);
    el(c, 22.4, 9, 3.4, 3, '#2a2a33', OUT, 0.3); el(c, 23.6, 8.2, 0.6, 0.6, '#fff'); line(c, 22.2, 6.8, 24.8, 7.6, '#fff', 0.5); el(c, 25.2, 10.6, 0.5, 0.4, '#8a4b3c');
    for (const [rad, lw] of [[3.4, 1.5], [1.7, 1.1]] as number[][]) { c.beginPath(); c.arc(20, 6.4, rad, -2.6, 2.2); c.strokeStyle = '#c9a66b'; c.lineWidth = lw; c.stroke(); } c.beginPath(); c.arc(20, 6.4, 3.4, -2.6, 2.2); c.strokeStyle = '#8a6a3a'; c.lineWidth = 0.3; c.stroke();
  });
  for (const up of [0, 1]) tex(scene, 'gull' + up, 26, 14, (c) => { // karoro, the black-backed gull
    el(c, 13, 8, 5.4, 2.6, '#f4f4f0', OUT, 0.3); el(c, 18.6, 6.6, 2.2, 2, '#f4f4f0', OUT, 0.3); poly(c, [20.4, 6.4, 24, 7.2, 20.4, 7.8], '#f2b632', OUT, 0.2); el(c, 19.2, 6.2, 0.35, 0.35, '#111'); poly(c, [7.8, 8, 3, 9.4, 7.8, 9.6], '#f4f4f0', OUT, 0.25);
    const wy = up ? 1 : 12.6; c.beginPath(); c.moveTo(9, 7.4); c.quadraticCurveTo(11, wy, 4, wy + (up ? 0.6 : -0.6)); c.quadraticCurveTo(12, wy + (up ? 3 : -3), 16, 7.6); c.closePath(); c.fillStyle = '#2f3440'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.25; c.stroke();
  });
  tex(scene, 'redtape', 16, 16, (c) => { // red tape: the consent paperwork that sank the first launch site
    el(c, 8, 8, 6.6, 6.6, lg(c, 2, 2, 14, 14, [0, '#ff6a50'], [1, '#b0241a']), OUT, 0.4); el(c, 8, 8, 3, 3, '#f2e6c4', OUT, 0.3); el(c, 8, 8, 1.4, 1.4, '#8a6238');
    c.beginPath(); c.arc(8, 8, 5, 0.4, 2.2); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 0.5; c.stroke(); line(c, 8, 1.4, 8, 3.2, 'rgba(0,0,0,.3)', 0.4);
  });
  // the pad as it stood on opening day, 26 September 2016: no rocket yet (the first Electron arrived in February 2017)
  tex(scene, 'pad_empty', 70, 100, (c) => {
    rr(c, 0, 94, 70, 6, 1, lg(c, 0, 94, 0, 100, [0, '#b8c0cc'], [1, '#6f7890']), OUT, 0.3);
    rr(c, 24, 14, 3, 80, 0.3, '#5b6275', OUT, 0.3); rr(c, 32, 14, 3, 80, 0.3, '#5b6275', OUT, 0.3);
    for (let y = 16; y < 92; y += 8) { line(c, 25.5, y, 33.5, y + 8, '#8b93a7', 0.5); line(c, 33.5, y, 25.5, y + 8, '#8b93a7', 0.5); line(c, 24, y, 35, y, '#9aa3b5', 0.6); }
    for (const y of [26, 50, 74]) rr(c, 35, y, 7, 1.6, 0.3, '#d8452e', OUT, 0.25);
    rr(c, 40, 88, 12, 6, 1, '#5b6275', OUT, 0.3); // launch mount, waiting
    rr(c, 54, 78, 13, 16, 5, lg(c, 54, 0, 67, 0, [0, '#f2f4f8'], [1, '#9aa3b5']), OUT, 0.35); text(c, 'LOX', 60.5, 86, 3.2, '#4a5066', 700);
    line(c, 4, 94, 4, 80, '#f4f2ea', 0.8); line(c, 20, 94, 20, 80, '#f4f2ea', 0.8); c.beginPath(); c.moveTo(4, 82); c.quadraticCurveTo(12, 86, 20, 82); c.strokeStyle = '#d8452e'; c.lineWidth = 1.4; c.stroke(); // opening ribbon
    rr(c, 2, 64, 20, 13, 1, '#f4f2ea', OUT, 0.3); text(c, 'LC-1', 12, 68, 4.4, '#1f5a34', 700); text(c, 'OPENS', 12, 72, 2.4, '#1f5a34', 700); text(c, '26 SEPT 2016', 12, 74.8, 2.1, '#1f5a34', 600);
  });
  // power-ups: a glass bubble with the item inside
  const bubble = (key: string, icon: (c: C2) => void) => tex(scene, key, 18, 18, (c) => {
    c.fillStyle = rg(c, 9, 9, 3, 9, [0, 'rgba(120,220,255,.25)'], [0.8, 'rgba(120,220,255,.5)'], [1, 'rgba(120,220,255,0)']); c.fillRect(0, 0, 18, 18);
    el(c, 9, 9, 7.4, 7.4, 'rgba(20,40,80,.55)', '#bfe9ff', 0.6); icon(c); c.beginPath(); c.arc(9, 9, 5.8, 3.5, 4.7); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 0.7; c.stroke();
  });
  bubble('pw_J', (c) => { for (const x of [5.2, 9.8]) { rr(c, x, 4.6, 3, 7.4, 1.4, '#dfe5ee', OUT, 0.3); rr(c, x, 6.2, 3, 0.9, 0, '#d8452e'); poly(c, [x + 0.6, 12, x + 2.4, 12, x + 1.5, 14.6], '#ffb347'); } });
  bubble('pw_S', (c) => { c.beginPath(); c.moveTo(4.4, 11); c.bezierCurveTo(4, 2.6, 14, 2.6, 13.6, 11); c.closePath(); c.fillStyle = '#f4f4f0'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.35; c.stroke(); rr(c, 8.2, 3.6, 1.6, 4, 0, '#d8452e'); rr(c, 5.4, 8, 7.2, 2.2, 0.8, 'rgba(160,215,255,.9)', OUT, 0.25); rr(c, 5.6, 11.4, 6.8, 2.6, 0.8, '#f2d14a', OUT, 0.3); });
  bubble('pw_H', (c) => { c.beginPath(); c.moveTo(4.6, 10); c.bezierCurveTo(4.6, 3, 13.4, 3, 13.4, 10); c.closePath(); c.fillStyle = '#f4f4f0'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.35; c.stroke(); rr(c, 3.4, 9.6, 11.2, 1.4, 0.6, '#f4f4f0', OUT, 0.3); rr(c, 5.4, 11.8, 7.2, 2.6, 0.6, '#ff7a1a', OUT, 0.3); rr(c, 5.4, 12.8, 7.2, 0.6, 0, '#e8eef2'); });
  bubble('pw_B', (c) => { rr(c, 6.4, 3.6, 4.2, 8.4, 1, '#17181e', OUT, 0.35); rr(c, 6.4, 10, 7.4, 3.4, 1.2, '#17181e', OUT, 0.35); rr(c, 6.4, 3.6, 4.2, 1.4, 0.5, '#d8452e'); });
  // ---- RKLB rings the bell: a bear market on legs, red candles, the hat in the blender, the bell, and Peter in a bubble
  tex(scene, 'bear', 30, 21, (c) => {
    el(c, 15, 19.6, 11, 1.4, 'rgba(0,0,0,.3)');
    for (const x of [6, 10.4, 18, 22.4]) rr(c, x, 13, 3.6, 6.6, 1.2, '#4a321e', OUT, 0.3);
    el(c, 14, 11, 10.4, 6.4, lg(c, 0, 4, 0, 18, [0, '#8a6238'], [1, '#5b3d22']), OUT, 0.4);
    el(c, 24, 8.4, 4.6, 4.2, '#7a5530', OUT, 0.4); el(c, 22.4, 4.6, 1.6, 1.6, '#5b3d22', OUT, 0.3); el(c, 26, 4.8, 1.4, 1.4, '#5b3d22', OUT, 0.3);
    el(c, 27.6, 9.6, 2.2, 1.7, '#c9a27a', OUT, 0.3); el(c, 29, 9, 0.7, 0.6, '#0b0c12'); el(c, 25, 7.4, 0.6, 0.7, '#0b0c12'); line(c, 23.6, 6, 26, 6.6, '#0b0c12', 0.5);
    poly(c, [11, 6.4, 15, 6.4, 15, 10.6, 17.4, 10.6, 13, 15.4, 8.6, 10.6, 11, 10.6], '#d8452e', OUT, 0.3); // down
  });
  tex(scene, 'tickerbox', 26, 30, (c) => { line(c, 7, 0, 7, 8, '#15171f', 0.5); line(c, 19, 0, 19, 8, '#15171f', 0.5); rr(c, 1, 8, 24, 14, 1, '#07090f', '#8b93a7', 0.6); c.beginPath(); c.moveTo(3, 11); for (const [x, y] of [[7, 12], [10, 11], [14, 15], [17, 14.4], [22, 19]]) c.lineTo(x, y); c.strokeStyle = '#ff5a4a'; c.lineWidth = 0.8; c.stroke(); poly(c, [22.6, 20, 20.6, 17.4, 23.6, 17.6], '#ff5a4a'); });
  tex(scene, 'candle', 5, 10, (c) => { line(c, 2.5, 0, 2.5, 10, '#ff8a70', 0.5); rr(c, 0.8, 2, 3.4, 6, 0.4, '#e03a2a', '#7a1208', 0.3); });
  tex(scene, 'blender', 14, 18, (c) => { rr(c, 2.6, 13, 8.8, 4.6, 0.8, '#3a3f4f', OUT, 0.3); el(c, 7, 15.4, 1, 1, '#ffe98a'); poly(c, [2.2, 2.4, 11.8, 2.4, 10.4, 13, 3.6, 13], 'rgba(190,230,255,.5)', '#dfe9f5', 0.5); rr(c, 1.8, 1, 10.4, 1.8, 0.6, '#15171f');
    c.beginPath(); c.moveTo(4.6, 9.4); c.bezierCurveTo(4.6, 5, 9.4, 5, 9.4, 9.4); c.closePath(); c.fillStyle = '#15171f'; c.fill(); rr(c, 7.6, 8.6, 3.4, 1, 0.5, '#15171f'); el(c, 7, 7.4, 0.8, 0.5, '#fff'); }); // the cap, about to be eaten
  tex(scene, 'bell', 46, 66, (c) => {
    el(c, 23, 64.6, 19, 1.6, 'rgba(0,0,0,.3)'); poly(c, [9, 65, 37, 65, 33, 40, 13, 40], lg(c, 0, 40, 0, 65, [0, '#27407a'], [1, '#12244a']), OUT, 0.4); rr(c, 7, 37, 32, 4, 1, '#3f7fd0', OUT, 0.35);
    rr(c, 13, 45, 20, 11, 0.8, '#07090f', '#8b93a7', 0.5); text(c, 'RKLB', 23, 50.8, 5.6, '#ffe98a', 700);
    rr(c, 21.6, 22, 2.8, 16, 0.4, '#8b93a7', OUT, 0.3); line(c, 14, 8, 23, 4, '#8b93a7', 1.2); line(c, 32, 8, 23, 4, '#8b93a7', 1.2); line(c, 23, 4, 23, 9, '#8b93a7', 1);
    c.beginPath(); c.moveTo(13, 24); c.bezierCurveTo(15, 22, 15, 8, 23, 8); c.bezierCurveTo(31, 8, 31, 22, 33, 24); c.closePath(); c.fillStyle = lg(c, 13, 0, 33, 0, [0, '#b8860b'], [0.4, '#ffe98a'], [1, '#a8740a']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.4; c.stroke();
    rr(c, 11.6, 23, 22.8, 2.6, 1.2, '#d9a520', OUT, 0.35); el(c, 23, 27.4, 2, 2, '#8a6208', OUT, 0.3); el(c, 19, 13, 1.6, 3.4, 'rgba(255,255,255,.5)');
  });

  // ---- Rosie the Robot: the Auckland factory floor
  tex(scene, 't_factory', 16, 16, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 16, [0, '#eef2f6'], [0.2, '#d5dce6'], [1, '#b9c2cf']); c.fillRect(0, 0, 16, 16); c.fillStyle = '#ffffff'; c.fillRect(0, 0, 16, 0.7);
    c.fillStyle = '#4d9be8'; c.fillRect(0, 2.2, 16, 1); line(c, 0, 9.4, 16, 9.4, 'rgba(60,80,110,.2)', 0.4); line(c, 8, 9.4, 8, 16, 'rgba(60,80,110,.2)', 0.4);
    const r = rng(19); for (let i = 0; i < 8; i++) el(c, r() * 16, 4 + r() * 12, 0.3, 0.3, 'rgba(255,255,255,.5)');
  });
  tex(scene, 't_factory_fill', 16, 16, (c) => { c.fillStyle = '#aab3c1'; c.fillRect(0, 0, 16, 16); line(c, 0, 8, 16, 8, 'rgba(60,80,110,.2)', 0.4); line(c, 4, 0, 4, 8, 'rgba(60,80,110,.2)', 0.4); line(c, 12, 8, 12, 16, 'rgba(60,80,110,.2)', 0.4); });
  tex(scene, 'p_factory', 16, 6, (c) => { c.fillStyle = lg(c, 0, 0, 0, 5, [0, '#f4f6fa'], [1, '#8b93a7']); c.fillRect(0, 0, 16, 4.6); c.fillStyle = '#f2d14a'; c.fillRect(0, 0, 16, 1); for (let x = 1; x < 16; x += 3) line(c, x, 1.6, x + 1.6, 4.2, 'rgba(40,50,70,.35)', 0.3); c.fillStyle = '#5b6275'; c.fillRect(0, 4.6, 16, 1.2); });
  tex(scene, 'belt', 16, 5, (c) => { c.fillStyle = lg(c, 0, 0, 0, 5, [0, '#3a3f4f'], [1, '#15171f']); c.fillRect(0, 0, 16, 5); for (let x = 0; x < 16; x += 8) poly(c, [x + 1, 0.8, x + 4, 0.8, x + 6, 2.5, x + 4, 4.2, x + 1, 4.2, x + 3, 2.5], '#f2d14a'); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(0, 0, 16, 0.4); });
  tex(scene, 'sander', 24, 16, (c) => { // an orbital sander that nobody is holding any more
    c.beginPath(); c.moveTo(1, 9); c.bezierCurveTo(-1, 4, 3, 2, 5, 6); c.strokeStyle = '#15171f'; c.lineWidth = 0.8; c.stroke(); // its cable
    rr(c, 4, 4, 15, 7, 2.6, lg(c, 0, 4, 0, 11, [0, '#ffe98a'], [1, '#d9a520']), OUT, 0.4); rr(c, 8, 1, 8, 4, 1.6, '#23262f', OUT, 0.3); rr(c, 17, 5.4, 4, 3.6, 1, '#23262f', OUT, 0.3);
    rr(c, 3, 11, 18, 2.6, 1, '#8b93a7', OUT, 0.3); rr(c, 2.4, 13.4, 19.2, 1.6, 0.6, '#c9a66b', OUT, 0.25); for (let x = 4; x < 21; x += 2) el(c, x, 14.2, 0.3, 0.3, '#6b4a2b');
    el(c, 14.4, 7.4, 1, 0.9, '#ff5a3c'); el(c, 10.4, 7.4, 1, 0.9, '#ff5a3c'); line(c, 9, 5.6, 11.6, 6.4, '#23262f', 0.5); line(c, 15.8, 5.6, 13.2, 6.4, '#23262f', 0.5);
  });
  tex(scene, 'roll', 16, 16, (c) => { // a roll of carbon fibre off its rack
    el(c, 8, 8, 6.8, 6.8, '#15171f', OUT, 0.4); for (let k = 5.6; k > 2.6; k -= 1.2) el(c, 8, 8, k, k, undefined, 'rgba(120,128,150,.45)', 0.35);
    for (let i = 0; i < 6; i++) line(c, 8 + Math.cos(i * 1.05) * 3, 8 + Math.sin(i * 1.05) * 3, 8 + Math.cos(i * 1.05) * 6.6, 8 + Math.sin(i * 1.05) * 6.6, 'rgba(120,128,150,.3)', 0.3);
    el(c, 8, 8, 2.4, 2.4, '#c9a66b', OUT, 0.3); el(c, 8, 8, 1, 1, '#6b4a2b');
  });
  for (const f of [0, 1]) tex(scene, 'dust' + f, 26, 14, (c) => { // carbon dust from the machining head, on the loose
    const r = rng(40 + f); for (let i = 0; i < 16; i++) el(c, 5 + r() * 16, 4 + r() * 6, 2.2 + r() * 2.4, 1.8 + r() * 1.8, i % 3 ? 'rgba(28,29,36,.8)' : 'rgba(70,74,90,.7)');
    for (let i = 0; i < 9; i++) el(c, 2 + r() * 22, 2 + r() * 10, 0.4, 0.4, '#15171f');
    el(c, 16.6, 6.6, 1.2, 1.1, '#fff'); el(c, 20, 6.8, 1.1, 1, '#fff'); el(c, 17, 6.8, 0.5, 0.5, '#111'); el(c, 20.3, 7, 0.45, 0.45, '#111'); line(c, 15.4, 5, 18, 5.6, '#fff', 0.4); line(c, 21.4, 5.2, 19.2, 5.8, '#fff', 0.4);
  });
  tex(scene, 'trimmer', 22, 30, (c) => { rr(c, 5, 0, 12, 5, 0.6, '#f2d14a', OUT, 0.3); rr(c, 8.6, 5, 4.8, 10, 0.6, '#f4f6fa', OUT, 0.3); el(c, 11, 15.6, 3.6, 3.6, '#f28c28', OUT, 0.3); rr(c, 9.4, 18, 3.2, 6, 0.5, '#8b93a7', OUT, 0.3); rr(c, 10.5, 24, 1, 4.4, 0.2, '#dfe5ee', OUT, 0.2); el(c, 11, 28.6, 2.6, 0.6, 'rgba(20,20,26,.5)'); });
  tex(scene, 'offcut', 6, 8, (c) => { poly(c, [1, 0.6, 5.4, 2, 3.6, 7.6, 0.6, 5], '#15171f', '#5b6275', 0.3); line(c, 1.6, 2, 4, 5.6, 'rgba(140,148,170,.6)', 0.3); line(c, 3.4, 1.8, 2, 5.2, 'rgba(140,148,170,.4)', 0.3); });
  tex(scene, 'engine100', 12, 15, (c) => { // Rutherford number 100, tagged
    c.fillStyle = rg(c, 6, 8, 1, 7, [0, 'rgba(255,230,120,.6)'], [1, 'rgba(255,230,120,0)']); c.fillRect(0, 0, 12, 15);
    rr(c, 3.6, 1, 4.8, 4.6, 1, lg(c, 3, 0, 9, 0, [0, '#8b93a7'], [0.4, '#e4e8ee'], [1, '#5b6275']), OUT, 0.3); for (const x of [1.2, 8.6]) rr(c, x, 2, 2.4, 4, 0.8, '#4a5066', OUT, 0.25);
    poly(c, [4.8, 5.6, 7.2, 5.6, 10, 13, 2, 13], lg(c, 2, 0, 10, 0, [0, '#3a3c48'], [0.35, '#9aa3b5'], [1, '#23262f']), OUT, 0.3); rr(c, 2.6, 8, 6.8, 3, 0.4, '#f4f2ea', OUT, 0.25); text(c, '100', 6, 9.7, 2.6, '#c8102e', 700);
  });
  tex(scene, 'rosie', 76, 74, (c) => { // a gantry robot over a long machining bed, with a first stage in its grip
    el(c, 38, 72.6, 34, 1.6, 'rgba(0,0,0,.25)');
    rr(c, 4, 60, 68, 8, 1, lg(c, 0, 60, 0, 68, [0, '#f4f6fa'], [1, '#9aa3b5']), OUT, 0.4); for (const x of [8, 64]) rr(c, x, 68, 4, 5, 0.3, '#5b6275', OUT, 0.25); for (let x = 8; x < 70; x += 6) poly(c, [x, 60, x + 3, 60, x + 1.5, 62, x - 1.5, 62], '#f2d14a');
    for (const x of [12, 30, 48, 62]) el(c, x, 58.6, 2, 2, '#3f7fd0', OUT, 0.3); // rollers
    rr(c, 6, 44, 62, 13, 6, lg(c, 0, 44, 0, 57, [0, '#3a3c48'], [0.3, '#191a21'], [1, '#050506']), OUT, 0.4); line(c, 12, 46.6, 62, 46.6, 'rgba(255,255,255,.2)', 0.4); text(c, 'ELECTRON', 38, 51, 4, '#f2f2ee', 700);
    for (const x of [2, 68]) rr(c, x, 6, 5, 62, 0.6, lg(c, x, 0, x + 5, 0, [0, '#ffffff'], [1, '#aab2c0']), OUT, 0.4); rr(c, 0, 2, 76, 7, 1.2, lg(c, 0, 2, 0, 9, [0, '#ffffff'], [1, '#b3bdcb']), OUT, 0.4);
    rr(c, 22, 9, 16, 8, 1, '#f28c28', OUT, 0.35); rr(c, 27, 17, 6, 10, 0.8, '#f4f6fa', OUT, 0.3); el(c, 30, 28.6, 4.6, 4.6, '#f28c28', OUT, 0.35); c.save(); c.translate(30, 28.6); c.rotate(0.5); rr(c, -2, 2, 4, 11, 0.8, '#f4f6fa', OUT, 0.3); rr(c, -1.2, 13, 2.4, 3.6, 0.4, '#8b93a7', OUT, 0.25); rr(c, -0.4, 16.6, 0.8, 2.4, 0.1, '#dfe5ee'); c.restore();
    c.beginPath(); c.moveTo(38, 12); c.bezierCurveTo(48, 12, 46, 22, 56, 20); c.strokeStyle = '#23262f'; c.lineWidth = 1.1; c.stroke();
    rr(c, 46, 3, 22, 5, 0.8, '#c8102e', OUT, 0.3); text(c, 'ROSIE', 57, 5.7, 3.6, '#fff', 700);
    el(c, 20, 13, 0.9, 0.9, '#7cf08a'); el(c, 40, 13, 0.9, 0.9, '#7cf08a'); c.fillStyle = rg(c, 22.6, 45, 0.5, 5, [0, 'rgba(255,240,180,.95)'], [1, 'rgba(255,200,80,0)']); c.fillRect(17, 40, 12, 10);
  });
  bubble('pw_T', (c) => { rr(c, 5.2, 5, 7.6, 9, 1.6, '#f4f6fa', OUT, 0.3); line(c, 9, 5.2, 9, 14, '#9aa3b5', 0.35); rr(c, 4.2, 5.4, 2, 5.6, 0.8, '#f4f6fa', OUT, 0.25); rr(c, 11.8, 5.4, 2, 5.6, 0.8, '#f4f6fa', OUT, 0.25); rr(c, 9.8, 6.6, 2, 1.4, 0.2, '#4d9be8'); rr(c, 6.6, 2.6, 4.8, 2, 0.6, 'rgba(190,230,255,.7)', '#4d9be8', 0.3); });
  bubble('pw_L', (c) => { c.save(); c.beginPath(); c.roundRect(4.6, 4, 8.8, 10, 1.6); c.clip(); c.fillStyle = '#1b1c23'; c.fillRect(4, 3, 10, 12); for (let i = -4; i < 8; i++) { line(c, 4 + i * 1.6, 14.4, 9 + i * 1.6, 3.6, 'rgba(130,138,160,.7)', 0.4); line(c, 4 + i * 1.6, 3.6, 9 + i * 1.6, 14.4, 'rgba(70,74,90,.7)', 0.4); } c.restore(); rr(c, 4.6, 4, 8.8, 10, 1.6, undefined, '#2fd0c0', 0.5); poly(c, [9, 1.4, 11, 4, 7, 4], '#2fd0c0'); });
  bubble('pw_C', (c) => { c.drawImage(scene.textures.get('peter_chip').getSourceImage() as HTMLCanvasElement, 2.4, 2.4, 13.2, 13.2); });
  tex(scene, 'secret', 18, 18, (c) => { // a rolled blueprint, glowing
    c.fillStyle = rg(c, 9, 9, 1, 9, [0, 'rgba(255,220,120,.9)'], [1, 'rgba(255,220,120,0)']); c.fillRect(0, 0, 18, 18);
    c.save(); c.translate(9, 9); c.rotate(-0.5); rr(c, -6.4, -3, 12.8, 6, 1, '#2d5fa8', OUT, 0.35); line(c, -4, -1, 3, -1, '#dbe9ff', 0.4); line(c, -4, 1, 1, 1, '#dbe9ff', 0.4); el(c, 4, 0, 1.3, 1.3, undefined, '#dbe9ff', 0.4); el(c, -6.4, 0, 1.2, 3, '#4d7fd0', OUT, 0.3); el(c, 6.4, 0, 1.2, 3, '#4d7fd0', OUT, 0.3); c.restore();
    poly(c, [13.4, 1.6, 14.2, 3.6, 16.2, 4.4, 14.2, 5.2, 13.4, 7.2, 12.6, 5.2, 10.6, 4.4, 12.6, 3.6], '#fff3c4');
  });
  // Princes Street at night, for the bonus sprint: one tile, scrolled fast
  tex(scene, 'street', 320, 180, (c) => {
    c.fillStyle = lg(c, 0, 0, 0, 130, [0, '#050818'], [1, '#1c2f66']); c.fillRect(0, 0, 320, 130);
    const r = rng(77); for (let i = 0; i < 60; i++) el(c, r() * 320, r() * 60, 0.2 + r() * 0.2, 0.2 + r() * 0.2, '#fff');
    let x = 0; while (x < 320) { const w = 26 + Math.floor(r() * 30), h = 44 + Math.floor(r() * 46), y = 128 - h; rr(c, x, y, w - 1, h, 0.4, ['#141b33', '#182040', '#1c2548'][Math.floor(r() * 3)]); if (r() > 0.6) poly(c, [x, y, x + w / 2, y - 6, x + w - 1, y], '#10162b'); for (let wy = y + 5; wy < 116; wy += 8) for (let wx = x + 3; wx < x + w - 5; wx += 6) if (r() > 0.45) rr(c, wx, wy, 2.6, 3.6, 0, r() > 0.3 ? '#ffe98a' : '#bfe3ff'); rr(c, x, 116, w - 1, 3, 0, '#2a3358'); x += w; }
    for (const lx of [40, 150, 262]) { line(c, lx, 128, lx, 96, '#5b6275', 1); line(c, lx, 96, lx + 7, 94, '#5b6275', 1); el(c, lx + 7, 94.6, 2.4, 1.2, '#fff3c4'); c.fillStyle = rg(c, lx + 7, 100, 0.5, 22, [0, 'rgba(255,235,170,.45)'], [1, 'rgba(255,235,170,0)']); c.fillRect(lx - 16, 92, 46, 40); }
    for (let i = 0; i < 46; i++) poly(c, [i * 7, 100, i * 7 + 7, 100, i * 7 + 3.5, 106], i % 2 ? '#f4f2ea' : '#d8452e'); line(c, 0, 100, 320, 100, '#8b93a7', 0.3); // bunting
    for (let i = 0; i < 64; i++) { const px = i * 5 + r() * 2; el(c, px, 122 - r() * 3, 1.5, 1.6, '#0c1226'); rr(c, px - 1.6, 123, 3.2, 6, 1, '#0c1226'); if (r() > 0.8) line(c, px, 121, px + 2, 116, '#0c1226', 0.7); } // the crowd
    rr(c, 0, 128, 320, 2.4, 0, '#8b93a7'); for (let bx = 0; bx < 320; bx += 16) { rr(c, bx, 124, 15, 4, 0.3, bx % 32 ? '#f4f2ea' : '#d8452e'); } // barriers
    c.fillStyle = lg(c, 0, 130, 0, 180, [0, '#2a2e3c'], [1, '#15171f']); c.fillRect(0, 130, 320, 50);
    for (let dx = 0; dx < 320; dx += 40) rr(c, dx, 153, 20, 1.6, 0, '#e8e6df'); rr(c, 0, 132, 320, 0.8, 0, '#f2d14a'); rr(c, 0, 176, 320, 0.8, 0, '#f2d14a');
  });
  tex(scene, 'viper', 60, 20, (c) => { // a low red American sports car, the kind the bike is said to have beaten
    el(c, 30, 18.6, 27, 1.4, 'rgba(0,0,0,.4)');
    c.beginPath(); c.moveTo(2, 14); c.lineTo(3, 10.6); c.quadraticCurveTo(12, 8.6, 20, 8.2); c.quadraticCurveTo(26, 3.6, 34, 4); c.lineTo(41, 8.4); c.quadraticCurveTo(52, 8.6, 57, 11); c.lineTo(58, 14.4); c.lineTo(2, 15); c.closePath();
    c.fillStyle = lg(c, 0, 4, 0, 15, [0, '#ff5a4a'], [0.5, '#d8102e'], [1, '#8a0a1c']); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.4; c.stroke();
    poly(c, [22, 8.4, 27, 5, 33.4, 5, 38.6, 8.4], 'rgba(160,215,255,.8)', OUT, 0.3); rr(c, 4, 11, 52, 1, 0, '#f4f2ea'); rr(c, 29, 11, 2, 1, 0, '#d8102e');
    for (const wx of [13, 47]) { el(c, wx, 15, 4.2, 4.2, '#15171f', OUT, 0.3); el(c, wx, 15, 2, 2, '#cfd5df', OUT, 0.25); } el(c, 56.6, 11.6, 1, 0.8, '#fff3c4');
  });
  tex(scene, 'finish', 30, 80, (c) => { rr(c, 2, 8, 2.4, 72, 0.4, '#e8e6df', OUT, 0.3); rr(c, 25.6, 8, 2.4, 72, 0.4, '#e8e6df', OUT, 0.3); for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) rr(c, 2 + i * 4.33, 2 + j * 3, 4.33, 3, 0, (i + j) % 2 ? '#15171f' : '#f4f2ea'); c.strokeStyle = OUT; c.lineWidth = 0.3; c.strokeRect(2, 2, 26, 9); });
  tex(scene, 'tapetail', 20, 6, (c) => { c.beginPath(); c.moveTo(0, 3); c.bezierCurveTo(5, 0, 9, 6, 13, 3); c.bezierCurveTo(16, 1, 18, 4, 20, 2.4); c.strokeStyle = '#d8452e'; c.lineWidth = 1.6; c.stroke(); });
}
