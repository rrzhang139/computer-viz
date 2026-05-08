# spec — 00_computer/01_disk

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[DISK]` is the level where the data outlives power. RAM forgets at the next reboot; the disk is what makes a file a file. As an SSD it lives on the PCIe fabric (the `[CHIP]` peripheral side), so a load that misses every cache and even RAM can still resolve — at a price: an NVMe read costs roughly 1000× a RAM access (TIME_AXIS row `01_disk` = 100 µs vs `01_ram` = 100 ns). Without `[DISK]` there is no filesystem, no swap, no executable on which `[BIN]` could sit.

## ROLE
A PCIe-attached non-volatile block store that takes LBA-addressed read/write commands from the kernel block layer and returns persisted data, at µs–ms latencies asymmetric across read/program/erase.

## MADE OF
1 `[SSDCTRL]` SoC + N `[NAND]` dies (typically 8–32) wired to it via M `[FCH]` channels, plus the `[_nvme_link]` connector to the host. Internally the controller hosts `[FTL]`, `[GC]`, `[ECC]` engines and a small DRAM cache for mapping tables.

## INPUTS
- LEFT (data): NVMe submission queue entries from host RAM via `[_nvme_link]` (LBA, opcode, scatter-gather list)
- TOP (control): doorbell writes, MSI-X interrupts, admin/reset signals from host

## OUTPUTS
- RIGHT (data): completed read payloads DMA'd back to host RAM, completion-queue entries posted via `[_nvme_link]`

## SYMBOL
`[DISK]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row: `01_disk` (1 anim sec ⇒ 100 µs)
- read/program/erase asymmetry is the defining physical fact at this level — surface it visually

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
