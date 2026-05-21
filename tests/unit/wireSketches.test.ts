// Pins each layer's wire_sketches/layerN_<name>.md "External terminals"
// table to the corresponding WIRE_NODES entries in src/levels/*WireGraph.ts.
// If the sketch drifts from the code (or the code drifts from the sketch),
// the test fails — keeping the design source-of-truth and the runtime data
// in lockstep.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  WIRE_NODES as GATE_NODES,
  GATE_EXTERNAL_TERMINALS,
} from '../../src/levels/nandWireGraph';
import {
  WIRE_NODES as LATCH_NODES,
  LATCH_EXTERNAL_TERMINALS,
} from '../../src/levels/latchWireGraph';
import {
  WIRE_NODES as DLATCH_NODES,
  DLATCH_EXTERNAL_TERMINALS,
} from '../../src/levels/dLatchWireGraph';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sketchesDir = path.resolve(__dirname, '../../wire_sketches');

interface ExternalRow {
  key: string;
  x: number;
  y: number;
  edge: string;
}

function parseExternalTerminals(mdPath: string): ExternalRow[] {
  const src = fs.readFileSync(mdPath, 'utf8');
  // Slice the "## External terminals" section.
  const m = src.match(/##\s+External terminals\s*\n([\s\S]*?)(?=\n##\s|\n$)/);
  if (!m) return [];
  const section = m[1];
  const lines = section.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 3) return [];
  const headers = splitRow(lines[0]);
  const xyIdx = headers.findIndex((h) => /\(\s*x\s*,\s*y\s*\)/.test(h));
  const keyIdx = headers.findIndex((h) => h.toLowerCase() === 'key');
  const edgeIdx = headers.findIndex((h) => h.toLowerCase() === 'edge');
  const rows: ExternalRow[] = [];
  for (const line of lines.slice(2)) {
    const cells = splitRow(line);
    const xy = parseXY(cells[xyIdx]);
    const key = (cells[keyIdx] || '').trim();
    if (!key || !xy) continue;
    rows.push({ key, x: xy.x, y: xy.y, edge: (cells[edgeIdx] || '').trim() });
  }
  return rows;
}

function splitRow(line: string): string[] {
  let l = line.trim();
  if (l.startsWith('|')) l = l.slice(1);
  if (l.endsWith('|')) l = l.slice(0, -1);
  return l.split('|').map((s) => s.trim());
}

function parseXY(s: string | undefined): { x: number; y: number } | null {
  const m = String(s || '').match(/\(\s*([\-\d.]+)\s*,\s*([\-\d.]+)\s*\)/);
  if (!m) return null;
  return { x: +m[1], y: +m[2] };
}

// Classify a code-side external-terminal key.
//   "Vdd_rail_left" / "Vdd_left" / "Vdd_*"  → 'Vdd'  (a rail endpoint)
//   "GND_rail_left" / "GND_left" / "GND_*"  → 'GND'
//   anything else                            → 'data'
function classifyCodeKey(key: string): 'Vdd' | 'GND' | 'data' {
  if (/^Vdd/.test(key)) return 'Vdd';
  if (/^GND/.test(key)) return 'GND';
  return 'data';
}

interface LayerCase {
  md: string;
  externalKeys: readonly string[];
  nodes: Record<string, readonly [number, number, number]>;
}

