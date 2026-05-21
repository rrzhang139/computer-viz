// Strict overlay-alignment check.
//
// CONTRACT
// --------
// When a parent level N+1 embeds a child level N as a mini box at
// (cx, cy, w, h, margin), every one of the child's EXTERNAL terminals
// must land at a deterministic position inside the parent's SVG that
// depends ONLY on:
//
//   (1) the child's terminal world coord (declared in the child's
//       *WireGraph.ts WIRE_NODES);
//   (2) the child's scene geometry (bounds + center + size);
//   (3) the parent's chosen (cx, cy, w, h, margin) placement.
//
// In particular the position MUST be expressible as
//
//     terminal_pixel = mini_upper_left + (Δx, Δy)
//
// where (Δx, Δy) is "the scaled offset of this terminal from the mini's
// upper-left corner". This is the user-facing alignment guarantee:
// when a parent draws a wire toward a child mini, the wire's endpoint
// must equal the child's terminal at that EXACT pixel — so the hover
// preview that swaps the simple symbol for the real child scene
// overlays perfectly with the parent's wires.
//
// THIS TEST
// ---------
// For every parent ↔ child mini boundary in the codebase, the test:
//   1. Enumerates each canonical (cx, cy, w, h, margin) placement;
//   2. For each external terminal of the child, computes the projected
//      pixel position via the child's projectTerminal (the source-of-
//      truth math the parent uses to route its wires);
//   3. ALSO computes the projection via the "offset-from-upper-left"
//      formula directly from world coords + bounds + scale;
//   4. Asserts the two forms agree exactly (no drift between the two
//      ways of expressing the same point);
//   5. Pins the specific numerical position for each canonical
//      (parent, child, terminal) triple so future moves of the child's
//      WORLD coord or the parent's mini placement fail loudly.
//
// Adding a new parent ↔ child boundary: add a new entry to the
// BOUNDARIES list with the canonical placement + per-terminal pinned
// pixel positions. The test runs the same checks uniformly.

import { describe, it, expect } from 'vitest';
import { fitForGeometry, type SceneGeometry } from '../../src/levels/MiniLevelView';
import { GATE_MODULE } from '../../src/levels/gateModule';
import { LATCH_MODULE } from '../../src/levels/latchModule';
import { D_LATCH_MODULE } from '../../src/levels/dLatchModule';
import type { LevelModule } from '../../src/levels/LevelModule';

interface Point2 { x: number; y: number }
interface MiniPlacement {
  cx: number;
  cy: number;
  w: number;
  h: number;
  margin: number;
}

// Re-derive the projected terminal position from world coords using the
// "offset from upper-left" formulation. If this disagrees with the
// LevelModule's center-relative projection, the abstraction is broken.
function projectViaUpperLeft(
  terminalWorld: readonly [number, number],
  placement: MiniPlacement,
  geometry: SceneGeometry,
): Point2 {
  const { pxPerWorld } = fitForGeometry(placement.w, placement.h, geometry, placement.margin);
  const left = placement.cx - placement.w / 2;
  const top = placement.cy - placement.h / 2;
  // Δ from mini upper-left, in pixels:
  //   x: half-width carries the mini's center, then scale × (terminalX - sceneCenterX)
  //   y: half-height + Y-flipped scale × (terminalY - sceneCenterY)
  const dx = placement.w / 2 + (terminalWorld[0] - geometry.center.x) * pxPerWorld;
  const dy = placement.h / 2 - (terminalWorld[1] - geometry.center.y) * pxPerWorld;
  return { x: left + dx, y: top + dy };
}

// Sub-pixel tolerance for floating-point reproducibility between the two
// projection forms. (We're comparing identical math expressed two ways,
// so the only divergence comes from FP rounding; well under 1e-9 in
// practice.)
const FP_EPSILON = 1e-9;

// Tolerance for the per-boundary pinned numerical positions. These are
// absolute values, so we allow 0.01 px of drift to keep the test stable
// when someone tweaks the margin or the bounds peripherally. Anything
// larger than that means a real geometry change and must be reviewed.
const PIN_EPSILON = 0.01;

