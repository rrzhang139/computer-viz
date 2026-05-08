# interface — 00_computer/01_os/_mmap

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[MMAP]` | file ↔ VMA ↔ pagecache binding | `mmap` returns |
| VMA descriptor | `{vaddr range, file, offset, prot, flags}` | overlay reads it |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none — connector leaf) | | |

## Cross-cutting refs

- TIME_AXIS row: `_mmap` — native unit `step`, 1 anim sec ⇒ 1 binding step.
- `01_os/02_process/` — owns the VMA tree this connector mutates.
- `01_os/02_pagecache/` — supplies pages on first-touch fault.
- `01_os/02_pagefault/` — invokes `vm_ops->fault` on each populated page.
- `01_os/02_vfs/03_inode/` — file metadata + block map for file-backed mappings.
- `01_os/02_process/03_binary/` — ELF loader uses mmap to populate CODE/DATA.
