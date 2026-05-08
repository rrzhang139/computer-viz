# interface — 00_computer/01_ram/02_dram_chip

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[DRAM]` | one DRAM die package, 8 banks plus peripheral logic | `memTraffic.level === 'RAM'` and a command targets this die |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[BANK]` | a row × column array with its own row buffer and sense amps | `03_bank/` |
| `[REFRESH]` | row counter sweeping all rows every 64 ms to restore charge | `03_refresh/` |

## Cross-cutting refs

- Parent: `01_ram/02_rank/` groups 8 of these chips into one [RANK].
- Children: `03_bank/` (per-array data path), `03_refresh/` (background restore loop).
- Driver: `01_chip/02_memctrl/` (`[MEMCTRL]`) issues ACT/RD/WR/PRE/REF commands.
- Time-axis row: `02_dram_chip` (1 anim sec ⇒ 25 ns).
