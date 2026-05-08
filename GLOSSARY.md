# GLOSSARY — every `[BRACKET]` symbol used in this repo

**Single writer**: coordinator only. To add or change a row, append a request to `COORDINATOR_LOG.md`.

**Rule**: every symbol must appear in exactly one row, defined by exactly one folder. References to a symbol from other folders point back to the defining folder.

## Status: skeleton (filled in Phase 1, locked at end of Phase 2)

### Foundational hardware (transistor → core)

| Symbol | Defined in | One-line role |
|---|---|---|
| `[T]` | `levels/.../06_gate/07_transistor/` | a voltage-controlled switch |
| `[G]` | `levels/.../06_gate/` | boolean function of inputs |
| `[FF]` | `levels/.../05_flipflop/` | stores 1 bit until clock edge |
| `[REG]` | `levels/.../04_register/` | stores N bits as one word (RV32I = 32 bits) |
| `[ALU]` | `levels/.../02_core/03_alu/` | combinational add/sub/and/or/xor/shift on two words |
| `[MUL]` | `levels/.../02_core/03_mul/` | pipelined multiplier |
| `[DIV]` | `levels/.../02_core/03_div/` | iterative divider |
| `[AGU]` | `levels/.../02_core/03_agu/` | address generation unit for loads/stores |
| `[DECODER]` | `levels/.../02_core/03_frontend/04_decoder/` | maps instruction bits to control signals |
| `[FQ]` | `levels/.../03_frontend/04_fetchbuffer/` | fetch queue / instruction prefetch buffer |
| `[BTB]` | `levels/.../03_frontend/04_btb/` | branch target buffer |
| `[PHT]` | `levels/.../03_frontend/04_predictor/` | pattern history table; predicts taken/not-taken |
| `[RAS]` | `levels/.../03_frontend/04_ras/` | return address stack |
| `[RAT]` | `levels/.../02_core/03_rename/` | register alias table; arch→phys mapping |
| `[FL]` | `levels/.../02_core/03_freelist/` | physical register free list |
| `[ROB]` | `levels/.../02_core/03_rob/` | reorder buffer; in-order retirement |
| `[RS]` | `levels/.../02_core/03_rs/` | reservation station / scheduler entry |
| `[LQ]` | `levels/.../02_core/03_loadq/` | load queue entry |
| `[SB]` | `levels/.../02_core/03_storeb/` | store buffer entry |
| `[PMU]` | `levels/.../02_core/03_pmu/` | performance monitoring unit |
| `[CSR]` | `levels/.../02_core/03_csr/` | RISC-V control/status register |
| `[TRAP]` | `levels/.../02_core/03_trap/` | trap/interrupt vector unit |
| `[PFE]` | `levels/.../02_core/03_prefetch/` | hardware prefetch engine |
| `[HAZ]` | `levels/.../03_pipeline/04_hazards/` | hazard-detection logic |
| `[FWD]` | `levels/.../03_pipeline/04_forward/` | forwarding/bypass mux |
| `[SQ]` | `levels/.../03_pipeline/04_squash/` | flush/squash controller |

### Cache hierarchy

| Symbol | Defined in | One-line role |
|---|---|---|
| `[L1]` | `levels/.../03_l1/` | per-core L1 (split I + D) |
| `[L2]` | `levels/.../01_chip/02_l2/` | per-core L2 |
| `[L3]` | `levels/.../01_chip/02_l3/` | shared LLC |
| `[CL]` | `levels/.../03_l1/04_cacheline/` | one cache line, ~64 bytes |
| `[MSHR]` | `levels/.../03_l1/04_mshr/` | miss-status holding register |
| `[MESI]` | `levels/.../03_l1/04_coherence/` | per-line coherence state machine |
| `[WB]` | `levels/.../03_l1/04_write_buffer/` | store/write buffer between core and L1 |
| `[DIR]` | `levels/.../02_l3/03_directory/` | coherence directory entry |
| `[VB]` | `levels/.../02_l3/03_victim_buffer/` | victim/eviction line buffer |
| `[REPL]` | `levels/.../02_l3/03_replacement/` | replacement-policy state (LRU/RRIP bits) |

