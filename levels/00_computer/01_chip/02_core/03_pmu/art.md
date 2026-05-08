# art — 00_computer/01_chip/02_core/03_pmu

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

- Stylized SVG: a row of large counter dials/odometers, each labeled (`cycles`, `retire`, `mispred`, `l1-miss`, `tlb-miss`, `stall`). Above each dial, a small mux icon shows which event source feeds it. Beneath, a sparkline of recent rate.
- Particles: each event ticks fly in as small dots that drop into the dial, ratcheting the digits forward; overflow causes the dial to flash and emit an IRQ-particle upward.
- Palette: storage purple dials, control orange event-select muxes from top, data blue event-pulses, active pink the dial currently being incremented this cycle.

## Reasoning

<!-- Why this tier fits this level. -->
The PMU is the user's *window* into pipeline behavior — counters changing visibly is the whole point. Tier 3 odometers ratcheting on every event makes "this code spends half its cycles stalled on L1 misses" obvious; a die-shot does not.
