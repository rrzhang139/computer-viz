# art — 00_computer/01_ram/02_dram_chip/03_refresh

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. Refresh has no physical embodiment — it is a control protocol expressed as a row counter sweeping through the bank. The story is dynamic and abstract: a moving pointer, a pulse traveling down rows, a bandwidth tax. Stylized SVG with gradients and animated flows is right.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Layout: a stylized ghost-image of the bank's row stack on the left (faded purple `--color-storage` lattice), with a vertical row-counter cursor (orange `--color-control`) sweeping top-to-bottom; on the right, a circular dial showing `tREFI` ticks; below, a thin horizontal "bandwidth" bar showing reads (blue) being briefly displaced by REF (orange) every tick.
- Animations: on each REF command, the cursor jumps to its current row and a bright orange pulse flashes across that row, followed by a brief purple "recharge" glow on the swept cells (signaling charge restored). At full sweep (~64 ms wall, ~8 anim sec), the cursor wraps back to row 0.
- Optional time-warp visual: a "leakage" ghost trail on rows that haven't been refreshed yet — the longer ago they were touched, the more faded their purple — reseeding to bright purple as the cursor passes.

## Reasoning

The teaching goal is "every cell leaks; refresh quietly fixes them all on a schedule, costing some bandwidth". That is purely a *temporal* story. A photo can't show a sweep over time, and a 3D scene would obscure the per-row regularity. A rich-stylized 2D SVG with a moving cursor and a fading-then-recharging row palette captures the physics and the cost in one frame.
