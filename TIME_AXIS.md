# TIME_AXIS — log-scale time mapping per level

The user wants electrons "physically realistic" but visible. Real electron drift through a transistor channel is ~ps; a clock cycle is ~ns; an instruction retires in ~5 cycles; a DRAM access is ~100 ns; a syscall is ~µs; an SSD read is ~µs–ms; a DRAM refresh sweep is ~64 ms. That spans ~14 orders of magnitude.

The fix: **each level rebases time onto its own native unit, with a fixed mapping from global animation time.** When zooming, the user sees a small log-scale time ruler in the corner that re-anchors. The animation playhead is global; the visible *unit* changes per level.

## How an agent uses this table

In your level's `timing.md`:

```md
native_unit: cycle
anim_seconds_per_unit: 1
table_row: "03_alu"
```

If you need a scale not in this table → append to `COORDINATOR_LOG.md`. **Do not invent.**

---

## Foundational physics → core (transistor scale → instruction scale)

| Level | Native unit | 1 anim sec ⇒ |
|---|---|---|
| `08_electrons` | ps | 1 ps |
| `07_transistor` | ps | 10 ps |
| `06_gate` | ps | 100 ps |
| `05_flipflop` | ps | 1 ns |
| `04_register` | cycle | 1 cycle |
| `04_cacheline` | cycle | 2 cycles |
| `03_l1` | cycle | 4 cycles |
| `02_l2` | cycle | 12 cycles |
| `02_l3` | cycle | 40 cycles |
| `02_memctrl` | ns | 50 ns |
| `01_ram` | ns | 100 ns |
| `03_alu` | cycle | 1 cycle |
| `03_pipeline` | cycle | 5 cycles |
| `03_frontend` / `04_decoder` | cycle | 1 cycle |
| `02_core` | instr | 1 instr |
| `01_chip` | instr | 5 instr |
| `00_computer` | instr | 5 instr |

## Frontend / branch prediction

| Level | Native unit | 1 anim sec ⇒ |
|---|---|---|
| `04_btb` | cycle | 1 cycle |
| `04_predictor` | cycle | 1 cycle |
| `04_ras` | cycle | 1 cycle |
| `04_fetchbuffer` | cycle | 2 cycles |

## Out-of-order datapath

| Level | Native unit | 1 anim sec ⇒ |
|---|---|---|
| `03_rename` | cycle | 1 cycle |
| `03_freelist` | cycle | 1 cycle |
| `03_rob` | cycle | 20 cycles |
| `03_rs` | cycle | 1 cycle |
| `03_loadq` | cycle | 10 cycles |
| `03_storeb` | cycle | 5 cycles |
| `03_agu` | cycle | 1 cycle |
| `03_mul` | cycle | 1 cycle (3-4 cycle pipelined) |
| `03_div` | cycle | 5 cycles (10-40 iterative) |
| `03_prefetch` | cycle | 10 cycles |
| `03_pmu` | cycle | 1 cycle |
| `03_csr` | cycle | 1 cycle |
| `03_trap` | cycle | 5 cycles |

## Pipeline detail

| Level | Native unit | 1 anim sec ⇒ |
|---|---|---|
| `04_hazards` | cycle | 1 cycle |
| `04_forward` | cycle | 1 cycle |
| `04_squash` | cycle | 1 cycle |

## Cache hierarchy detail

| Level | Native unit | 1 anim sec ⇒ |
|---|---|---|
| `04_mshr` | cycle | 4 cycles |
| `04_coherence` | transaction | 1 transaction |
| `04_write_buffer` | cycle | 2 cycles |
| `03_directory` | cycle | 10 cycles |
| `03_victim_buffer` | cycle | 8 cycles |
| `03_replacement` | cycle | 1 cycle |

## Chip-level

| Level | Native unit | 1 anim sec ⇒ |
|---|---|---|
| `02_clock` | cycle | 1 cycle (period ~0.3 ns) |
| `02_pmgr` | ms | 1 ms (DVFS step ~10 µs, C-state µs–ms) |

## DRAM

| Level | Native unit | 1 anim sec ⇒ |
|---|---|---|
| `02_rank` | ns | 50 ns |
| `02_dram_chip` | ns | 25 ns |
| `03_bank` | ns | 15 ns (tRCD ~14 ns) |
| `04_dram_cell` | ns | 10 ns |
| `03_refresh` | ms | 8 ms (full sweep ~64 ms over 8192 rows) |

## Storage / SSD

