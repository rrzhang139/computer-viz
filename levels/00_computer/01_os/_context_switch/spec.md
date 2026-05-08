# spec — 00_computer/01_os/_context_switch

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A `[CORE]` has exactly one architectural register file. To run thread B after thread A, the kernel must atomically *replace A's live register set with B's*; that whole operation is the context switch. Without `[CTX]` you cannot multiplex a CPU between two threads at all — the only "schedule" possible would be cooperative reset+reboot. A switch costs roughly **1 µs** of CPU time even when the threads share an address space, and roughly 2–10× that when they don't (because the new thread's page table needs loading and the `[TLB]` pays a flush). `[CTX]` is also where the kernel transitions cleanly between user and kernel stacks: each `[THREAD]` has its own kernel stack, and switching means swapping which one is current.

## ROLE
Save the outgoing `[THREAD]`'s register set into its `task_struct`, optionally swap the active page table base (CR3 / SATP) if the next thread is in a different `[PROC]`, then restore the incoming `[THREAD]`'s register set so the `[CORE]` resumes running it.

## MADE OF
A short architecture-specific assembly routine (`__switch_to`) + the saved-register slot inside each `task_struct` + the kernel stack of each `[THREAD]`. Signals: register save/restore sequence (~30 GPRs + PC + CSRs) and an optional `csrw satp` page-table swap. Physical medium: pure CPU instructions running with interrupts disabled.

## INPUTS
- LEFT (data): `prev` thread's currently-live registers (the `[CORE]`'s `[REG]` snapshot) and `next` thread's saved-register slot loaded from RAM.
- TOP (control): a "switch now" trigger from `[RUNQ]` (selecting `chosenNext`) or from a syscall-exit / interrupt-return path that decides to reschedule.

## OUTPUTS
- RIGHT: the `[CORE]`'s register file is now `next`'s; PC resumes inside `next`'s kernel stack at exactly the place it last yielded; control transfers up through `next`'s syscall-return into user mode.

## SYMBOL
`[CTX]`

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder `01_os/`
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row `_context_switch` (1 anim sec ⇒ 1 register save/restore).
- Connects sibling `02_scheduler/` (decides who) ↔ sibling `02_thread/` (whose registers).
