# spec — 00_computer/01_chip/02_l3/03_directory

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The `[DIR]` exists because *broadcast* snooping doesn't scale — once you have many cores, blasting every coherent access to every core's `[MESI]` is bandwidth-fatal. A directory entry per line records which cores currently share or own it, so the LLC can target snoops only at the relevant subset. That's the trick that makes shared-memory multi-core actually usable past 4–8 cores. Without `[DIR]`, either the ring saturates or coherence has to fall back to broadcast and every store ricochets across the whole chip.

## ROLE
Per-LLC-slice directory: one entry per resident cache line records the sharer set (or owner) so coherence requests fan out only to interested cores. Snoop filter.

## MADE OF
~1 entry per `[CL]` in this LLC slice, each entry = sharer-bitvector (one bit per core) or compressed pointer-set + state (Owned/Shared/Invalid mirrored from `[MESI]`). SRAM-backed; built from `[FF]`/`[REG]`s.

## INPUTS
- LEFT (data): incoming coherent op (line address + op type) from `_interconnect_ring`; sharer responses returning from cores.
- TOP (control): clock from `[CLK]`, allocate-on-fill / dealloc-on-eviction signals from `[L3]`.

## OUTPUTS
- RIGHT: snoop targeting (which cores to message), coherence response back to requester, eviction-induced back-invalidates when a directory entry must be reused.

## SYMBOL
`[DIR]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
