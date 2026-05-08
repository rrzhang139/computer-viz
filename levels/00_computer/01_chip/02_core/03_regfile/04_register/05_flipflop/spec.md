# spec — 00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

<!-- Why does this level exist? What problem does it solve? What would break if you removed it?
     Answer this BEFORE describing structure. -->
A flip-flop is the level where a circuit acquires *memory*. Pure gates settle on whatever their inputs are right now — they have no past. The flip-flop introduces feedback that lets a cell **hold** a bit between clock edges, which is the prerequisite for every stateful concept above it: registers, register files, pipeline stages, the program counter, caches, memory itself. It also exists to introduce the second great taming-of-time: instead of "outputs propagate continuously," everything synchronizes to a global clock edge. Remove this level and there is no place to stand still — a CPU made only of gates would race to undefined values within picoseconds. The flip-flop turns the chip from a swamp of transients into a sequence of well-defined cycles.

## ROLE
Stores 1 bit until the next clock edge — the elementary one-bit memory cell.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
~4 `[G]` wired with a feedback loop (canonical edge-triggered D-flip-flop = master-slave pair, ~6 NAND gates; we describe it as "~4 gates" to match the scaffold doc and `[FF]` glossary).

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT (data): D — the bit to capture
- TOP (control): CLK — global clock; rising edge latches D into Q

## OUTPUTS
<!-- RIGHT -->
- RIGHT: Q — the latched bit; held stable between clock edges

## SYMBOL
<!-- bracketed token. None for connectors. -->
`[FF]` — defined here per `GLOSSARY.md`.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
