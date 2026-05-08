# art — 00_computer/01_os/02_driver

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

Tier 3 stylized SVG: a "translator panel" sitting between the kernel slab (TOP) and a device card (RIGHT). The panel shows three slots: an ops-table receptacle (filled with concrete callbacks like `submit_io`, `xmit_skb`), a doorbell button glowing each time MMIO writes (`--color-control`), and an ISR antenna at TOP catching incoming `[IRQ]`s. A small DMA ring orbits between panel and device. The device itself is rendered in muted real-hardware style (NVMe controller chip, NIC silicon) hinting at what the driver is talking to.

## Reasoning

A driver is *the bridge* — Tier 3 lets us draw that bridging structure with all three traffic kinds (request DOWN, MMIO RIGHT, IRQ UP) visible simultaneously. Concrete callback names in the ops-table receptacle ground the abstraction.
