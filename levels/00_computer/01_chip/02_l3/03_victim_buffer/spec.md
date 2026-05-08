# spec — 00_computer/01_chip/02_l3/03_victim_buffer

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[VB]` decouples *when L3 picks a victim* from *when DRAM is ready to take it*. Evictions happen on every fill, but `[MEMCTRL]` is busy and the line might still be wanted by another core. A small buffer holds the just-evicted lines so (a) writebacks don't stall fills, (b) a same-cycle re-reference can grab the line back from the buffer (a tiny "L3.5" hit), and (c) the memory controller can batch writebacks for row-buffer efficiency. Without it, every eviction blocks an LLC port until DRAM accepts it.

## ROLE
Hold `[CL]`s evicted from `[L3]` until they're either reclaimed by a same-line request (saving a DRAM round-trip) or drained to `[MEMCTRL]`. Smooths the LLC↔DRAM rate mismatch.

## MADE OF
~8–32 entries, each = line address + line data + dirty/clean tag, plus a small comparator for re-hit lookup. Built from `[REG]`/`[FF]` storage; no new primitive.

## INPUTS
- LEFT (data): victim line + address from `[L3]` on eviction; same-line lookup queries from incoming requests (rescue path).
- TOP (control): clock, drain-to-memctrl scheduling signal, full-watermark backpressure.

## OUTPUTS
- RIGHT: writeback request to `[MEMCTRL]` (data + paddr); re-hit response back into `[L3]` if a request finds its target here; "VB-full" stall back to LLC eviction logic.

## SYMBOL
`[VB]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
