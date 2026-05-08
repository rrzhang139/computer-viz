# spec — 00_computer/01_os/02_process

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Without virtual address spaces, every program would see the same physical `[RAM]` and could read/write anyone else's data, the kernel's data, or the `[DRV]` MMIO registers. A process is the OS's answer: each running program gets its own private linear address space (CODE / DATA / HEAP / STACK), built on top of `[PT]` and enforced by `[MMU]`. Pointers are virtual, so different `[PROC]`s can use the same address (`0x10000`) without collision. Remove `[PROC]` and you'd lose isolation, ASLR, copy-on-write `fork`, and the tidy mental model where "my variables live at addresses I control."

## ROLE
A virtual address space and the bookkeeping (page tables, fd table, signal mask, credentials) that makes one program think it owns the machine.

## MADE OF
1 `[PT]` root (`satp` value) + 1 page-aligned virtual layout (CODE low, DATA, HEAP↑, free, STACK↓ high) + 1 `task_struct` (kernel) holding fd table, signal handlers, credentials, parent/child links. Inside CODE: 1 `[BIN]`.

## INPUTS
TOP: kernel scheduling decision (`[RUNQ]` chooses this `[PROC]`), `[SYSCALL]` from this process. LEFT: instruction stream + memory loads/stores from `[CORE]` translated through this process's `[PT]`.

## OUTPUTS
RIGHT: side effects mediated by kernel: file writes, packets, `wait()` exit code; visible to other processes only via OS-arbitrated channels (IPC, files, sockets).

## SYMBOL
`[PROC]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
