import Phaser from 'phaser';
import { showCard, overlayOpen } from './core';
import { snd } from './audio';
import { VERSION } from './version';

/** Where the source lives. The credits page, the footer and the README all point here. */
export const REPO = 'https://github.com/tommasogritti/carbon2orbit';

export interface Contributor {
  /** GitHub user name, without the @. */
  github: string;
  /** X user name, without the @. Optional. */
  x?: string;
  /** What they did, in a few words. */
  did: string;
}

/**
 * Everyone who has built the game, in the order they joined.
 * Had a pull request merged? Add yourself at the end, in the same pull request or a later one.
 */
export const CONTRIBUTORS: Contributor[] = [
  { github: 'tommasogritti', x: 'tommasogritti', did: 'Started the project and maintains it' },
];

const out = (url: string, label: string) => `<a href="${url}" target="_blank" rel="noopener">${label}</a>`;

/** Pause whatever is running and show who made the game and where its source is. */
export function showCredits(game: Phaser.Game) {
  if (overlayOpen()) return;
  const sc = game.scene.getScenes(true)[0];
  sc?.scene.pause(); snd.select();
  const rows = CONTRIBUTORS.map((c) => `<tr><td>${out(`https://github.com/${c.github}`, '@' + c.github)}</td><td>${c.did}</td><td>${out(`https://github.com/${c.github}`, 'GitHub')}${c.x ? ' · ' + out(`https://x.com/${c.x}`, 'X') : ''}</td></tr>`).join('');
  showCard(
    `<div class="kicker">CREDITS · GAME v${VERSION}</div><h1>Who made this</h1>` +
    `<p>Carbon to Orbit is an open-source fan game. Everything in it, from the levels to the music, was built by the people below.</p>` +
    `<table class="people">${rows}</table>` +
    `<p class="watch">${out(REPO, 'Source on GitHub')} Add a level, fix a fact or report a bug. Your name goes on this page with your first merged change.</p>` +
    `<p class="src">Code: MIT licence. Story text and the artwork the game draws: CC BY-SA 4.0. Mission patches © Rocket Lab, not covered by these licences. Photos are credited on their cards. The road to Māhia is drawn from OpenStreetMap data, <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> (ODbL), and from the NZ 8 m Digital Elevation Model, sourced from the <a href="https://data.linz.govt.nz/" target="_blank" rel="noopener">LINZ Data Service</a> and licensed for reuse under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>, with SRTM heights (NASA, public domain) at Wairoa. A fan project, not affiliated with or endorsed by Rocket Lab.</p>`,
    [{ label: 'Back to the game', fn: () => sc?.scene.resume() }],
  );
}

/** Pause whatever is running and show the page's own text about the game (`#about` in index.html, also what search engines read). */
export function showAbout(game: Phaser.Game) {
  if (overlayOpen()) return;
  const sc = game.scene.getScenes(true)[0];
  sc?.scene.pause(); snd.select();
  showCard(`<div class="about"><div class="kicker">ABOUT · GAME v${VERSION}</div>${document.getElementById('about')?.innerHTML ?? ''}</div>`, [{ label: 'Back to the game', fn: () => sc?.scene.resume() }]);
}
