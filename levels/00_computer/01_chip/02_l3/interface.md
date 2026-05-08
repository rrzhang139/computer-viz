# interface — 00_computer/01_chip/02_l3

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[L3]` | shared LLC as seen by `[CHIP]` | chip init |
| memTraffic.level='L3' | request being served from L3 | each cycle |
| L3-miss | request flowing to `[MEMCTRL]` | per miss |
| snoop-broadcast | invalidate/downgrade message derived from `[DIR]` | per coherent op |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[DIR]` | coherence directory (sharer set per line) | `03_directory/` |
| `[VB]` | victim/eviction line buffer | `03_victim_buffer/` |
| `[REPL]` | replacement policy state | `03_replacement/` |
| `[CL]` | 64-byte line storage (reused) | lineage from L1's `04_cacheline/` |

## Cross-cutting refs

- Reached from each `[CORE]`'s `[L2]` via `_interconnect_ring/`.
- Drains misses to `02_memctrl/`.
- TIME_AXIS row: `02_l3` (1 anim sec ⇒ 40 cycles).
