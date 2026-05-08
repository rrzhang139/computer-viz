# art — 00_computer/01_chip/02_core/03_l1/04_write_buffer

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

Custom rich SVG. A horizontal FIFO of ~16 cells, each cell showing addr | byte-mask | data with the youngest at the right edge. Drain particle flows out the right into the L1-D `[CL]` ribbon. Forwarding shown as a translucent purple arc curving back from a matching entry to a younger load box hovering above the buffer. Coalesce events: two adjacent cells merge with a quick gradient flash. Depth via stacked layers; passive cells dim, the active drain row glows.

## Reasoning

Confirming Tier 3 (per INVARIANTS table). The write buffer is a queue with a CAM bolted on; physically it's a small SRAM/CAM block on the die, but the *interesting* content is the queueing + forwarding behavior. A rich-SVG ledger view animates drain, coalesce, and store-to-load forwarding all at once — none of which a die-crop could show.
