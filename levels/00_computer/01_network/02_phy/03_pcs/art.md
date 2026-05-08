# art — 00_computer/01_network/02_phy/03_pcs

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

- Stylized SVG: a "translation table" rendered as a glowing lookup matrix. Bytes (8 bits) enter from LEFT, scrambler XOR motif applies, then a 4D-PAM5 mapper splits the byte across 4 parallel pair-tracks emitting PAM-5 symbols (`-2, -1, 0, +1, +2`) RIGHTward.
- Animated bit-balance bar at TOP showing the running disparity (kept near zero by the encoder), and a transition-density meter showing why coding matters.
- Toggle overlay: byte ↔ coded-symbol mapping for the current value, and a comma/sync pattern callout.

## Reasoning

`[PCS]` is pure digital state-machinery and bit-twiddling — no photogenic feature, no volumetric depth. Tier 3 stylized SVG with the lookup-table metaphor and bit-balance/transition-density meters communicates *why* coding exists, not just that it does.
