# interface — 00_computer/01_chip/02_core/03_frontend/04_ras

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `ras_target` | predicted return PC (top of stack) | combinational |
| `ras_sp` | stack pointer (depth) | end of fetch cycle |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | per-entry storage cell | already defined |
| `[G]` | push/pop pointer increment + mux | already defined |

## Cross-cutting refs

- Type bits from `04_btb` say "this is a call/ret".
- On mispredict, `03_pipeline/04_squash` restores `ras_sp` from a checkpoint (kept per in-flight branch).
- `03_rob` retire confirms or invalidates push/pop entries.
