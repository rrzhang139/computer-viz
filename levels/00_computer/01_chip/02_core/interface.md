# interface — 00_computer/01_chip/02_core

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[CORE]` | one pipeline as seen by `[CHIP]` | per-core boot |
| pipelineStage | F/D/X/M/WB stage of the active instruction | each cycle |
| activeRegs | registers read or written this cycle | each cycle |
| memTraffic | outbound load/store request | on miss past L1 / fill from ring |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[L1]` | per-core split I+D cache | `03_l1/` |
| `[ALU]` | combinational adder/logic | `03_alu/` (Phase 3+) |
| `[REG]` | 32-entry RV32I register file | `04_register/` lineage |
| `[DECODER]` | bits → control signals | `03_frontend/04_decoder/` |
| `[FQ]` / `[BTB]` / `[PHT]` / `[RAS]` | frontend prediction | `03_frontend/` |
| `[ROB]` / `[RS]` / `[LQ]` / `[SB]` / `[RAT]` | OoO datapath | `03_*/` (Phase 3+) |
| `[CSR]` / `[TRAP]` / `[PMU]` / `[PFE]` | CSRs, traps, perf, prefetch | `03_*/` |

## Cross-cutting refs

- Sibling `02_l2/` is *per-core*: each `[CORE]` owns its `[L2]` slice; `02_l2/interface.md` is reached through this folder, not directly from `01_chip`.
- Sibling `_interconnect_ring/` carries this core's L2-miss requests to `02_l3/` and snoops in.
- `[CLK]` (sibling) drives this core's clock domain; `[PMGR]` (sibling) drives its P-state.
- TIME_AXIS row: `02_core` (1 anim sec ⇒ 1 instr).
