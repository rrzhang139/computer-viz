# interface — 00_computer/01_os/02_driver

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[DRV]` | one driver instance bound to a device | `probe()` returns |
| ISR registered | callback for `[IRQ]` | `request_irq` |
| ops table | published to subsystem | `register_*()` call |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none — leaf in V1) | | |

## Cross-cutting refs

- TIME_AXIS row: `02_driver` — native unit `doorbell`, 1 anim sec ⇒ 1 mmio doorbell.
- `01_os/_interrupt/` — invokes the registered ISR.
- `01_os/_dma/` — descriptor ring lives between driver and device.
- `01_os/02_block_layer/` (block drivers), `02_netstack/` (net drivers) — upstream subsystems.
- `_pcie/` — bus path many drivers traverse to reach their device.
