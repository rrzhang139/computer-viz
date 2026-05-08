# interface — 00_computer/01_chip/02_core/03_loadq

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `lq_result` | loaded value (forwarded or from L1) | execute cycle |
| `lq_violation` | younger load read stale memory → squash | snoop / commit cycle |
| `lq_full` | all entries in use → stall dispatch of loads | combinational |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | per-entry storage row | already defined |
| `[G]` | CAM-style addr comparator + size-overlap logic | already defined |

## Cross-cutting refs

- Allocated by `02_core/03_rename` at dispatch; frees on `02_core/03_rob` retire.
- Snoops `02_core/03_storeb` at execute for forwarding.
- On miss-forward, issues request to `02_core/03_l1` (D-side).
- Reports violations to `03_pipeline/04_squash`.
- Effective address arrives from `02_core/03_agu`.
