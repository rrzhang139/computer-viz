# spec — 00_computer/01_chip/02_core/03_regfile

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

<!-- Why does this level exist? What problem does it solve? What would break if you removed it?
     Answer this BEFORE describing structure. -->
The register file is the level where the ISA's *programmer-visible state* lives. RV32I defines 32 architectural registers `x0..x31`; the regfile is literally those 32 named drawers, plus the read/write ports that let an instruction pull two operands and push one result every cycle. Without this level, every instruction would have to address memory — slow, indirect, and indistinguishable from data movement. The regfile gives each instruction a fast, named scratchpad that the entire programming model rests on. It is also where ISA conventions like "x0 is hardwired to zero" get enforced; remove this level and `addi x1, x0, 5` has nothing to mean.

## ROLE
The architectural register file: 32 named 32-bit registers x0..x31, with x0 hardwired to zero, exposed as 2 read ports + 1 write port per cycle.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
32 `[REG]` (one per architectural register), plus mux trees for the 2 read ports and decoder logic for the write port. x0's `[REG]` may be elided (output forced to 0).

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT (data): write_data (32 bits) — value to write back this cycle
- TOP (control):
  - `rs1_idx`, `rs2_idx`, `rd_idx` — three 5-bit register indices from the decoder
  - `we` — write-enable (1 = perform writeback)
  - CLK — global clock (writes are typically negative-edge triggered or mid-cycle to avoid same-cycle hazards)

## OUTPUTS
<!-- RIGHT -->
- RIGHT: `rs1_val`, `rs2_val` — two 32-bit operand buses for the ALU/AGU/branch unit

## SYMBOL
<!-- bracketed token. None for connectors. -->
No bracket of its own — `GLOSSARY.md` does not assign one. The component is referenced by name as the "regfile" and exposes 32 `[REG]` instances.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
