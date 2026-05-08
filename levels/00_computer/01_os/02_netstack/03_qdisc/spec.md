# spec — 00_computer/01_os/02_netstack/03_qdisc

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A `[NIC]` can transmit at most one frame at a time per queue, but the kernel sometimes generates skbs faster than the wire can drain — and worse, generates them from many flows that should not all suffer when one of them goes wrong. The qdisc is the per-device packet scheduler that arbitrates this: it queues outgoing skbs, picks one to dequeue when the device's TX descriptor ring has space, and applies optional policies (priority bands, fair queueing, AQM/CoDel to drop in the presence of bufferbloat, pacing for low-jitter). Without `[QDISC]`, applications would suffer either drops at line rate or unbounded queueing latency under congestion. The default `fq_codel` makes Linux the most latency-friendly default network stack in widespread use.

## ROLE
Per-device packet scheduler/queue: enqueue outgoing skbs from `[L2ETH]`, dequeue them when the device's `[NIC]` TX ring has descriptors free, applying classification + AQM + pacing policies.

## MADE OF
1 root qdisc per netdev (default `fq_codel` on Linux ≥ 4.x); typical alternatives: `pfifo_fast` (3-band priority FIFO), `htb`/`tbf` (rate shaping), `mq` (multi-queue NIC dispatch). 1 enqueue function + 1 dequeue function + per-flow state (CoDel: queue-min sojourn time, drop interval; FQ: per-flow stochastic queue + DRR scheduler).

## INPUTS
- LEFT (data): `[SKB]` from `[L2ETH]` heading down to a specific netdev (`dev_queue_xmit`).
- TOP (control): tc-style qdisc reconfigurations (sysctl, `tc qdisc add`); class/filter rules; backpressure when the device's TX ring is full.

## OUTPUTS
- RIGHT: dequeued `[SKB]` handed to `[NIC]` driver's `ndo_start_xmit`, which writes a TX descriptor and rings the doorbell. Drops emitted (counted) when AQM decides the queue has lingered too long.

## SYMBOL
`[QDISC]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row `02_netstack/03_qdisc` (1 anim sec ⇒ 20 µs).
- AQM = Active Queue Management; CoDel = Controlled Delay (pick drops based on dwell time, not queue length).
