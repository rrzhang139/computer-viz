# art — 00_computer/01_os/02_socket

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. The socket is a kernel struct + two queues; render it as a glowing dual-port object straddling user and protocol worlds.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Center: a single `[SOCK]` capsule with two distinct halves — fd-side (left, `--color-data` blue) and protocol-side (right, `--color-storage` purple) — connected by a translucent throat. The fd-side shows the fd id label; the protocol-side shows the `state` label (e.g., `ESTABLISHED`).
- LEFT (data IN, TX path): a user buffer halo with byte particles streaming into the fd-side; on the throat they CONDENSE into discrete skb capsules (gradient with a header-strip + payload-strip; see `03_skbuff/art.md`).
- RIGHT (data OUT, TX path): skb capsules exit toward `[NETSTACK]`'s halo (drawn faintly off-screen right).
- The RX path uses the same capsule but flows right→left: skbs arrive at protocol-side, dock in the receive queue (a stack of skb tokens vertically beside the capsule), then bytes drip out the fd-side to the user.
- TOP: control band showing protocol ops table icons (`tcp_sendmsg`, `tcp_recvmsg`, `tcp_connect`) — pulses on the active op.
- Two queue ribbons attached to the protocol-side: `sndQ` (top arc, bytes accumulating) and `rcvQ` (bottom arc, bytes draining). Length bars in `--color-control` orange.

## Reasoning

The fd↔stack bridge is the load-bearing concept. Two-tone halves with a throat make "this object lives in two worlds" visible. Capsule condensation/dissolution at the throat communicates the wrap/unwrap into `[SKB]`. The queue ribbons surface backpressure (when sndQ fills, the writer blocks).
