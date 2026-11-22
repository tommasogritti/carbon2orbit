import Phaser from 'phaser';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import './style.css';
import { W, H, initInput, save, resetSave, closeCard, SCENE_FOR, PATCHES, speed, trackRun, overlayOpen } from './core';
import { makeArt, D } from './art';
import { makeBackdrops } from './backdrops';
import { recStream, unlock, audioState, renderMusic } from './audio';
import { byId, LEVELS } from './content';
import { MapScene, openLevel } from './scenes/Map';
import { PlatformScene } from './scenes/Platform';
import { LaunchScene } from './scenes/Launch';
import { HotfireScene } from './scenes/Hotfire';
import { HeliScene } from './scenes/Heli';
import { OrbitRaiseScene } from './scenes/OrbitRaise';
import { SprintScene } from './scenes/Sprint';
import { TitleScene } from './scenes/Title';
import { showCredits, showAbout } from './contributors';
import { FaultFinderScene } from './scenes/FaultFinder';
import { SplashdownScene } from './scenes/Splashdown';
import { CruiseScene } from './scenes/Cruise';
import { CountdownRaceScene } from './scenes/CountdownRace';
import { RideScene } from './scenes/Ride';
import { OrbitOpsScene } from './scenes/OrbitOps';
import { DualCountScene } from './scenes/DualCount';
import { ArcLabScene } from './scenes/ArcLab';
import { EditBayScene } from './scenes/EditBay';
import { makeCreators } from './creators';

class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() { for (const [id, url] of Object.entries(PATCHES)) this.load.image('patch_' + id, url); } // mission patches, for the fairing decal
  create() {
    makeArt(this); makeCreators(this); makeBackdrops(this);
    const q = new URLSearchParams(location.search);
    const lvl = q.get('level');
    if (lvl && byId(lvl)) this.scene.start(SCENE_FOR[byId(lvl).mechanic!], { def: byId(lvl) });
    else if (q.has('notitle')) this.scene.start('Map', { title: false });
    else this.scene.start('Title');
  }
}

Promise.all(['500', '600', '700'].map((w) => document.fonts.load(`${w} 16px "Chakra Petch"`, 'AĀāō'))).finally(() => {
  const game = new Phaser.Game({
    type: new URLSearchParams(location.search).get('renderer') === 'canvas' ? Phaser.CANVAS : Phaser.AUTO, parent: 'game', /* ?renderer=canvas checks the no-WebGL fallback */ width: W * D, height: H * D, backgroundColor: '#05060c',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: 'stage' },
    render: { antialias: true, roundPixels: false },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 620 } } },
    scene: [Boot, TitleScene, MapScene, PlatformScene, LaunchScene, HotfireScene, HeliScene, OrbitRaiseScene, SprintScene, FaultFinderScene, SplashdownScene, CruiseScene, CountdownRaceScene, RideScene, OrbitOpsScene, DualCountScene, ArcLabScene, EditBayScene],
  });
  initInput(game);
  document.getElementById('credits')?.addEventListener('click', (e) => { (e.currentTarget as HTMLElement).blur(); showCredits(game); });
  document.getElementById('about-btn')?.addEventListener('click', (e) => { (e.currentTarget as HTMLElement).blur(); showAbout(game); });
  // Dev-only gameplay recorder: ?rec=<name> captures the canvas; the clip is saved by the dev server when the level ends.
  // &recmix=sfx records the sound effects without the music, for footage that is cut to its own music afterwards.
  const recName = new URLSearchParams(location.search).get('rec');
  let recStop: undefined | (() => Promise<string>);
  if (recName && import.meta.env.DEV) {
    game.events.once('ready', () => {
      unlock();
      const stream = new MediaStream([...game.canvas.captureStream(30).getVideoTracks(), ...recStream(new URLSearchParams(location.search).get('recmix') === 'sfx').getAudioTracks()]);
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 8_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.start(500);
      recStop = () => new Promise((done) => {
        if (rec.state === 'inactive') return done('already stopped');
        rec.onstop = async () => { await fetch('/__rec?name=' + recName, { method: 'POST', body: new Blob(chunks, { type: 'video/webm' }) }); (window as any).__g2o.recSaved = recName; done('saved ' + recName); };
        rec.stop();
      });
      (window as any).__g2o.recStop = recStop;
    });
  }
  // Game speed (+ and -): while a level is running, each screen frame takes `speed()` game steps: two at ×2, one every
  // other frame at ×0.5. Every step is a normal 60 Hz step, so physics and timing behave exactly as at ×1.
  // Installed on the first step, not on 'ready': Phaser sets the loop's callback when the loop starts, which is after 'ready'.
  if (!(Number(new URLSearchParams(location.search).get('fast')) > 1)) game.events.once('prestep', () => {
    const draw = game.step.bind(game), skip = game.headlessStep.bind(game);
    let acc = 0, t = 0;
    game.loop.callback = (time: number, delta: number) => {
      if (!t) t = time;
      const sc = game.scene.getScenes(true)[0] as any, inLevel = !!(sc && sc.def) && !overlayOpen();
      acc += inLevel ? speed() : 1;
      const n = Math.floor(acc + 1e-9); acc -= n;
      if (inLevel) trackRun(n);
      for (let i = 0; i < n; i++) { t += delta; (i === n - 1 ? draw : skip)(t, delta); }
    };
  });
  // Dev-only fast-forward for bot runs: ?fast=6 steps the whole game six times per tick (it also keeps running in a background tab).
  const fast = Number(new URLSearchParams(location.search).get('fast'));
  if (fast > 1) game.events.once('ready', () => {
    game.loop.stop(); game.loop.wake = () => {}; game.loop.sleep = () => {};
    let t = performance.now();
    const draw = game.step.bind(game), skip = game.headlessStep.bind(game); // only the last step of each tick is drawn
    setInterval(() => { for (let i = 0; i < fast; i++) { t += 1000 / 60; game.loop.callback = i === fast - 1 ? draw : skip; game.loop.step(t); } }, 16);
  });
  // Test and dev hooks (used by the Playwright smoke test and ?dev=1).
  (window as any).__g2o = {
    game, save, LEVELS, resetSave, closeCard, openLevel, audio: audioState,
    scene: () => game.scene.getScenes(true)[0],
    // Dev-only: render a soundtrack offline to recordings/<name>.wav, e.g. renderMusic('synthwave', [['map', 4], ['launch', 4, 0], ['launch', 4, 1], ['launch', 8, 2]], 'preview')
    renderMusic: import.meta.env.DEV ? async (track: string, plan: [string, number, number?][], name: string, tail?: number) => { const wav = await renderMusic(track, plan, tail); await fetch(`/__rec?ext=wav&name=${name}`, { method: 'POST', body: wav }); return `saved ${name}.wav, ${(wav.size / 192000).toFixed(1)} s`; } : undefined,
    go: (id: string) => { closeCard(); const d = byId(id); game.scene.getScenes(true).forEach((s) => s.scene.stop()); game.scene.start(SCENE_FOR[d.mechanic!], { def: d }); },
  };
});
