# spec — 00_computer/01_network/02_phy

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The PHY is the chip that sits between digital framed bytes and analog voltages on copper — the only place in the entire computer where 1s and 0s become *physics*. Without `[PHY]` the user has no answer to "where does digital end?". The PHY does two non-trivial jobs: line-coding (`[PCS]`: balance the bit stream so DC-coupled receivers can clock-recover) and analog drive (`[AFE]`: shape the eye, equalize, full-duplex hybrid that lets one twisted pair do TX and RX simultaneously). Removing it means `[MAC]` would have to drive the wire directly, which is electrically impossible at any usable distance.

## ROLE
Convert TX bytes from `[MAC]` (over xMII at 125 MHz × 8 bits = 1 Gbit) into 4D-PAM5 / 8b/10b-coded analog symbols on the cable, and reverse it on RX with clock-data recovery, equalization, and echo cancellation.

## MADE OF
1 `[PCS]` (line-coding/scrambling) + 1 `[AFE]` (line driver, hybrid, equalizer, ADC for RX). On a typical 1G NIC the PHY is a small separate IC near the RJ45 jack (e.g., Marvell 88E1512, BCM5421); on integrated NICs it is a block on the same SoC die.

## INPUTS
LEFT (data): on TX, byte stream from `[MAC]` over xMII (GMII at 1G, RGMII for low-pin variants). TOP (control): autonegotiation parameters, MDIO/MDC management bus from `[NIC]`, link-up/link-down state machine.

## OUTPUTS
RIGHT: differential analog signal onto 4 twisted pairs of `_ethernet_link`; on RX, recovered byte stream lifted back to `[MAC]`. UP: link-up/link-down + speed/duplex result of autoneg. TIME_AXIS row `01_network/02_phy` (1 anim sec ⇒ 8 ns).

## SYMBOL
`[PHY]` (registered in GLOSSARY).

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- Demo assumes 1000BASE-T (1G over Cat-5e/6 with 4 pairs in 4D-PAM5); the simpler 100BASE-TX (4B/5B over 2 pairs) is a fallback if the visualization needs to halve the bit-rate.
