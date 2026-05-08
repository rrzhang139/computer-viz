# art — 00_computer/01_network/02_nic/03_offload

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

- Stylized SVG: a wide super-skbuff "loaf" enters from the LEFT, passes through a *prism-shaped* TSO splitter that emits N equal MTU slices RIGHTward, each slice gaining a small header glyph (TCP/IPv4) on its leading edge.
- Below the TSO prism, a checksum unit shown as a small animated 1's-complement folder collapsing payload bytes into a 16-bit sum that is stamped onto the header glyph.
- For RX: bottom half of the panel shows a frame entering from RIGHT, hitting a Toeplitz hash sigil, then being routed into one of 4 stacked colored RX queues on the LEFT.
- TOP overlay (control): toggle pills for "TSO on/off", "CSO on/off", "RSS on/off", and a small box showing the 320-bit RSS key.

## Reasoning

`[OFFLOAD]` is logic on silicon — there is nothing distinctive to photograph (it sits inside the NIC die-shot used at the parent level), and there is no volumetric story. Tier 3 stylized SVG with the prism and hash-sigil metaphors makes the *transformation* (one big buffer → many small frames; one frame → routed by hash) immediately legible.