| Level | Native unit | 1 anim sec ⇒ |
|---|---|---|
| `01_disk` | µs | 100 µs (NVMe read ballpark) |
| `02_ssd_controller` | µs | 10 µs |
| `03_ftl` | µs | 1 µs |
| `03_gc` | ms | 50 ms (block erase ~5 ms) |
| `03_ecc` | µs | 5 µs (LDPC decode iter) |
| `02_nand_die` | µs | 50 µs (tR ~50, tPROG ~500, tBERS ~5 ms) |
| `03_nand_cell` | µs | 100 µs (program pulse + verify) |
| `_flash_channel` | µs | 1 µs (one ONFI burst) |
| `_nvme_link` | µs | 1 µs (PCIe gen4 of one queue entry) |
| `02_queue_pair` | µs | 1 µs (doorbell→SQE→CQE→MSI-X) |

## Bus / interconnect

| Level | Native unit | 1 anim sec ⇒ |
|---|---|---|
| `_pcie` | ns | 1 ns (one symbol time at gen4 ~16 GT/s) |
| `_pcie/02_lane` | ps | 60 ps (gen4 unit interval ~62.5 ps) |
| `_pcie/02_tlp` | ns | 4 ns (one TLP at gen4 ×4) |
| `_dmi` | ns | 1 ns |
| `_dram_bus` | ns | 1 ns (DDR5 ~6.4 Gbit/lane) |
| `_interconnect_ring` | cycle | 1 cycle |

## OS / kernel

| Level | Native unit | 1 anim sec ⇒ |
|---|---|---|
| `02_thread` | instr | 1 instr |
| `02_scheduler` | tick | 1 tick (~1 ms) |
| `_context_switch` | reg-store | 1 register save/restore |
| `_signal` | step | 1 frame-push or handler-entry step |
| `02_ipc/03_pipe` | byte-batch | 1 read/write |
| `02_ipc/03_unix_socket` | message | 1 send/recv |
| `02_ipc/03_shm` | store | 1 memory write visible to both |
| `02_vfs` | dispatch | 1 VFS op |
| `02_vfs/03_inode` | block-ptr | 1 block-pointer follow |
| `02_vfs/03_dentry` | path-step | 1 path component lookup |
| `02_pagecache` | page-op | 1 page lookup/insert/evict |
| `02_block_layer` | request | 1 bio enqueue/dequeue |
| `02_driver` | doorbell | 1 mmio doorbell |
| `02_kalloc` | object | 1 alloc/free |
| `02_pagefault` | step | 1 fault-handler step |
| `_mmap` | step | 1 binding step |
| `_dma` | descriptor | 1 DMA descriptor consumed |
| `01_os/_syscall` | cycle | 50 cycles |
| `01_os/_interrupt` | cycle | 100 cycles |
| `02_process` | instr | 100 instrs |
| `03_binary` | section | 1 ELF section load step |
| `02_mmu` / `03_tlb` | cycle | 1 cycle (hit) |
| `02_pagetables` | cycle | 100 cycles (4-level walk) |
| `02_io_path` | step | 1 layer hop |
| `01_boot` | stage | 1 stage (UEFI→GRUB→kernel→initramfs→PID 1) |

## Network — kernel side

| Level | Native unit | 1 anim sec ⇒ |
|---|---|---|
| `02_socket` | µs | 5 µs |
| `02_socket/03_skbuff` | ns | 200 ns |
| `02_netstack` | µs | 2 µs |
| `02_netstack/03_tcp` | µs | 10 µs |
| `02_netstack/03_ip` | µs | 1 µs |
| `02_netstack/03_eth_l2` | ns | 500 ns |
| `02_netstack/03_qdisc` | µs | 20 µs |
| `_napi` | µs | 50 µs (one NAPI poll budget) |

## Network — hardware side

| Level | Native unit | 1 anim sec ⇒ |
|---|---|---|
| `01_network/02_nic` | µs | 1 µs (DMA descriptor handoff) |
| `02_nic/03_offload` | ns | 100 ns (one TSO segment) |
| `02_nic/03_mac` | ns | 8 ns (1 byte at 1 Gbit, FCS streamed) |
| `02_nic/_dma_ring` | µs | 1 µs |
| `01_network/02_phy` | ns | 8 ns |
| `02_phy/03_pcs` | ns | 1 ns (one symbol at 125 MHz) |
| `02_phy/03_line_driver` | ps | 100 ps (one rise/fall edge) |
| `_ethernet_link` | ns | 5 ns (1 m of copper at 0.66c) |
| `_ethernet_link/03_frame_bytes` | ns | 8 ns (one byte on wire) |
| `_ethernet_link/03_signal_on_wire` | ps | 100 ps (one bit transition) |

## The on-screen ruler

A small persistent corner element shows:

```
[ depth: core | 1 sec ⇒ 1 instr | playback 1.0× ]
```

Re-anchors on every zoom. Tooltip explains.
