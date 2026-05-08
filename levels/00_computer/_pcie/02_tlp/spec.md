# spec — 00_computer/_pcie/02_tlp

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

PCIe is a *packet* network, not a memory bus — every CPU↔NIC or CPU↔NVMe transaction crosses the link as a `[TLP]`. Without showing a TLP the user has no mental model for *what is moving* on the lanes; "DMA" becomes magic. The TLP is the unit of credit-based flow control, ordering, and routing, and it is the level where MMIO writes, DMA reads, and MSI-X interrupts all collapse into the same on-wire object. Remove `[TLP]` and the difference between an MMIO doorbell and a DMA descriptor write disappears.

## ROLE
Carry one transaction (memory-read, memory-write, config, completion, or message/MSI-X) end-to-end across the `[PCIE]` link as a framed packet with header + payload + LCRC, striped across the active `[LANE]`s.

## MADE OF
1 header (3–4 DW = 12–16 B), 0..1024 DW payload (bounded by Max-Payload-Size, typically 256–512 B), 1 LCRC (32 b). Wrapped at the data-link layer with a sequence number and DLLP framing tokens, then 128b/130b coded onto lanes. Per-direction sequencing + ACK/NAK retry buffer.

## INPUTS
LEFT (data): one (addr, len, data?) request from the `[CHIP]` root complex, or from `[NIC]`/`[DISK]` as an upstream master. TOP (control): VC/TC selector, ordering attributes (RO/NS), credit availability from the receiver.

## OUTPUTS
RIGHT: a serialized byte stream handed down to `[LANE]`s for transmission; a *completion* TLP returned for non-posted requests. TIME_AXIS row `_pcie/02_tlp` (1 anim sec ⇒ 4 ns, ≈ one TLP at gen4 ×4).

## SYMBOL
`[TLP]` (registered in GLOSSARY).

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- gen4 ×4 assumed for the demo; sufficient for `[NIC]` 1G traffic and a single NVMe queue.
