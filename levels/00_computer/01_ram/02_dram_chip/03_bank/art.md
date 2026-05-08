# art — 00_computer/01_ram/02_dram_chip/03_bank

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. A bank's logical structure (row decoder, cell matrix, sense-amp strip, row buffer) is what teaches the row-buffer-locality story; a die photo at this zoom would be a featureless grid of capacitors. Need rich SVG with gradients, glow, and animated charge flow.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Stylized layout: row decoder column on LEFT (purple `--color-storage` gradient bar with row indices), cell matrix as a faint `[DCELL]` lattice in the center (subtle storage-purple dots on a dark background), sense-amp strip along the BOTTOM as a glowing horizontal bar, column decoder + I/O latch on the BOTTOM-RIGHT.
- Particle/charge animations: on ACT, a pink `--color-active` pulse travels down the chosen wordline from the row decoder, igniting the sense-amp strip (the row buffer); on RD, a blue `--color-data` packet emerges from the column decoder rightward; on PRE, the row buffer fades back to the lattice level.
- Depth: 2-3 semi-transparent layers — backlit cell lattice, mid-layer wordlines/bitlines, foreground decoders + sense-amp strip.

## Reasoning

The bank is where the visualization's most important performance lesson lives ("same row is fast, new row is slow"). That story needs **animated state**, not a static photo: the row buffer must visibly light up on ACT, stay lit through subsequent column accesses, and dim/clear on PRE. Tier 3 stylized SVG with gradients and particle flows is the only way to show charge moving.
