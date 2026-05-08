# interface — 00_computer/01_chip/02_core/03_mul

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[MUL]` | pipelined multiplier unit | each pipeline stage on CLK edge |
| `result` | 32-bit selected half of 64-bit product | valid when `done=1` |
| `done` | result-valid handshake | asserted 3–4 cycles after `start` |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| — | none — leaf for V1 | — |

## Cross-cutting refs

- Reads `rs1_val`, `rs2_val` from `03_regfile/`; writes back via the regfile's write port.
- `op` and `start` arrive from `03_frontend/04_decoder/`.
- `03_pipeline/` (hazard logic) must stall dependent instructions until `done=1` since the result is not single-cycle.
- TIME_AXIS row `03_mul: cycle, 1 cycle per anim sec (3-4 cycle pipelined)`.
- Scope assumption: RV32M extension (assumed; V1 demo program doesn't use it but the level scaffolds it).
