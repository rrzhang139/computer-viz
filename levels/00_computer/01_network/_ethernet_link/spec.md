# spec — 00_computer/01_network/_ethernet_link

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The ethernet cable is the *one place where the computer ends*. Everything else — `[CHIP]`, `[NIC]`, `[PHY]` — is silicon and PCB; the cable is 8 wires of solid copper, twisted in 4 pairs, terminating at a peer machine. The user must see this connector explicitly because it is where two clock domains meet (each end has its own oscillator), where the propagation delay can be measured (~5 ns/m), and where the actual `[FRAME]` bytes are observable on a 'scope. Removing `_ethernet_link` removes the *only* level that lets the user point at "this is the boundary of *this* computer".

## ROLE
Carry differential analog signals between the local `[PHY]` and a peer machine's PHY, on 4 twisted pairs, simultaneously in both directions (full-duplex via hybrid).

## MADE OF
8 solid-copper conductors arranged as 4 twisted pairs (Cat-5e/6 cable), 2 RJ45 connectors with magnetics modules at each end. Differential 100 Ω characteristic impedance per pair. Lengths up to 100 m, propagation ~0.66c → ~5 ns/m.

## INPUTS
LEFT (data): on each pair, differential analog from `[AFE]` of the local PHY. (RIGHT-ward delivery to the peer.) TOP (control): none — it is a passive medium; cable plant is purely physical.

## OUTPUTS
RIGHT: the same differential signal arriving at the peer's PHY, attenuated and dispersed by the cable; conversely, the peer's signal arriving back at the local PHY. TIME_AXIS row `_ethernet_link` (1 anim sec ⇒ 5 ns, ≈ 1 m of copper at 0.66c).

## SYMBOL
None — connector. Children carry `[FRAME]` (logical bytes-on-wire) and the analog signal-on-wire view (no symbol, Tier-2).

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder
- spatial invariants apply (see /INVARIANTS.md)
- Demo: 1 m of Cat-6 between two NICs (so propagation delay is one anim-second). Real plant goes to 100 m.
