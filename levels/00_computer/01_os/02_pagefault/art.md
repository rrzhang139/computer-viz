# art — 00_computer/01_os/02_pagefault

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

Tier 3 stylized SVG: an entry node at TOP (the trap, with `stval`/`scause` labels) branching into three radiating paths: `minor` (short loop, returns quickly via `[SLAB]`), `major` (long loop down to disk via `[PCACHE]`/`[BLOCKQ]`), `segv` (terminal red branch into `[SIG]`). The faulting `[PROC]` is paused (greyed) while one path lights up (`--color-active`); on resolve, a new PTE drops into `[PT]` (visualized as a leaf cell brightening). Color-coding: minor = soft purple, major = warm orange, segv = red `--color-active`.

## Reasoning

A page fault is a *decision tree* with strikingly different consequences (1 µs vs 1 ms vs death). Tier 3 with branching paths that visibly differ in length and color makes the cost intuition immediate. Showing `[PROC]` pausing and resuming on the same view is essential.
