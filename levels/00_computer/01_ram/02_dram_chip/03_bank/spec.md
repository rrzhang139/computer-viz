# spec — 00_computer/01_ram/02_dram_chip/03_bank

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A `[BANK]` is the unit where DRAM's biggest performance secret lives — the **row buffer**. To read any bit you must first ACTIVATE its row, which dumps ~8 KB of capacitor charges onto the sense-amplifier strip; that strip then *acts as a fast SRAM* for any column in the same row, until you precharge and move on. So accesses to the same row are cheap (column-only, ~CL cycles) but accesses to a different row are expensive (precharge + activate + column = ~3x worse). Every cache-friendly stride pattern, every memory controller scheduler, every `numactl --interleave` tweak ultimately exists because of this row-buffer rule. Without separating banks, the whole chip would have one row open and parallelism would be zero.

## ROLE
A 2D row × column matrix of DRAM cells with a sense-amplifier strip along the bottom; holds at most one ACTIVE row at a time as the row buffer.

## MADE OF
~64k rows × ~1024 columns of [DCELL] (≈64 Mbit per bank), one sense-amp per column forming the row buffer (~8 KB), row decoder on the LEFT, column decoder + read latch on the BOTTOM-RIGHT.

## INPUTS
- LEFT (data): write data into the row buffer (column-targeted) on WR commands.
- TOP (control): row address (RA) for ACT, column address (CA) for RD/WR, PRE to close the open row.

## OUTPUTS
- RIGHT (data): selected column slice of the row buffer streamed out on RD commands.

## SYMBOL
[BANK]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- exactly **one** row may be active per bank at any time
- row hit ≈ CL cycles; row conflict ≈ tRP + tRCD + CL
- row-buffer locality is what makes sequential memory access fast
