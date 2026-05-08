# interface — 00_computer/01_disk/02_nand_die/03_nand_cell

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[NCELL]` | one floating-gate / charge-trap flash cell — the bit-storage element | physical fab; lifetime up to its P/E budget |
| `cell.programmed` | charge injected; threshold voltage shifted to one of the SLC/MLC/TLC bands | program-pulse + verify converges |
| `cell.erased` | charge removed; cell reset to all-1 erased state | block-wide erase pulse complete |
| `cell.read_threshold_voltage` | sensed threshold for this cell at current reference | sense amp on page register samples |
| `cell.wear_event` | one P/E cycle counted against the cell's lifetime budget | every program-pulse |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| _none_ | leaf level — no child folders | — |

## Cross-cutting refs

- `[NAND]` (parent) — the die that wires up control gates (word lines) and bit lines across many `[NCELL]`s
- `[ECC]` (`02_ssd_controller/03_ecc/`) — corrects the bit errors that arise when worn cells' voltage bands smear and overlap
- `[FTL]` / `[GC]` (`02_ssd_controller/03_ftl/`, `03_gc/`) — wear-leveling and reclamation are downstream consequences of the per-cell wear physics emitted from this level
- `[T]` (`levels/.../06_gate/07_transistor/`, when present in repo) — `[NCELL]` is a special floating-gate variant of the same MOSFET concept
