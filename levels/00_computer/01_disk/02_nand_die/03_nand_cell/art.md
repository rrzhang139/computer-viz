# art — 00_computer/01_disk/02_nand_die/03_nand_cell

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 2-3d
```

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

3D scene (react-three-fiber) showing one cell of a 3D NAND string in cross-section.

Geometry (PBR-ish silicon/oxide/poly materials):
- Vertical polysilicon channel pillar (the bit-line direction) running TOP to BOTTOM
- A horizontal control-gate ring (word line) wraps the pillar — this is the cell
- Layer stackup around the pillar: tunnel oxide / charge-trap (or floating gate) / blocking oxide / control-gate ring
- LEFT (data, indirectly): bit-line voltage indicator at top of pillar
- TOP (control): word-line voltage indicator clipped onto the control-gate ring
- BOTTOM: source line — implicit (per INVARIANTS rule that bottom = power/ground, never drawn)

Particles + materials:
- Electrons rendered as small glowing blue spheres (`--color-data` tint)
- During program: electrons tunnel from channel through tunnel oxide into the charge trap (Fowler-Nordheim animation)
- During erase: electrons tunnel back out (block-wide, all cells in the block flush together)
- During read: word-line ramps through reference voltage; the trapped charge raises threshold so cell either conducts (channel glow) or doesn't
- A small "voltage band" inset on the side: 8 stacked Gaussians for TLC, with the cell's current threshold dot floating among them; bands smear visibly as `wear_event` accumulates

Camera:
- Default fixed slightly above and to the side, showing the pillar's vertical extent and the wrap of the gate
- User can orbit ~30° around vertical axis

## Reasoning

The whole point of this level is *physical depth*: electrons tunneling through oxide into a trapped charge well. That is a 3D phenomenon — the trap layer wraps a pillar — and the wear story (oxide degradation with each tunneling event) only lands viscerally if you can see the tunneling. Tier 2 with PBR materials, particle electrons, and a camera that can orbit just enough to see the wrap is essential here. A flat SVG would lose the layered structure that defines the device.
