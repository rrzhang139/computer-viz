// Wireframe gate — a static check (no browser) that enforces two rules:
//
//  (a) Wireframe completeness: every external terminal declared in a
//      layer's wire_sketches/layerN_<name>.md MUST appear as a `data-net`
//      attribute in the corresponding animation page's HTML.
//      If wireframe says the DFF has both Q and Q̄ external terminals,
//      and the page only ships a Q wire, fail.
//
//  (b) Wireframe-first discipline: every animation page in
//      `animations/*.html` (except the legacy backups in `_legacy/`)
//      MUST have a corresponding wireframe in `wire_sketches/layerN_*.md`.
//      If someone adds /xor.html without first writing layerX_xor.md,
//      fail. This forces the design-first workflow.
//
// Run: npm run test:wireframe-gate
// Or as part of: npm run test:all

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(ROOT, '..');
const WIRE_SKETCHES_DIR = path.resolve(REPO_ROOT, 'wire_sketches');

let failures = 0;
const results = [];
function expect(label, ok, detail = '') {
  results.push({ ok, label, detail });
  if (!ok) failures++;
}

// ─── (a) WIREFRAME COMPLETENESS ────────────────────────────────────
// For each layer wireframe, list its external terminals, check the
// matching animation page contains a wire/element with data-net="X" for
// each terminal name.

// Map layer name (the "<name>" part of layerN_<name>.md) → the
// animation page file. Some are direct (dff → dff.html), some renamed
// (gate → index.html for the standalone NAND page).
const LAYER_TO_PAGE = {
  transistor: null,     // no animation page
  gate:       'index.html',
  latch:      'latch.html',
  dlatch:     'dlatch.html',
  dff:        'dff.html',
  register:   'register.html',
  halfadder:  'halfadder.html',
  fulladder:  'fulladder.html',
  adder4:     'adder4.html',
  counter:    'counter.html',
  decoder:    'decoder.html',
  mux:        'mux.html',
  regfile:    'regfile.html',
  alu:        'alu.html',
  alu1:       'alu1.html',
  datapath:   'datapath.html',
  idecode:    'idecode.html',
  mem:        'mem.html',
  dmem:       'dmem.html',
  fetch:      'fetch.html',
  cpu:        'cpu.html',
  cpuldst:    'cpu_ldst.html',
};

// Terminals that don't appear as data-net wires because they're
// implicit (Vdd/GND rails, conceptual handles, etc.). Exclude these
// from the wireframe-completeness check.
const IMPLICIT_TERMS = new Set(['Vdd', 'GND']);

// Map wireframe terminal names → the canonical key used in
// implementations' `data-net` attributes. (Wireframes use names like
// `D_in`, `Q_out`; implementations use `D`, `Q`.)
function normalizeTermKey(name) {
  // Strip "_in" / "_out" / "_input" / "_output" suffixes.
  return name.replace(/_(in|out|input|output)$/, '');
}

function parseWireframeTerminals(mdPath) {
  const src = readFileSync(mdPath, 'utf8');
  // The external-terminals section is a markdown table with header
  // `| key | role | (x, y) | edge |`. Pull the `key` column.
  const lines = src.split('\n');
  const startIdx = lines.findIndex((l) => /^## External terminals/.test(l));
  if (startIdx < 0) return [];
  const keys = [];
  // Walk lines until the next ## heading.
  for (let i = startIdx + 1; i < lines.length; i++) {
    const ln = lines[i];
    if (/^##\s/.test(ln) && !ln.startsWith('## External')) break;
    const cells = ln.split('|').map((c) => c.trim());
    if (cells.length < 2 || ln.startsWith('| key') || ln.startsWith('|---')) continue;
    const key = cells[1];
    if (!key || key === '—') continue;
    if (!/^[A-Za-z_][\w-]*$/.test(key)) continue;
    keys.push(key);
  }
  return keys;
}

function extractDataNets(htmlPath) {
  const src = readFileSync(htmlPath, 'utf8');
  const nets = new Set();
  let m;
  const re = /data-net="([^"]+)"/g;
  while ((m = re.exec(src)) !== null) nets.add(m[1]);
  // Pages that inject SVG from src/scenes/*.ts at runtime have no static
  // data-net attrs in their HTML; pick those up by also scanning any
  // scene/TS module the page imports (recursively).
  const visited = new Set();
  const walkTs = (tsPath) => {
    if (visited.has(tsPath)) return;
    visited.add(tsPath);
    let body;
    try { body = readFileSync(tsPath, 'utf8'); } catch { return; }
    // Pull `net: '...'` literal strings (renderer's wire spec format)
    const netRe = /net:\s*['"]([^'"]+)['"]/g;
    let mm;
    while ((mm = netRe.exec(body)) !== null) nets.add(mm[1]);
    // Pull `data-net="..."` and `setAttribute('data-net', ...)` calls
    const dnRe = /data-net["']?\s*[,:=]\s*["']([^"']+)["']/g;
    while ((mm = dnRe.exec(body)) !== null) nets.add(mm[1]);
    // Recurse into local imports `from "./scenes/foo"` / `from "./foo"`
    const imp = /from\s+["'](\.[^"']+)["']/g;
    while ((mm = imp.exec(body)) !== null) {
      const rel = mm[1];
      const baseDir = path.dirname(tsPath);
      for (const ext of ['.ts', '.tsx', '/index.ts']) {
        const candidate = path.resolve(baseDir, rel + ext);
        try { readFileSync(candidate); walkTs(candidate); break; } catch {}
      }
    }
  };
  // Convention: <page>.html ↔ src/<page>.ts (entry point). Walk from there.
  const pageStem = path.basename(htmlPath, '.html');
  const stem = pageStem === 'index' ? 'main' : pageStem;
  const entryTs = path.resolve(ROOT, 'src', `${stem}.ts`);
  walkTs(entryTs);
  return nets;
}

