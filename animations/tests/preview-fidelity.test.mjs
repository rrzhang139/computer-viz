// preview-fidelity — strict gate (like wire-alignment) that a drillable
// block's hover preview is an EXACT copy of the page you drill into, and that
// the copy renders large enough to read.
//
// Contract, per slot that declares `data-embed-page="/x.html"`:
//   (a) FIDELITY — the preview must contain every `data-net` the target page's
//       <svg> contains. The preview is built by copying that page's raw SVG, so
//       this holds by construction; a hand-drawn / approximate preview FAILS.
//       => when you add a new composite page, an inexact preview is rejected.
//   (b) ALIGNMENT — every parent wire endpoint that lands inside the slot's
//       box must coincide (≤ ALIGN_TOL) with one of the embedded child's real
//       pins, and every embedded pin must have a parent wire on it. So the
//       datapath's lines genuinely connect to the component's terminals, not
//       to empty space.
//   (c) READABILITY — in the rendered preview, the smallest on-screen gap
//       between two DIFFERENT-net parallel wire segments must be ≥ MIN_GAP_PX,
//       so every wire is visually distinguishable. A full-page screenshot of
//       each hovered preview is saved for human review. If a preview is too
//       dense, enlarge its box (scale it up) until this passes.
//
// Slots are auto-discovered from `[data-embed-page]`, so a new embed-preview
// page is covered without editing this file.
//
// Run: npm run test:preview-fidelity   (part of npm run test:all)

import { spawn } from 'node:child_process';
import { readdirSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4189;
const HOST = `http://localhost:${PORT}`;
const OUT_DIR = path.join(ROOT, 'test-results', 'preview-fidelity');
mkdirSync(OUT_DIR, { recursive: true });

// Smallest allowed on-screen gap between two DISTINCT-net parallel wires.
// Embedded wires render at ~1px stroke, so a ~2.5px center gap leaves a clear
// dark separation — the wires are visually distinguishable, not merged.
const MIN_GAP_PX = 2.5;
const ALIGN_TOL = 4;   // viewBox user units — parent wire endpoint vs embedded pin

let failures = 0;
const results = [];
function expect(label, ok, detail = '') {
  results.push({ ok, label, detail });
  if (!ok) failures++;
}

const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html') && !f.startsWith('_')).sort();

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
function killServer() { try { server.kill('SIGTERM'); } catch {} }
process.on('exit', killServer);
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite preview timeout')), 15000);
  server.stdout.on('data', (b) => { if (b.toString().includes('Local')) { clearTimeout(t); setTimeout(res, 400); } });
  server.on('exit', (code) => rej(new Error(`vite exited ${code}`)));
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

// The target page's STATIC nets (from its source HTML on disk) — what the
// page renders before any JS mounts its own nested hover previews. The embed
// is a copy of that same static SVG, so this is the right comparison.
const staticNetsOf = (targetPath) => {
  const src = readFileSync(path.join(ROOT, targetPath.replace(/^\//, '')), 'utf8');
  const nets = new Set();
  let m; const re = /data-net="([^"]+)"/g;
  while ((m = re.exec(src)) !== null) nets.add(m[1]);
  return [...nets];
};

// In-page: every parent-wire endpoint inside the slot box, and every embedded
// pin, mapped to the root svg's user coords. The test checks they coincide.
const MEASURE_ALIGN = (slotId) => {
  const slot = document.getElementById(slotId);
  const svg = slot.ownerSVGElement;
  const toUser = (el, x, y) => {
    const m = svg.getScreenCTM().inverse().multiply(el.getScreenCTM());
    const p = svg.createSVGPoint(); p.x = x; p.y = y;
    const u = p.matrixTransform(m); return { x: u.x, y: u.y };
  };
  const pins = [];
  for (const c of slot.querySelectorAll('.embed .pin')) {
    const cx = parseFloat(c.getAttribute('cx') || '0'), cy = parseFloat(c.getAttribute('cy') || '0');
    pins.push(toUser(c, cx, cy));
  }
  const rect = slot.querySelector('rect.simple-body');
  const bx = parseFloat(rect.getAttribute('x')), by = parseFloat(rect.getAttribute('y'));
  const bw = parseFloat(rect.getAttribute('width')), bh = parseFloat(rect.getAttribute('height'));
  const tl = toUser(rect, bx, by), brc = toUser(rect, bx + bw, by + bh);
  const box = { x0: Math.min(tl.x, brc.x), y0: Math.min(tl.y, brc.y), x1: Math.max(tl.x, brc.x), y1: Math.max(tl.y, brc.y) };
  const inBox = (p) => p.x >= box.x0 - 3 && p.x <= box.x1 + 3 && p.y >= box.y0 - 3 && p.y <= box.y1 + 3;
  const ends = [];
  for (const poly of svg.querySelectorAll('polyline.wire')) {
    if (poly.closest('.detailed') || poly.classList.contains('pulse')) continue;
    const n = poly.getAttribute('data-net'); if (n === 'Vdd' || n === 'GND') continue;
    const pts = poly.points; if (!pts.numberOfItems) continue;
    for (const idx of [0, pts.numberOfItems - 1]) {
      const p = pts.getItem(idx); const u = toUser(poly, p.x, p.y);
      if (inBox(u)) ends.push({ x: u.x, y: u.y, net: n });
    }
  }
  return { pins, ends };
};

// In-page: min on-screen gap between different-net parallel wire segments in
// ONE slot's embed, in CSS px. Returns segment count + the tightest pair.
const MEASURE_GAP = (slotId) => {
  const segs = [];
  for (const g of document.querySelectorAll(`#${slotId} .embed`)) {
    for (const poly of g.querySelectorAll('polyline')) {
      if (poly.classList.contains('pulse')) continue;
      const net = poly.getAttribute('data-net');
      if (!net || net === 'Vdd' || net === 'GND') continue;
      const m = poly.getScreenCTM();
      if (!m) continue;
      const pts = poly.points;
      const scr = [];
      for (let i = 0; i < pts.numberOfItems; i++) {
        const p = pts.getItem(i);
        scr.push({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });
      }
      for (let i = 0; i < scr.length - 1; i++) {
        const a = scr[i], b = scr[i + 1];
        if (Math.abs(a.y - b.y) < 0.5 && Math.abs(a.x - b.x) > 1)
          segs.push({ o: 'h', fixed: (a.y + b.y) / 2, lo: Math.min(a.x, b.x), hi: Math.max(a.x, b.x), net });
        else if (Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) > 1)
          segs.push({ o: 'v', fixed: (a.x + b.x) / 2, lo: Math.min(a.y, b.y), hi: Math.max(a.y, b.y), net });
      }
    }
  }
  let min = Infinity, pair = null;
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const s = segs[i], t = segs[j];
    if (s.o !== t.o || s.net === t.net) continue;            // distinct nets only
    if (Math.min(s.hi, t.hi) - Math.max(s.lo, t.lo) <= 1) continue;  // must overlap
    const gap = Math.abs(s.fixed - t.fixed);
    if (gap < 0.5) continue;                                  // coincident / crossing
    if (gap < min) { min = gap; pair = [s.net, t.net, Math.round(gap * 100) / 100, s.o, Math.round(s.fixed), Math.round(t.fixed)]; }
  }
  return { min: min === Infinity ? null : min, pair, segs: segs.length };
};

