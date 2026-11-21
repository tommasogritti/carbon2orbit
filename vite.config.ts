import { defineConfig } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Dev-only: `?rec=<name>` records the game canvas and posts the clip here; it is saved to recordings/<name>.webm.
export default defineConfig({
  plugins: [{
    name: 'gameplay-recorder',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__rec', (req, res) => {
        const name = (new URL(req.url || '', 'http://x').searchParams.get('name') || 'clip').replace(/[^a-z0-9-]/gi, '');
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => { mkdirSync('recordings', { recursive: true }); writeFileSync(join('recordings', name + '.webm'), Buffer.concat(chunks)); res.end('ok'); });
      });
    },
  }],
});
