# art — 00_computer/01_ram/02_rank

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 1-photo
```

Confirmed Tier 1. A rank is a physical row of DRAM packages on a DIMM PCB.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Primary: macro photograph of one face of a DDR5 DIMM showing the eight black BGA DRAM packages aligned in a row, with the ninth ECC chip optionally visible. AI-prompt fallback: "extreme close-up of a DDR5 DIMM PCB face, eight black BGA DRAM packages aligned across a green PCB, gold edge contacts at bottom, controlled studio lighting".
- SVG overlay: a horizontal bracket grouping all 8 chip packages with the label `[RANK]`; per-chip mini-bracket showing `DQ[0..7]`, `DQ[8..15]`, ... `DQ[56..63]`; CS# pin call-out at the edge connector.

## Reasoning

The rank concept is invisible inside any one chip but obvious in a wide shot of the DIMM — eight packages clearly act as one. A photo (Tier 1) makes the "8 chips × 8 bits = 64-bit word" arithmetic visual rather than abstract, and matches the parent `01_ram`'s photographic tier so zooming in feels like a focus pull, not a context switch.
