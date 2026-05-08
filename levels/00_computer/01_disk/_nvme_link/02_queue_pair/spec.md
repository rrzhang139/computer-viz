# spec — 00_computer/01_disk/_nvme_link/02_queue_pair

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[QP]` is the unit of NVMe parallelism. A queue pair is one submission ring (host writes, drive reads) plus one completion ring (drive writes, host reads), both in host RAM, plus their two doorbell registers in controller MMIO. Modern NVMe drives expose dozens to thousands of queue pairs — typically one per host CPU core — so each core dispatches I/O without lock contention. This is what lets a single drive sustain millions of IOPS: thousands of producer-consumer rings running in parallel, each writing only its tail and reading only its head. Strip the QP and you fall back to a single-queue serialized dispatch, the very bottleneck NVMe was created to eliminate.

## ROLE
One submission/completion ring pair in host RAM with its doorbells in controller MMIO; the ABI cell that the driver and the drive cooperate to push commands through.

## MADE OF
- 1 submission queue (SQ): a host-RAM ring of 64-byte SQEs (typically 64–4096 entries, power-of-two depth)
- 1 completion queue (CQ): a host-RAM ring of 16-byte CQEs paired 1:1 with SQ (or shared by multiple SQs)
- 2 doorbell registers in controller MMIO: SQ tail doorbell (host-write), CQ head doorbell (host-write)
- 2 internal pointers tracked by the drive: SQ head, CQ tail
- 1 CQ phase-tag bit per entry (toggles each ring wrap so host can spot fresh CQEs without polling head/tail)
- 1 MSI-X interrupt vector tied to this CQ

## INPUTS
- LEFT (data): driver writes SQE at SQ tail (memory write), driver writes CQ-head-doorbell to ack consumed CQEs (MMIO write)
- TOP (control): doorbell ring (host→drive), MSI-X interrupt arm/disarm, queue create/delete admin commands

## OUTPUTS
- RIGHT (data): drive reads SQE (DMA), drive writes CQE at CQ tail (DMA), drive raises MSI-X for this CQ vector

## SYMBOL
`[QP]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row: `02_queue_pair` (1 anim sec ⇒ 1 µs; full doorbell→SQE-fetch→CQE-post→MSI-X cycle)
- the producer/consumer + phase-tag + lazy-doorbell pattern is the meat — surface it in the visual

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
