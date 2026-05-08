# spec — 00_computer/01_chip/02_core

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A `[CORE]` is the canonical fetch-decode-execute engine — the smallest unit that *runs a program*. Everything below it (`[ALU]`, `[REG]`, `[L1]`) computes; everything above it (`[CHIP]`, `00_computer`) just feeds and packages. Without `[CORE]`, the chip is just storage and wires — there is no "current instruction." The core also draws the line where the canonical RV32I machine model becomes concrete: one PC, one architectural register file, one path through fetch→decode→execute→mem→writeback.

## ROLE
Run instructions: fetch from `[L1]` I-cache, decode, read sources from `[REG]`, execute on `[ALU]` (or send loads/stores through `[WB]`/`[L1]` D-cache), retire, advance PC.

## MADE OF
1 frontend (`[FQ]` + `[DECODER]` + `[BTB]`/`[PHT]`/`[RAS]`) + 1 RV32I `[REG]` bank (32 × 32-bit) + 1 `[ALU]` (+ `[MUL]`/`[DIV]`/`[AGU]`) + 1 OoO core (`[RAT]` + `[ROB]` + `[RS]` + `[LQ]` + `[SB]`) + 1 split `[L1]` (I+D) + 1 `[L2]` + 1 `[WB]` + `[CSR]`/`[TRAP]`/`[PMU]`/`[PFE]`. (Per the V1 demo, the visible datapath is the in-order RV32I view; OoO units are zoomable but optional.)

## INPUTS
- LEFT (data): instruction stream from L2 → L1-I; load values from L1-D / L2 / L3 / RAM.
- TOP (control): clock from `[CLK]`, interrupt lines into `[TRAP]`, P-state from `[PMGR]`, reset, ring-coherence snoops.

## OUTPUTS
- RIGHT: store data into `[WB]` → L1-D → L2 → L3 → ring → memctrl; retire signal (instruction count) up to `[CHIP]`; coherence responses onto the ring.

## SYMBOL
`[CORE]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
