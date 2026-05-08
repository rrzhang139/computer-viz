# spec — 00_computer/01_os/_mmap

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Files on disk and pages in memory are the same blocks viewed two ways — `mmap` is the kernel construct that makes that explicit. A `mmap(fd, ...)` call binds a region of `[PROC]` virtual address space (a VMA) to a range of file pages in `[PCACHE]`; first touch faults via `[PF]`, the kernel reads the page (or finds it cached), installs a PTE, and the program just dereferences a pointer. Without mmap, every file access is a `read()` syscall + a copy into a user buffer — slower and forces explicit buffering. mmap also backs ELF loading (`[BIN]`), shared libraries, and `MAP_ANONYMOUS` heap slabs.

## ROLE
Bind a VMA in `[PROC]` ↔ a file's `[PCACHE]` pages ↔ on-disk `[INODE]` blocks; lazy on first touch.

## MADE OF
1 VMA struct `{vm_start, vm_end, vm_flags, vm_file, vm_pgoff, vm_ops}` per mapping + `address_space` lookup (inode → page tree) + `vm_ops->fault` callback. No physical wire — connector encodes the binding.

## INPUTS
TOP: `mmap(addr, len, prot, flags, fd, offset)` `[SYSCALL]` (kernel-mediated control). LEFT: `[INODE]` reference for file-backed mappings; `NULL` for `MAP_ANONYMOUS`.

## OUTPUTS
RIGHT: VMA installed in `[PROC]` mm tree; subsequent first-touch loads at `addr+k` raise `[PF]` which uses this VMA's `vm_ops` to populate `[PCACHE]` and install PTE.

## SYMBOL
`[MMAP]` (CONNECTOR — owns the file ↔ VMA ↔ page-cache binding).

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder
- spatial invariants apply (see /INVARIANTS.md)
