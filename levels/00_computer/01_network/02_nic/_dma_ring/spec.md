# spec — 00_computer/01_network/02_nic/_dma_ring

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The DMA descriptor ring is the *zero-copy contract* between kernel and NIC: a circular array of (buffer-pointer, length, status) records, with a producer/consumer head/tail pair. The kernel writes descriptors and rings a doorbell (MMIO write); the NIC reads them via `[PCIE]`, DMAs the payloads, and writes back status — all without the CPU touching packet bytes. Without `_dma_ring` the NIC and kernel would have to rendezvous on every byte through MMIO, costing ~1 syscall per packet — performance dies. Removing this connector means `[NIC]`, `[DMA]`, `[NETSTACK]` are not actually connected.

## ROLE
Carry packet pointers and status between host RAM (kernel) and NIC silicon, in both directions, as a producer/consumer queue with explicit head/tail registers and DMA write-backs.

## MADE OF
2 rings (one TX, one RX), each = N descriptors (typically 256–4096 entries) sitting in host RAM. Per direction: head register (in NIC MMIO, owned by the producer), tail register (in NIC MMIO, owned by the consumer), and a doorbell (MMIO write that updates the producer's view in the NIC). Wrapping pointer arithmetic mod N.

## INPUTS
LEFT (data): on TX ring, kernel writes descriptors at [tail++]; on RX ring, NIC writes back status at [head++]. TOP (control): MMIO doorbell writes from kernel = "new TX descriptors past tail" or "new RX buffers posted".

## OUTPUTS
RIGHT: descriptor reads/writes seen as `[TLP]`s on `[PCIE]` (Memory-Read for TX descriptor fetch; Memory-Write for RX descriptor write-back and packet payload DMA). UPward to host: write-back of "TX done" or "RX received" plus an MSI-X `[TLP]` waking `_napi`. TIME_AXIS row `02_nic/_dma_ring` (1 anim sec ⇒ 1 µs).

## SYMBOL
None — connector with no entity of its own. Borrows `[DMA]` (defined at `levels/.../01_os/_dma/`).

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder
- spatial invariants apply (see /INVARIANTS.md)
- The ring lives in *host RAM*, but the head/tail counters live in NIC MMIO — that asymmetry is the whole point.
