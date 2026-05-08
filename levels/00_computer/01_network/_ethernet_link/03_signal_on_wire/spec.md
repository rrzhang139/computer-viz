# spec — 00_computer/01_network/_ethernet_link/03_signal_on_wire

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

This is the lowest level the visualization reaches inside the network path: literal voltage on copper as a function of time, with electrons drifting through the conductor at ~1 mm/s drift velocity while the *signal* (a wavefront) propagates at ~0.66c. Without it the user is left believing "data moves through wires" without ever distinguishing slow electron drift from fast EM-field propagation, and never sees what a single bit *physically is* — a transient differential voltage of a few hundred mV across a twisted pair. Removing this level severs the link between abstract bits and physics.

## ROLE
Show the analog voltage waveform on a single twisted pair (and the electron-density picture inside the conductor) corresponding to one bit/symbol, including rise/fall, cable attenuation, and dispersion.

## MADE OF
2 conductors (one twisted pair) modelled as a transmission line: distributed L/C, characteristic impedance 100 Ω differential, propagation velocity ~0.66c. Differential voltage swing ~1 V peak-to-peak at the driver, attenuating with frequency and length. Electrons inside the copper at thermal+drift velocity.

## INPUTS
LEFT (data): voltage waveform asserted by `[AFE]` of the local `[PHY]` at the LEFT termination. TOP (control): none — passive medium.

## OUTPUTS
RIGHT: same waveform arriving at the RIGHT termination, attenuated and dispersed. Conversely RX from peer. TIME_AXIS row `_ethernet_link/03_signal_on_wire` (1 anim sec ⇒ 100 ps, ≈ one bit transition).

## SYMBOL
None — this is the analog view of an existing connector and has no logical symbol of its own (per CONNECTORS NOTE in agent brief). The byte/frame view next door (`03_frame_bytes`) carries `[FRAME]`.

## Notes
- this is a NODE level (visualization-only; no upward symbol)
- spatial invariants apply (see /INVARIANTS.md)
- Demo: 1G symbol rate, 1 m of Cat-6, single pair shown with second pair implicit.
