# art — 00_computer/01_os/_context_switch

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. A context switch is invisible silicon-wise — same `[CORE]`, same `[REG]` cells; what changes is *which thread's bytes occupy them*. Render it as a stylized swap animation between two register towers.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Three vertical "register towers" laid out left → center → right: PREV `[THREAD]`'s saved registers (left, dimming), the live `[CORE]` register file (center, glowing), NEXT `[THREAD]`'s saved registers (right, brightening).
- Center tower is depicted as a deep glass column with 32 horizontal slots — gradient `--color-storage` (purple) for register cells, with the currently-occupied bits shimmering in `--color-data` (blue).
- ANIMATION: a sequenced particle flow — first 32 dots stream center → left (saving prev), then a brief flash on the center tower (the moment of "no thread"), then 32 dots stream right → center (restoring next). Each dot represents one `sd` / `ld` register-store on the kernel stack.
- TOP: a control band showing the `csrw satp` (page-table swap) event as a discrete pulse — only visible when `ptSwap === true`. Otherwise the band is dim.
- A dotted-line overlay shows the kernel-stack pointer flipping from prev's stack to next's stack.
- BACKGROUND: a faint outline of the `[CORE]` die so the user remembers all this happens *inside one core* — the towers are not different cores, they are different software contexts on the same silicon.

## Reasoning

The deepest insight at this level is that the hardware is identical before and after — only the bits change. Tier 3 lets us animate the bits flowing in and out of the same `[REG]` cells; a flat box would erase the "same silicon, different bytes" punchline. Particles + gradients also let us depict the rare-but-expensive `[TLB]`-flush cost when `ptSwap` fires, which a plain diagram cannot.