console.log('\n── (a) Wireframe completeness ────────────────────────');
const wireframeFiles = readdirSync(WIRE_SKETCHES_DIR)
  .filter((f) => /^layer\d+_[a-z0-9]+\.md$/.test(f))
  .sort();

for (const file of wireframeFiles) {
  const m = file.match(/^layer\d+_([a-z0-9]+)\.md$/);
  if (!m) continue;
  const layerName = m[1];
  const pageFile = LAYER_TO_PAGE[layerName];
  if (!pageFile) continue;  // skip transistor (no animation page)
  const pagePath = path.join(ROOT, pageFile);
  if (!existsSync(pagePath)) {
    expect(`layer "${layerName}" has corresponding page (${pageFile})`, false);
    continue;
  }
  const wfTerms = parseWireframeTerminals(path.join(WIRE_SKETCHES_DIR, file));
  const implNets = extractDataNets(pagePath);
  for (const term of wfTerms) {
    if (IMPLICIT_TERMS.has(term)) continue;
    const norm = normalizeTermKey(term);
    const found = implNets.has(term) || implNets.has(norm) ||
                  Array.from(implNets).some((n) => n.startsWith(norm));
    expect(
      `layer "${layerName}" terminal "${term}" → data-net found in ${pageFile}`,
      found,
      found ? '' : `available nets: ${Array.from(implNets).sort().join(', ')}`,
    );
  }
}

// ─── (b) WIREFRAME-FIRST DISCIPLINE ────────────────────────────────
// Every animation page (excluding _legacy/) must have a matching layer
// wireframe. This blocks "implement first, document later" workflows.

console.log('\n── (b) Wireframe-first: every page has a wireframe ───');
const animationPages = readdirSync(ROOT)
  .filter((f) => f.endsWith('.html'))
  .filter((f) => !f.startsWith('_'));     // exclude _legacy/ if it ever appears here

// Reverse map: page filename → expected layer name
const PAGE_TO_LAYER = Object.fromEntries(
  Object.entries(LAYER_TO_PAGE).filter(([, p]) => p !== null).map(([k, v]) => [v, k]),
);

const layerNamesPresent = new Set(
  wireframeFiles.map((f) => f.match(/^layer\d+_([a-z0-9]+)\.md$/)?.[1]).filter(Boolean),
);

for (const pageFile of animationPages.sort()) {
  const expectedLayer = PAGE_TO_LAYER[pageFile];
  if (!expectedLayer) {
    expect(`page "${pageFile}" has a known layer mapping`, false,
      `no entry in LAYER_TO_PAGE — add the mapping or write a wireframe first`);
    continue;
  }
  const found = layerNamesPresent.has(expectedLayer);
  expect(
    `page "${pageFile}" has wireframe layerN_${expectedLayer}.md`,
    found,
    found ? '' : `missing wire_sketches/layer<N>_${expectedLayer}.md — wireframe first!`,
  );
}

// ─── Report ────────────────────────────────────────────────────────
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
for (const r of results) {
  const tag = r.ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  let line = `  ${tag}  ${pad(r.label, 72)}`;
  if (!r.ok && r.detail) line += `\n        ${r.detail}`;
  console.log(line);
}
console.log(`\n${failures === 0 ? '\x1b[32mALL ' + results.length + ' PASS\x1b[0m' : '\x1b[31m' + failures + ' FAIL of ' + results.length + '\x1b[0m'}`);
process.exit(failures);
