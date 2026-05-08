# interface — 00_computer/01_network/02_nic

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[NIC]` | the NIC controller chip as a single peripheral | reset deasserted + link-up from `[PHY]` |
| descriptor-consumed | one TX descriptor's bytes are on the wire | `[MAC]` end-of-frame strobe → ring write-back |
| MSI-X | interrupt TLP toward CPU LAPIC | RX FIFO threshold or RX descriptor write-back |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[OFFLOAD]` | TSO/checksum/RSS engines | `03_offload/` |
| `[MAC]` | ethernet MAC sublayer (preamble, FCS, IPG) | `03_mac/` |
| (borrows) `[DMA]` | descriptor ring shared with host | `_dma_ring/` |

## Cross-cutting refs

- `[PCIE]` / `_dmi` (host-side bus producing TLPs).
- `[PHY]` (sibling `02_phy/`) — bytes flow from `[MAC]` into `[PHY]` over xMII (GMII at 1G).
- `[SKB]`, `[QDISC]` (kernel `[NETSTACK]`).
- `[DMA]` (`levels/.../01_os/_dma/`) — full mechanism for ring-based RAM↔NIC traffic.
- TIME_AXIS rows `01_network/02_nic`, `02_nic/03_offload`, `02_nic/03_mac`, `02_nic/_dma_ring`.
