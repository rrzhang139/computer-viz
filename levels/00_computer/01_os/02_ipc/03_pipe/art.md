# art — 00_computer/01_os/02_ipc/03_pipe

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. A pipe is a ring buffer — a canonical visualization candidate for a glowing circular slot array.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Center: a circular ring of 16 slots (matching default `pipe_buffer` count) drawn as 3D-tinted "pages," each ~4 KB token. Slot color encodes state: empty (passive slate), partial (gradient blue), full (saturated `--color-data`).
- LEFT: a "writer" porthole; bytes drawn as small particle clusters arrive from the writer `[THREAD]`'s user buffer (faint outline of user memory at far left), enter via `write()` syscall arrow (`--color-control` orange band on top), and dock into the next empty slot (head pointer).
- RIGHT: a "reader" porthole; particles depart toward the reader `[THREAD]`'s user buffer; tail pointer advances.
- Two glowing pointer marks: HEAD (writer) and TAIL (reader), drawn as bright chevrons riding the ring perimeter; the *gap* between them is the available capacity, and visually narrows when the ring is full.
- BACKGROUND: a kernel halo separating the userland boundaries on left/right — emphasizes that data is COPIED into kernel pages, not zero-copy.
- Block animations: when the ring fills, a translucent stop-glyph appears on the writer port and the writer thread's stack (rendered faintly) gains a "BLOCKED on write" pill; symmetrically for empty + reader.

## Reasoning

The ring-buffer + head/tail-pointer + blocking semantics are the entire mechanism. Tier 3 with circular layout makes the wrap-around obvious; particle flow makes the byte-stream intuition tangible; the visible kernel-halo copy step contrasts directly with `[SHM]`'s zero-copy slab.
