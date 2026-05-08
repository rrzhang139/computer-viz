# art — 00_computer/01_os/02_vfs/03_dentry

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

Tier 3 stylized SVG: a forest of small dentry tiles arranged as a tree (root `/`, then its children, then theirs). A path lookup `/home/alice/data.txt` traces a glowing breadcrumb step-by-step (`--color-active`), each tile pulsing as it's hashed and matched. Negative dentries are shown as faint ghosted tiles. Each tile has a slim arrow down to its `[INODE]` card. Hash-table layer rendered below as a row of buckets; hit shows a quick down-then-up flash from the bucket.

## Reasoning

Path traversal is sequential and visible; Tier 3's tree + breadcrumb idiom matches it exactly. Negative dentries deserve to be visible (often forgotten); ghosted tiles encode that without clutter.
