# spec — 00_computer/01_os/02_ipc

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Two `[PROC]`s have isolated address spaces by design — that is what `[PT]` enforces — yet real systems need them to *talk*: a shell pipes `ls` into `grep`, a daemon listens on a unix socket, a database server hands its workers a shared memory segment. IPC is the umbrella for the kernel-mediated channels that cross process boundaries while preserving isolation. Without an IPC layer, every interprocess communication would have to round-trip through `[DISK]` (write a file, poll for it) — orders of magnitude too slow for real workloads. Each child here represents a distinct IPC primitive, picked by latency / semantics tradeoffs: byte stream (`[PIPE]`), datagram or stream over a filesystem path (`[USOCK]`), or genuine shared memory (`[SHM]`).

## ROLE
Group the kernel's same-host interprocess channels: byte-stream pipes, unix-domain sockets, and shared-memory segments. Each child is one mechanism with its own latency/throughput/semantics tradeoff.

## MADE OF
3 mechanisms in V1: 1 `[PIPE]` (kernel ring buffer), 1 `[USOCK]` (AF_UNIX endpoint), 1 `[SHM]` (shared physical pages). All three are file-descriptor-based abstractions allocated by syscalls and observed via `read`/`write` (or memory loads in `[SHM]`'s case).

## INPUTS
- LEFT (data): bytes / datagrams from the writing `[PROC]`'s user-mode `write()` / `send()` / store instructions.
- TOP (control): syscall entry from `01_os/_syscall/` opening, reading, writing, closing the IPC fd; signals from sibling `_signal/` (e.g., SIGPIPE on closed-pipe write).

## OUTPUTS
- RIGHT: bytes / datagrams handed to the reading `[PROC]` via `read()` / `recv()` / direct memory load; wakeups into sibling `02_scheduler/`'s `[RUNQ]` to unblock waiters.

## SYMBOL
No new bracket — `02_ipc` is a *region* containing `[PIPE]`, `[USOCK]`, `[SHM]`. Higher levels reference those individually.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- All three children are local-only (single host); cross-host IPC lives in `02_socket/` + `02_netstack/`.
