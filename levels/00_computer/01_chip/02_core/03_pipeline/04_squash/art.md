# art — 00_computer/01_chip/02_core/03_pipeline/04_squash

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

- Stylized SVG: a small command-center node with fanout lines reaching to every kill input across the chip (pipeline latches, RS, LQ, SB, frontend, RAT). When a flush fires, a red wave radiates outward along these lines and the touched components dim/erase their wrong-path content.
- Particles: the flush wave is an expanding red ring; each affected target flashes once and clears. A green redirect-PC arrow then flies from [SQ] to the frontend.
- Palette: storage purple FSM body, control orange the kill fanout, red-tint the active flush wave, active pink the redirect-PC arrow, slate inert otherwise.

## Reasoning

<!-- Why this tier fits this level. -->
The [SQ] is invisible until it acts, and when it acts it acts everywhere at once. Tier 3 with a radial flush wave conveys "kill everything younger than X" instantly; a static photo cannot.
