# art — 00_computer/01_network/02_phy/03_line_driver

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

- react-three-fiber scene: an *eye diagram* rendered in 3D — superimposed differential waveform traces fold into themselves with depth-tinted history, forming the classic open eye. Camera frames the eye at the slicer's decision instant.
- Side-by-side: a 3D twisted pair extending RIGHTward into "infinity" (the cable). The line driver block sits on the LEFT as a small silicon slab; current particles flow along the pair, attenuating with depth (visualized as fading particle density) and being equalized at the far end.
- Toggle overlay annotates: rise time (~0.1 ns at 1G), eye height/width, FFE/DFE tap weights, and a small inset showing the hybrid subtracting TX echo from RX.

## Reasoning

The `[AFE]` story is fundamentally analog and continuous — voltage vs time, eye opening, attenuation — and Tier 3 SVG cannot honestly represent waveform overlap or depth-of-history. Tier 2 with a real eye-diagram and 3D particle flow on a twisted pair makes the analog story tangible. This is also the explicit Tier-2 assignment from the agent brief and parallels `_pcie/02_lane` (same substrate, same tier).
