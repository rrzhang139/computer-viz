# computer-viz — Agent Conventions

Click-to-zoom visualization of computer-systems internals from electrons-in-transistors up to assembly execution. Browser-animated. Multi-agent build.

If you are a sub-agent picking up work in this repo, **read this file first**. Then read your assigned phase rules below.

## The hard rules (every phase, every agent)

1. **Spatial invariant** (locked): LEFT = data input, RIGHT = data output, TOP = control signal, BOTTOM = power/ground (never drawn). [BRACKETS] = one unit of this layer. `...` = zoom-in marker. See `INVARIANTS.md`.
2. **Symbol provenance**: Level N may only reference symbols defined at level N-1 or earlier. See `GLOSSARY.md`.
3. **Single writer per file**: Every file in this repo has exactly one owning folder/agent. Do not edit a file you don't own. To request a change, append to `COORDINATOR_LOG.md`.
4. **Lock files don't change**: After Phase 0, `INVARIANTS.md` is frozen. After Phase 2, `EXECUTION_SCHEMA.md` is frozen (additive only with `?` optional).
5. **Motivation lede**: Every `spec.md` opens with one paragraph: *why does this level exist, what problem does it solve*. Validators reject specs without one.
6. **Realistic-first rendering**: Default view is physical/realistic per its tier (Tier 1 photo, Tier 2 3D, Tier 3 rich-stylized SVG). Symbolic detail is a *toggleable overlay*, not a separate view. See INVARIANTS.md → "Rendering tiers" + "Symbolic overlay".
7. **Connectors are first-class**: A folder prefixed with `_` (e.g., `_pcie/`, `_syscall/`) is a *zoomable edge* between two siblings. Same template as a node folder. The wire/arrow in the parent's diagram routes to its connector folder on click.
8. **Diagrams are data, not JSX**: Define nodes/edges as JSON in `symbolic.md` / `physical.md`. The component reads the data. Non-frontend agents can produce a working level by editing data alone.
9. **No new tokens in Phase 4**: All colors, durations, easing curves come from `src/ui_tokens.ts`. Forbidden to invent.
10. **Wrap technical terms** with `<Term>` (or use `<TermText>` for prose). Add new terms to `src/data/dictionary.ts` first. See INVARIANTS → "Terminology rule".
11. **Use `<Unit>` for absolute numbers**, and prefer relative comparisons over absolutes when possible. See INVARIANTS → "Units rule".
12. **Symbol invariants are codified** in `src/levels/symbols.ts`. Every label that has meaning across levels (`A`, `B`, `Y`, `Vdd`, `GND`, `PMOS`, `NMOS`, `V_G`, `V_th`, `n+`, `p+`, `P_A`, `N_B`, `gate`, `oxide`, ...) MUST be referenced through the namespaced constant (`LOGIC.A`, `SUPPLY.Vdd`, `TRANSISTOR_TYPE.NMOS`, `PART.gate`, etc.). Inline string literals for these names are forbidden in components. New cross-level symbols are added to `symbols.ts` first; tests in `tests/unit/symbols.test.ts` lock the invariants.
13. **The viz canvas holds the diagram only — no text overlays.** Every level pane (`level-pane-*`) shows just the symbolic illustration (transistors, gates, latches, wires, output chips). LevelSummary, phase explainers, legends, truth tables, and any other prose live in the right-toolbar `aside`. The formatting smoke test asserts a banned-list of testids (`level-summary`, `phase-explainer`, `legend`, `nand-truth`, etc.) does NOT appear inside `level-pane-*`.
14. **LevelSummary lives in the sidebar, one per level.** Driven by per-level/per-variant data in `descriptions.ts` (`gateLevelSummary`, `latchLevelSummary`, `dffLevelSummary`, `pmosLevelSummary`, `nmosLevelSummary`, `compareLevelSummary`). LevelView selects which summary to render based on `level + variant`. Components do NOT render LevelSummary themselves.
15. **Spotlight panel is dynamic and cycle-aware.** At `cycle === 0` it shows the level's default `Spotlight` (the level pitch, or the "you arrived from parent X" spotlight if drilling down). At `cycle > 0` it shows the current phase from `<level>PhaseFor(cycle)` with `title / subtitle / body / meters`. Define phase data in `descriptions.ts`; never duplicate phase prose inside the level component.
16. **Phase functions are total + pure**. `gatePhaseFor`, `latchPhaseFor`, `dffPhaseFor` each return a populated `PhaseSpotlight` for every cycle in 0..3. Locked by `tests/unit/spotlight-consistency.test.ts`.
17. **Drill-down spotlights carry parent-terminal mapping.** When the user clicks NAND1 in the latch and lands on the gate level, the spotlight body MUST explicitly state "From the latch: A = S̄ · B = Q̄ · Y = Q" (and similar for NAND2, master/slave latch, etc.). The `cross-level spotlight consistency` unit test asserts these mappings exist; never weaken them.
18. **Every clickable component has a spotlight entry**. The right-toolbar spotlight panel reads from `partSpotlights` or the level-specific spotlight map in `descriptions.ts`. Adding a new clickable element without a spotlight entry is incomplete work — the test suite asserts coverage.
19. **Cross-fade between level panes, don't unmount**: all panes stay mounted; opacity + scale animate; `aria-hidden` and `pointer-events: none` disable the inactive pane. Tests scope to `[aria-hidden="false"][data-testid^="level-pane-"]` to avoid duplicate-locator failures.
20. **Adding a new level on top of the tree** (e.g., register above DFF): build a `Level<X>.tsx` containing only the SVG/3D diagram (no text cards). Add a `<x>PhaseFor(cycle)` to `descriptions.ts` and a default `<x>Spotlight` + `<x>LevelSummary`. Wire LevelView: extend `LevelKey`, `LEVEL_META`, back/Esc traversal, spotlight + summary resolution, and add a cross-fade pane. Keep `gate` as the default landing. Add a per-level e2e spec asserting: navigation up reaches the level, back from top is disabled, scene renders all sub-components, phase spotlight cycles in the sidebar, key insight is testable in the DOM, drilling to children carries the right spotlight, sidebar summary answers the four standard questions. Extend the formatting smoke with a "<x> sidebar baseline" test.

