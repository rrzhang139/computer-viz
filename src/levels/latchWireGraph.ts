// Wire graph for the SR latch — REBUILT FROM SCRATCH to match the actual
// LevelLatch view (the user's screenshot of level 2).
//
// External terminals match what's actually drawn at level 2:
//   • S_in  — left top  (S̄ wire enters NAND1's left input)
//   • R_in  — left bottom (R̄ wire enters NAND2's left input)
//   • Q_out — right top  (Q exits NAND1)
//   • QB_out — right bottom (Q̄ exits NAND2)
//   • Vdd_left/right — TOP rail
//   • GND_left/right — BOTTOM rail
//
// There is NO EN terminal — the SR latch level doesn't expose an enable.
// A parent (DFF) creating a D-latch from this uses external gating
// (D, !D, CLK, !CLK NANDs) to produce S̄ and R̄ for the latch's inputs.
//
// World layout (matches the screenshot):
//   y=+3.5  Vdd rail
//   y=+2.0  S_in (NAND1 top input)
//   y=+1.5  NAND1 body center, Q_out
//   y=+1.0  Q̄ feedback into NAND1 bottom input
//   ...
//   y=-1.0  Q feedback into NAND2 top input
//   y=-1.5  NAND2 body center, QB_out
//   y=-2.0  R_in (NAND2 bottom input)
//   y=-3.5  GND rail

import { LOGIC, SUPPLY } from './symbols';

export type Inputs = { sBar: 0 | 1; rBar: 0 | 1; q: 0 | 1; qBar: 0 | 1 };

export type WireNet =
  | typeof SUPPLY.Vdd | typeof SUPPLY.GND
  | typeof LOGIC.Q | typeof LOGIC.Qbar
  | 'S_bar' | 'R_bar';

export const WIRE_NODES = {
  // External — parent connects these
  S_in:      [-6.0,  2.0, 0] as [number, number, number],
  R_in:      [-6.0, -2.0, 0] as [number, number, number],
  Q_out:     [ 6.0,  1.5, 0] as [number, number, number],
  QB_out:    [ 6.0, -1.5, 0] as [number, number, number],
  Vdd_left:  [-6.0,  3.5, 0] as [number, number, number],
  Vdd_right: [ 6.0,  3.5, 0] as [number, number, number],
  GND_left:  [-6.0, -3.5, 0] as [number, number, number],
  GND_right: [ 6.0, -3.5, 0] as [number, number, number],

  // NAND1 (SET gate) terminals (absorbed by symbol body)
  N1_top_in: [-1.25,  2.0, 0] as [number, number, number],   // S̄
  N1_bot_in: [-1.25,  1.0, 0] as [number, number, number],   // Q̄ feedback
  N1_out:    [ 2.5,   1.5, 0] as [number, number, number],   // Q

  // NAND2 (RESET gate) terminals
  N2_top_in: [-1.25, -1.0, 0] as [number, number, number],   // Q feedback
  N2_bot_in: [-1.25, -2.0, 0] as [number, number, number],   // R̄
  N2_out:    [ 2.5,  -1.5, 0] as [number, number, number],   // Q̄

  // Cross-coupled feedback wraparound corners
  Q_branch:    [ 3.5,  1.5, 0] as [number, number, number],  // Q output branch point (right of NAND1)
  Q_wrap:      [ 3.5, -1.0, 0] as [number, number, number],  // Q feedback turn (down then left to NAND2)
  QB_branch:   [ 4.5, -1.5, 0] as [number, number, number],  // Q̄ output branch point
  QB_wrap:     [ 4.5,  1.0, 0] as [number, number, number],  // Q̄ feedback turn (up then left to NAND1)
} as const;

export type WireNodeId = keyof typeof WIRE_NODES;

export interface WireSpec {
  from: WireNodeId;
  to: WireNodeId;
  via?: [number, number, number][];
  net: WireNet;
  flowWhen?: (i: Inputs) => boolean;
}

export const WIRES: readonly WireSpec[] = [
  // Top + bottom rails
  { from: 'Vdd_left', to: 'Vdd_right', net: SUPPLY.Vdd, flowWhen: () => false },
  { from: 'GND_left', to: 'GND_right', net: SUPPLY.GND, flowWhen: () => false },

  // External signal inputs → NAND inputs
  { from: 'S_in', to: 'N1_top_in', net: 'S_bar', flowWhen: (i) => i.sBar === 1 },
  { from: 'R_in', to: 'N2_bot_in', net: 'R_bar', flowWhen: (i) => i.rBar === 1 },

  // NAND outputs → external Q / Q̄ (with intermediate branch point)
  { from: 'N1_out', to: 'Q_out', via: [WIRE_NODES.Q_branch], net: LOGIC.Q, flowWhen: (i) => i.q === 1 },
  { from: 'N2_out', to: 'QB_out', via: [WIRE_NODES.QB_branch], net: LOGIC.Qbar, flowWhen: (i) => i.qBar === 1 },

  // Cross-coupled feedback
  //   Q  (NAND1 output) → NAND2 top input
  { from: 'Q_branch', to: 'N2_top_in', via: [WIRE_NODES.Q_wrap], net: LOGIC.Q, flowWhen: (i) => i.q === 1 },
  //   Q̄ (NAND2 output) → NAND1 bottom input
  { from: 'QB_branch', to: 'N1_bot_in', via: [WIRE_NODES.QB_wrap], net: LOGIC.Qbar, flowWhen: (i) => i.qBar === 1 },
];

export function wirePoints(w: WireSpec): [number, number, number][] {
  return [WIRE_NODES[w.from], ...(w.via ?? []), WIRE_NODES[w.to]];
}

const ALL_POINTS: [number, number][] = [
  ...Object.values(WIRE_NODES).map((p) => [p[0], p[1]] as [number, number]),
  ...WIRES.flatMap((w) => (w.via ?? []).map((p) => [p[0], p[1]] as [number, number])),
];

export const SCENE_BOUNDS = {
  minX: Math.min(...ALL_POINTS.map((p) => p[0])),
  maxX: Math.max(...ALL_POINTS.map((p) => p[0])),
  minY: Math.min(...ALL_POINTS.map((p) => p[1])),
  maxY: Math.max(...ALL_POINTS.map((p) => p[1])),
};
export const SCENE_CENTER = {
  x: (SCENE_BOUNDS.minX + SCENE_BOUNDS.maxX) / 2,
  y: (SCENE_BOUNDS.minY + SCENE_BOUNDS.maxY) / 2,
};
export const SCENE_SIZE = {
  w: SCENE_BOUNDS.maxX - SCENE_BOUNDS.minX,
  h: SCENE_BOUNDS.maxY - SCENE_BOUNDS.minY,
};
export const LATCH_GEOMETRY = {
  bounds: SCENE_BOUNDS,
  center: SCENE_CENTER,
  size: SCENE_SIZE,
};

export const LATCH_EXTERNAL_TERMINALS = [
  'S_in', 'R_in', 'Q_out', 'QB_out',
  'Vdd_left', 'Vdd_right',
  'GND_left', 'GND_right',
] as const;

export const LATCH_ABSORBED_TERMINALS = [
  'N1_top_in', 'N1_bot_in', 'N1_out',
  'N2_top_in', 'N2_bot_in', 'N2_out',
] as const;
