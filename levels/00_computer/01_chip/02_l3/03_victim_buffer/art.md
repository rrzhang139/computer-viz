# art — 00_computer/01_chip/02_l3/03_victim_buffer

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

Custom rich SVG. A small holding-pen of ~8 line-cells positioned between the L3 ribbon (left) and the memctrl block (right). On eviction, a `[CL]` gradient slides into a free cell. On rehit, the cell pulses pink and the line slides back into L3. On drain, the cell streams a particle trail to memctrl. Empty cells are slate; dirty cells glow purple; the active drain cell pulses orange.

## Reasoning

Confirming Tier 3 (per INVARIANTS table). VB has no recognizable die signature (a small CAM/queue near the LLC slices). The interesting content is the *flow* — eviction-then-maybe-rehit-or-drain — which only animation makes legible. Rich SVG with motion shows the rate-decoupling story in one frame.
