# interface — 00_computer/01_chip/02_l3/03_directory

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[DIR]` | coherence directory entry as seen by `[L3]` | per LLC slice |
| sharer-set | bitvector of cores currently caching this line | per coherent op |
| back-invalidate | snoop targeting one or more cores | per directory eviction |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` / `[FF]` | sharer-bitvector storage | level `04_register/`/`05_flipflop/` lineage |

## Cross-cutting refs

- Drives `[MESI]` transitions in each `[CORE]`'s `[L1]` via the ring.
- Replacement of a directory entry forces back-invalidates that show up at `02_core/03_l1/04_coherence/`.
- TIME_AXIS row: `03_directory` (1 anim sec ⇒ 10 cycles).
