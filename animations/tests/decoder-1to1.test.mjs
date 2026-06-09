// decoder-1to1: locks the 1:1 mapping between
//
//   wire_sketches/layer10_decoder.md     (source of truth — world coords)
//   src/scenes/decoderScene.ts            (shared renderer)
//   /decoder.html                         (full-size standalone page)
//   /mux.html → slot-decoder → #decoderDetail   (hover preview)
//
// Failure modes this catches:
//   (a) Someone edits decoderScene.ts data without updating the
//       wireframe, or vice-versa → world-coord constants drift apart.
//   (b) Someone reintroduces a hand-coded mini-schematic in the MUX
//       hover preview that doesn't match the real decoder → preview
//       and full decoder render different shapes.
//   (c) Both views render different element counts / IDs → 1:1
//       mapping broken.

import { readFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(ROOT, '..');
const WF_PATH = path.resolve(REPO_ROOT, 'wire_sketches/layer10_decoder.md');
const SCENE_PATH = path.resolve(ROOT, 'src/scenes/decoderScene.ts');

let failures = 0;
const results = [];
function expect(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  results.push({ ok, label, detail: ok ? '' : `got=${JSON.stringify(got)} want=${JSON.stringify(want)}` });
  if (!ok) failures++;
}
function expectClose(label, got, want, eps = 1e-6) {
  const ok = typeof got === 'number' && typeof want === 'number' && Math.abs(got - want) <= eps;
  results.push({ ok, label, detail: ok ? '' : `got=${got} want=${want} (eps=${eps})` });
  if (!ok) failures++;
}

// ─── (1) Wireframe world coords match decoderScene.ts data ──────────
//
// Parse decoder.md's "## External terminals" + "## Absorbed terminals"
// + "## Embedded children" sections, then check every entry against
// DECODER_POINTS / DECODER_CHILDREN in decoderScene.ts.

console.log('\n── (1) decoderScene.ts world coords match layer10 wireframe ──');

const wfText = readFileSync(WF_PATH, 'utf8');
const sceneText = readFileSync(SCENE_PATH, 'utf8');

function parseWireframePoints(text) {
  // Pull every line like `- \`name\`  (x, y)  ← ...` from any section.
  const pts = new Map();
  const re = /-\s*`([A-Za-z_][\w]*)`\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    pts.set(m[1], { x: parseFloat(m[2]), y: parseFloat(m[3]) });
  }
  // Plus the external-terminals table rows (different format)
  const tableRe = /^\|\s*([A-Za-z_][\w]*)\s*\|[^|]*\|\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*\|/gm;
  while ((m = tableRe.exec(text)) !== null) {
    if (!pts.has(m[1])) pts.set(m[1], { x: parseFloat(m[2]), y: parseFloat(m[3]) });
  }
  return pts;
}

function parseScenePoints(text) {
  // Pull DECODER_POINTS entries: `key: { x: <num>, y: <num> },`
  const pts = new Map();
  const start = text.indexOf('DECODER_POINTS');
  const end = text.indexOf('};', start);
  const body = text.slice(start, end);
  const re = /(\w+):\s*\{\s*x:\s*(-?\d+(?:\.\d+)?)\s*,\s*y:\s*(-?\d+(?:\.\d+)?)\s*\}/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    pts.set(m[1], { x: parseFloat(m[2]), y: parseFloat(m[3]) });
  }
  return pts;
}

function parseSceneChildren(text) {
  const pts = new Map();
  const start = text.indexOf('DECODER_CHILDREN');
  const end = text.indexOf('};', start);
  const body = text.slice(start, end);
  // Tolerate extra fields after cx/cy/w/h (e.g., `orient: 'vertical' as const`).
  const re = /(\w+):\s*\{\s*cx:\s*(-?\d+(?:\.\d+)?)\s*,\s*cy:\s*(-?\d+(?:\.\d+)?)\s*,\s*w:\s*(-?\d+(?:\.\d+)?)\s*,\s*h:\s*(-?\d+(?:\.\d+)?)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    pts.set(m[1], { cx: parseFloat(m[2]), cy: parseFloat(m[3]), w: parseFloat(m[4]), h: parseFloat(m[5]) });
  }
  return pts;
}

