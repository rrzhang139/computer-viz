# interface — 00_computer/01_os/02_socket

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[SOCK]` | one fd-bound `struct sock` (TCP/UDP/RAW) | `socket()` syscall |
| `state` | protocol state (e.g. `LISTEN`/`ESTABLISHED`/`CLOSE_WAIT` for TCP) | every state transition |
| `sndQLen` / `rcvQLen` | bytes queued per direction | every send/recv |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[SKB]` | one packet container with linear data + frags + headers | `03_skbuff/` |

## Cross-cutting refs

- Created via sibling `01_os/_syscall/` (`[SYSCALL]`).
- Hands TX skbs to sibling `02_netstack/` (`[NETSTACK]`); receives RX skbs the same way.
- Wakes blocked readers via sibling `02_scheduler/` (`[RUNQ]`).
- Skb buffers allocated from sibling `02_kalloc/` (`[SLAB]`).
- TIME_AXIS row: `02_socket` (1 anim sec ⇒ 5 µs).
- Sibling-not-this: `02_ipc/03_unix_socket/` (`[USOCK]`) is AF_UNIX and skips `[NETSTACK]` entirely.
