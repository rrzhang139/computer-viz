# art — 00_computer/01_chip

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 1-photo
```

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

Annotated die-shot of a modern multi-core x86 / Apple-silicon CPU with visible core grid, ring/mesh, L3 slices, and memory-controller IO. Preferred sources: AMD Zen 4 / Intel Meteor Lake / Apple M-series die photos from press kits or WikiChip (with attribution). Fallback: AI-generated die-render prompt — "top-down annotated CPU die, visible CCX of 8 cores around shared L3 slices, ring interconnect, two DDR5 PHYs at the edge, hot-pink highlight on one core, photographic detail."

## Reasoning

`[CHIP]` is the most "you can hold it" object in the whole tree — the realistic default has to look like a piece of silicon, not a block diagram. Tier 1 die-shot lets the user point at the actual core array and ring; SVG hotspots route clicks to `02_core/`, `02_l3/`, `02_memctrl/`. Symbolic overlay then labels the named regions and ring traffic. Anything more abstract here would betray the "you buy this" framing.
