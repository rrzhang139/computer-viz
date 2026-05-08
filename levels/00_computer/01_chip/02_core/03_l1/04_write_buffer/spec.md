# spec — 00_computer/01_chip/02_core/03_l1/04_write_buffer

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[WB]` (the store/write buffer) lets stores leave the pipeline before they actually update `[L1]`. Stores would otherwise stall the core every time the destination line is missing or the cache port is busy — and most stores are immediately followed by independent work. The write buffer also *coalesces* nearby stores (multiple bytes into one line) and *forwards* values to younger loads of the same address (store-to-load forwarding), which the program-order semantics require. Drained on `fence`/release operations to make stores globally visible. Without it, every `sw` would block; with it, the pipeline stays full while writes settle.

## ROLE
FIFO between core stores and L1-D: hold retired stores, coalesce by line, forward to matching loads, drain into D-cache (allocating via MSHR if the line is missing).

## MADE OF
~16–32 entries × (address `[REG]` + data `[REG]` + byte-mask + age tag) + a CAM-style comparator for store-to-load forwarding + a small drain controller. Uses `[REG]`/`[FF]`s; no new primitive.

## INPUTS
- LEFT (data): retired store address + data + byte-mask from the core; line-fill ack from `[MSHR]`.
- TOP (control): clock, fence/release signal (forces drain), age/retirement signal.

## OUTPUTS
- RIGHT: write to `[CL]` in L1-D when the line is owned (M/E); forwarded data back to a younger load via the CAM; miss request to `[MSHR]` on a write-miss (write-allocate).

## SYMBOL
`[WB]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
