# interface — 00_computer/01_os/02_pagetables

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[PT]` | per-process radix tree of PTEs | `satp` set |
| `pageWalk` | `ExecutionState.pageWalk = {level, pteAddr}` | walker active |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none — leaf) | | |

## Cross-cutting refs

- TIME_AXIS row: `02_pagetables` — native unit `cycle`, 1 anim sec ⇒ 100 cycles (4-level walk).
- `01_os/02_mmu/` — invokes the walk on TLB miss.
- `01_os/02_mmu/03_tlb/` — destination of resolved PTE.
- `01_os/02_pagefault/` — invoked when a level-N PTE has `V=0` or perms mismatch.
- `02_core/03_csr/` — `satp` CSR (Sv32 mode + ASID + PPN of root frame).
