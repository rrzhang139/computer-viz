# Wire Sketches

Design-source-of-truth for the spatial layout of every level
(transistor → gate → latch → D-latch → … → register/ALU/…). Each layer's
`.md` declares its external terminals as explicit Cartesian coordinates; a
small renderer (`render.mjs`) produces the sibling `.svg` so a human can
eyeball it.

## Why Cartesian, not ASCII?

LLM spatial-reasoning research (2025–2026; *From Text to Space*,
*ASCIIEval*, *Grid Spatial Understanding*) is consistent: explicit (x, y)
tables beat ASCII art for both reading and editing layouts. ASCII art has a
documented read-write asymmetry — LLMs can squint at it OK but cannot
maintain it without drift. The renderer covers human comprehension.

## The load-bearing invariant

Inputs / outputs of layer N (its `External terminals`) MUST align — within
**1.5 px** when projected (the tolerance enforced by
`tests/e2e/wire-connection-dff.spec.ts`) — with the points where parent
layer N+1's wires actually land on this layer's mini.

Spatial axes (CLAUDE.md rule 1, locked):

- LEFT   = data input
- RIGHT  = data output
- TOP    = control signal
- BOTTOM = power / ground

## File structure of a layer `.md`

Each layer file has the same section headings, in this order. The render
script depends on the headings being spelled exactly as below.

1. `# Layer N — <name>` — title.
2. One-paragraph lede.
3. `## Scene bounds` — one line `x ∈ [minX, maxX], y ∈ [minY, maxY]`.
4. `## External terminals` — table `key | role | (x, y) | edge` where edge ∈
   {LEFT, RIGHT, TOP, BOTTOM}. The parent connects to these.
   - Data / control terminals are single points.
   - The two supply terminals (`Vdd`, `GND`) are single *conceptual* handles
     for what is physically a whole TOP / BOTTOM edge (a rail). Their (x, y)
     records the rail's y; the x is a representative midpoint, not a unique
     attachment point.
5. `## Internal supply distribution` — describes the rail span endpoints,
   the per-child supply taps, and which routing pattern the parent uses
   when this layer is embedded (direct top-drop vs L-shaped via a
   left/right side bus).
6. `## Embedded children` — for each drilled-into child block: child id,
   child layer, placement box `(cx, cy, w, h)`, and a mapping
   `child_external → absorbed_terminal_in_this_layer`.
7. `## Wires` — internal wires only, `from | to | via | net`. References
   either external-terminal or absorbed-terminal keys.
8. `## Alignment claims` — bulletted "X must equal Y" lines.
9. `![sketch](./layerN_<name>.svg)` — image link.

## The supply-rail convention

Inside this project, every layer with non-trivial children declares:

- a single `Vdd` external terminal on its TOP edge,
- a single `GND` external terminal on its BOTTOM edge.

Each child likewise exposes its own top-edge `Vdd` and bottom-edge `GND`.
The parent's responsibility is to route Vdd into *every* child's `Vdd`
terminal and GND into every child's `GND` terminal.

**Two routing patterns** appear in the existing layers:

1. **Direct top-drop / bottom-rise** — when a child sits adjacent to the
   parent's top (Vdd) or bottom (GND) edge with no other child in
   between, a single vertical wire connects them. Example: each PMOS in
   the NAND gate (layer 1) is directly below the Vdd rail, so the rail
   drops straight down into its source.

2. **L-shaped via a side bus** — when a child is sandwiched behind
   another (e.g., latch's N2 sits below N1, so N2's Vdd would have to
   cross N1's body if routed straight from the top), the parent runs a
   vertical Vdd bus on its LEFT edge (outside all children) and short
   horizontal stubs into each child's projected Vdd-y. The mirror pattern
   runs GND up the parent's RIGHT edge.

The "Internal supply distribution" section of each layer's .md records
which pattern applies and the specific drop / stub coordinates.

## How to add a NEW layer

1. **Sketch first.** Author `layerN_<name>.md`. Run `npm run sketch` to
   render its SVG.
2. **Add alignment-matrix rows** in `alignment_matrix.md` for every
   parent-wire / child-terminal pair.
3. **Only then** write `<x>WireGraph.ts` / `Level<X>.tsx`. The unit test
   (`tests/unit/wireSketches.test.ts`) fails until code conforms.
4. Then proceed with the rest of CLAUDE.md rule 22's new-layer checklist
   (scene module, hover preview, e2e tests, LLM-judge gate).

## Files

- `layer0_transistor.md` — single MOSFET, 3 external terminals.
- `layer1_gate.md`        — NAND gate (4 transistors).
- `layer2_latch.md`       — SR latch (2 cross-coupled NANDs).
- `layer3_dlatch.md`      — D latch (1 SR latch + 2 gating NANDs + inverter).
- `alignment_matrix.md`   — cross-layer parent-wire ↔ child-terminal table.
- `render.mjs`            — generates `*.svg` from `*.md`.
