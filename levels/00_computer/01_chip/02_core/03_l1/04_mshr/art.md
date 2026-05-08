# art — 00_computer/01_chip/02_core/03_l1/04_mshr

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

Custom rich SVG. Vertical stack of ~8 entry rows; each row shows: line address (data-blue), state badge (idle/fetching/return — color shifts on transition), waiter bullets (purple dots, fade in as loads queue, fade out as fill returns). Animated particle: a request flying out the right side, then a fill streaming back, broadcast to all waiter bullets simultaneously. Depth via translucent layers; radial glow under the row that's currently filling.

## Reasoning

Confirming Tier 3 (per INVARIANTS table). MSHR has no photographic form — even on a die it's a small piece of CAM logic indistinguishable from neighbors. The instructive content is the *queueing dynamics* (allocate, merge, fill, dealloc) and the *parallelism* (multiple in-flight misses), which only animation can communicate. The rich-SVG ledger view shows hit-under-miss in one frame.
