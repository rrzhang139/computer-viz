# spec — 00_computer/01_os/_syscall

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A program in U-mode cannot touch a `[DRV]`, `[PT]`, or `[VFS]` directly — those live in S-mode behind the `[MMU]` and CSR fence. Yet the program needs to read files, send packets, and allocate memory. The syscall is the *one controlled doorway*: the U-mode program loads a syscall number into `a7`, args into `a0`-`a6`, and executes `ECALL`; the `[CORE]` raises an environment-call exception that vectors through `mtvec` to the kernel's trap handler in S-mode. Without this connector, U-mode would either be omnipotent (no isolation) or impotent (no I/O). The cost is real (~50 cycles for the trap + handler runtime), which is why batched APIs and `[MMAP]` exist.

## ROLE
Controlled U→S transition: trap into the kernel with a numbered request, run the handler, return to U-mode via `SRET`.

## MADE OF
1 ECALL instruction + `[TRAP]` vector + 1 kernel handler entry path. Signals: `mcause=8` (env call from U), `mepc` (return PC), `mtvec` (trap base), `a0`-`a7` (args + syscall number), `a0` (return value). No physical wire — the connector is the privilege transition itself.

## INPUTS
TOP: `ECALL` instruction issued by U-mode `[PROC]`; `a7` syscall number, `a0`-`a6` args (kernel-mediated control).
LEFT: U-mode register file snapshot (becomes `[CTX]` saved on kernel stack).

## OUTPUTS
RIGHT: handler return value in `a0`, errno-style negative codes for failure; U-mode resumes at `mepc + 4`.

## SYMBOL
`[SYSCALL]` (CONNECTOR — owns the U↔S edge, no entity of its own).

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder
- spatial invariants apply (see /INVARIANTS.md)
