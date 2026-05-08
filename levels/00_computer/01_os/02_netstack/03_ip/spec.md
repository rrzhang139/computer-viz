# spec — 00_computer/01_os/02_netstack/03_ip

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[TCP]` produces a stream of segments addressed to `(dst_ip, dst_port)`; each segment must reach the right host across an arbitrary routed network. The thing that figures out "*how* to get there from here" is the IP layer: it does a longest-prefix-match against the host's routing table to pick a next-hop and an outgoing interface, attaches an L3 header (src/dst, TTL, protocol, fragment offset), and on the way down hands the now-routed packet to `[L2ETH]` for next-hop framing. On RX, IP demuxes by `protocol` field to TCP/UDP/ICMP. Without `[IP]` there is no notion of "host" or "route" — packets cannot leave the local link. IP is also where TTL counts down (loop protection) and where (rare in modern networks) fragmentation happens when MTU is exceeded.

## ROLE
Layer 3 routing + framing: pick next-hop/interface via routing-table lookup, prepend an IP header, decrement TTL, dispatch RX packets to the right transport.

## MADE OF
1 routing-table (FIB) — typically an LPM trie keyed by destination prefix, returning `(nexthop, oif)`. 1 ARP-cache pointer (used by `[L2ETH]` next layer down). 1 IP-header builder (`ip_local_out` / `ip_output` / `ip_finish_output`). 1 RX dispatch (`ip_rcv` → `ip_rcv_finish` → `ip_local_deliver` → `protocol_handler[ip_proto]`).

## INPUTS
- LEFT (data, TX): `[SKB]` from `[TCP]` carrying transport-framed payload.
- LEFT (data, RX): `[SKB]` from `[L2ETH]` after MAC strip (`ip_rcv` is the entry point).
- TOP (control): routing-table updates (route add/del, link state); netfilter hooks (PREROUTING/FORWARD/POSTROUTING) on every packet.

## OUTPUTS
- RIGHT (TX): IP-headered `[SKB]` handed to `[L2ETH]` along with the chosen `nexthop` to ARP-resolve.
- RIGHT (RX): TCP-/UDP-/ICMP-bearing `[SKB]` dispatched to the appropriate sibling (here, `[TCP]`).

## SYMBOL
`[IP]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row `02_netstack/03_ip` (1 anim sec ⇒ 1 µs).
- IPv4 is the V1 first-class case; IPv6 is structurally identical with a 40-byte fixed header.
