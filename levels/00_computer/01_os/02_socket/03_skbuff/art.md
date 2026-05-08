# art — 00_computer/01_os/02_socket/03_skbuff

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. The skb is a kernel struct; only a richly stylized SVG can show "metadata + linear data + frag list + header pointers" simultaneously.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Center: an elongated capsule rendered as a layered packet header diagram with depth — the canonical "metadata band on top, data area below."
  - TOP band: small struct-fields glyphs for `users`, `priority`, `queue_mapping`, `hash` — drawn as lozenges with `--color-control` (orange) accents.
  - HEADER strip: three labeled segments left → right corresponding to MAC / IP / TCP, each with a tiny pointer chevron tying to a `mac_header` / `network_header` / `transport_header` arrow above.
  - DATA strip: a long bright ribbon in `--color-data` (blue) representing the linear payload.
  - FRAGS region (right): 1..N small page-glyphs hanging off the linear region, connected by a stitch line — represents zero-copy `skb_frag_t` chain.
- LEFT: an alloc port with `alloc_skb` glyph; particles spawning the capsule; refcount badge on top-right of capsule.
- RIGHT: a transit arrow toward whichever consumer is active (TCP / IP / NIC), labeled in symbolic overlay.
- Clone animation (when `skb_clone`): a duplicate ghost capsule slides out, sharing the data strip (drawn as a translucent overlap with a thin "shared data" tether line).
- TOP control band: rare actions — push (header prepend), pull (header strip), trim, expand — drawn as small directional arrows on the data strip when triggered.

## Reasoning

The hardest skb idea to teach is "the data isn't moved at any layer; only the header pointers slide." Tier 3 carries that with header-pointer chevrons that visibly *slide along* a fixed data strip. The clone animation reveals shared backing without a memcpy — also impossible to convey in a flat box-and-arrow.
