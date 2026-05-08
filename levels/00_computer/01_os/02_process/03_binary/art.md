# art — 00_computer/01_os/02_process/03_binary

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

Tier 3 stylized SVG — a horizontal "filmstrip" of ELF segments (`.text`, `.rodata`, `.data`, `.bss`) shown left-to-right, each as a textured panel (instruction grid for `.text`, hex bytes for `.data`, hatched/zero pattern for `.bss`). Above each panel: the `PT_LOAD` header summary (`vaddr`, `flags=RWX`). Arrows fan up into the parent process tower indicating which CODE/DATA region each lands in. A separate row shows attached `.so` strips with light separators. GOT/PLT visualized as small lookup nodes between strips with curved dotted links.

## Reasoning

ELF is structurally tabular (segments × addresses × flags) but spatially deserves more than a table — readers need to *see* `.text` filling CODE while `.bss` fills with zeros and `.so`s slot in adjacent. Tier 3 with textured panels and animated mapping arrows turns a static structure into the act of loading.
