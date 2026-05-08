# interface — 00_computer/01_disk/02_ssd_controller/03_ftl

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[FTL]` | the LBA→physical mapping engine inside `[SSDCTRL]` | controller boot / DRAM mapping table loaded |
| `ftl.lba_resolved` | LBA resolved to `(ch, die, plane, block, page)` | mapping-table lookup completes |
| `ftl.page_allocated` | a fresh physical page chosen for a write | open-block write-pointer advanced |
| `ftl.invalidate` | old page marked stale (input to GC's valid-page count) | overwrite/trim of an LBA |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| _none_ | leaf level — no child folders | — |

## Cross-cutting refs

- `[GC]` (sibling `03_gc/`) — reads FTL's stale-page set; calls back to FTL with a list of still-valid LBAs to remap
- `[ECC]` (sibling `03_ecc/`) — wraps the page address FTL produced; FTL is upstream
- `[NAND]` (`02_nand_die/`) — physical address tuple FTL produces lands here
- `[SSDCTRL]` (parent) — owns the FTL firmware module and DRAM cache for the table
