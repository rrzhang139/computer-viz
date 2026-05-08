# spec — 00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop/06_gate

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

<!-- Why does this level exist? What problem does it solve? What would break if you removed it?
     Answer this BEFORE describing structure. -->
The logic gate is the level where boolean algebra becomes hardware. Above this level, every concept (an adder, a multiplexer, a flip-flop) is composed from gates without ever again referring to silicon. Below this level, you have switches that don't yet *compute* anything. The gate exists to demonstrate the universality fact that drives the whole digital era: NAND alone can express any boolean function, so once you can build a NAND from a handful of `[T]`s, you can build everything. Remove this level and the jump from "transistor switch" to "flip-flop with feedback" is unmotivated — gates are the glue that turns physics into algebra.

## ROLE
A boolean function (AND, OR, NOT, NAND, NOR, XOR) of its inputs — the smallest combinational compute unit.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
2–4 `[T]` wired in series/parallel for static CMOS (e.g., 2-input NAND = 2 NMOS in series + 2 PMOS in parallel = 4 `[T]`). Inverter is 2 `[T]`. We assume **static CMOS** as the canonical layout.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT (data): A, B (and possibly C, D for wider gates) — boolean input rails
- TOP (control): none for a pure combinational gate; Vdd is implicit on top, Vss on bottom

## OUTPUTS
<!-- RIGHT -->
- RIGHT: Q — the boolean output, settled within propagation delay (~10–100 ps)

## SYMBOL
<!-- bracketed token. None for connectors. -->
`[G]` — defined here per `GLOSSARY.md`. Specific kinds (`[NAND]`, `[NOR]`, etc.) are sub-flavors but not separately registered.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
