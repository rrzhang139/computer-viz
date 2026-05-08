# interface — 00_computer/01_chip/02_pmgr

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[PMGR]` | power/DVFS controller as seen by `[CHIP]` | chip init |
| p-state | (V, f) operating point per core | each transition |
| c-state | idle depth per core (C0/C1/C6/...) | each entry/exit |
| throttle | thermal-cap-driven frequency clamp | per cap event |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[CSR]` | OS-facing interface registers | level `02_core/03_csr/` (cross-tree) |
| `[REG]` / `[G]` | controller storage + logic | level `04_register/`/`06_gate/` lineage |

## Cross-cutting refs

- Drives `[CLK]` (sibling) for frequency, on-package PMIC for voltage.
- Reads telemetry from `[PMU]` under `02_core/03_pmu/` (cross-tree).
- OS-facing path goes through `01_os/` MSR/RAPL infrastructure (cross-tree).
- TIME_AXIS row: `02_pmgr` (1 anim sec ⇒ 1 ms; DVFS step ~10 µs, C-state µs–ms).
