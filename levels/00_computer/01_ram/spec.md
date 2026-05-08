# spec — 00_computer/01_ram

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Caches are too small to hold a working program; once you miss in `[L3]`, the value has to come from somewhere bigger and that somewhere is `[RAM]`. RAM is the first storage tier off-chip — DDR5 DIMMs sitting on the motherboard, addressed by `[MEMCTRL]` over the `_dram_bus`. It is roughly **100x slower than `[L1]`** because a request must leave the die, traverse a parallel bus, activate a row of capacitors, and stream the data back. Without RAM the CPU would have nowhere to keep a process's heap, stack, or code beyond a few MB — and every load past that working set would have to hit `[DISK]`, which is another 1000x slower again.

## ROLE
Main memory. Holds the entire physical address space the OS hands out as pages: code, data, heap, stack, page cache, kernel structures.

## MADE OF
1–4 [RANK] populated across 1–2 DDR5 DIMM modules (a "channel"). One DIMM typically presents 1 or 2 ranks; multiple DIMMs per channel multiply ranks but not bandwidth.

## INPUTS
- LEFT (data, bidirectional on DQ): write data from `[MEMCTRL]` over `_dram_bus`.
- TOP (control): command/address bus (CA), CLK, CKE — driven by `[MEMCTRL]` selecting one rank via chip-select.

## OUTPUTS
- RIGHT (data): read data streamed back to `[MEMCTRL]` on DQ over `_dram_bus`, framed by DQS strobes.

## SYMBOL
[RAM]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- volatile: contents lost on power-off (capacitors discharge)
- ~100 ns access latency from the core's perspective; see TIME_AXIS row `01_ram`
