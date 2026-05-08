# art — 00_computer/01_chip/02_core/03_frontend/04_btb

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

- Stylized SVG: a tag-array grid (rows = sets, cols = ways), with a glowing "lookup beam" entering from the left (PC), a comparator column on the right, and a target-out beam exiting right.
- Palette: `--color-storage` (purple) for cell bodies, `--color-data` (blue) for the lookup beam, `--color-active` (pink) for the matching row.
- Particles: a single bright dot races down the indexed row on each lookup; on hit, the target field flashes and emits a target-arrow rightward.

## Reasoning

<!-- Why this tier fits this level. -->
A BTB has no canonical photo — it's a logical SRAM array. Tier 3 lets us animate the *parallelism* (PC enters, all tags compared simultaneously) which is the educational point.
