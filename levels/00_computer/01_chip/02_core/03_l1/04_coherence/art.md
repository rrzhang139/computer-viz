# art — 00_computer/01_chip/02_core/03_l1/04_coherence

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

Custom rich SVG state diagram. Four nodes M/E/S/I arranged as a ring of glowing badges (Modified = hot-pink, Exclusive = data-blue, Shared = purple, Invalid = passive-slate). Edges labeled with the trigger (local-read, local-write, BusRd, BusRdX, Invalidate). The active state pulses; the most recent transition arrow runs a particle along it. A side panel lists "what this means for the program" (e.g. M = "you can write without telling anyone").

## Reasoning

Confirming Tier 3 (per INVARIANTS table). A coherence FSM has no photographic identity — it's a few hundred gates per line. The interesting content is the *graph of states and transitions*; that maps cleanly onto a labeled, animated state-diagram. Matching the canonical MESI diagram from textbooks lowers the cognitive load when the user already knows the protocol.
