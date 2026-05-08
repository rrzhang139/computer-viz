# art — 00_computer/01_chip/02_core

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 1-photo
```

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

Single-core die-crop with annotated functional blocks: frontend (top-left), regfile (center-left), execution units / ALU (center), L1-I and L1-D (bottom-left and bottom-right), L2 slice (right edge). Preferred: cropped tiles from the same `[CHIP]` die-shot used at the parent (Zen 4 / M-series core block) so zoom feels continuous. Fallback prompt: "annotated single CPU core die-block, frontend / regfile / ALU / L1 / L2 regions tinted in token colors, photographic, hot-pink highlight on the active stage."

## Reasoning

Confirming Tier 1 (per INVARIANTS table). The whole point of zooming from `[CHIP]` to `[CORE]` is "now I'm pointing at one of those tiles" — staying photographic preserves continuity. Symbolic overlay then labels Fetch / Decode / Exec / Mem / WB, and the execution-pointer pulses on the active stage from `ExecutionState.pipelineStage`. Tier 3 stylized is reserved for the deeper micro-arch units (decoder, hazards) that have no clean photographic form.
