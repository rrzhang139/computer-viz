# spec — 00_computer/01_os/02_ipc/03_pipe

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A pipe is the simplest and oldest IPC primitive on Unix: a fixed-size kernel ring buffer with one read end and one write end, both exposed as fds. It exists because Unix shells need to chain processes (`ls | grep | wc`) and the pipeline contract demands streaming bytes between them with backpressure. Without `[PIPE]` you cannot compose programs by piping; every shell pipeline would have to materialize through a temp file. The size (typically 64 KB on Linux) is the buffer that absorbs producer-consumer rate mismatches; when full, the writer blocks; when empty, the reader blocks. Pipes are byte-oriented and have no message boundaries — that distinction is what motivates `[USOCK]` as a sibling.

## ROLE
Move bytes from one fd to another via a kernel-resident ring buffer with blocking semantics: the writer blocks when the ring is full, the reader blocks when it is empty.

## MADE OF
1 `pipe_inode_info` struct + 1 ring buffer of `pipe_buffer` slots (default 16 slots × 4 KB pages = 64 KB) + 2 fds (read end, write end). The pages are kernel pages allocated from `[SLAB]`, mapped read-only or write-only into the kernel address space (NOT mapped into user space — `read`/`write` syscalls copy through them).

## INPUTS
- LEFT (data): bytes from `write(write_fd, buf, n)` syscalls in the producing `[THREAD]`.
- TOP (control): syscall entries (`pipe2`, `read`, `write`, `close`); SIGPIPE delivery if write to a closed read end.

## OUTPUTS
- RIGHT: bytes returned by `read(read_fd, buf, n)` syscalls in the consuming `[THREAD]`; wakeups posted to sibling `[RUNQ]` to unblock waiters.

## SYMBOL
`[PIPE]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row `02_ipc/03_pipe` (1 anim sec ⇒ 1 byte-batch read/write).
- Anonymous pipe = `pipe()` syscall, no filesystem name; named pipe (FIFO) = `mkfifo()`, has a path. Both share the same ring-buffer mechanism.
