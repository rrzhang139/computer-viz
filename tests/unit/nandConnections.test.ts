// Pins NAND_CONNECTIONS — per-NAND wire endpoints in the latch level.
// These must match the LevelLatch SVG geometry so the ConnectedNand
// hover preview literally fits between the actual S̄/R̄/Q/Q̄ wires.

import { describe, it, expect } from 'vitest';
import { NAND_CONNECTIONS } from '../../src/levels/nandConnections';

describe('NAND_CONNECTIONS — per-NAND wire endpoints in the latch', () => {
  it('both NANDs have all three terminals (A, B, Y) defined', () => {
    for (const id of ['nand-1', 'nand-2'] as const) {
      const c = NAND_CONNECTIONS[id];
      expect(c.inputA).toBeDefined();
      expect(c.inputB).toBeDefined();
      expect(c.output).toBeDefined();
      expect(c.netA.length).toBeGreaterThan(0);
      expect(c.netB.length).toBeGreaterThan(0);
      expect(c.netY.length).toBeGreaterThan(0);
    }
  });

  it('inputA (direct S̄/R̄) is on the LEFT of inputB (feedback)', () => {
    // The latch topology mirrors the gate level's A-left / B-right layout.
    // Direct input arrives on the latch's left edge; the feedback wire wraps
    // around from the other NAND's output and enters on the RIGHT.
    for (const id of ['nand-1', 'nand-2'] as const) {
      const c = NAND_CONNECTIONS[id];
      expect(c.inputA.x).toBeLessThan(c.inputB.x);
    }
  });

  it('feedback inputB and output both sit on the RIGHT half of the NAND', () => {
    // They derive from different gate-scene world points (B at x=4,
    // Y at x=3) so their x coords differ — but both are right of the
    // NAND's horizontal centroid (x=320 in latch coords) so the
    // feedback-and-output wires both exit on the right side.
    for (const id of ['nand-1', 'nand-2'] as const) {
      const c = NAND_CONNECTIONS[id];
      const nandCx = 320;
      expect(c.inputB.x, `${id} inputB on right half`).toBeGreaterThan(nandCx);
      expect(c.output.x, `${id} output on right half`).toBeGreaterThan(nandCx);
      expect(c.inputB.y).not.toBe(c.output.y);
    }
  });

  it('NAND1 has the SET role: A=S̄, B=Q̄ (feedback), Y=Q', () => {
    expect(NAND_CONNECTIONS['nand-1'].netA).toBe('S̄');
    expect(NAND_CONNECTIONS['nand-1'].netB).toBe('Q̄');
    expect(NAND_CONNECTIONS['nand-1'].netY).toBe('Q');
  });

  it('NAND2 has the RESET role: A=R̄, B=Q (feedback), Y=Q̄', () => {
    expect(NAND_CONNECTIONS['nand-2'].netA).toBe('R̄');
    expect(NAND_CONNECTIONS['nand-2'].netB).toBe('Q');
    expect(NAND_CONNECTIONS['nand-2'].netY).toBe('Q̄');
  });
});
