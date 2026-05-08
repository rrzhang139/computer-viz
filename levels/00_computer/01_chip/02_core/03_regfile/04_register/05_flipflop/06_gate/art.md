# art — 00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop/06_gate

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 2-3d
```
Confirmed: react-three-fiber 3D scene. The gate's truth table only "lands" if the user can see two stacked transistors actually conducting in series/parallel; particles + depth are required.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

react-three-fiber scene — canonical example: 2-input static-CMOS NAND.
- Layout (looking down with slight tilt):
  - TOP rail: Vdd bus (faint copper-tinted bar across the top of the scene).
  - BOTTOM rail: Vss/GND bus.
  - Pull-up network (between Vdd and output node): two PMOS `[T]` instances in **parallel** — each connects Vdd → output when its gate is low.
  - Pull-down network (between output node and Vss): two NMOS `[T]` instances in **series** — both must be on for output to pull low.
- Each `[T]` reuses the simplified transistor model from `07_transistor/` (silicon slab + gate strip + source/drain wells), but at smaller scale; exterior bounding box only — the carrier-particle detail is suppressed unless the user zooms further.
- Wires: thin extruded ribbons routed orthogonally (LEFT inputs A, B → gates; RIGHT output Q from the shared drain node).
- Active highlight: when the gate is currently driving its output, the output rail glows in `--color-data` (high) or `--color-edge` (low); the conducting transistor instances glow in `--color-control`.
- Symbolic overlay (toggled): annotates each `[T]` as NMOS/PMOS, draws the schematic `&` symbol over the boundary, and labels Q with the boolean expression `Q = ¬(A·B)`.
- Camera: slight 3/4 isometric, fixed default; user may orbit ±20°.

## Reasoning

<!-- Why this tier fits this level. -->
A gate's mechanism is "two networks of transistors fight to set the output rail" — that fight is a depth/topology fact (parallel vs. series), not a logic-symbol fact. Tier 2 with depth + active-rail glow is the smallest representation that conveys it honestly. Tier 1 is impossible (gates aren't visible at die-photo scale individually); Tier 3 would just become a logic-symbol diagram and lose the silicon connection.
