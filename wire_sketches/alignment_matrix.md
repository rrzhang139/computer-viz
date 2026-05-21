# Alignment matrix

For every parent-wire endpoint that lands on a child mini's external
terminal, this table records both the world coordinate the parent draws
to and the child terminal's world coordinate (the contract the child
declares). They MUST match exactly within the codebase's source-of-truth
data (`*WireGraph.ts`, `transistorConnections.ts`). Pixel tolerance after
projection is **1.5 px** — the threshold enforced by
`tests/e2e/wire-connection-dff.spec.ts` (and the gate↔latch equivalent in
`tests/e2e/wire-connection.spec.ts`).

`Δ_world` is the difference between the parent's absorbed-terminal coord
(where the parent wire terminates inside its own scene) and the child's
external-terminal coord (in the child's local scene). For the gate ↔
transistor relationship, the child uses the parent's gate-world coords
directly (no projection), so Δ_world is always (0, 0). For higher layers
the child has its own local frame, and equality is established by the
parent's projection math; Δ_world is then "0 by construction" and the
1.5 px check applies at the rendered SVG level.

Read column order: `parent → child_mini.terminal | parent_world | child_world | Δ_world`.

## Layer 1 (gate) → Layer 0 (transistor)

Source: `TRANSISTOR_CONNECTIONS` in `src/levels/transistorConnections.ts`,
cross-referenced with `WIRE_NODES` in `src/levels/nandWireGraph.ts`.

The transistor's local frame is canonical (gate=(-0.8,0), source=(0,1),
drain=(0,-1)); the parent NAND-gate scene re-anchors each instance such
that its three external terminals coincide with the absorbed-terminal
coords below. The mapping is "0 by construction" — there is no
intermediate projection.

| parent wire endpoint → child terminal       | parent world  | child terminal (after re-anchor) | source-of-truth file               |
|---------------------------------------------|---------------|----------------------------------|------------------------------------|
| A_input → P_A.gate     (PA_gate)            | (-2.05,  1.5) | P_A.gate                         | nandWireGraph.ts + transistorConnections.ts |
| Vdd_tap_PA → P_A.source (PA_source)         | (-1.6,   1.85)| P_A.source                       | nandWireGraph.ts + transistorConnections.ts |
| Y_junction-path → P_A.drain (PA_drain)      | (-1.6,   1.15)| P_A.drain                        | nandWireGraph.ts + transistorConnections.ts |
| B_input → P_B.gate     (PB_gate)            | ( 2.05,  1.5) | P_B.gate                         | nandWireGraph.ts + transistorConnections.ts |
| Vdd_tap_PB → P_B.source (PB_source)         | ( 1.6,   1.85)| P_B.source                       | nandWireGraph.ts + transistorConnections.ts |
| Y_junction-path → P_B.drain (PB_drain)      | ( 1.6,   1.15)| P_B.drain                        | nandWireGraph.ts + transistorConnections.ts |
| A_tap_to_NMOS → N_A.gate (NA_gate)          | (-0.45, -0.6) | N_A.gate                         | nandWireGraph.ts + transistorConnections.ts |
| Y_junction → N_A.drain (NA_drain)           | ( 0.0,  -0.25)| N_A.drain                        | nandWireGraph.ts + transistorConnections.ts |
| mid-net → N_A.source (NA_source)            | ( 0.0,  -0.95)| N_A.source                       | nandWireGraph.ts + transistorConnections.ts |
| B_tap_to_NMOS → N_B.gate (NB_gate)          | ( 0.45, -2.4) | N_B.gate                         | nandWireGraph.ts + transistorConnections.ts |
| mid-net → N_B.drain (NB_drain)              | ( 0.0,  -2.05)| N_B.drain                        | nandWireGraph.ts + transistorConnections.ts |
| GND_tap_NB → N_B.source (NB_source)         | ( 0.0,  -2.75)| N_B.source                       | nandWireGraph.ts + transistorConnections.ts |

All 12 rows have Δ_world = (0, 0). Pinned by
`tests/unit/nandConnections.test.ts`.

## Layer 2 (latch) → Layer 1 (gate, NAND)

