# art — 00_computer/01_network/_ethernet_link/03_frame_bytes

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

- Stylized SVG: a horizontal byte ribbon scrolling LEFT→RIGHT through the frame. Field-colored segments (in order):
  - preamble (7 B): striped grey, animated as a clock-recovery motif (alternating bits `10101010` visualized as a metronome).
  - SFD (1 B `0xD5`): a small "flag" glyph signalling start.
  - dst MAC (6 B) and src MAC (6 B): tinted `--color-control` orange (routing/identity).
  - ethertype (2 B): a small `0x0800` plate (IPv4 in demo).
  - payload (46–1500 B): a long `--color-data` blue body, clipped/scrolled.
  - FCS (4 B): a small purple checksum tile, animated to rotate when validated.
- Toggle overlay: byte-offset ruler, hex view of each field, and a callout that the preamble + SFD are *not* counted as part of the official frame for IFG purposes.

## Reasoning

`[FRAME]` is a byte-layout — there is nothing to photograph and no volumetric depth — so Tier 3 stylized SVG is the right choice, with explicit field colors and a hex toggle so the user can both *see* the gestalt frame and *read* the actual bytes. This mirrors the `[TLP]` view (sibling on the PCIe side, same Tier-3 packet styling).
