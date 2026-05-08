# interface — 00_computer/01_os/_dma

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[DMA]` | active descriptor + transfer | descriptor consumed |
| transfer direction | `'tx' \| 'rx' \| 'read' \| 'write'` | descriptor decoded |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none — connector leaf) | | |

## Cross-cutting refs

- TIME_AXIS row: `_dma` — native unit `descriptor`, 1 anim sec ⇒ 1 DMA descriptor consumed.
- `01_os/02_driver/` — sets up + rings doorbell, handles completion.
- `01_os/_interrupt/` — completion path back into kernel.
- `02_nic/_dma_ring/`, `_nvme_link/` — device-side ring/queue for the bytes.
- `01_os/02_pagecache/` — destination/source for file I/O.
