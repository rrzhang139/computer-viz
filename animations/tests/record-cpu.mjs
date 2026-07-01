// Records a showcase video of the CPU page (layer 18, R-type single-cycle).
// Walks the step panel slowly from stage to stage via "next →", and within
// each stage clicks every prose paragraph so its wires/blocks spotlight. A
// one-sentence caption per stage describes what's happening. Output:
//   animations/test-results/recordings/cpu.webm + .mp4

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4185;
const HOST = `http://localhost:${PORT}`;
const OUT_DIR = path.join(ROOT, 'test-results', 'recordings');
mkdirSync(OUT_DIR, { recursive: true });

// One short sentence per stage, in step order. Describes what it is.
const CAPTIONS = {
  overview:  'The simplest machine that earns the name CPU — a register machine.',
  fetch:     'Fetch — the program counter reads the next instruction from memory.',
  decode:    'Decode — the instruction splits into register addresses and an operation.',
  regread:   'Register read — two registers hand their values to the ALU.',
  execute:   'Execute — the ALU computes the answer.',
  writeback: 'Write-back — the result loops home into a register.',
  why:       'One full loop: fetch, decode, execute, write-back.',
};

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
    if (chunk.toString().includes(String(PORT))) { clearTimeout(t); setTimeout(resolve, 400); }
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

// Inject a lower-third caption bar and a helper to set its text.
async function installCaption() {
  await page.evaluate(() => {
    const bar = document.createElement('div');
    bar.id = 'cv-caption';
    bar.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:22px', 'transform:translateX(-50%)',
      'max-width:78vw', 'z-index:99999', 'padding:12px 22px', 'border-radius:999px',
      'background:rgba(10,10,10,0.86)', 'border:1px solid rgba(239,159,39,0.5)',
      'color:#fff', 'font-family:ui-sans-serif,-apple-system,Segoe UI,sans-serif',
      'font-size:19px', 'line-height:1.35', 'text-align:center', 'pointer-events:none',
      'box-shadow:0 6px 28px rgba(0,0,0,0.55)', 'opacity:0', 'transition:opacity 320ms',
    ].join(';');
    document.body.appendChild(bar);
    window.__setCap = (t) => { bar.textContent = t; bar.style.opacity = '1'; };
  });
}
const setCaption = (t) => page.evaluate((x) => window.__setCap(x), t);

// In the currently-visible step: click each highlightable paragraph in turn,
// holding on each so its spotlight reads. Then clear.
async function walkParagraphs(hold) {
  const n = await page.evaluate(() =>
    document.querySelectorAll('.step:not([hidden]) p[data-hl]').length);
  for (let i = 0; i < n; i++) {
    await page.evaluate((idx) => {
      const ps = document.querySelectorAll('.step:not([hidden]) p[data-hl]');
      ps[idx]?.scrollIntoView({ block: 'nearest' });
      ps[idx]?.click();
    }, i);
    await pause(hold);
  }
  await page.keyboard.press('Escape');
  await pause(450);
}

try {
  await page.goto(`${HOST}/cpu.html`);
  await page.waitForSelector('#stepNext');
  // Start clean at step 1.
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForSelector('#stepNext');
  await installCaption();
  await pause(700);

  const STAGE_ORDER = ['overview', 'fetch', 'decode', 'regread', 'execute', 'writeback', 'why'];
  for (let s = 0; s < STAGE_ORDER.length; s++) {
    const stage = await page.evaluate(() =>
      document.querySelector('.step:not([hidden])')?.dataset.stage);
    await setCaption(CAPTIONS[stage] ?? '');
    await pause(1200);

    // Spotlight each paragraph of this stage, slowly.
    await walkParagraphs(1900);

    const isLast = s === STAGE_ORDER.length - 1;
    if (isLast) { await pause(1600); break; }

    // Satisfy this step's gate (reset / run instruction) so "next →" advances —
    // this also drives the live sim (PC ticks, cells light), part of the show.
    const gate = await page.evaluate(() =>
      document.querySelector('.step:not([hidden])')?.dataset.gate);
    if (gate) {
      await page.click(gate).catch(() => {});
      await pause(1400);
    }
    await page.click('#stepNext');
    await pause(1100);
  }
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
  const target = path.join(OUT_DIR, 'cpu.webm');
  if (latest !== target) renameSync(latest, target);
  console.log(`Recorded: ${target}`);
}

killServer();
process.exit(0);
