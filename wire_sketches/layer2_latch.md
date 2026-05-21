# Layer 2 — SR latch (NAND-based, active-LOW)

Two cross-coupled NAND gates. The output of each is wired back to one
input of the other. That feedback loop is what creates MEMORY: the
circuit has two stable states (Q=0,Q̄=1 and Q=1,Q̄=0). S̄ pulses to 0 set
Q=1; R̄ pulses to 0 reset Q=0; both at 1 = HOLD.

## Scene bounds
x ∈ [-6.0, 6.0], y ∈ [-3.5, 3.5]

(source: `SCENE_BOUNDS` derived in `src/levels/latchWireGraph.ts`.)

## External terminals

| key    | role         | (x, y)        | edge   |
|--------|--------------|---------------|--------|
| S_in   | data in (S̄) | (-6.0,  2.0)  | LEFT   |
| R_in   | data in (R̄) | (-6.0, -2.0)  | LEFT   |
| Q_out  | data out (Q) | ( 6.0,  1.5)  | RIGHT  |
| QB_out | data out (Q̄)| ( 6.0, -1.5)  | RIGHT  |
| Vdd    | supply (+V)  | ( 0.0,  3.5)  | TOP    |
| GND    | supply (0V)  | ( 0.0, -3.5)  | BOTTOM |

## Internal supply distribution

The Vdd rail runs at y=+3.5 from `Vdd_left` (-6, 3.5) to `Vdd_right`
(6, 3.5). The GND rail at y=-3.5 from `GND_left` (-6, -3.5) to
`GND_right` (6, -3.5). The parent's Vdd attaches to this layer's TOP
edge; GND to the BOTTOM.

Each embedded NAND mini (N1 in the top half, N2 in the bottom half) has
its OWN top-edge `Vdd` and bottom-edge `GND` terminals (inherited from
layer 1). The latch must route Vdd and GND into both NANDs *without
crossing the other NAND's body*, since N1 sits between N2 and the Vdd
rail (and similarly N2 sits between N1 and GND).

The routing pattern (matches `LevelLatch.tsx` lines 95-144):

- A vertical Vdd bus on the LEFT EDGE of the latch (x=-6 in world coords)
  connects the top Vdd rail to a horizontal stub at *each* NAND's projected
  Vdd-y. The bus runs outside all child bodies, so no wire crosses any
  NAND mini.
- A mirrored vertical GND bus on the RIGHT EDGE (x=+6) does the same for
  GND, with horizontal stubs at each NAND's projected GND-y.
- Topological contract: parent.Vdd → N1.Vdd AND parent.Vdd → N2.Vdd;
  parent.GND → N1.GND AND parent.GND → N2.GND. Physical path is L-shaped
  (down the side, then in along the rail-y) rather than straight-vertical.

## Embedded children

Two NAND minis (layer 1). Each NAND mini follows the gate convention:
**A on the LEFT, B on the RIGHT, Y on the RIGHT**. The cross-coupled
feedback wires wrap around the *outside* (right side of each NAND) and
re-enter the other NAND's B terminal on the right — never crossing
either NAND body.

| child id | child layer | center (cx, cy) | box (w × h)   | A_input →    | B_input →    | Y_out →   |
|----------|-------------|-----------------|---------------|--------------|--------------|-----------|
| N1       | gate (NAND) | ( 0.625,  1.5)  | 2.857 × 2.0   | N1_A_in      | N1_B_in      | N1_Y_out  |
| N2       | gate (NAND) | ( 0.625, -1.5)  | 2.857 × 2.0   | N2_A_in      | N2_B_in      | N2_Y_out  |

Each child box's aspect ratio (w/h ≈ 1.429) matches the gate canvas
aspect (10/7) — pinned by `CHILD_LAYER_CANVAS_ASPECT.gate` in `lib.mjs`
and enforced by `check.mjs` rule 6a. Clicking N1 zooms into a viewport
whose proportions match the box just clicked, so the transition reads
as a smooth continuation, not a re-shape.

Absorbed-terminal coords are **NOT hand-written here**. They are
auto-derived at load time from one source of truth — the table
`CHILD_LAYER_TERMINAL_OFFSETS` in `wire_sketches/lib.mjs` — using the
formula

    absorbed = child_box_corner + frac × box_dim   (along declared edge)

