# art — 00_computer/01_os/02_pagecache

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

Tier 3 stylized SVG: a large grid of glowing 4 KB page tiles, grouped into stacks per `[INODE]` (each stack = one file's `address_space`). Color encoding: clean = soft purple (`--color-storage`), dirty = warm amber (`--color-control`), under writeback = pulsing. Active page on hit lights hot pink (`--color-active`). LRU recency ordering shown as a left→right gradient (LRU on right, soon to evict). On miss, a tile blinks empty and a request beam exits BOTTOM to `[BLOCKQ]`; on fill, the page slides in.

## Reasoning

The page cache is a *huge population* of pages, and most of the intuition is statistical (lots of stuff cached, occasional miss flushes a tile). Tier 3 lets us render thousands of subtle tiles with depth and gradient state coding, where flat boxes would just look like a database table.
