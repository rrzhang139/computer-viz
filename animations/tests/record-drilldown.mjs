// Records a screen video of the latch → NAND drill-down feature for sharing.
// Spawns `vite preview`, opens a recording browser context, walks through:
//   1. Land on /latch.html, briefly idle
//   2. Toggle Sbar to flip the latch (lit Q wire)
//   3. Click NAND1 → drills into /index.html?from=latch&which=N1 (gate lit up)
//   4. Toggle a gate input to show interaction
//   5. Back → returns to latch with state preserved
//   6. Toggle Rbar, drill into NAND2, back
// Output: animations/test-results/recordings/drilldown.webm
//
// Run: node tests/record-drilldown.mjs (from animations/)

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4181;
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
  deviceScaleFactor: 1,
});
const page = await context.newPage();

const pause = (ms) => page.waitForTimeout(ms);

try {
  // Open latch, clear any prior snapshot
  await page.goto(`${HOST}/latch.html`);
  await page.waitForSelector('#slot-n1');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForSelector('#slot-n1');
  await pause(1200);

  // Toggle SET — Sbar=0 lights Q wire
  await page.click('#btnS');
  await pause(1200);

  // Drill into NAND1 (the gate driving Q-bar branch via S-bar+QB inputs)
  await page.click('#slot-n1');
  await page.waitForSelector('#btnA');
  await pause(1500);

  // Show the lit gate is interactive — toggle A then back
  await page.click('#btnA');
  await pause(900);
  await page.click('#btnA');
  await pause(900);

  // Back to latch
  await page.goBack();
  await page.waitForSelector('#slot-n1');
  await pause(1200);

  // Flip to RESET — toggle Rbar
  await page.click('#btnS');     // back to neutral first
  await pause(500);
  await page.click('#btnR');     // Rbar=0
  await pause(1200);

  // Drill into NAND2
  await page.click('#slot-n2');
  await page.waitForSelector('#btnA');
  await pause(1500);

  // Back
  await page.goBack();
  await page.waitForSelector('#slot-n1');
  await pause(1200);
} finally {
  await page.close();
  await context.close();
  await browser.close();
}

// Rename the auto-named video to drilldown.webm
const files = readdirSync(OUT_DIR)
  .filter((f) => f.endsWith('.webm'))
  .map((f) => ({ f, t: statSync(path.join(OUT_DIR, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t);
if (files.length) {
  const latest = path.join(OUT_DIR, files[0].f);
  const target = path.join(OUT_DIR, 'drilldown.webm');
  if (latest !== target) renameSync(latest, target);
  console.log(`Recorded: ${target}`);
}

killServer();
process.exit(0);
