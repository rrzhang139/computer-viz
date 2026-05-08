# art — 00_computer/01_os/_dma

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

Tier 3 stylized SVG: a wide pipe between `[RAM]` (LEFT) and the device (RIGHT, e.g. `[DISK]` or `[NIC]`), explicitly *bypassing* the CPU box (which sits TOP and stays dim). A descriptor ring is shown as a circular slot array near the device end; the kernel writes a descriptor (control particle from TOP), the device's DMA engine sucks bytes through the pipe (blue stream `--color-data` flowing horizontally), and a completion entry returns. The CPU box dimming during transfer is the entire visual punchline — the device works while the CPU is free.

## Reasoning

DMA's whole identity is *the CPU is uninvolved during the transfer*. Tier 3 lets us draw the bypass as a literal pipe with the CPU dimmed; flat boxes lose that punchline. Particle motion communicates throughput intuitively.
