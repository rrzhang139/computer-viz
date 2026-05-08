# art — 00_computer/01_network/02_nic/_dma_ring

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

- Stylized SVG: a circular ring of slots (descriptors). Two side-by-side rings: TX (top) and RX (bottom). Each slot is an `(addr_hi, addr_lo, len, status)` glyph. Two pointers — head (NIC-owned) and tail (kernel-owned) — chase each other around the ring. Filled slots glow `--color-data` blue; empty slots are dim `--color-passive` slate.
- A small CPU/kernel block on the LEFT writes new descriptors at tail++ and pushes a *doorbell* glyph (`--color-control` orange) over to the NIC block on the RIGHT.
- The NIC block reads descriptors via TLP arrows (cross-link to `_pcie/02_tlp` styling) and emits write-back TLPs that bump head++.
- Toggle overlay annotates ring depth (256 entries default), the formula `tail = (tail+1) mod N`, and an MSI-X icon when the NIC raises an interrupt.

## Reasoning

A ring buffer is a topology, not an object — Tier 3 stylized SVG with animated head/tail pointers along a circular path teaches the producer/consumer asymmetry better than any photo or 3D scene. Same tier is used by `_dma` (kernel-side parent concept) for visual consistency.
