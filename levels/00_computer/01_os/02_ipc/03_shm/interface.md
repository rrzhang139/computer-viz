# interface — 00_computer/01_os/02_ipc/03_shm

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[SHM]` | one shared-memory segment (set of physical pages) | `shm_open()` / `shmget()` |
| `attachCount` | number of `[PROC]`s currently mapping the segment | each `mmap`/`munmap` |
| `physBase` | base PFN in `[RAM]` of the shared region | segment creation |

## Symbols this level expects DOWN

(leaf level — no child folders in V1)

## Cross-cutting refs

- Backing pages live in `[RAM]` (`00_computer/01_ram/`), tracked by `02_pagecache/` (`[PCACHE]`).
- Mapped via sibling `_mmap/` (`[MMAP]`), establishing entries in sibling `02_pagetables/` (`[PT]`) for each attached `[PROC]`.
- Coherence between attached processes' caches is provided by `[MESI]` in `01_chip/02_core/03_l1/04_coherence/` — NOT by IPC code.
- Setup via sibling `01_os/_syscall/` (`[SYSCALL]`).
- Distinct from `[PIPE]`/`[USOCK]`: zero-copy on the data path; no kernel buffer.
- TIME_AXIS row: `02_ipc/03_shm` (1 anim sec ⇒ 1 store).
