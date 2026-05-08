# spec — 00_computer/01_os/02_pagefault

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[MMU]` translation can fail for many legitimate reasons: a page was lazily-mapped (anonymous, never touched), file-mapped via `[MMAP]` but not yet faulted in, copy-on-write (post-`fork` write to a shared page), or stack-grow on a downward push. Plus illegitimate ones: writing read-only pages, U-mode access to S-mode pages — those become `SIGSEGV`. The page-fault handler decodes `mcause` + `stval` (faulting address) + `mtval2` + access type, classifies the fault into minor (just allocate or fix perms) vs major (read from disk via `[VFS]`/`[PCACHE]`/`[BLOCKQ]`) vs fatal, and either fixes it and returns or kills the process. Without `[PF]`, demand paging, COW fork, file-backed mmap, and lazy stack growth all break.

## ROLE
Translation-fault handler: classify fault → minor (alloc/COW), major (fault-in from disk), or fatal (SIGSEGV).

## MADE OF
1 trap entry point (S-mode, vector `mcause = 12/13/15` for instr/load/store page fault) + classification logic + per-VMA `vm_ops->fault` dispatch + cooperation with `[PCACHE]` and `[MMAP]`.

## INPUTS
TOP: trap from `[MMU]` carrying `stval` (faulting vaddr), `scause` (fault type), `sstatus.SPP` (priv mode at fault). LEFT: faulting `[PROC]`'s register set + VMA tree (look up which mapping contains `stval`).

## OUTPUTS
RIGHT: on success, returning to U-mode at the faulting instruction (which retries); on failure, `SIGSEGV` to the process. Side effect: a new `[PT]` PTE installed (and TLB filled lazily on retry).

## SYMBOL
`[PF]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
