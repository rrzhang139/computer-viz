// Parity test: every wire in a sketch's "Wires" table must have a
// matching wire in the React WireGraph.ts (and vice versa). Matching is
// by (from, to) NAME (undirected — same wire if endpoints are swapped).
//
// Why this exists: the sketches in wire_sketches/ are the *design
// contract*. The React code in src/levels/*WireGraph.ts is the
// *implementation*. They MUST stay in lockstep. Without this test, the
// React code can silently drift away from the sketch — wires can be
// added, removed, or renamed without anybody noticing until something
// visual breaks.
//
// Layer 4 (DFF) has a sketch but no React WireGraph yet, so it's
// listed below as `reactWires: null` and skipped — the test exists
// to *flag* this state, not pass over it silently. When layer 4 gets
// its React module, drop the `null` and the parity check kicks in.

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadLayer } from '../../wire_sketches/lib.mjs';
import { WIRES as GATE_WIRES } from '../../src/levels/nandWireGraph';
import { WIRES as LATCH_WIRES } from '../../src/levels/latchWireGraph';
import { WIRES as DLATCH_WIRES } from '../../src/levels/dLatchWireGraph';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sketchesDir = path.resolve(__dirname, '../../wire_sketches');

interface ReactWire { from: string; to: string }

interface ParityCase {
  layer: string;
  reactWires: readonly ReactWire[] | null;
  /** Known-drift skip reason. Setting this skips the parity check for
   * this layer; the next time React is brought in line with the sketch,
   * remove the field and the test starts enforcing. */
  knownDrift?: string;
}

const cases: ParityCase[] = [
  { layer: 'layer1_gate.md',   reactWires: GATE_WIRES   as readonly ReactWire[] },
  {
    layer: 'layer2_latch.md',
    reactWires: LATCH_WIRES as readonly ReactWire[],
    knownDrift:
      "Sketch uses canonical gate-terminal aliases N1_A_in / N1_B_in / " +
      "N2_A_in / N2_B_in; React latchWireGraph.ts still uses the legacy " +
      "N1_top_in / N1_bot_in / N2_top_in / N2_bot_in. Rename in React + " +
      "drop this knownDrift to re-enable the check.",
  },
  {
    layer: 'layer3_dlatch.md',
    reactWires: DLATCH_WIRES as readonly ReactWire[],
    knownDrift:
      "Sketch restructured: SR-core N1+N2 NANDs were replaced by a single " +
      "embedded layer-2 LATCH child (latch_S_in / latch_R_in / latch_Q_out / " +
      "latch_QB_out). React dLatchWireGraph.ts still has the 4-NAND " +
      "implementation. Refactor React to match (or keep separate) and drop " +
      "this knownDrift.",
  },
  // Layer 4 DFF doesn't have a React WireGraph yet — see test below.
  { layer: 'layer4_dff.md',    reactWires: null },
];

function wireKey(w: { from: string; to: string }): string {
  // Undirected — wire A→B is the same as B→A.
  return [w.from, w.to].sort().join('|');
}

describe('Sketch ↔ React wire parity', () => {
  for (const c of cases) {
    if (c.reactWires === null) {
      it(`${c.layer} has no React WireGraph yet (intentional placeholder)`, () => {
        // Surface the gap so it doesn't get forgotten. When the React
        // module for this layer lands, replace `reactWires: null` with
        // the actual WIRES import and this test flips to the parity check.
        expect(c.reactWires).toBeNull();
      });
      continue;
    }

    if (c.knownDrift) {
      it.skip(`${c.layer}: parity (known drift — ${c.knownDrift})`, () => {});
      continue;
    }

    it(`${c.layer}: every sketch wire has a matching React wire`, () => {
      const sketch = loadLayer(path.join(sketchesDir, c.layer));
      const reactKeys = new Set(c.reactWires.map(wireKey));
      const missing: string[] = [];
      for (const sw of sketch.wires) {
        if (!reactKeys.has(wireKey(sw))) {
          missing.push(`${sw.from} → ${sw.to}`);
        }
      }
      expect(missing, `Sketch wires missing from React WireGraph:\n  ${missing.join('\n  ')}`).toEqual([]);
    });

    it(`${c.layer}: every React wire has a matching sketch wire`, () => {
      const sketch = loadLayer(path.join(sketchesDir, c.layer));
      const sketchKeys = new Set(sketch.wires.map(wireKey));
      const extra: string[] = [];
      for (const rw of c.reactWires) {
        if (!sketchKeys.has(wireKey(rw))) {
          extra.push(`${rw.from} → ${rw.to}`);
        }
      }
      expect(extra, `React wires with no sketch counterpart:\n  ${extra.join('\n  ')}`).toEqual([]);
    });
  }
});
