# COORDINATOR_LOG

Append-only. Every cross-level decision, interface change, glossary update, time-axis row addition lands here. Format:

```
## YYYY-MM-DD — short title
- scope: which folder(s) affected
- proposer: agent/handle
- decision: what was decided
- rationale: why
```

---

## 2026-05-07 — Phase 0 scaffold complete

- scope: repo root
- proposer: coordinator
- decision: 32-entry level tree finalized (24 nodes + 8 connector edges). Networking branch added. Connector convention (`_name/` folders) established.
- rationale: User asked for connectors to be zoomable and a network module so a syscall can be traced all the way to electrons launched into a wire. The underscore convention disambiguates from numeric-prefixed nodes while keeping the same per-level template.

## 2026-05-07 — INVARIANTS locked

- scope: repo root
- proposer: coordinator
- decision: spatial rules (LEFT=data, TOP=control, BOTTOM=ground implicit, RIGHT=output), color tokens, two-view rule, motivation lede requirement.
- rationale: Phase 1 agents need a fixed grammar to build against. Drift here multiplies across 32 components.

## 2026-05-07 — EXECUTION_SCHEMA draft published

- scope: repo root, src/store/executionState.ts
- proposer: coordinator
- decision: First draft includes pipeline state, datapath, memTraffic, MMU/TLB, OS privilege, network and disk I/O substate, electronTime_ps for sub-cycle animation. To be locked at end of Phase 2.
- rationale: Phase 1 agents reference field names in `execution.md`. Locking after validate gives one chance to add missing fields.

## 2026-05-07 — Rendering tier system replaces two-view rule

- scope: INVARIANTS.md, CLAUDE.md, plan
- proposer: user feedback ("more physically enticing")
- decision: Default visual at every level is REALISTIC (Tier 1 photo / Tier 2 react-three-fiber 3D / Tier 3 rich SVG). Symbolic detail becomes a TOGGLEABLE OVERLAY, not a separate view. New per-level template file: `art.md` declares tier + asset sources.
- rationale: Box-and-arrow diagrams don't ground imagination. Tier system per level lets each component pick the rendering that best conveys its meaning. Three.js (`three`, `@react-three/fiber`, `@react-three/drei`) added for the bottom 3 levels and signal-on-wire.

## 2026-05-07 — Phase 1 spec fan-out complete

- scope: 115 folders × 3 files (spec.md + interface.md + art.md) = 345 files
- proposer: 9 parallel general-purpose agents
- decision: All Phase 1 deliverables filled. Each spec has a motivation paragraph; each interface declares emitted-up + expected-down + cross-cutting refs; each art declares tier (1=photo / 2=3D / 3=stylized) + asset sources.
- rationale: Leaves-first ordering not needed at spec stage since GLOSSARY symbols were pre-allocated; agents wrote specs respecting locked symbol provenance.

### Glossary additions (coordinator)

- `[OS]` registered to `01_os/` (kernel as a block) — was used by 01_os/spec.md and 00_computer/interface.md
- `[PC]` registered to `02_core/03_frontend/` (program counter) — used by frontend/ROB/pipeline specs
- `[NAND]`/`[NOR]`/`[AND]`/`[OR]`/`[NOT]`/`[XOR]` documented as sub-flavors of `[G]` (not separately registered); `[NAND]`-flash (defined at NAND die) is a separate symbol — context disambiguates
- `[FUTEX]` documented as passing reference (no folder of its own)

### Tier confirmations (silicon foundations agent moved some)

- Flip-flop, register, regfile: Tier 1-photo → Tier 3-stylized (no canonical photo of an SRAM flip-flop floorplan that adds intuition over a stylized version)
- ALU: Tier 1-photo → Tier 3-stylized (same reasoning)
- All cache structures (MSHR, coherence, write-buffer, directory, victim-buffer, replacement): Tier 3 confirmed
- All DRAM nodes (rank, dram_chip, bank, refresh): Tier 1 photo for chip/rank, Tier 3 for bank, Tier 2 3D for dram_cell (1T1C cross-section)
- All SSD nodes: Tier 1 for board+controller+die, Tier 2 for floating-gate cell, Tier 3 for FTL/GC/ECC
- 03_pipeline: Tier 1 → Tier 3 (timing chart with motion is the right vehicle)

### Open issues for Phase 2 to resolve

1. TIME_AXIS row for `_interconnect_ring` says "1 cycle" but actual latency is per-hop (~1-3 cycles per ring stop)
2. `[NETWORK]` symbol not registered; `01_network/` is treated as umbrella with children carrying symbols. Confirm or add.
3. Some agents used `Write` on existing files instead of `Edit` (output is equivalent — full template replacement — but flagging the deviation)

## 2026-05-07 — Knowledge graph + dictionary + units convention

- scope: src/components/KnowledgeGraph.tsx, Term.tsx, Unit.tsx; src/data/dictionary.ts, levels.ts; INVARIANTS.md, CLAUDE.md
- proposer: user
- decision: Added (1) modal knowledge graph (top-right button + ⌘K) with searchable tree of all 115 levels; graph view stubbed for Phase 5 cross-edges. (2) `<Term>` and `<TermText>` components reading from a 50-term dictionary; auto-tooltip on hover. (3) `<Unit>` component for numeric values with unit explanation + physical anchor. (4) INVARIANTS rule: prefer relative comparisons over absolute units; wrap any technical term in `<Term>`.
- rationale: User asked for a navigation aid + auto-defined technical terms + unit-explanation help. The dictionary is keyed by canonical name with aliases; auto-detect uses a longest-first regex so "branch predictor" wins over "branch."

## 2026-05-07 — Tree expansion: +75 folders from syllabus survey

- scope: levels/, GLOSSARY.md, TIME_AXIS.md, LEVELS.md
- proposer: 4 parallel survey agents (OS / CompArch / Memory+Storage / Networking)
- decision: Expanded from 40 → 115 folders covering: threads/scheduler/IPC/VFS/page-cache/block-layer/drivers/kalloc/page-fault/mmap/DMA/NAPI; OoO core (ROB/RS/rename/freelist/LQ/SB/AGU/MUL/DIV); branch prediction (BTB/PHT/RAS/FQ); pipeline detail (hazards/forward/squash); cache detail (MSHR/MESI/write-buffer/directory/victim-buffer/replacement); CSR/TRAP/PMU/PFE; clock/PMGR; DRAM (rank/chip/bank/dram-cell/refresh); SSD (controller/FTL/GC/ECC/NAND/cell/flash-channel); PCIe (lane/TLP); NVMe queue-pair; full kernel network stack (socket/skbuff/netstack/TCP/IP/eth-L2/qdisc); NIC details (offload/MAC); PHY details (PCS/line-driver/frame-bytes); boot.
- rationale: User asked to scale to more agents and cover OS + compArch syllabi as much as possible. The 4-agent fanout produced concrete, deduped folder lists with GLOSSARY symbols and TIME_AXIS rows. Conflicts resolved: `[L2]` (cache) ≠ `[L2ETH]` (ethernet L2 framing); `04_mshr/` deduped; `03_skbuff/` placed under `02_socket/` not `02_netstack/` (allocation ownership).
