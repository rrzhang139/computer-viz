# interface — 00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop/06_gate

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[G]` | one boolean function of inputs | combinational; settles after propagation delay |
| `Q` | boolean output (0 or 1) | continuously tracks inputs once delay has elapsed |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[T]` | voltage-controlled switch — wired to form pull-up / pull-down networks | `07_transistor/` |
| `on/off` | per-transistor channel state | `07_transistor/` |

## Cross-cutting refs

- `05_flipflop/` (parent in zoom-out direction) composes `[G]`s with feedback into a `[FF]`.
- `03_alu/` consumes `[G]`-only networks (no storage) for the combinational adder/mux fabric.
- `04_decoder/` uses `[G]` arrays to fan instruction bits out into control signals.
- TIME_AXIS row `06_gate: ps, 100 ps per anim sec`.
