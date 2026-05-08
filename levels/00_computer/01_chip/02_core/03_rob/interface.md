# interface — 00_computer/01_chip/02_core/03_rob

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `rob_retire` | head entry committing this cycle | end-of-cycle CLK edge |
| `rob_full` | tail caught up to head → stall dispatch | combinational |
| `rob_mispred` | resolved branch disagrees with prediction | resolution cycle |
| `rob_exception` | head entry raised a fault → vector to [TRAP] | retire cycle |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | per-entry storage row | already defined |
| `[G]` | head/tail counters, age comparators | already defined |

## Cross-cutting refs

- Receives renamed uops from `02_core/03_rename`.
- Frees `pdst_old` to `02_core/03_freelist` on commit.
- Signals `02_core/03_storeb` to drain head store on commit.
- Signals `03_pipeline/04_squash` on mispredict; signals `02_core/03_trap` on exception.
- Increments retire count in `02_core/03_pmu`.
