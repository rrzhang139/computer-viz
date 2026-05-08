# art — 00_computer/01_chip/02_core/03_agu

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```
Confirmed: the AGU's instructive content is "base + offset → address" with sign-extension fanning the small immediate to 32 bits. That is purely a stylized SVG concern.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

Rich stylized SVG — a slim, focused unit (the AGU is a sub-block of the core, not as visually weighty as the ALU):
- Body: a rounded rectangle with a `--color-passive` slate gradient, narrower than the ALU; subtle inner shadow.
- LEFT inputs:
  - `rs1_val` enters as a thick blue (`--color-data`) ribbon at upper-left, labeled with the source register name (e.g., `x4`).
  - `imm12` enters as a thinner blue ribbon at lower-left, with a small 12-segment LED-strip glyph showing the literal 12 bits.
- A **sign-extension fan** sits at the lower-left interior — visually a small triangle that "spreads" the 12-bit ribbon into a 32-bit ribbon, with bit-13..31 highlighted with a "copy of bit 11" glow to convey the sign-extend rule.
- Center: an **adder cone** (chevron-shaped block with `+` glyph) consuming both 32-bit ribbons; tinted in `--color-control` orange interior to signal "this is a control-driven address compute" (color contrast with ALU).
- RIGHT output: `EA` ribbon exits as a thick blue ribbon at the right edge, with a 32-bit hex display (`0x00001004`-style) overlay.
- TOP control: `kind` chip (`load`/`store` glyph) sits above the unit, lit in `--color-control` orange — used downstream, not consumed by the AGU's compute, but visually plumbed to the output.
- Animation per cycle:
  - When the current instruction is a load/store: the immediate ribbon highlights in `--color-active` hot-pink as the bits arrive.
  - The sign-extension fan briefly sparkles to convey the bit-replication.
  - The adder cone glows; a small data parcel exits the right edge as `EA`.
- Idle drift particles slowly along the rs1 ribbon (data-blue) so the unit feels live even between memory ops.
- Symbolic overlay: the equation `EA = rs1 + sext(imm12)` rendered above the adder, plus the resolved hex EA, plus `kind=load|store`.

## Reasoning

<!-- Why this tier fits this level. -->
The AGU's whole purpose is the equation `EA = base + sign-ext(offset)`. Showing the sign-extend fan as a literal "spread" makes the operation tactile. A 3D scene buys nothing here; a die photo wouldn't differentiate the AGU from the ALU. Tier 3 is the right rung.
