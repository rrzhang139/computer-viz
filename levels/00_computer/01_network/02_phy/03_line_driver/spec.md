# spec — 00_computer/01_network/02_phy/03_line_driver

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The analog front end is where digital symbols become *real voltage waveforms* — and where 100 m of lossy twisted pair stops being a perfect wire. This block answers questions the rest of the stack waves away: how does one pair carry TX and RX simultaneously (a hybrid / duplexer subtracts your own echo), how does a far receiver still find an eye opening through 100 m of attenuation (transmit pre-emphasis + receive equalization + adaptive DFE), and what's the noise floor (line-driver swing chosen against the cable's crosstalk budget). Without `[AFE]` the PHY's digital side has nothing to drive: this is the "engineering pays the bills" layer that makes 1000BASE-T over commodity copper actually work.

## ROLE
TX: convert PCS symbols to differential analog voltage on a twisted pair, with controlled rise/fall, pre-emphasis, and proper line termination. RX: amplify the incoming differential signal, equalize it, run an ADC + slicer, recover the clock, and emit symbols upward. Hybrid block separates incoming RX from outgoing TX on the same pair.

## MADE OF
1 line driver (current-steering DAC into 100 Ω differential termination) + 1 hybrid/duplexer (subtracts TX echo from RX) + 1 receive amplifier + 1 equalizer (FFE) + 1 decision-feedback equalizer (DFE) + 1 ADC (or slicer) + 1 CDR/PLL. All analog or mixed-signal, sitting on the analog half of the PHY die.

## INPUTS
LEFT (data): on TX, PCS coded symbols from `[PCS]`; on RX, raw differential analog from `_ethernet_link`. TOP (control): EQ tap weights, line-driver swing, AGC level, autoneg pulses.

## OUTPUTS
RIGHT: on TX, differential analog onto each twisted pair of `_ethernet_link` (4 pairs at 1G, 2 at 100M); on RX, recovered symbols toward `[PCS]`. UP: link-quality and EQ-converged flags. TIME_AXIS row `02_phy/03_line_driver` (1 anim sec ⇒ 100 ps, ≈ one rise/fall edge).

## SYMBOL
`[AFE]` (registered in GLOSSARY).

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- Demo: 1000BASE-T 4-pair hybrid full duplex; the analog story collapses nicely to one pair for the visualization.
