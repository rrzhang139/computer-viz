# art — 00_computer/01_chip/02_core/03_pipeline/04_forward

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

- Stylized SVG: a side view of the EX stage showing two operand muxes (3 inputs each: regfile / EX-MEM-fwd / MEM-WB-fwd). Glowing curved arrows fly *backwards* in the time-axis from later stages back to EX whenever forwarding is selected.
- Particles: when `fwd_a_sel != regfile`, a value-particle teleports from the producing latch to the EX input, leaving a comet trail.
- Palette: data blue value paths, control orange mux-select bus from top, active pink the path actually selected this cycle.

## Reasoning

<!-- Why this tier fits this level. -->
Forwarding is *the* "back-in-time" arrow that explains why pipelines work as well as they do. Tier 3 with backward-flying value-particles is the only way to make that vivid; a die-crop would not show the value re-routing.
