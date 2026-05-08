# interface — 00_computer/01_os/02_thread

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[THREAD]` | one schedulable execution context inside a `[PROC]` | `task_struct` creation |
| `state` | one of `RUNNING`/`RUNNABLE`/`BLOCKED`/`STOPPED`/`ZOMBIE` | every state transition |
| `tid` | unique thread id within the kernel | clone() |

## Symbols this level expects DOWN

(leaf level — no child folders in V1)

## Cross-cutting refs

- Scheduled by sibling `02_scheduler/` (`[RUNQ]`); enqueued/dequeued from a per-CPU rb-tree.
- Saved/restored by sibling `_context_switch/` (`[CTX]`) on every switch.
- Delivered to by sibling `_signal/` (`[SIG]`); each thread has its own pending-signal mask.
- Lives inside `02_process/` (`[PROC]`); shares `[PT]`, fd table, heap with siblings.
- Runs on a `[CORE]` (`01_chip/02_core/`) — the core's `[REG]` file *is* this thread's live register set while running.
- TIME_AXIS row: `02_thread` (1 anim sec ⇒ 1 instr).
