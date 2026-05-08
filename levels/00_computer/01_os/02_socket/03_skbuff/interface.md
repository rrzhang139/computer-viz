# interface — 00_computer/01_os/02_socket/03_skbuff

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[SKB]` | one `sk_buff` packet container | `alloc_skb()` |
| `headers` | mac/network/transport offsets within linear data | each protocol push/pull |
| `users` | atomic reference count | every `skb_get`/`kfree_skb` |
| `frags` | 0..MAX_SKB_FRAGS paged fragment list | TSO/sendfile paths |

## Symbols this level expects DOWN

(leaf level — no child folders in V1)

## Cross-cutting refs

- Allocated from sibling `02_kalloc/` (`[SLAB]`); the `skbuff_head_cache` slab is per-CPU.
- Linear data + frag pages live in `[RAM]` (`00_computer/01_ram/`); page-cache pages can be borrowed for zero-copy.
- Header layout matches what `[TCP]` / `[IP]` / `[L2ETH]` push and pull (under `02_netstack/`).
- DMA'd by `[NIC]` on RX (`00_computer/01_network/02_nic/`) into pre-posted skb-backed pages.
- Free path: typically `kfree_skb()` after the `[NIC]`'s TX completion or after socket recv consumed the last bytes.
- TIME_AXIS row: `02_socket/03_skbuff` (1 anim sec ⇒ 200 ns).
