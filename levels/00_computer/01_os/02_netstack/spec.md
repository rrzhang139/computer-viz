# spec — 00_computer/01_os/02_netstack

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A `[SOCK]` produces an `[SKB]` carrying a payload, but that payload is not yet a packet that any wire understands. Something has to add a TCP header (sequence numbers, ACK), then an IP header (route lookup, src/dst, TTL), then an Ethernet header (next-hop MAC via ARP), and hand the now-fully-framed `[SKB]` to a per-device queue (`[QDISC]`) for the driver to send. On the receive side, the same chain runs in reverse — driver hands an `[SKB]` to `netif_receive_skb`, which dispatches by ethertype to `ip_rcv`, which dispatches by protocol to `tcp_v4_rcv`, which delivers into the `[SOCK]`'s receive queue. `[NETSTACK]` is that whole protocol-dispatch graph in one container; without it, sockets would have nothing to talk *to* and packets nothing to be parsed *by*.

## ROLE
The protocol dispatch graph between `[SOCK]` and the per-device transmit/receive paths. Hosts the layered protocol implementations (`[TCP]`, `[IP]`, `[L2ETH]`) and the per-device output discipline (`[QDISC]`). TX direction = encapsulate; RX direction = decapsulate.

## MADE OF
1 `[TCP]` (and UDP) protocol module + 1 `[IP]` routing/forwarding module + 1 `[L2ETH]` framing/ARP module + 1 `[QDISC]` per network device. Plus a small dispatch glue (`af_inet`, `dev_queue_xmit`, `netif_receive_skb`) that wires the chain together by ethertype/protocol number.

## INPUTS
- LEFT (data, TX): `[SKB]` from a `[SOCK]` carrying user payload; (RX) `[SKB]` from sibling `_napi/` (`[NAPI]`) connector, containing a fully-framed packet from `[NIC]`.
- TOP (control): routing-table updates, ARP cache changes, sysctls (TCP cong-control choice, MTU), `[QDISC]` reconfigurations.

## OUTPUTS
- RIGHT (TX): fully-framed `[SKB]` enqueued on a device `[QDISC]` and dequeued to `[NIC]` for DMA + transmit; (RX) decapsulated `[SKB]` delivered into the destination `[SOCK]`'s receive queue, plus a wakeup to `[RUNQ]`.

## SYMBOL
`[NETSTACK]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row `02_netstack` (1 anim sec ⇒ 2 µs).
- IPv4 first-class in V1; IPv6 follows the same dispatch shape.
