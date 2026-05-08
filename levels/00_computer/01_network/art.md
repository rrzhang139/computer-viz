# art — 00_computer/01_network

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 1-photo
```

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- High-res top-down photo of a real PCIe NIC card (Intel I210 or I350 1G, or an X550 10G if higher fidelity is wanted) — gold finger PCIe edge connector at LEFT (matching INVARIANTS data-input direction), RJ45 jack at RIGHT (data-output, the wire). Heatsink area where the NIC controller sits is the obvious large square; small PHY chip near the RJ45.
- AI-generation prompt as fallback: "top-down product photo of a low-profile PCIe ×4 1Gbit ethernet NIC card on a black background, gold PCIe fingers on the left edge, RJ45 jack on the right, controller die under a small heatsink labeled 'NIC controller', PHY chip near the jack labeled 'PHY', SMD components, FR-4 PCB, professional studio lighting".
- SVG hotspot overlay: rectangles around the controller (→ `02_nic`), the PHY (→ `02_phy`), the gold fingers (→ `_pcie` parent connector), the RJ45 (→ `_ethernet_link`), and a translucent ring around the card-edge area where DMA descriptor traffic conceptually lives (→ `_dma_ring`).
- Overlay-on adds labels "MAC", "OFFLOAD", "PCS+AFE" pointing at the relevant chip regions.

## Reasoning

A NIC card *is* a real, photographable piece of hardware that benefits from being seen as a single object before the user drills into chips and wires. The realistic-first rule applies: photo defaults, symbolic overlay annotates. Tier 1 is also explicitly assigned in the agent brief. The hotspots maintain the LEFT=in / RIGHT=out spatial invariant: PCIe fingers (data ingress) on the left, RJ45 (data egress) on the right.
