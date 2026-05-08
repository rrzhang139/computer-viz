# EXECUTION_SCHEMA — global state read by every level

**Locked after Phase 2.** Additive changes only after lock (new fields with `?` optional). Renames forbidden.

The TypeScript source of truth lives at `src/store/executionState.ts`. This doc explains *what each field means* so non-frontend agents can write `execution.md` correctly.

## ExecutionState

```ts
interface ExecutionState {
  // ── Program state ────────────────────────────────────────────
  pc: number;                          // RISC-V program counter (word-aligned)
  currentInstr: AsmInstr | null;       // decoded instruction at pc
  cycle: number;                       // global cycle index (monotonic)
  retiredInstrs: number;               // count of completed instructions

  // ── Pipeline ─────────────────────────────────────────────────
  pipelineStage: 'F' | 'D' | 'X' | 'M' | 'WB';
  microStep: number;                   // 0..N within current stage (sub-cycle slider)
  activeCore: number;                  // which core is executing this step

  // ── Datapath ─────────────────────────────────────────────────
  activeRegs: Set<RegName>;            // registers read or written this cycle
  aluOp: AluOp | null;                 // 'add' | 'sub' | 'and' | 'or' | 'xor' | 'sll' | 'srl' | 'sra' | 'slt' | null
  aluA: number | null;                 // ALU operand A this cycle
  aluB: number | null;
  aluResult: number | null;

  // ── Memory traffic ──────────────────────────────────────────
  memTraffic: {
    addr: number;                      // virtual address
    paddr: number | null;              // physical address (null until MMU resolves)
    kind: 'load' | 'store' | 'fetch';
    size: 1 | 2 | 4;                   // bytes (RV32I)
    level: 'L1' | 'L2' | 'L3' | 'RAM' | null;  // where it currently is
  } | null;

  // ── Address translation ────────────────────────────────────
  tlbHit: boolean | null;              // null = no translation in flight
  pageWalk: { level: 0 | 1 | 2 | 3; pteAddr: number } | null;
  pageFault: boolean;

  // ── Time (electron-level animation only) ───────────────────
  electronTime_ps: number;             // 0..cycleTime_ps within current cycle

  // ── OS / privilege ──────────────────────────────────────────
  privMode: 'U' | 'S' | 'M';           // user / supervisor / machine
  syscallActive: { num: number; phase: 'enter' | 'handle' | 'return' } | null;
  pendingInterrupt: {
    source: 'timer' | 'nic' | 'disk';
    vector: number;
  } | null;

  // ── I/O ──────────────────────────────────────────────────────
  netActivity: {
    dir: 'tx' | 'rx';
    bytes: number;
    protocol: 'eth' | 'tcp' | 'udp';
    stage: 'nic-ring' | 'phy' | 'wire';   // where on the network path
  } | null;
  diskActivity: {
    dir: 'read' | 'write';
    lba: number;
    bytes: number;
    stage: 'nvme-queue' | 'pcie' | 'controller' | 'nand';
  } | null;

  // ── Playback control ──────────────────────────────────────
  playbackRate: number;                // 1.0 = normal, 0.1 = 10x slow, etc.
  paused: boolean;
}

type RegName = 'x0' | 'x1' | ... | 'x31' | 'pc';
type AluOp = 'add' | 'sub' | 'and' | 'or' | 'xor' | 'sll' | 'srl' | 'sra' | 'slt' | 'sltu';

interface AsmInstr {
  raw: number;                         // 32-bit encoded
  mnemonic: string;                    // 'addi', 'add', 'sw', etc.
  rd: RegName | null;
  rs1: RegName | null;
  rs2: RegName | null;
  imm: number | null;
}
```

## Derived selectors (pure functions, never stored)

```ts
function gatesActive(s: ExecutionState): Set<GateId>
function transistorsSwitching(s: ExecutionState): Set<TransistorId>
function electronFlowVectors(s: ExecutionState): FlowVector[]
function cacheLineState(s: ExecutionState): { level: string; index: number; way: number } | null
function pcieLanesActive(s: ExecutionState): Set<LaneId>
function syscallPathHighlight(s: ExecutionState): SyscallPathStep | null
```

These are recomputed every render from the state above. **Never** stored in the Zustand store. Each level's `execution.md` declares which selector(s) it uses.

## Stepping API

```ts
step()         // advance 1 logical assembly instruction
stepCycle()    // advance 1 cycle (visible at chip/core)
stepMicro()    // advance 1 microStep (sub-cycle slider)
play()         // start playback at playbackRate
pause()
reset()
```

## Conventions for `execution.md` per level

Each level's `execution.md` answers two questions:

1. **Which fields of `ExecutionState` does this level read?**
2. **For each field, how does the value change what is highlighted?**

Example (`02_core/execution.md`):
- Reads: `pipelineStage`, `aluOp`, `activeRegs`, `pc`, `memTraffic.kind`
- Highlights:
  - `pipelineStage='F'` → glow on Fetch box
  - `pipelineStage='X' && aluOp` → glow on ALU box, label shows `aluOp`
  - `activeRegs` non-empty → those register labels in the regfile pulse