console.log('\n── Preview fidelity: hover preview == the page you drill into ──');

let checked = 0;
for (const file of pages) {
  await page.goto(`${HOST}/${file}`);
  await page.waitForTimeout(150);
  const slots = await page.$$eval('[data-embed-page]', (els) => els.map((e) => ({
    id: e.id, target: e.getAttribute('data-embed-page'), svgId: e.getAttribute('data-embed-svg') || '',
  })));
  for (const s of slots) {
    checked++;
    // (a) Fidelity — every static net of the target page is present in the embed.
    const targetNets = staticNetsOf(s.target);
    const previewNets = await page.$eval(`#${s.id}`,
      (slot) => [...new Set([...slot.querySelectorAll('.embed [data-net]')].map((e) => e.getAttribute('data-net')))]);
    const hasEmbed = await page.$eval(`#${s.id}`, (slot) => !!slot.querySelector('.embed'));
    const missing = targetNets.filter((n) => !previewNets.includes(n));
    expect(`${file} #${s.id}: preview is the real ${s.target} layout`,
      hasEmbed && missing.length === 0,
      !hasEmbed ? `no .embed in the preview — data-embed-page not auto-filled (src/embedPreview.ts).`
        : `preview missing ${missing.length} net(s) the page has: ${missing.slice(0, 12).join(', ')}. ` +
          `The preview must be an exact copy of ${s.target}, not an approximation.`);

    // (b) Alignment — every parent wire endpoint inside the box lands on an
    // embedded pin, and every embedded pin has a wire on it.
    await page.hover(`#${s.id}`).catch(() => {});
    await page.waitForTimeout(250);
    const al = await page.evaluate(MEASURE_ALIGN, s.id);
    const near = (p, set) => set.some((q) => Math.hypot(p.x - q.x, p.y - q.y) <= ALIGN_TOL);
    const floating = al.ends.filter((e) => !near(e, al.pins));
    const unconnected = al.pins.filter((p) => !near(p, al.ends));
    expect(`${file} #${s.id}: wires land on the embedded child's pins`,
      al.pins.length > 0 && floating.length === 0 && unconnected.length === 0,
      al.pins.length === 0 ? `no embedded pins found in the preview.`
        : `${floating.length} wire end(s) not on any pin, ${unconnected.length} pin(s) with no wire ` +
          `(of ${al.ends.length} ends / ${al.pins.length} pins). Route the wires onto the embedded pins (datapath.ts uses the projected pin map from autoFillEmbeds).`);

    // (c) Readability — measure wire spacing, screenshot.
    const gap = await page.evaluate(MEASURE_GAP, s.id);
    await page.screenshot({ path: path.join(OUT_DIR, `${file.replace(/\.html$/, '')}__${s.id}.png`) });
    await page.mouse.move(2, 2);
    expect(`${file} #${s.id}: wires distinguishable (min gap ${gap.min === null ? 'n/a' : Math.round(gap.min * 100) / 100}px ≥ ${MIN_GAP_PX})`,
      gap.min === null || gap.min >= MIN_GAP_PX,
      `tightest distinct-net wires ${gap.pair ? gap.pair.slice(0, 2).join(' / ') : '?'} are only ${gap.pair ? gap.pair[2] : '?'}px apart on screen ` +
      `(< ${MIN_GAP_PX}). Enlarge this preview's box so every wire is distinguishable.`);
  }
}

await browser.close();
killServer();

expect('exercised at least one embed preview', checked >= 1,
  checked < 1 ? 'no [data-embed-page] slots found — is the convention still used?' : '');

const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
for (const r of results) {
  const tag = r.ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  let line = `  ${tag}  ${pad(r.label, 72)}`;
  if (!r.ok && r.detail) line += `\n        ${r.detail}`;
  console.log(line);
}
console.log(`\nScreenshots: ${OUT_DIR}`);
console.log(`${failures === 0 ? '\x1b[32mALL ' + results.length + ' PASS\x1b[0m' : '\x1b[31m' + failures + ' FAIL of ' + results.length + '\x1b[0m'}`);
process.exit(failures);
