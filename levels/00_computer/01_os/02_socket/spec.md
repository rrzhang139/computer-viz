# spec — 00_computer/01_os/02_socket

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

User-mode programs see *file descriptors*; they call `send(fd, buf, n)` and `recv(fd, buf, n)`. The kernel network stack sees `[SKB]` packet containers, protocol headers, routing tables. Something must bridge those two worlds — converting a userspace fd-and-buffer into a chain of skbs heading down `[NETSTACK]`, and turning incoming skbs back into bytes a `read()` syscall can return. That bridge is `[SOCK]`: every `socket(AF_INET,...)` call allocates one, hung off the protocol-specific ops table (TCP / UDP / RAW). It owns the per-flow send and receive queues, the protocol state pointer (`tcp_sock` for TCP), and the wakeup wiring to `[RUNQ]`. Without `[SOCK]` there is no place to *be* a TCP connection from kernel's standpoint — fds would have nothing to point at.

## ROLE
Bridge a user-space fd to the in-kernel network stack: own per-socket send and receive queues of `[SKB]`s, dispatch `send`/`recv` syscalls to the right protocol's ops, hold protocol state, wake threads when packets arrive.

## MADE OF
1 `struct socket` (the fd-side handle) + 1 `struct sock` (the protocol-side state) per open socket. Per-socket fields: send queue (`sk_write_queue`), receive queue (`sk_receive_queue`), protocol ops table (`prot`), wait queue, send/recv buffer limits (`SO_SNDBUF`/`SO_RCVBUF`). Plus 1 `[SKB]` allocator (zoom child).

## INPUTS
- LEFT (data): user buffers from `send()` / `sendmsg()` / `write()` syscalls; bytes get *wrapped* into `[SKB]`s and pushed down toward `[NETSTACK]`.
- TOP (control): syscall entries (`socket`, `bind`, `listen`, `accept`, `connect`, `setsockopt`, `close`); incoming-skb deliveries from `[NETSTACK]` (RX path) — the bottom of the stack, but rendered as TOP control here because protocol code drives the socket from above-state.

## OUTPUTS
- RIGHT: `[SKB]`s handed to `[NETSTACK]` for protocol processing (TX); user buffers filled by `recv()` from receive queue (RX); wakeups to sibling `02_scheduler/`'s `[RUNQ]` to unblock readers.

## SYMBOL
`[SOCK]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row `02_socket` (1 anim sec ⇒ 5 µs).
- `AF_INET` / `AF_INET6` sockets only here. `AF_UNIX` sockets live in `02_ipc/03_unix_socket` (`[USOCK]`).
