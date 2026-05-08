# spec — 00_computer/01_disk/02_ssd_controller/03_gc

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

NAND can only be erased a whole block at a time, but writes happen one page at a time and `[FTL]` keeps remapping LBAs into fresh pages — so blocks accumulate a mix of valid and stale pages. Without intervention the drive runs out of fresh pages even though most "occupied" pages are dead data. `[GC]` is the daemon that walks the controller in the background, finds the most-stale block, copies its few remaining valid pages to a new block (with help from `[FTL]`), then issues an erase to reclaim the whole block. This is also the source of write-amplification (one host write may trigger several internal page copies) and of the "second-page" tail-latency spikes users blame on the drive.

## ROLE
Reclaim blocks: pick a victim block (most stale pages, balanced against wear), migrate any still-valid pages elsewhere, issue the block erase, return the empty block to FTL's free pool.

## MADE OF
1 victim-block selector (greedy on stale-page count, tie-broken by wear), 1 valid-page migration walker, 1 erase scheduler (queues `tBERS` ~5 ms erases without starving host I/O), 1 free-block pool. Implemented as a firmware loop on `[SSDCTRL]` running between host bursts.

## INPUTS
- LEFT (data): per-block stale/valid page counts derived from `[FTL]` invalidations
- TOP (control): trigger thresholds (free-block pool low watermark), idle/host-active state, wear-leveling hints

## OUTPUTS
- RIGHT (data): erase commands to NAND blocks via channel scheduler, valid-page copy commands, free-block availability signal back to FTL

## SYMBOL
`[GC]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row: `03_gc` (1 anim sec ⇒ 50 ms; one block erase ~5 ms)
- `[GC]` is the source of write-amplification: copies on top of host writes are visible here

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
