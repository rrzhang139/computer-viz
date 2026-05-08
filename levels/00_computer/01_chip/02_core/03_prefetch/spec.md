# spec — 00_computer/01_chip/02_core/03_prefetch

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A demand load that misses [L1] eats ~10–100 cycles waiting for [L2]/[L3]/[RAM]. If the access pattern is regular (array iteration, linked-list walk with constant stride), the [PFE] can predict the next-needed cache line and request it *before* the program asks, hiding the miss latency behind useful work. It watches the stream of demand-miss addresses, infers stride, and issues speculative line-fill requests N strides ahead. Aggressiveness is tuned by miss-rate and bandwidth headroom — too aggressive pollutes [L1] and wastes DRAM bandwidth.

## ROLE
Detects regular memory-access patterns and issues speculative cache-line requests ahead of demand.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
~16–32 stream-tracker entries built from [REG]. Each: {pc-tag, last-addr, stride, confidence, distance-ahead}. Subtractor [G] tree to compute observed stride; comparator to confirm match.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: stream of demand-load addresses + PCs from [LQ]/[L1] miss path.
- TOP: [CLK]; throttle signal from [PMU]/memctrl when bandwidth pressure is high.

## OUTPUTS
<!-- RIGHT -->
- RIGHT: speculative line-fill request {addr, prefetch-tag} → injected into [L1] miss queue ahead of demand.

## SYMBOL
<!-- bracketed token. None for connectors. -->
[PFE]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
