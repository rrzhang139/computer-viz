# interface — 00_computer/01_os/02_ipc

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[PIPE]` | a kernel ring buffer between two fds (anonymous or named) | `pipe()` / `pipe2()` syscall |
| `[USOCK]` | a unix-domain socket endpoint addressed by filesystem path | `socket(AF_UNIX,...)` |
| `[SHM]` | a shared-memory segment mapped into ≥2 address spaces | `shm_open()` + `mmap()` / `shmat()` |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[PIPE]` | byte-stream ring buffer | `03_pipe/` |
| `[USOCK]` | AF_UNIX endpoint | `03_unix_socket/` |
| `[SHM]` | shared physical-page region | `03_shm/` |

## Cross-cutting refs

- All three are accessed via fds, allocated by sibling `01_os/_syscall/` (`[SYSCALL]`).
- Wakeups feed back into sibling `02_scheduler/` (`[RUNQ]`) to unblock waiting `[THREAD]`s.
- `[SHM]` is unique among the three: data does NOT pass through kernel buffers. It maps the same physical pages (`[RAM]`) into both `[PROC]`s' page tables (`[PT]`).
- `[PIPE]` and `[USOCK]` use kernel buffers in `02_kalloc/` (`[SLAB]`).
- For network sockets (cross-host), see sibling `02_socket/` and `02_netstack/` — distinct from these local-only IPCs.
