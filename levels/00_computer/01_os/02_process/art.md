# art — 00_computer/01_os/02_process

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

Tier 3 stylized SVG — the "glowing tower" address space, rendered tall and vertical so the spatial mnemonic (low addr at bottom, high at top) is unmissable. From bottom: CODE band (deep blue, dense pixel rows of instruction-shaped blocks), DATA band (purple, fewer rows), HEAP rising arrow (`--color-storage` violet) growing UP with allocator brick particles, a wide darker "free" gap, then STACK descending arrow from top with frame-shaped blocks growing DOWN. Subtle radial gradient on each region, animated particles for active loads/stores at the current `pc`'s address, hot-pink `--color-active` highlight wherever execution currently is. Address ruler on left.

## Reasoning

Address-space visualization is *the* iconic OS picture; getting it as a richly textured tower with depth and motion (rather than a flat labeled rectangle) is the whole point of Tier 3 here. The vertical layout exploits TOP/BOTTOM mnemonics (high/low addr) without violating the data-flow LEFT→RIGHT invariant — process flow still moves rightward at the parent level; vertical here is the *internal* address axis.
