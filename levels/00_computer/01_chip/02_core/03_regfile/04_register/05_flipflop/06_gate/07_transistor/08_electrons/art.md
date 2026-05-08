# art — 00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop/06_gate/07_transistor/08_electrons

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 2-3d
```
Confirmed: react-three-fiber 3D scene. Carrier drift is the canonical "physical realism" base case; particles are required.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

react-three-fiber scene (zoomed inside one NMOS channel):
- Silicon substrate slab: `BoxGeometry` with tinted `MeshStandardMaterial` (greyish-blue, low metalness, mid roughness — reads as bulk silicon).
- Gate oxide layer: thin translucent slab above channel (light blue, alpha 0.3) — visible only in symbolic-overlay mode.
- Polysilicon gate strip: short matte-grey ribbon stretched across the channel direction.
- Source / drain regions: lightly tinted darker doped slabs at LEFT and RIGHT ends.
- ~150–300 electron carriers via `InstancedMesh` of small emissive blue spheres (color `--color-data` `#3DA5FF`).
  - When V_G < V_th: carriers cluster at the source reservoir, no flow.
  - When V_G ≥ V_th: an inversion sheet forms under the gate; carriers drift LEFT→RIGHT under V_DS field. Drift velocity proportional to applied field; positions updated per frame using a simple advection step (no real solver).
- Optional faint bulk-grain texture on substrate for "real silicon" feel.
- Camera: fixed slight tilt looking down along channel; user may orbit ±15°.

## Reasoning

<!-- Why this tier fits this level. -->
This is the level where the user must literally *see* particles moving — Tier 1 (a die photo) cannot show drift, and Tier 3 (stylized SVG) would defeat the realism claim. A 3D scene with instanced electron particles is the only way to make "carrier drift" experiential.
