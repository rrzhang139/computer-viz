# spec — 00_computer/01_network

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The network card is the computer's physical exit door for bytes — the only place where the linear, deterministic world of `[CORE]`+`[RAM]` becomes a duplexed copper or optical link to a foreign machine. Without this level the visualization stops at the kernel TCP stack, but the user cannot see *how* a TCP segment becomes voltages on a cable: where the OS hands off, what bus moves the bytes, what chip computes the FCS, what physical layer turns digital into analog. Remove `01_network` and `[NIC]`, `[PHY]`, `[FRAME]`, `[MAC]` are all rootless symbols.

## ROLE
Bridge `[CHIP]` ↔ outside world: take TX skbuffs from the kernel via `[PCIE]`, frame and DMA them onto the wire as ethernet frames, and reverse the path on RX up through interrupts and DMA descriptor rings.

## MADE OF
1 `[NIC]` controller chip + 1 `[PHY]` chip + 1 `_ethernet_link` (the cable) + 1 `_dma_ring` (host RAM ↔ NIC). All on a removable PCIe card or soldered onto the motherboard.

## INPUTS
LEFT (data): TX descriptors and packet buffers from the kernel `[NETSTACK]`, transferred via DMA over `[PCIE]`/DMI. TOP (control): MMIO doorbells (kick TX), interrupt mask, link-up state, `[OFFLOAD]` config (TSO on/off, RSS hash key).

## OUTPUTS
RIGHT: ethernet frames as voltage waveforms on the twisted-pair cable. UPward to the kernel: RX packet buffers DMA'd into pre-posted skbuffs, plus an MSI-X interrupt that wakes `_napi`. TIME_AXIS row `01_network/02_nic` (1 anim sec ⇒ 1 µs).

## SYMBOL
No top-level symbol of its own — children carry `[NIC]`, `[PHY]`, `[FRAME]`, `[MAC]`, `[PCS]`, `[AFE]`, `[OFFLOAD]`, `[DMA]`. The umbrella folder is the *card as a peripheral* visible at `00_computer` level.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- Demo assumes 1 Gbit ethernet (1000BASE-T, GMII, 8b/10b at PCS); link bandwidth chosen so one TLP carries one MTU-sized payload comfortably.
