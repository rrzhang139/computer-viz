# art — 00_computer/01_network/_ethernet_link

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

- Stylized SVG: a Cat-6 cable rendered at the umbrella scope — RJ45 connector on the LEFT (this machine's NIC) and RJ45 on the RIGHT (peer machine), 4 twisted pairs visible inside a translucent jacket.
- Particle flows along the pairs: outbound TX glowing `--color-data` blue, inbound RX glowing a cooler tint, both moving simultaneously to convey full duplex. Pair twist rendered as a periodic helical envelope.
- TOP edge: link-electrical state ("UP", autoneg result) in `--color-control` orange.
- Two zoom hotspots: rectangle around a frame-shaped chunk of particles (→ `03_frame_bytes`), and a small magnifying-glass icon over a single bit transition (→ `03_signal_on_wire`).

## Reasoning

The cable as a topological connector has no per-frame physical motion to render in 3D at this scope (the children handle 3D zoom-ins), and a flat photograph of a cable does not communicate bidirectional flow + framing structure. Tier 3 stylized SVG with directional particle flows and helical pair styling teaches the connector role best, and gives clean drill-points to the two children (one Tier 3 frame, one Tier 2 analog).
