# art — 00_computer/01_chip/02_core/03_frontend

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 1-photo
```

Confirmed: Tier 1. The frontend region is a real, identifiable block on a die-shot (e.g., the upper-left quadrant of an Intel/AMD/SiFive core photo). We zoom into a die-crop and overlay SVG hotspots on the BTB, PHT, RAS, and decoder physical regions.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

- Source: annotated die-shot of an open-source RISC-V core (e.g., BOOM, SiFive U74) with the frontend region cropped and labeled. AI-generation prompt fallback: "high-resolution silicon die photograph, top-down, frontend region of a RISC-V out-of-order core, BTB and decoder blocks visible, blue/grey metal layers".
- Overlay assets: SVG bounding boxes for [BTB], [PHT], [RAS], [DECODER], [FQ] aligned to die-crop coordinates.

## Reasoning

<!-- Why this tier fits this level. -->
The frontend is physical silicon — its layout *is* its story. A real die-crop teaches that branch prediction has area cost and tells the user where the unit lives relative to backend; a flat box diagram would erase that.
