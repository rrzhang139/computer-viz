# spec — 00_computer/01_os/02_io_path

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

A user calling `write(fd, buf, n)` to a file looks atomic but is actually a multi-stage pipeline through the kernel: `[SYSCALL]` → `[VFS]` (which fs?) → `[PCACHE]` (in-cache hit?) → `[BLOCKQ]` (queue I/O if needed) → `[DRV]` (NVMe submission) → `[DMA]` (descriptor + payload to disk). Each stage adds buffering, batching, or scheduling. Without an explicit "I/O path" view, learners see scattered subsystems with no spine. This level is a *cross-cutting overview* — a thin orchestrator that highlights the path; the work is done in the children listed in `MADE OF`.

## ROLE
Compositional view of the kernel I/O path: shows how a single `read`/`write` syscall threads through `[VFS]` → `[PCACHE]` → `[BLOCKQ]` → `[DRV]` → `[DMA]`.

## MADE OF
1 path-overlay rendering each hop as a stage; references (does not own) `[VFS]`, `[PCACHE]`, `[BLOCKQ]`, `[DRV]`, `[DMA]`.

## INPUTS
TOP: `read`/`write` `[SYSCALL]` from U-mode (kernel-mediated control). LEFT: user buffer pointer + offset + length.

## OUTPUTS
RIGHT: bytes copied to/from disk; syscall return value (bytes transferred or `-errno`); modified `[PCACHE]` pages.

## SYMBOL
None — this is a composition view, not a new symbol.

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
