# spec — 00_computer/01_os/02_netstack/03_tcp

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The IP layer is unreliable, unordered, and packet-sized. Applications mostly want a reliable, in-order byte stream. TCP is the kernel module that turns one into the other: it segments the user's byte stream into MSS-sized pieces, attaches sequence numbers + ACKs, retransmits losses, reorders out-of-order receivers, and runs a congestion-control loop (CUBIC, BBR) that gates how fast it sends based on observed loss / RTT. Without `[TCP]` every networked application would have to reimplement reliability and pacing on top of UDP — practically impossible at scale. TCP is also where the *connection* abstraction lives: a state machine (LISTEN → SYN_SENT → ESTABLISHED → FIN_WAIT → ...) that pairs sockets across the network.

## ROLE
Implement reliable in-order byte-stream delivery on top of `[IP]`: segmentation, sequence numbering, ACKs, retransmits, reordering, flow control (rwnd), congestion control (cwnd / RTT estimator).

## MADE OF
1 `tcp_sock` per connection (extends `[SOCK]`) with: send queue (unACKed segments awaiting retransmit), receive queue + out-of-order queue (reassembly buffer), `snd_una` / `snd_nxt` / `rcv_nxt` sequence cursors, `cwnd` / `rwnd` / `srtt` / `rttvar` state, retransmit timers (RTO + delayed-ACK + zero-window probe), congestion-control ops table (CUBIC default, BBR optional). Plus state-machine: LISTEN, SYN_SENT, SYN_RECV, ESTABLISHED, FIN_WAIT_1/2, CLOSE_WAIT, LAST_ACK, TIME_WAIT, CLOSED.

## INPUTS
- LEFT (data, TX): payload bytes from `tcp_sendmsg` (already inside an `[SKB]` from `[SOCK]`).
- LEFT (data, RX): incoming TCP-bearing `[SKB]`s from `[IP]` via `tcp_v4_rcv`.
- TOP (control): RTO timer fires, congestion-control sysctl, application `setsockopt` (NODELAY, KEEPALIVE), `close()` initiating FIN.

## OUTPUTS
- RIGHT (TX): segmented `[SKB]`s with TCP header prepended, handed to `[IP]`.
- RIGHT (RX): in-order bytes appended to the destination `[SOCK]`'s receive queue, plus a wakeup to readers.

## SYMBOL
`[TCP]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row `02_netstack/03_tcp` (1 anim sec ⇒ 10 µs).
- UDP is not a separate child in V1; it's a trivial passthrough cousin handled in the parent's protocol dispatch.