const wfPoints = parseWireframePoints(wfText);
const scenePoints = parseScenePoints(sceneText);
const sceneChildren = parseSceneChildren(sceneText);

// Every named point in the wireframe must appear in decoderScene.ts
// with the same world coords. (External terminals + absorbed +
// junctions are all in DECODER_POINTS.)
const REQUIRED_POINTS = [
  // External
  'a1_in', 'a0_in', 'EN_in',
  'sel3_out', 'sel2_out', 'sel1_out', 'sel0_out',
  // Absorbed
  'inv_a1_A_in', 'inv_a1_Y_out', 'inv_a0_A_in', 'inv_a0_Y_out',
  'and3_A_in', 'and3_B_in', 'and3_C_in', 'and3_Y_out',
  'and2_A_in', 'and2_B_in', 'and2_C_in', 'and2_Y_out',
  'and1_A_in', 'and1_B_in', 'and1_C_in', 'and1_Y_out',
  'and0_A_in', 'and0_B_in', 'and0_C_in', 'and0_Y_out',
  // Bus junctions
  'a1_tap', 'a0_tap', 'na1_tap', 'na0_tap',
];
for (const key of REQUIRED_POINTS) {
  const wf = wfPoints.get(key);
  const sc = scenePoints.get(key);
  if (!wf) { expect(`wireframe declares "${key}"`, false, true); continue; }
  if (!sc) { expect(`decoderScene declares "${key}"`, false, true); continue; }
  expectClose(`${key}.x matches (wf=${wf.x}, scene=${sc.x})`, sc.x, wf.x);
  expectClose(`${key}.y matches (wf=${wf.y}, scene=${sc.y})`, sc.y, wf.y);
}

// Every child box matches
const REQUIRED_CHILDREN = ['inv_a1', 'inv_a0', 'and3', 'and2', 'and1', 'and0'];
for (const key of REQUIRED_CHILDREN) {
  const sc = sceneChildren.get(key);
  if (!sc) { expect(`decoderScene declares child "${key}"`, false, true); continue; }
  // Cross-check absorbed terminal positions against the wireframe.
  // Inverters are horizontal orientation: A_in at LEFT-mid, Y_out at RIGHT-mid
  // (per the locked LEFT=inputs, RIGHT=outputs invariant).
  if (key.startsWith('inv_')) {
    const wfA = wfPoints.get(`${key}_A_in`);
    const wfY = wfPoints.get(`${key}_Y_out`);
    if (wfA) {
      expectClose(`${key}_A_in.x matches left edge`, sc.cx - sc.w / 2, wfA.x);
      expectClose(`${key}_A_in.y matches cy`, sc.cy, wfA.y);
    }
    if (wfY) {
      expectClose(`${key}_Y_out.x matches right edge`, sc.cx + sc.w / 2, wfY.x);
      expectClose(`${key}_Y_out.y matches cy`, sc.cy, wfY.y);
    }
  } else if (key.startsWith('and')) {
    // AND-3: A at LEFT frac 0.25, B at LEFT frac 0.5, C at LEFT frac 0.75, Y RIGHT mid
    const wfA = wfPoints.get(`${key}_A_in`);
    const wfB = wfPoints.get(`${key}_B_in`);
    const wfC = wfPoints.get(`${key}_C_in`);
    const wfY = wfPoints.get(`${key}_Y_out`);
    if (wfA && wfB && wfC && wfY) {
      const top = sc.cy + sc.h / 2;
      expectClose(`${key}_A_in.y = top - 0.25h`, top - 0.25 * sc.h, wfA.y);
      expectClose(`${key}_B_in.y = top - 0.5h`,  top - 0.50 * sc.h, wfB.y);
      expectClose(`${key}_C_in.y = top - 0.75h`, top - 0.75 * sc.h, wfC.y);
      expectClose(`${key}_Y_out.x = right edge`, sc.cx + sc.w / 2, wfY.x);
      expectClose(`${key}_Y_out.y = cy`,         sc.cy, wfY.y);
    }
  }
}

