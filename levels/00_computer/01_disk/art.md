# art — 00_computer/01_disk

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

Top-down photo of an M.2 2280 NVMe SSD with the label peeled (or a bare PCB shot) so the controller die, NAND packages, and (if present) DRAM cache are all visible on one green PCB. Reference shots: Samsung 980 Pro / WD SN850 / Solidigm P5510 product photography or any high-res teardown image.

SVG hotspots overlay:
- left edge (LEFT/data-in): the M.2 PCIe edge connector → routes into `_nvme_link/`
- center package (controller chip): hotspot → `02_ssd_controller/`
- 1–4 NAND packages flanking the controller: hotspots → `02_nand_die/`
- short copper traces between controller and each NAND package: hotspots → `_flash_channel/`

AI-generation prompt fallback: "studio photograph, top-down, M.2 2280 NVMe SSD on matte black background, label removed, large square controller die in center, four rectangular NAND flash packages, one small DRAM die, dark green PCB with gold traces, sharp focus, even diffuse lighting, no logos."

## Reasoning

`[DISK]` is hardware you can hold; users have seen an M.2 stick. A real photo anchors the abstraction immediately and exposes the parts (controller, NAND, channels, edge connector) as discrete clickable hotspots that map 1:1 onto child folders. Tier 2 would over-render a flat object; Tier 3 would lose the "this is the actual thing" punch.
