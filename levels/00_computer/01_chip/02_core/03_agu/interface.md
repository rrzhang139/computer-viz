# interface — 00_computer/01_chip/02_core/03_agu

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[AGU]` | address generation unit | combinational; valid each cycle |
| `EA` | 32-bit effective virtual address `rs1 + sign-ext(imm12)` | combinational |
| `kind` | `load` or `store`, forwarded alongside `EA` | combinational, sourced from decoder |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| — | none — leaf for V1 | — |

## Cross-cutting refs

- Reads `rs1_val` from `03_regfile/`.
- Receives `imm12` and `kind` from `03_frontend/04_decoder/`.
- Output `EA` is consumed by `03_loadq/` (loads) or `03_storeb/` (stores), which then hands it to the L1/MMU path.
- ExecutionState fields used: `memTraffic.addr` (which is the AGU's `EA`), `memTraffic.kind`.
- TIME_AXIS row `03_agu: cycle, 1 cycle per anim sec`.
