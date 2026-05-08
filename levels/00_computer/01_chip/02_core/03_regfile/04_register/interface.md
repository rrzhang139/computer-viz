# interface — 00_computer/01_chip/02_core/03_regfile/04_register

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[REG]` | one 32-bit word of storage | rising edge of CLK (gated by `we` if present) |
| `Q[0..31]` | currently latched 32-bit value | held between edges |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[FF]` | one-bit memory cell; 32 of these compose the register | `05_flipflop/` |

## Cross-cutting refs

- `03_regfile/` (parent in zoom-out direction) holds 32 instances of `[REG]` — the architectural register file x0..x31.
- `03_alu/`, `03_agu/`, `03_mul/`, `03_div/` all read/write `[REG]` values via the regfile's read/write ports.
- TIME_AXIS row `04_register: cycle, 1 cycle per anim sec` — first level where "1 anim sec = 1 cycle".
