# art — 00_computer/01_chip/02_memctrl

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

Die-crop of the DDR PHY/IMC region — recognizable by the long row of repetitive PHY slices along one edge of the die, each lane visible as a regular structure, with the controller logic inboard of the PHY. Source: same `[CHIP]` die photo (Zen 4 has very visible IMC + DDR5 PHYs along the IO die edge; Apple silicon has UMA-LPDDR PHYs along the periphery). Fallback prompt: "die-crop of the integrated memory controller and DDR PHY region of a CPU, repetitive PHY lane slices along the die edge, controller logic inboard, photographic, hot-pink highlight on the active channel."

## Reasoning

Confirming Tier 1 (per INVARIANTS table). The IMC + DDR PHY is one of the most recognizable peripheral regions on any CPU die — the regular PHY lane structure is photogenic and instantly readable as "memory IO." Keeping it Tier 1 holds the chip-zoom continuous before the DDR bus itself drops into Tier 2 (`_dram_bus`) for the analog signaling story.
