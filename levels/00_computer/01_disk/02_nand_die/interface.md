# interface — 00_computer/01_disk/02_nand_die

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[NAND]` | one NAND flash die plugged into a channel | die power-on / chip-enable asserted |
| `nand.busy` | plane is executing a program/erase; cannot accept commands | tR/tPROG/tBERS in flight |
| `nand.read_done` | page register holds the requested page; ready for ONFI burst | tR elapsed |
| `nand.program_done` | page successfully programmed (verify pass) | tPROG elapsed, status bit clean |
| `nand.erase_done` | block erased to all-1s (verify pass) | tBERS elapsed, status bit clean |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[NCELL]` | one floating-gate flash cell — the actual bit-storage element | `03_nand_cell/` |

## Cross-cutting refs

- `[FCH]` (`_flash_channel/`) — physical bus the die sits on; ONFI command/data flows through it
- `[SSDCTRL]` (parent's parent) — issues the commands the die executes
- `[ECC]` (sibling-of-controller `02_ssd_controller/03_ecc/`) — wraps every page program/read, hides the die's raw bit-error rate
- `[FTL]` (`02_ssd_controller/03_ftl/`) — owns the (channel, die, plane, block, page) tuples that address this die
- `[GC]` (`02_ssd_controller/03_gc/`) — issues the block erases and page migrations
