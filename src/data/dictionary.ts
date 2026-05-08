// dictionary.ts — technical terms used across the visualization.
// Wrap any technical term in `<Term name="...">...</Term>` (or use auto-detect
// in <TermText> for prose). Hover shows the definition.
//
// Adding a term: write the canonical key (lowercase, no punctuation) and
// list aliases the auto-scanner should also match. Definitions are 1 sentence.
// If a term maps to a level folder, set `folder` so click-to-navigate works.

export interface TermDef {
  name: string;
  aliases?: readonly string[];
  definition: string;
  unit?: { symbol: string; longName: string; scientific: string; anchor?: string };
  folder?: string;
  related?: readonly string[];
}

export const dictionary: Readonly<Record<string, TermDef>> = {
  // ── Hardware foundational ───────────────────────────────────────────
  transistor: {
    name: 'transistor',
    aliases: ['MOSFET', 'mosfet'],
    definition: 'A voltage-controlled switch made from doped silicon. Modern chips contain billions; each one can flip on or off in picoseconds.',
    folder: 'levels/00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop/06_gate/07_transistor',
    related: ['gate', 'CMOS'],
  },
  gate: {
    name: 'gate',
    aliases: ['logic gate', 'NAND', 'AND gate'],
    definition: 'A boolean function (AND, OR, NAND, etc.) built from 2–4 transistors. Every digital circuit decomposes into gates.',
    folder: 'levels/00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop/06_gate',
    related: ['transistor', 'flip-flop'],
  },
  'flip-flop': {
    name: 'flip-flop',
    aliases: ['flipflop', 'FF', 'latch'],
    definition: 'A storage cell that holds 1 bit, updated only on a clock edge. ~4 gates wired with a feedback loop.',
    folder: 'levels/00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop',
  },
  register: {
    name: 'register',
    definition: 'N flip-flops sharing a clock; stores one machine word (32 bits in RV32I, 64 bits in x86-64). The fastest memory in the system.',
    folder: 'levels/00_computer/01_chip/02_core/03_regfile/04_register',
  },
  ALU: {
    name: 'ALU',
    aliases: ['arithmetic logic unit'],
    definition: 'A pure combinational circuit that computes add/sub/and/or/xor/shift on two words. No clock — outputs appear within one cycle.',
    folder: 'levels/00_computer/01_chip/02_core/03_alu',
  },
  CMOS: {
    name: 'CMOS',
    definition: 'Complementary MOS — every gate has a paired NMOS (pulls down) + PMOS (pulls up) network. Modern chips are universally CMOS.',
  },

  // ── Cache hierarchy ─────────────────────────────────────────────────
  cache: {
    name: 'cache',
    definition: 'A small, fast memory that holds copies of recently-used data, sized so most accesses hit it instead of going to RAM.',
    related: ['L1', 'L2', 'L3', 'cache line'],
  },
  L1: {
    name: 'L1',
    aliases: ['L1 cache'],
    definition: 'Level-1 cache. ~32 KB per core. ~4-cycle hit latency. Split into L1-instruction + L1-data.',
    folder: 'levels/00_computer/01_chip/02_core/03_l1',
  },
  L2: {
    name: 'L2',
    aliases: ['L2 cache'],
    definition: 'Level-2 cache. ~256 KB–1 MB per core. ~12-cycle hit latency. Catches L1 misses before they spill to L3.',
    folder: 'levels/00_computer/01_chip/02_l2',
  },
  L3: {
    name: 'L3',
    aliases: ['L3 cache', 'LLC', 'last-level cache'],
    definition: 'Last-level cache, shared across all cores. ~8–64 MB. ~40-cycle hit latency. Last line of defense before RAM.',
    folder: 'levels/00_computer/01_chip/02_l3',
  },
  'cache line': {
    name: 'cache line',
    aliases: ['cacheline', 'cache block'],
    definition: 'The unit of cache transfer — typically 64 bytes. Even reading 1 byte fetches the whole line.',
    folder: 'levels/00_computer/01_chip/02_core/03_l1/04_cacheline',
  },
  MESI: {
    name: 'MESI',
    definition: 'Cache-coherence protocol: each line is Modified, Exclusive, Shared, or Invalid. Tracks which cores have a copy and who can write.',
    folder: 'levels/00_computer/01_chip/02_core/03_l1/04_coherence',
  },
  MSHR: {
    name: 'MSHR',
    aliases: ['miss status holding register'],
    definition: 'Tracks an in-flight cache miss so duplicate misses to the same line merge instead of issuing twice.',
    folder: 'levels/00_computer/01_chip/02_core/03_l1/04_mshr',
  },

  // ── Out-of-order core ──────────────────────────────────────────────
  pipeline: {
    name: 'pipeline',
    definition: 'The 5 stages F→D→X→M→WB (Fetch, Decode, eXecute, Memory, Writeback) overlap so each instruction takes 1 cycle of throughput, not 5.',
    folder: 'levels/00_computer/01_chip/02_core/03_pipeline',
  },
  ROB: {
    name: 'ROB',
    aliases: ['reorder buffer'],
    definition: 'Out-of-order cores execute instructions in any order but retire them through the ROB in program order, so the architectural state stays consistent.',
    folder: 'levels/00_computer/01_chip/02_core/03_rob',
  },
  'register renaming': {
    name: 'register renaming',
    aliases: ['rename', 'RAT'],
    definition: 'Maps the 32 architectural registers onto a larger physical register file, so two instructions writing the same arch register can run in parallel.',
    folder: 'levels/00_computer/01_chip/02_core/03_rename',
  },
  'branch predictor': {
    name: 'branch predictor',
    aliases: ['BTB', 'PHT'],
    definition: 'Guesses whether a branch will be taken before the condition is computed, so the pipeline can keep fetching instead of stalling.',
    folder: 'levels/00_computer/01_chip/02_core/03_frontend/04_predictor',
  },
  'speculative execution': {
    name: 'speculative execution',
    definition: 'Running instructions past a branch before knowing if the branch was correctly predicted; on misprediction the squash unit kills the bad work.',
  },

  // ── Memory ─────────────────────────────────────────────────────────
  RAM: {
    name: 'RAM',
    aliases: ['main memory', 'DRAM'],
    definition: 'Volatile main memory. Loses contents on power-off. ~100 ns access latency — about 100× slower than L1.',
    folder: 'levels/00_computer/01_ram',
  },
  DRAM: {
    name: 'DRAM',
    definition: 'Dynamic RAM — bits stored as charge on tiny capacitors that leak; needs refresh ~every 64 ms or it forgets.',
    folder: 'levels/00_computer/01_ram/02_dram_chip',
  },
  bank: {
    name: 'bank',
    aliases: ['DRAM bank'],
    definition: 'A 2D row × column grid inside a DRAM chip. Banks operate independently — accesses to different banks can overlap.',
    folder: 'levels/00_computer/01_ram/02_dram_chip/03_bank',
  },
  'row buffer': {
    name: 'row buffer',
    definition: 'When you read a DRAM row, the entire row is sensed into the row buffer (~8 KB). Subsequent reads to the same row are fast (column access only).',
  },
  TLB: {
    name: 'TLB',
    aliases: ['translation lookaside buffer'],
    definition: 'A small fully-associative cache (typically 64–4096 entries) of recent virtual→physical address translations. TLB hit ≈ 1 cycle; miss triggers a page-table walk.',
    folder: 'levels/00_computer/01_os/02_mmu/03_tlb',
  },
  MMU: {
    name: 'MMU',
    aliases: ['memory management unit'],
    definition: 'The hardware unit inside each core that translates every virtual address the program uses into a physical address in RAM, using the TLB and page tables.',
    folder: 'levels/00_computer/01_os/02_mmu',
  },
  'page table': {
    name: 'page table',
    aliases: ['page tables', 'PT'],
    definition: 'A multi-level radix tree (4 levels in x86-64, 3 in RV32 Sv32) that maps virtual page numbers to physical page numbers. Walked by the MMU on TLB miss.',
    folder: 'levels/00_computer/01_os/02_pagetables',
  },

  // ── OS ─────────────────────────────────────────────────────────────
  process: {
    name: 'process',
    definition: 'A program running with its own private virtual address space. Switching processes is heavy: page-table swap + TLB flush.',
    folder: 'levels/00_computer/01_os/02_process',
  },
  thread: {
    name: 'thread',
    definition: 'A lightweight execution context inside a process — its own registers and stack, but shares the address space with other threads in the same process.',
    folder: 'levels/00_computer/01_os/02_thread',
  },
  syscall: {
    name: 'syscall',
    aliases: ['system call'],
    definition: 'A controlled transition from userspace into the kernel (RISC-V `ecall` traps to the trap handler). The only way userspace can ask the kernel to do anything privileged.',
    folder: 'levels/00_computer/01_os/_syscall',
  },
  'context switch': {
    name: 'context switch',
    definition: 'Saving one thread\'s registers + restoring another\'s so the CPU can run a different thread. ~1 µs on Linux.',
    folder: 'levels/00_computer/01_os/_context_switch',
  },
  interrupt: {
    name: 'interrupt',
    aliases: ['IRQ'],
    definition: 'A hardware-driven jump that yanks the CPU into a kernel handler. Used for timers, NIC packets, disk completions — anything that can\'t wait for the kernel to poll.',
    folder: 'levels/00_computer/01_os/_interrupt',
  },
  'page fault': {
    name: 'page fault',
    definition: 'A trap raised by the MMU when a virtual address has no valid translation. The kernel handler decides: allocate a page (minor), read from disk (major), or kill the process.',
    folder: 'levels/00_computer/01_os/02_pagefault',
  },
  scheduler: {
    name: 'scheduler',
    definition: 'The kernel subsystem that picks which thread runs next on each core. Linux uses CFS — a red-black tree ordered by virtual runtime.',
    folder: 'levels/00_computer/01_os/02_scheduler',
  },
  DMA: {
    name: 'DMA',
    aliases: ['direct memory access'],
    definition: 'Hardware (NIC, SSD, GPU) reading and writing RAM directly without going through the CPU. The CPU sets up a descriptor; the device does the transfer.',
    folder: 'levels/00_computer/01_os/_dma',
  },
  mmap: {
    name: 'mmap',
    definition: 'A syscall that maps a file (or anonymous pages) into the process\'s address space. Reads/writes to that range translate to file I/O via the page cache.',
    folder: 'levels/00_computer/01_os/_mmap',
  },
  'page cache': {
    name: 'page cache',
    definition: 'The kernel\'s in-RAM cache of file pages, keyed by (inode, offset). Often consumes most of the system\'s "free" memory; transparent to apps.',
    folder: 'levels/00_computer/01_os/02_pagecache',
  },

  // ── Networking ─────────────────────────────────────────────────────
  NIC: {
    name: 'NIC',
    aliases: ['network interface controller', 'network card'],
    definition: 'The hardware that puts packets onto the wire. Has its own MAC + DMA engine + ring buffers shared with the kernel.',
    folder: 'levels/00_computer/01_network/02_nic',
  },
  PHY: {
    name: 'PHY',
    definition: 'Physical-layer chip that turns digital bits into voltages on the wire (and back). Handles line coding, scrambling, signal conditioning.',
    folder: 'levels/00_computer/01_network/02_phy',
  },
  'sk_buff': {
    name: 'sk_buff',
    aliases: ['skbuff', 'SKB'],
    definition: 'The Linux kernel\'s packet container. Carries the bytes plus pointers to where each protocol header begins, so layers can push/pop headers without copying.',
    folder: 'levels/00_computer/01_os/02_socket/03_skbuff',
  },
  socket: {
    name: 'socket',
    definition: 'The kernel struct linked to a userspace file descriptor; holds send/receive buffers and walks the protocol stack on each `send`/`recv`.',
    folder: 'levels/00_computer/01_os/02_socket',
  },

  // ── Storage ────────────────────────────────────────────────────────
  SSD: {
    name: 'SSD',
    definition: 'Solid-state drive. NAND flash chips behind a controller. ~100 µs reads, ~500 µs writes, ~5 ms erases. Pages can\'t be overwritten — only erased blocks of pages.',
    folder: 'levels/00_computer/01_disk',
  },
  NAND: {
    name: 'NAND',
    aliases: ['NAND flash'],
    definition: 'Non-volatile flash storage. Bits stored as trapped charge on a floating gate. Wears out: each cell tolerates ~1k–10k program/erase cycles.',
    folder: 'levels/00_computer/01_disk/02_nand_die',
  },
  FTL: {
    name: 'FTL',
    aliases: ['flash translation layer'],
    definition: 'The SSD controller\'s mapping table from logical block addresses (what the OS sees) to physical NAND pages, plus wear-leveling and garbage collection.',
    folder: 'levels/00_computer/01_disk/02_ssd_controller/03_ftl',
  },
  PCIe: {
    name: 'PCIe',
    aliases: ['PCI Express'],
    definition: 'High-speed point-to-point serial link between CPU and peripherals (GPU, NVMe, NIC). Each lane is two differential pairs (TX + RX); links are ×1, ×4, ×8, ×16.',
    folder: 'levels/00_computer/_pcie',
  },
  NVMe: {
    name: 'NVMe',
    definition: 'Storage-over-PCIe protocol. Submission/completion queue pairs in host RAM; doorbell writes tell the SSD to fetch commands.',
    folder: 'levels/00_computer/01_disk/_nvme_link',
  },

  // ── Units ──────────────────────────────────────────────────────────
  ps: {
    name: 'ps',
    definition: 'Picosecond — one trillionth of a second (10⁻¹²). Light travels 0.3 mm in 1 ps. A single transistor switches in ~10–100 ps.',
    unit: { symbol: 'ps', longName: 'picosecond', scientific: '10⁻¹² s', anchor: 'transistor switch' },
  },
  ns: {
    name: 'ns',
    definition: 'Nanosecond — one billionth of a second (10⁻⁹). Light travels 30 cm in 1 ns. A 3 GHz CPU finishes ~3 cycles in 1 ns.',
    unit: { symbol: 'ns', longName: 'nanosecond', scientific: '10⁻⁹ s', anchor: 'one CPU cycle ~0.3 ns' },
  },
  µs: {
    name: 'µs',
    aliases: ['us', 'microsecond'],
    definition: 'Microsecond — one millionth of a second (10⁻⁶). A context switch takes ~1 µs. An SSD random read ~100 µs.',
    unit: { symbol: 'µs', longName: 'microsecond', scientific: '10⁻⁶ s', anchor: 'context switch ~1 µs' },
  },
  ms: {
    name: 'ms',
    aliases: ['millisecond'],
    definition: 'Millisecond — one thousandth of a second (10⁻³). A spinning-disk seek ~10 ms. A network round-trip across continents ~100 ms.',
    unit: { symbol: 'ms', longName: 'millisecond', scientific: '10⁻³ s' },
  },
  cycle: {
    name: 'cycle',
    definition: 'One tick of the CPU clock. At 3 GHz that\'s ~0.33 ns. Modern cores retire 1–4 instructions per cycle when the pipeline is full.',
  },
};

export const allTerms = Object.values(dictionary);

// Match longest-first so multi-word terms win over their substrings.
export const termPattern = (() => {
  const keys = new Set<string>();
  for (const t of allTerms) {
    keys.add(t.name);
    for (const a of t.aliases ?? []) keys.add(a);
  }
  const sorted = [...keys].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'g');
})();

export function lookupTerm(text: string): TermDef | null {
  const lower = text.toLowerCase();
  for (const t of allTerms) {
    if (t.name.toLowerCase() === lower) return t;
    for (const a of t.aliases ?? []) {
      if (a.toLowerCase() === lower) return t;
    }
  }
  return null;
}
