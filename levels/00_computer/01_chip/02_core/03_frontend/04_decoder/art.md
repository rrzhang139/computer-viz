# art — 00_computer/01_chip/02_core/03_frontend/04_decoder

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```
Confirmed: the decoder's instructive content is the *bit-field decomposition* of a 32-bit instruction into named control wires. That is intrinsically a stylized SVG concern.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

Rich stylized SVG laid out as a "split panel":
- LEFT half: the **instruction word** rendered as a horizontal 32-cell bit strip (b31 leftmost, b0 rightmost), each cell showing its bit value (0/1) in `--color-fg`. Cells are color-banded by RV32I field role:
  - `opcode[6:0]` band in `--color-control` orange
  - `funct3[14:12]`, `funct7[31:25]` bands in lighter orange
  - `rs1[19:15]`, `rs2[24:20]`, `rd[11:7]` bands in `--color-storage` purple
  - `imm` bits in `--color-data` blue (which exact bits depend on format — the band reshapes as format changes)
- RIGHT half: the **control-signal bundle** rendered as a vertical stack of labeled "lanes," each lane a thin pill with the field name on the left and current value on the right:
  - `op = add`
  - `rs1_idx = 01 (x1)`
  - `rs2_idx = 02 (x2)`
  - `rd_idx = 03 (x3)`
  - `imm = 0x00000005`
  - `format = I-type`
  - `unit_select = ALU`
  - `we = 1` / `is_load = 0` / `is_store = 0` / `is_branch = 0` / `is_jump = 0`
- BETWEEN left and right: a **fan-out web** of curved SVG paths. Each path connects a colored bit-band on the LEFT to its destination lane on the RIGHT. Paths are tinted to match their source band's color. Idle paths are dim; active paths (carrying values into the current instruction's lanes) glow in `--color-active` hot-pink.
- A small **format badge** sits at the top center showing the detected format glyph (R | I | S | B | U | J), with all six glyphs visible as ghosted options and the active one lit. As `opcode` arrives, the badge animates a brief snap to the chosen format, and the immediate-shaping pattern on the LEFT bit strip rearranges accordingly (different formats use different bit positions for the immediate).
- Background: dark `--color-bg` with a faint horizontal scan line that sweeps once per cycle to convey "decoded freshly each cycle."
- Particle drift: tiny blue beads slide along the active fan-out paths from LEFT bands to RIGHT lanes for the duration of the cycle.
- Symbolic overlay: per-bit labels (e.g., `b6:0 = opcode`), the disassembled mnemonic above the bit strip (e.g., `addi x1, x0, 5`), and an explanatory tooltip on the format badge.

## Reasoning

<!-- Why this tier fits this level. -->
The decoder *is* the bit-field-to-control-signal mapping; the visualization should literally show that mapping with colored bit bands and labeled lanes connected by a fan-out web. Tier 3 with animated paths makes the "32 bits become a structured bundle" story self-evident in one glance — neither a die photo nor a 3D scene would communicate this.
