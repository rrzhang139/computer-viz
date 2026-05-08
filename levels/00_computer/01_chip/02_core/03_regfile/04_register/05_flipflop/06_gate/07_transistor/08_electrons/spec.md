# spec — 00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop/06_gate/07_transistor/08_electrons

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

<!-- Why does this level exist? What problem does it solve? What would break if you removed it?
     Answer this BEFORE describing structure. -->
This is the floor of the abstraction tower — the level where "computation" stops being a metaphor and becomes physics. Every higher concept (a 1, a register, an instruction) is ultimately a population of electrons drifting through a doped silicon channel under an electric field. Without this level the user has no answer to "but what *is* a 1, really?" — the diagram of a transistor would be a black box with arrows. Showing the carrier drift makes the timing budget tangible: a clock cycle is "long enough for the channel to fill and the field to settle," not an arbitrary number. Remove this level and the realism claim of the entire visualization collapses to symbol-pushing.

## ROLE
Carrier drift through a MOSFET channel — the actual physical current that makes a transistor "on".

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
~10^4–10^5 mobile carriers (electrons in NMOS, holes in PMOS) per channel volume — atomic; we stop here. No previous-level `[BRACKET]` exists.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT (data): source potential V_S (electron reservoir)
- TOP (control): gate potential V_G (forms/breaks the inversion channel above threshold V_th)
- BOTTOM (implicit): bulk/body bias

## OUTPUTS
<!-- RIGHT -->
- RIGHT: drain current I_D — drift of carriers from source to drain when V_GS > V_th and V_DS > 0

## SYMBOL
<!-- bracketed token. None for connectors. -->
None — atomic level. No `[BRACKET]` defined; this is the physical substrate that the `[T]` level wraps.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
