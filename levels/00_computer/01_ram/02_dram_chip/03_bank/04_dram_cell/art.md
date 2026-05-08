# art — 00_computer/01_ram/02_dram_chip/03_bank/04_dram_cell

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 2-3d
```

Confirmed Tier 2 per the assignment hint and INVARIANTS.md (`physical depth + particles required`). The story of a DRAM cell is "charge sits on a tiny capacitor and slowly leaks" — that needs a 3D scene with visible charge particles to land.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- 3D scene (react-three-fiber): silicon-tone substrate; the `[T]` access transistor as a small block with gate (wordline, orange `--color-control`) coming in from the TOP, source (bitline, blue `--color-data`) from the LEFT; the storage capacitor as a vertical metal-oxide-metal stack on the RIGHT, with a translucent dielectric and a glowing fill volume representing stored charge. Camera defaults to a 3/4 isometric view; user may orbit slightly.
- Materials: PBR-ish — silicon (matte grey-brown), copper interconnect (warm metallic), oxide (translucent blue-grey), with subtle subsurface scattering. Charge represented as a cluster of `--color-storage` (purple) point particles inside the cap volume.
- Animations: on write, particles stream LEFT→RIGHT along the bitline through the transistor channel and accumulate in the cap. On read, wordline pulses orange, particles drift back onto the bitline, partially depleting the cap (destructive read). On idle, particles slowly seep out (leakage), motivating refresh.

## Reasoning

A capacitor "leaking" is the single most important physical fact in this entire subtree, and you cannot show leakage in a flat SVG without it looking like a cartoon. A 3D scene with literal particles makes "the bit is dripping out of the cap" a thing you can watch, which is exactly the realistic-first rule's intent (INVARIANTS.md → "What 'realistic' requires per tier").
