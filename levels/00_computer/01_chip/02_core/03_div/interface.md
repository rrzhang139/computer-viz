# interface — 00_computer/01_chip/02_core/03_div

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[DIV]` | iterative divider unit (state-machine driven) | each iteration on CLK edge |
| `result` | quotient or remainder (op-dependent) | valid only when `done=1` |
| `done` | iteration-complete handshake | asserted ~10–40 cycles after `start` (variable) |
| `div_by_zero` | RV32M sentinel-result flag (not a trap) | combinational on B==0 at `start` |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| — | none — leaf for V1 | — |

## Cross-cutting refs

- Reads `rs1_val`, `rs2_val` from `03_regfile/`; writes back via the regfile's write port.
- `op` and `start` arrive from `03_frontend/04_decoder/`.
- `03_pipeline/` must stall any dependent instruction for the full variable latency until `done=1`.
- TIME_AXIS row `03_div: cycle, 5 cycles per anim sec (10-40 iterative)`.
- Scope assumption: RV32M extension; restoring or SRT-radix-4 — V1 may render either as a single iterative state-machine without committing to one in spec.
