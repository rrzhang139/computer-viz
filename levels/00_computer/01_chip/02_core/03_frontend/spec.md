# spec — 00_computer/01_chip/02_core/03_frontend

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The execution backend ([RS], [ROB], [ALU]) needs a steady stream of decoded uops to do useful work, but the program counter only knows where to fetch *after* a branch resolves — too late. The frontend's job is to *speculate forward*: predict the PC chain, fetch I-cache lines along that chain, decode RV32I bytes into uops, and feed [FQ] before backend slots go idle. Remove it and the pipeline starves on every taken branch (every ~5 instructions), turning a multi-GHz core into a glorified single-cycle MCU. V1 base story: single-issue F-D pipeline; OoO additions ([BTB], [PHT], [RAS]) augment the predicted PC path. The frontend is also the single place where mispredicts originate, so the squash signal from the backend lands here.

## ROLE
Speculatively produces a stream of decoded RV32I uops, indexed by predicted PC.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
1 [PC] register, 1 [BTB], 1 [PHT], 1 [RAS], 1 [DECODER], 1 [FQ]; reads from [L1] (I-side).

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: I-cache lines from [L1] indexed by predicted PC; branch-resolution feedback from [ROB] (taken/not-taken, target).
- TOP: [CLK]; squash/redirect signal from [SQ] (carries new PC); stall from [FQ]-full.

## OUTPUTS
<!-- RIGHT -->
Decoded uop stream into [FQ] (RIGHT), one uop per fetch slot per cycle (single-issue base; widen to N for superscalar).

## SYMBOL
<!-- bracketed token. None for connectors. -->
No new bracket — `03_frontend` is a *region* containing [BTB], [PHT], [RAS], [DECODER], [FQ]. Higher levels reference those individually.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
