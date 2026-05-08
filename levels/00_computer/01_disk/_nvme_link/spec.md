# spec — 00_computer/01_disk/_nvme_link

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The host CPU does not talk to the SSD controller register-by-register over PCIe — that would round-trip too often. NVMe is the protocol that lets the host queue *thousands* of commands in shared host-RAM rings and tell the drive "go fetch them yourself," with a single doorbell write. The drive then DMAs commands and data autonomously, and signals completion via MSI-X. `[_nvme_link]` is that complete host↔controller transport: PCIe physical/link/transaction layers underneath, plus the queue-pair + doorbell + completion-interrupt protocol on top. Strip it out and every disk I/O costs CPU cycles per byte instead of being a fire-and-forget dispatch.

## ROLE
The NVMe-over-PCIe transport between the kernel block layer and `[SSDCTRL]`: SQE/CQE rings in host RAM, doorbell-driven fetch, DMA payloads, MSI-X completions.

## MADE OF
- Signals/protocol: NVMe (admin + I/O queue pairs, command set: read, write, flush, dataset-management/trim, etc.) on top of PCIe gen3/gen4/gen5 physical layer.
- Physical medium: 4 PCIe lanes (M.2 typical) carrying differential serial pairs at 8/16/32 GT/s per lane (gen3/4/5).
- Logical pieces: `[QP]` (one or more submission/completion queue pairs in host RAM), doorbell registers in controller MMIO BAR, MSI-X interrupt vector table, scatter-gather PRP/SGL list format.

## INPUTS
- LEFT (data, host→drive direction): NVMe SQEs (64 B commands) in host RAM submission queue; on writes, PRP/SGL-pointed payload pages in host RAM
- TOP (control): SQ doorbell writes from the kernel NVMe driver, drive-side queue/abort/reset commands

## OUTPUTS
- RIGHT (data, drive→host direction): on reads, payload DMA into host RAM; CQEs (16 B completions) into host CQ; MSI-X interrupt to the host LAPIC

## SYMBOL
None (`_nvme_link` is a connector — owner = parent `01_disk/`)

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder `01_disk/`
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row: `_nvme_link` (1 anim sec ⇒ 1 µs; PCIe gen4 of one queue entry)
- the queue-pair sub-level (`02_queue_pair/`) drills into one SQ/CQ pair; `[TLP]` framing is in cross-cutting `[_pcie]`

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder
- spatial invariants apply (see /INVARIANTS.md)
