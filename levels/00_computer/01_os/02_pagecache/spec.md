# spec — 00_computer/01_os/02_pagecache

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Disk is ~1000× slower than RAM, but most file accesses hit data the kernel touched recently. The page cache exploits that: every file page read or written goes through a kernel cache keyed by `(inode, offset)`; subsequent reads are RAM-speed. Writes go to the cache first (write-back) and `pdflush`/`writeback` threads later flush dirty pages to `[BLOCKQ]`. The page cache silently absorbs most of "free" RAM on a Linux system — what `free(1)` calls *cached*. Without it, every `read` would block on disk; `mmap` would be useless; writes would have no place to coalesce.

## ROLE
Kernel cache of file pages keyed by `(inode, offset)`; sits between `[VFS]` and `[BLOCKQ]`.

## MADE OF
1 `address_space` per `[INODE]` (radix-tree of pages keyed by file offset / 4 KB) + dirty/clean/under-writeback flags per page + global LRU lists (active/inactive). Pages themselves: 4 KB physical frames, allocated by `[SLAB]`/buddy.

## INPUTS
LEFT: file bytes from `[VFS]` `read`/`write` calls; pages read from `[BLOCKQ]` on miss. TOP: kernel writeback timer / `fsync` (kernel-mediated control).

## OUTPUTS
RIGHT: cached page contents to `[VFS]` (hit), or `[BLOCKQ]` request (miss); dirty pages flushed to `[BLOCKQ]` on writeback.

## SYMBOL
`[PCACHE]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
