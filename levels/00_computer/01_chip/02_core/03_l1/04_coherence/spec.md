# spec — 00_computer/01_chip/02_core/03_l1/04_coherence

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[MESI]` exists because multiple cores cache the same memory and writes have to *eventually* be visible. Without per-line state, two cores writing to the same `[CL]` would silently diverge and the program would observe values that no source order produced. MESI is the minimum bookkeeping that gives single-writer semantics: at any moment a line is Modified (this core has the only dirty copy), Exclusive (this core has the only clean copy), Shared (read-only, may be in others), or Invalid. Transitions are driven by *both* local accesses (read/write) and remote events (snoops). It's the simplest protocol that can be both correct and bandwidth-frugal — pure invalidate, no cache-to-cache forwarding overhead per write.

## ROLE
Per-line state machine on D-cache lines tracking Modified / Exclusive / Shared / Invalid; advance state on local read/write and on snoop messages from `_interconnect_ring`.

## MADE OF
2 state bits per `[CL]` (4 states), 1 small transition-table FSM made of `[G]`s, plus per-line snoop-comparator. All built from gates + the existing `[CL]` storage; no new primitive.

## INPUTS
- LEFT (data): line tag/index of access; remote snoop addresses arriving on the ring.
- TOP (control): local op (load/store/fence), snoop type (BusRd/BusRdX/Invalidate), clock.

## OUTPUTS
- RIGHT: state transition signal back to `[CL]` (sets E/M/S/I bits); ring response (data or ack); writeback request to `[L2]` when M-line is invalidated.

## SYMBOL
`[MESI]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
