# art — 00_computer/01_os/02_netstack/03_ip

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. The IP layer is a routing-table lookup + a header prepend; pure software, but the routing-trie and packet-header are visually rich.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Center-LEFT: an `[SKB]` capsule arriving with a TCP header strip already on it (from `[TCP]`).
- Center: a vertical "IP slab" with two halves stacked:
  - TOP half: a stylized routing-trie (LPM) — branching tree of prefix nodes, with the path to the matching prefix lighting up in `--color-active` (hot pink) on each lookup. Glow propagates from root to leaf.
  - BOTTOM half: a header-builder showing the IP header fields as a 20-byte ribbon (Ver/IHL, ToS, Total Len, ID, Frag, TTL, Proto, Src IP, Dst IP, Checksum). On TX, fields populate left-to-right; TTL counter visibly decrements when packet is forwarded.
- Center-RIGHT: the capsule departs with a NEW IP header strip prepended (now: TCP + IP).
- TOP control band: routing-table update icons (add/del) and netfilter-hook lozenges (PREROUTING / OUTPUT / POSTROUTING) which pulse when an iptables/nftables rule fires.
- RX mirror: capsule arrives RIGHT-to-LEFT with full headers, IP slab strips off the IP header, dispatches by `protocol` to the matching sibling (TCP / UDP / ICMP icons; the active dispatch glows).
- A small "ARP request" pop-out animation when nexthop has no cache entry — beacon flies right toward `[L2ETH]`, awaits reply.

## Reasoning

The dual punchline at IP is "lookup → prepend." The trie is naturally a tree visualization; flat boxes would just say "lookup." Header-field accretion as a literal byte ribbon makes "what is an IP packet" concrete. TTL countdown across hops carries the loop-protection insight without prose.
