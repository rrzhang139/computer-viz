# interface — 00_computer/01_os/02_ipc/03_unix_socket

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[USOCK]` | one AF_UNIX endpoint (struct unix_sock) | `socket(AF_UNIX,...)` |
| `path` | filesystem rendezvous path (or abstract name) | `bind()` |
| `peerFd` | the peer endpoint when connected | `connect()` / `accept()` |

## Symbols this level expects DOWN

(leaf level — no child folders in V1)

## Cross-cutting refs

- Created via sibling `01_os/_syscall/` (`[SYSCALL]`).
- Bind paths live in sibling `02_vfs/` namespace (`[INODE]` / `[DENTRY]`); abstract namespace bypasses VFS.
- Buffers allocated from sibling `02_kalloc/` (`[SLAB]`).
- Wakeups feed sibling `02_scheduler/` (`[RUNQ]`).
- Distinct from `02_socket/` (`[SOCK]`) which routes via `[NETSTACK]`; `[USOCK]` does NOT touch `[TCP]` / `[IP]` / `[L2ETH]`.
- TIME_AXIS row: `02_ipc/03_unix_socket` (1 anim sec ⇒ 1 message).
