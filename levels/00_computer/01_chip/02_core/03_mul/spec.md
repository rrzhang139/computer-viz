# spec — 00_computer/01_chip/02_core/03_mul

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

<!-- Why does this level exist? What problem does it solve? What would break if you removed it?
     Answer this BEFORE describing structure. -->
A multiplier exists separately from the ALU because the natural cost of multiplication doesn't fit the ALU's "one cycle, pure combinational" budget. Multiplying two 32-bit integers produces a 64-bit result via repeated shift-and-add — cheaper if pipelined across multiple stages than crammed into one long combinational path that would slow down every other instruction. This level makes that latency visible: the multiplier accepts operands one cycle, and produces the product several cycles later. Without it, V1 would either pretend mul is free (wrong) or stretch the clock to fit it (worse). The unit is V1 scope only because RV32M (the M extension) is the standard companion to RV32I; the V1 demo program does not use mul, but the level exists for the visualization's completeness.

## ROLE
Pipelined multi-cycle 32×32 → 64-bit integer multiplier (RV32M `mul`/`mulh`/`mulhu`/`mulhsu`).

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
- A Wallace-tree or array of `[G]` partial-product compressors, broken into **3–4 pipeline stages** separated by `[FF]` banks (one stage register per pipeline boundary).
- Sign/zero-extension logic on inputs.
- A high/low result mux (selects upper-32 or lower-32 of the 64-bit product based on op variant).

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT (data): A (32 bits, rs1), B (32 bits, rs2)
- TOP (control):
  - `op` (one of `mul`, `mulh`, `mulhu`, `mulhsu`)
  - `start` (operand-valid pulse)
  - CLK (advances pipeline stages)

## OUTPUTS
<!-- RIGHT -->
- RIGHT: `result` (32 bits) — high or low half of the product depending on op
- RIGHT (control): `done` — asserted in the cycle the result is valid (3–4 cycles after `start`)

## SYMBOL
<!-- bracketed token. None for connectors. -->
`[MUL]` — defined here per `GLOSSARY.md`.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
