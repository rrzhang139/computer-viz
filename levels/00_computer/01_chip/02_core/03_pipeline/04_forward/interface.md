# interface — 00_computer/01_chip/02_core/03_pipeline/04_forward

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `fwd_a_sel`, `fwd_b_sel` | mux select for ALU input A/B | combinational |
| `fwd_taken` | a forward path was used this cycle (counter event) | end of EX |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[G]` | comparator + mux fabric | already defined |

## Cross-cutting refs

- Reads stage latches owned by `02_core/03_pipeline`.
- Suppresses stalls in `03_pipeline/04_hazards` (tells [HAZ] "this RAW is fine").
- Drives operand inputs of `02_core/03_alu` and `02_core/03_agu`.
- In OoO mode, generalizes to the wakeup-bus bypass network feeding `02_core/03_rs`.
