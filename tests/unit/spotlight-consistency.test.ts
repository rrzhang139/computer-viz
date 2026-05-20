// Cross-level spotlight consistency.
//
// When a user drills DOWN through the abstraction tree (e.g., latch's NAND1
// → gate level), the gate is the same generic "A / B / Y" diagram for all
// callers. The risk: the user clicks NAND1 (whose inputs were S̄ and Q̄ in
// the latch) and lands on a gate that just shows A and B — and they have no
// idea what the parent's terminals correspond to here.
//
// This file pins the rule: every "drilled-from-parent" spotlight body MUST
// explicitly state the parent ↔ this-level terminal mapping. Tests here
// catch the regression where someone adds a new drill-down without writing
// the mapping copy.

import { describe, it, expect } from 'vitest';
import {
  dffPhaseFor,
  dffSpotlight,
  gatePhaseFor,
  gateSpotlight,
  latchPhaseFor,
  latchSpotlight,
  masterLatchSpotlight,
  nand1Spotlight,
  nand2Spotlight,
  slaveLatchSpotlight,
} from '../../src/levels/descriptions';

describe('cross-level spotlight consistency', () => {
  // The parent-terminal mapping lives in spotlight.parentMap (a visually
  // demoted line below the body) so the body itself can focus on the gate's
  // own function. Rule #17 still holds: the mapping MUST be present.
  it('NAND1 spotlight maps the parent latch terminals (S̄, Q̄, Q) to A/B/Y', () => {
    const map = nand1Spotlight.parentMap ?? '';
    expect(map).toMatch(/A\s*=\s*S̄/);
    expect(map).toMatch(/B\s*=\s*Q̄/);
    expect(map).toMatch(/Y\s*=\s*Q/);
  });

  it('NAND2 spotlight maps the parent latch terminals (R̄, Q, Q̄) to A/B/Y', () => {
    const map = nand2Spotlight.parentMap ?? '';
    expect(map).toMatch(/A\s*=\s*R̄/);
    expect(map).toMatch(/B\s*=\s*Q\b/);
    expect(map).toMatch(/Y\s*=\s*Q̄/);
  });

  it('master latch spotlight names its parent (DFF) and the data it captures (D)', () => {
    expect(masterLatchSpotlight.body).toMatch(/DFF/);
    expect(masterLatchSpotlight.body).toMatch(/\bD\b/);
  });

  it('slave latch spotlight names its parent (DFF) and the clock relationship', () => {
    expect(slaveLatchSpotlight.body).toMatch(/DFF/);
    expect(slaveLatchSpotlight.body).toMatch(/CLK|edge|master/i);
  });
});

describe('phase spotlights are total functions of cycle', () => {
  // Every level's phase function must return a non-empty PhaseSpotlight for
  // every cycle in 0..3. Any null / undefined is a regression.
  it.each([
    ['gate', gatePhaseFor],
    ['latch', latchPhaseFor],
    ['dff', dffPhaseFor],
  ] as const)('%s phase: cycles 0..3 each return a populated PhaseSpotlight', (_name, fn) => {
    for (let c = 0; c < 4; c++) {
      const p = fn(c);
      expect(p.title.length, `cycle ${c} title empty`).toBeGreaterThan(0);
      expect(p.subtitle.length, `cycle ${c} subtitle empty`).toBeGreaterThan(0);
      expect(p.body.length, `cycle ${c} body empty`).toBeGreaterThan(0);
      expect(p.meters.length, `cycle ${c} meters missing`).toBeGreaterThan(0);
      for (const m of p.meters) {
        expect(m.label.length, `cycle ${c} meter label empty`).toBeGreaterThan(0);
        expect(m.value.length, `cycle ${c} meter value empty`).toBeGreaterThan(0);
      }
    }
  });

  it('latch phases include S̄, R̄, Q, Q̄ as meters', () => {
    const labels = new Set(latchPhaseFor(1).meters.map((m) => m.label));
    expect(labels.has('S̄')).toBe(true);
    expect(labels.has('R̄')).toBe(true);
    expect(labels.has('Q')).toBe(true);
    expect(labels.has('Q̄')).toBe(true);
  });

  it('dff phases include CLK, D, M, Q, Q̄ as meters (the DFF state vector)', () => {
    const labels = new Set(dffPhaseFor(1).meters.map((m) => m.label));
    for (const l of ['CLK', 'D', 'M', 'Q', 'Q̄']) {
      expect(labels.has(l), `meter ${l} missing from DFF phase`).toBe(true);
    }
  });

  it('gate phases include A, B, Y as meters (the NAND truth-table vector)', () => {
    const labels = new Set(gatePhaseFor(1).meters.map((m) => m.label));
    for (const l of ['A', 'B', 'Y']) {
      expect(labels.has(l), `meter ${l} missing from gate phase`).toBe(true);
    }
  });
});

describe('default spotlights cover every drillable entry point', () => {
  it('gate has a default spotlight (landing) and per-parent spotlights (NAND1, NAND2)', () => {
    expect(gateSpotlight.title.length).toBeGreaterThan(0);
    expect(nand1Spotlight.title).not.toBe(gateSpotlight.title);
    expect(nand2Spotlight.title).not.toBe(gateSpotlight.title);
  });

  it('latch has a default spotlight and per-parent spotlights (master, slave)', () => {
    expect(latchSpotlight.title.length).toBeGreaterThan(0);
    expect(masterLatchSpotlight.title).not.toBe(latchSpotlight.title);
    expect(slaveLatchSpotlight.title).not.toBe(latchSpotlight.title);
  });

  it('dff has a default spotlight', () => {
    expect(dffSpotlight.title.length).toBeGreaterThan(0);
  });
});
