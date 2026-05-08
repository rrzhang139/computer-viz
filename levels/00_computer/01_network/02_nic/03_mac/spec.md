# spec — 00_computer/01_network/02_nic/03_mac

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The MAC sublayer is where bytes-in-NIC-FIFO become a *legal ethernet frame*: bracketed by a 7-byte preamble + 1-byte SFD, terminated by a 32-bit FCS, separated from the next frame by a 12-byte interpacket gap. These framing rules are what let a receiver clock-recover, find a frame boundary, validate it, and reject corrupt data — without `[MAC]` the wire has no edges and a long run of identical bits would never re-sync. Removing this level erases the difference between "raw byte stream" and "frame", which is exactly the abstraction at which an OS net-stack stops and the wire begins.

## ROLE
On TX: prepend preamble + SFD, stream the (dst, src, ethertype, payload) into `[PHY]`, compute and append FCS, then enforce IPG. On RX: detect SFD, strip preamble, validate FCS over (dst..payload), drop bad frames or pass good ones to `[OFFLOAD]`.

## MADE OF
1 preamble/SFD generator + 1 byte-aligned framer + 1 CRC-32 (FCS) engine (LFSR over the IEEE 802.3 polynomial) + 1 IPG counter + 1 SFD detector. Combinational + small register state, clocked at the GMII byte rate (125 MHz at 1G).

## INPUTS
LEFT (data): on TX, post-offload byte stream from `[OFFLOAD]`; on RX, byte stream from `[PHY]` (xMII bus). TOP (control): MAC-enable, full-duplex bit, jumbo-MTU enable, promiscuous bit (drop non-matching dst MAC or accept all).

## OUTPUTS
RIGHT: on TX, a properly framed byte stream (preamble..FCS) handed to `[PHY]` over xMII; on RX, the validated payload byte stream (or a dropped-frame counter increment) into `[OFFLOAD]`. TIME_AXIS row `02_nic/03_mac` (1 anim sec ⇒ 8 ns, ≈ one byte at 1G).

## SYMBOL
`[MAC]` (registered in GLOSSARY).

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- This is the *hardware-side* MAC. The kernel-side ethernet L2 logic uses the distinct symbol `[L2ETH]` to avoid confusion with the cache `[L2]`.
- Demo: 1G full-duplex, 1500-byte MTU, 12-byte IPG.
