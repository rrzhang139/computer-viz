# art — 00_computer/01_os/_interrupt

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

Tier 3 stylized SVG: lightning-style amber strikes (`--color-control`) entering from BOTTOM-RIGHT (device side) and routing UP through a glowing PLIC/CLINT prism into the kernel slab. The currently-executing user thread is shown as a blue ribbon (`--color-data`) that suspends when the strike lands; a second handler ribbon overlays in `--color-active` hot pink, then dissolves on `SRET`. Pulse intensity = priority; lane color codes source (timer / nic / disk).

## Reasoning

Interrupts are *asynchronous and forceful* — they need to read as something that interrupts whatever else is happening. Tier 3 with sharp pulses, glow, and an "interrupt overlay" ribbon makes the preemption visible. A flat box would lose the "this just happened to whoever was running" feeling.
