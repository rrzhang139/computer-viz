# interface — 00_computer/01_os/_syscall

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[SYSCALL]` | active U→S transition with `{num, phase}` | `ECALL` decoded |
| `privMode: 'S'` | kernel-mode flag for parent overlay | trap entry |
| `syscallActive.phase` | `'enter' \| 'handle' \| 'return'` | each phase boundary |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none — connector is a leaf, no children) | | |

## Cross-cutting refs

- TIME_AXIS row: `01_os/_syscall` — native unit `cycle`, 1 anim sec ⇒ 50 cycles.
- `02_core/03_trap/` — hardware trap unit that delivers ECALL to `mtvec`.
- `02_core/03_csr/` — `mtvec`, `mepc`, `mcause`, `mstatus` CSRs touched on entry/exit.
- `01_os/02_process/` — caller `[PROC]` whose register set is saved as `[CTX]`.
- `01_os/_interrupt/` — sibling connector sharing the same `mtvec` dispatch.
