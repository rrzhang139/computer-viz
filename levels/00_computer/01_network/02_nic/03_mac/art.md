# art — 00_computer/01_network/02_nic/03_mac

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

- Stylized SVG: an "assembly line" rendering with byte-shaped tiles flowing LEFT→RIGHT. Boxes (left to right): preamble/SFD generator (stamps a 7+1 byte glyph onto the head of the stream) → header pass-through (dst/src/ethertype tinted in `--color-control`-orange because they steer routing) → payload pass-through (`--color-data`-blue) → FCS engine (a swirling LFSR motif that emits a final 4-byte tile) → IPG gap (12 transparent slots).
- Below the line, a parallel RX track shows the reverse: SFD detector finds the boundary, FCS validator turns the trailing 4 bytes into a green/red pass-fail.
- TOP edge: control-orange `MAC_EN`, `FDX`, `PROMISC` toggles.

## Reasoning

`[MAC]` is bit-twiddling state machinery — no physical form, no volumetric depth — but it is the *first place where the user can see byte-level structure that maps to `[FRAME]`*. Tier 3 stylized SVG with the assembly-line metaphor and field tints lines up directly with the `[FRAME]` view (sibling at `_ethernet_link/03_frame_bytes`), giving the user a smooth conceptual handoff.
