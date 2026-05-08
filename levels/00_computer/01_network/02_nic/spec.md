# spec — 00_computer/01_network/02_nic

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The NIC controller is the silicon that *bridges two clock domains*: the host's DMA-descriptor world (host RAM, PCIe at GHz) and the wire's MAC world (frames at 1 Gbit, 8 ns per byte). Without it the kernel would have to copy every byte through the CPU and compute every checksum on the host — that was the early-1990s reality and it cost ~50% of CPU at 100 Mbit. Removing `[NIC]` removes the descriptor ring, doorbells, MSI-X, and offloads, and the visualization is left with a kernel-side stack that has nothing to talk to.

## ROLE
Take TX descriptors from `[DMA]` rings, optionally segment/checksum (`[OFFLOAD]`), present bytes to `[MAC]` for framing, and on RX accept frames from `[MAC]`, hash them (RSS), DMA them into pre-posted host buffers, and raise an MSI-X interrupt. Run autonomously between doorbells.

## MADE OF
1 `[OFFLOAD]` block + 1 `[MAC]` block + 1 `_dma_ring` interface + 1 PCIe endpoint (root-port-facing). Internally: TX FIFO, RX FIFO, descriptor caches, RSS hash unit, MSI-X table, register file (BAR-mapped MMIO).

## INPUTS
LEFT (data): TX descriptors and packet buffers from `[DMA]` ring (host RAM via `[PCIE]`). TOP (control): MMIO doorbell writes (TX-tail, RX-head), interrupt-mask register writes, RSS key + indirection table programming, `[OFFLOAD]` enable bits.

## OUTPUTS
RIGHT: byte stream into `[MAC]` for transmit; reverse direction, byte stream out of `[MAC]` into RX FIFO. UPward to host: DMA writes of RX descriptors and skbuff payloads, plus MSI-X TLP raised for completion. TIME_AXIS row `01_network/02_nic` (1 anim sec ⇒ 1 µs, ≈ one descriptor handoff).

## SYMBOL
`[NIC]` (registered in GLOSSARY).

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- Demo assumes 1G NIC (e.g. Intel I210) for tractable timing; 10/25/100G models add more queues but the structure is the same.
