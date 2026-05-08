# interface — 00_computer/01_os/02_process/03_binary

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[BIN]` | ELF mapped into CODE/DATA/BSS regions of parent `[PROC]` | `execve` finished |
| ELF entry PC | address where execution starts | end of dynamic linker |
| GOT/PLT layout | per-DSO trampoline + data tables | dynamic resolve |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none — `03_binary` is a leaf in V1) | | |

## Cross-cutting refs

- TIME_AXIS row: `03_binary` — native unit `section`, 1 anim sec ⇒ 1 ELF section load step.
- `01_os/_mmap/` — the mechanism that backs `PT_LOAD` segments with file pages.
- `01_os/02_pagecache/` — where ELF pages live before/after fault-in.
- `01_os/02_vfs/` + `02_vfs/03_inode/` — open(ELF), read header, follow block pointers.
