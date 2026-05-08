# spec — 00_computer/01_chip/02_core/03_pipeline/04_forward

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Most data hazards do not actually need a stall: the producing instruction has the result inside its EX/MEM latch *right now* — it just hasn't written it back to the regfile yet. The [FWD] mux short-circuits that result directly into the consumer's EX inputs, paying zero extra cycles. This turns most RAW hazards into free passes; only load-use (where the value isn't ready until end of MEM) still requires a 1-cycle stall. Without forwarding, every `add` after a producer would cost 2 bubble cycles — pipeline IPC would tank.

## ROLE
Bypass mux that routes EX/MEM/WB-stage results back into EX operand inputs.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
Two N-input muxes (one per ALU input) built from [G], plus tag comparators selecting the right source.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: ALU inputs from regfile read OR EX/MEM latch result OR MEM/WB latch result (or [WB]-stage value).
- TOP: select bits from a small comparator that matches consumer's psrc tags against producer-stage pdst tags.

## OUTPUTS
<!-- RIGHT -->
- RIGHT: chosen operand value forwarded into [ALU] (or [AGU]) inputs.

## SYMBOL
<!-- bracketed token. None for connectors. -->
[FWD]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
