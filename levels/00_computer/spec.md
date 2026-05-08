# spec — 00_computer

> Phase 1. Level agent owns this file. **ROOT level** — no parent, no UP-emitted symbols.

## Motivation (REQUIRED — one paragraph, no diagrams)

This level exists because a learner who clicks "show me how a computer works" has no useful answer until they see *the whole physical thing they already know* — a desktop tower with a board, a chip, sticks of memory, an SSD, a network card — and understand that everything else in this visualization lives **inside that single case**. Without a root view, every lower diagram is decontextualized: the user sees an `[ALU]` and asks "where is that?" and there is no answer. Remove this level and the entire zoom hierarchy loses its anchor; the user can never zoom *out* to safety. `00_computer` is therefore the navigation entrypoint and the one node guaranteed to be visible when the page first loads. It is also where we make the implicit promise of the whole project explicit: every layer below is a recursive zoom into one of the parts you can see here.

## ROLE
The whole personal computer as a single physical artifact. A bird's-eye photograph of an open ATX desktop with the major components labeled and clickable. Acts as the navigation entrypoint and the outer frame for every zoom path in the visualization.

## MADE OF
A modern x86 desktop chassis containing: 1 `[CHIP]` (CPU socket), 1+ `[RAM]` modules (DDR5 DIMMs), 1 `[DISK]` (NVMe SSD), 1 `[NIC]` + 1 `[PHY]` (network card pair, grouped as `01_network`), 1 logical `[OS]` (no silicon — runs on `[CHIP]`), 1 `[BOOT]` chain (firmware path; logical, runs on `[CHIP]` at power-on), and the on-board interconnects `[PCIE]` (CPU↔NVMe/peripherals) and `_dmi` (CPU↔chipset). Note: the demo ISA is RV32I, but the case-photo and motherboard topology are a generic x86 ATX desktop — this is intentional, the user recognizes the form factor.

## INPUTS
- **LEFT (data)**: external user/IO at the case boundary — keyboard/mouse over USB, network frames arriving at the `[PHY]` jack, files already resident on `[DISK]`.
- **TOP (control)**: AC power-on signal that triggers the `[BOOT]` chain (the only "wake the machine" signal at this scope).

## OUTPUTS
- **RIGHT**: pixels to a display, packets out the `[PHY]` jack, written blocks on `[DISK]`. At this level we abstract all output as "the program produced visible effects."

## SYMBOL
None — `00_computer` is the root and is never referenced by a higher level. Higher-level concepts (data center, cluster) are out of scope for V1.

## Notes
- ROOT level: no parent, no UP-emitted symbols, but every other top-level child is referenced from here.
- Tier 1 (photographic): see `art.md`. Default render is a real ATX-build photo with SVG hotspot overlays on each component; the execution-pointer manifests as a glowing dot on the `[CHIP]` socket, with secondary pulses on `[RAM]` (memory ops) and `[DISK]` (I/O) per `EXECUTION_SCHEMA.md`.
- Time scale: `1 anim sec ⇒ 5 instr` (TIME_AXIS row `00_computer`) — at this height we are watching whole instructions tick by, not cycles.
- Spatial invariants apply (see /INVARIANTS.md): even on a photo, the hotspot wiring follows LEFT=in / RIGHT=out / TOP=control / BOTTOM=power.
- Out of scope at this level: GPU internals (visible as a peripheral card, not drilled), multi-socket NUMA, real OS scheduling decisions.
