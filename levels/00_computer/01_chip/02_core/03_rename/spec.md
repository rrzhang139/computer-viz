# spec — 00_computer/01_chip/02_core/03_rename

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

RV32I has only 32 architectural registers, but an OoO core wants tens of in-flight instructions, many of which write the same arch register (write-after-write hazards) or read an old value while a newer write is pending (write-after-read). The [RAT] solves this by remapping each arch register to one of *physical* registers from a much larger pool ([FL]); a new write gets a fresh physical slot, the prior mapping stays alive for in-flight readers. False dependencies vanish, and the OoO scheduler ([RS], [ROB]) can reorder freely. Remove rename and an OoO core collapses back to the strict serial dependencies of an in-order machine.

## ROLE
Maps each architectural register reference (rs1/rs2/rd) to a physical-register tag.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
1 32-entry table of [REG] cells (arch→phys mapping), checkpoint copies for each in-flight branch, comparator [G] tree for read-port lookups.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: decoded uop with arch rs1/rs2/rd from [FQ].
- TOP: [CLK]; allocate-from-[FL] enable; checkpoint-restore on squash from [SQ]; commit-update on retire from [ROB].

## OUTPUTS
<!-- RIGHT -->
- RIGHT: uop annotated with physical (psrc1, psrc2, pdst) tags → consumed by [RS]/[ROB] at dispatch.

## SYMBOL
<!-- bracketed token. None for connectors. -->
[RAT]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
