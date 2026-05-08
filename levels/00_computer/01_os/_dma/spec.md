# spec — 00_computer/01_os/_dma

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

If the CPU had to copy every byte of a packet or a disk block in/out of `[RAM]`, it would do nothing else. DMA lets devices (`[NIC]`, `[DISK]`/NVMe) read and write `[RAM]` directly via the memory bus / IOMMU, while the CPU runs other work. The kernel sets up a DMA descriptor (physical addresses + length + direction) and rings a doorbell; the device pulls/pushes bytes; an `[IRQ]` lands when done. Without DMA, throughput collapses: a 10 GbE link or NVMe drive would saturate the CPU just on memcpy. The connector encodes the *device ↔ RAM* path that bypasses CPU registers entirely.

## ROLE
Device-to-RAM (or RAM-to-device) bulk transfer mediated by DMA descriptors; CPU sets up + acks, device moves the bytes.

## MADE OF
1 DMA descriptor ring (per device queue) in `[RAM]` + IOMMU mapping (V→P guard for devices) + bus-master capable device + completion `[IRQ]`. Each descriptor: `{phys_addr, len, dir, flags}`.

## INPUTS
TOP: kernel writes descriptor + doorbell (`[DRV]`-mediated control). LEFT: source bytes (RAM for TX/write, device for RX/read).

## OUTPUTS
RIGHT: destination bytes written; completion entry posted; `[IRQ]` raised to driver bottom-half.

## SYMBOL
`[DMA]` (CONNECTOR — device ↔ RAM transfer descriptor).

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder
- spatial invariants apply (see /INVARIANTS.md)
