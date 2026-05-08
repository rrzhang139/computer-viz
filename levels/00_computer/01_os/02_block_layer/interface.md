# interface — 00_computer/01_os/02_block_layer

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[BLOCKQ]` | request queue + scheduler | per-bio enqueue |
| dispatched-request count | for parent overlay | each dispatch tick |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none — leaf in V1) | | |

## Cross-cutting refs

- TIME_AXIS row: `02_block_layer` — native unit `request`, 1 anim sec ⇒ 1 bio enqueue/dequeue.
- `01_os/02_pagecache/` — primary submitter on miss / writeback.
- `01_os/02_driver/` — destination of dispatched requests.
- `01_os/_dma/` — payload pages handed to driver for DMA transfer.
