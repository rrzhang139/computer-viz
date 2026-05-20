// UI tokens — the SINGLE SOURCE OF TRUTH for visual styling shared across
// every level (transistor / gate / latch / d-latch / dff). Anything
// referenced as a number literal in level rendering belongs here. Goal:
// when the user says "make all electrons the same size" you change ONE
// constant and the whole stack updates.
//
// Two coordinate systems:
//   • OUTER (parent SVG, pixel units): rails, pillars, wires that the
//     LEVEL component draws around the scene. Use the OUTER_* tokens.
//   • INNER (scene world units, projected): wires, NAND outlines, etc.
//     drawn INSIDE a *SceneSvg component. Use the INNER_* tokens.

import { parchment } from './parchment';

export const UI = {
  // ─── Net colors ────────────────────────────────────────────────────
  NET_HIGH: parchment.gateOn,
  NET_LOW: '#5c4438',
  RAIL_VDD: parchment.gateOn,
  RAIL_GND: parchment.ink,
  PULSE: parchment.electronGlow,

  // ─── Wire stroke widths ────────────────────────────────────────────
  /** Top-level SVG wires (in parent SVG pixels). */
  OUTER_WIRE: 2.5,
  /** Vertical Vdd/GND pillars (in parent SVG pixels). */
  OUTER_PILLAR: 3,
  /** In-scene wires (world coords; ~2-3 SVG px after projection). */
  INNER_WIRE: 0.08,
  /** NAND-symbol body outlines (world units). */
  INNER_BODY: 0.04,

  // ─── Electron pulses ───────────────────────────────────────────────
  /** Radius in world units; matches the wire-stroke world scale. */
  INNER_PULSE_R: 0.13,
  /** Animation period for the moving electron dot. */
  PULSE_DUR: '1.4s',

  // ─── I/O pin (circle-around-label) ─────────────────────────────────
  PIN_RADIUS: 14,
  PIN_STROKE: 2,
  PIN_LABEL_SIZE: 13,
  PIN_VALUE_SIZE: 11,

  // ─── Pin dots (T-junctions, rail/pillar connections) ───────────────
  PIN_DOT_R: 3,
} as const;
