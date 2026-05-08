# INVARIANTS — locked at Phase 0, never edited after

These rules apply at **every level**, in every diagram, in every component. The point is that the user's brain learns one map and reuses it. Any deviation breaks the visualization.

## Spatial rules

| Direction | Meaning |
|---|---|
| **LEFT** | data inputs (flow rightward) |
| **RIGHT** | data outputs (exit rightward) |
| **TOP** | control signals (flow downward — clock, op, enable, select) |
| **BOTTOM** | power / ground / Vdd / Vss — **always implicit, never drawn** |

## Symbol & marker convention

| Glyph | Meaning |
|---|---|
| `[NAME]` | one unit of this layer (e.g. `[T]`, `[G]`, `[FF]`, `[REG]`, `[ALU]`) |
| `...` | zoom-in here; contains previous-layer units |
| `→` | data flow (always horizontal in symbolic view) |
| `↓` | control flow (always vertical, top-down) |
| `↻` | feedback loop (storage / state) |

## Color tokens (used uniformly across all levels)

| Token | Hex | Used for |
|---|---|---|
| `--color-data` | `#3DA5FF` (blue) | data wires, data values |
| `--color-control` | `#FFB23D` (orange) | clock, op, enable, control signals |
| `--color-storage` | `#9D6BFF` (purple) | flip-flops, registers, memory cells |
| `--color-active` | `#FF3D6E` (hot pink) | the execution-pointer highlight |
| `--color-passive` | `#454F5B` (slate) | inert components |
| `--color-bg` | `#0E1116` (near-black) | canvas background |
| `--color-fg` | `#E6EDF3` (off-white) | labels |
| `--color-edge` | `#5C6873` (mid-grey) | quiet wire color |
| `--color-edge-active` | same as `--color-data` or `--color-control` depending on signal type | when carrying current activity |

Defined in `src/ui_tokens.ts` as the single source of truth.

## Rendering tiers (the "default is realistic" rule)

The default visual at every level is **physical/realistic**, not a box-and-arrow diagram. Symbolic detail is a *toggleable overlay* on top of the realistic base. Three tiers:

| Tier | Renderer | Levels |
|---|---|---|
| **1. Photographic** | SVG over real photo / die-crop | hardware you can see: `00_computer`, `01_chip`, `01_ram`, `01_disk`, `01_network/02_nic`, `02_phy`, `02_core`, `03_l1`, `03_alu`, `03_regfile`, `03_frontend`, `02_l2`, `02_l3`, `02_memctrl` |
| **2. 3D scene** | react-three-fiber | physical depth + particles required: `08_electrons`, `07_transistor`, `06_gate`, `_ethernet_link/03_signal_on_wire`, `_dram_bus`, `_pcie` |
| **3. Stylized SVG** | rich SVG (gradients, glows, particle flows) | software constructs with no physical form: `01_os`, `_syscall`, `_interrupt`, `02_process`, `03_binary`, `02_mmu`, `03_tlb`, `02_pagetables`, `02_io_path`, `03_pipeline`, `04_decoder`, `04_cacheline`, `02_nic/_dma_ring`, `_dmi`, `_interconnect_ring`, `_nvme_link` |

Tier is declared per level in `art.md` (Phase 1 deliverable, parent-confirmed). Phase 4 implementation must respect the tier — Tier 1 must use real imagery, Tier 2 must use a 3D scene, Tier 3 must look richer than a Visio diagram (gradients, depth, particle motion).

## Symbolic overlay (the toggle, not a separate view)

Every level component takes one prop: `overlay: 'on' | 'off'`. When `on`, a translucent SVG layer adds:
- Signal-name labels next to wires/connectors
- Op-name and value labels next to active components
- Arrows showing data/control flow direction
- Bracket-symbol annotations (`[ALU]`, `[REG]`, `[CL]`, etc.)

When `off`, the user sees only the realistic visual + the execution-pointer highlight. Default state: `off` (visual first), but the toggle is always visible.

LayoutGroup IDs (e.g., `reg-rax`, `alu-adder`) are stable across overlay states so toggling animates labels in/out without disturbing the base.

