# art — 00_computer/01_chip/02_l3/03_directory

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

Custom rich SVG. A vertical ledger of directory entries; each row = line-address (data-blue) + sharer-bitvector rendered as a strip of N tiny core-icons (pink = sharing, slate = not) + state badge. On a coherent op, particles fly out to *only* the lit core-icons (visually shorter than broadcast). A side panel labels "snoop filter" and "sharer set" with hover tooltips.

## Reasoning

Confirming Tier 3 (per INVARIANTS table). The directory is logically a CAM/SRAM table; the photogenic content (SRAM rows) is already the same as L3's. The instructive content is *which cores get snooped vs not* — only an animated, labeled bitvector view shows that. Stylized SVG reinforces "this is the snoop-filter trick that makes coherence cheap."
