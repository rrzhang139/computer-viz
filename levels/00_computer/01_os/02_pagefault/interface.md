# interface — 00_computer/01_os/02_pagefault

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[PF]` | page-fault handler entry | `mcause` ∈ {12,13,15} |
| fault classification | `'minor' \| 'major' \| 'cow' \| 'segv'` | post-classify |
| `pageFault: true` | mirrors `ExecutionState.pageFault` | trap entry |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none — leaf) | | |

## Cross-cutting refs

- TIME_AXIS row: `02_pagefault` — native unit `step`, 1 anim sec ⇒ 1 fault-handler step.
- `01_os/02_mmu/` — raises the fault.
- `01_os/_mmap/` — invoked for file-backed VMAs to bind a missing page.
- `01_os/02_pagecache/` — supplies the file page on major fault.
- `01_os/02_kalloc/` — supplies fresh zeroed page on minor anonymous fault.
- `01_os/_signal/` — delivers `SIGSEGV` on fatal fault.
