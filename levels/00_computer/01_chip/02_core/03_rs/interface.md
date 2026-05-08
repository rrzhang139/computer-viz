# interface — 00_computer/01_chip/02_core/03_rs

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `rs_issue` | per-port {uop, psrc1, psrc2, rob_id} fired this cycle | end of issue cycle |
| `rs_full` | partition full → stall dispatch | combinational |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | per-entry storage row | already defined |
| `[G]` | wakeup-bus comparator + issue arbiter | already defined |

## Cross-cutting refs

- Filled by `02_core/03_rename` at dispatch (with rob_id from `03_rob`).
- Wakeup tags broadcast from execution-unit writeback (consumed via `03_pipeline/04_forward` bypass network).
- Issued uops fire to `03_alu`, `03_agu`, `03_mul`, `03_div` based on op class.
- Flushed by `03_pipeline/04_squash`.
