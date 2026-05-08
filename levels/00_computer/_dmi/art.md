# art — 00_computer/_dmi

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

- Stylized SVG of a *funnel*: many thin streams entering from the RIGHT (chipset side: USB, SATA, audio, onboard NIC), merging into a thicker `[PCIE]`-styled bundle exiting LEFT toward the CPU root complex.
- Bundle uses the same copper-stripe gradient as `_pcie` for visual continuity (DMI is electrically PCIe).
- A small dotted outline labeled "PCH" wraps the right side; CPU socket icon at the LEFT.
- Toggle overlay tags the lanes with "DMI 4.0 ×8" and notes per-lane GT/s; reuses `--color-data` blue for traffic.

## Reasoning

DMI is a *topological* concept (chipset funnel) more than a physical thing — its photograph is just two solder pads on the PCB. Tier 3 stylized SVG communicates the funnel idea and the visual continuity with `_pcie` (electrically the same) better than a photo or 3D scene. Tier 1 is wrong (nothing photogenic), Tier 2 is wrong (no volumetric difference from `_pcie/02_lane`).
