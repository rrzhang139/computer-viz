# art — 00_computer/01_chip/02_core/03_storeb

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

- Stylized SVG: a vertical column (oldest at top = drain end, youngest at bottom). Each entry shows {addr-valid dot, value-valid dot, retired flag}. A "drain valve" at the top pulses open when [ROB] retires the head — entry slides out toward [L1].
- Particles: snoops from [LQ] arrive as horizontal beams; matching entries reflect a value-particle back leftward toward the LQ.
- Palette: storage purple slot bodies, data blue store values, control orange retire/drain signals from top, active pink head-being-drained, dim-grey for not-yet-retired entries.

## Reasoning

<!-- Why this tier fits this level. -->
The SB's identity is *waiting* — sitting on a value until it's safe to write. Tier 3 SVG with the head's retire flag flipping then a particle leaving is the right metaphor; a die-shot would not show the retire-gating.