### Chip-level

| Symbol | Defined in | One-line role |
|---|---|---|
| `[CORE]` | `levels/.../02_core/` | one fetch-decode-execute pipeline |
| `[CHIP]` | `levels/.../01_chip/` | one CPU socket: cores + uncore + memctrl |
| `[MEMCTRL]` | `levels/.../01_chip/02_memctrl/` | DRAM controller, channels |
| `[CLK]` | `levels/.../01_chip/02_clock/` | PLL + clock distribution tree |
| `[PMGR]` | `levels/.../01_chip/02_pmgr/` | power/DVFS controller (C-states, P-states) |

### DRAM / memory

| Symbol | Defined in | One-line role |
|---|---|---|
| `[RAM]` | `levels/00_computer/01_ram/` | main memory (DDR5 DIMMs) |
| `[RANK]` | `levels/.../01_ram/02_rank/` | group of DRAM chips activated together |
| `[DRAM]` | `levels/.../01_ram/02_dram_chip/` | one DRAM die |
| `[BANK]` | `levels/.../02_dram_chip/03_bank/` | independently-activatable row × col array |
| `[DCELL]` | `levels/.../03_bank/04_dram_cell/` | 1T1C bit cell (transistor + capacitor) |
| `[REFRESH]` | `levels/.../02_dram_chip/03_refresh/` | periodic row sweep restoring charge |

### Storage / SSD

| Symbol | Defined in | One-line role |
|---|---|---|
| `[DISK]` | `levels/00_computer/01_disk/` | SSD as a peripheral |
| `[SSDCTRL]` | `levels/.../01_disk/02_ssd_controller/` | flash controller SoC |
| `[FTL]` | `levels/.../02_ssd_controller/03_ftl/` | logical→physical mapping + wear leveling |
| `[GC]` | `levels/.../02_ssd_controller/03_gc/` | garbage collector reclaiming blocks |
| `[ECC]` | `levels/.../02_ssd_controller/03_ecc/` | LDPC/BCH error correction |
| `[NAND]` | `levels/.../01_disk/02_nand_die/` | NAND flash die |
| `[NCELL]` | `levels/.../02_nand_die/03_nand_cell/` | floating-gate flash cell |
| `[FCH]` | `levels/.../01_disk/_flash_channel/` | ONFI/Toggle channel to a NAND die |
| `[QP]` | `levels/.../_nvme_link/02_queue_pair/` | NVMe submission/completion queue pair |

### Bus / interconnect

| Symbol | Defined in | One-line role |
|---|---|---|
| `[PCIE]` | `levels/00_computer/_pcie/` | PCIe link (point-to-point serial) |
| `[LANE]` | `levels/.../_pcie/02_lane/` | one PCIe lane (TX + RX differential pairs) |
| `[TLP]` | `levels/.../_pcie/02_tlp/` | PCIe transaction-layer packet |

### OS / kernel

