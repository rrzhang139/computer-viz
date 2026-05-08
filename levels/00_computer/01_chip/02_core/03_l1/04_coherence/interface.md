# interface — 00_computer/01_chip/02_core/03_l1/04_coherence

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[MESI]` | per-line state machine as seen by `[L1]` | per-line |
| state-transition | E↔M↔S↔I event (carries cause: local-read / local-write / snoop) | per access / snoop |
| writeback-request | line is being downgraded from M; emit dirty data | on M→S/I |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[CL]` | the line whose state this FSM tracks | sibling `04_cacheline/` |
| `[G]` | gates implementing the transition table | level `06_gate/` lineage |

## Cross-cutting refs

- Snoop traffic comes from `_interconnect_ring/` (sibling of `[CORE]`); the `[DIR]` (under `02_l3/03_directory/`) decides which cores get snooped.
- Writebacks land in `[L2]` and propagate to `[L3]` via the ring.
- TIME_AXIS row: `04_coherence` (1 anim sec ⇒ 1 transaction).
