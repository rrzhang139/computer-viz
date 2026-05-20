// Wire graph for the gate (NAND) level.
//
// The model: every wire has a named SOURCE node (`from`) and a named SINK
// node (`to`). The electron pulse always animates from pts[0] to pts[pts.length-1].
// The unit test (`tests/unit/nandWireGraph.test.ts`) asserts that for every
// wire, pts[0] === WIRE_NODES[from] and pts[-1] === WIRE_NODES[to]. So if you
// ever write a wire whose points run opposite to the declared from→to, the
// test fails and the visualization can't ship a backwards-flowing electron.
//
// Conventions for "from → to":
//  - power rails: from the supply tap to the transistor terminal it feeds
//  - Y network: from each PMOS drain (or N_A drain) toward the Y junction,
//    and from the Y junction outward to the output marker / NMOS chain
//  - NMOS pull-down chain: source-of-upper → drain-of-lower (downward)
//  - input wires: from the external input pin to the gate it drives

import { LOGIC, SUPPLY } from './symbols';

export type WireNet = typeof SUPPLY.Vdd | typeof SUPPLY.GND | typeof LOGIC.Y | typeof LOGIC.A | typeof LOGIC.B | 'mid';

export type Inputs = { A: 0 | 1; B: 0 | 1; Y: 0 | 1 };

// Named-node coordinate table. Every WIRES entry references these by key.
// If a node moves, you change it here and every wire end-point follows.
export const WIRE_NODES = {
  // Vdd rail
  Vdd_rail_left:  [-3,    3,    0] as [number, number, number],
  Vdd_rail_right: [ 3,    3,    0] as [number, number, number],
  Vdd_tap_PA:     [-1.6,  3,    0] as [number, number, number],
  Vdd_tap_PB:     [ 1.6,  3,    0] as [number, number, number],

  // PMOS terminals (source = top toward Vdd, drain = bottom toward Y)
  PA_source: [-1.6, 1.85, 0] as [number, number, number],
  PB_source: [ 1.6, 1.85, 0] as [number, number, number],
  PA_drain:  [-1.6, 1.15, 0] as [number, number, number],
  PB_drain:  [ 1.6, 1.15, 0] as [number, number, number],

  // Y bus
  Y_junction: [0,   0.5, 0] as [number, number, number],
  Y_out:      [3.0, 0.5, 0] as [number, number, number],

  // NMOS pull-down chain (top to bottom: N_A drain at Y, then mid, then N_B at GND)
  NA_drain:  [0, -0.25, 0] as [number, number, number],
  NA_source: [0, -0.95, 0] as [number, number, number],
  NB_drain:  [0, -2.05, 0] as [number, number, number],
  NB_source: [0, -2.75, 0] as [number, number, number],
  GND_tap_NB:     [0, -3.5, 0] as [number, number, number],
  GND_rail_left:  [-3, -3.5, 0] as [number, number, number],
  GND_rail_right: [ 3, -3.5, 0] as [number, number, number],

  // A input network — A enters from the LEFT (matches the latch's S̄/R̄
  // entering from the left into NAND1/NAND2).
  A_input:        [-4,    1.5,  0] as [number, number, number],
  PA_gate:        [-2.05, 1.5,  0] as [number, number, number],
  A_tap_to_NMOS:  [-3.2,  1.5,  0] as [number, number, number],
  NA_gate:        [-0.45, -0.6, 0] as [number, number, number],

  // B input network — B enters from the RIGHT. In the latch this is the
  // cross-coupled feedback wire that wraps around from the other NAND's
  // output (Q̄ → NAND1 right input, Q → NAND2 right input).
  B_input:        [ 4,    1.5,  0] as [number, number, number],
  PB_gate:        [ 2.05, 1.5,  0] as [number, number, number],
  B_tap_to_NMOS:  [ 3.2,  1.5,  0] as [number, number, number],
  NB_gate:        [ 0.45, -2.4, 0] as [number, number, number],
} as const;

export type WireNodeId = keyof typeof WIRE_NODES;

export interface WireSpec {
  from: WireNodeId;
  to: WireNodeId;
  // Intermediate corners between from and to. The full path the renderer
  // draws is [WIRE_NODES[from], ...via, WIRE_NODES[to]]. Electron pulse
  // animates along this path in order.
  via?: [number, number, number][];
  net: WireNet;
  flowWhen?: (i: Inputs) => boolean;
}

