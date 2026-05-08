# interface — 00_computer/01_os/_interrupt

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[IRQ]` | active hardware-interrupt path | PLIC/CLINT pending bit set |
| `pendingInterrupt` | `{source, vector}` from `ExecutionState` | trap entry |
| `privMode: 'S'` | forced S-mode raise | ISR running |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none — connector is a leaf, no children) | | |

## Cross-cutting refs

- TIME_AXIS row: `01_os/_interrupt` — native unit `cycle`, 1 anim sec ⇒ 100 cycles.
- `02_core/03_trap/` — same trap unit shared with `_syscall` (selected by `mcause` MSB).
- `02_core/03_csr/` — `mip`, `mie`, `mtvec`, `mepc`, `sstatus` CSRs.
- `02_driver/` — ISR entry point each driver registers.
- `_dma/`, `_napi/` — common bottom-half handoff destinations.
