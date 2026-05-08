# art — 00_computer/01_os/02_vfs/03_inode

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

Tier 3 stylized SVG: an inode card showing the metadata fields as a stack (mode/uid/gid/size/times/nlink), with a block-pointer table below it (`{direct[12], indirect, double, triple}` or extent tree, depending on filesystem). On read, a pointer lights up and emits a beam to the corresponding block in `[BLOCKQ]`. The address_space pointer projects upward to a `[PCACHE]` page strip. Hardlink visualization: two `[DENTRY]` cards on top with arrows converging on the same inode card.

## Reasoning

The "card with fields + pointer table" picture is the canonical inode mental model; Tier 3 lets us render it with depth + animated pointer-following, which is essential for grokking how `read(offset)` becomes a block address.
