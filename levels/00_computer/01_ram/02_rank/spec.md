# spec — 00_computer/01_ram/02_rank

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A single DRAM die only exposes a slice of the data bus (commonly 4 or 8 bits wide), but the `[MEMCTRL]` wants 64 bits per cycle on every DDR5 read or write. The fix is to wire **eight `[DRAM]` chips in parallel**, share command/address pins across all of them, and split the 64-bit DQ word so each chip drives 8 bits. That bundle is a `[RANK]`. Without ranks you would either need an impossibly wide single die or pay 8x more bus turnarounds per cache line. Ranks are also the unit of chip-select: only one rank on a channel may drive DQ at a time, so the controller uses ranks to time-multiplex multiple DIMMs without contention.

## ROLE
A group of DRAM chips selected together by one chip-select (CS#) line, presenting a single 64-bit-wide DDR5 data interface to the bus.

## MADE OF
8x [DRAM] (×8 organization). Each chip contributes 8 bits to DQ[0..63]. ECC ranks add a 9th chip for DQ[64..71].

## INPUTS
- LEFT (data): DQ[0..63] write lanes, striped — chip n receives DQ[8n..8n+7].
- TOP (control): CA bus, CLK, CKE, and one CS# pin selecting this rank; broadcast to all chips in the rank.

## OUTPUTS
- RIGHT (data): DQ[0..63] read lanes, restriped from each chip's 8-bit slice; DQS strobes drive timing.

## SYMBOL
[RANK]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- only one rank per channel may drive DQ at a given cycle (CS# arbitration)
- ranks share the bus but have **independent banks**, so the controller can interleave reads across ranks for bandwidth
