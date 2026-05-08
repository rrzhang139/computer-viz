# art — 00_computer/01_os/_mmap

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

Tier 3 stylized SVG: three vertically-stacked layers connected by glowing tendrils — TOP a slice of `[PROC]` virtual address space (the VMA range as a colored band), MIDDLE the `[PCACHE]` page tree for the file (a row of slots), BOTTOM the `[INODE]` block map. A `mmap()` call materializes the VMA and pulls fluorescent fibers between matching slots; on first touch the fiber lights up, a page fault flares, and a page slides from disk → pagecache → VMA. Anonymous mmap (no file) shows fibers attaching only to the zeroed slab pool.

## Reasoning

The whole intuition of mmap is "pages and files are two views of the same thing"; Tier 3's stacked translucent layers + connecting fibers makes that *one diagram* rather than three separate boxes. Animation of first-touch is essential.
