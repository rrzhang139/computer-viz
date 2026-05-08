# art — 00_computer/01_ram

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 1-photo
```

Confirmed Tier 1. INVARIANTS.md tier table lists `01_ram` under "Photographic" — RAM is a thing you can hold in your hand.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Primary: top-down photo of a DDR5 UDIMM seated in a motherboard socket, green PCB with the gold-plated edge connector visible at the bottom and the row of black DRAM packages across the top. AI-prompt fallback: "high-resolution overhead photograph of a DDR5 desktop DIMM module on a black motherboard, sharp focus on chip packages and PCB silkscreen, studio lighting".
- SVG overlay: hotspots over each `[DRAM]` package (8 across the front side), one for the SPD chip, one for the edge-connector contact strip representing `_dram_bus`. Highlight box around any `[RANK]` group when overlay is on.

## Reasoning

A reader who has built a PC has touched a DIMM; the photo anchors abstract concepts ("memory" / "the heap") to the green stick they recognize. The SVG hotspots let zooming feel like pointing at a real chip rather than entering a box-and-arrow diagram, which is what the realistic-first rule (INVARIANTS.md) demands at this depth.
