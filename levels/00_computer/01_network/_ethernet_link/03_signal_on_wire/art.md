# art — 00_computer/01_network/_ethernet_link/03_signal_on_wire

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 2-3d
```

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- react-three-fiber scene: a single twisted pair shown in cross-section + length, with the two conductors as copper PBR cylinders. Tube cutaway reveals electron-particle clouds drifting at thermal+drift velocity (slow), while a faster *wavefront* (the bit edge) sweeps RIGHTward as a glowing ring at ~0.66c. The contrast between the two velocities is the lesson.
- A 2D voltage-vs-time inset along the TOP edge plots the differential V(t) being asserted at the LEFT and observed at the RIGHT — visibly attenuated and slightly dispersed at the far end.
- Toggle overlay: drift velocity vs propagation velocity numerical labels (using `<Unit>` per INVARIANTS), arrow showing direction of the wavefront, and a small note "differential = `V+ − V−`".

## Reasoning

The signal-on-wire view is *the* canonical Tier-2 case in this repo: the user must see physical depth (the twisted pair as a 3D object), particle motion (electrons), and time-varying voltage all at once, which neither a flat SVG nor a photo can convey. Tier 2 is also the explicit assignment in the agent brief and parallels `_pcie/02_lane` (same substrate, same tier).
