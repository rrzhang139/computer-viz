# spec — 00_computer/01_chip/02_core/03_div

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

<!-- Why does this level exist? What problem does it solve? What would break if you removed it?
     Answer this BEFORE describing structure. -->
Division is the first integer operation that doesn't fit into a clean fixed-cycle pipeline. Restoring or non-restoring division iterates one quotient bit per cycle (32 cycles for RV32), and SRT-radix-4 cuts that to ~10. Either way, it's *variable latency* and uses too few gates per cycle to justify pipelining the way `[MUL]` is. This level exists to expose that contrast: not every operation is a smooth assembly-line; some are loops in hardware. Understanding why `div` is "the slow instruction" is part of the visualization's pedagogical job. Remove this level and the user has no place where iterative state machines live, and no contrast against the pipelined multiplier.

## ROLE
Iterative variable-latency 32-bit integer divider (RV32M `div`/`divu`/`rem`/`remu`).

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
- A small **state machine** (~6–10 `[FF]`s for state) controlling iteration.
- A **partial remainder `[REG]`** (33 bits incl. sign) and a **quotient `[REG]`** (32 bits) that update once per iteration.
- A subtractor (one or two `[ALU]`-style adder cones built from `[G]`s) used per iteration.
- Sign-handling logic (operands and result corrected for signed division).

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT (data): A (dividend, 32 bits, rs1), B (divisor, 32 bits, rs2)
- TOP (control):
  - `op` (one of `div`, `divu`, `rem`, `remu`)
  - `start` (operand-valid pulse — kicks off iteration)
  - CLK (advances iteration counter)

## OUTPUTS
<!-- RIGHT -->
- RIGHT: `result` (32 bits) — quotient or remainder depending on op
- RIGHT (control): `done` — asserted in the cycle the iteration completes (variable: ~10–40 cycles depending on operands and microarchitecture)
- RIGHT (control): `div_by_zero` — exception flag (RV32M: returns architecturally-defined sentinel value, not a trap)

## SYMBOL
<!-- bracketed token. None for connectors. -->
`[DIV]` — defined here per `GLOSSARY.md`.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
