# interface — 00_computer/01_os/02_netstack/03_qdisc

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[QDISC]` | one per-device packet-scheduler queue | netdev attach |
| `qlen` / `qbytes` | current queued skbs / queued bytes | every enqueue/dequeue |
| `dropped` | counter of AQM/full-queue drops | each drop |

## Symbols this level expects DOWN

(leaf level — no child folders in V1)

## Cross-cutting refs

- Receives skbs from sibling `03_eth_l2/` (`[L2ETH]`) on TX; emits to `00_computer/01_network/02_nic/` (`[NIC]`).
- Backpressured by sibling `01_network/02_nic/_dma_ring/` (TX descriptor ring availability).
- TIME_AXIS row: `02_netstack/03_qdisc` (1 anim sec ⇒ 20 µs).
- The qdisc is purely a TX-side concept; RX has no equivalent (RX skbs go straight to `__netif_receive_skb_core`).
