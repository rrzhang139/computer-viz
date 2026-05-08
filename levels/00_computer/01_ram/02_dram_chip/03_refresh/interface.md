# interface — 00_computer/01_ram/02_dram_chip/03_refresh

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[REFRESH]` | a row sweep in progress; the row counter advances and the swept rows briefly become unavailable | a REF command is in flight (controller-driven) |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[BANK]` | refresh reuses the bank's ACT + sense-amp + PRE path to restore each row | `../03_bank/` (sibling — referenced, not nested) |
| `[DCELL]` | the cells whose charge is being restored | `../03_bank/04_dram_cell/` (referenced, not nested) |

## Cross-cutting refs

- Parent: `02_dram_chip/` houses both the bank arrays and the refresh row counter.
- Sibling: `03_bank/` provides the per-bank ACT/PRE machinery that REFRESH drives.
- Driver: `01_chip/02_memctrl/` schedules tREFI-spaced REF commands and tracks `tRFC` blocking windows.
- Time-axis row: `03_refresh` (1 anim sec ⇒ 8 ms).
