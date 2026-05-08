# interface — 00_computer/01_os/02_mmu/03_tlb

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[TLB]` | translation cache | every translate |
| `tlbHit` | `ExecutionState.tlbHit` boolean | lookup complete |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none — leaf) | | |

## Cross-cutting refs

- TIME_AXIS row: `03_tlb` — native unit `cycle`, 1 anim sec ⇒ 1 cycle (hit).
- `01_os/02_pagetables/` — fills TLB entries via walker on miss.
- `02_core/03_csr/` — `SFENCE.VMA` instruction issues invalidations.
- `01_os/_context_switch/` — ASID change avoids full flush.
