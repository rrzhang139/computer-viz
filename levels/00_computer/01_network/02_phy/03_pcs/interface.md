# interface — 00_computer/01_network/02_phy/03_pcs

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[PCS]` | the line-coding/scrambling sublayer of the PHY | code-mode programmed + scrambler seeded |
| sync-acquired | CDR + comma detector locked, RX byte boundaries known | comma pattern matched |
| coded-symbol | one PCS symbol ready for `[AFE]` | symbol-clock tick |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none) | leaf for Phase 1 — symbols go DOWN to sibling `03_line_driver/` | — |

## Cross-cutting refs

- Sibling `03_line_driver/` (`[AFE]`) — receives coded symbols, supplies recovered ones.
- Parent `02_phy/` — owns the chip; this is its digital half.
- `[MAC]` (sibling NIC chip) — supplies/consumes bytes over xMII.
- TIME_AXIS row `02_phy/03_pcs`.
