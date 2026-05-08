# interface — 00_computer/01_os/02_vfs

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[VFS]` | filesystem-agnostic dispatch | every fs syscall |
| selected fs ops | which `super_operations` table is active | `mount` / lookup |
| current path-stage | for `02_io_path` overlay | path traversal |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[INODE]` | on-disk file metadata + block map | `03_inode/` |
| `[DENTRY]` | path-component → inode cache | `03_dentry/` |

## Cross-cutting refs

- TIME_AXIS row: `02_vfs` — native unit `dispatch`, 1 anim sec ⇒ 1 VFS op.
- `01_os/02_pagecache/` — backs file `read`/`write` data.
- `01_os/02_block_layer/` — eventual destination for misses.
- `01_os/_syscall/` — entry path for `open`/`read`/`write`.
