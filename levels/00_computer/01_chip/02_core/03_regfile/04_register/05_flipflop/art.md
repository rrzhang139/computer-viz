# art — 00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```
Changed from auto-suggested `1-photo`: a single flip-flop has no recognizable die appearance at any photographic scale. Tier 3 (rich stylized SVG with depth, glow, and the latched-bit pulse) is the right fit per the task hint.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

<!-- For Tier 1: photo URL or AI-generation prompt. Confirm provenance. -->
<!-- For Tier 2: 3D scene description, material refs. -->
<!-- For Tier 3: gradient palettes, particle behaviors, depth-stacking choices. -->

Rich stylized SVG of a master-slave D flip-flop:
- Background: deep `--color-bg` `#0E1116` with a faint radial gradient centered on the latch core (suggests "this is where state lives").
- Four `[G]` blocks rendered as rounded rectangles with subtle inner-shadow + soft purple-tinted gradient fill (`--color-storage` `#9D6BFF` family) — purple because storage. Each block carries the schematic gate glyph as an SVG path.
- Layout: master latch (left two gates) feeds slave latch (right two gates); a feedback wire visibly loops back from the master output to the master input — drawn as a curved path with an SVG `<filter>` drop-shadow + `↻` arrow head.
- Wires:
  - D enters from LEFT (`--color-data` blue).
  - CLK enters from TOP (`--color-control` orange), branches to both latches with inverter glyphs marking master vs. slave polarity.
  - Q exits to RIGHT (`--color-data` blue, brighter once latched).
- Animation:
  - Between CLK edges: D propagates only into master (slave holds previous Q); show D's blue tracer halting at the slave boundary.
  - On rising CLK edge: a brief pulse along the CLK rail → slave snaps to master's value; Q wire fades from old value's tint to new value's tint with a `<filter>` glow flare on the gate that flipped.
- Particle ribbon along Q's wire (slow drift) when Q is held high — keeps the level alive even between events.

## Reasoning

<!-- Why this tier fits this level. -->
A flip-flop has no photogenic physical form; it is shape, feedback, and timing. Tier 3 (gradients + glow + animated wires) is the only way to make "the bit hops on the clock edge" feel like an event rather than a label. Going Tier 2 would over-promise (3D for a logic primitive whose layout is irrelevant); Tier 1 is impossible at this scale.
