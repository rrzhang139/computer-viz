# art — 00_computer/01_os/_signal

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. A signal is a kernel-driven splice into a user-mode stack; it has no physical embodiment. The visual must show the *frame appearing* on a glowing stack column.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Center: the target `[THREAD]`'s user stack rendered as a tall translucent column with frame slabs stacked top-down (high addr at top — matches the `[PROC]` convention). Each slab is a depth-layered slab with gradient `--color-storage` (purple) → `--color-data` (blue) interior.
- Animation 1 (delivery): a glowing capsule labeled `signo=11 SIGSEGV` arrives from the LEFT (kernel side, drawn as a faint kernel halo at the left edge), slides along an arc, and *splices* a new signal-frame slab onto the top of the user stack — accompanied by a soft hot-pink glow (`--color-active`) on the new slab.
- Animation 2 (handler entry): the thread's PC marker (a small chevron in `--color-active`) jumps from its previous user-PC position to the handler's address, drawn as a discrete teleport with a brief afterglow trail.
- Animation 3 (sigreturn): the top slab unspools, particles flow back along the arc to the kernel halo, and the PC chevron returns to its original position.
- TOP: a 64-cell pending-signal mask strip; cells in `--color-control` (orange) light up when their signal is pending and dim when delivered.
- A small "registered handlers" inset (right) shows the `sigaction` table; the active row is highlighted during handler execution.

## Reasoning

The async-splice idea is hard to draw with boxes — it's a *moment* on a stack timeline. Tier 3 lets the signal frame literally appear via animated stacking and unspooling, making "the kernel inserted code into your thread between two instructions" visually obvious. Pending-mask cells lighting up convey the queueing semantics that flat diagrams hide.