interface Boundary {
  /** Human-readable boundary name, e.g. "latch / NAND1". */
  label: string;
  /** Child module being embedded. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  child: LevelModule<any, any>;
  /** The mini placement the parent chooses. */
  placement: MiniPlacement;
  /** Pinned expected positions per external terminal (parent SVG coords).
   * If omitted, the boundary is only checked for upper-left/center
   * agreement, not pinned numerically. */
  pinned?: Record<string, Point2>;
}

// =====================================================================
// Canonical parent ↔ child mini placements used by the live components.
// Source of truth: each parent's *.tsx constants. If any of those move,
// this list must be updated to match — and the pinned numbers below
// will need to follow.
// =====================================================================

const BOUNDARIES: Boundary[] = [
  // --- LevelLatch embeds 2 GATE minis (the two NANDs). ---
  // LevelLatch.tsx: NAND1 at (320, 110), NAND2 at (320, 290), 240×140, m=1.2.
  {
    label: 'latch / NAND1',
    child: GATE_MODULE,
    // 200×140 has aspect 10/7 — exactly the gate scene aspect. So the
    // scene fills the mini box edge-to-edge under fit-by-height, with
    // pxPerWorld = 140 / (7 × 1.2) ≈ 16.667.
    placement: { cx: 320, cy: 110, w: 200, h: 140, margin: 1.2 },
    pinned: {
      A_input: { x: 253.33333333333334, y: 85.0 },
      B_input: { x: 386.6666666666667,  y: 85.0 },
      Y_out:   { x: 370.0,              y: 101.66666666666667 },
    },
  },
  {
    label: 'latch / NAND2',
    child: GATE_MODULE,
    placement: { cx: 320, cy: 290, w: 200, h: 140, margin: 1.2 },
    pinned: {
      A_input: { x: 253.33333333333334, y: 265.0 },
      B_input: { x: 386.6666666666667,  y: 265.0 },
      Y_out:   { x: 370.0,              y: 281.6666666666667 },
    },
  },

  // --- LevelDLatch embeds the full D_LATCH (itself) as the base scene at
  // (300, 200, 600, 400, 1.1) -- it's the level's own canvas. The
  // "renderMini" call effectively projects every external terminal of
  // D_LATCH onto the level's own SVG. ---
  {
    label: 'dlatch / full',
    child: D_LATCH_MODULE,
    placement: { cx: 300, cy: 200, w: 600, h: 400, margin: 1.1 },
  },

  // --- LevelDff embeds 2 D_LATCH minis (master + slave). ---
  // LevelDff.tsx: master at (315, 255) sized 130×110; slave at (525, 255) sized 130×110, m=1.2 default.
  {
    label: 'dff / master',
    child: D_LATCH_MODULE,
    placement: { cx: 315, cy: 255, w: 130, h: 110, margin: 1.2 },
  },
  {
    label: 'dff / slave',
    child: D_LATCH_MODULE,
    placement: { cx: 525, cy: 255, w: 130, h: 110, margin: 1.2 },
  },
];

