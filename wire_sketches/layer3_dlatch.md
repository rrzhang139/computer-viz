# Layer 3 — D latch (gated)

One SR-latch core + two gating NANDs (NAND_S and NAND_R) + one inverter.
When EN=1 the latch is transparent: S̄ = !D, R̄ = D, so Q follows D. When
EN=0 the latch HOLDS: S̄ = R̄ = 1 means the SR core latches its last
state.

This is the building block of the edge-triggered DFF above (layer 4):
the DFF uses one master D latch (enabled while CLK=0) and one slave D
latch (enabled while CLK=1) to produce a level-immune storage cell.

## Scene bounds
x ∈ [-6.0, 6.0], y ∈ [-4.0, 4.0]

(source: `SCENE_BOUNDS` derived in `src/levels/dLatchWireGraph.ts`.)

## External terminals

| key    | role         | (x, y)        | edge   |
|--------|--------------|---------------|--------|
| D_in   | data in      | (-6.0,  0.0)  | LEFT   |
| EN_in  | control in   | (-1.5,  3.5)  | TOP    |
| Q_out  | data out (Q) | ( 6.0,  1.5)  | RIGHT  |
| QB_out | data out (Q̄)| ( 6.0, -1.5)  | RIGHT  |
| Vdd    | supply (+V)  | ( 0.0,  4.0)  | TOP    |
| GND    | supply (0V)  | ( 0.0, -4.0)  | BOTTOM |

Note: EN_in is the only TOP *control* terminal in the project so far —
it's the canonical "control signal drops down from above" pattern. Vdd
shares the TOP edge with it but is a supply rail (a whole edge), not a
point.

## Internal supply distribution

The Vdd rail runs at y=+4 from `Vdd_left` (-6, 4) to `Vdd_right` (6, 4).
The GND rail at y=-4 from `GND_left` (-6, -4) to `GND_right` (6, -4).

The four embedded NANDs are arranged in a 2×2 grid (GS top-left, GR
bottom-left, N1 top-right, N2 bottom-right) plus the inverter in the
middle-left. Each NAND mini exposes top-edge `Vdd` and bottom-edge `GND`
(inherited from layer 1). The routing pattern is the same as the latch:

- Vertical Vdd bus on the LEFT EDGE (x=-6), with horizontal stubs at each
  NAND's projected Vdd-y. The top row (GS, N1) gets stubs near y=+1.7;
  the bottom row (GR, N2) gets stubs near y=+0.7 (still above their
  bodies — projected NAND-internal Vdd-y).
- Vertical GND bus on the RIGHT EDGE (x=+6), mirrored stubs.
- The inverter sits between Vdd and GND rails (small, doesn't need a
  detoured route).
- Topological contract: parent.Vdd → {GS, GR, N1, N2, inv}.Vdd; same for
  GND. Physical path is L-shaped via the side busses for stacked rows.

## Embedded children

Four NAND minis (layer 1) and one inverter (sub-gate). Each child's
external terminals map to absorbed terminals in this layer.

| child id | child layer | center (cx, cy) | box (w × h)   | input(s) → absorbed                                        | output → absorbed |
|----------|-------------|-----------------|---------------|------------------------------------------------------------|-------------------|
| inv      | inverter    | (-4.5,  0.0)    | 1.0 × 0.6     | in → inv_in (LEFT)                                         | out → inv_out (RIGHT) |
| GS       | gate (NAND) | (-2.5,  1.5)    | 2.857 × 2.0   | A (D, LEFT) → GS_A_in, T (EN, TOP) → GS_T_in               | Y → GS_Y_out (RIGHT)  |
| GR       | gate (NAND) | (-2.5, -1.5)    | 2.857 × 2.0   | A (!D, TOP@x=-4) → GR_A_in, T (EN, TOP@x=-3.5) → GR_T_in   | Y → GR_Y_out (RIGHT)  |
| N1       | gate (NAND) | ( 2.5,  1.5)    | 2.857 × 2.0   | A (LEFT) → N1_A_in, B (RIGHT) → N1_B_in                    | Y → N1_Y_out (RIGHT)  |
| N2       | gate (NAND) | ( 2.5, -1.5)    | 2.857 × 2.0   | A (LEFT) → N2_A_in, B (RIGHT) → N2_B_in                    | Y → N2_Y_out (RIGHT)  |

Every NAND box uses the same w:h aspect (10/7) as the gate canvas it
zooms into — enforced by `check.mjs` rule 6a against
`CHILD_LAYER_CANVAS_ASPECT.gate` in `lib.mjs`. The inverter is a
sub-gate without its own layer file, so its box dimensions are picked
locally.

GS / GR are the gating NANDs producing S̄ and R̄. N1 / N2 are the
SR-latch core (drilled into as the layer-2 LATCH unit via the `sr-core`
hit zone). The inverter (`inv_in` → `inv_out`) produces !D for the
bottom gating NAND.

Absorbed-terminal coords are split into two categories:

**(a) Canonical NAND terminals (SR-core N1, N2)** — auto-derived at load
time from `CHILD_LAYER_TERMINAL_OFFSETS` in `lib.mjs`. The formula is

    absorbed = child_box_corner + frac × box_dim   (along declared edge)

so changing the gate's external terminal coords in `layer1_gate.md`
auto-updates every layer that embeds a gate, with no hand-syncing.
Resulting positions on the layer-3 N1 box (cx=2.25, cy=1.5, w=2.5,
h=1.0):

    N1_A_in  = (1.0, 1.714)   ← LEFT edge, gate.A_input frac 2/7
    N1_B_in  = (3.5, 1.714)   ← RIGHT edge, gate.B_input frac 2/7
    N1_Y_out = (3.5, 1.571)   ← RIGHT edge, gate.Y_out frac 3/7

