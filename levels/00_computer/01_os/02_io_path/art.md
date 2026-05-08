# art — 00_computer/01_os/02_io_path

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

Tier 3 stylized SVG: a horizontal "river" of stages flowing LEFT→RIGHT across a translucent kernel slab. Each stage is a glowing waypoint (`syscall → VFS → pagecache → block → driver → DMA → disk`) drawn as a vertical pillar; the active stage pulses hot pink (`--color-active`). Bytes are blue particle packets (`--color-data`) hopping pillar to pillar; on a `[PCACHE]` hit the packet ricochets back to userspace early (visualized as a shortcut arc). Below the river: small representations of the actual subsystems' icons that this view borrows from sibling levels.

## Reasoning

The whole point of this level is to show *the path* — Tier 3's particle-flow + glowing-waypoint idiom is exactly that. Flat boxes-and-arrows would be the wrong tier; this is the canonical "system diagram you've seen once and want to make alive."
