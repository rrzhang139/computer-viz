# interface — 00_computer/01_os/02_netstack/03_ip

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[IP]` | the IP layer (v4 in V1) | always present |
| `nexthop` | resolved next-hop IP for an outgoing skb | route lookup |
| `oif` | outgoing interface index | route lookup |
| `protocol` | transport protocol number (TCP=6, UDP=17, ICMP=1) | RX demux |

## Symbols this level expects DOWN

(leaf level — no child folders in V1)

## Cross-cutting refs

- Layered between sibling `03_tcp/` (`[TCP]`) above and sibling `03_eth_l2/` (`[L2ETH]`) below.
- Routing table and netfilter hooks live in this level's data; ARP cache lookup occurs in `[L2ETH]`.
- Operates on `[SKB]` from `02_socket/03_skbuff/`.
- TIME_AXIS row: `02_netstack/03_ip` (1 anim sec ⇒ 1 µs).
