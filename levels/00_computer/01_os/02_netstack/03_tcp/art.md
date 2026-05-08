# art — 00_computer/01_os/02_netstack/03_tcp

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. TCP is state machines + sliding windows + sequence-numbered segments — a pure software construct that demands rich animation.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Center-LEFT: a long horizontal "byte stream" ribbon (the user's send buffer) with seq-number marks every MSS bytes; gradient `--color-data` (blue) saturating where data is unsent and dimming where ACKed.
- Center: a *sliding window* overlay — a translucent rectangle of width `min(cwnd, rwnd)` riding the ribbon; its left edge anchored at `snd_una`, right edge at `snd_nxt + cwnd`. The window glides right as ACKs arrive.
- Below the ribbon: cwnd/srtt graph as a small live sparkline — bumps on each ACK (slow start / cong avoid), drops on retransmit (additive-incr / multiplic-decr motif).
- TX particles: each MSS chunk leaving the window becomes an `[SKB]` capsule with TCP-header strip, exiting RIGHT toward `[IP]`. Retransmits are drawn in `--color-active` (hot pink) with a "RETRY" badge.
- RX side (mirror, below the TX ribbon): incoming segments arrive RIGHT→LEFT, with out-of-order ones queued in a "reorder buffer" with sequence-gap glyphs.
- TOP: the state-machine pill — current state highlighted in a small donut diagram of the standard TCP states (LISTEN/SYN_SENT/ESTABLISHED/...).
- A subtle RTT-anchor visual: a "ping" beacon that travels right then comes back as a "pong," the round-trip time animated as the srtt updater.

## Reasoning

The most important TCP intuitions — sliding window, reorder, retransmit, congestion ramp — are all spatial/temporal. Tier 3 lets us animate them all on a single byte-stream timeline. A flat box would force a textual table of fields and lose the "you can SEE the window glide" insight that makes congestion control intelligible.
