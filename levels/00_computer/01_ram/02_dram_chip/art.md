# art — 00_computer/01_ram/02_dram_chip

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 1-photo
```

Confirmed Tier 1 per INVARIANTS.md (DRAM package is hardware you can see). Use a die-crop, not a generic chip photo.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Primary: a top-down die-shot of a DDR5 DRAM (decapped or vendor-published floorplan), showing the **8 rectangular bank arrays** arranged 2x4 with the peripheral logic ring along the long edges. AI-prompt fallback for placeholder: "decapped DRAM die top view, 8 rectangular bank arrays in a 2x4 grid, peripheral logic strips around the edges, monochrome silicon, sharp microscope optics".
- SVG overlay: bank-array hotspots (8 of them, click → `03_bank/`); peripheral ring labels — CA decoder, mode regs, refresh counter (click → `03_refresh/`), DQ I/O block, DLL.

## Reasoning

A real die-shot makes the "bank" abstraction physically obvious: you can literally see 8 identical rectangles. Tier 3 stylization would lose that recognition. The peripheral ring becomes its own narrative — anything that isn't a bank array is "the part that talks to the bus and keeps capacitors alive".
