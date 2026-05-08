# art — 00_computer/01_os/02_netstack

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. The netstack is a *protocol dispatch graph* — software, no physical embodiment. Tier 3 lets us draw the layer chain with depth, header growth, and particle flow.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Vertical "stack column" running TOP (socket side) to BOTTOM (device side) — but laid out HORIZONTALLY in this view to obey the LEFT=data-in / RIGHT=data-out invariant. So:
  - LEFT edge: `[SOCK]` halo (incoming TX skbs from socket; outgoing RX skbs to socket).
  - Center: four chained protocol modules, each as a glowing slab — `[TCP]` (innermost, attaches transport header), `[IP]` (attaches network header), `[L2ETH]` (attaches MAC header), `[QDISC]` (per-device queue). Each slab has gradient depth (`--color-storage` purple → `--color-data` blue).
  - RIGHT edge: `[NIC]` halo.
- TX particle: an skb capsule starts at LEFT with payload-only, and *grows a header band* as it crosses each slab — three header strips visibly accrete in `--color-control` (orange) on the capsule's left edge.
- RX particle: starts at RIGHT (with three header strips), travels left, and *sheds* a header band at each slab — strips dissolve as the capsule shrinks back to payload.
- TOP control band: routing-table icon (LPM trie), ARP-cache icon, qdisc-class icon — each pulses when its data structure is consulted.
- BOTTOM (the implicit invariants line): all four slabs sit on a faint shared "kernel data plane" baseline.

## Reasoning

The "header onion" is the hardest idea — packets gain bytes as they descend, lose them as they ascend. Tier 3 makes that *visibly* true via accreting/dissolving header strips on a single capsule. A flat box diagram would just label four boxes and hide the punchline.
