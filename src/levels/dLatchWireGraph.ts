// Wire graph for the D latch — the 4-NAND circuit a parent DFF embeds.
//
// Structure (matches the reference textbook D latch):
//   D ─┬───────► NAND_S ┐
//      │        ▲       │
//      │       EN      S̄ ─► [SR latch core] ─► Q
//      │        │       │   (2 cross-coupled
//      │        ▼       │    NANDs internally)
//      └►[NOT]► NAND_R ┘
//               ▲          R̄ ─► ...        ─► Q̄
//              EN
//
//   When EN=1: S̄ = !D, R̄ = D → latch follows D
//   When EN=0: S̄ = R̄ = 1   → latch HOLDS
//
// External terminals (what a PARENT — e.g. DFF — connects):
//   • D_in  — data input (left middle)
//   • EN_in — enable input (top middle; dropped down from parent)
//   • Q_out, QB_out — outputs (right)
//   • Vdd_left/right, GND_left/right — supply rails (top/bottom)

import { LOGIC, SUPPLY } from './symbols';

export type Inputs = { d: 0 | 1; en: 0 | 1; q: 0 | 1; qBar: 0 | 1 };

export type WireNet =
  | typeof SUPPLY.Vdd | typeof SUPPLY.GND
  | typeof LOGIC.D | typeof LOGIC.EN | typeof LOGIC.Q | typeof LOGIC.Qbar
  | 'D_bar' | 'S_bar' | 'R_bar';

export const WIRE_NODES = {
  // External
  D_in:       [-6.0,  0.0, 0] as [number, number, number],
  EN_in:      [-1.5,  3.5, 0] as [number, number, number],
  Q_out:      [ 6.0,  1.5, 0] as [number, number, number],
  QB_out:     [ 6.0, -1.5, 0] as [number, number, number],
  Vdd_left:   [-6.0,  4.0, 0] as [number, number, number],
  Vdd_right:  [ 6.0,  4.0, 0] as [number, number, number],
  GND_left:   [-6.0, -4.0, 0] as [number, number, number],
  GND_right:  [ 6.0, -4.0, 0] as [number, number, number],

  // D inverter (produces !D for the bottom gating NAND)
  inv_in:    [-5.0,  0.0, 0] as [number, number, number],
  inv_out:   [-4.0,  0.0, 0] as [number, number, number],

  // Gating NAND_S (top-left): inputs (D, EN), output S̄
  GS_in_top:  [-3.5,  1.2, 0] as [number, number, number],   // EN drops in here
  GS_in_bot:  [-3.5,  0.8, 0] as [number, number, number],   // D enters here
  GS_out:     [-1.5,  1.0, 0] as [number, number, number],

  // Gating NAND_R (bottom-left): inputs (!D, EN), output R̄
  GR_in_top:  [-3.5, -0.8, 0] as [number, number, number],   // !D enters here
  GR_in_bot:  [-3.5, -1.2, 0] as [number, number, number],   // EN drops in here
  GR_out:     [-1.5, -1.0, 0] as [number, number, number],

  // SR-core NAND1 (top-right, the SET gate)
  N1_top_in:  [ 1.0,  1.8, 0] as [number, number, number],   // S̄ enters here
  N1_bot_in:  [ 1.0,  1.2, 0] as [number, number, number],   // Q̄ feedback
  N1_out:     [ 3.5,  1.5, 0] as [number, number, number],   // Q

  // SR-core NAND2 (bottom-right, the RESET gate)
  N2_top_in:  [ 1.0, -1.2, 0] as [number, number, number],   // Q feedback
  N2_bot_in:  [ 1.0, -1.8, 0] as [number, number, number],   // R̄
  N2_out:     [ 3.5, -1.5, 0] as [number, number, number],   // Q̄

  // EN bus tap points — EN line runs horizontally at y=3.0 then taps
  // down to each gating NAND.
  EN_tap_S:   [-3.5,  3.0, 0] as [number, number, number],
  EN_tap_R:   [-3.5,  3.0, 0] as [number, number, number],  // same corner; visually one drop

  // Cross-coupled wraparound corners
  Q_branch:   [ 4.3,  1.5, 0] as [number, number, number],
  Q_wrap:     [ 4.3, -1.2, 0] as [number, number, number],
  QB_branch:  [ 5.0, -1.5, 0] as [number, number, number],
  QB_wrap:    [ 5.0,  1.2, 0] as [number, number, number],
} as const;

