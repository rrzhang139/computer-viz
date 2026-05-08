# spec — 00_computer/01_chip/02_core/03_rs

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

After rename, a uop knows which physical registers it needs but its operands may not be ready yet (the producer is still in the pipeline). The [RS] is a waiting room: a uop sits with its psrc tags listening on a broadcast bus; the moment both operands' "ready" bits flip, it bids for the matching execution port and issues. This is the *out-of-order* part of OoO — instructions issue based on data readiness, not program order. Without it, a single waiting load would stall everything behind it that doesn't depend on it.

## ROLE
Holds dispatched uops; wakes them up when operands are ready; issues to a free execution port.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
~16–48 entries (often partitioned by execution port). Each entry: {op, psrc1, src1_ready, psrc2, src2_ready, rob_id, port-class}. Wakeup-bus comparator [G] tree on every entry; per-port arbiter for issue.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: dispatched uop from rename; broadcast bus of "tag T just produced result" from execution units (writeback).
- TOP: [CLK]; flush from [SQ]; per-port issue-grant signal.

## OUTPUTS
<!-- RIGHT -->
- RIGHT: issued uop (with both operand-ready signals true) → directed to its [ALU]/[AGU]/[MUL]/[DIV] execution port.
- entry-free signal back to dispatch.

## SYMBOL
<!-- bracketed token. None for connectors. -->
[RS]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
