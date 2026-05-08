# interface — 00_computer/01_os/02_io_path

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| current path-stage | `'vfs' \| 'pcache' \| 'blockq' \| 'drv' \| 'dma' \| 'disk'` | every hop |
| `diskActivity.stage` | mirrors `ExecutionState.diskActivity.stage` for parent overlay | I/O active |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none — composition view; references siblings, owns no children) | | |

## Cross-cutting refs

- TIME_AXIS row: `02_io_path` — native unit `step`, 1 anim sec ⇒ 1 layer hop.
- Sibling `02_vfs/`, `02_pagecache/`, `02_block_layer/`, `02_driver/` — the actual subsystems composed.
- Sibling connectors `_dma/` (descriptor + DMA), `_syscall/` (entry).
- Parent `01_os/interface.md` — exposes `02_io_path` as the way to "read the whole pipeline" without zooming each subsystem.