export type WireNodeId = keyof typeof WIRE_NODES;

export interface WireSpec {
  from: WireNodeId;
  to: WireNodeId;
  via?: [number, number, number][];
  net: WireNet;
  flowWhen?: (i: Inputs) => boolean;
}

const isEnActiveSignal = (i: Inputs) => i.en === 1;

export const WIRES: readonly WireSpec[] = [
  // Power rails
  { from: 'Vdd_left', to: 'Vdd_right', net: SUPPLY.Vdd, flowWhen: () => false },
  { from: 'GND_left', to: 'GND_right', net: SUPPLY.GND, flowWhen: () => false },

  // D distribution
  { from: 'D_in', to: 'GS_in_bot', via: [[-5.5, 0, 0], [-5.5, 0.8, 0]], net: LOGIC.D, flowWhen: (i) => i.d === 1 },
  { from: 'D_in', to: 'inv_in', net: LOGIC.D, flowWhen: (i) => i.d === 1 },
  { from: 'inv_out', to: 'GR_in_top', via: [[-3.8, 0, 0], [-3.8, -0.8, 0]], net: 'D_bar', flowWhen: (i) => i.d === 0 },

  // EN distribution: EN_in at top → drops down to a horizontal bus at y=3.0
  // then taps down to each gating NAND.
  { from: 'EN_in', to: 'EN_tap_S', via: [[-1.5, 3.0, 0]], net: LOGIC.EN, flowWhen: isEnActiveSignal },
  { from: 'EN_tap_S', to: 'GS_in_top', net: LOGIC.EN, flowWhen: isEnActiveSignal },
  { from: 'EN_tap_R', to: 'GR_in_bot', net: LOGIC.EN, flowWhen: isEnActiveSignal },

  // Gating outputs → SR core inputs
  //   S̄ = NAND(D, EN): low when D=1 AND EN=1
  //   R̄ = NAND(!D, EN): low when D=0 AND EN=1
  { from: 'GS_out', to: 'N1_top_in', via: [[-0.5, 1.0, 0], [-0.5, 1.8, 0]], net: 'S_bar', flowWhen: (i) => !(i.d === 1 && i.en === 1) },
  { from: 'GR_out', to: 'N2_bot_in', via: [[-0.5, -1.0, 0], [-0.5, -1.8, 0]], net: 'R_bar', flowWhen: (i) => !(i.d === 0 && i.en === 1) },

  // SR-core outputs to external Q / Q̄
  { from: 'N1_out', to: 'Q_out', via: [WIRE_NODES.Q_branch], net: LOGIC.Q, flowWhen: (i) => i.q === 1 },
  { from: 'N2_out', to: 'QB_out', via: [WIRE_NODES.QB_branch], net: LOGIC.Qbar, flowWhen: (i) => i.qBar === 1 },

  // Cross-coupled feedback
  { from: 'Q_branch', to: 'N2_top_in', via: [WIRE_NODES.Q_wrap], net: LOGIC.Q, flowWhen: (i) => i.q === 1 },
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
export const DLATCH_GEOMETRY = {
  bounds: SCENE_BOUNDS,
  center: SCENE_CENTER,
  size: SCENE_SIZE,
};

export const DLATCH_EXTERNAL_TERMINALS = [
  'D_in', 'EN_in', 'Q_out', 'QB_out',
  'Vdd_left', 'Vdd_right',
  'GND_left', 'GND_right',
] as const;

export const DLATCH_ABSORBED_TERMINALS = [
  'inv_in', 'inv_out',
  'GS_in_top', 'GS_in_bot', 'GS_out',
  'GR_in_top', 'GR_in_bot', 'GR_out',
  'N1_top_in', 'N1_bot_in', 'N1_out',
  'N2_top_in', 'N2_bot_in', 'N2_out',
] as const;
