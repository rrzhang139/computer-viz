# art — 00_computer/01_chip/_interconnect_ring

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

Custom rich SVG. A schematic ring laid out around the core+L3 grid (overlaid on a translucent die-crop ghost layer for spatial anchoring). Each stop = a small node icon (core / L3-slice / memctrl). Particles travel along the ring carrying class-coded color: data-blue for fills, control-orange for snoops, hot-pink for the active transaction. Multi-class virtual channels rendered as stacked translucent lanes. Backpressure shown as a slowing/queue-buildup at a stop.

## Reasoning

Confirming Tier 3 (per INVARIANTS table) — the listed cohort includes `_interconnect_ring`. The actual ring routing on a die is a tangle of metal traces invisible at any zoom level you'd want to look at. The pedagogical content is "messages move stop-by-stop with ordering and class," which is pure information flow — animated stylized SVG is the only way to render it legibly. Keeping a ghosted die background preserves "still on the chip" continuity.
