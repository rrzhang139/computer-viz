# interface — 00_computer/01_chip/02_l2

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[L2]` | per-core mid-level cache | per-core init |
| memTraffic.level='L2' | request being served from L2 | each cycle |
| L2-miss | request leaving the core onto the ring | per miss |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[CL]` | 64-byte cache line | `02_core/03_l1/04_cacheline/` |
| `[MSHR]` | reused MSHR pattern at L2 width | same |
| `[MESI]` | coherence state | same lineage |

## Cross-cutting refs

- Upstream sibling: `[L1]` inside the same `02_core/`; downstream peers: `_interconnect_ring/` and `02_l3/`.
- L2 prefetcher driven by `[PFE]` under `02_core/03_prefetch/` (cross-tree).
- TIME_AXIS row: `02_l2` (1 anim sec ⇒ 12 cycles).
