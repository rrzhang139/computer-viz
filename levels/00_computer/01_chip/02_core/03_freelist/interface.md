# interface — 00_computer/01_chip/02_core/03_freelist

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `fl_pop` | a free physical-register tag served from head | rename CLK edge |
| `fl_empty` | freelist exhausted → stall rename | combinational |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | per-slot storage cell holding a physical-register ID | already defined |
| `[G]` | head/tail counter, full/empty logic | already defined |

## Cross-cutting refs

- Pop consumer: `02_core/03_rename` ([RAT]).
- Push producer: `02_core/03_rob` retirement (returning `pdst_old`).
- Reset by `03_pipeline/04_squash` if a fatal trap requires architectural-state rebuild.
