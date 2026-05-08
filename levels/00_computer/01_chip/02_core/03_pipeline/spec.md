# spec — 00_computer/01_chip/02_core/03_pipeline

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A single-cycle CPU has to fit fetch + decode + register read + ALU + memory + writeback into one clock period — so the period is set by the slowest stage and the rest sits idle. Pipelining splits the work into N stages with [REG] latches between them; each stage can be clocked at its own (much faster) period and one instruction per cycle exits. The classic 5-stage F-D-X-M-WB scaffold is the V1 base story; the OoO additions (rename, ROB, RS) are augmentations on this skeleton. The pipeline level owns the *control timing*: stage latches, stalls, bubbles, flushes — and aggregates the [HAZ], [FWD], [SQ] sub-controllers.

## ROLE
5-stage in-order pipeline scaffold (F-D-X-M-WB) with hazard/forward/squash control.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
4 inter-stage [REG] latch banks (IF/ID, ID/EX, EX/MEM, MEM/WB) plus the [HAZ], [FWD], [SQ] sub-blocks. The actual datapath units (ALU, regfile, etc.) are children of `02_core`; this level owns the *scaffold* and the latch bookkeeping.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: uops from [FQ] (or directly from [DECODER] in V1 single-issue base story).
- TOP: [CLK] (drives every latch); [HAZ] stall signal; [SQ] flush signal.

## OUTPUTS
<!-- RIGHT -->
- RIGHT: writeback values to physical regs / [SB], retired uops to [ROB] (in OoO mode), [PC] update.

## SYMBOL
<!-- bracketed token. None for connectors. -->
No new bracket — this folder is a *region* covering the F-D-X-M-WB scaffold; sub-blocks [HAZ], [FWD], [SQ] are its children.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
