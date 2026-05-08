# art — 00_computer/01_disk/02_ssd_controller

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 1-photo
```

## Asset sources

Decapsulated controller-die crop. Reference targets: TechInsights / ChipRebel die-shots of NVMe controllers (Samsung Elpis, Phison E18, Marvell Bravera, Silicon Motion SM2264). The image should show the floorplan: ARM core cluster, host-interface block, channel controllers along one edge, ECC/LDPC block, SRAM banks.

SVG hotspots over the die crop:
- left edge (host-IF block): hotspot → `_nvme_link/` (data in)
- right edge (channel controller column): hotspots → `_flash_channel/` (data out, one per channel)
- center sub-block labeled "FTL DRAM cache + remap": hotspot → `03_ftl/`
- background daemon block labeled "GC": hotspot → `03_gc/`
- inline LDPC/ECC block on the read/write path: hotspot → `03_ecc/`

AI-generation prompt fallback: "high-resolution decapsulated SoC die photograph, multi-block floorplan, large central ARM core cluster, distinct LDPC ECC block, multiple identical channel controller blocks along right edge, host PCIe interface along left edge, SRAM banks, false-color tinting, microscope-style sharpness."

## Reasoning

The controller is one chip — a real die — and its internal floorplan happens to map cleanly onto its child folders. Tier 1 die-crop preserves the "this is a real piece of silicon" feel that a stylized SVG would lose, and lets the user click directly on the named region of the chip rather than a redrawn block diagram.
