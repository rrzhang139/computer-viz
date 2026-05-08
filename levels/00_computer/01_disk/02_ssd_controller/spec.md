# spec — 00_computer/01_disk/02_ssd_controller

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

NAND is brutally inflexible: pages can be programmed but never overwritten in place, blocks must be erased before reuse, cells wear out after a finite number of program/erase cycles, and bit errors accumulate as cells age. The host wants none of this — it wants a flat array of LBAs it can read and write at will. `[SSDCTRL]` is the SoC that bridges that gap: it speaks NVMe to the host, hides the asymmetry and the wear, runs error correction on every read, and continuously reshuffles data behind the user's back. Strip it out and the drive looks like raw flash with all its sharp edges exposed.

## ROLE
The flash controller SoC that translates NVMe commands into ONFI channel transactions, manages FTL mapping, scheduling, garbage collection, ECC, and power-loss protection.

## MADE OF
1 SoC die containing: a host interface block (NVMe + PCIe MAC, talks to `[_nvme_link]`), 1 `[FTL]` engine, 1 `[GC]` engine, 1 `[ECC]` engine, 4–16 channel controllers each driving one `[FCH]`, ~2–4 embedded ARM cores running drive firmware, a small SRAM/DRAM cache for hot mapping table entries.

## INPUTS
- LEFT (data): NVMe SQEs + write payload from `[_nvme_link]`
- TOP (control): firmware events (DRAM mapping table loads, GC trigger thresholds, thermal/power throttling, doorbell ringtones)

## OUTPUTS
- RIGHT (data): ONFI/Toggle bursts to NAND dies via `[FCH]`s; completion-queue entries + read payload back through `[_nvme_link]` to host

## SYMBOL
`[SSDCTRL]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row: `02_ssd_controller` (1 anim sec ⇒ 10 µs)
- internal pipeline: NVMe parse → FTL lookup → ECC encode/decode wrap → channel scheduler → ONFI burst

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
