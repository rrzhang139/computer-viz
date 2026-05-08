# spec — 00_computer/01_chip/02_l3

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[L3]` is the *last* line of defense before DRAM and the only on-chip cache *shared* across all cores. Its size (~8–64 MB) is what lets multi-threaded workloads keep their working set on-die. Sharing across cores also means it's the natural place to host the coherence directory: the LLC sees every core's miss, so it knows who has each line and who needs invalidating. Without L3, every L2 miss would hit DRAM at ~100 ns, and every cross-core line would have to be snooped on the ring rather than looked up in a directory — bandwidth and energy would both blow up. (Assumed inclusive or non-inclusive-with-directory; `[VB]` exists for the non-inclusive eviction path.)

## ROLE
Shared last-level cache: ~8–64 MB sliced across the ring; ~40-cycle hit; serves L2 misses; hosts the coherence `[DIR]`; emits dirty victims to `[VB]` → `[MEMCTRL]`.

## MADE OF
N `[L3]` slices (one per ring stop) of `[CL]` arrays, totaling many MB; 1 `[DIR]` per slice for sharer tracking; 1 `[VB]` per slice on the eviction path; 1 `[REPL]` policy per slice for victim selection. (Assumed sliced and non-inclusive; coherence enforced by `[DIR]`.)

## INPUTS
- LEFT (data): L2-miss requests arriving from `_interconnect_ring`; fill data arriving from `[MEMCTRL]`/`[RAM]`.
- TOP (control): clock, snoop responses from cores, control writes (CSR-based partitioning, way enables).

## OUTPUTS
- RIGHT: line back onto the ring toward the requesting `[L2]`; miss request to `[MEMCTRL]`; coherence broadcasts derived from `[DIR]` lookup; victim line into `[VB]`.

## SYMBOL
`[L3]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
