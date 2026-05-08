# spec — 00_computer/01_os/02_vfs/03_dentry

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Resolving a path like `/home/alice/data.txt` requires reading the directory entries for `/`, then `/home`, then `/home/alice`, then finding `data.txt`. Disk-reading 4 directory blocks for every `open` would be miserably slow. The dentry cache stores `(parent dentry + name) → child dentry → inode` in RAM keyed by hashed name; subsequent path lookups hit RAM. Negative dentries (cached "this path does NOT exist") avoid repeated misses. Without it, even `ls`-heavy workloads would saturate disk on metadata alone.

## ROLE
Path-component → inode cache: speeds path traversal by remembering name→inode bindings.

## MADE OF
N `struct dentry` allocated from `[SLAB]` (`dentry_cache`); fields `{d_parent, d_name, d_inode, d_op, d_subdirs}`. Hashed in a global hash table keyed by `(parent, name)`. Each links to its `[INODE]`.

## INPUTS
LEFT: parent dentry + name string (one path component). TOP: filesystem-driven invalidations (rename, unlink, mount).

## OUTPUTS
RIGHT: child dentry (positive, pointing to inode) or negative dentry (this name doesn't exist). Cached for the next lookup.

## SYMBOL
`[DENTRY]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
