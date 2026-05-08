# spec — 00_computer/01_os/02_block_layer

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Filesystems and `[PCACHE]` produce I/O requests at a fine granularity (a 4 KB page here, an 8 KB readahead there). Storage devices are happiest with large, sequential, batched I/O. The block layer mediates: filesystems submit `bio` structs (logical block + length + direction + payload pages); the block layer queues them per-device, merges adjacent requests, schedules them per a policy (CFQ/deadline/none/mq-deadline), and dispatches to `[DRV]`. NVMe backends typically use multi-queue (blk-mq) with one queue per CPU and minimal scheduling. Without this layer, every fs would re-implement merging + scheduling and the scaling story for SSDs (millions of IOPS) would collapse.

## ROLE
Per-device I/O request queue + merger + scheduler; transforms `bio`s into device-ready commands for `[DRV]`.

## MADE OF
1 `request_queue` per block device + N hardware queues (mq) + scheduler plugin (CFQ/deadline/none/Kyber/BFQ) + bio-merge logic. Each request: list of bios with same direction, mergeable LBA range.

## INPUTS
LEFT: bios from `[VFS]`/`[PCACHE]`/swap (data: pages + LBA + direction). TOP: scheduler policy choice + dispatch tick (kernel-mediated control).

## OUTPUTS
RIGHT: dispatched requests to `[DRV]` (NVMe submission queue / SCSI command); completion bios returned LEFT after device finishes.

## SYMBOL
`[BLOCKQ]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
