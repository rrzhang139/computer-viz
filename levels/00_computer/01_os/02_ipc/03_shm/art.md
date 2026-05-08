# art — 00_computer/01_os/02_ipc/03_shm

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. The whole story is "two virtual addresses → one physical page" — only a stylized depth visualization can show this overlap without lying.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Three vertical layers stacked (depth-back to depth-front):
  - BACK: a glowing `[RAM]` slab with a highlighted shared-page region (gradient `--color-storage` purple → `--color-data` blue with a hot-pink frame from `--color-active`).
  - MIDDLE: PROC A's address space tower (left), with a HEAP slab containing a "viewport hole" through which the back-layer shared region is visible at virtual address `vaA`.
  - MIDDLE-RIGHT: PROC B's address space tower (right), with its own HEAP slab and a viewport hole at virtual address `vaB`.
- Animated dotted lines descend from each viewport into the same physical page in the BACK layer — emphasizing one page, two views.
- Store animation: a small write-glyph emerges from PROC A's `[CORE]` icon at far-left, drops into PROC A's viewport, and *the SAME physical-page region brightens for both processes simultaneously* — no traversal between the two viewports, only a flash through the shared back-layer.
- TOP: setup band showing `shm_open` + `mmap` icons; ref-count badge on the back-layer page increments visibly when a third `[PROC]` attaches.
- Cache halo: faint outlines of each `[CORE]`'s `[L1]` cache around the proc towers, with a `[MESI]` snoop arc between them flashing on writes — explaining how coherence (not IPC code) keeps the visibility honest.

## Reasoning

Two separate processes seeing the same store *instantly* is non-obvious; flat boxes show "two boxes connected by an arrow" which lies. Tier 3 with depth layering and a "viewport hole" metaphor makes the page-table trick visible. The MESI snoop arc tells the truth about who actually does the work.
