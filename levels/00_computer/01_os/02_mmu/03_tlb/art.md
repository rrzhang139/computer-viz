# art — 00_computer/01_os/02_mmu/03_tlb

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

Tier 3 stylized SVG: a horizontal row of ~16 visible glowing slots (the rest dimmed, as "more entries"), each carrying `{VPN | ASID | PPN | RWXU}`. Incoming `VPN` (`--color-data`) compares in parallel against all slots simultaneously (CAM lines flash); on hit the matched slot glows hot pink (`--color-active`) and emits `PPN` to RIGHT. On miss, all slots flash red briefly and a beam exits DOWN to the page-table walker. ASID color band on each slot makes inter-process separation visible.

## Reasoning

A TLB is a small associative memory that needs to feel "parallel-checked, instant, tiny" — Tier 3 gradients + simultaneous flash render that better than a labeled table. The slot-glow on hit is the natural execution-pointer highlight.
