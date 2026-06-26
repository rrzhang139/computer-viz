// wire-rules — two machine-enforced wire-legibility rules:
//
//  (A) NO SLANTED WIRES on the schematic / block-diagram pages. Every segment
//      of every own `.wire` polyline must be axis-aligned (horizontal or
//      vertical) — Manhattan routing only. Diagonal segments read as messy on
//      these dense datapath views. (Lower-tier pages draw circuit symbols with
//      intentional diagonals and are NOT in scope.)
//
//  (B) EVERY PREVIEW SHOWS WIRES. For every drillable slot on every page, the
//      hover preview's embedded `.wire`s (excluding Vdd/GND rails) must have
//      non-degenerate geometry — a real bounding box, not collapsed to a point.
//      Catches the class of bug where a child page sets its wire points only at
//      runtime (static `points="0,0 0,0"`), so the inert preview clone shows
//      boxes with no wires (instruction memory hit exactly this).
//
// Pages are auto-discovered. Run: npm run test:wire-rules (part of test:all).

import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4191;
const HOST = `http://localhost:${PORT}`;

// Block-diagram pages held to Manhattan routing (rule A). These are the
// datapath-tier schematics where wires are routing channels between boxes.
const SCHEMATIC_PAGES = new Set([
  'cpu.html', 'datapath.html', 'regfile.html', 'mem.html', 'fetch.html', 'idecode.html',
]);
const SLANT_TOL = 1.5;  // user units: a segment is "straight" if its shorter delta is below this

let failures = 0;
const results = [];
function expect(label, ok, detail = '') {
  results.push({ ok, label, detail });
  if (!ok) failures++;
}

const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html') && !f.startsWith('_')).sort();

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
process.on('exit', () => { try { server.kill('SIGTERM'); } catch {} });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite preview timeout')), 15000);
  server.stdout.on('data', (b) => { if (b.toString().includes('Local')) { clearTimeout(t); setTimeout(res, 400); } });
  server.on('exit', (code) => rej(new Error(`vite exited ${code}`)));
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

for (const file of pages) {
  await page.goto(`${HOST}/${file}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);

  // ── (A) Manhattan on schematic pages ─────────────────────────────────────
  if (SCHEMATIC_PAGES.has(file)) {
    const slants = await page.evaluate((tol) => {
      const bad = [];
      const wires = document.querySelectorAll('.wire');
      for (const w of wires) {
        if (w.closest('.detailed')) continue;                 // embeds are scaled copies
        const net = w.getAttribute('data-net');
        if (net === 'Vdd' || net === 'GND') continue;
        const pts = w.points;
        for (let i = 1; i < pts.numberOfItems; i++) {
          const a = pts.getItem(i - 1), b = pts.getItem(i);
          const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
          if (dx > tol && dy > tol) {
            bad.push(`${net}#${w.id || '?'} seg${i}: (${a.x.toFixed(0)},${a.y.toFixed(0)})→(${b.x.toFixed(0)},${b.y.toFixed(0)})`);
            break;
          }
        }
      }
      return bad;
    }, SLANT_TOL);
    expect(`${file}: all wire segments axis-aligned (no slants)`, slants.length === 0,
      slants.length ? `${slants.length} slanted: ${slants.slice(0, 6).join(' | ')}` : '');
  }

  // ── (B) every preview shows non-degenerate wires ─────────────────────────
  const previews = await page.evaluate(() => {
    const out = [];
    const slots = document.querySelectorAll('[id^="slot-"]');
    for (const slot of slots) {
      if (getComputedStyle(slot).cursor !== 'pointer') continue;   // leaf, no child page
      const host = slot.querySelector('.detailed');
      if (!host) continue;
      const wires = [...host.querySelectorAll('.wire')].filter((w) => {
        const n = w.getAttribute('data-net');
        return n !== 'Vdd' && n !== 'GND';
      });
      if (wires.length === 0) continue;   // preview has no signal wires to speak of
      let degenerate = 0;
      for (const w of wires) { const b = w.getBBox(); if (b.width <= 1 && b.height <= 1) degenerate++; }
      out.push({ id: slot.id, total: wires.length, degenerate });
    }
    return out;
  });
  for (const p of previews) {
    expect(`${file}/${p.id}: preview wires non-degenerate (${p.total - p.degenerate}/${p.total})`,
      p.degenerate === 0, p.degenerate ? `${p.degenerate} wires collapsed to a point` : '');
  }
}

await browser.close();
try { server.kill('SIGTERM'); } catch {}

const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
for (const r of results) {
  const tag = r.ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  let line = `  ${tag}  ${pad(r.label, 64)}`;
  if (!r.ok && r.detail) line += `\n        ${r.detail}`;
  console.log(line);
}
console.log(`\n${failures === 0 ? '\x1b[32mALL ' + results.length + ' PASS\x1b[0m' : '\x1b[31m' + failures + ' FAIL of ' + results.length + '\x1b[0m'}`);
process.exit(failures ? 1 : 0);
