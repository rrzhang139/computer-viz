# interface — 00_computer/01_network/_ethernet_link

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| (borrows) `[FRAME]` | a complete on-wire ethernet frame visible as a byte sequence | preamble..FCS observable on a tap |
| link-electrical | cable is plugged and within 100 m / quality budget | autoneg pulses sense the peer |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[FRAME]` | bytes laid out on wire (preamble | SFD | dst | src | ethertype | payload | FCS) | `03_frame_bytes/` |
| (none for analog) | the signal-on-wire view has no `[SYM]` of its own (Tier-2 visualization only) | `03_signal_on_wire/` |

## Cross-cutting refs

- Sibling chip `02_phy/` — drives this connector via `[AFE]`.
- `_ethernet_link/03_frame_bytes/` and `_ethernet_link/03_signal_on_wire/` (children — same edge, two zoom modes).
- `[MAC]` produced the bytes that show up here.
- TIME_AXIS rows `_ethernet_link`, `_ethernet_link/03_frame_bytes`, `_ethernet_link/03_signal_on_wire`.
