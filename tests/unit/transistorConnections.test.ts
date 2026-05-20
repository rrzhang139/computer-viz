// Pins TRANSISTOR_CONNECTIONS — the per-role wire endpoints used by the
// hover preview. These MUST match the WIRES geometry in LevelGate.tsx so
// the rendered transistor literally fits between the actual wires (source
// slab on the Vdd/GND/mid stub, drain slab on the Y/mid stub, gate strip
// on the A/B wire endpoint).

import { describe, it, expect } from 'vitest';
import {
  TRANSISTOR_CONNECTIONS,
  gateApproachSide,
} from '../../src/levels/transistorConnections';
import { TRANSISTOR_ROLE } from '../../src/levels/symbols';

describe('TRANSISTOR_CONNECTIONS — wire endpoints per role', () => {
  it('every role has source / drain / gate points', () => {
    for (const role of Object.values(TRANSISTOR_ROLE)) {
      const c = TRANSISTOR_CONNECTIONS[role];
      expect(c, `missing connections for ${role}`).toBeDefined();
      expect(c.source).toHaveLength(3);
      expect(c.drain).toHaveLength(3);
      expect(c.gate).toHaveLength(3);
    }
  });

  it('source ≠ drain (they would short the channel)', () => {
    for (const role of Object.values(TRANSISTOR_ROLE)) {
      const c = TRANSISTOR_CONNECTIONS[role];
      expect(c.source).not.toEqual(c.drain);
    }
  });

  it('PMOS pull-ups: source above drain (source toward Vdd at top)', () => {
    for (const role of [TRANSISTOR_ROLE.P_A, TRANSISTOR_ROLE.P_B]) {
      const c = TRANSISTOR_CONNECTIONS[role];
      expect(c.source[1], `${role} source y should be > drain y`).toBeGreaterThan(c.drain[1]);
    }
  });

  it('NMOS pull-downs: source below drain (source toward GND/mid at bottom)', () => {
    for (const role of [TRANSISTOR_ROLE.N_A, TRANSISTOR_ROLE.N_B]) {
      const c = TRANSISTOR_CONNECTIONS[role];
      expect(c.source[1], `${role} source y should be < drain y`).toBeLessThan(c.drain[1]);
    }
  });

  it('gate point sits aligned with the body midpoint (not at source or drain)', () => {
    for (const role of Object.values(TRANSISTOR_ROLE)) {
      const c = TRANSISTOR_CONNECTIONS[role];
      const midY = (c.source[1] + c.drain[1]) / 2;
      // Gate y should be near body midpoint (within the body span).
      expect(Math.abs(c.gate[1] - midY)).toBeLessThan(Math.abs(c.source[1] - c.drain[1]));
    }
  });

  it('gateApproachSide: A-side gate enters from LEFT, B-side from RIGHT', () => {
    expect(gateApproachSide(TRANSISTOR_ROLE.P_A)).toBe('left');
    expect(gateApproachSide(TRANSISTOR_ROLE.N_A)).toBe('left');
    expect(gateApproachSide(TRANSISTOR_ROLE.P_B)).toBe('right');
    expect(gateApproachSide(TRANSISTOR_ROLE.N_B)).toBe('right');
  });

  it('PMOS source endpoints touch the Vdd-stub bottom (y=1.85 in current diagram)', () => {
    expect(TRANSISTOR_CONNECTIONS[TRANSISTOR_ROLE.P_A].source[1]).toBeCloseTo(1.85);
    expect(TRANSISTOR_CONNECTIONS[TRANSISTOR_ROLE.P_B].source[1]).toBeCloseTo(1.85);
  });

  it('N_B source endpoint is the GND-stub top (y=-2.75 in current diagram)', () => {
    expect(TRANSISTOR_CONNECTIONS[TRANSISTOR_ROLE.N_B].source[1]).toBeCloseTo(-2.75);
  });
});
