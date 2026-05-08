# spec — 00_computer/01_os/02_socket/03_skbuff

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A packet inside the Linux kernel is never just a flat buffer — it must accumulate headers as it descends the stack (TCP → IP → ETH), shed them as it ascends, be cloned cheaply for retransmit queues and tcpdump, and survive being held by multiple subsystems with different lifetimes. The container that satisfies all of that is `sk_buff` (skb): a single metadata struct with header-pointer fields (`mac_header`, `network_header`, `transport_header`), a linear data area, an optional list of paged fragments (for zerocopy `sendfile`/`splice`/TSO), and a reference count. Every layer just *moves a pointer* instead of memcpying. Without `[SKB]` you would either pay a memcpy at every protocol layer (a 10× throughput hit on Linux) or invent a separate buffer type per protocol — the entire stack would be unrecognizable.

## ROLE
The universal in-kernel packet container. One `sk_buff` per packet (or per fragment in some paths); carries data, header pointers, ref count, and per-skb metadata as it travels through `[SOCK]` ↔ `[NETSTACK]` ↔ `[NIC]`.

## MADE OF
1 `struct sk_buff` (~200 B metadata) + 1 linear data area (head/data/tail/end pointers) + 0..N `skb_frag_t` page fragments (for zero-copy / TSO segmented payloads) + 1 atomic `users` refcount + per-skb fields (queue mapping, hash, csum state, mark, priority).

## INPUTS
- LEFT (data): bytes copied from user space (`copy_from_iter`) on TX, or DMA'd by the `[NIC]` on RX; header bytes prepended (`skb_push`) or appended (`skb_put`) by each protocol.
- TOP (control): allocation/free calls (`alloc_skb`, `kfree_skb`); clone (`skb_clone` for retransmit/tap); refcount get/put.

## OUTPUTS
- RIGHT: pointer handed to the next layer — up the stack on RX (`netif_receive_skb` → `ip_rcv` → `tcp_v4_rcv` → socket recv queue), down the stack on TX (`tcp_sendmsg` → `ip_queue_xmit` → `dev_queue_xmit` → `[QDISC]` → driver).

## SYMBOL
`[SKB]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row `02_socket/03_skbuff` (1 anim sec ⇒ 200 ns).
- The skb is the *only* place in the kernel where "a packet" is a first-class object; everywhere else it's pointers into one.
