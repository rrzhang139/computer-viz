# interface — 00_computer/01_ram

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[RAM]` | main memory; one DDR5 channel of DIMMs | `memTraffic.level === 'RAM'` |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[RANK]` | a chip-select group of DRAM packages on a DIMM | `02_rank/` |
| `[DRAM]` | one DRAM die package on the DIMM PCB | `02_dram_chip/` |
| `_dram_bus` | DDR5 channel (CA + DQ + DQS + CLK + CKE) wires to `[MEMCTRL]` | `_dram_bus/` |

## Cross-cutting refs

- Driver / consumer: `01_chip/02_memctrl/` (`[MEMCTRL]`) issues all commands across `_dram_bus`.
- Demand source: cache miss path from `01_chip/02_l3/` (`[L3]`) — every fill or writeback ends here.
- OS view: `01_os/02_pagetables/` (`[PT]`) and `01_os/02_pagecache/` (`[PCACHE]`) live in physical pages backed by `[RAM]`.
- Time-axis row: `01_ram` (1 anim sec ⇒ 100 ns).
