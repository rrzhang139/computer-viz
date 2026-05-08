# art — 00_computer/01_os/02_netstack/03_qdisc

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. A qdisc is a queue with policy; render it as a glowing multi-band buffer with AQM behavior visible.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Center: a multi-band stack of horizontal queues (default view: `fq_codel` showing several "flow" sub-queues stacked vertically), each as a glowing slot rail in `--color-storage` (purple) with skb capsules occupying slots in `--color-data` (blue). Sub-queue heights are dynamic — flows with more pending bytes look fuller.
- LEFT: enqueue port — incoming skbs from `[L2ETH]` arrive and are *classified* into one of the per-flow rails (a small "flow hash" pop-up shows the 5-tuple key). Newly-classified capsules pulse briefly.
- RIGHT: a dequeue port — the scheduler (DRR cursor for fq_codel) glides among rails picking the next rail to drain; capsule departs toward `[NIC]` halo.
- TOP control band: AQM CoDel state per rail — a tiny sojourn-time gauge above each rail; when it exceeds the target (~5 ms), a "drop" glyph flashes in `--color-active` (hot pink) and one enqueued capsule dissolves.
- A backpressure indicator: when `[NIC]`'s TX descriptor ring is empty, the dequeue port stops; queues fill; eventually CoDel fires and drops kick in.

## Reasoning

The two qdisc ideas (fairness across flows, drop-on-dwell-time AQM) are pure scheduling — the only legible visualization is queues with a moving cursor and time-based markers. Tier 3 keeps each band visible as a separate rail, which is the entire fairness story; flat boxes would erase that.
