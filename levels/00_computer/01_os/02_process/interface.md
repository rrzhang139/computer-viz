# interface — 00_computer/01_os/02_process

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[PROC]` | one running process: address space + bookkeeping | `execve` complete |
| `satp` | page-table root CSR identifying this `[PROC]` | context switch in |
| address-space layout | CODE/DATA/HEAP/STACK regions visible to parent overlay | always |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[BIN]` | ELF binary mapped into CODE region | `03_binary/` |

## Cross-cutting refs

- TIME_AXIS row: `02_process` — native unit `instr`, 1 anim sec ⇒ 100 instrs.
- `01_os/02_mmu/` — translates this process's virtual addresses.
- `01_os/02_pagetables/` — the per-process radix tree pointed to by `satp`.
- `01_os/02_pagefault/` — handles touches to unmapped/COW/lazy regions.
- `01_os/_mmap/` — establishes file→VMA bindings inside this address space.
- `01_os/_syscall/` — the only legal way for this `[PROC]` to invoke kernel services.
