# interface — 00_computer/01_disk/_nvme_link

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `link.up` | NVMe link trained, controller exposes admin queue | PCIe link-up + NVMe CC.EN handshake |
| `link.doorbell_rung` | host wrote SQ tail doorbell, drive will fetch | MMIO write to doorbell BAR |
| `link.payload_dma` | drive issues PCIe TLP read/write to host RAM for command data | first TLP of a transfer |
| `link.cqe_posted` | drive wrote completion entry to CQ + raised MSI-X | MSI-X message TLP |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[QP]` | one NVMe submission/completion queue pair in host RAM | `02_queue_pair/` |

## Cross-cutting refs

- parent: `01_disk/` (owns this connector, places it between host CPU and `[SSDCTRL]`)
- `[_pcie]` (`levels/00_computer/_pcie/`) — physical transport this rides on; provides `[LANE]` and `[TLP]`
- `[BLOCKQ]` / `[DRV]` (kernel) — produces SQEs and rings doorbells from the host side
- `[DMA]` (`levels/.../01_os/_dma/`) — controller side initiates DMA TLPs over `[_pcie]`
- `[IRQ]` (`levels/.../01_os/_interrupt/`) — MSI-X completion interrupt path
- `[SSDCTRL]` (`02_ssd_controller/`) — drive side terminus of this link
- contrast with `[FCH]` (`_flash_channel/`) — `[_nvme_link]` is host-facing; `[FCH]` is device-internal
