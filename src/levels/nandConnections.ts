// Per-NAND wire connection points in the SR latch.
//
// Topology (mirrors the gate level's A-left / B-right / Y-right layout):
//   • inputA enters from the LEFT (the latch's S̄ / R̄ direct input)
//   • inputB enters from the RIGHT (cross-coupled feedback from the OTHER NAND)
//   • output exits on the RIGHT (Q for NAND1, Q̄ for NAND2)
//
// Coords match the LevelLatch SVG (600×400 viewBox).

export interface Point2 { x: number; y: number }

export interface NandConnections {
  /** Direct input on the LEFT (S̄ / R̄). */
  inputA: Point2;
  /** Feedback input on the RIGHT (Q̄ / Q from the cross-coupled NAND). */
  inputB: Point2;
  /** Output on the RIGHT. */
  output: Point2;
  /** What parent-level net each terminal is wired to. */
  netA: string;
  netB: string;
  netY: string;
}

// Anchor coordinates derive from GATE_MODULE.projectTerminal so a single
// source of truth (the gate-scene world coords + projection math) drives
// both the latch wire endpoints AND the mini's net labels.
import { GATE_MODULE } from './gateModule';

// Same mini placement LevelLatch uses. MINI_W is DERIVED from
// MINI_H × the gate scene's aspect, so the hover-preview overlays
// identically and any change to the gate's bounds auto-propagates.
const MINI_H = 140;
const MINI_W = MINI_H * (GATE_MODULE.geometry.size.w / GATE_MODULE.geometry.size.h);
const MINI_MARGIN = 1.2;

function projectFor(nandCx: number, nandCy: number) {
  return GATE_MODULE.projectAllTerminals(nandCx, nandCy, MINI_W, MINI_H, MINI_MARGIN);
}

const N1 = projectFor(320, 110);
const N2 = projectFor(320, 290);

export const NAND_CONNECTIONS: Record<'nand-1' | 'nand-2', NandConnections> = {
  // NAND1 — the SET gate. A=S̄ from the latch left edge; B=Q̄ feedback
  // arriving from NAND2 on the RIGHT; Y=Q output (also right).
  'nand-1': {
    inputA: N1.A_input,
    inputB: N1.B_input,
    output: N1.Y_out,
    netA: 'S̄',
    netB: 'Q̄',
    netY: 'Q',
  },
  // NAND2 — the RESET gate. A=R̄ from the latch left edge; B=Q feedback
  // arriving from NAND1 on the RIGHT; Y=Q̄ output (also right).
  'nand-2': {
    inputA: N2.A_input,
    inputB: N2.B_input,
    output: N2.Y_out,
    netA: 'R̄',
    netB: 'Q',
    netY: 'Q̄',
  },
};
