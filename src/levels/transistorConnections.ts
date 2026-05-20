// Per-transistor wire connection points in the parent NAND-gate diagram.
//
// Each transistor has THREE wires meeting it: a source-side stub, a drain-
// side stub, and a gate input. The hover preview renders the transistor
// literally fitted between these points so the user SEES the Vdd wire
// touching the source, the A/B wire touching the gate, etc. — not as an
// overlay, but as the transistor itself.
//
// The values here mirror the WIRES geometry in LevelGate.tsx (single
// source of truth for the actual diagram). If a wire endpoint moves there,
// the matching value here moves too — pinned by tests/unit.

import { TRANSISTOR_ROLE, type TransistorRole } from './symbols';

export type Point3 = readonly [number, number, number];

export interface TransistorConnections {
  source: Point3;
  drain: Point3;
  gate: Point3;
}

export const TRANSISTOR_CONNECTIONS: Record<TransistorRole, TransistorConnections> = {
  // P_A — top-left PMOS. Source stubs up to Vdd rail, drain down to Y line,
  // gate fed by the A wire entering from the left edge of the diagram.
  [TRANSISTOR_ROLE.P_A]: {
    source: [-1.6, 1.85, 0],
    drain:  [-1.6, 1.15, 0],
    gate:   [-2.05, 1.5, 0],
  },
  // P_B — top-right PMOS. Mirror of P_A; gate from the right side (B wire).
  [TRANSISTOR_ROLE.P_B]: {
    source: [1.6, 1.85, 0],
    drain:  [1.6, 1.15, 0],
    gate:   [2.05, 1.5, 0],
  },
  // N_A — top of the pull-down chain. Drain at Y line, source at mid net.
  // Gate from A wire (entered on the left and routed across the bottom).
  [TRANSISTOR_ROLE.N_A]: {
    source: [0, -0.95, 0],
    drain:  [0, -0.25, 0],
    gate:   [-0.45, -0.6, 0],
  },
  // N_B — bottom of the pull-down chain. Drain at mid, source at GND.
  // Gate from B wire (entered on the right and routed across the bottom).
  [TRANSISTOR_ROLE.N_B]: {
    source: [0, -2.75, 0],
    drain:  [0, -2.05, 0],
    gate:   [0.45, -2.4, 0],
  },
};

// Whether the gate wire approaches from the left or right of the body.
// Useful for picking which way the polysilicon strip extends.
export function gateApproachSide(role: TransistorRole): 'left' | 'right' {
  const c = TRANSISTOR_CONNECTIONS[role];
  return c.gate[0] < c.source[0] ? 'left' : 'right';
}
