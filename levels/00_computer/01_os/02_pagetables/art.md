# art — 00_computer/01_os/02_pagetables

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

Tier 3 stylized SVG: a 4-level radix-tree visualization, root at TOP, leaves at BOTTOM, drawn with depth (semi-transparent layers per level so the user perceives 3D-like recession). Each node = a 512-slot frame tile (drawn as a small grid). The walker traces a path: index L3 → load PTE → follow PPN to L2 frame → index L2 → ... → leaf, with a hot-pink (`--color-active`) breadcrumb glow. Most subtrees are dimmed/sparse to convey that the tree is mostly absent. RV32-Sv32 simplification toggle: collapses to 2 levels. PTE flag bits visible on hover.

## Reasoning

A radix tree screams for a depth-stacked Tier 3 render — flat boxes destroy the "indirection through indirection" intuition. Animating the breadcrumb makes a 4-step walk visceral; sparse rendering communicates *why* multi-level beats flat. The RV32 toggle lets the same component honor RISC-V's actual 2-level Sv32 without abandoning the more familiar 4-level mental model.
