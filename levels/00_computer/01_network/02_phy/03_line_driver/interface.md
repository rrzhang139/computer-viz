# interface — 00_computer/01_network/02_phy/03_line_driver

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[AFE]` | the analog front-end of the PHY (driver, hybrid, EQ, CDR) | analog bias settled, EQ converged |
| eye-open | RX eye diagram has a measurable open eye → link is electrically usable | EQ adaptation completes |
| recovered-symbol | one PCS symbol recovered from analog | CDR sample tick |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none) | leaf for Phase 1 — analog goes onto the wire (`_ethernet_link`) | — |

## Cross-cutting refs

- Sibling `03_pcs/` — supplies/consumes coded symbols.
- Connector `_ethernet_link/` — the cable on the RIGHT.
- `_ethernet_link/03_signal_on_wire/` — Tier-2 view of the very voltages this block drives.
- Cross-link to `_pcie/02_lane/` (the PCIe analog story, similar physical substrate).
- TIME_AXIS row `02_phy/03_line_driver`.
