# art — 00_computer/01_os/02_scheduler

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. The CFS runqueue is a data structure (red-black tree) — there is nothing to photograph. Render it as a glowing tree with depth and motion.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Center: a stylized red-black tree, ~7–15 nodes, each node = a `[THREAD]` rendered as a small glowing capsule labeled `tid` and tinted by `vruntime` (cooler hue = lower vruntime = will run sooner). Edges are translucent gradient lines with subtle parallax — depth conveyed by drop-shadow, not a flat skeleton.
- LEFT: a queue-shaped "incoming" lane where wakeups arrive — particles in `--color-data` slide in and dock as new tree nodes; the rb-tree rebalances with a brief animated rotation.
- TOP: a pulsing tick beacon in `--color-control` (orange) — every tick the `current` thread's `vruntime` advances and the leftmost node may change.
- RIGHT: an exit lane where the leftmost node detaches and is handed off to `[CTX]`; particle flow in `--color-active` (hot pink).
- ABOVE the CFS tree: a thin priority strip showing the RT/Deadline lists (always-ahead-of-CFS), drawn as rectangular tokens stacked left-to-right.
- BACKGROUND: a large dim CPU-icon halo behind the tree to emphasize "this is per-CPU"; multiple CPUs each have their own tree.

## Reasoning

The rb-tree is the load-bearing concept; flat boxes hide that "fair" comes from "leftmost node by vruntime, rebalanced after every insert." A Tier 3 stylized tree with a moving leftmost-pointer makes the algorithm visible without showing C code. Particles and gradients make the ~1 ms tick feel rhythmic, anchoring the TIME_AXIS row.
