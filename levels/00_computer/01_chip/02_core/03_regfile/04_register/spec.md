# spec — 00_computer/01_chip/02_core/03_regfile/04_register

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

<!-- Why does this level exist? What problem does it solve? What would break if you removed it?
     Answer this BEFORE describing structure. -->
A register is the level where bits become a *word*. RV32I is a 32-bit ISA, so 32 bits travel together everywhere — through the ALU, on the bus, in/out of memory. Bundling 32 `[FF]`s on a shared clock so they latch as a single unit is the smallest abstraction that lets every higher level talk in "values" instead of in "individual bits." Without this level, the visualization would have to show 32 wires every time a value moves — readable for one cycle, unreadable for a program. The register also defines the natural width of the datapath, which propagates upward as a constraint: the ALU is 32-bit because it operates on `[REG]`s, not because of any deeper choice.

## ROLE
Stores one RV32I word (32 bits) latched as a unit on a shared clock edge.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
32 `[FF]` arranged in a row, all driven by the same CLK. Optionally one shared `enable` line ANDed with CLK so a register can refuse to latch.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT (data): D[0..31] — 32-bit input bus
- TOP (control): CLK (rising edge latches), optionally `we` (write-enable / load-enable)

## OUTPUTS
<!-- RIGHT -->
- RIGHT: Q[0..31] — 32-bit output bus, held stable between clock edges

## SYMBOL
<!-- bracketed token. None for connectors. -->
`[REG]` — defined here per `GLOSSARY.md`. RV32I instance is 32 bits wide.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
