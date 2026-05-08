# art — 00_computer/01_os/02_mmu

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

Tier 3 stylized SVG: a translation "lens" sitting on the LEFT data path between core and cache. Virtual addresses enter as blue particles (`--color-data`), strike a glowing prism that splits them into `[VPN | offset]` lanes, refract through a `[TLB]` lookup pane (small fully-associative cache as a row of glowing cells), and exit RIGHT as physical addresses tinted slightly differently. On miss the prism dims and a longer beam routes DOWN through the page-table radix tree before re-emerging. `satp` enters from TOP as control (`--color-control`).

## Reasoning

Translation is hard to picture as anything but transformation; a "prism/lens" metaphor visually communicates that the address is *changed in flight* without breaking the LEFT→RIGHT data invariant. Tier 3 lets us animate the TLB hit (instant) vs the multi-bounce walk on miss in the same frame.
