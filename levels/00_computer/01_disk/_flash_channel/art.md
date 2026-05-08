# art — 00_computer/01_disk/_flash_channel

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

Stylized SVG bus diagram for one channel.

Layout (LEFT data input, RIGHT data output, TOP control):
- LEFT: `[SSDCTRL]` channel-controller block (a small slice of the controller die styled as a glowing block)
- CENTER: 8-bit DQ bus rendered as a thick blue (`--color-data`) ribbon with traveling byte-cells; DQS data-strobe rendered as a parallel orange (`--color-control`) edge-tick line above it
- RIGHT: a row of 4–8 NAND die thumbnails (rectangular) hanging off the bus, each tagged `CE0#..CE7#`; only the addressed die's `CE#` lamp lights up during a burst
- TOP: control-strobe lanes labeled `CE#`, `CLE`, `ALE`, `WE#`, `RE#`, `R/B#`, `WP#` — these flicker as commands progress

Visual language:
- Byte particles flow LEFT→RIGHT during write, RIGHT→LEFT during read; bidirectional DQ shown as a single ribbon whose flow direction reverses
- A small "burst" pulse (~800 MT/s indicated as fast strobe) compressed visually so a 16 KB page transfer takes a noticeable but quick swoosh
- Inactive dies grey out; only one CE# at a time

Symbolic overlay (toggle):
- ONFI command sequence labeled in plain text above the strobe pulses (e.g., `00h - addr - 30h` for a read)
- Per-burst latency label citing `_flash_channel` row of TIME_AXIS

## Reasoning

`[FCH]` is a real bus but visually boring as a photo — just short PCB traces. The interesting thing is the *protocol*: chip-enable selecting one die, command/address/data phases interleaving on the same DQ bus. Tier 3 stylized SVG with animated bus traffic and labeled control lines is the clearest way to surface the parallelism + multiplexing story. Tier 2 3D would not add anything; the bus has no meaningful spatial depth.
