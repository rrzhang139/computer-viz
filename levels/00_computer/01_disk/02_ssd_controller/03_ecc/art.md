# art — 00_computer/01_disk/02_ssd_controller/03_ecc

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

Stylized SVG of an LDPC Tanner-graph belief-propagation animation.

Layout (LEFT data, RIGHT data, TOP control):
- LEFT: stream of raw page bytes arriving from the channel as a row of bit cells; some cells are red (flipped) — initial bit-error visualization
- CENTER: bipartite Tanner graph: top row of "variable nodes" (bit cells, blue `--color-data`), bottom row of "check nodes" (parity equations, purple `--color-storage`). Animated edges carry messages back and forth, iteration by iteration. With each iteration, more red cells flip back to blue.
- RIGHT: corrected bit stream emerges; a counter shows iterations used and `ecc.raw_ber`. On uncorrectable, the whole graph flashes pink (`--color-active`) and an "uncorrectable" flag fires.
- TOP: orange (`--color-control`) iteration-budget tick + soft-read-retry escalation arrow

Visual language:
- Iteration sweeps as a wave of light moving across the Tanner graph edges
- Bit cells visibly "vote" — flickering between 0 and 1 — until they settle
- A small voltage-band drift inset (TLC: 8 levels with overlapping Gaussians) shows *why* errors arise; ties this level back to `[NCELL]`

## Reasoning

LDPC decoding is a beautiful iterative algorithm but invisible at the chip level. Tier 3 SVG with a Tanner graph and message passing is the canonical visualization in coding-theory textbooks; using it here keeps the user grounded in real code rather than a generic "ECC box". The fade-from-red-to-blue across iterations makes the *iterative* nature of LDPC unmistakable (vs. the one-shot feel of BCH or Hamming).
