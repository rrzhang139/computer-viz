# interface — 00_computer/01_os/02_ipc/03_pipe

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[PIPE]` | the kernel ring buffer object owning the two fds | `pipe2()` syscall |
| `bytesAvailable` | current readable bytes in ring | every read/write |
| `writerBlocked` | true when ring is full and a writer is sleeping | on enqueue-fail |

## Symbols this level expects DOWN

(leaf level — no child folders in V1)

## Cross-cutting refs

- Allocated by sibling `01_os/_syscall/` (`[SYSCALL]`) on `pipe2()`.
- Ring buffer pages drawn from `01_os/02_kalloc/` (`[SLAB]`).
- Blocking/wakeup interacts with sibling `02_scheduler/` (`[RUNQ]`).
- SIGPIPE on closed read end goes through sibling `_signal/` (`[SIG]`).
- TIME_AXIS row: `02_ipc/03_pipe` (1 anim sec ⇒ 1 byte-batch).
