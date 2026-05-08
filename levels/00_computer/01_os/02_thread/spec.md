# spec — 00_computer/01_os/02_thread

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A `[PROC]` is an address space; it does not, by itself, *run*. The thing that holds CPU registers, a stack, and a current PC is a `[THREAD]` — the kernel's smallest unit of schedulable execution. A process with no threads is dead memory; a process with N threads is N concurrent flows of control sharing one heap and one page table. Without `[THREAD]` there is no notion of "something currently executing this process's code on this core" and no way for the same program to use more than one core at a time. The thread is also the entity the `[RUNQ]` orders, the entity `[CTX]` saves and restores, and the entity `[SIG]` is delivered to.

## ROLE
One execution context inside a `[PROC]`: a register set (PC, SP, GPRs, CSRs), a kernel stack, and per-thread bookkeeping (`task_struct`). N threads in one process share the address space (page table, file descriptors) but each owns its own registers and user stack.

## MADE OF
1 `task_struct` + 1 set of saved registers (one snapshot of `[REG]` × 32 + PC + CSRs, materialized as `[CTX]` when not running) + 1 user stack (a VMA inside the parent `[PROC]`) + 1 kernel stack (8–16 KB in kernel slab). All N threads share the parent `[PROC]`'s `[PT]`, `[BIN]`, heap, and fd table.

## INPUTS
- LEFT (data): user-mode register values arriving from `[CTX]` restore at switch-in; syscall arguments / signal frames pushed onto its kernel stack.
- TOP (control): scheduling decision from `[RUNQ]` ("run this thread next on this CPU"); wakeup events (futex, I/O, signal) that move it from blocked → runnable.

## OUTPUTS
- RIGHT: instruction stream onto a `[CORE]` (the `[CORE]`'s PC walks this thread's code); register snapshot pushed back into `[CTX]` at switch-out; effects visible to other threads via shared `[PROC]` memory.

## SYMBOL
`[THREAD]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row `02_thread` (1 anim sec ⇒ 1 instr).
- Linux model: every `task_struct` is "a thread"; a single-threaded process is just a `task_struct` whose `tgid == pid`.
