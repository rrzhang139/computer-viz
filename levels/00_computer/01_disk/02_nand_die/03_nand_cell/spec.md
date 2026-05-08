# spec — 00_computer/01_disk/02_nand_die/03_nand_cell

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[NCELL]` is the literal bit. A floating-gate (or charge-trap) transistor with an oxide-isolated charge well: drop electrons into the well via Fowler-Nordheim tunneling and the cell's threshold voltage shifts; read the threshold and you read the bit. This is where every interesting flash phenomenon comes from — non-volatility (the tunnel oxide keeps the charge with no power), the block-erase asymmetry (you cannot remove charge from one cell at a time without damaging neighbors; you have to flush a whole block), and wear-out (each tunneling event nicks the oxide; after ~1k–10k P/E cycles for TLC the oxide leaks and the cell drifts). Strip the oxide, strip the value.

## ROLE
A single bit (or 2/3/4 bits via voltage banding for MLC/TLC/QLC) of non-volatile storage: a charge well that can be programmed, erased, and read by sensing threshold voltage.

## MADE OF
1 floating-gate (or charge-trap) MOSFET — control gate on top, floating gate / trap layer underneath, tunnel oxide between floating gate and channel, source/drain. Modern 3D NAND wraps these around a polysilicon pillar in a stack of ~100–200+ word-line layers.

## INPUTS
- LEFT (data, indirectly): bit-line voltage during program/read (drives charge into / sensed from the floating gate)
- TOP (control): word-line / control-gate voltage — the high-voltage program pulse, erase pulse, or read reference voltage

## OUTPUTS
- RIGHT (data, indirectly): on read, the cell either conducts or doesn't at the chosen reference voltage; that conducts/doesn't is sampled by the sense amp on the page register

## SYMBOL
`[NCELL]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row: `03_nand_cell` (1 anim sec ⇒ 100 µs; one program-pulse + verify cycle)
- SLC/MLC/TLC/QLC = 1/2/3/4 bits per cell, encoded as 2/4/8/16 voltage bands within the same charge window — this is why TLC/QLC have higher raw bit-error rates and need stronger `[ECC]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
