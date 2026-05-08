# interface — 00_computer/01_os/02_pagecache

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[PCACHE]` | (inode, offset) → page mapping | every file read/write |
| pcache hit/miss | `'hit' \| 'miss'` | lookup complete |
| dirty-page set | pages awaiting writeback | each write |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none — leaf in V1) | | |

## Cross-cutting refs

- TIME_AXIS row: `02_pagecache` — native unit `page-op`, 1 anim sec ⇒ 1 page lookup/insert/evict.
- `01_os/02_vfs/` — caller for `read`/`write` data path.
- `01_os/_mmap/` — backs file-mapped VMAs.
- `01_os/02_block_layer/` — fetch on miss, flush on writeback.
- `01_os/02_kalloc/` — supplies fresh page frames.
