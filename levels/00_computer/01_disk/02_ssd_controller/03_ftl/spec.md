# spec — 00_computer/01_disk/02_ssd_controller/03_ftl

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

NAND can be programmed but not overwritten — to update a 4 KB record you cannot rewrite its old physical page; you must write a new page elsewhere and abandon the old one. Worse, individual cells wear out, so writes must be spread evenly across the device or some block becomes the sacrificial victim and bricks the drive. `[FTL]` is the layer of indirection that solves both problems at once: it remaps every host LBA to whatever physical page the controller picked this moment, transparently, so the host sees a stable LBA space while the controller writes wherever wear and free-block availability dictate. Remove it and either pages can never be updated or the drive dies in days.

## ROLE
Maintain the LBA → physical-page map; for every write, allocate a fresh page and update the map; expose the map for `[GC]` to walk; spread wear across blocks (wear leveling).

## MADE OF
1 mapping-table data structure (page-mapped, ~1 GB-of-DRAM-per-1 TB-of-NAND), 1 write-pointer / open-block selector, 1 wear-level counter array (one P/E count per block), 1 lookup pipeline. Implemented as a firmware module on the `[SSDCTRL]` ARM cores backed by the controller's DRAM cache.

## INPUTS
- LEFT (data): incoming LBA + opcode (read/write) from the NVMe parser
- TOP (control): GC requests (which LBAs were valid in the block being reclaimed?), wear-leveling triggers, mapping-table flush events

## OUTPUTS
- RIGHT (data): physical address tuple `(channel, die, plane, block, page)` for the channel scheduler

## SYMBOL
`[FTL]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row: `03_ftl` (1 anim sec ⇒ 1 µs)
- the indirection is the whole point: read = lookup; write = allocate new page + update map + invalidate old

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
