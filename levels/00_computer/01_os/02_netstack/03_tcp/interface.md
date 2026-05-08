# interface — 00_computer/01_os/02_netstack/03_tcp

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[TCP]` | one `tcp_sock` connection state machine | `socket(SOCK_STREAM)` |
| `state` | one of LISTEN/SYN_SENT/ESTABLISHED/... | every transition |
| `cwnd` / `rwnd` / `srtt` | congestion / receive window / smoothed RTT | each ACK |
| `seq` / `ack` | next sequence to send / next expected | each segment |

## Symbols this level expects DOWN

(leaf level — no child folders in V1)

## Cross-cutting refs

- Layered above `[IP]` (sibling `03_ip/`); hands skbs down on TX, receives them on RX.
- Layered below `[SOCK]` (`02_socket/`); reads from / writes into the socket's send/recv queues.
- Operates on `[SKB]` from `02_socket/03_skbuff/`.
- Retransmit timer + RTO managed via the kernel timer wheel (uses `[TRAP]` softirq).
- TIME_AXIS row: `02_netstack/03_tcp` (1 anim sec ⇒ 10 µs).
