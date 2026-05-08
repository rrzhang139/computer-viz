# spec — 00_computer/01_os/02_pagetables

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A flat V→P map of an entire 32- or 64-bit address space would need an absurd amount of RAM (4 GB / 4 KB pages × 4 bytes/PTE = 4 MB *per process* for RV32, far worse for RV64). The page table is the OS's compressed representation: a multi-level radix tree where most subtrees are absent because most addresses are unmapped. Walked in hardware on TLB miss, written by the kernel during `mmap`/`munmap`/`fork`. Without it, you'd need either (a) a flat table consuming gigabytes per process or (b) software translation on every access. We document a 4-level layout for x86-64 familiarity but note that RV32 Sv32 is 2-level and RV64 Sv39/Sv48 is 3- or 4-level — the structure is the same, the depth differs.

## ROLE
Per-process radix tree mapping virtual addresses to physical frame numbers + permissions, walked by `[MMU]` on `[TLB]` miss.

## MADE OF
1 root page-frame (pointed to by `satp`) + N inner-level page-frames + leaf PTEs (one per mapped 4 KB page). Each PTE: `{PPN, V, R, W, X, U, G, A, D}` (RISC-V flag bits). Tree depth: RV32 Sv32 = 2, RV64 Sv39 = 3, RV64 Sv48 / x86-64 = 4 (we use 4 in art for the "x86-style" educational view).

## INPUTS
LEFT: virtual address split into per-level VPN indices (e.g. `[L3 idx | L2 idx | L1 idx | L0 idx | offset]`). TOP: kernel writes/reads PTEs directly via mapped physical memory; `satp` selects which root.

## OUTPUTS
RIGHT: leaf PTE → PPN + perms → `[TLB]` fill; OR fault if any PTE has `V=0` or perm violation → `[PF]`.

## SYMBOL
`[PT]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
