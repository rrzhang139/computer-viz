# art — 00_computer/01_chip/02_core/03_frontend/04_fetchbuffer

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

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

- Stylized SVG: a horizontal ring buffer drawn as a row of slots with curved arrows looping head→tail. I-cache line slides in from the left as a chunk of 8 bytes; decoder pulls one instruction at a time from the right.
- Palette: storage purple for slot bodies; data blue for instruction bytes; control orange for head/tail pointers; active pink fills the slot currently being read by decode.
- Particles: variable-speed bursts entering left (fetch can deliver 0 or 8 bytes per cycle), constant-rate exit on right (decode wants 1/cycle); buffer level visibly fluctuates.

## Reasoning

<!-- Why this tier fits this level. -->
The educational point is rate-decoupling — fetch is bursty, decode is steady. Tier 3 animation lets us show the queue filling and draining; a static photo would not communicate that the FQ is what *prevents* an I-cache miss from immediately stalling decode.
