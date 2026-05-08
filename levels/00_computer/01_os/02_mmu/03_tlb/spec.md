# spec — 00_computer/01_os/02_mmu/03_tlb

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A page-table walk is multi-level (2 levels for RV32 Sv32, 3 for RV64 Sv39, up to 4–5 for x86-64), each level a memory load. Doing that for *every* load/store/fetch would crater performance. The TLB caches the most recent V→P translations in a tiny fully-associative array right next to the core, hit in 1 cycle, ASID-tagged so a context switch doesn't always require a flush. Without it, every memory access would cost extra cache misses just for translation; the system would be unusable. Modern cores have separate I-TLB and D-TLB, plus larger L2-TLBs.

## ROLE
Front-end cache for `[MMU]`: 1-cycle V→P lookup, ASID-tagged, per-core.

## MADE OF
~64–256 entries per TLB (split I + D; some designs add L2-TLB ~1k–2k entries). Each entry: `{VPN, ASID, PPN, perms, valid}`. Implemented as fully-associative CAM (small) or set-associative (L2-TLB).

## INPUTS
LEFT: virtual address + ASID. TOP: invalidation control (`SFENCE.VMA` from kernel) — flush all / by-ASID / by-VPN.

## OUTPUTS
RIGHT: PPN + permissions on hit (1 cycle); miss signal on miss (triggers `[PT]` walk by parent `[MMU]`).

## SYMBOL
`[TLB]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
