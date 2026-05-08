# art — 00_computer/01_chip/02_core/03_pipeline

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Changed from `1-photo` to `3-stylized`. The pipeline scaffold is a control abstraction; there is no canonical photographic asset of "the pipeline". Tier 3 lets us draw the classic F-D-X-M-WB diagonal-grid timing chart with realistic look (gradients, glows for active stages, particle-uops sliding through). Allowed by the spec hint "03_pipeline can be Tier 1 (timing diagram with realistic look) or Tier 3".

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

- Stylized SVG: a diagonal timing chart, X-axis = cycle, Y-axis = stage. Each instruction is a colored bar that slides one stage per cycle; bubbles appear as faded grey bars; stalls as horizontal flat lines; flushes as a vertical wipe.
- Palette: each in-flight uop a unique data-blue tint, control-orange overlays for stall/flush signals, active-pink halo on the currently-executing stage, slate for inert latches.
- Particles: arrows showing forwarding from EX/MEM back to ID inputs; a flush "wave" that erases all in-flight bars from the offending uop's stage onward.

## Reasoning

<!-- Why this tier fits this level. -->
The 5-stage timing chart is *the* canonical pipeline picture, but real teaching value comes from animating bubbles and forwarding arrows on top of it — that is exactly what Tier 3 (rich stylized SVG with motion) is for. A photo of silicon would not show the time axis at all.