The latch embeds each NAND as a mini at SVG (cx, cy) = (320, 110) for
NAND1 and (320, 290) for NAND2, with footprint 240 × 140 SVG px and
margin 1.2 (source: `LevelLatch.tsx` lines 59-67). The mini's internal
terminal coords are produced by `GATE_MODULE.projectAllTerminals(cx, cy,
240, 140, 1.2)` and the latch wires terminate at those exact SVG
positions. The latch's own wire-graph world coords (`N1_top_in` etc.)
were chosen so that — under the latch's own projection (1.1× margin
into the 600×400 SVG) — they coincide with the NAND mini's projected
terminals.

| latch wire endpoint → NAND mini terminal     | latch world (target) | NAND child external | role                                  |
|----------------------------------------------|----------------------|---------------------|---------------------------------------|
| S_in → N1.A_input        (N1_A_in)           | (-1.25,  2.0)        | A_input (LEFT)      | S̄ direct enters N1 from the left     |
| QB_wrap → N1.B_input     (N1_B_in)           | ( 2.5,   1.0)        | B_input (RIGHT)     | Q̄ feedback enters N1 from the right  |
| N1.Y_out → Q_out         (N1_Y_out)          | ( 2.5,   1.5)        | Y_out (RIGHT)       | Q exits N1 to the right               |
| R_in → N2.A_input        (N2_A_in)           | (-1.25, -2.0)        | A_input (LEFT)      | R̄ direct enters N2 from the left     |
| Q_wrap → N2.B_input      (N2_B_in)           | ( 2.5,  -1.0)        | B_input (RIGHT)     | Q feedback enters N2 from the right   |
| N2.Y_out → QB_out        (N2_Y_out)          | ( 2.5,  -1.5)        | Y_out (RIGHT)       | Q̄ exits N2 to the right              |

Both NANDs follow the gate convention (A-left, B-right, Y-right). The
cross-coupled feedback wires wrap around the right side of the scene
in two parallel lanes (Q at x=3.5, Q̄ at x=4.5) so the two feedback
polylines don't visually overlap and neither one crosses either NAND
body.

Pinned by `tests/e2e/wire-connection.spec.ts`.

## Layer 3 (D latch) → Layer 1 (gate, NAND) × 4

The D latch embeds four NANDs as MOSFET-style miniatures (NAND_S,
NAND_R, SR-core NAND1, SR-core NAND2). For each, the parent's wire that
targets the NAND mini terminates at the D-latch absorbed terminal coord;
the NAND's external terminal projects to the same point under the gate
projection used by `MiniNandView`.

| D-latch wire endpoint → NAND mini terminal     | D-latch world | NAND child external | side  | role                                  |
|------------------------------------------------|---------------|---------------------|-------|---------------------------------------|
| EN drop → GS top input         (GS_in_top)     | (-3.5,  1.2)  | A or B (symmetric)  | LEFT  | EN drops in from above                |
| D path → GS bot input          (GS_in_bot)     | (-3.5,  0.8)  | A or B (symmetric)  | LEFT  | D enters horizontally from left       |
| GS output → SR-core N1.A       (GS_out)        | (-1.5,  1.0)  | Y_out               | RIGHT | S̄ exits right                        |
| inv_out → GR top input         (GR_in_top)     | (-3.5, -0.8)  | A or B (symmetric)  | LEFT  | !D enters from inverter               |
| EN drop → GR bot input         (GR_in_bot)     | (-3.5, -1.2)  | A or B (symmetric)  | LEFT  | EN drops in from above                |
| GR output → SR-core N2.A       (GR_out)        | (-1.5, -1.0)  | Y_out               | RIGHT | R̄ exits right                        |
| S̄ → SR N1.A_input              (N1_A_in)      | ( 1.0,  1.8)  | A_input             | LEFT  | S̄ direct from GS enters on left      |
| Q̄ feedback → SR N1.B_input    (N1_B_in)       | ( 3.5,  1.2)  | B_input             | RIGHT | Q̄ wraps around right and enters here |
| SR N1.Y_out → Q chip + Q fb   (N1_Y_out)       | ( 3.5,  1.5)  | Y_out               | RIGHT | Q exits to the right                  |
| Q feedback → SR N2.B_input     (N2_B_in)       | ( 3.5, -1.2)  | B_input             | RIGHT | Q wraps around right and enters here  |
| R̄ → SR N2.A_input             (N2_A_in)       | ( 1.0, -1.8)  | A_input             | LEFT  | R̄ direct from GR enters on left      |
| SR N2.Y_out → Q̄ chip + Q̄ fb  (N2_Y_out)      | ( 3.5, -1.5)  | Y_out               | RIGHT | Q̄ exits to the right                 |

