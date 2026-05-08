# art — 00_computer

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 1-photo
```

**Confirmed.** This is the canonical Tier 1 case study. The user must see a *real* ATX desktop with the side panel removed, photographed straight-on, with every major component recognizable at a glance. A clean rendering would be a regression — the whole point of this level is "this is the thing you already know."

## Asset sources

### Primary background photo

A high-resolution (≥ 3000 px wide), straight-on photograph of an open mid-tower ATX desktop with side panel removed, showing motherboard with CPU heatsink, two DDR5 DIMM slots populated, an M.2 NVMe SSD on the board, a discrete NIC card in a PCIe slot (or onboard NIC at the I/O shield — clearly visible), and PSU at the bottom. Soft, even lighting. No RGB rave aesthetics — neutral PBR-ish look so the SVG hotspots read clearly on top.

**Recommended sourcing strategy (in priority order):**

1. **AI-generate a clean, labeled, didactic build photo (PRIMARY recommendation).**
   - Why: a real photo is full of irrelevant cable clutter, glare, and brand decals that distract from "where is the chip / RAM / SSD / NIC". A clean AI-generated build can be tuned to expose every component flat to the camera, with no occluding fan shrouds, and consistent material rendering (so SVG hotspot polygons trace cleanly).
   - Prompt seed:
     > Straight-on architectural photograph of an open mid-tower ATX desktop computer with the left side panel removed. Components clearly visible and well-lit: motherboard with CPU heatsink (centered, removed top half so socket and IHS are barely visible), two DDR5 DIMM modules in the slots to the right of the CPU, an M.2 NVMe SSD lying flat on the board below the CPU, a network card in the lowest PCIe slot, and a power supply at the bottom of the case. Neutral cool studio lighting, matte plastic and brushed metal materials, no RGB lighting, no cables in the foreground, no brand logos. 4K, photorealistic, technical illustration aesthetic. Component spacing slightly exaggerated for clarity.
   - Run through DALL·E-3 / Midjourney / SDXL; pick the cleanest output; manually retouch to flatten any artifacts. Save final at `levels/00_computer/assets/case_photo.jpg`.

2. **Fallback: Wikimedia Commons CC-BY-SA ATX build photo.**
   - Search terms: "open computer case", "ATX desktop interior", "PC build photo".
   - Candidate categories: `commons.wikimedia.org/wiki/Category:Personal_computer_interiors` and `Category:ATX_motherboards`.
   - Required: license is CC-BY or CC-BY-SA (no NC, no ND); attribution string committed to `assets/CREDITS.md`.
   - Risk: most CC photos are amateur builds with cable clutter — pick one with clean cable routing or be ready to retouch.

3. **Last resort: license a stock photo** (e.g. Unsplash for free + commercial OK; otherwise Shutterstock).

**Decision: start with option 1 (AI-generated), keep option 2 as fallback if AI output looks plasticky.**

### SVG hotspot polygon strategy

Hotspots live as one `<polygon>` per component in a `<g class="hotspots">` group **above** the photo `<image>`. They are interactive (click → zoom to child level) and visually quiet by default (`fill: transparent; stroke: var(--color-edge)` thin dashed line, only visible on hover or with overlay `on`).

| hotspot | shape | maps to | execution-pointer behavior |
|---|---|---|---|
| `chip-socket` | irregular polygon over the CPU heatsink/IHS | `01_chip/` | **primary glowing dot** — pulses with `pc`/cycle changes; intensity tracks `pipelineStage` |
| `ram-dimms` | two parallel rectangles over the DIMM slots | `01_ram/` | secondary pulse when `memTraffic.level === 'RAM'` |
| `disk-m2` | thin rectangle over the M.2 SSD slot | `01_disk/` | secondary pulse when `diskActivity != null` |
| `network-card` | rectangle over the NIC PCB + RJ-45 jack | `01_network/` | pulse when `netActivity != null`, color shifts by `dir` (tx/rx) |
| `pcie-link` | curved path tracing visible PCIe trace from CPU socket to NVMe slot | `_pcie/` | active when PCIe traffic in `EXECUTION_SCHEMA` (e.g. `pcieLanesActive` selector returns non-empty) |
| `dmi-link` | curved path between CPU socket and chipset (PCH) area | `_dmi/` | active during chipset-mediated I/O (USB, SATA) |
| `os` | translucent overlay across whole motherboard area, only visible when overlay `on` (the OS has no physical home) | `01_os/` | always present at low alpha; brightens on `syscallActive` |
| `boot` | small badge in the corner (firmware chip on motherboard if visible; otherwise abstract) | `01_boot/` | only highlighted at `cycle === 0` boot sequence; fades after init |

Hotspot polygon coordinates are authored in `physical.md` (Phase 3) as a JSON array; this file just declares the strategy. Polygons should be coarse (8–16 vertices each) — they are click targets, not pixel-perfect outlines.

### Symbolic overlay (toggle)

When the user toggles overlay `on`:
- Each hotspot's stroke goes from quiet to `var(--color-fg)` solid.
- Bracket-labels (`[CHIP]`, `[RAM]`, `[DISK]`, `[NIC]+[PHY]`, `[OS]`, `[BOOT]`) appear next to each hotspot.
- Connector wires (`[PCIE]`, `_dmi`) get arrow markers showing data direction (LEFT-to-RIGHT default; toggles per `memTraffic` and `diskActivity` direction).
- The execution-pointer dot keeps `var(--color-active)` highlighting on the active component.

LayoutGroup IDs (stable across overlay states): `chip-socket`, `ram-dimms`, `disk-m2`, `network-card`, `pcie-link`, `dmi-link`, `os-overlay`, `boot-badge`.

## Reasoning

Tier 1 photo is the only honest answer at the root level. The user already owns a mental model of "what a desktop looks like" — leveraging that model is free intuition, and *any* abstraction here (3D, stylized) would feel like we are explaining what they already see. The hotspots are the *only* place where Tier-1 polygons get clicked to zoom; from this point inward, each child level can be Tier 1 (close-up photo) or shift to Tier 2/3 as appropriate. The execution-pointer's primary job at this height is to anchor "the program is running on the chip, with occasional outings to RAM / disk / network" — the photo makes that geographic story concrete.
