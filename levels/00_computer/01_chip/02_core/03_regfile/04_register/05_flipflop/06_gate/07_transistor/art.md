# art — 00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop/06_gate/07_transistor

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 2-3d
```
Confirmed: react-three-fiber 3D scene. The transistor must show physical shape (gate strip across channel) and the carriers flowing through it; flat SVG cannot communicate "voltage closes a channel" credibly.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

react-three-fiber scene (single MOSFET seen from a slight 3/4 angle):
- Silicon substrate: large `BoxGeometry` with `MeshStandardMaterial`, color `#3b4a5c`, low metalness, roughness ~0.6 (silicon-grey-blue).
- Two doped wells (source LEFT, drain RIGHT): smaller `BoxGeometry` slabs inset into substrate top, slightly darker tint.
- Gate oxide: thin translucent slab (`MeshStandardMaterial`, transparent: true, opacity 0.25, color near-white) above the channel region.
- Polysilicon gate strip on TOP: matte-grey ribbon `BoxGeometry`, color `--color-control` `#FFB23D` when asserted, else `--color-passive` `#454F5B`.
- Source / drain metal contacts: small copper-colored cylinders rising from each doped well.
- Carrier particles: ~50 `InstancedMesh` electrons (small emissive blue spheres, color `--color-data`) drifting LEFT→RIGHT through the channel when V_G is asserted; clustered idle in the source well otherwise.
- Optional NMOS/PMOS toggle (overlay only): the PMOS variant shows hole carriers (warm-tinted) and an inverted polarity badge.
- Lighting: one directional key light + soft ambient; subtle bloom on the gate when ON.

## Reasoning

<!-- Why this tier fits this level. -->
The user must see "voltage on top → channel opens → current flows" as a single visual gesture. That requires depth (gate sits on top of channel) and motion (electrons drifting), neither of which a 2D diagram delivers. Tier 2 is the right rung; the scene reuses the carrier system from `08_electrons/` zoomed out one level.