## What "realistic" requires per tier

- **Tier 1**: high-res photo or die-crop as `<image>` background; SVG hotspots + highlights as foreground. Photo's content must match what the level represents (no generic stock CPU image where a die-shot is needed).
- **Tier 2**: 3D scene with materials that read as silicon/copper/oxide (PBR-ish shading, subtle subsurface). Particles for electrons. Camera defaults to a fixed pose; user can orbit slightly.
- **Tier 3**: NOT a flat SVG with rectangles. Use radial gradients, drop-shadow filters, semi-transparent depth layers, animated particle flows along paths. The address-space view should feel like a glowing tower, not a labeled box.

## Connector convention (`_name/` folders)

A folder prefixed with `_` is a zoomable *edge* — the connection between two sibling nodes. Same per-level template as a node folder. Owner = common parent.

Examples in this repo:
- `00_computer/_pcie/` — PCIe lanes between CPU socket and GPU/NVMe
- `01_chip/_interconnect_ring/` — ring/mesh between cores
- `01_os/_syscall/` — userspace ↔ kernel transition
- `01_network/_ethernet_link/` — twisted pair, electrons in copper

## Motivation lede

Every `spec.md` MUST start with one paragraph answering: *why does this level exist, what problem does it solve, what would break if you removed it.* Validators reject specs without one. This is the cure for "loop back to where?" / "what's that arrow doing?" — every component should have an obvious *purpose* before you ever look at its mechanism.

## Time-axis discipline

Every `timing.md` cites a row in `TIME_AXIS.md`. Never invent a new time scale. The single mapping function `levelTime(globalLogT, levelDepth)` projects global play time into native units at each level.

## Execution-pointer rule

Every level component renders a "you are here" highlight derived from the global `ExecutionState`. Components do NOT carry their own simulation state — they are pure functions of `ExecutionState + view`.

## Terminology rule (the dictionary)

Every level repo has a shared term dictionary at `src/data/dictionary.ts`. **Any technical term that appears in user-facing text must be discoverable.** Two ways to comply:

1. Wrap explicit terms with the `<Term name="…">…</Term>` component (or use `<TermText>` for prose — auto-detects known terms).
2. If you introduce a NEW technical term, **add it to `dictionary.ts` first**, then reference it. Do not silently sneak in a term that wasn't there before.

Definitions in the dictionary follow this rule: *one sentence, including a relative comparison or anchor when possible* (e.g. "100× slower than L1," "~30 cm of light per ns"). Avoid jargon-as-definition.

## Units rule (avoid raw, prefer relative)

Hard-numbered units (ns, µs, MB, GHz) are concept-fragile — readers can't conceptualize "100 ns" without an anchor. Three rules:

1. **Prefer relative comparisons.** "RAM is 100× slower than L1" beats "RAM = 100 ns" when the goal is intuition. Reach for absolutes only when the absolute matters (e.g. budget calculations, real-time deadlines).
2. **When you DO use a unit, use the `<Unit value={...} unit="ns" />` component.** It renders the value with a hover tooltip explaining the unit, including a physical anchor ("light travels 30 cm in 1 ns").
3. **Don't pile units.** A spec with five different time units in one paragraph is a sign you should rewrite for relative comparisons.

The TIME_AXIS table is the one exception: it must be precise about absolutes because it's the source of truth for animation rates. Prose should not mirror those numbers; it should reference the table.

## Knowledge graph

A modal navigation overlay lives at `src/components/KnowledgeGraph.tsx`. It's the user's "where am I" device. Two views:

- **Tree** (default): clickable hierarchy of all 115 levels, searchable.
- **Graph**: react-flow canvas showing parent-child edges plus cross-cutting edges from `interface.md` files (cross-cutting populates as Phase 1 lands).

Trigger: top-right `⊞ graph ⌘K` button or Cmd/Ctrl+K. Esc / X / backdrop closes. Phase 1 agents do not modify this; the coordinator owns it.

## What is NOT specified here

Layout coordinates, font sizes, label wording — those are per-level decisions in each `physical.md` / `symbolic.md`. INVARIANTS specifies *grammar*, not *vocabulary*.
