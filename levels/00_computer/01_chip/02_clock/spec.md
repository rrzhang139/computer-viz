# spec — 00_computer/01_chip/02_clock

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Every `[FF]` on the chip needs a clock edge to latch on. `[CLK]` is what produces that edge — a PLL multiplies a low-frequency board reference (~100 MHz) up to GHz, then a balanced clock-tree distributes it across the die so every flip-flop sees the rising edge within a tight skew budget. Without it, the synchronous datapath simply does not advance. Per-core domains exist so DVFS can slow one core without slowing the whole chip, and so a stalled core can clock-gate cleanly. Skew, jitter, and tree-power are the three things that bound max frequency.

## ROLE
Generate the chip's high-frequency reference (PLL) and distribute it via a balanced clock-tree to every clocked element, with multiple per-core / per-uncore domains.

## MADE OF
1+ PLL (analog phase-locked loop locking onto an external XTAL/reference) + a clock-tree network of buffers/inverters distributing each domain + per-domain clock gates for power management. Built from `[T]`/`[G]` and analog blocks; the underlying physics lives at `08_electrons`/`07_transistor`.

## INPUTS
- LEFT (data): external reference clock (board crystal / 100 MHz REFCLK).
- TOP (control): frequency-target / ratio CSRs from `[PMGR]`, lock/unlock commands, clock-gate enables.

## OUTPUTS
- RIGHT: per-domain clock signals fanned out to every `[CORE]`, `[L3]` slice, `[MEMCTRL]`, and `_interconnect_ring/` stop. Lock-status flag back to firmware.

## SYMBOL
`[CLK]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
