# art — 00_computer/01_chip/02_core/03_l1

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

Crop of an SRAM-array region from the same per-core die used at `02_core/`: two visibly regular SRAM macros (I and D) tagged with their KB capacity, plus the small tag-compare and MSHR strips alongside. Source: the `[CHIP]` die photo (Zen 4 / M-series core block, SRAM macros are very visible). Fallback prompt: "die-crop of an L1 cache region, two split SRAM macros labeled I-32 KB and D-32 KB, periphery logic strip below for tag/MSHR, photographic."

## Reasoning

Confirming Tier 1 (per INVARIANTS table). SRAM arrays are one of the most photogenic things on a die — perfectly regular and instantly readable as "memory." Keeping `[L1]` photographic preserves the "I'm still pointing at the silicon" feel before the next zoom drops into Tier 3 stylized territory (`[CL]`, `[MSHR]`, `[MESI]`, `[WB]`) where the structure is logical, not optical.
