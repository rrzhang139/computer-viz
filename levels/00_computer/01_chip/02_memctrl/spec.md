# spec — 00_computer/01_chip/02_memctrl

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[MEMCTRL]` exists because DRAM is a constrained, stateful machine — banks, rows, columns, refresh, timing parameters (tRCD/tRP/tCL/tRAS/tFAW/tREFI) — and the cores need a clean interface that just says "fetch this line." The controller queues up `[L3]` misses + writebacks, opens/closes rows, schedules commands across channels/ranks/banks for row-buffer locality, interleaves refresh, and respects ordering rules so DDR signal integrity holds. Without it, every core would have to be a DRAM expert, channels would be idle 90% of the time, and refresh deadlines would be missed.

## ROLE
DRAM controller: queue/schedule LLC-miss requests, drive DDR command/address/data buses on each channel, manage row-buffer state, interleave refresh, enforce DDR timing.

## MADE OF
1+ channel front-end (request queue + scheduler + read/write CAMs) + per-channel DDR PHY interface + refresh counter + per-bank row-state tracker. Built from `[REG]`/`[G]`-level logic; the analog DDR bus itself lives in `_dram_bus/` (cross-tree, parent of `[CHIP]`).

## INPUTS
- LEFT (data): L3-miss request from `_interconnect_ring` / `[VB]`; write data; physical address.
- TOP (control): clock, refresh timer, ECC config CSR, throttle hint from `[PMGR]`.

## OUTPUTS
- RIGHT: DDR command + address + data onto `_dram_bus`; fill data back into `[L3]`/`_interconnect_ring` when DRAM responds; ECC error report to `[TRAP]`.

## SYMBOL
`[MEMCTRL]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
