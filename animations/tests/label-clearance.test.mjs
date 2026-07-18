// label-clearance — canonical gate: no terminal/wire label may overlap a `.pin`
// terminal node, on ANY page. A label drawn on top of its own pin is unreadable
// and hides the connection point. The rule is established once in
// src/pinLabels.ts (a per-page pass nudges any overlapping label to a clearance
// beside its pin and halos it for legibility); this test holds every page to it.
//
// Coverage is automatic:
//   - pages: every *.html in the project root (minus `_`-prefixed), so a new
//     page is checked the moment it exists.
//   - labels: every non-empty <text> in the page's scene <svg> (excluding the
//     embedded-preview clones under .embed/.detailed) is measured against every
//     `.pin`. So "every wire's label on every page" is enforced, not a sample.
//
// A label PASSES when its rendered bbox keeps a >= CLEAR_PX gap from every pin
// box (measured in the svg's own user units via getBBox — resolution-stable).
// A full-page screenshot of each page is saved for human review.
//
// Run: npm run test:label-clearance   (part of npm run test:all)

import { spawn } from 'node:child_process';
import { readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4190;
const HOST = `http://localhost:${PORT}`;
const OUT_DIR = path.join(ROOT, 'test-results', 'label-clearance');
mkdirSync(OUT_DIR, { recursive: true });

// Required gap (svg user units) between a label's box and a pin's box. Pins are
// r≈7; a small positive margin guarantees the glyphs sit clearly OFF the node.
const CLEAR_PX = 1.5;

let failures = 0;
const results = [];
function expect(label, ok, detail = '') {
  results.push({ ok, label, detail });
  if (!ok) failures++;
}

const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html') && !f.startsWith('_')).sort();

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
function killServer() { try { process.kill(-server.pid, 'SIGTERM'); } catch {} try { server.kill('SIGTERM'); } catch {} }
process.on('exit', killServer);
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite preview timeout')), 15000);
  server.stdout.on('data', (b) => { if (b.toString().includes('Local')) { clearTimeout(t); setTimeout(res, 400); } });
  server.stderr.on('data', () => {});
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });

for (const f of pages) {
  await page.goto(`${HOST}/${f}`, { waitUntil: 'networkidle' });
  // Give the per-page label pass (requestAnimationFrame) a beat to run.
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT_DIR, f.replace(/\.html$/, '.png')) });

  const report = await page.evaluate((clear) => {
    const svg = document.querySelector('svg');
    if (!svg) return { skip: true };
    const inEmbed = (el) => !!el.closest('.embed, .detailed');
    const pins = [...svg.querySelectorAll('circle.pin')].filter((p) => !inEmbed(p)).map((p) => ({
      cx: +p.getAttribute('cx'), cy: +p.getAttribute('cy'), r: +(p.getAttribute('r') || 7),
      id: p.id || '(pin)',
    }));
    const labels = [...svg.querySelectorAll('text')].filter((t) => !inEmbed(t) && (t.textContent || '').trim());
    const bad = [];
    for (const t of labels) {
      let bb; try { bb = t.getBBox(); } catch { continue; }
      for (const p of pins) {
        // signed gap: positive = clear, <=0 = touching/overlapping
        const gx = Math.max(p.cx - p.r - (bb.x + bb.width), bb.x - (p.cx + p.r));
        const gy = Math.max(p.cy - p.r - (bb.y + bb.height), bb.y - (p.cy + p.r));
        const gap = Math.max(gx, gy); // boxes clear if separated on EITHER axis
        if (gap < clear) {
          bad.push({ label: t.textContent.trim(), pin: p.id, gap: Math.round(gap * 10) / 10 });
        }
      }
    }
    return { nLabels: labels.length, nPins: pins.length, bad };
  }, CLEAR_PX);

  if (report.skip) { expect(`${f}: has a scene svg`, false, 'no <svg>'); continue; }
  const ok = report.bad.length === 0;
  expect(`${f}: ${report.nLabels} labels clear of ${report.nPins} pins`, ok,
    ok ? '' : report.bad.map((b) => `"${b.label}"↔${b.pin} gap=${b.gap}`).join(', '));
}

await browser.close();
killServer();

for (const r of results) {
  const tag = r.ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  ${tag}  ${r.label}${r.detail ? `  — ${r.detail}` : ''}`);
}
console.log(`\nScreenshots: ${OUT_DIR}`);
if (failures) { console.log(`\x1b[31m${failures} FAIL\x1b[0m`); process.exit(1); }
console.log(`\x1b[32mALL ${results.length} PASS\x1b[0m`);
process.exit(0);