For the SR-core sub-region as a virtual layer-2 boundary (the `sr-core`
hit zone in `LevelDLatch.tsx` lines 56-58):

| sr-core virtual external → SR latch (layer 2) external | D-latch world | layer 2 external | layer 2 world |
|--------------------------------------------------------|---------------|------------------|---------------|
| S̄ entering N1 from left  ↔ latch.S_in                 | ( 1.0,  1.8)  | S_in             | (-6.0,  2.0)  |
| R̄ entering N2 from left  ↔ latch.R_in                 | ( 1.0, -1.8)  | R_in             | (-6.0, -2.0)  |
| Q exiting N1 to right    ↔ latch.Q_out                 | ( 3.5,  1.5)  | Q_out            | ( 6.0,  1.5)  |
| Q̄ exiting N2 to right    ↔ latch.QB_out               | ( 3.5, -1.5)  | QB_out           | ( 6.0, -1.5)  |

These coords sit in different scenes (different bounds, different scale)
so direct numeric equality does NOT apply. What applies: the *role*,
*polarity*, and *edge* (LEFT for inputs, RIGHT for outputs) match. The
visual hover-preview swap that drills sr-core → latch projects the
latch's external terminals into the sr-core box and the SR-core's
internal wires must land on the projected positions. (Today this drill
is implemented as a click-only transition because the topology fits;
projection still applies for the hover preview.)

## Layer 4 (DFF) → Layer 3 (D latch) × 2

(Out of the current "layers 0–3" scope but recorded for forward
reference. Pinned by `tests/e2e/wire-connection-dff.spec.ts`.)

| DFF wire endpoint → D-latch mini terminal | D-latch world (target) | role                                          |
|-------------------------------------------|------------------------|-----------------------------------------------|
| D → master.D_in                           | (-6.0,  0.0)           | external D feeds the master                   |
| !CLK → master.EN_in                       | (-1.5,  3.5)           | master is open while CLK is LOW               |
| master.Q_out → slave.D_in                 | (-6.0,  0.0) (slave)   | master's output is the slave's data input     |
| CLK → slave.EN_in                         | (-1.5,  3.5)           | slave is open while CLK is HIGH               |
| slave.Q_out → external Q chip             | ( 6.0,  1.5)           | DFF Q                                         |
| slave.QB_out → external Q̄ chip           | ( 6.0, -1.5)           | DFF Q̄                                        |

## Supply distribution (every parent → every child that needs it)

The supply contract per the sketches: every layer exposes a single
`Vdd` (TOP edge) and `GND` (BOTTOM edge); every child likewise. The
parent must reach each child's `Vdd` and `GND` terminals. The actual
routing pattern is per-layer:

| parent layer | routing pattern for Vdd                                              | routing pattern for GND                              |
|--------------|----------------------------------------------------------------------|------------------------------------------------------|
| Gate         | Direct top-drop into each PMOS source (P_A, P_B sit under the rail). | Direct bottom-rise into N_B's source (chain bottom). |
| Latch        | L-shaped: vertical bus on LEFT edge, horizontal stubs into each NAND's projected Vdd-y. | Mirrored: vertical bus on RIGHT edge, stubs into each NAND's GND-y. |
| D Latch      | Same L-shape: left-edge Vdd bus with stubs into all 4 NANDs + inverter. | Same: right-edge GND bus with stubs into all 4 NANDs + inverter. |
| DFF (fwd)    | Vertical Vdd pillar on LEFT, stubs into master.Vdd and slave.Vdd at each D-latch's projected Vdd-y. | Mirrored GND pillar on RIGHT. |

This pattern is recursive: every layer N's "stub into each child's Vdd"
terminates at the child's top-edge Vdd terminal, which inside the child
becomes its OWN top rail with its OWN per-grandchild distribution. The
single conceptual `Vdd` terminal makes the contract uniform across
layers; the L-shaped vs straight-vertical detail is the per-layer
implementation choice.
