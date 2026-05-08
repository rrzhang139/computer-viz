# interface — 00_computer/01_chip/02_core/03_pipeline/04_hazards

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `stall_F` | freeze fetch latch | combinational, same cycle |
| `stall_D` | freeze decode latch | combinational |
| `bubble_X` | insert NOP into EX | combinational |
| `haz_kind` | which hazard fired (raw/load-use/struct/ctrl) | combinational |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[G]` | comparator + priority-encoder logic | already defined |

## Cross-cutting refs

- Reads stage latches owned by `02_core/03_pipeline`.
- Cooperates with `03_pipeline/04_forward`: when forwarding is possible the hazard is suppressed.
- Distinct from `03_pipeline/04_squash` (which kills, not stalls).
- Increments stall counters in `02_core/03_pmu`.
