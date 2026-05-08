# spec — 00_computer/01_chip/02_core/03_loadq

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A load that issues OoO might fire *before* an older store to the same address. To preserve memory ordering and to enable store-to-load forwarding, every in-flight load reserves an [LQ] entry at dispatch (in program order) and snoops the [SB] at execute time: if an older store covers the same bytes, it forwards directly from the store buffer; otherwise it reads from [L1]. The LQ also detects ordering violations (a younger load that already speculatively read stale memory before an older store committed) and triggers a squash. Without LQ tracking, OoO would happily reorder dependent load/store pairs and corrupt program semantics.

## ROLE
Tracks in-flight loads in program order; checks [SB] for forwarding; detects ordering violations.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
~32–80 entries of [REG] storage. Each entry: {addr, size, rob_id, completed-bit, value, sb-snoop-result}. Per-entry comparator [G] tree against store-buffer addresses (a CAM).

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: load uop with effective addr from [AGU]; in-flight store addresses from [SB] (snoop input).
- TOP: [CLK]; allocate-at-dispatch from rename; commit/free signal from [ROB] retirement; flush from [SQ].

## OUTPUTS
<!-- RIGHT -->
- RIGHT: load result (forwarded from [SB] or returned from [L1]) → broadcast to [RS] wakeup bus + writeback to physical reg.
- ordering-violation flag → triggers squash via [SQ].

## SYMBOL
<!-- bracketed token. None for connectors. -->
[LQ]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
