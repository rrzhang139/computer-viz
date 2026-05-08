# interface — 00_computer/01_chip/02_clock

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[CLK]` | clock generator + tree as seen by `[CHIP]` | chip init |
| domain-clock | per-core / per-uncore clock edge | every cycle of that domain |
| pll-locked | indicates frequency target reached | once per re-lock |
| clock-gated | domain currently halted to save power | each gate event |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[T]` | PLL VCO + buffers | level `07_transistor/` lineage |
| `[G]` | clock-tree inverters/buffers | level `06_gate/` lineage |

## Cross-cutting refs

- Drives the TOP-of-everything control input on every NODE level on the chip.
- Frequency-target writes come from `02_pmgr/` (sibling).
- TIME_AXIS row: `02_clock` (1 anim sec ⇒ 1 cycle, period ~0.3 ns at ~3 GHz).
