# spec — 00_computer/01_network/02_nic/03_offload

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

CPU cycles spent computing TCP checksums or splitting one 64 KB TSO buffer into 44 MTU-sized packets are pure tax — work that the NIC can do at line rate while the host does *anything else*. Hardware offloads (TSO/GSO, checksum, RSS) are why a single Linux server can saturate 25 Gbit without burning a core on the network stack, and why an iperf3 measurement of "host CPU per Gbit" is so much lower than the textbook would predict. Remove `[OFFLOAD]` and the kernel must scatter-gather, segment, and checksum every byte itself; throughput collapses and the NIC card looks pointlessly dumb.

## ROLE
On TX: take a single large skbuff with a "this needs segmentation" hint, copy/segment it into MTU-sized frames, fill in IPv4/TCP headers per segment, compute checksums, hand each segment to `[MAC]`. On RX: compute a 32-bit RSS hash over (5-tuple) and steer the frame to one of N RX queues; emit the hash to the descriptor for skbuff-side reuse.

## MADE OF
1 TSO/GSO segmenter (header rewrite + length-fix table) + 1 checksum unit (1's-complement adder array, IPv4/TCP/UDP) + 1 RSS hash unit (Toeplitz over a programmable 320-bit key) + 1 indirection table (128–512 entries × log2(N-queues)). All combinational + small SRAM, no per-packet host involvement.

## INPUTS
LEFT (data): on TX, super-skbuff (one big buffer + headers prototype) from `[DMA]` ring; on RX, raw frame bytes from `[MAC]`. TOP (control): TSO-enable, CSO-enable, RSS-enable, RSS key, indirection-table contents (programmed by driver via MMIO).

## OUTPUTS
RIGHT: on TX, a stream of MTU-sized framed payloads (with sequence numbers and checksums adjusted) into `[MAC]`; on RX, the original frame plus a (queue-id, hash) pair into the descriptor write-back path. TIME_AXIS row `02_nic/03_offload` (1 anim sec ⇒ 100 ns, ≈ one TSO segment emitted).

## SYMBOL
`[OFFLOAD]` (registered in GLOSSARY).

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- Demo assumes IPv4 + TCP for offload examples; IPv6 and UDP-based offloads (USO, GRO-on-RX) are conceptually identical and can be added later.
