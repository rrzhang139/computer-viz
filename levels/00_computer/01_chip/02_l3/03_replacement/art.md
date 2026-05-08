# art — 00_computer/01_chip/02_l3/03_replacement

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

Custom rich SVG. A single LLC set rendered as a row of 16 ways; each way's age/RRIP bits shown as a small bar above the line (taller = older). On a hit, the winning way's bar drops to 0 and the others tick up. On a fill, the tallest bar (the victim) gets crossed out with a particle flying into `[VB]`. A side panel shows policy mode (LRU vs RRIP) and re-references count.

## Reasoning

Confirming Tier 3 (per INVARIANTS table). Replacement is a *policy*, not a region of silicon — there is no photogenic representation. The age/RRIP-bar visualization makes the policy legible in a way die-shots cannot, and the LRU vs RRIP toggle is exactly the kind of educational "see the policy choice" affordance Tier 3 enables.
