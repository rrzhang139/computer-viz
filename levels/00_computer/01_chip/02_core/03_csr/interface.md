# interface — 00_computer/01_chip/02_core/03_csr

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `csr_read` | value read from selected CSR | EX-stage CLK |
| `csr_se` | side-effect signal kind (`tlb_flush`, `irq_mask_change`, …) | write-cycle CLK |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | per-CSR storage cell | already defined |
| `[G]` | address-decoder + permission-check logic | already defined |

## Cross-cutting refs

- Written/read by `02_core/03_trap` for `mepc`/`mcause`/`mstatus`/`mtvec`.
- `satp` writes flush `02_mmu/03_tlb`.
- `mip`/`mie` read by `02_core/03_trap` for IRQ masking.
- Counters mirrored from `02_core/03_pmu`.
- Privilege mode visible to all of `02_core` (not a separate symbol — read directly).
