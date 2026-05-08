# spec — 00_computer/01_disk/_flash_channel

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The `[SSDCTRL]` is fast; a single `[NAND]` die is slow. The way an SSD turns slow flash into fast bandwidth is parallelism — many dies, hit at once. `[FCH]` is one such parallel lane: an ONFI/Toggle-mode bus connecting the controller to a row of NAND dies (typically 2–8 dies sharing a channel via chip-enable lines). Each channel is independent and can be driven at ~800 MT/s, so an 8-channel drive does ~6.4 GT/s aggregate — that is where NVMe SSD bandwidth comes from. Without this connector layer the controller would be talking to one die at a time and the drive would crawl.

## ROLE
A point-to-multipoint synchronous bus from the controller to a row of NAND dies, carrying ONFI command/address/data with chip-enable steering.

## MADE OF
- Signals/protocol: ONFI (or Samsung Toggle) — `CE0..CE7#` chip-enables, `CLE` command-latch, `ALE` address-latch, `WE#`/`RE#` write/read strobes, `DQ[0..7]` shared bidirectional data bus, `DQS` data strobe, `R/B#` ready/busy, `WP#` write-protect.
- Physical medium: short PCB traces between the controller die's pad ring and the NAND packages on the M.2 PCB; ~mm distances; impedance-controlled but not high-speed serial — synchronous DDR-style 8-bit bus.
- Topology: 1 controller channel ↔ N (typically 2–8) NAND dies sharing the bus, addressed by chip-enable.

## INPUTS
- LEFT (data): write payload bytes from `[ECC]` codeword bus, addresses from `[FTL]`
- TOP (control): controller channel scheduler (which die's CE# to assert, command opcode), `R/B#` from dies feeding back

## OUTPUTS
- RIGHT (data): page-program data into the addressed NAND's page register; on read, page-read bytes back to controller

## SYMBOL
`[FCH]`

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder `01_disk/`
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row: `_flash_channel` (1 anim sec ⇒ 1 µs; one ONFI burst at ~800 MT/s)
- per-die latencies (tR/tPROG/tBERS) are charged to `[NAND]`, not to the channel; the channel itself is fast and bursts at line rate when the die is ready

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder
- spatial invariants apply (see /INVARIANTS.md)
