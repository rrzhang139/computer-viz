# art — 00_computer/01_chip/02_core/03_rename

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

- Stylized SVG: a 32-row arch-register table on the left (x0…x31), a much wider physical-register pool implied on the right; bright arrows draw arch→phys connections that re-route as new instructions are renamed.
- Particles: when a uop arrives, three glowing dots highlight the rs1, rs2, and rd rows; the rd row's arrow pivots to a new physical tag pulled from [FL].
- Palette: storage purple for table rows, data blue for arch-reg values flowing in/out, control orange for allocate signals from top, active pink on the freshly remapped row.

## Reasoning

<!-- Why this tier fits this level. -->
Rename is conceptually a *re-routing* operation; the educational moment is watching arch x3 point first to p17, then to p42 after a write — entirely a graph-edge animation. Tier 3 SVG with morphing arrows captures it.
