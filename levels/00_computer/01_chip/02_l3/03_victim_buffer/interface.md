# interface — 00_computer/01_chip/02_l3/03_victim_buffer

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[VB]` | eviction line buffer as seen by `[L3]` | per LLC slice |
| VB-rehit | a request matched a victim still in the buffer | per match |
| writeback-issued | victim drained to memctrl | per drain |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | per-entry storage for addr/data/tag | level `04_register/` lineage |
| `[CL]` | the unit being buffered | lineage from `02_core/03_l1/04_cacheline/` |

## Cross-cutting refs

- Drains to `02_memctrl/`; rehit feeds back into `[L3]`.
- Coherence preserved: a buffered M-line still answers snoops via this slice's `[DIR]`.
- TIME_AXIS row: `03_victim_buffer` (1 anim sec ⇒ 8 cycles).
