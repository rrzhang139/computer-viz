# spec — 00_computer/01_os/02_vfs

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A program calls `read(fd, ...)` without caring whether the file lives on ext4, xfs, btrfs, NFS, procfs, or a tmpfs. The Virtual File System is the shim that makes this possible: every filesystem registers an ops table (`super_operations`, `inode_operations`, `file_operations`), and `[VFS]` dispatches each syscall through that table. Path lookups go through `[DENTRY]`, file metadata through `[INODE]`. Without VFS, every syscall would have to be rewritten per filesystem; mixing filesystems in one tree (mounting `/proc` inside ext4) would be impossible.

## ROLE
Filesystem-agnostic dispatch layer: maps generic syscalls (`open`, `read`, `write`, `stat`, ...) to per-filesystem ops via a uniform interface.

## MADE OF
1 VFS object hierarchy (`super_block`, `inode`, `dentry`, `file`) + ops-table indirection. Inside: 1 `[INODE]` cache + 1 `[DENTRY]` cache (children).

## INPUTS
TOP: file-related `[SYSCALL]` (`open`, `read`, `write`, `stat`, `unlink`, `mount`, ...) (kernel-mediated control). LEFT: path string + flags + buffers from userspace.

## OUTPUTS
RIGHT: results dispatched to actual filesystem driver (ext4/xfs/proc/etc.); cached metadata returned via `[INODE]`/`[DENTRY]`.

## SYMBOL
`[VFS]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
