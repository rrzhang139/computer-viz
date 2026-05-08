# spec — 00_computer/01_chip/02_core/03_trap

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A user-mode program runs along until something interrupts: a syscall (`ECALL`), a page fault, an illegal instruction, or an external IRQ from timer/NIC/disk. The CPU must (a) save the current PC into `mepc`, (b) record the cause in `mcause`, (c) bump privilege mode (U→S→M), and (d) jump to the OS handler at `mtvec` — all atomically, with the precise PC of the offending instruction. The [TRAP] unit is that vectoring + mode-change orchestrator. Without it, the OS could not safely mediate userspace errors and IRQs; the chip would be a pure batch machine.

## ROLE
Vectors exceptions, ECALL, and external IRQs to the trap handler with precise PC + mode change.

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
A small FSM in [G], a priority encoder selecting among pending sources (IRQ / fault / ECALL), interface logic to read/write a handful of [CSR]s (`mtvec`, `mepc`, `mcause`, `mtval`, `mstatus`).

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: exception flag from [ROB] head (page fault, illegal instr, breakpoint), ECALL bit from decode, IRQ pending bits from [CSR.mip].
- TOP: [CLK]; current `privMode`; mask bits from [CSR.mie]/[CSR.mstatus].

## OUTPUTS
<!-- RIGHT -->
- RIGHT: trap-active signal to [SQ] (squash everything younger), redirect-PC = `mtvec` to frontend, write {`mepc=offending_pc`, `mcause=code`, `mtval=info`} to [CSR], priv-mode update.

## SYMBOL
<!-- bracketed token. None for connectors. -->
[TRAP]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
