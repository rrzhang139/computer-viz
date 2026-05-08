# spec — 00_computer/01_os

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The kernel exists because raw `[CHIP]` + `[RAM]` + `[DISK]` give one shared, dangerous machine — any program could read any address, drive any device, and clobber any other program. The OS interposes as a privileged mediator: it multiplexes one `[CORE]` between many programs as `[PROC]`s with private address spaces (via `[MMU]`/`[PT]`), arbitrates devices through `[DRV]`s, and exposes the whole hardware mess as a small set of safe verbs (`[SYSCALL]`s like `read`, `write`, `mmap`). Remove it and you'd lose isolation, fairness, and the ability to keep more programs alive than there are cores. The kernel itself has no silicon — it is just code running in S-mode on the same `[CORE]` it manages.

## ROLE
Privileged mediator: maps userspace requests to hardware, isolates `[PROC]`s from each other, owns all peripherals via `[DRV]`s.

## MADE OF
1 logical kernel image (no physical form) running on `[CHIP]` in S-mode, exposing: `[PROC]`, `[MMU]`, `[PT]`, `[VFS]`, `[PCACHE]`, `[BLOCKQ]`, `[DRV]`, `[SLAB]`, `[PF]` plus connectors `[SYSCALL]`, `[IRQ]`, `[MMAP]`, `[DMA]`.

## INPUTS
LEFT: userspace data buffers (file bytes, packets). TOP: `[SYSCALL]` from U-mode + `[IRQ]` from `[NIC]`/`[DISK]`/timer (kernel-mediated control).

## OUTPUTS
RIGHT: results returned to userspace registers, side effects in `[RAM]`/`[DISK]`/`[NIC]`.

## SYMBOL
`[OS]` (the kernel as a single logical block; child symbols enumerated above).

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
