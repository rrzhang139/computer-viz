# interface — 00_computer/01_network/_ethernet_link/03_frame_bytes

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[FRAME]` | one complete on-wire ethernet frame (preamble..FCS) | last byte of FCS observed on wire |
| frame-fcs-good | FCS recomputed at RX equals the on-wire FCS | comparator hit |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none) | leaf for Phase 1 — sub-byte view is the analog sibling `03_signal_on_wire/` | — |

## Cross-cutting refs

- Sibling `03_signal_on_wire/` — same wire, sub-bit zoom.
- `[MAC]` (`02_nic/03_mac/`) — produces these bytes on TX; validates them on RX.
- `[L2ETH]` (kernel `02_netstack/03_eth_l2/`) — software framing reference; same field layout minus preamble/SFD/FCS.
- TIME_AXIS row `_ethernet_link/03_frame_bytes`.
