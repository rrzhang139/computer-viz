# interface — 00_computer/01_chip/02_core/03_frontend/04_btb

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `btb_target` | predicted target PC for current fetch | fetch-cycle CLK edge |
| `btb_hit` | tag-match valid | combinational, same cycle |
| `btb_type` | branch kind (cond / call / ret / uncond) | same cycle as hit |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | underlying storage cells for tags + targets | `02_core/04_register` (already defined) |
| `[G]` | tag-comparator + decode logic | `06_gate` (already defined) |

## Cross-cutting refs

- Updated by branch resolution from `02_core/03_rob`.
- Cooperates with `03_frontend/04_predictor` (PHT) for direction; `04_ras` for `ret` type entries.
- Consumed by `03_frontend` next-PC mux.
