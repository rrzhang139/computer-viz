# spec — 00_computer/01_ram/02_dram_chip

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A DRAM die is the actual silicon that stores bits. It packs roughly **8 banks** of capacitor arrays plus a peripheral logic ring (CA decoder, mode registers, refresh counter, DQ I/O drivers, DLL) onto a single chip. The bank split exists for a brutal reason: a single bank can have at most one row "open" at a time, and switching rows costs ~14 ns of `tRCD`. With 8 banks the controller can pipeline — issue an activate to bank 3 while bank 1 is still streaming columns — hiding most of that latency. Without this internal structure, DRAM throughput would collapse to one row per cycle and bandwidth would be unusable.

## ROLE
One DRAM die package — the smallest unit you can buy as a chip. Decodes commands from the CA bus, routes them to the correct bank, and drives 8 bits of DQ.

## MADE OF
8x [BANK] organized in 2 bank groups, plus peripheral ring: command/address decoder, mode registers, [REFRESH] counter, DQ I/O drivers, DLL/PLL.

## INPUTS
- LEFT (data): DQ[7:0] write data lanes for this chip's slice of the rank.
- TOP (control): CA bus (BA, RA, CA fields), CLK, CKE, CS# (only acts when its rank's CS# is low).

## OUTPUTS
- RIGHT (data): DQ[7:0] read data, gated by DQS.

## SYMBOL
[DRAM]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- pads on package perimeter (BGA balls); peripheral logic ring around the bank array
- one die = ~16 Gb capacity in modern DDR5 parts
