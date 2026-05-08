# art — 00_computer/01_disk/02_ssd_controller/03_gc

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

Stylized SVG of an array of NAND blocks as a grid of vertical "bins", each filled with valid (purple) and stale (slate) page tiles, one block being actively compacted.

Layout (LEFT data, RIGHT data, TOP control):
- LEFT: per-block valid/stale histogram bars from `[FTL]`
- CENTER: a row of ~16 block bins, each composed of stacked page tiles. Stale tiles are dim slate (`--color-passive`); valid tiles glow purple (`--color-storage`). The chosen victim block has a pink (`--color-active`) outline. A sweep-arrow lifts valid tiles out of the victim and floats them rightward to a new "open" block.
- RIGHT: a freshly emptied block flashes white and falls back into the free-block pool (a queue of grey block silhouettes)
- TOP: orange (`--color-control`) "trigger" lightning bolt when free-pool low watermark crossed; small "host idle" lamp gating GC progress

Visual language:
- Valid-page particles trail a long purple comet behind them as they migrate
- The block being erased flashes orange→white over `tBERS` (~5 ms in level units, see TIME_AXIS row `03_gc`) then resets to all-empty page tiles
- A small "write amplification" counter ticks up with each migrated page

## Reasoning

GC is invisible firmware — there is no photo of it. The one thing the user must internalize is "we are copying valid pages out then erasing the whole block, and this happens in the background, charged to the user's bandwidth." Tier 3 stylized SVG with animated tile migration and a glowing victim is the most direct way to make that visceral. A flat diagram would lose the motion that is the whole point.
