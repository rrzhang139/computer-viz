# spec — 00_computer/01_disk/02_ssd_controller/03_ecc

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Modern TLC and QLC NAND cells store 3–4 bits each by partitioning a small charge window into 8 or 16 voltage bands. As cells wear, the bands smear and cells drift; raw page-read bit-error rates routinely exceed 1e-3 — utterly unusable on its own. `[ECC]` is what makes the drive trustworthy: it appends ~1–2 KB of LDPC parity per 4 KB host data on every program, and on every read it iteratively decodes back the original bits, correcting hundreds of flipped bits per page. Without `[ECC]` modern flash would surface hard errors after a few thousand P/E cycles and TLC/QLC would not be commercially viable at all.

## ROLE
Wrap every page program with parity, decode every page read iteratively until the codeword is corrected (or surface an uncorrectable-error flag for upper layers).

## MADE OF
1 LDPC encoder (parity generator, fixed-rate code, ~8% overhead), 1 iterative LDPC decoder (belief-propagation, runs 1–N rounds until convergence or budget), 1 syndrome buffer, 1 read-retry / soft-decode escalation path. Hardware block on the `[SSDCTRL]` die sitting inline on every channel's read/write path.

## INPUTS
- LEFT (data): on write, raw 4 KB host data; on read, raw page bytes from `[FCH]` (data + parity, possibly noisy)
- TOP (control): code-rate selection per block age, soft-read-retry escalation hints, decode iteration budget

## OUTPUTS
- RIGHT (data): on write, codeword (data + LDPC parity) heading to a NAND page; on read, corrected 4 KB payload + a "raw bit-error count" telemetry signal back to firmware (drives wear estimation)

## SYMBOL
`[ECC]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row: `03_ecc` (1 anim sec ⇒ 5 µs per LDPC decode iteration)
- decode is iterative; a healthy block converges in 1–2 rounds, a worn block may need 5+ and trigger soft reads

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
