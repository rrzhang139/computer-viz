# interface — 00_computer/01_os/_context_switch

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[CTX]` | the saved-register snapshot during a switch | every save/restore step |
| `switchInProgress` | true while the assembly routine is running | between save-start and restore-end |
| `ptSwap` | true if cross-process (page table changed) | when prev/next have different `[PT]` |

## Symbols this level expects DOWN

(connector — no child folders; this is a zoomable edge)

## Cross-cutting refs

- Triggered by sibling `02_scheduler/` (`[RUNQ]`) handing off `chosenNext`.
- Operates on register snapshots owned by sibling `02_thread/` (`[THREAD]`).
- Optionally swaps page-table base, touching sibling `02_pagetables/` (`[PT]`) and forcing `02_mmu/03_tlb/` (`[TLB]`) to invalidate non-global entries.
- Driven by the `[CORE]`'s `[REG]` file in `01_chip/02_core/` — that is the live register set being swapped.
- TIME_AXIS row: `_context_switch` (1 anim sec ⇒ 1 reg-store).
