# spec — 00_computer/01_os/02_vfs/03_inode

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A file is more than its name: it has size, mode, owner, mtime, link count — and crucially, *where its data lives on disk*. The inode is the on-disk + in-memory record holding all of that, identified by an inode number unique within a filesystem. Names live elsewhere (`[DENTRY]`); multiple names (hardlinks) can point to the same inode. Block pointers (or extent trees) inside the inode tell `[BLOCKQ]` where to read/write data. Without inodes, the OS has nowhere to record metadata; renames would be impossible without copying; hardlinks couldn't exist.

## ROLE
On-disk + cached file metadata + block pointers (or extent map); identified by `(super_block, ino)`.

## MADE OF
1 `struct inode` per cached file: fields `{ino, mode, uid, gid, size, atime/mtime/ctime, nlink, i_op, i_fop, i_mapping, blockptrs/extents}`. Allocated by `[SLAB]` (`inode_cache`).

## INPUTS
LEFT: inode number (from `[DENTRY]` lookup or directory read). TOP: invalidation/sync events from filesystem.

## OUTPUTS
RIGHT: metadata fields to `[VFS]`; block-list to `[BLOCKQ]` for data I/O; address_space root to `[PCACHE]`.

## SYMBOL
`[INODE]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
