# spec — 00_computer/01_chip/02_core/03_alu

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

<!-- Why does this level exist? What problem does it solve? What would break if you removed it?
     Answer this BEFORE describing structure. -->
The ALU is the level where the chip stops shuffling bits and starts *computing* with them. Loads, stores, branches, and address arithmetic all collapse onto integer add/sub/and/or/xor/shift/compare — the ALU is the single combinational block that performs them. It exists to consolidate "everything that doesn't need state and finishes within one cycle" into one piece of fabric, fed from the regfile and feeding back into it. Remove this level and `add x3, x1, x2` is unimplementable; equally, every memory address (`base + offset`) and every branch comparison (`rs1 == rs2 ?`) loses its computational substrate. The ALU is the *workhorse* — small, fast, and used by almost every instruction.

## ROLE
Combinational integer arithmetic + logic on two 32-bit operands: add, sub, and, or, xor, sll, srl, sra, slt, sltu.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
Hundreds of `[G]` wired into:
- one 32-bit adder (carry-lookahead or carry-select for speed),
- bitwise AND/OR/XOR fabrics,
- a barrel shifter for SLL/SRL/SRA,
- a comparator for SLT/SLTU,
- a result mux selecting one of the above based on `op`.
**No `[FF]`s** — fully combinational, output appears within the cycle.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT (data): A (32 bits, from rs1), B (32 bits, from rs2 or sign-extended immediate)
- TOP (control): `op` (4-5 bits selecting add/sub/and/or/xor/sll/srl/sra/slt/sltu) — corresponds to `ExecutionState.aluOp`

## OUTPUTS
<!-- RIGHT -->
- RIGHT: `result` (32 bits) → writeback into rd
- RIGHT (flags): `zero`, `negative`, `overflow` — used by branch logic in pipeline

## SYMBOL
<!-- bracketed token. None for connectors. -->
`[ALU]` — defined here per `GLOSSARY.md`.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
