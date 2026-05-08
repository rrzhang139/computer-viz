# art — 00_computer/_pcie

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

- Stylized SVG of the link as a *bundle of glowing lanes* between `[CHIP]` (LEFT) and the peripheral (RIGHT). Each lane = a thin double-stripe (TX above, RX below) with copper-orange gradient. Particles flow rightward along TX, leftward along RX.
- TOP edge: a faint LTSSM state ribbon (control, orange `--color-control`).
- BOTTOM edge: implicit ground plane (never drawn per INVARIANTS).
- Children zoom hotspots: rectangular outline around one stripe pair → `02_lane`; an oblong packet shape moving along the bundle → `02_tlp`.

## Reasoning

The `[PCIE]` edge has no single "thing" to photograph at this scope (it is the *protocol relationship* between sockets), and the user needs to read direction + parallelism + framing all at once. Tier 3 stylized SVG with gradients and particle flows shows lane-aggregation and full-duplex separation in one glance, and gives clean drill-points to the two child levels. Tier 1 is reserved for the slot itself if photographed at the parent `00_computer` board level; Tier 2 is reserved for the lane-internal differential-pair scene.
