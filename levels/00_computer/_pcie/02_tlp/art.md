# art — 00_computer/_pcie/02_tlp

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

- Stylized SVG of a TLP as a *gem-like packet* moving rightward across the lane bundle (parent's view zoomed). Header (12–16 B) rendered as a faceted leading block in `--color-control` orange (because routing/type fields are control), payload as a longer body in `--color-data` blue, LCRC as a small trailing block in purple-ish.
- Toggle overlay annotates fields: Fmt/Type, Length, Requester ID, Tag, Address[63:2], MPS-bound payload, LCRC[31:0].
- Direction arrow LEFT→RIGHT (data flow); a faint backward ACK/NAK ribbon along the TOP carrying control credit.
- Across the bundle below, parallel "stripes" show how the same TLP byte stream is split across 4 lanes (gen4 ×4).

## Reasoning

A TLP has no physical form — it is bytes-in-flight. Tier 3 stylized SVG with depth-stacked field glyphs and particle motion communicates packet-ness, header/payload/CRC layering, and lane-striping in one frame. Tier 1/2 do not apply: nothing to photograph, nothing volumetric. Stays consistent with `[FRAME]` (sibling on the network side) which is also stylized.