For this layer, each (child × child-terminal) row in the **Embedded
children** table above maps to an absorbed-name (cell value). At parse
time `deriveAbsorbedTerminals` projects every such pair via
`projectChildTerminal(child, terminalKey)` and registers the result
under that absorbed name. The wires below then reference the absorbed
name and pick up the projected coord automatically.

For reference, the resulting positions on this layer's N1 box
(cx=0.625, cy=1.5, w=2.857, h=2.0) are:

    N1_A_in  = (-0.804,  1.929)   ← LEFT edge, gate.A_input fraction 2/7
    N1_B_in  = ( 2.054,  1.929)   ← RIGHT edge, gate.B_input fraction 2/7
    N1_Y_out = ( 2.054,  1.643)   ← RIGHT edge, gate.Y_out   fraction 3/7

and the N2 mirror (cy=-1.5):

    N2_A_in  = (-0.804, -1.071)
    N2_B_in  = ( 2.054, -1.071)
    N2_Y_out = ( 2.054, -1.357)

Changing the gate's external terminal coords (`layer1_gate.md`) auto-
updates every dependent layer's absorbed positions; no manual sync.

Role mapping per NAND (faithful to the gate convention — same A/B/Y
layout that LevelLatch.tsx uses via `GATE_MODULE.projectAllTerminals`):

- **N1 (SET gate)**: A = S̄ (LEFT-arriving direct), B = Q̄ (RIGHT-arriving feedback), Y = Q
- **N2 (RESET gate)**: A = R̄ (LEFT-arriving direct), B = Q (RIGHT-arriving feedback), Y = Q̄

Note: the legacy `latchWireGraph.ts` puts both N1 inputs at x=-1.25
(left side) for the *simplified* `LatchSceneSvg` mini renderer, where
the NAND is a stylized symbol with both ports on the left. The full
LevelLatch view, which embeds real NAND minis, uses the gate
convention shown above. The sketch is the canonical design contract;
when the embedded child has a real gate-mini, A/B/Y are on left/right/
right respectively.

## Wires

Internal wires (cross-coupled feedback wraps around the RIGHT edge of
each NAND, never crossing either NAND body):

| from       | to        | via                                 | net   |
|------------|-----------|-------------------------------------|-------|
| Vdd_left   | Vdd_right | —                                   | Vdd   |
| GND_left   | GND_right | —                                   | GND   |
| S_in       | N1_A_in   | (-6.0, 1.929)                       | S_bar |
| R_in       | N2_A_in   | (-6.0, -1.071)                      | R_bar |
| N1_Y_out   | Q_out     | (5.5, 1.643), (5.5, 1.5)            | Q     |
| N2_Y_out   | QB_out    | (5.5, -1.357), (5.5, -1.5)          | Q_bar |
| N1_Y_out   | N2_B_in   | (3.0, 1.643), (3.0, -1.071)         | Q     |
| N2_Y_out   | N1_B_in   | (4.0, -1.357), (4.0, 1.929)         | Q_bar |

Junction nodes (cross-coupled wraparound corners — all on the RIGHT
side of the scene). The y-coords are pinned to the auto-derived
absorbed-terminal y's so the wraparound enters each NAND's RIGHT-edge
B-input at the same projected y the gate's `B_input` lands on, never
at the box corner.

- `Q_branch` ( 3.0,  1.643), `Q_wrap` ( 3.0, -1.071) — Q lane (inner-right)
- `QB_branch` ( 4.0, -1.357), `QB_wrap` ( 4.0,  1.929) — Q̄ lane (outer-right; offset so the two lanes don't overlap)

## Alignment claims

- Each child NAND's `A_input`, `B_input`, `Y_out` external terminal MUST
  project to the matching absorbed terminal in the embedded-children
  table. This is enforced when the NAND mini is rendered inside the latch
  scene via `GATE_MODULE.projectAllTerminals` — the same projection math
  the latch wire-graph world coords were chosen to match. Pinned by
  `tests/e2e/wire-connection.spec.ts`.
- When the latch is embedded as a mini inside the D latch (layer 3) or
  the DFF (layer 4), its 8 external terminals MUST project within 1.5 px
  of where the parent's wires land. Source:
  `tests/e2e/wire-connection-dff.spec.ts`.

![sketch](./layer2_latch.svg)
