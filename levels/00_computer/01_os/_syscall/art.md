# art — 00_computer/01_os/_syscall

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

Tier 3 stylized SVG: a vertical "membrane" between U-mode (top) and S-mode (bottom) drawn as a translucent gradient sheet, briefly punctured by a hot-amber `ECALL` particle that crosses down (`--color-control`) carrying register payloads as small blue cells (`--color-data`). The membrane closes; a second amber pulse rises back through with `a0` (return value). Three labeled phases: `enter` (trap), `handle` (kernel runs), `return` (SRET). The membrane shimmer encodes the privilege change.

## Reasoning

A syscall has no physical body — it's a discontinuity in privilege. Tier 3 lets us animate the puncture/reseal, label the CSR transitions, and show that the *same `[CORE]`* keeps running but in a different mode. Particles let timing be visible; gradients distinguish U vs S without two-pane separation.
