# spec — 00_computer/01_chip/02_l3/03_replacement

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

When a set is full and a new line arrives, *something* must be evicted — `[REPL]` is the policy that picks. The choice matters: a poor policy (e.g. random) can double the miss-rate of a good one (LRU/RRIP) on real workloads, especially at LLC where reuse distance is huge. RRIP and friends specifically defend against thrashing access patterns that defeat plain LRU. Without a deliberate policy, the LLC becomes "any random subset of recently touched lines" instead of "a curated working set."

## ROLE
Per-set state + selection logic that picks which `[CL]` to evict when a fill needs space. Tracks age/reuse bits per way; updated on every hit and fill.

## MADE OF
Per-set age/RRIP bits (~2-3 bits × ways-per-set) stored alongside `[CL]`s, plus a small priority-encoder selecting the victim. Built from `[FF]`/`[G]`s; no new primitive.

## INPUTS
- LEFT (data): hit signal + way-id (re-promote winner); fill request needing a victim.
- TOP (control): clock, policy-config CSR write (way mask, RRIP M-value), bypass hint from prefetch.

## OUTPUTS
- RIGHT: victim way selection back to `[L3]` control; updated age/RRIP bits written into the set.

## SYMBOL
`[REPL]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
