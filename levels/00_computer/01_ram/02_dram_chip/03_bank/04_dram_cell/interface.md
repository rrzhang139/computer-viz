# interface — 00_computer/01_ram/02_dram_chip/03_bank/04_dram_cell

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[DCELL]` | one 1T1C bit cell at a (row, col) intersection | wordline asserted AND this column read/written |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[T]` | the access transistor inside this cell | `levels/.../06_gate/07_transistor/` (defined elsewhere; referenced by symbol only — no child folder here) |

## Cross-cutting refs

- Parent: `03_bank/` arranges these in a row × column matrix and sense-amplifies them.
- Sibling concept: `03_refresh/` periodically reads-and-rewrites every row of these cells to restore charge.
- Symbol authority for `[T]`: `06_gate/07_transistor/` (per GLOSSARY.md). This cell **uses** `[T]` but does not **define** it.
- Time-axis row: `04_dram_cell` (1 anim sec ⇒ 10 ns).
