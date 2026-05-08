# interface — 00_computer/01_chip/02_core/03_prefetch

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `pf_request` | speculative {addr, hint} sent to L1 | issue cycle |
| `pf_useful` | fraction of prefetched lines actually consumed (counter) | per retire |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | per-stream tracker storage | already defined |
| `[G]` | stride subtractor + confidence saturator | already defined |

## Cross-cutting refs

- Snoops demand misses from `02_core/03_l1` D-side miss queue.
- Throttled by `02_core/03_pmu` bandwidth/utilization counters.
- Issues fills to `02_core/03_l1` (D-side) which propagate down to L2/L3/RAM.
- Effective addresses from `02_core/03_loadq` give it the access stream.
