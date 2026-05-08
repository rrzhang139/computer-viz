# spec — 00_computer/01_os/02_mmu

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

`[PROC]` isolation is a contract — but somebody has to enforce it on every load, store, and fetch the `[CORE]` issues. The MMU is that enforcer: a small piece of silicon sitting between `[CORE]` and the cache/RAM that converts every virtual address into a physical address by walking `[PT]` (with `[TLB]` caching recent answers) and checking permission bits. If translation fails — page not present, write to a read-only page, U-mode access to S-mode page — the MMU raises a fault that vectors to `[PF]`. Remove the MMU and you'd have no isolation, no demand paging, no `mmap`, no copy-on-write `fork`. We file the MMU under `01_os/` because *what it does* is OS-defined (the kernel writes `satp` and the page tables); it just happens to live in core silicon.

## ROLE
On every memory access: V→P translation + permission check, with `[TLB]` as front-end cache and `[PT]` walk on miss.

## MADE OF
1 `[TLB]` (split I-TLB + D-TLB) + 1 hardware page-table walker + 1 `satp` CSR latch + permission-check logic. Logically owned by OS but implemented in `[CORE]` silicon.

## INPUTS
TOP: `satp` (root PT pointer + ASID + mode) written by kernel on each context switch. LEFT: virtual address + access type (R/W/X) + privilege mode from `[CORE]`.

## OUTPUTS
RIGHT: physical address (on hit) → cache subsystem; OR fault signal (on miss/violation) → `[TRAP]` → `[PF]` handler.

## SYMBOL
`[MMU]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
