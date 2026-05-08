# art — 00_computer/01_os/02_kalloc

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

Tier 3 stylized SVG: a row of "shelves" (one per `kmem_cache`, labeled by object type — task_struct, skb, inode, dentry...). Each shelf is a strip of identically-shaped slots; full slots glow purple (`--color-storage`), free slots are dim. A per-CPU mini-shelf floats above each: that's the freelist hot path. Allocations pop a slot off the per-CPU shelf and emit the object RIGHT (`--color-data`); when the per-CPU shelf empties, a refill animation imports a slab of slots from the main shelf.

## Reasoning

The slab allocator's identity is "many shelves, each typed, each with a per-CPU fast lane." Tier 3's shelf-row layout makes that immediate; freelist motion + per-CPU caches are the kind of detail Tier 3 is built for.
