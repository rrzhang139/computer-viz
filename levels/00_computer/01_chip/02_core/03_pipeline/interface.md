# interface — 00_computer/01_chip/02_core/03_pipeline

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `stage_F`, `stage_D`, `stage_X`, `stage_M`, `stage_WB` | uop currently in each stage | every CLK edge |
| `bubble` | a NOP inserted by hazard logic | stall cycle |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[HAZ]` | data/control/structural hazard detection → stall | `04_hazards` |
| `[FWD]` | bypass mux selection → operand routing | `04_forward` |
| `[SQ]` | flush controller → kill in-flight stages | `04_squash` |

## Cross-cutting refs

- Receives uops from `02_core/03_frontend` (via [FQ]).
- Reads operands from `02_core/03_regfile` (or physical registers in OoO mode).
- Sends ALU ops to `02_core/03_alu`, memory ops to `02_core/03_loadq`/`03_storeb`.
- Triggers [SQ] on mispredict from `02_core/03_rob` or trap from `02_core/03_trap`.
- Counters tick `02_core/03_pmu`.