describe('Overlay alignment — parent wire endpoints land on child terminals', () => {
  for (const b of BOUNDARIES) {
    describe(b.label, () => {
      const terminals = b.child.terminalNames;

      it('every external terminal projects to the same point via center-form and upper-left-form', () => {
        for (const t of terminals) {
          const viaCenter = b.child.projectTerminal(
            t as never,
            b.placement.cx, b.placement.cy, b.placement.w, b.placement.h, b.placement.margin,
          );
          const viaUpperLeft = projectViaUpperLeft(
            b.child.externalTerminals[t as keyof typeof b.child.externalTerminals] as readonly [number, number],
            b.placement,
            b.child.geometry,
          );
          expect(
            Math.abs(viaCenter.x - viaUpperLeft.x),
            `${b.label}.${t}: x mismatch center=${viaCenter.x} upperLeft=${viaUpperLeft.x}`,
          ).toBeLessThan(FP_EPSILON);
          expect(
            Math.abs(viaCenter.y - viaUpperLeft.y),
            `${b.label}.${t}: y mismatch center=${viaCenter.y} upperLeft=${viaUpperLeft.y}`,
          ).toBeLessThan(FP_EPSILON);
        }
      });

      it('every external terminal lies inside the mini box footprint', () => {
        const left = b.placement.cx - b.placement.w / 2;
        const top = b.placement.cy - b.placement.h / 2;
        const right = left + b.placement.w;
        const bottom = top + b.placement.h;
        for (const t of terminals) {
          const p = b.child.projectTerminal(
            t as never,
            b.placement.cx, b.placement.cy, b.placement.w, b.placement.h, b.placement.margin,
          );
          expect(p.x, `${b.label}.${t}: x outside [${left}, ${right}]`).toBeGreaterThanOrEqual(left);
          expect(p.x, `${b.label}.${t}: x outside [${left}, ${right}]`).toBeLessThanOrEqual(right);
          expect(p.y, `${b.label}.${t}: y outside [${top}, ${bottom}]`).toBeGreaterThanOrEqual(top);
          expect(p.y, `${b.label}.${t}: y outside [${top}, ${bottom}]`).toBeLessThanOrEqual(bottom);
        }
      });

      if (b.pinned) {
        it('pinned terminal positions match (canonical placement is stable)', () => {
          for (const [name, expected] of Object.entries(b.pinned!)) {
            const actual = b.child.projectTerminal(
              name as never,
              b.placement.cx, b.placement.cy, b.placement.w, b.placement.h, b.placement.margin,
            );
            expect(
              Math.abs(actual.x - expected.x),
              `${b.label}.${name}: x expected=${expected.x} actual=${actual.x}`,
            ).toBeLessThan(PIN_EPSILON);
            expect(
              Math.abs(actual.y - expected.y),
              `${b.label}.${name}: y expected=${expected.y} actual=${actual.y}`,
            ).toBeLessThan(PIN_EPSILON);
          }
        });
      }

      it('placement scales linearly with mini size (corollary: hover-preview overlay is exact)', () => {
        // If we double the mini's footprint about the same center, every
        // terminal's offset from the upper-left corner must also double.
        // This is the property that makes the "overlay the preview on
        // the parent's wires" trick work: scaling the mini box rescales
        // every terminal's pixel-offset by the same factor.
        const halfPlacement = {
          ...b.placement,
          w: b.placement.w / 2,
          h: b.placement.h / 2,
        };
        for (const t of terminals) {
          const full = b.child.projectTerminal(
            t as never,
            b.placement.cx, b.placement.cy, b.placement.w, b.placement.h, b.placement.margin,
          );
          const half = b.child.projectTerminal(
            t as never,
            halfPlacement.cx, halfPlacement.cy, halfPlacement.w, halfPlacement.h, halfPlacement.margin,
          );
          // Offset from upper-left scales by exactly 0.5.
          const fullDx = full.x - (b.placement.cx - b.placement.w / 2);
          const fullDy = full.y - (b.placement.cy - b.placement.h / 2);
          const halfDx = half.x - (halfPlacement.cx - halfPlacement.w / 2);
          const halfDy = half.y - (halfPlacement.cy - halfPlacement.h / 2);
          expect(
            Math.abs(halfDx * 2 - fullDx),
            `${b.label}.${t}: dx didn't scale 2× (full=${fullDx} half×2=${halfDx * 2})`,
          ).toBeLessThan(FP_EPSILON);
          expect(
            Math.abs(halfDy * 2 - fullDy),
            `${b.label}.${t}: dy didn't scale 2× (full=${fullDy} half×2=${halfDy * 2})`,
          ).toBeLessThan(FP_EPSILON);
        }
      });
    });
  }
});

