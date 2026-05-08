# spec — 00_computer/01_os/02_ipc/03_shm

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[PIPE]` and `[USOCK]` both *copy* user bytes through kernel buffers — fast, but still two memcpys per message. When two processes need to exchange data at memory-bandwidth speeds (database server ↔ workers, video frames into a renderer, telemetry buffers into a compositor), even one kcpoy is too much. `[SHM]` solves this by mapping the *same physical pages* into both `[PROC]`s' page tables; a store by one process becomes immediately visible to the other via a normal load — no syscall, no copy, no kernel involvement on the data path. The cost: synchronization is the user's problem (futex, atomic ops), and there's no flow control. Without `[SHM]` the only way to get zero-copy IPC would be `vmsplice`/`splice` tricks against `[PIPE]`; not general.

## ROLE
Map a region of kernel-managed physical pages into ≥2 `[PROC]`s' address spaces simultaneously, so that loads/stores in one process are immediately visible to all others mapping the region.

## MADE OF
1 `tmpfs`-backed file (POSIX `shm_open`) OR 1 `shmget` segment (SysV API) + N `[PT]` mappings (one per attached `[PROC]`) all pointing at the same backing pages in `[RAM]`. The pages live in the page cache (`[PCACHE]`); reference count = number of mappings.

## INPUTS
- LEFT (data): nothing flows here as bytes — data arrives via *direct store instructions* by any attached `[PROC]`'s `[CORE]`. The `[CORE]`'s store buffer (`[SB]`) and `[L1]` D-cache propagate it; `[MESI]` keeps both processes' caches coherent.
- TOP (control): setup syscalls (`shm_open` / `mmap`, `shmget` / `shmat`); detach via `munmap` / `shmdt`.

## OUTPUTS
- RIGHT: visibility — a load in any attached `[PROC]` returns the latest committed value. No wakeups by default; user-space typically pairs with `[FUTEX]`-style waits if synchronous.

## SYMBOL
`[SHM]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row `02_ipc/03_shm` (1 anim sec ⇒ 1 store visible to both).
- The fact that the *same* physical page appears in two address spaces with potentially different virtual addresses is the central insight.
