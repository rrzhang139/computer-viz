// prose-audit — exploratory walkthrough of the CPU pages' interactive prose.
// For every step on every audited page: click each data-hl paragraph, record
// which tokens resolved to which elements (and which resolved to NOTHING),
// screenshot the spotlight, satisfy the step's gate, advance. Output:
//   test-results/prose-audit/<page>-s<step>-p<par>.png  + report.json
//
// This is an audit tool (rich output, no exit-code gate); the machine gate
// distilled from it is tests/prose-highlight.test.mjs.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4189;
const HOST = `http://localhost:${PORT}`;
const OUT = path.join(ROOT, 'test-results', 'prose-audit');
mkdirSync(OUT, { recursive: true });

const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ['cpu.html', 'cpu_ldst.html'];

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
const killServer = () => { try { process.kill(-server.pid, 'SIGTERM'); } catch {} try { server.kill('SIGTERM'); } catch {} };
process.on('exit', killServer);
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite preview timeout')), 15000);
  server.stdout.on('data', (b) => { if (b.toString().includes('Local')) { clearTimeout(t); setTimeout(res, 400); } });
  server.on('exit', (code) => rej(new Error(`vite exited ${code}`)));
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const report = [];

for (const file of PAGES) {
  const slug = file.replace(/\.html$/, '');
  await page.goto(`${HOST}/${file}`);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForSelector('#stepNext');
  await page.waitForTimeout(400);

  const stepCount = await page.$$eval('.step', (els) => els.length);
  for (let s = 0; s < stepCount; s++) {
    const meta = await page.evaluate(() => {
      const st = document.querySelector('.step:not([hidden])');
      return {
        stage: st?.dataset.stage ?? null, pc: st?.dataset.pc ?? null,
        gate: st?.dataset.gate ?? null, focus: st?.dataset.focus ?? null,
        title: st?.querySelector('h3')?.textContent ?? '',
        readout: {
          pc: document.getElementById('rPc')?.textContent,
          instr: document.getElementById('rInstr')?.textContent,
          regs: document.getElementById('rRegs')?.textContent,
        },
        nextLocked: document.getElementById('stepNext')?.classList.contains('cv-locked') ?? false,
        paragraphs: Array.from(document.querySelectorAll('.step:not([hidden]) p[data-hl]'))
          .map((p) => ({ hl: p.getAttribute('data-hl'), text: (p.textContent || '').slice(0, 90) })),
      };
    });
    const stepRec = { page: file, step: s + 1, ...meta, clicks: [] };
    report.push(stepRec);

    for (let i = 0; i < meta.paragraphs.length; i++) {
      // Click paragraph i, then measure what the spotlight actually caught.
      const res = await page.evaluate((idx) => {
        const ps = document.querySelectorAll('.step:not([hidden]) p[data-hl]');
        const p = ps[idx];
        p?.scrollIntoView({ block: 'nearest' });
        p?.click();
        const svg = document.querySelector('svg');
        const tokens = (p?.getAttribute('data-hl') || '').split(/\s+/).filter(Boolean);
        const perToken = tokens.map((tok) => {
          const [kind, name] = tok.split(':');
          let hits = 0;
          if (kind === 'net') {
            svg?.querySelectorAll(`.wire[data-net="${name}"], .pulse[data-net="${name}"], .ctrl-wire[data-net="${name}"]`)
              .forEach((e) => { if (!e.closest('.detailed') && e.classList.contains('ph-on')) hits++; });
          } else if (kind === 'open') {
            hits = svg?.querySelector(`#${name}`)?.closest('.child-slot')?.classList.contains('ph-open') ? 1 : 0;
          } else if (kind === 'box' || kind === 'pin') {
            hits = svg?.querySelector(`#${name}`)?.classList.contains('ph-on') ? 1 : 0;
          }
          return { tok, hits };
        });
        return {
          active: svg?.classList.contains('ph-active') ?? false,
          selected: p?.classList.contains('ph-sel') ?? false,
          perToken,
          dead: perToken.filter((t) => t.hits === 0).map((t) => t.tok),
        };
      }, i);
      await page.waitForTimeout(350);
      const shot = `${slug}-s${String(s + 1).padStart(2, '0')}-p${i + 1}.png`;
      await page.screenshot({ path: path.join(OUT, shot) });
      stepRec.clicks.push({ par: i + 1, shot, ...res });
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    // Verify the gate soft-lock, satisfy it (this drives the sim), advance.
    if (s < stepCount - 1) {
      if (meta.gate) {
        const before = await page.evaluate(() => document.querySelector('.step:not([hidden])')?.dataset.stage);
        await page.click('#stepNext');
        await page.waitForTimeout(120);
        const after = await page.evaluate(() => document.querySelector('.step:not([hidden])')?.dataset.stage);
        stepRec.gateHeld = before === after;
        await page.click(meta.gate).catch(() => {});
        await page.waitForTimeout(600);
      }
      await page.click('#stepNext');
      await page.waitForTimeout(500);
    }
  }
}

await browser.close();
killServer();
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

// Console digest: per step — dead tokens + gate behavior.
for (const st of report) {
  const dead = st.clicks.flatMap((c) => c.dead.map((d) => `p${c.par}:${d}`));
  const flag = dead.length ? `\x1b[31mDEAD ${dead.join(' ')}\x1b[0m` : '\x1b[32mok\x1b[0m';
  const gate = st.gate ? (st.gateHeld === false ? ' \x1b[31mGATE-LEAK\x1b[0m' : ' gate✓') : '';
  console.log(`${st.page} s${st.step} [${st.stage}] pc=${st.readout.pc} "${st.readout.instr}" ${flag}${gate}`);
}
console.log(`\nScreenshots + report.json → ${OUT}`);
process.exit(0);
