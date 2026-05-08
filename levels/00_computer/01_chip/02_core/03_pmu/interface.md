# interface — 00_computer/01_chip/02_core/03_pmu

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `pmu_count` | per-counter current value (read via CSR) | every CLK |
| `pmu_overflow` | counter wrapped → optional IRQ | wrap cycle |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | per-counter cell | already defined |
| `[G]` | event-select mux + adder | already defined |

## Cross-cutting refs

- Event sources: `02_core/03_rob` (retire), `02_core/03_pipeline/04_squash` (mispredict-flush), `02_core/03_l1` (miss), `02_mmu/03_tlb` (tlb-miss), `02_core/03_pipeline/04_hazards` (stall-cause).
- Read by software via `02_core/03_csr` (`mcycle`, `minstret`, `mhpmcounter*`).
- May feed `02_core/03_prefetch` throttle decisions.
