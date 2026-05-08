# art — 00_computer/01_chip/02_core/03_prefetch

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

- Stylized SVG: a row of stream-tracker tiles, each a tiny scope showing observed addresses on a number line with a stride arrow. When a tile gains confidence, a "leading" arrow extends ahead and a glowing line-request shoots rightward toward [L1].
- Particles: demand-miss addresses arrive from the left as blue dots; the matching tracker absorbs them and fires anticipatory pink dots that "lead" the demand stream.
- Palette: storage purple tile bodies, data blue demand stream, active pink prefetch fires, control orange throttle gauge running across the top.

## Reasoning

<!-- Why this tier fits this level. -->
The educational point is the *temporal lead* of prefetch dots over demand dots — a moving picture concept. Tier 3 SVG with stride visualization captures it; a die-shot is meaningless here.