21. **Connected-hover preview pattern** (used everywhere child sub-components can be drilled into): when the user hovers a child block on level N, the simple block SWAPS in place for a "connected" component that shows level-(N−1)'s internals fitted to the parent's wire endpoints, with electron pulses on the conducting branches. Pure data flow — no rotation hacks, no overlay popovers.

22. **New-layer checklist** (MANDATORY for every level you add — `tests/e2e/dlatch-preview.spec.ts` is the reference suite):
    1. **Scene module**: create `<x>WireGraph.ts` (named WIRE_NODES, WIRES with `from`/`to`, derived `SCENE_BOUNDS`/`SCENE_CENTER`/`SCENE_SIZE`, `<X>_EXTERNAL_TERMINALS`, `<X>_ABSORBED_TERMINALS`) + `<X>SceneSvg.tsx` (pure SVG renderer at world coords) + `<x>Module.tsx` (`<X>_MODULE = new LevelModule(...)`).
    2. **Navigable level**: `Level<X>.tsx` that calls `<X>_MODULE.renderMini` at viewport scale. Wire into `LevelView`: extend `LevelKey`, `LEVEL_META`, `depthOf`, back/Esc traversal, spotlight + summary resolution, cross-fade pane.
    3. **Hover preview**: every drill-down child element in `Level<X>.tsx` must have a hit area that (a) sets hovered state via `useHoveredChild`, (b) swaps in `<CHILD>_MODULE.renderMini` covering that area while hovered, (c) calls the appropriate `onZoomTo<Child>` on click.
    4. **Required test suite** (one spec per level — copy/adapt `tests/e2e/dlatch-preview.spec.ts`):
       - container renders at full size,
       - hover shows the child preview (DOM test),
       - moving cursor away dismisses it,
       - click drills into the child level (`level-pane-<child>` becomes active),
       - preview overlaps the parent scene viewport (no off-screen).
    5. **Required pixel-precise tests** at the level's PARENT boundary (copy `tests/e2e/wire-connection-dff.spec.ts` + `tests/e2e/loose-ends-dff.spec.ts`): every parent wire that lands on this level's external terminal must be < 2 px from the projected position; every external terminal must have a parent wire (no loose ends).
    6. **LLM-judge gate**: spawn the `claude` subagent with screenshots of the new level + the parent's hover preview and ask it to evaluate four contracts (hover works, click navigates correctly, wires connect, no loose ends). It must return PASS before the level is considered done.

    **The reusable building blocks** (`src/levels/connectedHover.ts`):
    - `Point2 | Point3`, `TerminalConnection<P>`, `ChildConnections<P, K>` — shared geometry/type contract.
    - `useHoveredChild<Id>()` — hover-state hook with `enter` / `leaveIf` (race-safe leave) / `leaveAll`. Every level reuses this.
    - `detailedTestId(id)` and `netTestId(id, terminalKey)` — the testid contract `${id}-detailed` and `${id}-detailed-net-${terminalKey}` for cross-level e2e assertions.

    **The per-level pieces** (encode once, plug into the hook):
    - A `<x>Connections.ts` data file: per-child connection-point table (e.g. `TRANSISTOR_CONNECTIONS` for gate, `NAND_CONNECTIONS` for latch). Each entry maps `{ terminalKey → { point, netLabel } }`.
    - A `Connected<X>.tsx` renderer: takes the terminal points + current logical state, renders the body fitted to those points, internal sub-components (transistors inside a NAND, NANDs inside a latch, latches inside a DFF…), and per-branch electron animation.
    - Unit test pinning the connection table.
    - E2e test asserting `${id}-detailed` appears on hover and each `${id}-detailed-net-${key}` carries the correct parent-net label.

    **Existing references**: `ConnectedMosfet` (3D r3f, used by LevelGate hover); `ConnectedNand` (SVG, used by LevelLatch hover). The next level up (DFF→latch hover) follows the same recipe with `ConnectedLatch`.

