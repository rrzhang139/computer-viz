# art — 00_computer/01_chip/02_core/03_alu

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```
Changed from auto-suggested `1-photo`: while the ALU is identifiable on a die-photo as a recognizable rectangular block, V1 needs to show op selection, dataflow through the adder/shifter/mux, and the per-cycle settle — those are stylized concerns. Tier 3 fits.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

Rich stylized SVG, classic ALU "trapezoid" shape (wider on the input side, narrowing toward result):
- Body: large trapezoid in `--color-passive` slate, with a soft inner shadow + radial gradient highlight on the top half so it reads as a beveled metal block.
- LEFT inputs: two thick blue (`--color-data`) ribbons labeled `A` (top) and `B` (bottom) entering the wide side; ribbons split into 32-strand beads as they cross the boundary.
- TOP control: orange (`--color-control`) bus carrying the 4–5 bit `op` value; rendered as a labeled chip glyph above the trapezoid feeding a small mux fan-out into each functional sub-block.
- Internal sub-blocks visible through faint depth layering (semi-transparent rectangles inside the trapezoid):
  - **Adder lane** (top), **Logic lane** (AND/OR/XOR, middle), **Shift lane** (barrel shifter, animated stepwise), **Compare lane** (SLT/SLTU, bottom).
  - The lane corresponding to current `op` glows brightly in `--color-active` hot-pink; others remain dim.
- RIGHT result: single thick blue ribbon exits the narrow side, carrying the 32-bit result with a hex glyph readout overlay.
- Flags rail: thin band along the bottom of the trapezoid showing three small lamps (`Z`, `N`, `V`); active ones glow in their respective tints.
- Animation per cycle:
  - On op arrival from TOP: a brief orange pulse radiates from the op chip; the chosen lane lights.
  - Data tracers (blue particles) flow LEFT→RIGHT through the active lane during the cycle, converging at the mux on the right edge.
  - At end of cycle: the result ribbon "snaps" to the new value with a quick glow flare.
- Background: dark `--color-bg` with very faint die-floorplan grid, suggesting "this lives on a chip."

## Reasoning

<!-- Why this tier fits this level. -->
The ALU's instructive content is *which op fired this cycle* and *what value came out* — both stylized concerns. Tier 3 with a glowing-lane animation tied to `aluOp` lands those exactly; a die-photo would be too coarse, and a 3D scene wouldn't add information.
