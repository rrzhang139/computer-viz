# interface — 00_computer/01_chip/02_core/03_alu

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[ALU]` | combinational arithmetic/logic block | combinational; settles each cycle |
| `result` | 32-bit output of the selected op on (A, B) | combinational; valid before next clock edge |
| `flags` | `zero`, `negative`, `overflow` consumed by branch logic | combinational |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| — | none — no children in this branch (Phase 1 V1 stops at the ALU as a leaf) | — |

## Cross-cutting refs

- Reads from `03_regfile/` ports `rs1_val`, `rs2_val`; writes back via the regfile's write port.
- `op` arrives from `03_frontend/04_decoder/` as one of `AluOp` per `EXECUTION_SCHEMA.md`.
- Used by `03_pipeline/` (for hazard/forwarding) and by `03_agu/` indirectly (the AGU is essentially a stripped-down ALU restricted to `add`).
- ExecutionState fields used: `aluOp`, `aluA`, `aluB`, `aluResult`.
- TIME_AXIS row `03_alu: cycle, 1 cycle per anim sec`.
