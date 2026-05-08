# art — 00_computer/01_chip/02_l3

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

Die-crop of the LLC region — typically a strip of large SRAM macros running between or around the core grid, with each slice tagged. Source: same `[CHIP]` die photo, the L3 region is the largest on-chip SRAM block on most modern CPUs (Zen 3D V-Cache makes it especially photogenic; Intel ring-LLC is also clearly visible). Fallback prompt: "die-crop highlighting the L3/LLC strip across a multi-core CPU, ~8 visibly tiled SRAM slices labeled, ring stops at each slice, photographic."

## Reasoning

Confirming Tier 1 (per INVARIANTS table). L3 is the most visually obvious feature on any modern die; users instantly recognize "the big shared cache." Keeping it photographic continues the chain from `[CHIP]`. Inside, the deeper structure (`[DIR]`, `[VB]`, `[REPL]`) drops to Tier 3 stylized because those are logical/policy-level constructs, not optical regions on the die.
