# spec — 00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop/06_gate/07_transistor

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

<!-- Why does this level exist? What problem does it solve? What would break if you removed it?
     Answer this BEFORE describing structure. -->
A transistor is the *first usable abstraction*: a voltage-controlled switch. Below this, you have continuous physics (drifting carriers); above this, you can compose discrete logic. The level exists to bridge those two regimes with one rule — "gate high closes the switch" — that the rest of the visualization can rely on without ever again thinking about charge densities or threshold voltages. Remove this level and every higher level (gates, flip-flops, the entire CPU) is left dangling on top of physics it pretends to ignore. The transistor is also the unit cost of a chip: counting `[T]`s is how the rest of the tower reasons about area and power.

## ROLE
A voltage-controlled switch — the smallest discrete logic primitive built from physics.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
1 doped silicon channel populated by mobile carriers (atomic — `08_electrons/` is the physical substrate, not a `[BRACKET]`). Static-CMOS context is two complementary devices: 1 NMOS + 1 PMOS, but each is one `[T]`.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT (data): source terminal — the "input" voltage being switched
- TOP (control): gate terminal — the binary control that opens or closes the channel
- BOTTOM (implicit): bulk/body tied to Vdd (PMOS) or Vss (NMOS)

## OUTPUTS
<!-- RIGHT -->
- RIGHT: drain terminal — connects to source when gate is asserted, else floats / open

## SYMBOL
<!-- bracketed token. None for connectors. -->
`[T]` — defined here per `GLOSSARY.md`.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
