# art — 00_computer/01_network/02_phy

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

- High-res top-down photo of a small ethernet PHY IC on a NIC PCB next to the RJ45 magnetics. A QFN/QFP package, ~5×5 mm, typically labeled with the vendor and part number (e.g., "Marvell 88E1512", "Broadcom BCM5421").
- AI-generation prompt fallback: "macro photograph of a small ethernet PHY chip in QFN package on a green FR-4 PCB, surrounded by SMD passives, RJ45 jack with magnetics module on the right edge of frame, sharp focus, professional studio lighting".
- SVG hotspot overlay: rectangles for `03_pcs` (over the digital half of the die outline, conceptually toward the xMII side) and `03_line_driver` (over the analog half, conceptually toward the RJ45 side).
- Overlay-on labels: "GMII 8 bits @ 125 MHz" on the LEFT edge, "1000BASE-T 4 pairs" on the RIGHT edge, "MDIO" on the TOP (control).

## Reasoning

A PHY is a real, photographable chip and is explicitly assigned Tier 1 by the agent brief. Photographing the chip-next-to-RJ45 layout makes it visceral that "this little IC is what makes the cable work". Children (`[PCS]` digital, `[AFE]` analog) split the tier: PCS gets stylized SVG, AFE gets a 3D analog-waveform scene.
