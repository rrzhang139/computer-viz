# interface — 00_computer/01_os/02_vfs/03_inode

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[INODE]` | one cached inode | first lookup / dentry resolves |
| inode metadata | size/mode/owner/times | overlay reads |
| address_space ptr | binding to `[PCACHE]` page tree | first map / read |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none — leaf) | | |

## Cross-cutting refs

- TIME_AXIS row: `02_vfs/03_inode` — native unit `block-ptr`, 1 anim sec ⇒ 1 block-pointer follow.
- `01_os/02_vfs/03_dentry/` — sibling cache that points to inodes by name.
- `01_os/02_pagecache/` — keyed by `(inode, offset)`.
- `01_os/02_block_layer/` — receives block addresses for data I/O.
