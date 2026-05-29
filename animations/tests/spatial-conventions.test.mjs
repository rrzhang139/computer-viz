// spatial-conventions — locks the project's spatial invariant from CLAUDE.md
// and the user's "ALL inputs on LEFT" extension:
//
//   *_in     → LEFT  edge   (data + control inputs all enter from the left)
//   *_out    → RIGHT edge   (every output exits on the right)
//   Vdd      → TOP   edge
//   GND      → BOTTOM edge
//
// The point of this test is to catch convention drift on the NEXT wireframe
// before it lands. It runs as a `pretest` hook so any wireframe edit that
// breaks the rule fails the suite immediately.
//
// Legacy exception: a small allowlist tolerates existing wireframes that
// pre-date the rule (notably CLK_in on TOP, EN_in on TOP in the D latch).
// Adding to this allowlist requires a code change and a comment explaining
// why — the friction is intentional.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIRE_SKETCHES_DIR = path.resolve(__dirname, '../../wire_sketches');

// Legacy violations — pre-existing terminals that don't match the strict
// "ALL inputs LEFT" rule. Each entry is one specific (layer, key, edge)
// triple that's tolerated. The set is FROZEN: a NEW layer cannot add to it
// without an explicit code edit + justification.
const LEGACY_ALLOWLIST = new Set([
  // Clock-driven sequential elements predate the "ALL inputs LEFT" rule —
  // CLK on TOP is the textbook convention for these specific layers.
  'layer4_dff:CLK_in:TOP',
  'layer5_register:CLK_in:TOP',
  'layer9_counter:CLK_in:TOP',
  // D latch's level-sensitive enable predates the rule — kept on TOP to
  // match its layer-3 standalone spec; new layers must put EN on LEFT.
  'layer3_dlatch:EN_in:TOP',
  // Transistor (layer 0) is a leaf physical primitive — its terminals
  // (gate, source, drain) follow the silicon convention, not the logical
  // LEFT/RIGHT/TOP/BOTTOM signal-flow convention.
  'layer0_transistor:source:TOP',
  'layer0_transistor:drain:BOTTOM',
  // Layer-1 gate is the NAND with a TOP-edge B_input absorbed from a
  // different convention; the embedded gate aspect already pins this and
  // it's enforced elsewhere.
  'layer1_gate:B_input:RIGHT',
]);

let failures = 0;
const results = [];
function expect(label, ok, detail = '') {
  results.push({ ok, label, detail });
  if (!ok) failures++;
}

function ruleFor(key) {
  if (key === 'Vdd') return 'TOP';
  if (key === 'GND') return 'BOTTOM';
  if (/_out$/.test(key)) return 'RIGHT';
  if (/_in$/.test(key)) return 'LEFT';
  return null;  // no rule (skip)
}

function parseExternalTerminals(text) {
  // Find the "## External terminals" section and pull every table row.
  const lines = text.split('\n');
  const startIdx = lines.findIndex((l) => /^## External terminals/.test(l));
  if (startIdx < 0) return [];
  const terms = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const ln = lines[i];
    if (/^##\s/.test(ln) && !ln.startsWith('## External')) break;
    if (!ln.trim().startsWith('|')) continue;
    if (ln.startsWith('| key') || ln.startsWith('|---') || ln.startsWith('|--')) continue;
    const cells = ln.split('|').map((c) => c.trim());
    if (cells.length < 5) continue;
    const key  = cells[1];
    const edge = cells[4];
    if (!/^[A-Za-z_][\w]*$/.test(key)) continue;
    if (!/^(LEFT|RIGHT|TOP|BOTTOM)$/.test(edge)) continue;
    terms.push({ key, edge });
  }
  return terms;
}

const files = readdirSync(WIRE_SKETCHES_DIR)
  .filter((f) => /^layer\d+_[a-z0-9]+\.md$/.test(f))
  .sort();

console.log('\n── Spatial conventions: *_in → LEFT, *_out → RIGHT, Vdd → TOP, GND → BOTTOM ──');

for (const file of files) {
  const layerStem = file.replace(/\.md$/, '');
  const text = readFileSync(path.join(WIRE_SKETCHES_DIR, file), 'utf8');
  const terms = parseExternalTerminals(text);
  for (const { key, edge } of terms) {
    const want = ruleFor(key);
    if (!want) continue;            // no rule for this key
    if (want === edge) {
      expect(`${layerStem}: ${key} on ${edge}`, true);
      continue;
    }
    const tag = `${layerStem}:${key}:${edge}`;
    if (LEGACY_ALLOWLIST.has(tag)) {
      // Allowed legacy mismatch — count as PASS but log so it's visible.
      results.push({ ok: true, label: `${layerStem}: ${key} on ${edge} (LEGACY ALLOWED, expected ${want})`, detail: '' });
      continue;
    }
    expect(
      `${layerStem}: ${key} on ${edge}`,
      false,
      `expected ${want} per "ALL inputs LEFT / outputs RIGHT" rule; add to LEGACY_ALLOWLIST in spatial-conventions.test.mjs if intentional`,
    );
  }
}

const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
for (const r of results) {
  const tag = r.ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  let line = `  ${tag}  ${pad(r.label, 78)}`;
  if (!r.ok && r.detail) line += `\n        ${r.detail}`;
  console.log(line);
}
console.log(`\n${failures === 0
  ? '\x1b[32mALL ' + results.length + ' PASS\x1b[0m'
  : '\x1b[31m' + failures + ' FAIL of ' + results.length + '\x1b[0m'}`);
process.exit(failures);
