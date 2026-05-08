# spec — 00_computer/01_ram/02_dram_chip/03_refresh

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Every `[DCELL]` leaks charge in tens of milliseconds; if nothing intervened, the entire DRAM contents would corrupt within ~64 ms. `[REFRESH]` is the background process that prevents that — a row counter sweeps every row of every `[BANK]`, activating it (which dumps the row onto the sense amps and writes the amplified values back into the cells) then precharging. The full sweep finishes within the **64 ms retention window**. The cost is real: refresh consumes ~3–5% of memory bandwidth and steals time slots the controller could otherwise use for reads, which is why DDR5 introduced "fine-granularity refresh" to spread that work in smaller `tREFI`-spaced bursts. Without refresh, DRAM literally forgets — within a heartbeat.

## ROLE
A periodic command issued by `[MEMCTRL]` that walks every row in the chip and refreshes its charge. Conceptually a row counter + a per-tREFI tick that stalls normal traffic to issue REF.

## MADE OF
1x row counter (latched in the chip's mode/refresh register), 1x `tREFI` interval timer in `[MEMCTRL]`, plus reuse of each `[BANK]`'s ACT/PRE machinery to do the actual restore.

## INPUTS
- TOP (control): the REF command from `[MEMCTRL]` arriving on the CA bus; CKE high. No data input.

## OUTPUTS
- (No data on RIGHT — refresh has no DQ traffic.) Side effect: every `[DCELL]` in the swept rows has its charge restored to a full 0 or 1.

## SYMBOL
[REFRESH]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
- ~32k rows per chip swept over 64 ms ⇒ ~tREFI = 1.95 µs between refresh commands
- refresh blocks the bank(s) it touches; controller schedules around it
- TIME_AXIS row: `03_refresh` (1 anim sec ⇒ 8 ms; full sweep ~64 ms)