// =====================================================================
// Cross-check: latch's wire endpoints to its embedded NANDs use the
// EXACT projected positions from GATE_MODULE.projectTerminal. This is
// the "parent wire endpoint must equal child terminal projection"
// invariant for the latch ↔ NAND boundary.
//
// LevelLatch.tsx imports GATE_MODULE.projectAllTerminals and uses the
// resulting N1/N2 objects directly as wire endpoints. Re-deriving the
// same values here and asserting they're stable pins the contract: if
// anyone changes GATE_MODULE's terminal world coords or the latch's
// mini placement, this test fails and forces the pinned numbers in
// BOUNDARIES above to be updated in lock-step.
// =====================================================================
describe('Latch ↔ NAND mini: parent wire endpoint = child terminal projection', () => {
  const MINI_W = 200;
  const MINI_H = 140;
  const MINI_MARGIN = 1.2;
  const NAND1 = { cx: 320, cy: 110 };
  const NAND2 = { cx: 320, cy: 290 };

  it('NAND1.A_input is the S̄ wire endpoint', () => {
    const projected = GATE_MODULE.projectTerminal('A_input', NAND1.cx, NAND1.cy, MINI_W, MINI_H, MINI_MARGIN);
    // S̄ enters NAND1 from the LEFT, so terminal x must be left of mini center.
    expect(projected.x).toBeLessThan(NAND1.cx);
    // Top NAND, so y is at NAND1's input row.
    expect(Math.abs(projected.y - 85.0)).toBeLessThan(0.05);
  });

  it('NAND2.A_input is the R̄ wire endpoint', () => {
    const projected = GATE_MODULE.projectTerminal('A_input', NAND2.cx, NAND2.cy, MINI_W, MINI_H, MINI_MARGIN);
    expect(projected.x).toBeLessThan(NAND2.cx);
    expect(Math.abs(projected.y - 265.0)).toBeLessThan(0.05);
  });

  it('Y_out is on the RIGHT half of each NAND (output exits right)', () => {
    for (const place of [NAND1, NAND2]) {
      const y = GATE_MODULE.projectTerminal('Y_out', place.cx, place.cy, MINI_W, MINI_H, MINI_MARGIN);
      expect(y.x, `Y_out at NAND@${place.cx},${place.cy}`).toBeGreaterThan(place.cx);
    }
  });

  it('B_input is on the RIGHT half (feedback enters from right)', () => {
    for (const place of [NAND1, NAND2]) {
      const b = GATE_MODULE.projectTerminal('B_input', place.cx, place.cy, MINI_W, MINI_H, MINI_MARGIN);
      expect(b.x, `B_input at NAND@${place.cx},${place.cy}`).toBeGreaterThan(place.cx);
    }
  });

  it('the two NANDs have identical x positions for matching terminals (only y differs)', () => {
    // Cross-coupled symmetry: NAND2 is a vertical mirror of NAND1 about
    // the latch's horizontal centerline. Every terminal's x must match.
    for (const name of ['A_input', 'B_input', 'Y_out', 'Vdd_rail_left', 'GND_rail_right'] as const) {
      const a = GATE_MODULE.projectTerminal(name, NAND1.cx, NAND1.cy, MINI_W, MINI_H, MINI_MARGIN);
      const b = GATE_MODULE.projectTerminal(name, NAND2.cx, NAND2.cy, MINI_W, MINI_H, MINI_MARGIN);
      expect(Math.abs(a.x - b.x), `${name}: x differs between NAND1 and NAND2`).toBeLessThan(1e-9);
    }
  });
});

