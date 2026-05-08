# interface — 00_computer/01_chip

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[CHIP]` | one CPU socket as seen by `00_computer` | board-level wiring at boot |
| retiredInstrs | aggregate IPC × cycles across all `[CORE]`s | cycle |
| memTraffic→RAM | LLC-miss requests crossing the chip boundary | each `[L3]` miss |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[CORE]` | one fetch-decode-execute pipeline | `02_core/` |
| `[L2]` | per-core mid-level cache | `02_l2/` |
| `[L3]` | shared last-level cache | `02_l3/` |
| `[MEMCTRL]` | DRAM controller | `02_memctrl/` |
| `[CLK]` | PLL + clock distribution | `02_clock/` |
| `[PMGR]` | DVFS / C-state / P-state controller | `02_pmgr/` |
| ring traffic | coherence + data hops between cores and L3 slices | `_interconnect_ring/` |

## Cross-cutting refs

- Off-chip data path `[CHIP] ↔ [RAM]` is owned by `00_computer/_dram_bus/` (not in this subtree); `[MEMCTRL]` drives its near side.
- `[CHIP] ↔ [DISK]/[NIC]` traffic exits via `00_computer/_pcie/`.
- TIME_AXIS row: `01_chip` (1 anim sec ⇒ 5 instr).
