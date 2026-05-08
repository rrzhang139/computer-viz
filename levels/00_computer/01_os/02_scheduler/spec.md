# spec — 00_computer/01_os/02_scheduler

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

There are typically thousands of `[THREAD]`s in a Linux system but only a handful of `[CORE]`s. Something has to pick *which* runnable thread runs next, and for how long, on each core — that is the scheduler's job. Without `[RUNQ]`, every core would either spin in user-mode forever on whichever thread first grabbed it (no fairness) or have to ask "what now?" via a slow global search every time a thread blocks (no scaling). Linux's CFS solves both: per-CPU red-black trees ordered by virtual runtime, picked in O(log N) by leftmost-node, balanced via load-balancer migrations. Remove the scheduler and "concurrency" collapses into "whoever yields first."

## ROLE
Decide which `[THREAD]` runs next on each `[CORE]`, and how long, by maintaining per-CPU runnable queues and reacting to wakeups, blocks, ticks, and load imbalance.

## MADE OF
1 per-CPU `runqueue` struct with: 1 CFS rb-tree of runnable `[THREAD]`s keyed by `vruntime`; 1 RT/Deadline run-list (priority-ordered, ahead of CFS); 1 `current` pointer to the running `[THREAD]`; 1 idle thread; tick / preemption counters. The whole machinery is replicated per logical CPU.

## INPUTS
- LEFT (data): `[THREAD]` enqueue events ({wakeup, fork, migration-in}) and dequeue events ({block, exit, migration-out}); `vruntime` deltas accumulated by the running thread.
- TOP (control): timer tick (~1 ms) from `[TRAP]`; preempt-now signal; load-balancer probe; nice/priority changes via syscalls.

## OUTPUTS
- RIGHT: a chosen-next-`[THREAD]` handed to `[CTX]`, which performs the actual register swap onto the target `[CORE]`.

## SYMBOL
`[RUNQ]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row `02_scheduler` (1 anim sec ⇒ 1 tick, ~1 ms wall-clock).
- Linux-canonical: CFS = Completely Fair Scheduler; vruntime = weighted runtime accumulator.
- V1 shows one CPU's CFS rb-tree; multi-CPU load balancing is a future expansion.
