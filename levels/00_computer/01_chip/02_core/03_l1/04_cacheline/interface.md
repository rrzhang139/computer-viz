# interface — 00_computer/01_chip/02_core/03_l1/04_cacheline

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[CL]` | one cache line as seen by `[L1]` | each fill |
| valid / dirty | line-level metadata | each access |
| tag-match | hit/miss signal up to L1 control | each access |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none new — primitives only) | line storage is `[FF]`/SRAM cells from earlier levels | `05_flipflop/` |

## Cross-cutting refs

- `[MESI]` state for this line lives in `04_coherence/` (sibling); the line carries the state pointer.
- `[REPL]` (under `02_l3/03_replacement/`) describes the *policy* that picks which `[CL]` to evict; the bits live alongside the line in the set.
- TIME_AXIS row: `04_cacheline` (1 anim sec ⇒ 2 cycles).
