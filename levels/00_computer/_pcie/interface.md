# interface — 00_computer/_pcie

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[PCIE]` | one PCIe link (×1..×16, gen4 here) between `[CHIP]` root complex and a peripheral | link-up after LTSSM reaches L0 |
| TLP-completion | a memory-read / write completion TLP delivered back to root complex | last symbol of TLP received and LCRC-checked |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[LANE]` | one TX+RX differential pair carrying 128b/130b symbols at ~16 GT/s | `02_lane/` |
| `[TLP]` | one transaction-layer packet (header + payload + LCRC) striped across active lanes | `02_tlp/` |

## Cross-cutting refs

- `[CHIP]` (parent: `00_computer/01_chip/`) — root complex sits inside, drives TLPs LEFT→RIGHT.
- `[NIC]` (sibling: `00_computer/01_network/02_nic/`) — typical endpoint of this `[PCIE]`.
- `[DISK]` (sibling: `00_computer/01_disk/`) — alternate endpoint via NVMe; uses `_nvme_link` connector that itself layers on `[TLP]`.
- TIME_AXIS rows `_pcie`, `_pcie/02_lane`, `_pcie/02_tlp`.
