# art — 00_computer/01_chip/02_core/03_loadq

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

- Stylized SVG: a vertical column of load entries (oldest at top), each showing {addr, size, rob_id, value-pending state}. To the right, a parallel column shows the [SB] entries; arrows fan out as snoop comparators light up matching pairs.
- Particles: when a load executes, a fan of comparator beams sweeps over [SB]; on hit, a value-shaped particle teleports from the [SB] match to the LQ entry (forwarding); on miss, an arrow exits right toward [L1].
- Palette: storage purple slot bodies, data blue values, control orange snoop signals from top, active pink current load, red flash on violation.

## Reasoning

<!-- Why this tier fits this level. -->
The educational moment is *snoop the store buffer in parallel with cache lookup* — entirely a parallel-comparator dance. Tier 3 SVG with multi-arrow animation captures it; a die-shot would not show the snooping.
