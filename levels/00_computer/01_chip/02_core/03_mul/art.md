# art — 00_computer/01_chip/02_core/03_mul

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```
Confirmed: a pipelined multiplier's teaching content is the staged dataflow across 3–4 cycles. Tier 3 with explicit pipeline-stage registers and a moving "result-in-flight" indicator matches it directly.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

Rich stylized SVG of a multi-stage pipeline:
- Horizontal layout, LEFT to RIGHT: input latch → Stage 1 (partial-product generation) → Stage 2 (Wallace tree compression L1) → Stage 3 (Wallace tree compression L2) → Stage 4 (final adder + result mux) → output latch.
- Each stage rendered as a wide rounded rectangle with a soft `--color-passive` slate fill and a subtle radial highlight; pipeline-boundary `[FF]` banks shown between stages as thin purple (`--color-storage`) bars with a small clock icon.
- Internal "compressor cells" inside each stage rendered as a sparse grid of tiny dots/diamonds — gives the stage a textured filling that hints at "a forest of small reductions" without trying to draw thousands of gates.
- Inputs A, B enter from LEFT as two thick blue ribbons that fan into the partial-product cloud at Stage 1.
- TOP control:
  - `op` chip (orange `--color-control`) routes into the result mux at Stage 4 to choose `mul` (low half) vs. `mulh*` (high half).
  - `start` arrives as a brief orange pulse along the top rail.
  - CLK shown as a vertical orange tick across each stage boundary.
- Animation:
  - On `start`: a "data parcel" (small bright blue capsule) appears at the input latch and advances one stage per CLK edge — visible as a discrete jump LEFT→RIGHT.
  - As the parcel passes through each stage, that stage's compressor texture briefly lights up in `--color-data`.
  - When the parcel arrives at the output latch (cycle 3 or 4): the `done` lamp on the right edge flashes hot-pink (`--color-active`), and the result ribbon exits with the product value.
- Multiple parcels coexist in flight: one entering each cycle, demonstrating the pipelined throughput.
- Symbolic overlay: stage numbers, op label, current parcel's `(A, B)` values, "issue cycle" / "complete cycle" annotations.

## Reasoning

<!-- Why this tier fits this level. -->
The whole point of `[MUL]` versus `[ALU]` is "this takes multiple cycles, but it's pipelined." That story is *temporal*, and Tier 3 with a discrete parcel-jumping animation makes the pipeline depth and throughput viscerally clear — better than 3D (no spatial-depth payoff) or a die photo (multiplier blocks aren't visually distinct enough to teach pipelining).
