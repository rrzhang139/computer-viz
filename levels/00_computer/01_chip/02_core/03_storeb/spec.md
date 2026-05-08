# spec — 00_computer/01_chip/02_core/03_storeb

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A store can compute its address and value speculatively (OoO), but it must not actually write memory until [ROB] confirms it retired without exception — otherwise a mispredicted store would corrupt L1. The [SB] is the holding pen: stores enter at dispatch in program order, sit with addr+value once the [AGU] computes them, then drain to [L1] *only when [ROB] head retires them*. Younger loads in [LQ] can still read from the [SB] (forwarding) without waiting for the actual cache write. Without it, OoO stores would commit early and break exception precision.

## ROLE
Buffers stores in retirement order; forwards to [LQ]; drains to [L1] only after retirement.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
~24–56 entries of [REG]. Each entry: {addr, size, value, rob_id, addr-valid, value-valid, retired-bit}. CAM ports for [LQ] snooping; FIFO drain port to [L1].

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: store uop with addr from [AGU] and value from physical reg read; LQ snoop addresses (compare port).
- TOP: [CLK]; allocate-at-dispatch from rename; retire-mark from [ROB]; flush from [SQ]; L1 grant for drain.

## OUTPUTS
<!-- RIGHT -->
- RIGHT: forwarded {value, mask} → [LQ] on snoop hit; drained {addr, value, size} → [L1] D-side write port when head entry is retired.

## SYMBOL
<!-- bracketed token. None for connectors. -->
[SB]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
