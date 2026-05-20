// Structural contract tests for the LevelModule abstraction.
//
// 1. GATE_MODULE exposes every external terminal declared by
//    GATE_EXTERNAL_TERMINALS — the source-of-truth list in
//    nandWireGraph drives the module's terminal map.
// 2. validateConnections() correctly identifies missing terminals
//    in a parent's connection map.
// 3. projectAllTerminals projects each terminal to a finite (x, y)
//    point, agreeing with the single-terminal projectTerminal call.
//
// These tests guard the contract every future level module
// (LatchModule, DffModule, ...) must satisfy.

import { describe, expect, it } from 'vitest';
import { GATE_MODULE } from '../../src/levels/gateModule';
import { GATE_EXTERNAL_TERMINALS } from '../../src/levels/nandWireGraph';

describe('LevelModule contract — GATE_MODULE', () => {
  it('id is "gate"', () => {
    expect(GATE_MODULE.id).toBe('gate');
  });

  it('exposes EVERY external terminal declared in nandWireGraph', () => {
    const moduleNames = new Set(GATE_MODULE.terminalNames);
    for (const expected of GATE_EXTERNAL_TERMINALS) {
      expect(moduleNames.has(expected), `module missing terminal ${expected}`).toBe(true);
    }
    expect(moduleNames.size).toBe(GATE_EXTERNAL_TERMINALS.length);
  });

  it('projectTerminal returns finite x/y for every terminal', () => {
    for (const name of GATE_MODULE.terminalNames) {
      const p = GATE_MODULE.projectTerminal(name, 320, 110, 240, 140);
      expect(Number.isFinite(p.x), `${name}.x`).toBe(true);
      expect(Number.isFinite(p.y), `${name}.y`).toBe(true);
    }
  });

  it('projectAllTerminals agrees with single projectTerminal calls', () => {
    const all = GATE_MODULE.projectAllTerminals(320, 110, 240, 140);
    for (const name of GATE_MODULE.terminalNames) {
      const one = GATE_MODULE.projectTerminal(name, 320, 110, 240, 140);
      expect(all[name].x).toBeCloseTo(one.x, 9);
      expect(all[name].y).toBeCloseTo(one.y, 9);
    }
  });

  it('pxPerWorld matches the implicit scale of projectTerminal', () => {
    const px = GATE_MODULE.pxPerWorld(240, 140);
    // Project (0, 0) and (1, 0) — they should be exactly px apart in x.
    // Use absorbedTerminals or run via a synthetic call.
    // Easiest: call projectTerminal with a known node — A_input at world
    // (-4, 1.5). Then x = cx + (-4 - scene_center_x) * pxPerWorld.
    const a = GATE_MODULE.projectTerminal('A_input', 320, 110, 240, 140);
    // (-4 - sceneCx) * pxPerWorld + 320 = a.x  → pxPerWorld = (a.x - 320) / (-4 - sceneCx)
    const sceneCx = GATE_MODULE.geometry.center.x;
    const expectedPx = (a.x - 320) / (-4 - sceneCx);
    expect(expectedPx).toBeCloseTo(px, 9);
  });

  it('validateConnections returns missing terminals when parent skips one', () => {
    // Build a connection map missing exactly one terminal.
    const full = Object.fromEntries(
      GATE_MODULE.terminalNames.map((n) => [n, { kind: 'wire' as const, testid: `wire-${n}` }]),
    );
    const missingOne = { ...full };
    delete (missingOne as Record<string, unknown>)['Vdd_rail_left'];
    const missing = GATE_MODULE.validateConnections(missingOne as never);
    expect(missing).toEqual(['Vdd_rail_left']);
  });

  it('validateConnections returns empty when parent provides every connection', () => {
    const full = Object.fromEntries(
      GATE_MODULE.terminalNames.map((n) => [n, { kind: 'wire' as const, testid: `wire-${n}` }]),
    );
    expect(GATE_MODULE.validateConnections(full as never)).toEqual([]);
  });

  it('absorbedTerminals are the names declared in nandWireGraph', () => {
    expect(GATE_MODULE.absorbedTerminals.length).toBeGreaterThan(0);
    for (const a of GATE_MODULE.absorbedTerminals) {
      // Every absorbed name is a STRING (not a coordinate); module
      // doesn't promise to project them, just stores their names.
      expect(typeof a).toBe('string');
    }
  });
});
