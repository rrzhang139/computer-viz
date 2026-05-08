# art — 00_computer/_pcie/02_lane

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 2-3d
```

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- react-three-fiber scene: two parallel copper traces (TX+ above TX−) and a second pair below (RX+/RX−). PBR copper material on a green FR-4 substrate. Particles (electrons) drift along TX+ rightward and TX− leftward in antiphase, illustrating differential.
- Camera: 3/4 oblique looking down the trace; orbitable ±15°.
- TOP overlay: SerDes EQ preset value as a small floating tag (control orange).
- LEFT/RIGHT: SerDes blocks rendered as small dark silicon dies at each end; bond-pads visible.
- A toggle (overlay=on) annotates UI = 62.5 ps, one symbol = 130 bits (128 data + 2 sync), and adds an eye-diagram inset.

## Reasoning

A lane is fundamentally a *3D physical object* whose meaning is in the antiphase voltage difference between two traces — flat SVG would lose the "two wires, opposite swings, common-mode noise rejected" intuition. Tier 2 with particle motion makes that immediate. Sits next to `01_network/02_phy/03_line_driver` which uses the same tier for the same reason.
