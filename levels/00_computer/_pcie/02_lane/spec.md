# spec — 00_computer/_pcie/02_lane

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The lane is the atomic unit of PCIe bandwidth: every link (×1, ×4, ×8, ×16) is just N copies of *this*. Without isolating a lane the user cannot see why differential signalling and per-lane clock recovery scale where parallel-bus skew did not — a lane is a self-contained TX and RX pair that recovers its own clock and resolves its own electrical idle. Remove `[LANE]` and `[PCIE]` is a black box: there is nothing to photograph and no reason gen4 ran at 16 GT/s while gen1 ran at 2.5.

## ROLE
Carry one stripe of a `[TLP]` as a stream of 128b/130b coded symbols over a TX differential pair while simultaneously receiving on an RX differential pair, with embedded clock recovered by the receiver.

## MADE OF
2 differential pairs (TX+, TX−; RX+, RX−) — 4 PCB traces total — plus a SerDes block at each end. Symbol time at gen4 ≈ 62.5 ps (unit interval). 128b/130b block coding adds a sync header so the CDR can lock without a forwarded clock.

## INPUTS
LEFT (data): a stripe of bits scheduled by the parent `[PCIE]` link layer. TOP (control): SerDes parameters (TX-equalization preset, RX-equalization request, electrical-idle, lane-polarity-invert) flowing in from LTSSM.

## OUTPUTS
RIGHT: 16 Gbit/s differential signal (TX) launched at the launchpad ball; received differential signal (RX) sampled at the SerDes input. Recovered serial bits feed back UP to `[PCIE]` for TLP reassembly. TIME_AXIS row `_pcie/02_lane` (1 anim sec ⇒ 60 ps, ~one UI per second).

## SYMBOL
`[LANE]` (registered in GLOSSARY → `levels/.../_pcie/02_lane/`).

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- 128b/130b assumed for gen3+; gen1/2 used 8b/10b but gen4 is the visualization target.
