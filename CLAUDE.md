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
