# interface — 00_computer/_pcie/02_tlp

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[TLP]` | one transaction-layer packet (header + payload + LCRC) | last byte handed to data-link layer |
| TLP-completion | completion TLP for a non-posted memory-read | matched to original request tag |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none) | leaf for Phase 1 — bytes go DOWN to `[LANE]`, not into a child |  — |

## Cross-cutting refs

- Sibling `02_lane/` — bytes are striped across lanes; one TLP touches multiple `[LANE]`s simultaneously.
- `[CHIP]` root complex — emits memory-read/write TLPs; cross-cut to `levels/00_computer/01_chip/`.
- `[NIC]` (`01_network/02_nic/`) — produces upstream-master TLPs for DMA writes (RX completion) and MSI-X.
- `[DMA]` (`levels/.../01_os/_dma/`) — descriptor-ring TLPs are *the* mechanism by which DMA happens.
- `_nvme_link` reuses `[TLP]` as its substrate.
- TIME_AXIS row `_pcie/02_tlp`.
