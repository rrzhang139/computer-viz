# interface — 00_computer/01_ram/_dram_bus

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| (none — connector) | the wire/edge in the parent diagram between `[MEMCTRL]` and `[RAM]` | `memTraffic.level === 'RAM'` (any in-flight RAM transaction) |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none) | this connector has no children in V1 — it is a leaf edge | — |

## Cross-cutting refs

- Endpoints: `01_chip/02_memctrl/` (`[MEMCTRL]`) on the chip side, `01_ram/` (`[RAM]`) on the DIMM side.
- Carries every command/data exchange that is the subject of `01_ram/02_rank/`, `02_dram_chip/`, `03_bank/`, `03_refresh/`.
- Time-axis row: `_dram_bus` (1 anim sec ⇒ 1 ns; DDR5 ~6.4 GT/lane).
