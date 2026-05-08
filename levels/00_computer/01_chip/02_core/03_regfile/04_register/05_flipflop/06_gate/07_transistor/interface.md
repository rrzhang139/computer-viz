# interface — 00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop/06_gate/07_transistor

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[T]` | one voltage-controlled switch | continuous; switching on gate edge (~ps) |
| `on/off` | conducting state of the switch | gate voltage crossing threshold V_th |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `I_D` | drain current — drift magnitude through the channel | `08_electrons/` |
| `channel_state` | inverted vs. depleted channel | `08_electrons/` |

## Cross-cutting refs

- `06_gate/` (parent in zoom-out direction) composes 2–4 `[T]` into a `[G]`; uses the `on/off` abstraction emitted here.
- TIME_AXIS row `07_transistor: ps, 10 ps per anim sec` — sub-cycle scale.
