# interface — 00_computer/01_ram/02_dram_chip/03_bank

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[BANK]` | one independently-activatable row × col cell array with its own row buffer | command bank-address field selects this bank |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[DCELL]` | a single 1T1C bit cell at one (row, col) intersection | `04_dram_cell/` |

## Cross-cutting refs

- Parent: `02_dram_chip/` aggregates 8 of these banks plus peripheral logic.
- Sibling: `03_refresh/` periodically issues ACT-then-PRE to every row to restore charge.
- Driver: `01_chip/02_memctrl/` schedules ACT / RD / WR / PRE per bank.
- Time-axis row: `03_bank` (1 anim sec ⇒ 15 ns; tRCD ≈ 14 ns).
