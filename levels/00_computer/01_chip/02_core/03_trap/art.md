# art — 00_computer/01_chip/02_core/03_trap

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

- Stylized SVG: a junction box with three input rails (exception, ECALL, IRQ) feeding a priority encoder; output rails to {`mepc` write, `mcause` write, priv-mode flip-flop, redirect-PC to fetch}. A small "U→S→M" mode badge animates when the privilege rises.
- Particles: a fault-particle enters from the left, the priority encoder pulses, three packet-particles fan out to CSR writes, and a redirect-PC arrow flies right toward fetch. The mode badge briefly glows green on rise, fades on `mret`.
- Palette: storage purple FSM, control orange the priority bus, data blue cause/value bits, active pink the chosen source, special-event color (deep orange) for the privilege transition.

## Reasoning

<!-- Why this tier fits this level. -->
A trap is a *moment* — three things must happen atomically. Tier 3 with synchronized particle bursts conveys the simultaneity; a still photo cannot capture "all of these CSRs got written in one cycle".