and the N2 mirror (cy=-1.5):

    N2_A_in  = (1.0, -1.286)
    N2_B_in  = (3.5, -1.286)
    N2_Y_out = (3.5, -1.429)

**(b) Non-canonical terminals (inverter, gating-NAND TOP inputs)** —
these re-purpose the child layer in ways that don't match its canonical
external terminals (e.g., GR has TWO inputs both on the TOP edge — the
canonical "A" → LEFT alias can't express that). They stay declared
explicitly here, on the box boundary (per `check.mjs`'s
endpoint-in-body rule), and override the auto-derived value of the
same name:

| absorbed key | (x, y)         | description                                                       |
|--------------|----------------|-------------------------------------------------------------------|
| inv_in       | (-5.0,  0.0)   | inverter input — on inv's LEFT edge                               |
| inv_out      | (-4.0,  0.0)   | inverter output (!D) — on inv's RIGHT edge                        |
| GS_T_in      | (-3.5,  2.5)   | NAND_S control input — on GS's TOP edge at x=-3.5 (receives EN)   |
| GR_A_in      | (-3.5, -0.5)   | NAND_R data input — on GR's TOP edge at x=-3.5 (receives !D)      |
| GR_T_in      | (-2.0, -0.5)   | NAND_R control input — on GR's TOP edge at x=-2 (receives EN)     |

The remaining absorbed terminals (`GS_A_in`, `GS_Y_out`, `GR_Y_out`,
`N1_*`, `N2_*`) are auto-derived from `CHILD_LAYER_TERMINAL_OFFSETS` —
no entry needed here.

**SR-core NANDs (N1, N2)** follow the gate convention (A-left, B-right,
Y-right): the direct input enters on the left, cross-coupled feedback
wraps around the right side.

**Gating NANDs (GS, GR)** have one input on the LEFT (or, for GR, on
the TOP at a child-aligned x) and one input on the TOP. Both inputs
sit on the box boundary — no wire ever enters the body. The EN signal
runs on an external left-side bus and taps into each gating NAND's TOP
edge from above; the data signal (D / !D) approaches from the LEFT (for
GS) or from inv_out directly above (for GR).

## Wires

Internal wires. EN routes on an **external left-side bus** at x=-5.5 so
it never crosses the GS or GR bodies. The two cross-coupled feedback
wires (Q, Q̄) wrap around the right side of the SR-core in two parallel
lanes so neither one crosses any NAND body.

| from        | to          | via                                                                         | net   |
|-------------|-------------|-----------------------------------------------------------------------------|-------|
| Vdd_left    | Vdd_right   | —                                                                           | Vdd   |
| GND_left    | GND_right   | —                                                                           | GND   |
| D_in        | inv_in      | —                                                                           | D     |
| D_in        | GS_A_in     | (-6.0, 1.929)                                                               | D     |
| inv_out     | GR_A_in     | (-3.5, 0.0)                                                                 | D_bar |
| EN_in       | GR_T_in     | (-1.5, 3.0), (-5.5, 3.0), (-5.5, -0.45), (-2.0, -0.45)                      | EN    |
| EN_bus_GS   | GS_T_in     | (-5.5, 2.6), (-3.5, 2.6)                                                    | EN    |
| GS_Y_out    | N1_A_in     | (-0.071, 1.643), (-0.071, 1.929), (1.071, 1.929)                            | S_bar |
| GR_Y_out    | N2_A_in     | (-0.071, -1.357), (-0.071, -1.071), (1.071, -1.071)                         | R_bar |
| N1_Y_out    | Q_out       | (5.5, 1.643), (5.5, 1.5)                                                    | Q     |
| N2_Y_out    | QB_out      | (5.5, -1.357), (5.5, -1.5)                                                  | Q_bar |
| N1_Y_out    | N2_B_in     | (4.4, 1.643), (4.4, -1.071)                                                 | Q     |
| N2_Y_out    | N1_B_in     | (5.0, -1.357), (5.0, 1.929)                                                 | Q_bar |

Junction nodes (y-coords pinned to the auto-derived absorbed-terminal
y's so the wraparounds enter each SR-core NAND at the projected offset,
never at the box corner):
- `EN_bus_GS` (-5.5, 2.6) — T-junction tap on the EN bus above the GS row.
- `Q_branch` (4.4, 1.643), `Q_wrap` (4.4, -1.071) — Q feedback lane (inner-right)
- `QB_branch` (5.0, -1.357), `QB_wrap` (5.0, 1.929) — Q̄ feedback lane (outer-right)

## Alignment claims

- Each child NAND's `A_input`, `B_input`, `Y_out` MUST project into the
  matching absorbed terminal pair listed in the embedded-children table.
- The SR-core sub-region (`N1`+`N2`+feedback wraparound, world box
  approximately `x ∈ [0.7, 5.5], y ∈ [-3.0, 3.0]`) is what the
  `sr-core` hit zone drills into; its 4 external terminals (S̄, R̄, Q,
  Q̄) align with the layer-2 latch's `S_in`, `R_in`, `Q_out`, `QB_out`
  when projected.
- When the D latch is embedded as a mini in the DFF (layer 4), its 8
  external terminals MUST project within 1.5 px of where the parent DFF's
  wires terminate. Pinned by `tests/e2e/wire-connection-dff.spec.ts`.

![sketch](./layer3_dlatch.svg)
