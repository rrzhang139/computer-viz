# spec — 00_computer/01_chip/02_core/03_frontend/04_decoder

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

<!-- Why does this level exist? What problem does it solve? What would break if you removed it?
     Answer this BEFORE describing structure. -->
A fetched instruction is a 32-bit blob; the rest of the core needs to know — for *this* specific opcode — which functional unit to wake, which registers to read, which immediate to sign-extend, and whether to write back a result. The decoder is the level that performs that single fan-out: take 32 bits, produce a structured set of control signals, all combinationally within one cycle. It exists because every later stage (regfile, ALU, AGU, branch unit, writeback mux) is a passive consumer of these control bits — without the decoder they're inert. RV32I makes this manageable by limiting the world to **six instruction formats** (R, I, S, B, U, J), each with a fixed bit layout, so the decoder is a fan-out of bit slices plus a small lookup keyed on `opcode`/`funct3`/`funct7`. Remove this level and the core is a bag of unconnected datapath blocks.

## ROLE
Maps a fetched 32-bit RV32I instruction word into a structured set of control signals (op selection, register indices, immediate value, writeback enable, branch flags, etc.) for the rest of the core.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
- A network of `[G]` arrays implementing a small lookup keyed on `opcode[6:0]`, `funct3[2:0]`, and `funct7[6:0]` from the instruction word.
- Bit-slicers extracting `rs1[19:15]`, `rs2[24:20]`, `rd[11:7]`.
- Six immediate-shaping blocks (one per RV32I format: R, I, S, B, U, J), with a mux selecting which shaping is active based on opcode.
- A control-signal bundler that emits the structured output as a flat set of wires.
- No state — combinational only.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT (data): `instr[31:0]` — the 32-bit fetched instruction word from the fetch buffer
- TOP (control): CLK is implicit (the decoder is combinational; pipeline latches are upstream/downstream, not inside)

## OUTPUTS
<!-- RIGHT -->
- RIGHT (control bundle): `op` (ALU op), `rs1_idx`, `rs2_idx`, `rd_idx`, `we` (writeback enable), `imm` (sign-extended 32-bit immediate), `format` ∈ {R, I, S, B, U, J}, `unit_select` (ALU / AGU / MUL / DIV / branch), `is_branch`, `is_load`, `is_store`, `is_jump`

## SYMBOL
<!-- bracketed token. None for connectors. -->
`[DECODER]` — defined here per `GLOSSARY.md`.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
