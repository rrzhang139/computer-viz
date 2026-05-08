# spec — 00_computer/01_chip/02_core/03_pipeline/04_hazards

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Pipelining assumes consecutive instructions are independent — but real code constantly has `addi x1,..` immediately followed by `add ... x1`, where the second's source is still being computed. The [HAZ] detector watches stage latches every cycle for three trouble patterns: data hazards (RAW where forwarding cannot rescue, e.g. load-use), control hazards (a branch in EX whose direction is not yet known), structural hazards (two stages competing for the regfile or memory port). When one fires, [HAZ] asserts a stall — the offending stage and earlier stages hold their latches, later stages drain, and a bubble fills the gap. Without it, the pipeline reads stale operands and silently produces wrong answers.

## ROLE
Detects RAW/WAW/control/structural hazards and asserts stall to upstream stages.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
A network of [G] comparators between stage-latch operand fields plus a small priority encoder. No storage of its own — purely combinational over current latch contents.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: ID-stage source register tags + EX/MEM/WB destination tags + memory-stage flags.
- TOP: [CLK] gates each cycle's evaluation; configuration bits (e.g., enable forwarding which changes hazard rules).

## OUTPUTS
<!-- RIGHT -->
- RIGHT: `stall_F`, `stall_D` (hold these latches), `bubble_X` (insert NOP into EX), and a `lq_wait`/`structural_wait` flag.

## SYMBOL
<!-- bracketed token. None for connectors. -->
[HAZ]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
