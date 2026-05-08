# interface — 00_computer/01_chip/02_core/03_l1/04_mshr

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[MSHR]` | in-flight miss tracker as seen by `[L1]` | per-bank init |
| MSHR-full | structural stall back to core | each cycle |
| miss-merged | duplicate-request merge event (perf counter) | each merge |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[REG]` | each MSHR entry is a few small registers | level `04_register/` lineage |

## Cross-cutting refs

- Outbound to `[L2]` (sibling of `[CORE]`); fills return through the same path.
- `[CL]` is the unit each MSHR entry is keyed on (line address, not byte).
- TIME_AXIS row: `04_mshr` (1 anim sec ⇒ 4 cycles).
