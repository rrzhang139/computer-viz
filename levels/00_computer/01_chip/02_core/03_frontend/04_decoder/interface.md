# interface — 00_computer/01_chip/02_core/03_frontend/04_decoder

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[DECODER]` | combinational instr → control fan-out | combinational; valid each cycle |
| `op` | ALU op (one of `add`/`sub`/`and`/`or`/`xor`/`sll`/`srl`/`sra`/`slt`/`sltu`) | combinational |
| `rs1_idx`, `rs2_idx`, `rd_idx` | 5-bit register indices | combinational |
| `imm` | sign-extended 32-bit immediate, shaped per instruction format | combinational |
| `format` | one of {R, I, S, B, U, J} — RV32I instruction format | combinational |
| `unit_select` | which functional unit handles this instr (ALU/AGU/MUL/DIV/branch) | combinational |
| `we`, `is_branch`, `is_load`, `is_store`, `is_jump` | side-effect flags | combinational |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| — | none — leaf for V1 | — |

## Cross-cutting refs

- Reads `instr[31:0]` from the fetch buffer (sibling under `03_frontend/`, e.g., `04_fetchbuffer/`).
- Drives:
  - `03_regfile/` (via `rs1_idx`, `rs2_idx`, `rd_idx`, `we`)
  - `03_alu/` (via `op`, `unit_select=ALU`)
  - `03_agu/` (via `imm`, `is_load`/`is_store`)
  - `03_mul/`, `03_div/` (via `unit_select`, op-variant bits)
  - `03_pipeline/` branch unit (via `is_branch`, `imm`, `op`)
- ExecutionState fields produced: `currentInstr.{mnemonic, rd, rs1, rs2, imm}`, `aluOp`.
- TIME_AXIS row `03_frontend / 04_decoder: cycle, 1 cycle per anim sec`.
