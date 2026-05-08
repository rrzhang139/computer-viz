# interface — 00_computer/01_chip/02_core/03_regfile

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `rs1_val`, `rs2_val` | 32-bit operand values selected by `rs1_idx`, `rs2_idx` | combinational read; valid mid-cycle |
| `regfile_state` | snapshot of all 32 architectural register values | updated on writeback edge |
| `x0_zero` | invariant: x0 always reads as 0 regardless of writes | always |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | one 32-bit architectural register; 32 instances form the file | `04_register/` |

## Cross-cutting refs

- `02_core/` is parent in zoom-out; the core's pipeline reads/writes this regfile every cycle.
- `03_alu/` consumes `rs1_val`, `rs2_val` as A and B operands; produces the value that feeds back into `write_data`.
- `04_decoder/` (under `03_frontend/`) supplies `rs1_idx`, `rs2_idx`, `rd_idx`, `we`.
- ExecutionState fields used: `activeRegs` (highlight), `currentInstr.{rs1,rs2,rd}`.
- TIME_AXIS: regfile reads/writes ride the core's cycle; no dedicated row — uses parent's cycle scale.
