# interface — 00_computer/01_chip/02_core/03_frontend/04_predictor

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `pht_taken` | 1 = predict taken, 0 = predict not-taken | combinational; used same fetch cycle |
| `pht_confidence` | top + bottom counter bits (strong vs weak) | same cycle |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | counter cells | already defined |
| `[G]` | XOR-hasher + saturating-increment logic | already defined |

## Cross-cutting refs

- Trained on resolved direction from `02_core/03_rob`.
- Direction combined with `04_btb` target by `03_frontend` mux; `[RAS]` overrides for `ret`.
- Mispredict → squash propagated by `03_pipeline/04_squash`.
