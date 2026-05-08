# art — 00_computer/01_chip/02_core/03_div

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```
Confirmed: a divider is a state machine + iterating registers — its identity is the *loop in time*, which is a stylized concern best shown via animated state transitions and an iteration counter.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

Rich stylized SVG — the unit is presented as a small "machine room" with two iterating drums:
- LEFT: dividend rail brings A (32 bits, blue `--color-data` ribbon) into the **partial-remainder register** (33-bit wide pill in `--color-storage` purple, with hex display).
- BELOW the remainder: **quotient register** (32-bit pill, also purple), starts empty and fills one bit per iteration from the LEFT (most-significant bit first, bits drift in like beads on a string).
- A small **subtractor box** (slate `--color-passive` rectangle with adder glyph) sits to the right of the partial remainder. Each iteration:
  - The partial remainder shifts left by 1 (visible glyph slide).
  - The divisor B (entering as a thin blue ribbon from LEFT, looped back via a feedback path) is conditionally subtracted.
  - The sign bit drives one new quotient bit, snapping into the rightmost slot of the quotient register.
- A central **state-machine ring** rendered as a small radial node graph (states: IDLE, INIT, ITERATE, FINALIZE, DONE), one node lit at any time in `--color-active` hot-pink.
- An **iteration counter** displayed as a thin progress arc around the ring (0/32 → 32/32) so the user sees "we're still going."
- TOP control: `op` chip + `start` pulse + CLK ticks (orange `--color-control`).
- RIGHT outputs: `result` ribbon exits when `done` lamp flashes; `div_by_zero` lamp glows red if asserted.
- Animation cadence:
  - On `start`: state ring jumps IDLE → INIT, registers load.
  - Each CLK edge: ITERATE state pulses; one new bit appears in quotient; remainder updates with a brief glow.
  - When counter hits 32: state ring → FINALIZE → DONE, `done` lamp flashes.
- Background: dark `--color-bg` with very faint chunked-grid pattern (suggests "iterative work").
- Symbolic overlay: bit-by-bit labels on the quotient register, current iteration index, op name, signed/unsigned badge.

## Reasoning

<!-- Why this tier fits this level. -->
A divider isn't a one-shot block — it's a small loop with state. The right visual is a *state-machine + animated registers* showing one bit grow per cycle, and a counter making the latency tangible. Tier 3 with SVG state nodes + register glyphs nails it; Tier 2 (3D) would over-promise spatial structure that doesn't exist.
