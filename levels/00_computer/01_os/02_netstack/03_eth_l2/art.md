# art — 00_computer/01_os/02_netstack/03_eth_l2

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. ARP-cache lookups + 14-byte ethernet header prepend — pure software with rich packet-byte structure to depict.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Center-LEFT: incoming TX `[SKB]` capsule arriving with TCP+IP header strips already accreted (carried over from `[IP]` slab).
- Center-LEFT-INSET: ARP cache rendered as a tidy two-column glowing grid (IP | MAC), with one row lighting up in `--color-active` when a lookup hits; misses trigger an ARP-request beacon flying out in `--color-control` (orange) and a STALE→REACHABLE state pulse on reply.
- Center: ethernet-header builder showing the literal 14 bytes as a colored byte-ribbon: dst MAC (6 B, gradient block), src MAC (6 B, gradient block), ethertype (2 B, narrow strip). On TX, the bytes pop into place left-to-right and the strip attaches to the front of the skb capsule.
- Center-RIGHT: capsule departs with full ETH+IP+TCP headers toward `[QDISC]`.
- TOP: VLAN tag glyph; lights up only when a 4-byte 802.1Q tag is being inserted/removed.
- RX mirror: capsule with full headers arrives RIGHT-to-LEFT, ethertype strip glows, dispatch fan-out icons (IPv4 / IPv6 / ARP) — the matching one lights and the capsule is launched leftward (toward `[IP]`).
- A small persistent annotation on the visual: "L2ETH (software) — distinct from `[L2]` cache" — to fight the symbol collision with the cache `[L2]`.

## Reasoning

The two ideas — ARP resolves IP→MAC, then a 14-byte header is prepended — are best taught with the literal byte-ribbon and a side-by-side cache lookup. The persistent disambiguation hint guards against the `[L2]` vs `[L2ETH]` confusion that flat diagrams would invite.
