# spec — 00_computer/01_chip/02_core/03_rob

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

OoO execution lets independent instructions complete out of program order, but the architectural state visible to software must look as if everything happened in order — so a trap on instruction *N* must not see effects of instruction *N+1* that finished early. The [ROB] is the in-order ledger: every dispatched uop reserves a slot in tail order; slots commit only at the head, only when complete and exception-free. On a misprediction or fault, all slots from the offending one tailward are squashed atomically. Without the ROB, OoO would corrupt precise state and make exceptions/interrupts impossible.

## ROLE
Reorder buffer; tracks in-flight uops and retires them in program order to maintain precise state.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
~64–256 entries of [REG] storage. Each entry: {pc, pdst, pdst_old, completed-bit, exception-bit, branch-resolved-bit}. Multiple write ports for completion, single (head) commit port, multi-port flush.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: dispatched uop from rename (annotated with pdst, pdst_old, pc); completion signals from execution units (sets `completed=1` for entry); branch-resolution result (target + taken).
- TOP: [CLK]; flush from [SQ]; trap-vector signal from [TRAP].

## OUTPUTS
<!-- RIGHT -->
- RIGHT: retire signal — frees `pdst_old` to [FL], updates committed [RAT], commits store at [SB] head, advances [PC] arch state.
- mispredict signal up to [SQ] when branch resolves wrong way.

## SYMBOL
<!-- bracketed token. None for connectors. -->
[ROB]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
