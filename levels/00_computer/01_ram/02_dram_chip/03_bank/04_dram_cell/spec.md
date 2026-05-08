# spec — 00_computer/01_ram/02_dram_chip/03_bank/04_dram_cell

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A `[DCELL]` is the smallest object in the entire memory hierarchy: **one transistor, one capacitor**, storing exactly one bit. It is the reason DRAM is small and cheap (one `[T]` per bit vs ~6 in SRAM) and also the reason DRAM is **volatile** — the storage capacitor is so tiny that its charge leaks through subthreshold currents and junction leakage in tens of milliseconds, after which the bit becomes unreadable. That single physical fact justifies the existence of the entire `[REFRESH]` machinery a level up. Read is destructive too: pulling the wordline dumps the cap onto the bitline, partially discharging it, so every read must be followed by a writeback (which the sense amp does for free as part of activating the row).

## ROLE
Stores 1 bit as the presence (1) or absence (0) of charge on a tiny capacitor, gated by an access transistor.

## MADE OF
1x [T] (access transistor; gate = wordline, source = bitline, drain = capacitor top plate) + 1 storage capacitor (~10 fF) to ground.

## INPUTS
- LEFT (data): bitline carries the 0/1 charge level on writes.
- TOP (control): wordline (gate of the access transistor); high = cell connected to bitline.

## OUTPUTS
- RIGHT (data): on read, the cap shares charge with the precharged bitline, nudging it slightly toward the stored value; the sense amp downstream amplifies that delta to a full 0 or 1.

## SYMBOL
[DCELL]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- 1T1C — fundamental cell topology
- charge leaks (subthreshold + junction): bit corrupts within tens of ms unless restored
- read is destructive; sense amp restores charge after every ACT (and so does `[REFRESH]`)
