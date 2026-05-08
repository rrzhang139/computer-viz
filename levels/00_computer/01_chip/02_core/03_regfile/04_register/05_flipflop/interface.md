# interface — 00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[FF]` | one-bit memory cell | rising edge of CLK |
| `Q` | currently latched bit | held between edges; updated on edge from D |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[G]` | combinational gate, used in the feedback network | `06_gate/` |

## Cross-cutting refs

- `04_register/` (parent in zoom-out direction) bundles 32 `[FF]`s on a shared CLK to form one `[REG]`.
- TIME_AXIS row `05_flipflop: ps, 1 ns per anim sec` — sub-cycle setup/hold visible.
- All higher-level storage symbols (`[REG]`, `[CL]`, `[CSR]`, `[ROB]`, etc.) are ultimately built from `[FF]`s; they reference this level transitively.
