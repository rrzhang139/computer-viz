# art — 00_computer/01_os/_napi

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. NAPI is the bridge animation between an interrupt firing and the protocol stack receiving a batched train of skbs — pure software flow with stage transitions.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- A horizontal "RX path spine" running RIGHT → LEFT (RX direction in this level's view, since data flows from `[NIC]` UP to `[NETSTACK]`):
  - Far RIGHT: `[NIC]` halo with the RX descriptor ring (curved ring of slots), one slot per packet, freshly-DMA'd capsules in `--color-data` (blue).
  - Stage 1 (rightmost): a hard-IRQ flash — small lightning glyph in `--color-control` (orange) firing once when the NIC raises IRQ; a "HARD IRQ" pill blinks.
  - Stage 2: `napi_schedule` cue — the napi context capsule transitions from `IDLE` to `SCHEDULED`; pill changes color.
  - Stage 3: softirq band — a translucent ksoftirqd ribbon stretches across the spine; the napi capsule docks onto it ("POLLING" pill).
  - Stage 4: the *poll loop* — animated cursor walks the descriptor ring left-to-right (or perimeter-around), dequeueing up to `budget` skb capsules; counter "X / 64" advances.
  - Far LEFT: skbs exit toward `[NETSTACK]` halo as a tightly-packed train.
- TOP control band: budget gauge (filling); when budget hits 64 mid-stream, an "RESCHED" glyph blinks (NAPI requeues itself rather than reenable IRQ); when ring drains first, an "IRQ-ON" glyph blinks (re-enable hard IRQ).
- The spine has subtle motion lines suggesting flow direction; particles batch up so the user *sees* one IRQ delivering many packets — the whole point of NAPI.

## Reasoning

The amortization story is a *temporal* story: one IRQ amortized across many packet deliveries. Tier 3's particle flow with a budget counter and stage pills makes that visible at a glance. A flat box-and-arrow would say "IRQ → softirq → poll" and lose the punchline that one IRQ has just delivered 64 packets.
