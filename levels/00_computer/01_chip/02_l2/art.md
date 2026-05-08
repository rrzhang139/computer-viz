# art — 00_computer/01_chip/02_l2

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

Die-crop showing the L2 SRAM macro adjacent to a single core block — visibly larger and more uniform than L1, with periphery logic for tag/MSHR. Source: same `[CHIP]` die photo as parent (`02_core/`), tile labeled "L2 ~512 KB". Fallback prompt: "die-crop of an L2 cache block: one large SRAM macro adjacent to its host core, periphery tag/MSHR strip, photographic, hot-pink highlight on the active way."

## Reasoning

Confirming Tier 1 (per INVARIANTS table). L2 is a recognizable physical block on every modern die — the regular SRAM grid is one of the most photogenic features. Keeping `[L2]` Tier 1 preserves the chain `[CHIP]` → `[CORE]` → `[L1]`/`[L2]`/`[L3]` as a single continuous photographic zoom; symbolic structure (sets, ways, MSHR) appears as overlay on top.
