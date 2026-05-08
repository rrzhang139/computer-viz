# interface — 00_computer/_dmi

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| (borrows) `[PCIE]` | DMI presents as a PCIe-style link to software; same enumeration | LTSSM L0 on the DMI port |
| (borrows) `[TLP]` | every chipset-bound transaction is a TLP | last byte handed to data link |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none) | no children at Phase 1 — DMI's internals reuse `_pcie/02_lane` and `_pcie/02_tlp` semantics | — |

## Cross-cutting refs

- `[CHIP]` (`00_computer/01_chip/`) — root-complex DMI port lives here.
- `[NIC]` (`00_computer/01_network/02_nic/`) — onboard 1G NIC is *typically* behind DMI in this demo; discrete 10/25G NICs sit on direct PCIe.
- `_pcie/` — same physical/link layer; cross-link in the knowledge graph.
- TIME_AXIS row `_dmi`.
