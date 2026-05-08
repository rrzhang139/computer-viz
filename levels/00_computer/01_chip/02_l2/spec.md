# spec — 00_computer/01_chip/02_l2

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[L2]` exists because the L1↔L3 latency gap is too large to bridge with one cache. L1 must be tiny (~32 KB) to hit in 4 cycles; L3 is large but ~40 cycles away on the ring. L2 fills the middle: ~256 KB–1 MB per core, ~12 cycles, *unified* (I+D in one structure). Most cache misses out of L1 hit here, so the core never sees the ring or the LLC most of the time. L2 is also the natural place for hardware prefetching to land (deep enough to be useful, close enough to hide most of its latency). Without it, every L1 miss would pay LLC latency and the IPC would collapse on any working set bigger than 32 KB.

## ROLE
Per-core mid-level cache, unified, ~256 KB–1 MB, ~12-cycle hit. Backstop for L1 misses, prefetch landing zone, ring's first port of call from this core.

## MADE OF
~256 KB–1 MB SRAM array organized as 8–16-way set-associative `[CL]`s + per-bank `[MSHR]` + per-line coherence state (mirrors L1 `[MESI]` semantics) + an L2 prefetcher. (Assumed write-back, mostly-inclusive of L1 — coherent superset.)

## INPUTS
- LEFT (data): miss requests + writeback data from `[L1]`; refill lines arriving from the ring (from `[L3]` or memory).
- TOP (control): clock from `[CLK]`, snoop messages from `_interconnect_ring`, prefetch hint signals from `[PFE]`.

## OUTPUTS
- RIGHT: line back to `[L1]` on hit; miss request out to `_interconnect_ring/` toward the appropriate `[L3]` slice; dirty victim writeback to L3; coherence response on the ring.

## SYMBOL
`[L2]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
