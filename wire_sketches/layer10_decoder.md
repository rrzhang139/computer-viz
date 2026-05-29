# Layer 10 — 2-to-4 decoder

Convert a 2-bit binary address `(a1, a0)` into a one-hot 4-line output.
Exactly one of `sel0..sel3` is high at any time, and only when the
enable `EN` is high. The address-to-one-hot primitive — every register
file, MUX, and instruction decoder depends on a decoder of some width.

Per the project's locked spatial invariant (CLAUDE.md): all inputs
are on the LEFT, all outputs on the RIGHT. `a1`, `a0`, and `EN` all
enter on the LEFT edge.

LSB-at-bottom convention on the output side: `sel0` (selects
address=0) at the bottom of the right edge, `sel3` at the top.

Truth table (with EN=1):

| a1 | a0 | sel3 | sel2 | sel1 | sel0 |
|----|----|------|------|------|------|
|  0 |  0 |  0   |  0   |  0   |  1   |
|  0 |  1 |  0   |  0   |  1   |  0   |
|  1 |  0 |  0   |  1   |  0   |  0   |
|  1 |  1 |  1   |  0   |  0   |  0   |

With EN=0, all outputs are 0.

  sel0 = ~a1 · ~a0 · EN
  sel1 = ~a1 ·  a0 · EN
  sel2 =  a1 · ~a0 · EN
  sel3 =  a1 ·  a0 · EN

## Scene bounds
x ∈ [-6, 6], y ∈ [-4, 4]

## External terminals

| key       | role           | (x, y)        | edge   |
|-----------|----------------|---------------|--------|
| a1_in     | addr bit 1     | (-6,  2)      | LEFT   |
| a0_in     | addr bit 0     | (-6, -2)      | LEFT   |
| EN_in     | enable         | (-6,  0)      | LEFT   |
| sel3_out  | one-hot (a=3)  | ( 6,  3)      | RIGHT  |
| sel2_out  | one-hot (a=2)  | ( 6,  1)      | RIGHT  |
| sel1_out  | one-hot (a=1)  | ( 6, -1)      | RIGHT  |
| sel0_out  | one-hot (a=0)  | ( 6, -3)      | RIGHT  |
| Vdd       | supply (+V)    | ( 0,  4)      | TOP    |
| GND       | supply (0V)    | ( 0, -4)      | BOTTOM |

`a1_in` at LEFT frac 0.25, `EN_in` at LEFT frac 0.5, `a0_in` at LEFT
frac 0.75 — symmetric about the horizontal midline. The four
`selN_out` outputs are at canonical fracs (0.125, 0.375, 0.625,
0.875) so the decoder embeds cleanly into any 4-line parent.

## Internal supply distribution

Vdd at top y=4, GND at bottom y=-4. Each child taps the rails
directly.

## Embedded children

| child id | child layer | center (cx, cy) | box (w × h) |
|----------|-------------|-----------------|-------------|
| inv_a1   | invbox      | (-4.4,  2)      | 1.2 × 0.8   |
| inv_a0   | invbox      | (-4.4, -2)      | 1.2 × 0.8   |
| and3     | and3box     | ( 4.0,  3)      | 1.6 × 1.0   |
| and2     | and3box     | ( 4.0,  1)      | 1.6 × 1.0   |
| and1     | and3box     | ( 4.0, -1)      | 1.6 × 1.0   |
| and0     | and3box     | ( 4.0, -3)      | 1.6 × 1.0   |

Inverters: horizontal orientation, input on LEFT, output on RIGHT.
ANDs: standard orientation, three inputs LEFT-stacked (A/B/C), one
output RIGHT-mid.

## Absorbed terminals

Inverter `inv_a1` (cx=-4.4, cy=2, w=1.2, h=0.8 → x∈[-5,-3.8], y∈[1.6,2.4]):

- `inv_a1_A_in`  (-5,    2)    ← LEFT  mid
- `inv_a1_Y_out` (-3.8,  2)    ← RIGHT mid

Inverter `inv_a0` (cx=-4.4, cy=-2):

- `inv_a0_A_in`  (-5,   -2)
- `inv_a0_Y_out` (-3.8, -2)

AND `and3` (cx=4, cy=3, w=1.6, h=1.0 → x∈[3.2,4.8], y∈[2.5,3.5]):

- `and3_A_in`  (3.2,  3.25)
- `and3_B_in`  (3.2,  3.00)
- `and3_C_in`  (3.2,  2.75)
- `and3_Y_out` (4.8,  3.00)

AND `and2`:

- `and2_A_in`  (3.2,  1.25)
- `and2_B_in`  (3.2,  1.00)
- `and2_C_in`  (3.2,  0.75)
- `and2_Y_out` (4.8,  1.00)

AND `and1`:

