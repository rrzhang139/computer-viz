# art — 00_computer/01_os/02_block_layer

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

Tier 3 stylized SVG: a queue laid out horizontally, with bio "tickets" sliding in from LEFT (each carrying LBA + length + direction); adjacent tickets with mergeable LBA ranges fuse into longer requests (visible coalescing). Multi-queue rendering: one lane per CPU. The scheduler is a mechanism that pops the head and emits a request RIGHT toward `[DRV]`. Color: read = blue (`--color-data`), write = warm `--color-control`. Completion bios return LEFT through a parallel lower lane in muted tone.

## Reasoning

The block layer's whole point is *queueing + merging*; Tier 3's particle-on-conveyor metaphor with visible fusion of adjacent tickets is the right imagery. Per-CPU lanes make the mq design legible.
