# interface — 00_computer/01_os

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[OS]` | the running kernel as a single logical block exposed to `00_computer` | boot complete (PID 1 running) |
| `privMode` | current privilege ring (U/S/M) visible to `02_core` | every trap/return |
| `syscallActive` | `ExecutionState.syscallActive` exposed to parent overlay | ECALL trap |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[PROC]` | virtual address-space container | `02_process/` |
| `[MMU]` | virtual→physical translation | `02_mmu/` |
| `[PT]` | page-table radix tree | `02_pagetables/` |
| `[VFS]` | filesystem-agnostic dispatch | `02_vfs/` |
| `[PCACHE]` | page cache keyed by (inode, offset) | `02_pagecache/` |
| `[BLOCKQ]` | block I/O request queue | `02_block_layer/` |
| `[DRV]` | per-device driver instance | `02_driver/` |
| `[SLAB]` | per-CPU slab allocator | `02_kalloc/` |
| `[PF]` | page-fault handler entry | `02_pagefault/` |
| `[SYSCALL]` | userspace↔kernel transition (connector) | `_syscall/` |
| `[IRQ]` | hardware interrupt path (connector) | `_interrupt/` |
| `[MMAP]` | file↔VMA↔pagecache binding (connector) | `_mmap/` |
| `[DMA]` | device↔RAM transfer descriptor (connector) | `_dma/` |
| `02_io_path` | end-to-end VFS→PCACHE→BLOCKQ→DRV→DMA→DISK path | `02_io_path/` |

## Cross-cutting refs

- TIME_AXIS rows: `01_os/_syscall` (50 cycles), `01_os/_interrupt` (100 cycles), `02_process` (100 instrs).
- Parent: `00_computer/interface.md` — kernel runs on `[CHIP]`, owns `[RAM]`/`[DISK]`/`[NIC]` views.
- Sibling: `02_core/03_csr/` — `mtvec`, `mepc`, `mcause`, `sstatus` CSRs the kernel reads/writes.
- Sibling: `02_core/03_trap/` — hardware trap unit that vectors ECALL/IRQ to kernel.
