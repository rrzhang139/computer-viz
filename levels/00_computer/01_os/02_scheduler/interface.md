# interface — 00_computer/01_os/02_scheduler

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[RUNQ]` | per-CPU runnable queue (CFS rb-tree + RT list) | every enqueue/dequeue |
| `chosenNext` | the `[THREAD]` selected to run next on this CPU | every reschedule |
| `vruntime(t)` | virtual-runtime key used to order CFS | every tick on running thread |

## Symbols this level expects DOWN

(leaf level — no child folders in V1)

## Cross-cutting refs

- Consumes `[THREAD]` from sibling `02_thread/`; every node in the rb-tree is a pointer to a `task_struct`.
- Hands `chosenNext` to sibling `_context_switch/` (`[CTX]`), which does the actual register swap.
- Wakeups arrive from sibling `_signal/` (`[SIG]`), futex code, and I/O completions in `02_socket/`, `02_pagecache/`, etc. (any `wake_up_process()` call).
- Periodic tick comes from the `[TRAP]` timer interrupt path (rooted in `01_chip/02_core/03_trap/`).
- TIME_AXIS row: `02_scheduler` (1 anim sec ⇒ 1 tick).
