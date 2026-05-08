# art — 00_computer/01_disk/_nvme_link

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

Stylized SVG of the host↔controller transport, with both endpoints visible.

Layout (LEFT data input, RIGHT data output, TOP control):
- LEFT: host RAM region containing the SQ ring and the CQ ring (rendered as two adjacent vertical ring buffers, with head/tail pointer markers)
- CENTER: a wide PCIe pipe (rendered as 4 parallel diff-pair tracks for ×4) carrying TLP packet capsules; capsules color-coded by type (read/write data = blue `--color-data`, doorbell = orange `--color-control`, MSI-X = pink `--color-active`)
- RIGHT: `[SSDCTRL]` chip block with its host-IF terminus
- TOP: doorbell-register strip in controller MMIO; head/tail-pointer mirror; MSI-X vector table

Animation choreography (one I/O command):
1. Driver writes SQE into the SQ ring (LEFT pulses)
2. Driver writes SQ tail doorbell over the PCIe pipe (orange capsule → controller)
3. Controller DMA-fetches the SQE (capsule travels right-to-left for the fetch read TLP)
4. Controller DMA-handles payload (for write: blue capsules left-to-right; for read: blue capsules right-to-left)
5. Controller writes CQE to host CQ (capsule right-to-left)
6. Controller raises MSI-X (pink capsule right-to-left, ends in interrupt-vector flash)

Symbolic overlay (toggle):
- Each capsule labeled with its TLP type and target address
- Latency markers on each step citing TIME_AXIS rows `_nvme_link` and `_pcie/02_tlp`
- A "queue depth" counter labeled `QD=…` updates as commands enqueue/dequeue

## Reasoning

The whole NVMe story is "host queues commands, drive fetches them, drive DMAs payload, drive interrupts on done." That choreography is invisible in any photo — even a PCIe-pin shot would not reveal the doorbell/SGL/MSI-X dance. Tier 3 stylized SVG with both endpoints visible and color-coded packet capsules flowing along a fat pipe is the canonical way this is taught (see Linux NVMe driver docs and Intel NVMe whitepapers). Splitting it across queue-pair (`02_queue_pair/`) and link-level lets us zoom in on the rings without losing the end-to-end view here.