// ─── (2) /decoder.html and /mux.html#decoderDetail render 1:1 ───────
//
// The shared renderer should produce IDENTICAL element trees for both
// (just at different scales). Boot a Playwright browser, count tagged
// elements in each view, and confirm they match.

console.log('\n── (2) decoder.html and mux preview render the SAME elements ──');

try { mkdirSync(path.join(ROOT, 'test-results/decoder-1to1'), { recursive: true }); } catch {}

const PORT = 4185;
const HOST = `http://localhost:${PORT}`;
const server = spawn(
  'npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
);
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite preview timeout')), 15_000);
  server.stdout.on('data', (b) => {
    if (b.toString().includes('Local:')) { clearTimeout(t); setTimeout(res, 400); }
  });
  server.on('exit', (code) => rej(new Error(`vite exited ${code}`)));
});

const browser = await chromium.launch();
const page = await browser.newPage();

// Count element types in the full decoder
await page.goto(`${HOST}/decoder.html`);
await page.waitForTimeout(200);
const decoderInventory = await page.evaluate(() => {
  const svg = document.getElementById('decoder');
  const wires = svg.querySelectorAll('.wire');
  // Group wires by net to detect duplication
  const nets = {};
  for (const w of wires) {
    const n = w.getAttribute('data-net');
    nets[n] = (nets[n] || 0) + 1;
  }
  return {
    gateBodies: svg.querySelectorAll('path.tbody').length,
    wires: wires.length,
    nets,
    pins: svg.querySelectorAll('circle.pin').length,
  };
});

// Count element types in the MUX preview (after hover so it's visible — though
// elements exist regardless of opacity, so we can read them without hovering).
await page.goto(`${HOST}/mux.html`);
await page.waitForTimeout(200);
const previewInventory = await page.evaluate(() => {
  const detail = document.getElementById('decoderDetail');
  const wires = detail.querySelectorAll('.wire');
  const nets = {};
  for (const w of wires) {
    const n = w.getAttribute('data-net');
    nets[n] = (nets[n] || 0) + 1;
  }
  return {
    gateBodies: detail.querySelectorAll('path.tbody').length,
    wires: wires.length,
    nets,
    pins: detail.querySelectorAll('circle.pin').length,
  };
});

// Both views must have the SAME gate-body count and the same wire net groupings
expect('preview gate-body count matches decoder', previewInventory.gateBodies, decoderInventory.gateBodies);
expect('preview wire count matches decoder',     previewInventory.wires,      decoderInventory.wires);
expect('preview wire nets match decoder',        previewInventory.nets,       decoderInventory.nets);
// The preview is now an EXACT embed of the decoder (same renderDecoderScene
// via PAGE_RENDERERS), so it carries the same 7 external pins — the parent's
// wires land on them (verified by preview-fidelity's pin-bijection ALIGNMENT).
expect('preview has the same 7 external pins',   previewInventory.pins,       7);
expect('decoder has 7 external pins',            decoderInventory.pins,       7);
expect('preview pin count matches decoder',      previewInventory.pins,       decoderInventory.pins);

await browser.close();
server.kill();

// ─── Report ────────────────────────────────────────────────────────
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
for (const r of results) {
  const tag = r.ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  let line = `  ${tag}  ${pad(r.label, 72)}`;
  if (!r.ok && r.detail) line += `\n        ${r.detail}`;
  console.log(line);
}
console.log(`\n${failures === 0
  ? '\x1b[32mALL ' + results.length + ' PASS\x1b[0m'
  : '\x1b[31m' + failures + ' FAIL of ' + results.length + '\x1b[0m'}`);
process.exit(failures);
