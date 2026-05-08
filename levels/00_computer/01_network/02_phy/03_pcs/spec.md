# spec — 00_computer/01_network/02_phy/03_pcs

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A long run of identical bits (e.g., 0x00 over and over) has no signal transitions and DC-couples a receiver into clock loss within microseconds. The PCS sublayer fixes this with line coding (4B/5B at 100M, 8b/10b at 1G GMII, 64b/66b at 10G+) and scrambling — guaranteeing transition density so the receiver can keep its CDR locked, and balancing 1s and 0s so DC offset stays within budget. Without `[PCS]` the wire would still *physically* carry voltages but the receiver would lose its clock and the link would die on payload patterns alone. This is the layer where "raw bits" become "encoded symbols".

## ROLE
TX: take MAC bytes and emit balanced, transition-rich coded symbols to the analog front end at the line symbol rate. RX: descramble, decode, detect comma/sync patterns, and lift recovered bytes back to `[MAC]`.

## MADE OF
1 line-coder (8b/10b LUT for 1G; 4D-PAM5 mapper for 1000BASE-T; 64b/66b coder for 10G), 1 scrambler (LFSR over a fixed polynomial), 1 sync/comma detector, 1 descrambler. Combinational + small registers, clocked at the symbol rate (125 MHz at 1G GMII, 156.25 MHz at 10G).

## INPUTS
LEFT (data): on TX, byte stream from `[MAC]` over xMII; on RX, recovered symbol stream from `[AFE]`. TOP (control): code-mode select (4B/5B vs 8b/10b vs 64b/66b — autoneg result), scrambler seed.

## OUTPUTS
RIGHT: on TX, symbol stream toward `[AFE]` (e.g. 5 PAM-5 symbols/byte for 1000BASE-T); on RX, recovered byte stream toward `[MAC]`. UP: sync-acquired flag. TIME_AXIS row `02_phy/03_pcs` (1 anim sec ⇒ 1 ns, ≈ one symbol at 125 MHz).

## SYMBOL
`[PCS]` (registered in GLOSSARY).

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- Demo: 1000BASE-T → 4D-PAM5 + scrambler. If the visualization wants simpler, fall back to 100BASE-TX (4B/5B + MLT-3 over 2 pairs).
