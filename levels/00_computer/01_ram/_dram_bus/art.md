# art — 00_computer/01_ram/_dram_bus

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 2-3d
```

Confirmed Tier 2 per INVARIANTS.md (`_dram_bus` is explicitly listed under Tier-2 levels needing physical depth + particles).

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- 3D scene: a slice of motherboard PCB with parallel copper traces (length-matched serpentine where appropriate) running from a `[MEMCTRL]` block on the LEFT to a DDR5 DIMM edge connector on the RIGHT. Trace bundles grouped by function: a thin yellow CK pair, a wider orange CA bundle (control), eight blue DQ byte-lane bundles (data, paired with DQS strobes), a small green CKE/CS# group.
- Materials: dark green soldermask PCB substrate, copper traces with metallic shading, gold-plated edge connector fingers.
- Particle/animation: on a write, blue `--color-data` packets travel LEFT→RIGHT down the DQ bundles synchronized with DQS pulses; on a read, packets travel RIGHT→LEFT. CA bundle continually pulses orange `--color-control` (commands fly even when DQ is idle, illustrating the CA/DQ split). Clock pair shows a steady oscillation gradient.
- Camera: low-angle 3/4 view emphasizing parallelism of the traces; user can orbit slightly.

## Reasoning

The DDR5 protocol's whole appeal is the **physical separation of CA and DQ** plus **bidirectional DQ**. That is impossible to feel from a flat box; it needs visible parallel wires with directional particle flows. A 3D scene with PBR-ish PCB materials matches the realistic-first rule and lets clock, command, and data flows be told apart by color, direction, and lane position simultaneously.
