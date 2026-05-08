# spec — 00_computer/01_chip/02_core/03_frontend/04_ras

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A `ret` instruction's target is whatever address was written to the link register at the matching `call`, which the [BTB] cannot capture: the same `ret` returns to dozens of different callers depending on call site. The [RAS] solves this by mirroring the runtime call stack at the *predict* stage — push the return address (PC+4 of the call) on every `call`, pop it on every `ret`, and the popped value is the predicted target. Without it, returns mispredict almost always; with it, returns hit ~99% accuracy on well-nested code.

## ROLE
LIFO of return addresses; provides predicted target for `ret`-classified instructions.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
~16–32 entries of [REG] storage + a small top-of-stack pointer counter [G] + push/pop control logic.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: PC+4 of a `call` (push value); branch-type bits from [BTB] saying "this is a `ret`".
- TOP: [CLK]; push (on call), pop (on ret), squash-restore (on misprediction the SP is rewound).

## OUTPUTS
<!-- RIGHT -->
- RIGHT: predicted return address (top entry) → consumed by frontend next-PC mux when [BTB] type = `ret`.

## SYMBOL
<!-- bracketed token. None for connectors. -->
[RAS]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
