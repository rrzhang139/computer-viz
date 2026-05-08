# interface — 00_computer/01_chip/02_core/03_frontend/04_fetchbuffer

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `fq_head` | uop bytes at head, ready for decode | combinational |
| `fq_full` | back-pressure to fetch | every cycle |
| `fq_empty` | starvation signal to decode | every cycle |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | per-slot storage | already defined |
| `[G]` | head/tail/full-empty pointer arithmetic | already defined |

## Cross-cutting refs

- Reads from `02_core/03_l1` (I-side) on the LEFT edge of fetch.
- Drains into `03_frontend/04_decoder` on the RIGHT edge.
- Flushed by `03_pipeline/04_squash` on misprediction or trap.
