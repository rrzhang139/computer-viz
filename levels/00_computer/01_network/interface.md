# interface — 00_computer/01_network

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| TX-completion | one frame's bytes have left the wire (FCS streamed out by `[MAC]`) | `[MAC]` end-of-frame strobe |
| RX-arrival | a frame has been DMA'd into a kernel-posted RX buffer | DMA descriptor write-back complete + MSI-X raised |
| link-state | up/down + link speed (1G assumed) | autoneg result latched in `[PHY]` |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[NIC]` | controller chip: rings, doorbells, offloads, MAC | `02_nic/` |
| `[PHY]` | physical-layer chip: PCS + AFE | `02_phy/` |
| `[FRAME]` | on-wire byte sequence | `_ethernet_link/03_frame_bytes/` (via `_ethernet_link/`) |

## Cross-cutting refs

- `[PCIE]` (`00_computer/_pcie/`) or `_dmi` — host bus to the NIC.
- `[NETSTACK]`, `[QDISC]`, `[SKB]` (kernel side) — supply TX skbuffs and consume RX skbuffs.
- `[DMA]` (`levels/.../01_os/_dma/`) — descriptor ring sits in host RAM.
- `_napi` — RX softirq that drains the ring on MSI-X.
- TIME_AXIS rows `01_network/02_nic`, `02_nic/_dma_ring`, `01_network/02_phy`, `_ethernet_link`.
