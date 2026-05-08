# interface — 00_computer/01_chip/02_memctrl

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[MEMCTRL]` | DRAM controller as seen by `[CHIP]` | chip init |
| memTraffic.level='RAM' | request currently crossing the chip↔DRAM boundary | each cycle |
| ddr-cmd | activate/precharge/read/write being driven this cycle | each DDR command |
| refresh-tick | a refresh pulse interleaved into the schedule | per refresh |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | request-queue + state storage | level `04_register/` lineage |
| `[G]` | scheduler logic | level `06_gate/` lineage |

## Cross-cutting refs

- Off-chip side: `00_computer/_dram_bus/` carries the actual DDR command/address/data lanes; `01_ram/` is the destination.
- Receives `[VB]` writebacks via `_interconnect_ring/`.
- TIME_AXIS row: `02_memctrl` (1 anim sec ⇒ 50 ns).
