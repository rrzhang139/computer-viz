# interface — 00_computer/01_os/02_kalloc

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[SLAB]` | per-CPU slab/SLUB cache | every kmalloc/kfree |
| object pointer | freshly-recycled slot | post-pop from freelist |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none — leaf in V1) | | |

## Cross-cutting refs

- TIME_AXIS row: `02_kalloc` — native unit `object`, 1 anim sec ⇒ 1 alloc/free.
- `01_os/02_pagecache/`, `01_os/02_pagefault/`, `01_os/02_vfs/03_inode/` — major callers.
- `02_core/` — per-CPU caches use the active `[CORE]`'s id to avoid locks.
