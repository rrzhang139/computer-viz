# art — 00_computer/01_chip/02_core/03_frontend/04_ras

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

- Stylized SVG: a vertical stack of ~16 slots stacked low-to-high, top entry highlighted. A glowing arrow descends on push (blue particle representing PC+4 lands on top); on pop, the top entry detaches and exits rightward as `ras_target`.
- Palette: storage purple for slots, data blue for return address values, control orange for push/pop signals from top, active pink for the current TOS slot.
- Depth: subtle drop-shadow on the stack base; "stack pointer" shown as a small chevron sliding up/down the right edge.

## Reasoning

<!-- Why this tier fits this level. -->
A LIFO is best understood as a moving picture, not a static one — the stack pointer rising and falling on call/ret is the entire concept. Tier 3 SVG with particle motion lets us show that rhythm.
