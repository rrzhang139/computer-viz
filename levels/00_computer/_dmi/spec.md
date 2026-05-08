# spec — 00_computer/_dmi

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

DMI is the historical Intel `[CHIP]`↔chipset (PCH) link that exists because not every device on a motherboard sits directly on the CPU's PCIe lanes — slow peripherals (USB, SATA, audio, BMC, low-priority NICs) hang off a Platform Controller Hub. The DMI link is electrically a PCIe variant but logically a *funnel* from the chipset's many slow ports into a small number of CPU-facing lanes. Without it the user wonders "why does my onboard NIC route through the chipset and an NVMe drive doesn't" — DMI is the answer. Modern boards still ship it (often as DMI 4.0 ×8) even as fast peripherals migrate onto direct CPU PCIe.

## ROLE
Aggregate chipset-attached I/O traffic into a CPU-bound serial link, so the south bridge appears to software as just another `[PCIE]` endpoint behind the root complex.

## MADE OF
4–8 PCIe-class differential `[LANE]`s in current generations (DMI 4.0 ≈ PCIe gen4). Same physical and link layers as PCIe; transaction layer carries `[TLP]`s. Endpoints: CPU root-complex DMI port (LEFT) ↔ PCH DMI port (RIGHT).

## INPUTS
LEFT (data): TLPs from the CPU directed at chipset-side devices (USB controller, SATA AHCI, onboard 1G NIC). TOP (control): power-state coordination (CPU package C-states must keep DMI alive enough to wake on chipset events).

## OUTPUTS
RIGHT: TLPs to the chipset; in reverse direction, upstream TLPs (DMA writes, MSI-X) heading into RAM via the root complex. TIME_AXIS row `_dmi` (1 anim sec ⇒ 1 ns).

## SYMBOL
None — connectors with no entity of their own borrow `[PCIE]`/`[TLP]` symbols (see GLOSSARY → "Connectors with no `[SYM]`").

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder
- spatial invariants apply (see /INVARIANTS.md)
- Demo assumption: x86 desktop topology with PCH; on AMD/Apple Silicon the equivalent is the on-die fabric or IOD link, but the *role* is identical.
