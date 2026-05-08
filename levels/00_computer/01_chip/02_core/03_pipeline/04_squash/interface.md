# interface — 00_computer/01_chip/02_core/03_pipeline/04_squash

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `flush_mask` | bitmask of ROB IDs to kill | flush cycle |
| `redirect_pc` | new fetch PC | flush cycle |
| `flush_active` | flush in progress (1+ cycles) | combinational |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[G]` | FSM + fanout logic | already defined |

## Cross-cutting refs

- Triggered by `02_core/03_rob` (mispredict), `02_core/03_trap` (exception/IRQ), `02_core/03_loadq` (memory-order violation).
- Restores `02_core/03_rename` from checkpoint, `02_core/03_frontend/04_ras` SP, `02_core/03_freelist` shadow.
- Kills uops in `02_core/03_rs`, `02_core/03_loadq`, `02_core/03_storeb`, `03_pipeline` stage latches.
- Increments mispredict count in `02_core/03_pmu`.
