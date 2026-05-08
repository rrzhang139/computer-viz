# spec — 00_computer/01_os/02_netstack/03_eth_l2

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[IP]` chose a next-hop IP — but to actually put bytes on the wire, the kernel needs the *MAC address* of that next hop and an Ethernet header (dst MAC, src MAC, ethertype) wrapped around the IP packet. That is the L2ETH job: maintain the ARP cache (IP → MAC), prepend the 14-byte Ethernet header on TX, strip it on RX, and dispatch upward by ethertype (0x0800=IPv4, 0x86DD=IPv6, 0x0806=ARP). On RX, this is also where VLAN tags are interpreted. Without `[L2ETH]` there is no notion of "the next link" — IP packets would have no frame to ride on. Note: this is the *software* L2 layer running in the kernel; the *hardware* L2 (preamble, FCS, IPG) lives at `[MAC]` inside `[NIC]`, distinct.

## ROLE
Software ethernet L2 framing: ARP-resolve next-hop IP → MAC, prepend/strip 14-byte ethernet header, dispatch RX by ethertype. Live VLAN handling sits here too.

## MADE OF
1 ARP cache (neighbour table) keyed by `(oif, ip)` returning a MAC + state (REACHABLE/STALE/INCOMPLETE) + a probe timer. 1 ethernet-header builder (14 B: dst MAC[6] + src MAC[6] + ethertype[2]). 1 ethertype dispatch table for RX (`__netif_receive_skb_core` → ptype handlers). Optional 4-byte VLAN tag per skb.

## INPUTS
- LEFT (data, TX): `[SKB]` from `[IP]` with `nexthop` IP attached as metadata.
- LEFT (data, RX): `[SKB]` from sibling `_napi/` (`[NAPI]`) connector with a full ethernet frame in linear data.
- TOP (control): ARP request/reply, NDP for IPv6, link up/down, VLAN configuration.

## OUTPUTS
- RIGHT (TX): `[SKB]` with ethernet header prepended, queued onto sibling `[QDISC]` for the chosen output device.
- RIGHT (RX): de-encapsulated `[SKB]` dispatched by ethertype to sibling `[IP]` (or to ARP code for ARP frames).

## SYMBOL
`[L2ETH]` — DISTINCT from cache `[L2]`; use the explicit `[L2ETH]` everywhere ethernet-L2 framing is meant.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row `02_netstack/03_eth_l2` (1 anim sec ⇒ 500 ns).
- The hardware MAC layer (preamble/FCS/IPG generation) lives in `[NIC]`'s `[MAC]` block; here we only do software framing.
