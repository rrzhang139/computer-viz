# interface — 00_computer/01_chip/02_core/03_trap

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `trap_take` | a trap is being taken this cycle | retire of faulting uop |
| `trap_cause` | RISC-V mcause encoding | trap cycle |
| `trap_target` | redirect PC = mtvec (or vectored offset) | trap cycle |
| `priv_next` | new privilege mode after trap | trap cycle |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[G]` | priority encoder, FSM | already defined |

## Cross-cutting refs

- Reads/writes `02_core/03_csr` (`mtvec`, `mepc`, `mcause`, `mtval`, `mstatus`).
- Triggers `03_pipeline/04_squash`.
- Receives faults from `02_core/03_rob` head (and from `02_mmu`/`03_tlb` for page faults indirectly).
- IRQ pending from external sources via `01_os/_interrupt` and chip pin.
- Increments trap counters in `02_core/03_pmu`.
