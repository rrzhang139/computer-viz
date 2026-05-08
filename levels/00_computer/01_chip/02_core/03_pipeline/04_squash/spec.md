# spec — 00_computer/01_chip/02_core/03_pipeline/04_squash

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

When a branch resolves wrong, an exception fires, or [LQ] detects a memory-ordering violation, every uop fetched after the offending one is *wrong-path* — it must be killed before it leaves a permanent trace. The [SQ] orchestrates this kill: it broadcasts a flush mask keyed by ROB age (kill everything younger than rob_id X), zeroes the relevant pipeline latches, restores the [RAT] from the branch checkpoint, rolls back the [RAS] stack pointer, drops [SB] non-retired entries, and redirects fetch to the correct PC. Without it, a single misprediction would taint architectural state and the program would diverge from spec.

## ROLE
Centralized flush controller; kills wrong-path uops on misprediction, exception, or LQ violation.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
A small FSM in [G] + a fanout of flush-enable signals to every per-stage and per-queue kill input. The FSM has ~3 states (idle, flushing, redirected).

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: source-of-flush signal (mispredict from [ROB] / exception from [TRAP] / violation from [LQ]) + offending rob_id and correct redirect-PC.
- TOP: [CLK]; priority arbitration (trap > exception > mispredict > violation).

## OUTPUTS
<!-- RIGHT -->
- RIGHT: per-stage `flush` signals, `redirect_pc` to frontend, RAT-checkpoint-restore enable, [SB] kill mask, [LQ] kill mask, [RS]/[ROB] young-side clear.

## SYMBOL
<!-- bracketed token. None for connectors. -->
[SQ]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
