# art — 00_computer/01_os/02_thread

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. A thread has no physical form — it is a slice of register state plus a stack. A rich SVG that *looks* like a glowing register-set + stack tower is the right metaphor.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Center stage: a translucent vertical "spine" representing the user stack — gradient from `--color-storage` (purple) at the bottom (high addr / stack base) fading to a brighter top (current SP), with stack-frame slabs stacked depth-first as semi-transparent layers casting drop-shadow on each other.
- LEFT of the stack: a compact 32-row register grid (PC + x0..x31) with each row glowing in `--color-data` when `activeRegs` includes it; the whole grid pulses in `--color-active` (hot pink) when this thread is currently `RUNNING`.
- TOP: a small "state pill" in `--color-control` (orange) reading RUNNING / RUNNABLE / BLOCKED; transition is animated as a token sliding along an arc to the next pill.
- BACKGROUND: ghost outline of the parent `[PROC]` address space at low opacity, so the viewer sees that this thread is *inside* an address space (siblings would render their own glowing register/stack in the same outline).
- Particle flow: a thin animated stream of dots leaving the register grid → entering a `[CORE]` icon at the right edge, paused when state ≠ RUNNING.

## Reasoning

The hard idea to teach is "many threads, one address space, only one set of registers per core." The visual must make the *register set + stack* feel like the only thing that's per-thread, while the surrounding address-space outline is shared. Tier 3 gradients and depth carry that — flat boxes would let the viewer mistake the thread for an entire process.
