# spec — 00_computer/01_os/02_ipc/03_unix_socket

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A unix-domain socket reuses the BSD socket API (the same `socket()` / `bind()` / `connect()` / `send()` / `recv()` your code uses for TCP) but stays entirely on one host — no network stack, no IP, no checksums. Two reasons it exists alongside `[PIPE]`: (1) it gives daemons a *named* rendezvous point on the filesystem (`/var/run/docker.sock`, X11's `/tmp/.X11-unix/X0`) that any client can `connect` to, and (2) it supports message boundaries (SOCK_DGRAM / SOCK_SEQPACKET), file-descriptor passing (`SCM_RIGHTS`), and credential passing (`SO_PEERCRED`) — none of which `[PIPE]` provides. Without `[USOCK]`, every desktop daemon protocol (Wayland, dbus, systemd) would need either named pipes (no message framing) or an IP socket (paying for a network stack on localhost).

## ROLE
Provide BSD-socket semantics over the local kernel only — name endpoints with filesystem paths, deliver framed messages, optionally pass fds and credentials between processes.

## MADE OF
1 `struct socket` + 1 `struct unix_sock` per endpoint + 1 send-receive queue of `[SKB]`-style buffers (V1 reuse the kernel `sk_buff` accounting). Bind state: a filesystem path (or abstract namespace). Modes: SOCK_STREAM (byte-oriented, like TCP), SOCK_DGRAM (datagram), SOCK_SEQPACKET (framed reliable).

## INPUTS
- LEFT (data): payloads from `send()` / `sendmsg()` / `write()` syscalls on the writing `[THREAD]`'s endpoint.
- TOP (control): syscall entries (`socket(AF_UNIX,...)`, `bind`, `listen`, `accept`, `connect`, `sendmsg`, `recvmsg`, `close`); ancillary control messages (SCM_RIGHTS for fd passing).

## OUTPUTS
- RIGHT: payloads delivered to the peer endpoint's receive queue; readable via `recv()` / `recvmsg()` syscalls; wakeups to sibling `[RUNQ]` to unblock waiters.

## SYMBOL
`[USOCK]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row `02_ipc/03_unix_socket` (1 anim sec ⇒ 1 message send/recv).
- Distinct from `[SOCK]`: that lives in `02_socket/` and bridges to `[NETSTACK]`. `[USOCK]` short-circuits the network stack entirely.
