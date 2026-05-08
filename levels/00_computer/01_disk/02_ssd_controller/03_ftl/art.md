# art — 00_computer/01_disk/02_ssd_controller/03_ftl

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

Stylized SVG of a translation table as a glowing rotating rolodex / page directory.

Layout (LEFT data, RIGHT data, TOP control):
- LEFT: stack of incoming LBA tickets `LBA=0x42…` flowing rightward
- CENTER: the mapping table — long vertical column of glowing rows, each row `LBA → (ch:die:plane:block:page)`. Active lookup row pulses pink (`--color-active`); recently-touched rows linger at half intensity.
- RIGHT: physical-address tuples emerge as colored badges, one per channel (color-keyed by `ch` index)
- TOP: small overlay clusters for "GC remap request" tickets and "wear counters" — these arrive as control inputs and tint the chosen row

Visual language:
- Radial blue→purple gradient base (`--color-data` → `--color-storage`) for the table
- Particle flow along arrows from LBA → table row → physical tuple
- Stale entries fade from purple to slate (`--color-passive`) when `ftl.invalidate` fires
- A "write pointer" cursor on one specific physical block is highlighted in orange (`--color-control`) and advances every program

## Reasoning

The FTL is a pure software construct — a giant hashmap. It has no physical form; no die-crop will reveal it. Tier 3 stylized SVG with depth, particle flow along the lookup, and color-coded channels makes the indirection visible (LBAs flowing in, physical tuples coming out, stale entries fading) which is exactly the intuition the user needs. A flat box-and-arrow diagram would lose the "this is happening on every write" feel.
