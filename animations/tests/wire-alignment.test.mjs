// wire-alignment — enforces that every drillable child's incoming/outgoing
// PARENT wires land exactly on the child hover-preview's TERMINAL stubs, in
// the rendered DOM. This is the machine guarantee behind "programmatic
// alignment, not hardcoding": a parent may compute its wire endpoints however
// it likes, but they MUST coincide with the preview's real terminals — so a
// wire can't visually connect to a port that isn't there (the regfile/alu MUX
// and full-adder-Cout bugs this test was written to catch).
//
// The invariant, measured per drillable slot (`[id^="slot-"]`, cursor:pointer):
//
//   Let BOX = the slot's simple-body rect. On BOX's perimeter:
//     parentTerms  = endpoints of parent `.wire` polylines (not Vdd/GND)
//                    that touch the perimeter — i.e. where the parent wires
//                    meet this child.
//     previewTerms = endpoints of the child preview's polylines (inside the
//                    slot's `.detailed`, not Vdd/GND) that touch the perimeter
//                    — i.e. the child's real terminal stubs.
//   Then every parentTerm must have a previewTerm within MATCH_TOL (the wire
//   connects to a real port), and every previewTerm must have a parentTerm
//   within MATCH_TOL (no loose-end port). All in SVG user units, so the test
//   is independent of how the page is scaled into the viewport.
//
// Pages/slots are auto-discovered, so a new layer is covered without editing
// this file. Leaf slots (cursor:default — XOR/AND/OR with no child page) are
// skipped, same as the hover-preview gate.
//
// Run: npm run test:wire-alignment  (part of npm run test:all)

import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4188;
const HOST = `http://localhost:${PORT}`;

// Tolerances in SVG viewBox USER units (points are mapped back into the
// root svg's user coordinate system, so these are independent of how the svg
// is scaled into the page). Pages are authored at integer coordinates; a
// correctly projected endpoint coincides to < 1 unit. EDGE_TOL is kept tight
// so only true boundary stubs count as terminals — an internal wire vertex
// that merely passes a few units from the edge is not a terminal.
const EDGE_TOL = 5;   // how close an endpoint must be to the box edge to count as a terminal
const MATCH_TOL = 4;  // how close a parent terminal and a preview terminal must be to be "connected"

let failures = 0;
const results = [];
function expect(label, ok, detail = '') {
  results.push({ ok, label, detail });
  if (!ok) failures++;
}

const pages = readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && !f.startsWith('_'))
  .sort();

const server = spawn(
  'npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
);
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

// Measures, for one page, every drillable slot's parent/preview terminals in
// SVG user units. Returns [{ id, parentTerms, previewTerms }].
const MEASURE = (EDGE_TOL) => {
  const round = (n) => Math.round(n * 100) / 100;
  // Map a point in an element's local coords into the ROOT svg's user
  // (viewBox) coordinate system: localPoint → screen → root-user. Doing it
  // via screen CTMs makes the result true viewBox units regardless of any
  // ancestor transforms or the svg's own viewport scaling.
  const toUser = (el, x, y) => {
    const svg = el.ownerSVGElement;
    const m = svg.getScreenCTM().inverse().multiply(el.getScreenCTM());
    const p = svg.createSVGPoint();
    p.x = x; p.y = y;
    const u = p.matrixTransform(m);
    return { x: u.x, y: u.y };
  };
  const endpointsOf = (poly) => {
    const pts = poly.points;
    if (!pts || pts.numberOfItems === 0) return [];
    const first = pts.getItem(0);
    const last = pts.getItem(pts.numberOfItems - 1);
    const out = [toUser(poly, first.x, first.y)];
    if (pts.numberOfItems > 1) out.push(toUser(poly, last.x, last.y));
    return out;
  };
  // Box corners (the simple-body rect) in user space.
  const boxOf = (rect) => {
    const x = parseFloat(rect.getAttribute('x'));
    const y = parseFloat(rect.getAttribute('y'));
    const w = parseFloat(rect.getAttribute('width'));
    const h = parseFloat(rect.getAttribute('height'));
    const tl = toUser(rect, x, y);
    const br = toUser(rect, x + w, y + h);
    return { x0: Math.min(tl.x, br.x), y0: Math.min(tl.y, br.y), x1: Math.max(tl.x, br.x), y1: Math.max(tl.y, br.y) };
  };
  // Is a point on the box perimeter (within EDGE_TOL)?
  const onPerimeter = (b, p) => {
    const inX = p.x >= b.x0 - EDGE_TOL && p.x <= b.x1 + EDGE_TOL;
    const inY = p.y >= b.y0 - EDGE_TOL && p.y <= b.y1 + EDGE_TOL;
    const nearV = (Math.abs(p.x - b.x0) <= EDGE_TOL || Math.abs(p.x - b.x1) <= EDGE_TOL) && inY;
    const nearH = (Math.abs(p.y - b.y0) <= EDGE_TOL || Math.abs(p.y - b.y1) <= EDGE_TOL) && inX;
    return nearV || nearH;
  };
  const isRail = (poly) => {
    const n = poly.getAttribute('data-net');
    return n === 'Vdd' || n === 'GND';
  };
  const out = [];
  const slots = Array.from(document.querySelectorAll('[id^="slot-"]'));
  for (const slot of slots) {
    if (getComputedStyle(slot).cursor !== 'pointer') continue;  // leaf, not drillable
    const rect = slot.querySelector('rect.simple-body');
    const detailed = slot.querySelector('.detailed');
    if (!rect || !detailed) continue;
    const b = boxOf(rect);
    // Preview terminals: preview polylines' endpoints on the perimeter.
    const previewTerms = [];
    for (const poly of detailed.querySelectorAll('polyline')) {
      if (poly.classList.contains('pulse') || isRail(poly)) continue;
      for (const p of endpointsOf(poly)) if (onPerimeter(b, p)) previewTerms.push({ x: round(p.x), y: round(p.y) });
    }
    // Parent terminals: parent .wire endpoints on the perimeter (a .wire that
    // is NOT inside any .detailed group).
    const parentTerms = [];
    for (const poly of document.querySelectorAll('polyline.wire')) {
      if (poly.closest('.detailed')) continue;
      if (poly.classList.contains('pulse') || isRail(poly)) continue;
      for (const p of endpointsOf(poly)) if (onPerimeter(b, p)) parentTerms.push({ x: round(p.x), y: round(p.y) });
    }
    out.push({ id: slot.id, box: b, parentTerms, previewTerms });
  }
  return out;
};

