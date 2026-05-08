# spec — 00_computer/01_ram/_dram_bus

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[MEMCTRL]` and `[RAM]` cannot talk through the air — they need a physical channel that delivers commands at low latency and 64+ bits of data per cycle at multi-GHz rates. `_dram_bus` is that channel: a bundle of impedance-controlled motherboard traces carrying DDR5's separated **command/address bus** (CA), **data bus** (DQ + DQS strobes), **clock** (CK), and **clock-enable / chip-selects** (CKE, CS#). Splitting CA from DQ is what lets DDR5 hit ~6.4 GT/s per pin without the tight bus-turnaround penalty of older DDR generations: while DQ is busy streaming a burst, the controller can already be issuing the next command on CA. Without this physical+protocol bundle, the gap between the on-chip world (~1 ns) and DRAM internals (~14 ns row activate) would have no way to be crossed at GB/s.

## ROLE
The DDR5 channel — the multi-wire bus that carries every command and every byte between `[MEMCTRL]` and a `[RAM]` channel of DIMMs.

## MADE OF
Signals: CA (command/address, including bank-group + bank-address + row/col), DQ[0..63] (+ DQS differential strobes per byte lane), CK (differential clock), CKE (clock enable), CS# (chip-select per rank), ODT (on-die termination control). Physical: ~50–80 controlled-impedance motherboard traces, length-matched, with on-die and on-DIMM termination, routed point-to-point per channel.

## INPUTS
- LEFT (data, on writes): DQ write data driven by `[MEMCTRL]` → DIMM.
- TOP (control): CA, CK, CKE, CS#, ODT — driven by `[MEMCTRL]`.

## OUTPUTS
- RIGHT (data, on reads): DQ read data driven by the selected `[RANK]` → `[MEMCTRL]`, framed by DQS strobes.

## SYMBOL
None — connector folder, owns a relationship not an entity. (Per GLOSSARY.md → "Connectors with no [SYM] of their own".)

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder
- spatial invariants apply (see /INVARIANTS.md)
- ~6.4 GT/s per DQ pin in DDR5; 64-bit data ⇒ ~51 GB/s peak per channel
- bidirectional DQ; CA is unidirectional (controller → DIMM)
