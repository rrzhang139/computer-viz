# interface — 00_computer/01_chip/02_core/03_frontend

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `uop` | decoded RV32I micro-op queued to backend | F→D edge |
| `predPC` | next predicted PC for fetch | every cycle |
| `mispred` | flag asserted when ROB resolution disagrees with prediction | retire of branch |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[BTB]` | predicted branch target for current PC | `04_btb` |
| `[PHT]` | taken/not-taken bias from history | `04_predictor` |
| `[RAS]` | predicted return target | `04_ras` |
| `[FQ]` | queue of decoded uops awaiting rename | `04_fetchbuffer` |
| `[DECODER]` | RV32I bits → uop fields | `04_decoder` |

## Cross-cutting refs

- Receives squash from `02_core/03_pipeline/04_squash` on misprediction.
- Reads I-cache lines from `02_core/03_l1` (I-side).
- Feeds `02_core/03_rename` via [FQ] head pointer.
- Branch-resolve feedback comes from `02_core/03_rob` retirement.
