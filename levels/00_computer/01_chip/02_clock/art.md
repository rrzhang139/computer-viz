# art — 00_computer/01_chip/02_clock

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 1-photo
```

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

Die-crop showing the PLL block (a small distinctive analog island, often near the chip edge) plus an overlay of the clock-tree H-tree fanning out across the die. Source: same `[CHIP]` die photo with the PLL region tagged; AI-generated H-tree overlay if needed. Fallback prompt: "die-crop highlighting a PLL block and a balanced H-tree clock distribution net fanning out across a CPU die, photographic with a thin orange overlay marking the tree, hot-pink pulse on the active edge."

## Reasoning

Confirming Tier 1 (per INVARIANTS table). The PLL is a recognizable analog island and the clock-tree, while subtle, can be evoked over a real die-shot. Keeping it Tier 1 communicates "this is a real circuit on a real die." The animation is what carries the meaning: a pulse-wave radiating from the PLL outward through the tree on every clock edge, painting the ground truth that *this is what makes everything else tick*.
