# spec — 00_computer/01_chip/02_core/03_pmu

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Software (perf, vtune, profiler) cannot directly observe pipeline events; it must read counters that hardware maintained. The [PMU] is a small block of programmable counters that increment on selected events: cycles, retired instructions, branch mispredicts, L1/L2/L3 misses, TLB misses, stall reasons, etc. An OS reads them via [CSR] (`mcycle`, `minstret`, `mhpmcounterX`/`mhpmeventX`), enabling profiling and adaptive scheduling. Without it, performance debugging would be blind.

## ROLE
Hardware performance counters and event mux for software profiling.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
~6–32 [REG] counter cells (64-bit each) plus per-counter event-select mux from [G]. Each counter has a CSR address mapped through `[CSR]`.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: per-cycle event signals (retire, mispredict, l1-miss, tlb-miss, stall-cause, …) from across the core.
- TOP: [CLK]; per-counter event-select code (programmed via CSR write); enable/freeze bits.

## OUTPUTS
<!-- RIGHT -->
- RIGHT: counter read values via [CSR] (`mcycle`, `minstret`, `mhpmcounter*`); optional overflow → IRQ for sample-based profiling.

## SYMBOL
<!-- bracketed token. None for connectors. -->
[PMU]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
