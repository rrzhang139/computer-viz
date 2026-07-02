// prose-highlight — enforces the interactive-prose contract (click-to-locate
// narrative) across EVERY page that uses it, so a walkthrough can't ship a
// paragraph that points at nothing, a gate that doesn't gate, or a step whose
// diagram state contradicts its prose.
//
// The contract, per page with `.step p[data-hl]` (pages are DISCOVERED, so a
// new walkthrough page is covered automatically):
//
//   1. TOKENS RESOLVE — every data-hl token is well-formed (`net:`/`open:`/
//      `box:`/`pin:` + name) and, when its paragraph is clicked, catches at
//      least one element (net → a page wire on that data-net; open → a
//      child-slot forced open; box/pin → the element flagged). A token that
//      catches nothing is a broken pointer: the prose names a thing the
//      canvas doesn't have.
//   2. SPOTLIGHT LIFECYCLE — clicking a paragraph activates the spotlight
//      (svg.ph-active + p.ph-sel); clicking it again clears; Esc clears.
//   3. GATES HOLD — on a step with data-gate, "next →" must NOT advance until
//      the gated control is used; after using it, next must advance.
//   4. STATE SYNC — on a step with data-pc, the PC readout (#rPc) must equal
//      that value in binary: the diagram always shows the instruction the
//      prose describes.
//
// Run: npm run test:prose-highlight   (part of npm run test:all)

import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4190;
const HOST = `http://localhost:${PORT}`;

let failures = 0;
const results = [];
function expect(label, ok, detail = '') {
  results.push({ ok, label, detail });
  if (!ok) failures++;
}

const pages = readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && !f.startsWith('_'))
  .sort();

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
function killServer() { try { server.kill('SIGTERM'); } catch {} }
process.on('exit', killServer);
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite preview timeout')), 15000);
  server.stdout.on('data', (b) => {
    if (b.toString().includes('Local')) { clearTimeout(t); setTimeout(res, 400); }
  });
  server.on('exit', (code) => rej(new Error(`vite exited ${code}`)));
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

console.log('\n── Prose-highlight: every narrative paragraph points at real things ──');

let walkthroughPages = 0;
for (const file of pages) {
  await page.goto(`${HOST}/${file}`);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForTimeout(300);

  const hasProse = await page.$('.step p[data-hl]');
  if (!hasProse) continue;
  walkthroughPages++;

  const stepCount = await page.$$eval('.step', (els) => els.length);
  for (let s = 0; s < stepCount; s++) {
    const meta = await page.evaluate(() => {
      const st = document.querySelector('.step:not([hidden])');
      return {
        stage: st?.dataset.stage ?? `#${[...document.querySelectorAll('.step')].indexOf(st) + 1}`,
        pc: st?.dataset.pc ?? null,
        gate: st?.dataset.gate ?? null,
        nPars: document.querySelectorAll('.step:not([hidden]) p[data-hl]').length,
      };
    });
    const tag = `${file} [${meta.stage}]`;

    // 4. STATE SYNC — data-pc steps must show that PC in the readout.
    if (meta.pc != null) {
      const rPc = await page.$eval('#rPc', (e) => e.textContent).catch(() => null);
      const want = Number(meta.pc).toString(2).padStart((rPc || '').length || 2, '0');
      expect(`${tag}: data-pc=${meta.pc} → readout PC ${rPc}`, rPc === want,
        rPc === want ? '' : `expected "${want}" — the step's diagram state contradicts its prose`);
    }

    // 1+2. TOKENS RESOLVE + LIFECYCLE, per paragraph.
    for (let i = 0; i < meta.nPars; i++) {
      const r = await page.evaluate((idx) => {
        const p = document.querySelectorAll('.step:not([hidden]) p[data-hl]')[idx];
        p?.click();
        const svg = document.querySelector('.canvas-col svg');
        const tokens = (p?.getAttribute('data-hl') || '').split(/\s+/).filter(Boolean);
        const dead = [];
        const malformed = [];
        for (const tok of tokens) {
          const [kind, name] = tok.split(':');
          if (!name || !['net', 'open', 'box', 'pin'].includes(kind)) { malformed.push(tok); continue; }
          let hit = false;
          if (kind === 'net') {
            svg?.querySelectorAll(`[data-net="${name}"]`).forEach((e) => {
              if (!e.closest('.detailed') && e.classList.contains('ph-on')) hit = true;
            });
          } else if (kind === 'open') {
            hit = !!svg?.querySelector(`#${name}`)?.closest('.child-slot')?.classList.contains('ph-open');
          } else {
            hit = !!svg?.querySelector(`#${name}`)?.classList.contains('ph-on');
          }
          if (!hit) dead.push(tok);
        }
        const active = svg?.classList.contains('ph-active') && p?.classList.contains('ph-sel');
        p?.click();   // toggle off
        const cleared = !svg?.classList.contains('ph-active');
        return { dead, malformed, active, cleared };
      }, i);
      expect(`${tag} p${i + 1}: tokens well-formed`, r.malformed.length === 0,
        r.malformed.length ? `malformed: ${r.malformed.join(' ')}` : '');
      expect(`${tag} p${i + 1}: all tokens catch elements`, r.dead.length === 0,
        r.dead.length ? `dead tokens (name nothing on the canvas): ${r.dead.join(' ')}` : '');
      expect(`${tag} p${i + 1}: click spotlights, re-click clears`, r.active && r.cleared,
        `active=${r.active} cleared=${r.cleared}`);
    }

    // Esc clears (exercise once per step on the first paragraph).
    if (meta.nPars > 0) {
      const escCleared = await page.evaluate(() => {
        document.querySelector('.step:not([hidden]) p[data-hl]')?.click();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return !document.querySelector('.canvas-col svg')?.classList.contains('ph-active');
      });
      expect(`${tag}: Esc clears the spotlight`, escCleared);
    }

    // 3. GATES HOLD, then advance to the next step.
    if (s < stepCount - 1) {
      if (meta.gate) {
        const held = await page.evaluate(() => {
          const before = document.querySelector('.step:not([hidden])');
          document.getElementById('stepNext')?.click();
          return document.querySelector('.step:not([hidden])') === before;
        });
        expect(`${tag}: gate ${meta.gate} holds "next"`, held,
          held ? '' : 'next advanced without doing the gated action');
        await page.click(meta.gate).catch(() => {});
        await page.waitForTimeout(500);   // gated sim actions settle (clock pulse)
      }
      const advanced = await page.evaluate(() => {
        const before = document.querySelector('.step:not([hidden])');
        document.getElementById('stepNext')?.click();
        return document.querySelector('.step:not([hidden])') !== before;
      });
      expect(`${tag}: next advances after gate`, advanced);
      await page.waitForTimeout(350);
    }
  }
}

await browser.close();
killServer();

expect(`found walkthrough pages to check`, walkthroughPages >= 2,
  walkthroughPages < 2 ? `only ${walkthroughPages} — did the data-hl convention change?` : '');

const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
for (const r of results) {
  const tag = r.ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  let line = `  ${tag}  ${pad(r.label, 70)}`;
  if (!r.ok && r.detail) line += `\n        ${r.detail}`;
  console.log(line);
}
console.log(`\n${failures === 0
  ? '\x1b[32mALL ' + results.length + ' PASS\x1b[0m'
  : '\x1b[31m' + failures + ' FAIL of ' + results.length + '\x1b[0m'}`);
process.exit(failures ? 1 : 0);
