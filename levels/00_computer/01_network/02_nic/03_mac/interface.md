# interface — 00_computer/01_network/02_nic/03_mac

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[MAC]` | the MAC sublayer of the NIC (preamble/SFD/FCS/IPG) | MAC-enable bit set, link-up from `[PHY]` |
| frame-tx-done | last byte of FCS handed to `[PHY]` for transmission | end-of-FCS strobe |
| frame-rx-good | RX frame's FCS matched, payload delivered upward | FCS comparator equals zero |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none) | leaf for Phase 1 — bytes go DOWN to `[PHY]` (a sibling) over xMII | — |

## Cross-cutting refs

- Sibling `03_offload/` — supplies post-segmentation TX bytes, consumes validated RX bytes.
- Sibling chip `02_phy/` — receives MAC TX bytes over GMII at 125 MHz × 8 bits.
- `[FRAME]` (`_ethernet_link/03_frame_bytes/`) is the on-wire byte sequence this level produces; cross-cut.
- `[L2ETH]` (kernel side) frames headers in software; this level frames them again physically.
- TIME_AXIS row `02_nic/03_mac`.
