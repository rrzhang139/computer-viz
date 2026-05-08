# interface — 00_computer/_pcie/02_lane

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[LANE]` | one TX+RX differential pair carrying 16 GT/s gen4 symbols | LTSSM L0 + per-lane CDR locked |
| lane-bit | one 128b/130b-decoded bit lifted to `[PCIE]` for TLP destriping | symbol decode + descrambler tick |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none) | leaf for Phase 1 — physical bit-level signal lives at the analog layer | — |

## Cross-cutting refs

- Parent: `_pcie` consumes `[LANE]` to assemble `[TLP]` stripes.
- Sibling: `01_network/02_phy/03_line_driver/` — a *different* differential pair, but the same electrical idea; cross-link in the knowledge graph.
- TIME_AXIS row `_pcie/02_lane` (1 anim sec ⇒ 60 ps).
