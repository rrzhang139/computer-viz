# art — 00_computer/01_network/02_nic

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

- High-res die-shot or top-down package photo of a NIC controller (Intel I210AT or similar 1G controller). Lid-on package shot for default; lid-off die annotation as an alternate asset.
- AI-generation prompt as fallback: "die-shot photograph of a small ethernet NIC controller silicon die, ~5×5 mm, visible functional blocks: 'TX FIFO', 'RX FIFO', 'MAC core', 'TSO/checksum offload', 'RSS hash', 'MSI-X', 'PCIe IF', high-resolution, top-down, microscope photography lighting".
- SVG hotspot overlay over the package/die: rectangles for `03_offload` (TSO/checksum block), `03_mac` (MAC core), `_dma_ring` interface (PCIe-IF / descriptor cache region). Card-edge fingers (LEFT) and xMII bus (RIGHT, toward PHY).
- Overlay-on labels: "TX ring head/tail", "RX ring head/tail", "MSI-X table", "RSS indirection", and an arrow pointing TOP-down for the doorbell MMIO write.

## Reasoning

The NIC controller is photographable hardware (a chip) and benefits from a real die/package image so the user sees that all the children — `[OFFLOAD]`, `[MAC]`, the DMA ring controller — are *one piece of silicon*, not a logical box-and-arrow. Tier 1 is also explicitly required by the agent brief. The PCIe-edge / xMII directionality preserves LEFT=data-in / RIGHT=data-out.
