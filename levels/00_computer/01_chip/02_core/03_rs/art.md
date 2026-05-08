# art — 00_computer/01_chip/02_core/03_rs

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

- Stylized SVG: a grid of slot cells. Each slot shows two operand-ready bits as glowing/dim dots. A horizontal "wakeup bus" runs above the grid, periodically lighting up tag T; matching `psrc` rows light their corresponding ready dot.
- Particles: tag-broadcast as a moving pulse along the wakeup bus; entries with both dots lit pulse pink and shoot a uop rightward to the issue arbiter, which routes to one of [ALU]/[AGU]/[MUL]/[DIV] columns.
- Palette: storage purple slot bodies, control orange wakeup bus, data blue uop payloads, active pink fully-ready slot about to issue.

## Reasoning

<!-- Why this tier fits this level. -->
The "ready bit flips, instruction wakes up, fires" pattern is the heart of OoO; it has to *animate* to land. Tier 3 with broadcast pulses is the right vocabulary; a die-shot would not show the wakeup mechanism.
