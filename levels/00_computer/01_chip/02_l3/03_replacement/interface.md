# interface — 00_computer/01_chip/02_l3/03_replacement

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[REPL]` | replacement-policy state as seen by `[L3]` | per slice |
| victim-way | the way chosen for eviction this fill | per fill |
| age/RRIP-update | per-way bit update on hit/fill | each access |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[FF]` | per-way age/RRIP storage | level `05_flipflop/` lineage |
| `[G]` | priority-encoder gates | level `06_gate/` lineage |

## Cross-cutting refs

- Drives `[VB]` (sibling) on every eviction.
- The same policy pattern reappears at `[L1]`/`[L2]` (cross-tree) but the canonical definition lives here at the LLC because it matters most.
- TIME_AXIS row: `03_replacement` (1 anim sec ⇒ 1 cycle).
