# art — 00_computer/01_chip/02_pmgr

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

Custom rich SVG. A schematic dashboard: per-core dials showing current (V, f) point + C-state badge + thermal needle; a P-state ladder visualization with the active rung lit; thermal-cap line overlaid on the frequency trace; particle pulses representing DVFS transitions sweeping voltage/frequency targets out to `[CLK]` and the PMIC. Background ghost layer of the die for spatial anchoring.

## Reasoning

Confirming Tier 3 (per INVARIANTS table). The PMGR's actual silicon is a small embedded controller — visually unremarkable on a die. The pedagogical content is the *control loop*: telemetry in, (V,f,C) decisions out, with the OS in the loop. A rich-SVG dashboard shows P-state ladders, C-state transitions, and thermal-throttle events together — none of which a die-shot conveys.
