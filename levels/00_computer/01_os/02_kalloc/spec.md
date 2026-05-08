# spec — 00_computer/01_os/02_kalloc

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The kernel allocates millions of small typed objects (`task_struct`, `inode`, `dentry`, `skb`, `bio`...) in hot paths, plus 4 KB pages (buddy allocator) for `[PCACHE]` and `[PROC]` mappings. A general-purpose `malloc`-style allocator would be too slow and would fragment over time. Slab/SLUB/SLOB caches solve this: each object type gets its own per-CPU cache of pre-shaped slots backed by buddy pages. Allocate = pop from per-CPU freelist (no lock); free = push back. Cold alloc falls back to the slab's partial/free pages. Without it, every kernel allocation would lock-contend or fragment, and per-type construction overhead would dominate.

## ROLE
Per-CPU typed-object allocator backed by buddy page allocator; the kernel's malloc.

## MADE OF
1 buddy allocator (page-granularity, power-of-2 sizes) + N kmem_caches (one per object type) each holding per-CPU partial slabs. Object slots are pre-formatted; cache may include constructor/destructor.

## INPUTS
LEFT: alloc request (size or kmem_cache pointer). TOP: kernel context (this CPU; GFP flags — atomic vs sleepable, etc.).

## OUTPUTS
RIGHT: pointer to a fresh / recycled object slot of the requested type; on `kfree`, returns to the per-CPU freelist.

## SYMBOL
`[SLAB]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
