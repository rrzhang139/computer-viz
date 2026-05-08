# spec — 00_computer/01_chip/02_core/03_l1

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[L1]` is the closest cache to the pipeline — the only memory the core can touch in single-digit cycles. It's split I/D so the front-end can fetch instructions while the load/store unit reads data without contending for one port. Without it, every `lw`/`sw` would walk to L2 (~12 cycles) or L3 (~40 cycles) and the pipeline would stall on every memory op — the entire point of caches is that the working set fits *here*. L1 is also where the address gets split into tag/index/offset; everything below it operates in cache-line units, not bytes.

## ROLE
First-level cache, split into L1-I (read-only fetch) and L1-D (load/store), each ~32 KB, ~4-cycle hit. Holds frequently-touched cache lines; backs misses through `[L2]` and beyond.

## MADE OF
2 banks (I-cache + D-cache) of `[CL]` arrays (~32 KB each, typically 8-way set-associative) + 1 `[MSHR]` table per bank for in-flight misses + 1 `[WB]` between core stores and D-cache + per-line `[MESI]` state on D-cache. (Assumed write-back, write-allocate D-cache; I-cache read-only.)

## INPUTS
- LEFT (data): virtual/physical addresses + store data from the core; refill lines from `[L2]`.
- TOP (control): clock from `[CLK]`, snoop messages from `_interconnect_ring`, fence/flush signals.

## OUTPUTS
- RIGHT: load value back to `[REG]` on hit; miss request out to `[L2]`; coherence response out to ring; dirty victim line on eviction.

## SYMBOL
`[L1]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
