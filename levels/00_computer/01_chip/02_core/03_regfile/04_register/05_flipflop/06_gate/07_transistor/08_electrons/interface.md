# interface — 00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop/06_gate/07_transistor/08_electrons

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `I_D` | drain current (carrier drift magnitude) | continuous; rises when V_GS > V_th |
| `channel_state` | inverted (conducting) vs. depleted (off) | gate-voltage step; ~ps settling |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| — | none — this is the atomic floor | no children exist |

## Cross-cutting refs

- The `[T]` level (`07_transistor/`) wraps this physical behavior into a switch abstraction; nothing else references the electron level directly.
