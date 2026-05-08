# art — 00_computer/01_os

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

Tier 3 stylized SVG: a translucent "kernel slab" floating above the `[CHIP]` die, with U-mode programs as small lit blocks above and hardware (RAM/DISK/NIC) below. Gradients: deep indigo→violet for kernel body (`--color-storage` family), warm amber pulses (`--color-control`) along `[SYSCALL]` and `[IRQ]` paths, blue particle streams (`--color-data`) along `[DMA]` and `02_io_path`. Subsystems (`[VFS]`, `[PCACHE]`, `[BLOCKQ]`, etc.) appear as nested glowing tiles inside the slab; on hover/zoom each tile becomes its child level.

## Reasoning

The kernel has no physical form — it is logical software running on the same `[CORE]` and `[RAM]` as everything else. A photo would lie; a flat boxes-and-arrows diagram would be Visio. Tier 3 with depth, glow, and particle flows lets us show the *mediation* (control coming down from U-mode, results flowing right, IRQs coming up from devices) while keeping the kernel visually distinct from the silicon below.
