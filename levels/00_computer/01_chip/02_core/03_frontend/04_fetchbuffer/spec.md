# spec — 00_computer/01_chip/02_core/03_frontend/04_fetchbuffer

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The I-cache delivers a 32- or 64-byte line at irregular intervals (hits in 1 cycle, misses in tens), while the decoder/rename pipe wants exactly N uops every cycle. The [FQ] is a small queue that absorbs that mismatch: it buffers raw fetched bytes (or pre-decoded uops, depending on design) until rename is ready. Without it, an I-cache miss would immediately stall every downstream stage even though the next several already-fetched lines are ready to decode.

## ROLE
Decouples I-cache fetch rate from decode/rename consumption rate.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
~16–32 entries of [REG]-cell ring buffer, head + tail pointer counters, full/empty [G] logic.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: I-cache line (32–64 bytes) tagged with predicted PC stream.
- TOP: [CLK]; enqueue-enable from fetch; dequeue-enable from decode; flush from [SQ] on misprediction.

## OUTPUTS
<!-- RIGHT -->
- RIGHT: head-of-queue uop bytes → [DECODER]; not-empty signal → backpressure toward fetch.

## SYMBOL
<!-- bracketed token. None for connectors. -->
[FQ]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