// Dedupe near-identical points, then require a 1-way nearest match within tol.
function dedupe(pts, tol) {
  const out = [];
  for (const p of pts) {
    if (!out.some((q) => Math.hypot(q.x - p.x, q.y - p.y) <= tol)) out.push(p);
  }
  return out;
}
function unmatched(from, to, tol) {
  return from.filter((p) => !to.some((q) => Math.hypot(q.x - p.x, q.y - p.y) <= tol));
}

console.log('\n── Wire alignment: parent wires meet child preview terminals ──');

let checked = 0;
for (const file of pages) {
  await page.goto(`${HOST}/${file}`);
  await page.waitForTimeout(220);
  let slots;
  try {
    slots = await page.evaluate(MEASURE, EDGE_TOL);
  } catch (e) {
    expect(`${file}: measure`, false, String(e && e.message || e));
    continue;
  }
  for (const s of slots) {
    checked++;
    const parent = dedupe(s.parentTerms, MATCH_TOL);
    const preview = dedupe(s.previewTerms, MATCH_TOL);
    const fmt = (a) => a.map((p) => `(${p.x},${p.y})`).join(' ');

    // Every parent wire must land on a real preview terminal.
    const danglingParent = unmatched(parent, preview, MATCH_TOL);
    expect(
      `${file} #${s.id}: parent wires land on preview terminals`,
      parent.length > 0 && danglingParent.length === 0,
      parent.length === 0
        ? `no parent wires reach this slot's box perimeter — is it wired at all?`
        : `${danglingParent.length} parent wire end(s) hit the box with no preview terminal there: ` +
          `${fmt(danglingParent)}. preview terminals: ${fmt(preview)}. ` +
          `Route the parent wire onto the child preview's projected terminal (see regfile.ts).`,
    );
    // Every preview terminal must have a parent wire (no loose ends).
    const looseEnds = unmatched(preview, parent, MATCH_TOL);
    expect(
      `${file} #${s.id}: no loose-end preview terminals`,
      preview.length > 0 && looseEnds.length === 0,
      preview.length === 0
        ? `preview exposes no terminal stubs on the box edge — does it fit the box?`
        : `${looseEnds.length} preview terminal(s) have no parent wire: ${fmt(looseEnds)}. ` +
          `parent terminals: ${fmt(parent)}.`,
    );
  }
}

await browser.close();
killServer();

expect(`exercised drillable slots across ${pages.length} pages`, checked >= 10,
  checked < 10 ? `only ${checked} — did the slot id convention change?` : '');

const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
for (const r of results) {
  const tag = r.ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  let line = `  ${tag}  ${pad(r.label, 64)}`;
  if (!r.ok && r.detail) line += `\n        ${r.detail}`;
  console.log(line);
}
console.log(`\n${failures === 0
  ? '\x1b[32mALL ' + results.length + ' PASS\x1b[0m'
  : '\x1b[31m' + failures + ' FAIL of ' + results.length + '\x1b[0m'}`);
process.exit(failures);
