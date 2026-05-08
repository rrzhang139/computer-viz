# interface — 00_computer/01_os/02_netstack/03_eth_l2

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[L2ETH]` | software ethernet L2 framing module | always present |
| `arpEntry` | ARP cache row (ip, mac, state) for next-hop | each lookup/update |
| `ethertype` | RX dispatch key (0x0800/0x86DD/0x0806/...) | each RX skb |

## Symbols this level expects DOWN

(leaf level — no child folders in V1)

## Cross-cutting refs

- Layered between sibling `03_ip/` (`[IP]`) above and sibling `03_qdisc/` (`[QDISC]`) below on TX.
- On RX, sibling `_napi/` (`[NAPI]`) connector hands skbs in here via `__netif_receive_skb_core`.
- Operates on `[SKB]` from `02_socket/03_skbuff/`.
- TIME_AXIS row: `02_netstack/03_eth_l2` (1 anim sec ⇒ 500 ns).
- **NAMING CARE**: this symbol is `[L2ETH]`, NOT `[L2]`. `[L2]` is the per-core L2 *cache* in `01_chip/02_l2/`. Any reference to ethernet L2 framing must use `[L2ETH]`.
- The hardware-side MAC (`[MAC]` in `01_network/02_nic/03_mac/`) handles preamble + FCS + IPG; this software layer does not.
