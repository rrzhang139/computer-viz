# interface — 00_computer/01_os/02_netstack

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[NETSTACK]` | the protocol dispatch graph (TCP/IP/L2 + qdisc) | per-host once |
| `txDir` / `rxDir` | which direction an `[SKB]` is currently traversing | each layer hop |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[TCP]` | TCP segmentation + reliability state | `03_tcp/` |
| `[IP]` | IP routing + L3 framing | `03_ip/` |
| `[L2ETH]` | software ethernet L2 framing + ARP cache | `03_eth_l2/` |
| `[QDISC]` | per-device packet scheduler | `03_qdisc/` |

## Cross-cutting refs

- TX entry from sibling `02_socket/` (`[SOCK]`) handing skbs into `tcp_sendmsg` / `udp_sendmsg`.
- RX entry from sibling `_napi/` (`[NAPI]`) connector — packets arrive bottom-up via `netif_receive_skb`.
- Bottom of TX path goes to `00_computer/01_network/02_nic/` (`[NIC]`) via `dev_queue_xmit`.
- Operates on `[SKB]` objects defined in sibling `02_socket/03_skbuff/`.
- TIME_AXIS row: `02_netstack` (1 anim sec ⇒ 2 µs).
- The bracket symbol here is `[L2ETH]` — DISTINCT from cache `[L2]`. Use `[L2ETH]` everywhere ethernet L2 is meant.
