# interface — 00_computer/01_chip/02_core/03_l1

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[L1]` | per-core split L1 as seen by `[CORE]` | per-core init |
| memTraffic.level='L1' | request currently being served from L1 | each cycle |
| hit / miss | result of the tag-compare | each access |
| dirty-victim | line evicted with M state | on fill |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[CL]` | 64-byte cache line (tag/index/offset split, valid/dirty) | `04_cacheline/` |
| `[MSHR]` | in-flight miss tracker (merges duplicates) | `04_mshr/` |
| `[MESI]` | per-line coherence state machine | `04_coherence/` |
| `[WB]` | store/write buffer between core and D-cache | `04_write_buffer/` |

## Cross-cutting refs

- Upstream: `[L2]` (sibling of `[CORE]`) services L1 misses.
- Sideways: `_interconnect_ring/` delivers snoops that drive `[MESI]` transitions on these lines.
- TIME_AXIS row: `03_l1` (1 anim sec ⇒ 4 cycles).
