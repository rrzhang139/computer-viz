# spec — 00_computer/01_network/_ethernet_link/03_frame_bytes

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

This is the byte-exact, RFC-spelled view of an ethernet frame as it sits on the wire — the answer to "what would Wireshark show, with preamble". Every other level talks *about* frames; this level *is* the frame. Without it the user cannot connect the kernel's `[L2ETH]` framing, the `[MAC]`'s preamble/FCS work, and the analog `_ethernet_link` together; they remain three vague abstractions instead of one concrete byte sequence. Removing `[FRAME]` removes the only level that grounds "ethernet" in literal byte offsets.

## ROLE
Lay out a single ethernet frame as a fixed byte sequence — preamble (7 B, `0x55 0x55 0x55 0x55 0x55 0x55 0x55`) | SFD (1 B, `0xD5`) | dst MAC (6 B) | src MAC (6 B) | ethertype (2 B, e.g. `0x0800` for IPv4) | payload (46–1500 B) | FCS (4 B, CRC-32) — and serve as the on-wire reference for all upstream levels.

## MADE OF
1 frame = 14 + payload + 4 bytes (excluding preamble/SFD) = 64..1518 bytes total payload-bracketed; including preamble/SFD it is 72..1526 bytes on wire. Byte ordering is "first byte first" with bit-order LSB-first within a byte for ethernet.

## INPUTS
LEFT (data): byte stream produced by `[MAC]` and pushed through `[PHY]` onto the cable. TOP (control): none — the frame on wire is purely data; control belongs to the layer that produced it.

## OUTPUTS
RIGHT: arrival at the peer's PHY, where the same bytes are observed (modulo channel bit-errors corrected by FCS). Reverse direction symmetric. TIME_AXIS row `_ethernet_link/03_frame_bytes` (1 anim sec ⇒ 8 ns, ≈ one byte at 1G).

## SYMBOL
`[FRAME]` (registered in GLOSSARY → `levels/.../_ethernet_link/03_frame_bytes/`).

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- Demo: 1G, IPv4, no VLAN tag (no 802.1Q). Payload defaults to a TCP segment containing 32 ASCII bytes for clarity.
