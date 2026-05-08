# interface — 00_computer/01_disk/02_ssd_controller

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[SSDCTRL]` | the flash-controller SoC inside `[DISK]` | drive power-on / NVMe link-up |
| `ctrl.cmd_accepted` | SQE fetched from host SQ and parsed | NVMe doorbell consumed |
| `ctrl.completion_posted` | CQE written to host CQ + MSI-X raised | end of command |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[FTL]` | LBA → physical-page mapping engine + write-stream remapper | `03_ftl/` |
| `[GC]` | background block-reclaim engine that compacts and erases | `03_gc/` |
| `[ECC]` | LDPC encode/decode wrapping every page program/read | `03_ecc/` |

## Cross-cutting refs

- `[_nvme_link]` (`levels/00_computer/01_disk/_nvme_link/`) — host-side bus this controller terminates
- `[NAND]` (`levels/.../02_nand_die/`) — the dies sitting on the other end of each `[FCH]` it drives
- `[FCH]` (`levels/.../_flash_channel/`) — channels owned by the controller; one per NAND row group
- `[BLOCKQ]` / `[DRV]` (kernel) — produces the SQEs the controller consumes
