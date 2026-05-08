# art — 00_computer/01_chip/02_core/03_csr

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

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

- Stylized SVG: a wall of labeled register tiles (`mstatus`, `mtvec`, `mepc`, `mcause`, `mtval`, `mip`, `mie`, `satp`, `mhartid`, …), grouped by purpose (trap, IRQ, MMU, perf). Privilege-mode badge at the top tints the readable subset.
- Particles: a CSR write fires a value-particle into the addressed tile, which briefly glows; side effects shoot a secondary particle outward (e.g., satp write fires a "flush" particle toward [TLB]).
- Palette: storage purple tiles, data blue values, control orange address-decoder beam from top, active pink the addressed tile, dimmed-grey CSRs out of current privilege.

## Reasoning

<!-- Why this tier fits this level. -->
The CSR space is a *named* register file — labels are core to its identity. Tier 3 SVG with named tiles + side-effect arrows shows both the names and the consequences of writes; a die-shot would just be more SRAM.
