# art — 00_computer/01_chip/02_core/03_regfile/04_register

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```
Changed from auto-suggested `1-photo`: a single architectural register has no separate die-photo identity. Tier 3 (stylized SVG with the 32 cells visibly latching together) is the right fit per the task hint.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

Rich stylized SVG of a 32-bit register:
- A horizontal strip of **32 cells**, each cell rendered as a small rounded rectangle with a `--color-storage` purple gradient fill. Each cell visibly contains a glyph showing its current bit (0 or 1) in `--color-fg`.
- 32-bit input bus enters from LEFT as a thick blue (`--color-data`) ribbon that splits into 32 thin strands, one per cell.
- Single CLK rail along the TOP in `--color-control` orange, fanning out 32 short orange tap-lines, one per cell.
- 32-bit output bus exits to RIGHT, mirror of the input bus.
- Latch animation on rising clock edge:
  - A bright orange pulse traverses the CLK rail LEFT→RIGHT in ~80 ms.
  - As it sweeps, each cell briefly flashes (radial glow), and any bit changing (0↔1) flips its glyph with a quick fade.
  - After the pulse, the output bus tints to reflect the new word; a subtle particle ribbon along it (data-blue) signals "value is now driving downstream consumers."
- Background: dark `--color-bg`; thin guide lines mark bit boundaries (b31 on LEFT, b0 on RIGHT — convention: MSB-left).
- Symbolic overlay: cell indices `b31..b0`, hex value of the word, the register name (e.g., `x1`) injected from parent regfile context.

## Reasoning

<!-- Why this tier fits this level. -->
A register is 32 cells acting as one unit on a shared clock — that "unit-ness" *is* the abstraction. The right visual is a coherent strip with one synchronized animation, not a 3D model (no meaningful 3D structure) and not a die photo (invisible at this scale). Tier 3 with a sweep animation makes the synchrony tangible.
