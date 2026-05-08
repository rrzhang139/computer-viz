# spec — 00_computer/01_chip/02_core/03_l1/04_cacheline

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A `[CL]` is the unit of *transfer* between every level of the hierarchy — bytes move at line granularity, never one at a time, because amortizing tag/control overhead and DRAM activate latency over 64 bytes is the only way to get usable bandwidth. The line is also the unit of *coherence*: ownership and dirtiness are tracked per line, so two cores writing different bytes of the same line still ping-pong. Without this granularity choice you'd either waste bandwidth (single-byte fills) or lose precision (page-grain coherence is unworkable). The address split into tag/index/offset is just the consequence of fixing the line size.

## ROLE
One 64-byte cache line: holds a contiguous chunk of physical memory, plus its tag bits, valid bit, dirty bit, and (in D-cache) MESI state. The unit `[L1]`/`[L2]`/`[L3]` arrays are sized in.

## MADE OF
~512 storage `[FF]`/SRAM bits for the data payload (64 B × 8) + ~20 tag-bit cells + valid + dirty + 2 MESI-state bits + per-set replacement bits. Conceptually one row of an `[L1]` way.

## INPUTS
- LEFT (data): refill bytes from `[L2]`/ring; store data from `[WB]`.
- TOP (control): index decoder selecting this line, tag-compare result, MESI transition signal, fill/evict commands.

## OUTPUTS
- RIGHT: requested word/byte (after offset mux) on hit; line bytes streamed out on eviction or coherence response.

## SYMBOL
`[CL]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