// =====================================================================
// Cross-check: NAND_CONNECTIONS (used by ConnectedNand hover preview)
// is derived from the SAME GATE_MODULE.projectAllTerminals call the
// latch uses for its wire endpoints. This makes the hover preview
// overlay land EXACTLY on the parent's wire endpoints — the central
// "previews overlay perfectly" property the user is asking us to lock.
// =====================================================================
describe('NAND_CONNECTIONS in latch is a strict projection of GATE_MODULE terminals', () => {
  it('matches GATE_MODULE.projectAllTerminals at the latch\'s canonical placement', async () => {
    const { NAND_CONNECTIONS } = await import('../../src/levels/nandConnections');
    const MINI_W = 240;
    const MINI_H = 140;
    const MINI_MARGIN = 1.2;
    const placements = {
      'nand-1': { cx: 320, cy: 110 },
      'nand-2': { cx: 320, cy: 290 },
    } as const;
    for (const [id, place] of Object.entries(placements) as ['nand-1' | 'nand-2', { cx: number; cy: number }][]) {
      const proj = GATE_MODULE.projectAllTerminals(place.cx, place.cy, 200, 140, MINI_MARGIN);
      const conn = NAND_CONNECTIONS[id];
      expect(conn.inputA.x).toBe(proj.A_input.x);
      expect(conn.inputA.y).toBe(proj.A_input.y);
      expect(conn.inputB.x).toBe(proj.B_input.x);
      expect(conn.inputB.y).toBe(proj.B_input.y);
      expect(conn.output.x).toBe(proj.Y_out.x);
      expect(conn.output.y).toBe(proj.Y_out.y);
    }
  });
});

// =====================================================================
// Cross-check: LATCH_MODULE projection of its external terminals
// (S_in, R_in, Q_out, QB_out, Vdd_*, GND_*) into the DFF's master and
// slave placements. The DFF wires terminating at each latch's
// D_in/EN_in/Q_out/QB_out use the SAME projection, so any drift here
// would visually disconnect the DFF wires from the latch mini boundary.
// =====================================================================
describe('DFF ↔ D_LATCH mini: parent wire endpoint = child terminal projection', () => {
  const MASTER = { cx: 315, cy: 255, w: 130, h: 110, margin: 1.2 };
  const SLAVE = { cx: 525, cy: 255, w: 130, h: 110, margin: 1.2 };

  it('D_in is on the LEFT edge of each D-latch mini', () => {
    for (const place of [MASTER, SLAVE]) {
      const d = D_LATCH_MODULE.projectTerminal('D_in', place.cx, place.cy, place.w, place.h, place.margin);
      expect(d.x).toBeLessThan(place.cx);
    }
  });

  it('Q_out and QB_out are on the RIGHT edge', () => {
    for (const place of [MASTER, SLAVE]) {
      const q = D_LATCH_MODULE.projectTerminal('Q_out', place.cx, place.cy, place.w, place.h, place.margin);
      const qb = D_LATCH_MODULE.projectTerminal('QB_out', place.cx, place.cy, place.w, place.h, place.margin);
      expect(q.x).toBeGreaterThan(place.cx);
      expect(qb.x).toBeGreaterThan(place.cx);
    }
  });

  it('EN_in is on the TOP edge (control signal convention)', () => {
    for (const place of [MASTER, SLAVE]) {
      const en = D_LATCH_MODULE.projectTerminal('EN_in', place.cx, place.cy, place.w, place.h, place.margin);
      expect(en.y).toBeLessThan(place.cy);
    }
  });

  it('master and slave share x-offsets (only the mini-center x differs)', () => {
    for (const name of ['D_in', 'EN_in', 'Q_out', 'QB_out', 'Vdd_left', 'GND_right'] as const) {
      const m = D_LATCH_MODULE.projectTerminal(name, MASTER.cx, MASTER.cy, MASTER.w, MASTER.h, MASTER.margin);
      const s = D_LATCH_MODULE.projectTerminal(name, SLAVE.cx, SLAVE.cy, SLAVE.w, SLAVE.h, SLAVE.margin);
      const dxMaster = m.x - MASTER.cx;
      const dxSlave = s.x - SLAVE.cx;
      expect(Math.abs(dxMaster - dxSlave), `${name}: x-offset differs between master and slave`).toBeLessThan(1e-9);
      expect(Math.abs(m.y - s.y), `${name}: y differs between master and slave`).toBeLessThan(1e-9);
    }
  });
});
