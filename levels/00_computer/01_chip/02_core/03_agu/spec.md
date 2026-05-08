# spec — 00_computer/01_chip/02_core/03_agu

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

<!-- Why does this level exist? What problem does it solve? What would break if you removed it?
     Answer this BEFORE describing structure. -->
Loads and stores in RV32I take the form `rs1 + sign-extend(imm)` — a base register plus a 12-bit signed offset. That add could in principle be done by the main `[ALU]`, but in any real core there's a dedicated **address generation unit** so that arithmetic instructions (using the ALU) and memory instructions (using the AGU) can issue concurrently without contention. The AGU exists to factor "compute an effective address" out as its own pipeline stage / functional unit, freeing the ALU and giving the load-store path a place to live. Remove this level and either (a) every load/store steals an ALU cycle, serializing the pipeline, or (b) the address arithmetic vanishes entirely and `lw x3, 4(x2)` is unimplementable.

## ROLE
Computes the effective virtual address `EA = rs1 + sign-extend(imm12)` for every load and store; produces `EA` for the L1/MMU path.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
- One 32-bit adder cone (a network of `[G]`s — essentially a stripped `[ALU]` restricted to `add`).
- A sign-extension block that promotes the 12-bit immediate to 32 bits.
- For S-type stores, the immediate is split (`imm[11:5]` and `imm[4:0]`) — the AGU includes the small wiring to reassemble it before sign-extension.
- No state — fully combinational, completes within one cycle.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT (data): `rs1_val` (32 bits, base register from regfile)
- TOP (control):
  - `imm12` (12-bit signed offset, decoded by `[DECODER]` from the I-type or S-type instruction)
  - `kind` (`load` or `store`, used downstream — the AGU itself doesn't branch on this, but it's plumbed alongside the address)

## OUTPUTS
<!-- RIGHT -->
- RIGHT: `EA` (32-bit effective virtual address) → into the load queue / store buffer / L1 path
- RIGHT (control): `kind` forwarded to the memory subsystem

## SYMBOL
<!-- bracketed token. None for connectors. -->
`[AGU]` — defined here per `GLOSSARY.md`.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
