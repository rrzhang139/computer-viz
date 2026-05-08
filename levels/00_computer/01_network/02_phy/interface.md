# interface — 00_computer/01_network/02_phy

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[PHY]` | the physical-layer chip (PCS + AFE) | reset deasserted + autoneg complete |
| link-up | link is electrically alive at a known speed/duplex | autoneg result latched |
| recovered-byte | RX byte recovered from analog symbols | RX clock-data-recovery + descrambler tick |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[PCS]` | line-coding/scrambling sublayer | `03_pcs/` |
| `[AFE]` | analog front-end (line driver, hybrid, EQ) | `03_line_driver/` |

## Cross-cutting refs

- Sibling `02_nic/03_mac/` — exchanges TX/RX bytes over xMII (GMII at 1G).
- Connector `_ethernet_link/` — receives TX analog, supplies RX analog.
- `02_phy/03_pcs/` and `02_phy/03_line_driver/` (children).
- TIME_AXIS rows `01_network/02_phy`, `02_phy/03_pcs`, `02_phy/03_line_driver`.
