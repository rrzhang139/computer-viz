# interface — 00_computer/01_chip/02_core/03_storeb

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `sb_forward` | {value, mask} matched on LQ snoop | execute cycle |
| `sb_drain` | retired store written to L1 | drain cycle |
| `sb_full` | all entries used → stall dispatch of stores | combinational |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | per-entry storage row | already defined |
| `[G]` | CAM addr-comparator + size-mask logic | already defined |

## Cross-cutting refs

- Allocated by `02_core/03_rename` at dispatch.
- Retire signal from `02_core/03_rob` flips `retired-bit`.
- Drains to `02_core/03_l1` (D-side) via [WB] write buffer.
- Snooped by `02_core/03_loadq`.
- Flushed by `03_pipeline/04_squash` for non-retired entries.
