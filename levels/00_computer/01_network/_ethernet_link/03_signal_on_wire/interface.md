# interface — 00_computer/01_network/_ethernet_link/03_signal_on_wire

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| (none — analog view) | this level emits visualization data only; no upward `[SYM]` | — |
| bit-edge | one rising/falling differential edge propagating along the pair | edge launched at the LEFT termination |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none) | leaf — physics, atomic for this repo | — |

## Cross-cutting refs

- Sibling `03_frame_bytes/` — same wire, byte-level view above.
- `[AFE]` (`02_phy/03_line_driver/`) — drives the LEFT termination of this view.
- Cross-link to `_pcie/02_lane/` (same kind of differential analog story, different speed).
- `08_electrons` (foundational) — same electron drift idea at the transistor level.
- TIME_AXIS row `_ethernet_link/03_signal_on_wire`.
