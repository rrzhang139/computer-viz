# interface — 00_computer/01_disk

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[DISK]` | one NVMe SSD as a PCIe peripheral on the parent `00_computer` board | NVMe completion (CQE posted + MSI-X) |
| `disk.busy` | drive has un-acked SQEs in flight | first SQE doorbell write per command burst |
| `disk.lba_resolved` | LBA → physical NAND page mapping known | FTL lookup completes in `[SSDCTRL]` |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[SSDCTRL]` | the controller SoC that owns FTL/GC/ECC and the channels | `02_ssd_controller/` |
| `[NAND]` | one NAND flash die plugged into a flash channel | `02_nand_die/` |
| `[FCH]` | ONFI/Toggle command/address/data bus to a NAND die row | `_flash_channel/` |
| `[_nvme_link]` | NVMe-over-PCIe transport between host and controller | `_nvme_link/` |

## Cross-cutting refs

- `[_pcie]` (`levels/00_computer/_pcie/`) — physical PCIe lanes the NVMe transport rides on; `[_nvme_link]` references its `[TLP]` framing
- `[BLOCKQ]` (`levels/.../01_os/02_block_layer/`) — kernel-side producer of the NVMe SQEs that arrive here
- `[DRV]` (`levels/.../01_os/02_driver/`) — NVMe driver that writes the SQ doorbell
- `[DMA]` (`levels/.../01_os/_dma/`) — controller initiates DMA to host RAM for read payload + CQE post
- `[IRQ]` (`levels/.../01_os/_interrupt/`) — MSI-X interrupt to host on completion
