# art — 00_computer/01_chip/02_core/03_pipeline/04_hazards

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

- Stylized SVG: a top-down view of the pipeline scaffold with comparator wedges drawn between ID source-tag and EX/MEM/WB dest-tag busses. When tags match, the comparator wedge glows; if forwarding cannot save it, a stall halo wraps the IF/ID latches.
- Particles: a stall halo is an orange "freeze" overlay that pulses while [HAZ] holds a stage; bubble insertion is a faded grey NOP-shape sliding into EX.
- Palette: storage purple latches, control orange stall/bubble signals, active pink the matched comparator, slate inactive.

## Reasoning

<!-- Why this tier fits this level. -->
The lesson is "the hazard is detected by *comparing tags across stages*"; that's a parallel-comparator visual, perfect for Tier 3. A photo can't show a comparator firing.
