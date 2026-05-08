# art — 00_computer/01_disk/02_nand_die

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

Top-down die-shot of a 3D NAND flash die with its package opened. References: TechInsights die-photos of Samsung V-NAND / Micron B47R / Kioxia BiCS / SK Hynix 4D. The image should show the rectangular die with 2–4 planes visible side-by-side, each plane a tall checkerboard pattern of blocks; peripheral logic / page-register strip along one edge.

SVG hotspots over the die crop:
- one plane (one of the side-by-side rectangles): hotspot pulses on read/program; click → drills further (no Phase 1 child for plane, but a future level)
- a single block within a plane (one tile of the checkerboard): hotspot zoom highlight
- a single page (one row of a block): smallest hotspot — click → `03_nand_cell/`
- bottom edge "page register / sense amp" row: hotspot annotated as the ONFI staging buffer; the channel `[FCH]` connects here
- LEFT edge: ONFI pad ring → routes back to `_flash_channel/`

AI-generation prompt fallback: "high-resolution decapsulated NAND flash die photograph, top-down view, 4 vertical planes side by side each rendered as a tall blue-grey checkerboard of blocks, peripheral logic strip along bottom edge, microscope-quality detail, false-color enhancement, no logos."

Symbolic overlay (toggle on):
- A red "wear counter" badge over a worn block; a "valid/stale" mosaic over a block currently being GC'd
- Over an active plane: glowing arrow showing tR / tPROG / tBERS state and remaining time (driven by ExecutionState `diskActivity.stage`)

## Reasoning

The `[NAND]` die is real silicon with visible structure — planes are literal rectangles on the die, blocks are visible checkerboard tiles. Tier 1 photo with hotspots makes that physical structure click instantly. The asymmetry lives in the timing, not the geometry, so the visual nails the geometry and the symbolic overlay carries the timing story.
