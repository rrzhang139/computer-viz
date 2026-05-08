# interface — 00_computer/01_disk/_nvme_link/02_queue_pair

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[QP]` | one NVMe submission/completion queue pair in host RAM | queue create admin command succeeds |
| `qp.sqe_enqueued` | driver wrote a 64 B SQE at SQ tail | host memory write to SQ tail slot |
| `qp.doorbell` | driver wrote new SQ tail value to MMIO doorbell | MMIO TLP arrives at controller |
| `qp.sqe_fetched` | drive DMA-read the SQE | controller advances internal SQ head |
| `qp.cqe_posted` | drive wrote 16 B CQE at CQ tail (with toggled phase tag) | DMA write completes |
| `qp.msix_raised` | drive raised the queue's MSI-X vector | interrupt-message TLP issued |
| `qp.cq_head_advanced` | host consumed CQEs and acked via CQ-head doorbell | MMIO TLP arrives |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| _none_ | leaf level — no child folders in V1 | — |

## Cross-cutting refs

- parent: `_nvme_link/` (this is the queue-pair sub-level of the NVMe link connector)
- `[BLOCKQ]` (`levels/.../01_os/02_block_layer/`) — kernel's bio queue feeds SQEs into this QP
- `[DRV]` (`levels/.../01_os/02_driver/`) — NVMe driver owns SQ-tail / CQ-head pointers
- `[DMA]` (`levels/.../01_os/_dma/`) — drive's DMA reads of SQEs and writes of CQEs are the underlying bus operations
- `[IRQ]` / MSI-X (`levels/.../01_os/_interrupt/`) — completion path uses the per-QP MSI-X vector
- `[SSDCTRL]` (`02_ssd_controller/`) — the device side of this QP
- `[TLP]` (`levels/.../_pcie/02_tlp/`, when populated) — every transition above lands as one or more TLPs
