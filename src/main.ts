import Phaser from 'phaser';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import './style.css';
import { W, H, initInput, save, resetSave, closeCard, SCENE_FOR } from './core';
import { makeArt, D } from './art';
import { makeBackdrops } from './backdrops';
import { recStream, unlock, audioState } from './audio';
import { byId, LEVELS } from './content';
import { MapScene, openLevel } from './scenes/Map';
import { PlatformScene } from './scenes/Platform';
import { LaunchScene } from './scenes/Launch';
import { HotfireScene } from './scenes/Hotfire';
import { HeliScene } from './scenes/Heli';
import { OrbitRaiseScene } from './scenes/OrbitRaise';
import { SprintScene } from './scenes/Sprint';

class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    makeArt(this); makeBackdrops(this);
    const q = new URLSearchParams(location.search);
    const lvl = q.get('level');
    if (lvl && byId(lvl)) this.scene.start(SCENE_FOR[byId(lvl).mechanic!], { def: byId(lvl) });
    else this.scene.start('Map', { title: !q.has('notitle') });
  }
}

Promise.all(['500', '600', '700'].map((w) => document.fonts.load(`${w} 16px "Chakra Petch"`, 'AĀāō'))).finally(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W * D, height: H * D, backgroundColor: '#05060c',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 620 } } },
    scene: [Boot, MapScene, PlatformScene, LaunchScene, HotfireScene, HeliScene, OrbitRaiseScene, SprintScene],
  });
  initInput(game);
  // Dev-only gameplay recorder: ?rec=<name> captures the canvas; the clip is saved by the dev server when the level ends.
  const recName = new URLSearchParams(location.search).get('rec');
  let recStop: undefined | (() => Promise<string>);
  if (recName && import.meta.env.DEV) {
    game.events.once('ready', () => {
      unlock();
      const stream = new MediaStream([...game.canvas.captureStream(30).getVideoTracks(), ...recStream().getAudioTracks()]);
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
    go: (id: string) => { closeCard(); const d = byId(id); game.scene.getScenes(true).forEach((s) => s.scene.stop()); game.scene.start(SCENE_FOR[d.mechanic!], { def: d }); },
  };
});
