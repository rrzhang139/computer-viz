# spec — 00_computer/01_chip/02_core/03_frontend/04_predictor

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The [BTB] tells you *where* a branch goes if taken; it does not tell you *whether* it will be taken. Conditional branches need a separate "direction" guess, and the bias depends on the path that led to it (a loop's `bne` is taken N-1 times, not-taken once). The [PHT] is a table of 2-bit saturating counters indexed by branch history (XORed with PC for gshare, or longer-history for TAGE-style); each counter remembers "this path-tagged branch was taken, taken, taken — keep guessing taken". Without it the core would either always-taken or always-not, costing ~10% IPC on real workloads. V1 visualization assumes a simple gshare-style table.

## ROLE
Predicts taken/not-taken direction for conditional branches.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
~4K–16K 2-bit counters in an SRAM/[REG] array, XOR-hasher of (PC, global-history-register) = index, small saturator [G] cluster for updates.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: branch PC + global history register (GHR) bits for index hash; resolved-direction signal from [ROB] for training.
- TOP: [CLK]; train-enable (asserts on branch retire).

## OUTPUTS
<!-- RIGHT -->
- RIGHT: 1-bit predicted direction (top counter bit) → consumed by frontend next-PC mux to choose between [BTB] target and PC+4.

## SYMBOL
<!-- bracketed token. None for connectors. -->
[PHT]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
