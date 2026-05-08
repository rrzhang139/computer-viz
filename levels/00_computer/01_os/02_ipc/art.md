# art — 00_computer/01_os/02_ipc

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. IPC primitives are pure software; render the parent view as a triptych of three glowing channels between two address-space columns.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Two address-space columns side by side: PROC A (left) and PROC B (right), each rendered as a tall translucent tower with the standard `[PROC]` regions (CODE / DATA / HEAP / STACK) as gradient-tinted slabs (`--color-storage` to `--color-data`).
- Three channels span between them, vertically stacked:
  - Top: `[PIPE]` — a horizontal ring-buffer ribbon with byte tokens flowing left → right; ring-buffer ends drawn as wrap-around arcs.
  - Middle: `[USOCK]` — a "filesystem path" label and a chunkier ribbon carrying datagram capsules (each capsule contains a structured payload).
  - Bottom: `[SHM]` — NOT a flowing ribbon; instead, a single shared region drawn as one slab whose silhouette appears in BOTH towers' HEAP regions, glowing identically — emphasizing "same physical page, two virtual addresses." A faint dotted line bridges the two views.
- TOP: a thin syscall-entry band (`--color-control` orange) showing `pipe()` / `socket(AF_UNIX)` / `shm_open()` icons that pulse when the channel is created.
- Particle palette: byte tokens in `--color-data` (blue) for `[PIPE]`/`[USOCK]`; static glow in `--color-active` (hot pink) on the `[SHM]` slab when a write occurs (no flow — "store visible immediately").

## Reasoning

The teaching goal here is "not all IPCs are the same — pipes and unix sockets *copy* through kernel buffers, but shared memory does not copy at all." Tier 3 lets us draw the same shared slab inside both towers, a visual contrast that flat boxes would miss. Three stacked channels also let the user feel "pick the one with the latency you can afford."
