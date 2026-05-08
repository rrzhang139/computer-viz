# spec — 00_computer/01_disk/02_nand_die

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The `[NAND]` die is where bits actually live as physical charge — the bottom of the storage stack, the place data enters silicon and stays put after power is removed. Everything above (`[FTL]`, `[GC]`, `[ECC]`, `[SSDCTRL]`, `[DISK]`) exists to make this die's brutal physical constraints invisible to the host: pages program slowly, blocks erase very slowly, and reads are fast but get noisier as cells age. The die's geometry — multiple planes, blocks of pages — is also what enables the parallelism that gives an SSD its bandwidth: the controller can hit different planes of different dies simultaneously across its channels.

## ROLE
The flash die: an array of programmable, block-erasable pages organized into planes, addressed and operated on via an ONFI/Toggle interface from the channel.

## MADE OF
2–4 planes side by side, each plane a stack of ~1000–4000 blocks, each block a grid of ~512–1000 pages, each page = 16 KB of `[NCELL]`s + spare area for `[ECC]` parity. Plus a page register / sense-amp row at the bottom of each plane (the staging buffer for ONFI bursts).

## INPUTS
- LEFT (data): page-program data bytes from `[FCH]`
- TOP (control): ONFI command + address bytes (READ, PROGRAM, ERASE, with target plane/block/page), CE# / CLE / ALE / RE# / WE# strobes

## OUTPUTS
- RIGHT (data): page-read data bytes back to `[FCH]`; status register reflecting busy/ready, fail bit, and read-pass thresholds

## SYMBOL
`[NAND]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row: `02_nand_die` (1 anim sec ⇒ 50 µs; tR ~50 µs, tPROG ~500 µs, tBERS ~5 ms)
- the read/program/erase asymmetry lives here in the timing, surface it visually
- block, not page, is the erase unit — call this out explicitly

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