function checkLayer(c: LayerCase) {
  const rows = parseExternalTerminals(path.join(sketchesDir, c.md));
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));

  // Data terminals: 1:1 match between sketch and code.
  const dataCodeKeys = c.externalKeys.filter((k) => classifyCodeKey(k) === 'data');
  for (const codeKey of dataCodeKeys) {
    const sketch = byKey[codeKey];
    expect(sketch, `${c.md}: missing data terminal ${codeKey}`).toBeDefined();
    const node = c.nodes[codeKey];
    expect(node, `${codeKey} missing in WIRE_NODES`).toBeDefined();
    expect(sketch.x, `${c.md} ${codeKey}.x`).toBeCloseTo(node[0], 6);
    expect(sketch.y, `${c.md} ${codeKey}.y`).toBeCloseTo(node[1], 6);
  }

  // Supply terminals: code has multiple rail endpoints (Vdd_*, GND_*);
  // sketch collapses them into single conceptual `Vdd` and `GND` terminals.
  // The sketch's y MUST match the code's rail y (all Vdd_* endpoints share
  // a y, all GND_* endpoints share a y).
  const vddCodeKeys = c.externalKeys.filter((k) => classifyCodeKey(k) === 'Vdd');
  const gndCodeKeys = c.externalKeys.filter((k) => classifyCodeKey(k) === 'GND');
  if (vddCodeKeys.length > 0) {
    const railY = c.nodes[vddCodeKeys[0]][1];
    for (const k of vddCodeKeys) {
      expect(c.nodes[k][1], `${c.md} ${k}.y matches rail y`).toBeCloseTo(railY, 6);
    }
    expect(byKey.Vdd, `${c.md}: missing single Vdd external`).toBeDefined();
    expect(byKey.Vdd.y, `${c.md} Vdd y matches rail y`).toBeCloseTo(railY, 6);
    expect(byKey.Vdd.edge).toBe('TOP');
  }
  if (gndCodeKeys.length > 0) {
    const railY = c.nodes[gndCodeKeys[0]][1];
    for (const k of gndCodeKeys) {
      expect(c.nodes[k][1], `${c.md} ${k}.y matches rail y`).toBeCloseTo(railY, 6);
    }
    expect(byKey.GND, `${c.md}: missing single GND external`).toBeDefined();
    expect(byKey.GND.y, `${c.md} GND y matches rail y`).toBeCloseTo(railY, 6);
    expect(byKey.GND.edge).toBe('BOTTOM');
  }

  // Count: data terminals + 1 Vdd + 1 GND.
  const expectedCount = dataCodeKeys.length +
    (vddCodeKeys.length > 0 ? 1 : 0) +
    (gndCodeKeys.length > 0 ? 1 : 0);
  expect(rows.length, `${c.md}: sketch external count`).toBe(expectedCount);
}

describe('wire_sketches/ external terminals match *WireGraph.ts', () => {
  it('every layer .md has a sibling .svg', () => {
    const files = fs.readdirSync(sketchesDir);
    const mds = files.filter((f) => /^layer\d+_.+\.md$/.test(f));
    expect(mds.length).toBeGreaterThanOrEqual(4);
    for (const md of mds) {
      const svg = md.replace(/\.md$/, '.svg');
      expect(files, `expected sibling ${svg}`).toContain(svg);
    }
  });

  it('layer1_gate.md matches the gate wire graph (data 1:1, supplies collapsed)', () => {
    checkLayer({
      md: 'layer1_gate.md',
      externalKeys: GATE_EXTERNAL_TERMINALS,
      nodes: GATE_NODES as unknown as Record<string, readonly [number, number, number]>,
    });
  });

  it('layer2_latch.md matches the latch wire graph (data 1:1, supplies collapsed)', () => {
    checkLayer({
      md: 'layer2_latch.md',
      externalKeys: LATCH_EXTERNAL_TERMINALS,
      nodes: LATCH_NODES as unknown as Record<string, readonly [number, number, number]>,
    });
  });

  it('layer3_dlatch.md matches the d-latch wire graph (data 1:1, supplies collapsed)', () => {
    checkLayer({
      md: 'layer3_dlatch.md',
      externalKeys: DLATCH_EXTERNAL_TERMINALS,
      nodes: DLATCH_NODES as unknown as Record<string, readonly [number, number, number]>,
    });
  });

  it('layer0_transistor.md declares 3 external terminals on the canonical edges', () => {
    const rows = parseExternalTerminals(path.join(sketchesDir, 'layer0_transistor.md'));
    expect(rows.length).toBe(3);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.gate?.edge).toBe('LEFT');
    expect(byKey.source?.edge).toBe('TOP');
    expect(byKey.drain?.edge).toBe('BOTTOM');
  });

  it('edge column respects the spatial invariant (LEFT/RIGHT/TOP/BOTTOM only)', () => {
    const allowed = new Set(['LEFT', 'RIGHT', 'TOP', 'BOTTOM']);
    for (const md of ['layer0_transistor.md', 'layer1_gate.md', 'layer2_latch.md', 'layer3_dlatch.md']) {
      const rows = parseExternalTerminals(path.join(sketchesDir, md));
      for (const r of rows) {
        expect(allowed.has(r.edge), `${md} ${r.key} edge=${r.edge}`).toBe(true);
      }
    }
  });
});
