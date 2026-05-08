# spec — 00_computer/01_chip

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A `[CHIP]` is the unit of silicon you actually buy and bolt into a socket — it bundles many `[CORE]`s with the shared uncore (LLC, ring, memory controller, clock, power) so a single piece of physical hardware can run a whole multi-threaded workload while sharing one path to off-chip `[RAM]`. Without this aggregation level, every core would need its own pins, its own DRAM channels, and its own clock source: cost and bandwidth would explode and coherence would have to cross a board. `[CHIP]` is also where the canonical "RAM-wall" boundary sits — everything above it lives in the cache hierarchy on-die; everything below it is off-die DRAM at ~100× the latency.

## ROLE
Socket-level integration: many cores + shared LLC + ring/mesh + memory controller + clock + power, packaged as one die behind a single set of off-chip interfaces.

## MADE OF
4–64 `[CORE]` + 1 shared `[L3]` + 1+ `[MEMCTRL]` + 1 `_interconnect_ring` + 1 `[CLK]` + 1 `[PMGR]`. (`[L2]` is per-core; counted once per `[CORE]`.)

## INPUTS
- LEFT (data): instructions + data lines from `[RAM]` arriving via `[MEMCTRL]`; `[PCIE]`/`_dmi` traffic from peripherals.
- TOP (control): reference clock to `[CLK]` PLL; thermal/power limits and OS hints into `[PMGR]`; reset/CSR-config writes.

## OUTPUTS
- RIGHT: stores and DMA writes flowing back through `[MEMCTRL]` to `[RAM]`; `[PCIE]` egress; per-core retire-rate visible to host as IPC.

## SYMBOL
`[CHIP]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
