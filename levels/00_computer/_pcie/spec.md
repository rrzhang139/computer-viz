# spec — 00_computer/_pcie

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

PCIe is the modern point-to-point serial bus that replaced parallel PCI inside every computer; without it the CPU socket cannot reach the NIC, GPU, or NVMe drive sitting on the motherboard. The problem it solves is bandwidth-per-pin: parallel PCI hit a wall at ~1 Gbit/s shared across many devices because clock skew and crosstalk on a wide bus do not scale, while PCIe runs lanes as independent serial differential pairs that can be aggregated (×1, ×4, ×8, ×16) per-device. Remove `[PCIE]` and `[NIC]` / `[DISK]` have no path to `[CHIP]` — the peripherals are isolated silicon islands.

## ROLE
Carry encapsulated `[TLP]` packets between `[CHIP]` and a peripheral over an aggregated set of `[LANE]`s, full-duplex, packet-routed.

## MADE OF
1..16 `[LANE]`s in parallel + a transaction layer producing `[TLP]`s. Signals: differential pairs at gen4 ~16 GT/s per lane; medium: PCB traces (motherboard slot fingers + via stitching). Protocol: 3-layer (transaction / data-link / physical) with 128b/130b coding.

## INPUTS
LEFT (data): TLP descriptors from `[CHIP]` root complex (memory-read, memory-write, config, completion). TOP (control): link-training / power-state requests; LTSSM state from the device.

## OUTPUTS
RIGHT: serialized symbol stream onto each `[LANE]` toward the peripheral; in the reverse direction, deserialized TLPs lifted back up to root complex. TIME_AXIS row `_pcie` (1 anim sec ⇒ 1 ns, one symbol time at gen4).

## SYMBOL
`[PCIE]` (defined here, registered in GLOSSARY).

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder
- spatial invariants apply (see /INVARIANTS.md)
- Children: `02_lane` (one differential pair) and `02_tlp` (one packet); both zoom-ins on the same `[PCIE]` edge.
