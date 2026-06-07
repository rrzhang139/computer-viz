// Records a showcase video of the regfile (layer 12) drill-down into its
// children (decoder, mux, a register slot). Output:
//   animations/test-results/recordings/regfile.webm + .mp4

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4182;
const HOST = `http://localhost:${PORT}`;
const OUT_DIR = path.join(ROOT, 'test-results', 'recordings');
mkdirSync(OUT_DIR, { recursive: true });

const server = spawn(
  'npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] },
);
const killServer = () => { try { server.kill('SIGTERM'); } catch {} };
process.on('exit', killServer);
process.on('SIGINT', () => { killServer(); process.exit(130); });

await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('vite preview timeout')), 15_000);
  server.stdout?.on('data', (chunk) => {
    if (chunk.toString().includes(String(PORT))) {
      clearTimeout(t);
      setTimeout(resolve, 250);
    }
  });
  server.on('exit', (code) => reject(new Error(`vite exited ${code}`)));
});

const VIEW = { width: 1280, height: 800 };
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEW,
  recordVideo: { dir: OUT_DIR, size: VIEW },
});
const page = await context.newPage();
const pause = (ms) => page.waitForTimeout(ms);

try {
  await page.goto(`${HOST}/regfile.html`);
  await page.waitForSelector('#slot-decoder');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForSelector('#slot-decoder');
  await pause(1500);

  // Drill into the decoder
  await page.click('#slot-decoder');
  await page.waitForLoadState('domcontentloaded');
  await pause(1800);
  await page.goBack();
  await page.waitForSelector('#slot-decoder');
  await pause(1000);

  // Drill into the mux
  await page.click('#slot-mux');
  await page.waitForLoadState('domcontentloaded');
  await pause(1800);
  await page.goBack();
  await page.waitForSelector('#slot-decoder');
  await pause(1000);

  // Drill into a register (reg2)
  await page.click('#slot-reg2');
  await page.waitForLoadState('domcontentloaded');
  await pause(1800);
  await page.goBack();
  await page.waitForSelector('#slot-decoder');
  await pause(1200);
} finally {
  await page.close();
  await context.close();
  await browser.close();
}

const files = readdirSync(OUT_DIR)
  .filter((f) => f.endsWith('.webm'))
  .map((f) => ({ f, t: statSync(path.join(OUT_DIR, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t);
if (files.length) {
  const latest = path.join(OUT_DIR, files[0].f);
  const target = path.join(OUT_DIR, 'regfile.webm');
  if (latest !== target) renameSync(latest, target);
  console.log(`Recorded: ${target}`);
}

killServer();
process.exit(0);
