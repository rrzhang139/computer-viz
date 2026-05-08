# art — 00_computer/01_disk/_nvme_link/02_queue_pair

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

Stylized SVG of one queue pair: two side-by-side ring buffers in host RAM with a controller terminus on the right.

Layout (LEFT data input, RIGHT data output, TOP control):
- LEFT-CENTER: SQ ring rendered as a vertical ring of 16–64 numbered slots. The current `tail` arrow is a glowing orange (`--color-control`) marker at the producer end; `head` is a blue (`--color-data`) marker the drive advances. Slots between head and tail are filled with 64-byte SQE tiles (purple `--color-storage`); empty slots are slate (`--color-passive`).
- RIGHT-CENTER: CQ ring next to it, reversed roles: drive writes at `tail`, host reads from `head`. Each CQE shows a phase-tag bit; freshly written entries have phase=1, ones host already saw show phase=0 (the bit toggles every ring wrap).
- LEFT extreme: a host-CPU silhouette pushing SQEs and pulling CQEs
- RIGHT extreme: `[SSDCTRL]` block pulling SQEs and pushing CQEs
- TOP: pair of doorbell registers — `SQ tail DB` (host writes) and `CQ head DB` (host writes); MSI-X vector lamp

Animation choreography (stepwise):
1. Host enqueues SQE: a new tile slides into the SQ at tail; `tail` marker advances
2. Host rings doorbell: orange capsule shoots up to `SQ tail DB`
3. Drive fetches SQE: the SQE tile teleports rightward to the controller; SQ `head` advances
4. (NAND work happens out of frame — see `02_ssd_controller/`)
5. Drive posts CQE: a tile lands in CQ at drive-tracked tail with phase-bit flipped; pink (`--color-active`) glow
6. Drive raises MSI-X: pink capsule pulses on the MSI-X vector lamp
7. Host consumes CQE: tile fades; host writes CQ-head doorbell; orange capsule on `CQ head DB`

Symbolic overlay (toggle):
- Each tile labeled with command opcode (READ / WRITE / FLUSH / DSM-TRIM) and LBA
- Phase tags labeled per CQE
- Pointer values shown as `(head=…, tail=…)`
- Latency budget on each transition citing `02_queue_pair` and `_nvme_link` rows of TIME_AXIS

## Reasoning

The queue-pair is the canonical producer/consumer ring; the visual story is exactly that — two rings with moving head/tail markers and color-coded tiles. Tier 3 stylized SVG with depth (rings rendered with subtle 3D tilt + glows) makes the abstraction tangible without pretending it has a physical photograph. The phase-tag trick (how host detects a fresh CQE without re-reading head/tail every time) only lands if you can show the bit flipping, which is a Tier-3 SVG move. Tier 1 (photo) is impossible — there is no photo of a queue. Tier 2 (3D) would over-render a flat ring.
