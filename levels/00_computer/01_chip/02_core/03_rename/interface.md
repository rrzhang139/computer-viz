# interface — 00_computer/01_chip/02_core/03_rename

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `psrc1` | physical tag for rs1 | rename cycle |
| `psrc2` | physical tag for rs2 | rename cycle |
| `pdst` | physical tag for rd (newly allocated) | rename cycle |
| `pdst_old` | prior mapping of rd (kept for ROB to free on commit) | rename cycle |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | arch→phys map cells | already defined |
| `[G]` | comparator tree, write-port mux | already defined |

## Cross-cutting refs

- Pulls free physical tags from `02_core/03_freelist`.
- Receives commit-update from `02_core/03_rob` retirement.
- Receives checkpoint-restore from `03_pipeline/04_squash` on misprediction (uses RAT shadow copy keyed by branch ID).
- Hands renamed uops to `02_core/03_rs` and `02_core/03_rob` at dispatch.
