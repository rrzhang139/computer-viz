# interface — 00_computer/01_network/02_nic/_dma_ring

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| (borrows) `[DMA]` | one descriptor consumed (TX done or RX delivered) | descriptor write-back DW |
| doorbell | MMIO write from kernel updating tail/head | TLP completion at `[NIC]` |
| ring-overflow | producer caught up to consumer (ring full) | tail+1 == head |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none) | no children at Phase 1 — internals are PCIe TLPs already covered by `_pcie/02_tlp` | — |

## Cross-cutting refs

- `[NIC]` (parent of this connector): owns head/tail registers in MMIO BAR.
- `[PCIE]` / `[TLP]` — every descriptor read, payload DMA, write-back is a TLP.
- `[DMA]` (`levels/.../01_os/_dma/`) — same descriptor concept; this is the per-NIC instance.
- `_napi` — RX softirq that drains the ring.
- TIME_AXIS row `02_nic/_dma_ring`.
