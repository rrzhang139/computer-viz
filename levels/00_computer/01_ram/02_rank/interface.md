# interface — 00_computer/01_ram/02_rank

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[RANK]` | one chip-selected group of 8 DRAM dies driving the full 64-bit DQ word | `memTraffic.level === 'RAM'` and CS# asserted to this rank |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[DRAM]` | a single DRAM die contributing 8 bits to DQ | `../02_dram_chip/` (sibling — referenced, not nested) |

## Cross-cutting refs

- Parent: `01_ram/` aggregates 1–4 ranks per channel.
- Sibling: `02_dram_chip/` defines the per-die internals; `[RANK]` is the structural grouping above it.
- Driver: `01_chip/02_memctrl/` (`[MEMCTRL]`) drives CS# selection.
- Time-axis row: `02_rank` (1 anim sec ⇒ 50 ns).
