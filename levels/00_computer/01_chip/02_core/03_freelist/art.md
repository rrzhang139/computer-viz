# art — 00_computer/01_chip/02_core/03_freelist

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

- Stylized SVG: a horizontal queue of small "tag chips" (each labeled p17, p33, p64, …) with a head pointer on the right (rename pulls), tail pointer on the left (retire pushes). When backend is busy the queue visibly drains; on retirement a chip slides back in from the left.
- Particles: tag chips animate as glowing tokens; rename "consumes" the head one, retire "deposits" a freshly-released one at the tail.
- Palette: storage purple chip body, control orange pop/push pointers from top, active pink for the chip currently being popped, data blue when in-flight.

## Reasoning

<!-- Why this tier fits this level. -->
The freelist's whole story is *queue depth as the cap on parallelism* — watch the queue drain when the core is fully busy, refill when it isn't. Tier 3 with chip-motion makes the limit visceral; a static photo cannot show occupancy.
