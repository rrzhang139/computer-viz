# interface — 00_computer/01_chip/02_core/03_l1/04_write_buffer

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[WB]` | store/write buffer as seen by `[L1]` | per-core init |
| WB-full | structural stall: pipeline must hold the next store | each cycle |
| store-forwarded | match-and-bypass to a younger load | per matching load |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | each WB entry is a small register set | level `04_register/` lineage |
| `[G]` | CAM comparator for forwarding | level `06_gate/` lineage |

## Cross-cutting refs

- `[SB]` (store buffer at the OoO core level) is the upstream source feeding retired stores into `[WB]`.
- Drains target `[CL]` in L1-D; misses go through `[MSHR]`.
- Drained on fence/`amo`/release; ordering visible to `[MESI]` snoop responses.
- TIME_AXIS row: `04_write_buffer` (1 anim sec ⇒ 2 cycles).
