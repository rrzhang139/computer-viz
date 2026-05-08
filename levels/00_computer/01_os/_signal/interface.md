# interface — 00_computer/01_os/_signal

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[SIG]` | per-thread pending mask + handler frame template | on signal queue / on delivery |
| `signo` | the integer signal number being delivered (1..64) | dequeue from pending |
| `frame` | the saved-register frame spliced onto user stack | at user-mode return |

## Symbols this level expects DOWN

(connector — no child folders; this is a zoomable edge)

## Cross-cutting refs

- Targets a specific `[THREAD]` in sibling `02_thread/`; modifies its user stack and its `[CTX]`.
- Wakeups from a delivered signal go through sibling `02_scheduler/` (`[RUNQ]`) — a stopped thread becomes runnable on SIGCONT.
- Synchronous signals (SIGSEGV / SIGBUS / SIGFPE) originate from `[TRAP]` in `01_chip/02_core/03_trap/` after a faulting instruction.
- Asynchronous signals from other threads enter via `01_os/_syscall/` (`kill`, `tgkill`).
- TIME_AXIS row: `_signal` (1 anim sec ⇒ 1 frame-push / handler-entry step).
