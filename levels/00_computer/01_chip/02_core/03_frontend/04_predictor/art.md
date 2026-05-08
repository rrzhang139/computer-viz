# art — 00_computer/01_chip/02_core/03_frontend/04_predictor

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

- Stylized SVG: a long row of 2-bit counter cells, each shaded by state (00=strong-NT slate, 01=weak-NT, 10=weak-T, 11=strong-T pink). XOR hasher shown as a wedge fusing PC bits (blue) with GHR bits (orange-tinted control color) into the index.
- Particles: bit-stream sliding through GHR shift register on each branch retire; index lookup highlights the indexed counter; on update, the indexed cell saturates one notch and "settles".
- Palette: storage purple for cells, data blue for PC, control orange for GHR/training, active pink for current index.

## Reasoning

<!-- Why this tier fits this level. -->
The PHT's behavior is statistical and dynamic — counters drift over time. Tier 3 lets us animate the saturation in/out, the central educational insight ("two bits of inertia is what makes loops predictable"); a static photo cannot.
