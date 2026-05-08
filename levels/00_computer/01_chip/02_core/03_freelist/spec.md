# spec — 00_computer/01_chip/02_core/03_freelist

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Rename needs a *new* physical register to allocate every time an instruction writes a destination, and once that destination has been overwritten by a younger committed instruction, the old physical slot becomes recyclable. The [FL] is the bookkeeper: a queue of currently-unallocated physical-register IDs. Pop on rename, push on retire (when [ROB] commits the *next* writer of the same arch register, freeing the prior `pdst_old`). If the FL ever empties, dispatch must stall until a retirement frees a tag — so its size is a direct cap on in-flight instructions.

## ROLE
Pool of unallocated physical-register tags; rename pops from here, ROB retire pushes back.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
~64–192 entries of [REG] (one per physical-register ID), head/tail pointer counters, multi-port read for wide rename, multi-port write for wide retire.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: physical-register IDs being released (`pdst_old` from [ROB] retirement).
- TOP: [CLK]; allocate-pop signal from rename; release-push signal from ROB; full-flush from [SQ] reset (rare, e.g. trap).

## OUTPUTS
<!-- RIGHT -->
- RIGHT: free physical-register IDs (head entries) → consumed by [RAT].
- empty/full status → backpressure on rename.

## SYMBOL
<!-- bracketed token. None for connectors. -->
[FL]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
