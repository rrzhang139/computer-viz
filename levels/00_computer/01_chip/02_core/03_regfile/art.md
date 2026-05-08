# art — 00_computer/01_chip/02_core/03_regfile

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```
Changed from auto-suggested `1-photo`: although the regfile **does** appear as a labeled SRAM block in real die-shots, our V1 program shows the architectural register *names* (x0..x31) and per-cycle accesses, which is a stylized concern. Tier 3 fits per the task hint.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

Rich stylized SVG laid out as a vertical "ledger" of 32 rows:
- Each row = one architectural register, drawn as a long pill-shaped cell with `--color-storage` purple gradient. Inside each cell:
  - Left label: `x0`..`x31` plus ABI alias (e.g., `ra`, `sp`, `gp`, `tp`, `t0..t6`, `s0..s11`, `a0..a7`).
  - Right value: 8-hex-digit display of the current 32-bit contents.
- `x0` rendered with a darker, "etched" appearance and a tiny chain-link icon to convey "hardwired to zero" — value text is `0x00000000` permanently and the cell never glows on writes.
- Three port lanes drawn at the TOP of the panel:
  - **rs1 read port** (data-blue line that descends, picks the row indexed by `rs1_idx`, then exits RIGHT carrying `rs1_val`).
  - **rs2 read port** (parallel data-blue lane).
  - **write port** (data-blue lane entering from LEFT and descending into the row indexed by `rd_idx`, gated by `we`).
- Index decoders rendered as small orange (`--color-control`) hexagons at the top of each lane, fed by `rs1_idx` / `rs2_idx` / `rd_idx` arrows from above.
- Animation per cycle:
  - **Read phase**: a blue tracer moves down each read lane to the selected row; that row briefly pulses bright.
  - **Write phase** (later in cycle, on writeback): the write lane's tracer descends to the `rd` row, the row's hex value glyph "rolls" to the new value, and a brief radial glow (hot-pink `--color-active` if it's the current instruction's writeback) marks the change.
- Idle drift particles slowly along the data-blue read lanes to convey "ports are alive."
- Symbolic overlay: shows `rs1_idx=01`, `rs2_idx=00`, `rd_idx=03`, `we=1`, plus the underlying `[REG]` bracket label on the touched row.

## Reasoning

<!-- Why this tier fits this level. -->
The regfile is structurally a labeled scoreboard: 32 named values updated per cycle, with three ports indexing into it. The teaching value is in the names + the read/write traffic, not in any 3D shape or photo. Tier 3 with port-lane animation matches the abstraction precisely.