## Testing discipline (every change)

- **Run Playwright on every change**, not just unit tests. The DOM/layout regressions we care about (clipping, overlap, off-canvas drift) are only visible to a real browser. The default verification cadence is `npm run test:e2e -- --grep "formatting smoke"` plus the targeted level-zoom test.
- **`tests/e2e/formatting.spec.ts` is the formatting smoke test.** It (a) full-page screenshots known states into `test-results/visual-trace/formatting/` so a human can scan a folder of PNGs, and (b) quantitatively asserts non-clipping (`scrollWidth` vs `clientWidth`) and non-overlap (bounding-box pairs) of always-visible HUD elements. Add a new card → add it to this test.
- **Sub-agent zero-context review.** When a level reaches a polish milestone, spawn a `sonnet`/`Explore` sub-agent with NO conversation context, hand it screenshots from the formatting smoke folder, and ask it to read the level cold. If a beginner can't answer the level's framing question from the screenshots alone, the level is not done. Common gaps the review catches: missing motivation lede, ambiguous arrows, "loop back to where?" confusion, polarity flips.
- **Symbol invariants test (`tests/unit/symbols.test.ts`)** runs on every change; it pins the `[PN]_[AB]` role pattern, `LOGIC.A/B/Y` conventions, `PART` ↔ `ElectronsPart` round-trip, and within-namespace uniqueness. Don't weaken these — extend them.
- **Don't add error handling, fallbacks, or feature flags** for scenarios that can't happen. Trust internal code. Validate only at system boundaries.

## Folder layout

- `levels/` — the level tree. `00_computer/` is root; underscore-prefixed dirs are connector edges.
- `src/` — React app: `store/` (Zustand), `components/` (level shells), `router/` (TanStack), `data/` (parsed level data), `ui_tokens.ts`.
- Shared root docs at repo root: `INVARIANTS.md`, `GLOSSARY.md`, `EXECUTION_SCHEMA.md`, `TIME_AXIS.md`, `COORDINATOR_LOG.md`, `DESIGN_OPEN.md`, `LEVELS.md`.

## Per-level file template (every level/connector folder has these 8 files)

| File | Owner | When written |
|---|---|---|
| `spec.md` | level agent | Phase 1 |
| `interface.md` | **parent** of this level | Phase 1 (parent writes it; children import) |
| `symbolic.md` | level agent | Phase 3 |
| `physical.md` | level agent | Phase 3 |
| `animations.md` | level agent | Phase 3 |
| `execution.md` | level agent | Phase 3 |
| `timing.md` | level agent | Phase 3 |
| `component.tsx` | level agent | Phase 4 |

## Phase rules

- **Phase 0** (coordinator only): scaffold + write all root docs + write `executionState.ts` + `ui_tokens.ts`.
- **Phase 1** (parallel, leaves first): each agent writes `spec.md` + `interface.md` for its level. Reads INVARIANTS, GLOSSARY skeleton, parent's interface.md (if exists).
- **Phase 2** (validate): cross-read all specs, register every `[BRACKET]` symbol in `GLOSSARY.md`, lock `EXECUTION_SCHEMA.md`.
- **Phase 3** (parallel by level): each agent writes the design files. Reads only own spec + parent + child interfaces.
- **Phase 4** (parallel by leaf branch): each agent writes `component.tsx`. Reads only own design files + `EXECUTION_SCHEMA.md` + `ui_tokens.ts`.
- **Phase 5** (coordinator only): wire router + store + zoom transitions + assembly stepper.

## Conflict resolution

Two agents need the same change → both append to `COORDINATOR_LOG.md` describing the conflict. Coordinator agent (or human user) decides; updates the owning file once. Other agents re-read.

## ISA

RISC-V RV32I. Demo program:

```asm
addi x1, x0, 5
addi x2, x0, 3
add  x3, x1, x2
sw   x3, 0(x4)
```

## Out of scope (V1)

- Compiler / programming-language layers (the existing scaffold's Levels 9-11).
- Multi-socket NUMA topology.
- GPU internals (visible at PC level as a peripheral; not drilled).
- Real OS process scheduling decisions (we show one process running).
