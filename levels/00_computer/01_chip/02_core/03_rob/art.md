# art — 00_computer/01_chip/02_core/03_rob

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

- Stylized SVG: a long circular ring buffer drawn vertically (head at top, tail at bottom). Each slot shows {pc-suffix, pdst, completed-flag, exc-flag} compactly. Newly-arrived entries glow at the tail; completed-but-not-retired entries pulse blue; exception entries flash red.
- Particles: completion signals arrive from execution units as bright streaks lighting individual rows; on retire, the head row's pdst_old chip flies leftward back to [FL].
- Palette: storage purple for slot bodies, data blue for completion bits, control orange for retire/flush signals, active pink for the current head, red-tint for exception entries.

## Reasoning

<!-- Why this tier fits this level. -->
The ROB's defining behavior is *out-of-order completion, in-order retirement* — slots filling completed-bits in arbitrary positions while only the head is allowed to leave. Tier 3 SVG with per-slot state animation is the only way to show that asymmetry; a die-photo would just show an SRAM block.