- `and1_A_in`  (3.2, -0.75)
- `and1_B_in`  (3.2, -1.00)
- `and1_C_in`  (3.2, -1.25)
- `and1_Y_out` (4.8, -1.00)

AND `and0`:

- `and0_A_in`  (3.2, -2.75)
- `and0_B_in`  (3.2, -3.00)
- `and0_C_in`  (3.2, -3.25)
- `and0_Y_out` (4.8, -3.00)

## Polarity tapping per AND

| AND   | sel | A   | B   | C  | logic           |
|-------|-----|-----|-----|----|-----------------|
| and3  | 3   | a1  | a0  | EN | a1 · a0 · EN    |
| and2  | 2   | a1  | ~a0 | EN | a1 · ~a0 · EN   |
| and1  | 1   | ~a1 | a0  | EN | ~a1 · a0 · EN   |
| and0  | 0   | ~a1 | ~a0 | EN | ~a1 · ~a0 · EN  |

## Internal bus lanes

Five vertical trunks span the mid-region between inverter outputs
(x=-3.8) and the AND column (x=3.2). Trunks at distinct x avoid
co-incident segments:

| trunk | x     | feeds                          |
|-------|-------|--------------------------------|
| a1    | -5.5  | and3.A, and2.A                 |
| a0    | -5.3  | and3.B, and1.B                 |
| ~a1   | -3.5  | and1.A, and0.A                 |
| ~a0   | -3.3  | and2.B, and0.B                 |
| EN    |  0    | and3.C, and2.C, and1.C, and0.C |

## Bus junctions

- `a1_tap`     (-5.5,  2)   — on `a1_in → inv_a1_A_in`
- `a0_tap`     (-5.3, -2)   — on `a0_in → inv_a0_A_in`
- `na1_tap`    (-3.5,  2)   — on `inv_a1_Y_out → na1_tap`
- `na0_tap`    (-3.3, -2)   — on `inv_a0_Y_out → na0_tap`
- `EN_lane_top` ( 0,   0.2) — junction where EN enters its vertical trunk

## Supply helpers

- `Vdd_left` (-6, 4), `Vdd_right` (6, 4)
- `GND_left` (-6, -4), `GND_right` (6, -4)

## Wires

| from         | to          | via                        | net  |
|--------------|-------------|----------------------------|------|
| Vdd_left     | Vdd_right   | —                          | Vdd  |
| GND_left     | GND_right   | —                          | GND  |
| a1_in        | inv_a1_A_in | —                          | a1   |
| a0_in        | inv_a0_A_in | —                          | a0   |
| a1_tap       | and3_A_in   | (-5.5, 3.25)               | a1   |
| a1_tap       | and2_A_in   | (-5.5, 1.25)               | a1   |
| a0_tap       | and3_B_in   | (-5.3, 3)                  | a0   |
| a0_tap       | and1_B_in   | (-5.3, -1)                 | a0   |
| inv_a1_Y_out | na1_tap     | —                          | a1bar |
| na1_tap      | and1_A_in   | (-3.5, -0.75)              | a1bar |
| na1_tap      | and0_A_in   | (-3.5, -2.75)              | a1bar |
| inv_a0_Y_out | na0_tap     | —                          | a0bar |
| na0_tap      | and2_B_in   | (-3.3, 1)                  | a0bar |
| na0_tap      | and0_B_in   | (-3.3, -3)                 | a0bar |
| EN_in        | EN_lane_top | (-0.2, 0), (-0.2, 0.2)     | EN   |
| EN_lane_top  | and3_C_in   | (0, 2.75)                  | EN   |
| EN_lane_top  | and2_C_in   | (0, 0.75)                  | EN   |
| EN_lane_top  | and1_C_in   | (0, -1.25)                 | EN   |
| EN_lane_top  | and0_C_in   | (0, -3.25)                 | EN   |
| and3_Y_out   | sel3_out    | —                          | sel3 |
| and2_Y_out   | sel2_out    | —                          | sel2 |
| and1_Y_out   | sel1_out    | —                          | sel1 |
| and0_Y_out   | sel0_out    | —                          | sel0 |

## Alignment claims

- All 4 `selN_out` terminals at evenly-spaced fracs (0.125 / 0.375 /
  0.625 / 0.875) of scene height — LSB-at-bottom.
- `a1_in`, `EN_in`, `a0_in` symmetric about y=0 at LEFT fracs
  0.25 / 0.5 / 0.75.
- All 4 AND boxes share width / height and stack at cy ∈ {3, 1,
  -1, -3} → output y matches `selN_out.y` for direct horizontals.

## Embedding contract

A parent embedding this decoder hooks LEFT-edge a1 / a0 / EN to
the parent's data inputs (or ties EN HIGH internally if the
decoder is always active in that context).

![sketch](./layer10_decoder.svg)
