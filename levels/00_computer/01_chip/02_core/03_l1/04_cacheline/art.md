# art — 00_computer/01_chip/02_core/03_l1/04_cacheline

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

Custom rich SVG. A horizontal "ribbon" 64 cells wide showing the byte payload (data-blue gradient), with side panels for tag (control-orange gradient), valid (purple dot), dirty (hot-pink dot when set), and MESI badge. Address-split callout above: tag | index | offset, with bits highlighted as the user types/clicks an address. Animated particle flow along the ribbon when the line is being filled or evicted. Drop-shadow + radial glow for depth.

## Reasoning

Confirming Tier 3 (per INVARIANTS table). A cache line has no photographic identity — at the die level it's literally indistinguishable from the SRAM array around it. The interesting structure is the *address-split semantics* and the metadata bits, which are pure information. Rich stylized SVG with gradients, address-bit glow, and particle motion communicates "this is the unit of transfer" far better than a die crop ever could.
