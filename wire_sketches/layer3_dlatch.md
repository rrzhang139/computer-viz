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

| key       | role         | (x, y)        | edge   |
|-----------|--------------|---------------|--------|
| D_in      | data in      | (-6.0,  0.0)  | LEFT   |
| EN_in     | control in   | (-1.5,  3.5)  | TOP    |
| Q_out     | data out (Q) | ( 6.0,  1.5)  | RIGHT  |
| QB_out    | data out (Q̄)| ( 6.0, -1.5)  | RIGHT  |
| Vdd_left  | supply (Vdd) | (-6.0,  4.0)  | TOP    |
| Vdd_right | supply (Vdd) | ( 6.0,  4.0)  | TOP    |
| GND_left  | supply (GND) | (-6.0, -4.0)  | BOTTOM |
| GND_right | supply (GND) | ( 6.0, -4.0)  | BOTTOM |

Note: EN_in is the only TOP control terminal in the project so far —
it's the canonical "control signal drops down from above" pattern.

## Embedded children

Four NAND minis (layer 1) and one inverter (sub-gate). Each child's
external terminals map to absorbed terminals in this layer.

| child id | child layer | center (cx, cy) | box (w × h) | input(s) → absorbed                 | output → absorbed |
|----------|-------------|-----------------|-------------|-------------------------------------|-------------------|
| inv      | inverter    | (-4.5,  0.0)    | 1.0 × 0.6   | in → inv_in                         | out → inv_out     |
| GS       | gate (NAND) | (-2.5,  1.0)    | 4.0 × 1.0   | top → GS_in_top, bot → GS_in_bot    | Y → GS_out        |
| GR       | gate (NAND) | (-2.5, -1.0)    | 4.0 × 1.0   | top → GR_in_top, bot → GR_in_bot    | Y → GR_out        |
| N1       | gate (NAND) | ( 2.25, 1.5)    | 2.5 × 1.0   | top → N1_top_in, bot → N1_bot_in    | Y → N1_out        |
| N2       | gate (NAND) | ( 2.25,-1.5)    | 2.5 × 1.0   | top → N2_top_in, bot → N2_bot_in    | Y → N2_out        |

GS / GR are the gating NANDs producing S̄ and R̄. N1 / N2 are the
SR-latch core (drilled into as the layer-2 LATCH unit via the `sr-core`
hit zone). The inverter (`inv_in` → `inv_out`) produces !D for the
bottom gating NAND.

Absorbed-terminal coords (source: `WIRE_NODES` in `dLatchWireGraph.ts`):

| absorbed key | (x, y)         | description                       |
|--------------|----------------|-----------------------------------|
| inv_in       | (-5.0,  0.0)   | inverter input                    |
| inv_out      | (-4.0,  0.0)   | inverter output (!D)              |
| GS_in_top    | (-3.5,  1.2)   | NAND_S top input (EN drop-in)     |
| GS_in_bot    | (-3.5,  0.8)   | NAND_S bottom input (D direct)    |
| GS_out       | (-1.5,  1.0)   | NAND_S output (S̄)                |
| GR_in_top    | (-3.5, -0.8)   | NAND_R top input (!D)             |
| GR_in_bot    | (-3.5, -1.2)   | NAND_R bottom input (EN drop-in)  |
| GR_out       | (-1.5, -1.0)   | NAND_R output (R̄)                |
| N1_top_in    | ( 1.0,  1.8)   | SR-core NAND1 top input (S̄)      |
| N1_bot_in    | ( 1.0,  1.2)   | SR-core NAND1 bottom (Q̄ fb)      |
| N1_out       | ( 3.5,  1.5)   | SR-core NAND1 output → Q          |
| N2_top_in    | ( 1.0, -1.2)   | SR-core NAND2 top (Q fb)          |
| N2_bot_in    | ( 1.0, -1.8)   | SR-core NAND2 bottom (R̄)         |
| N2_out       | ( 3.5, -1.5)   | SR-core NAND2 output → Q̄         |

## Wires

Internal wires (source: `WIRES` in `dLatchWireGraph.ts`).

| from        | to          | via                                | net   |
|-------------|-------------|------------------------------------|-------|
| Vdd_left    | Vdd_right   | —                                  | Vdd   |
| GND_left    | GND_right   | —                                  | GND   |
| D_in        | GS_in_bot   | (-5.5, 0.0), (-5.5, 0.8)           | D     |
| D_in        | inv_in      | —                                  | D     |
| inv_out     | GR_in_top   | (-3.8, 0.0), (-3.8, -0.8)          | D_bar |
| EN_in       | EN_tap_S    | (-1.5, 3.0)                        | EN    |
| EN_tap_S    | GS_in_top   | —                                  | EN    |
| EN_tap_R    | GR_in_bot   | —                                  | EN    |
| GS_out      | N1_top_in   | (-0.5, 1.0), (-0.5, 1.8)           | S_bar |
| GR_out      | N2_bot_in   | (-0.5,-1.0), (-0.5,-1.8)           | R_bar |
| N1_out      | Q_out       | (4.3, 1.5)                         | Q     |
| N2_out      | QB_out      | (5.0,-1.5)                         | Q_bar |
| Q_branch    | N2_top_in   | (4.3,-1.2)                         | Q     |
| QB_branch   | N1_bot_in   | (5.0, 1.2)                         | Q_bar |

Junction nodes:
- `EN_tap_S` (-3.5, 3.0), `EN_tap_R` (-3.5, 3.0)
- `Q_branch` (4.3, 1.5), `Q_wrap` (4.3, -1.2)
- `QB_branch` (5.0, -1.5), `QB_wrap` (5.0, 1.2)

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
