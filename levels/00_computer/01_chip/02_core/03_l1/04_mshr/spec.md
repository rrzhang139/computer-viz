# spec — 00_computer/01_chip/02_core/03_l1/04_mshr

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The `[MSHR]` (Miss-Status Holding Register) is what makes a cache *non-blocking*. When `[L1]` misses, the request takes tens to hundreds of cycles to come back from `[L2]`/`[L3]`/`[RAM]`; without an MSHR the cache must stall every other access. The MSHR records "miss to address X is in flight, here are the loads waiting on it" so the cache can keep serving hits. It also *merges* duplicate misses to the same line (two loads, one fill) — without that merge a tight loop over an array would issue redundant fills and waste DRAM bandwidth proportional to its width. The number of MSHR entries directly bounds memory-level parallelism.

## ROLE
Track in-flight cache-line misses; coalesce duplicate requests to the same line; deliver each waiter its slice when the fill arrives.

## MADE OF
~8–16 MSHR entries per cache bank, each entry = 1 line address + transaction-id + waiter-list (small `[REG]`-like structure) + state bits (idle/fetching/returning). Built from `[REG]`/`[FF]`s plus comparator logic; no new primitive.

## INPUTS
- LEFT (data): missing address from `[L1]` lookup; fill data returning from `[L2]`/ring.
- TOP (control): allocate-new / mark-fill / dealloc commands from L1 control; clock from `[CLK]`.

## OUTPUTS
- RIGHT: outbound miss request to `[L2]` (one per unique line); hit-under-miss responses to waiters when fill arrives; "MSHR full" stall back to the pipeline.

## SYMBOL
`[MSHR]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