export const WIRES: readonly WireSpec[] = [
  // -------- Vdd rail + taps --------
  { from: 'Vdd_rail_left', to: 'Vdd_rail_right', net: SUPPLY.Vdd, flowWhen: () => false },
  { from: 'Vdd_tap_PA', to: 'PA_source', net: SUPPLY.Vdd, flowWhen: (i) => i.A === 0 },
  { from: 'Vdd_tap_PB', to: 'PB_source', net: SUPPLY.Vdd, flowWhen: (i) => i.B === 0 },

  // -------- Y network (split: each PMOS drain flows DOWN into Y) --------
  // When P_A conducts (A=0), electrons flow from P_A drain DOWN to Y junction.
  { from: 'PA_drain', to: 'Y_junction', via: [[-1.6, 0.5, 0]], net: LOGIC.Y, flowWhen: (i) => i.A === 0 },
  // When P_B conducts (B=0), electrons flow from P_B drain DOWN to Y junction.
  { from: 'PB_drain', to: 'Y_junction', via: [[1.6, 0.5, 0]], net: LOGIC.Y, flowWhen: (i) => i.B === 0 },
  // Y junction → output marker. Only animates when Y is being actively driven
  // HIGH (Y=1): the pull-up path is charging the downstream load. When Y=0,
  // the output is being discharged through the NMOS chain to GND — there's
  // no current flowing OUT toward the load along this wire, so it stays dead.
  { from: 'Y_junction', to: 'Y_out', net: LOGIC.Y, flowWhen: (i) => i.Y === 1 },
  // When both NMOS are ON, Y is pulled DOWN through the pull-down chain.
  { from: 'Y_junction', to: 'NA_drain', net: LOGIC.Y, flowWhen: (i) => i.A === 1 && i.B === 1 },

  // -------- NMOS pull-down chain --------
  { from: 'NA_source', to: 'NB_drain', net: 'mid', flowWhen: (i) => i.A === 1 && i.B === 1 },
  { from: 'NB_source', to: 'GND_tap_NB', net: SUPPLY.GND, flowWhen: (i) => i.A === 1 && i.B === 1 },

  // -------- GND rail --------
  { from: 'GND_rail_left', to: 'GND_rail_right', net: SUPPLY.GND, flowWhen: () => false },

  // -------- A input network (drives both A-controlled gates) --------
  { from: 'A_input', to: 'PA_gate', net: LOGIC.A, flowWhen: (i) => i.A === 1 },
  { from: 'A_tap_to_NMOS', to: 'NA_gate', via: [[-3.2, -0.6, 0]], net: LOGIC.A, flowWhen: (i) => i.A === 1 },

  // -------- B input network (drives both B-controlled gates) --------
  { from: 'B_input', to: 'PB_gate', net: LOGIC.B, flowWhen: (i) => i.B === 1 },
  { from: 'B_tap_to_NMOS', to: 'NB_gate', via: [[3.2, -2.4, 0]], net: LOGIC.B, flowWhen: (i) => i.B === 1 },
];

// Resolves a WireSpec into the explicit polyline the renderer draws.
export function wirePoints(w: WireSpec): [number, number, number][] {
  return [WIRE_NODES[w.from], ...(w.via ?? []), WIRE_NODES[w.to]];
}

// Tight bounding box of the gate scene in world coords, derived from
// WIRE_NODES + the via-points referenced by WIRES. The renderer uses this
// to auto-fit the camera (full-size and mini), and the mini-view uses it
// to project world endpoints back into parent SVG coords. Anyone adding
// new wire endpoints does not need to update a magic number — the bounds
// re-derive automatically.
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

// `fitParams` computes the uniform world→pixel scale that maps the gate
// scene into a rectangular viewport (canvas or SVG box) with `margin`
// padding on the more-constraining axis. Used by BOTH the r3f camera
// setup and the SVG stub-projection, so the visible gate inside the mini
// canvas always aligns with the SVG-rendered wire stubs around it.
export function fitParams(boxW: number, boxH: number, margin = 1.1) {
  const sceneAspect = SCENE_SIZE.w / SCENE_SIZE.h;
  const boxAspect = boxW / boxH;
  if (boxAspect >= sceneAspect) {
    return { pxPerWorld: boxH / (SCENE_SIZE.h * margin), fitBy: 'height' as const };
  } else {
    return { pxPerWorld: boxW / (SCENE_SIZE.w * margin), fitBy: 'width' as const };
  }
}

// EXTERNAL terminals of the gate level — endpoints that a PARENT level
// (e.g. the SR latch) is responsible for connecting up. Anything in this
// set is permitted to be "loose" inside the gate scene because its outer
// connection comes from a level above. The loose-end detection test
// (`tests/unit/looseEnds.test.ts`) uses this categorization.
export const GATE_EXTERNAL_TERMINALS: readonly WireNodeId[] = [
  'A_input', 'B_input', 'Y_out',
  'Vdd_rail_left', 'Vdd_rail_right',
  'GND_rail_left', 'GND_rail_right',
];

// ABSORBED terminals — endpoints that visually meet a non-wire element
// (transistor body slab). They're not loose because the body covers them
// at the point where the wire ends.
export const GATE_ABSORBED_TERMINALS: readonly WireNodeId[] = [
  'PA_gate', 'PB_gate', 'NA_gate', 'NB_gate',
  'PA_source', 'PB_source', 'NA_source', 'NB_source',
  'PA_drain', 'PB_drain', 'NA_drain', 'NB_drain',
];

// Project a gate-world point into a parent SVG's local coords, given the
// parent's mini box location. Re-exported here so any level embedding the
// gate (latch, future DFF→gate skip-level views, etc.) uses the SAME
// projection math the mini's NandSceneSvg transform uses. Centralizing
// this keeps wire endpoints aligned across the boundary.
export function projectGateWorld(
  worldX: number,
  worldY: number,
  miniCx: number,
  miniCy: number,
  miniW: number,
  miniH: number,
  margin = 1.2,
): { x: number; y: number } {
  const { pxPerWorld } = fitParams(miniW, miniH, margin);
  return {
    x: miniCx + (worldX - SCENE_CENTER.x) * pxPerWorld,
    y: miniCy - (worldY - SCENE_CENTER.y) * pxPerWorld,
  };
}

// Geometry packed for consumption by LevelModule. Anything outside this
// module that needs scene bounds / center / size pulls them from here.
export const GATE_GEOMETRY = {
  bounds: SCENE_BOUNDS,
  center: SCENE_CENTER,
  size: SCENE_SIZE,
};
