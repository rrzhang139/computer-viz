# interface — 00_computer/01_disk/02_ssd_controller/03_gc

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[GC]` | the background block-reclaim engine inside `[SSDCTRL]` | controller boot |
| `gc.victim_chosen` | a block has been picked for reclaim | greedy-selector pass completes |
| `gc.migration` | a valid page is being copied to a new block | per-page copy command issued |
| `gc.erase_issued` | an empty block is being erased | `tBERS` erase pulse begins on NAND |
| `gc.block_free` | block returned to FTL's free-block pool | erase complete |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| _none_ | leaf level — no child folders | — |

## Cross-cutting refs

- `[FTL]` (sibling `03_ftl/`) — supplies stale-page counts, receives migrated-LBA new addresses + freed blocks
- `[NAND]` (`02_nand_die/`) — target of the erase + page-copy commands; block-level erase is the unit GC operates on
- `[ECC]` (sibling `03_ecc/`) — every migrated page is re-ECC'd on the way out
- `[SSDCTRL]` (parent) — schedules GC against host I/O so user-visible latency stays bounded