| Symbol | Defined in | One-line role |
|---|---|---|
| `[PROC]` | `levels/.../01_os/02_process/` | virtual address space (CODE/DATA/HEAP/STACK) |
| `[BIN]` | `levels/.../02_process/03_binary/` | ELF binary mapped into CODE region |
| `[MMU]` | `levels/.../01_os/02_mmu/` | virtual→physical translation hardware |
| `[TLB]` | `levels/.../02_mmu/03_tlb/` | translation cache, ASID-tagged |
| `[PT]` | `levels/.../01_os/02_pagetables/` | 4-level radix tree of PTEs |
| `[SYSCALL]` | `levels/.../01_os/_syscall/` | userspace↔kernel transition (RISC-V ECALL) |
| `[IRQ]` | `levels/.../01_os/_interrupt/` | hardware interrupt path |
| `[THREAD]` | `levels/.../01_os/02_thread/` | one execution context inside a process |
| `[RUNQ]` | `levels/.../01_os/02_scheduler/` | per-CPU runnable queue (CFS rb-tree) |
| `[CTX]` | `levels/.../01_os/_context_switch/` | saved register set during a switch |
| `[SIG]` | `levels/.../01_os/_signal/` | pending signal mask + handler frame |
| `[PIPE]` | `levels/.../02_ipc/03_pipe/` | kernel ring buffer between two fds |
| `[USOCK]` | `levels/.../02_ipc/03_unix_socket/` | unix-domain socket endpoint |
| `[SHM]` | `levels/.../02_ipc/03_shm/` | shared physical page, two address spaces |
| `[VFS]` | `levels/.../01_os/02_vfs/` | filesystem-agnostic dispatch layer |
| `[INODE]` | `levels/.../02_vfs/03_inode/` | on-disk file metadata + block map |
| `[DENTRY]` | `levels/.../02_vfs/03_dentry/` | path-component → inode cache node |
| `[PCACHE]` | `levels/.../01_os/02_pagecache/` | (inode, offset) → page mapping |
| `[BLOCKQ]` | `levels/.../01_os/02_block_layer/` | block I/O request queue + scheduler |
| `[DRV]` | `levels/.../01_os/02_driver/` | device driver instance |
| `[SLAB]` | `levels/.../01_os/02_kalloc/` | per-CPU slab/SLUB cache |
| `[PF]` | `levels/.../01_os/02_pagefault/` | page-fault handler entry |
| `[MMAP]` | `levels/.../01_os/_mmap/` | file→VMA→page-cache binding |
| `[DMA]` | `levels/.../01_os/_dma/` | device-to-RAM transfer descriptor |
| `[NAPI]` | `levels/.../01_os/_napi/` | RX softirq + NAPI poll connector |
| `[BOOT]` | `levels/00_computer/01_boot/` | firmware → bootloader → kernel init chain |

### Network (kernel-side)

| Symbol | Defined in | One-line role |
|---|---|---|
| `[SOCK]` | `levels/.../01_os/02_socket/` | kernel socket struct; bridges fd to net stack |
| `[SKB]` | `levels/.../02_socket/03_skbuff/` | `sk_buff` packet container |
| `[NETSTACK]` | `levels/.../01_os/02_netstack/` | protocol dispatch graph |
| `[TCP]` | `levels/.../02_netstack/03_tcp/` | TCP segmentation + reliability state |
| `[IP]` | `levels/.../02_netstack/03_ip/` | IP routing + L3 header |
| `[L2ETH]` | `levels/.../02_netstack/03_eth_l2/` | software ethernet L2 framing (distinct from cache `[L2]`) |
| `[QDISC]` | `levels/.../02_netstack/03_qdisc/` | per-device packet scheduler / queue |

### Network (hardware-side)

| Symbol | Defined in | One-line role |
|---|---|---|
| `[NIC]` | `levels/00_computer/01_network/02_nic/` | network interface controller |
| `[OFFLOAD]` | `levels/.../02_nic/03_offload/` | TSO/GSO/checksum/RSS hardware offloads |
| `[MAC]` | `levels/.../02_nic/03_mac/` | ethernet MAC: preamble/FCS/IPG |
| `[PHY]` | `levels/.../01_network/02_phy/` | ethernet PHY chip |
| `[PCS]` | `levels/.../02_phy/03_pcs/` | PHY line coding + scrambling |
| `[AFE]` | `levels/.../02_phy/03_line_driver/` | analog front-end / line driver / equalizer |
| `[FRAME]` | `levels/.../_ethernet_link/03_frame_bytes/` | literal on-wire ethernet frame layout |

## Reserved (meta, not real symbols)

- `...` — zoom-in marker
- `[BRACKETS]` — placeholder, never literally used

## Connectors with no `[SYM]` of their own (own a relationship, not an entity)

- `_dmi/` — CPU ↔ chipset link
- `_dram_bus/` — DDR5 channels
- `_dma_ring/` — NIC ↔ RAM DMA descriptor ring (uses `[DMA]`)
- `_nvme_link/` — NVMe-over-PCIe (uses `[QP]`, `[TLP]`)
- `_interconnect_ring/` — ring/mesh between cores
- `_ethernet_link/` — twisted pair (uses `[FRAME]` at child level)
