# interface — 00_computer/01_os/02_mmu

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[MMU]` | virtual→physical translator | every memory access |
| `paddr` | resolved physical address in `memTraffic.paddr` | TLB hit or walk done |
| `pageFault` | `ExecutionState.pageFault = true` | translation fail / perm violation |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[TLB]` | translation cache, ASID-tagged | `03_tlb/` |

## Cross-cutting refs

- TIME_AXIS row: `02_mmu` / `03_tlb` — native unit `cycle`, 1 anim sec ⇒ 1 cycle (hit).
- `01_os/02_pagetables/` — the multi-level radix tree the walker traverses on TLB miss.
- `01_os/02_pagefault/` — handler invoked on translation fault.
- `02_core/03_csr/` — `satp` CSR (RV32 Sv32 mode bit + ASID + PPN).
- `03_l1/` — D-TLB sits between core and L1; consult before cache lookup.
