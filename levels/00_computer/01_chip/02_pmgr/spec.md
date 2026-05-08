# spec — 00_computer/01_chip/02_pmgr

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[PMGR]` exists because power and thermal limits — not transistor count — set the practical performance ceiling on every modern CPU. Running every core at maximum frequency would melt the package, so the chip must trade frequency, voltage, and which cores are awake. P-states pick (V, f) operating points; C-states park idle cores at progressively lower power; DVFS swings them as workload changes. Without this controller the OS would have to micromanage per-core voltage rails, which it can't do at hardware time-scales (microseconds). It's also the gate to thermal throttling: when temperature rises, `[PMGR]` lowers frequency before something burns.

## ROLE
Closed-loop power/frequency manager: track per-core C-state (idle depth) and P-state ((V,f) point), execute DVFS transitions, enforce thermal/current caps, present a clean OS-facing interface (RAPL/MSRs).

## MADE OF
1 control microcontroller (or fixed FSM) + per-core voltage/frequency request queues + thermal sensor inputs + interface registers (`[CSR]`-style) for OS hints. Conceptually a small embedded controller; implemented from `[REG]`/`[G]`/`[ALU]` lineage already established.

## INPUTS
- LEFT (data): thermal-sensor readings, current/voltage telemetry, per-core idle/active counters from `[PMU]`.
- TOP (control): OS hints (governor target, MWAIT C-state request, RAPL caps), reset, secure-boot keys.

## OUTPUTS
- RIGHT: frequency-target writes to `[CLK]`, voltage-target writes to on-package PMICs, clock-gate enables to each domain, throttle hint to `[MEMCTRL]`, status back to OS via MSRs.

## SYMBOL
`[PMGR]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
