# spec — 00_computer/01_chip/02_core/03_frontend/04_btb

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

To fetch the *next* line in the same cycle as the *current* line, the frontend can't wait for the decoder to even recognize the current bytes as a branch — by then it has already moved on. The [BTB] solves this by caching, indexed by PC, the *target address* of every taken branch the core has seen recently. On every fetch the BTB is consulted in parallel with the I-cache; on a hit it overrides PC+4 with the cached target before the bytes are even decoded. Remove it and every branch costs ≥1 bubble cycle while decode catches up.

## ROLE
PC-indexed cache mapping branch PC → predicted target address (single-cycle).

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
~512–4096 entries built from [REG] arrays + tag-comparator [G] tree. Each entry: {tag, target, type bits (cond/uncond/call/ret), valid}.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: current fetch PC (lookup key); on update, {branch PC, resolved target, type} from [ROB] retirement.
- TOP: [CLK]; write-enable (on branch resolve or new install).

## OUTPUTS
<!-- RIGHT -->
- RIGHT: predicted target address + hit/miss + entry-type bits → consumed by frontend redirect mux and by [PHT]/[RAS] arbitration.

## SYMBOL
<!-- bracketed token. None for connectors. -->
[BTB]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
