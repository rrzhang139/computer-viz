// Global execution state. Single source of truth read by every level component.
// Locked at end of Phase 2 (additive after that — new fields with `?` only, never rename).
// See /EXECUTION_SCHEMA.md for field semantics.

import { create } from 'zustand';

export type RegName =
  | 'x0' | 'x1' | 'x2' | 'x3' | 'x4' | 'x5' | 'x6' | 'x7'
  | 'x8' | 'x9' | 'x10' | 'x11' | 'x12' | 'x13' | 'x14' | 'x15'
  | 'x16' | 'x17' | 'x18' | 'x19' | 'x20' | 'x21' | 'x22' | 'x23'
  | 'x24' | 'x25' | 'x26' | 'x27' | 'x28' | 'x29' | 'x30' | 'x31'
  | 'pc';

export type AluOp = 'add' | 'sub' | 'and' | 'or' | 'xor' | 'sll' | 'srl' | 'sra' | 'slt' | 'sltu';

export type PipelineStage = 'F' | 'D' | 'X' | 'M' | 'WB';

export type CacheLevel = 'L1' | 'L2' | 'L3' | 'RAM';

export type PrivMode = 'U' | 'S' | 'M';

export interface AsmInstr {
  raw: number;
  mnemonic: string;
  rd: RegName | null;
  rs1: RegName | null;
  rs2: RegName | null;
  imm: number | null;
}

export interface MemTraffic {
  addr: number;
  paddr: number | null;
  kind: 'load' | 'store' | 'fetch';
  size: 1 | 2 | 4;
  level: CacheLevel | null;
}

export interface SyscallActive {
  num: number;
  phase: 'enter' | 'handle' | 'return';
}

export interface PendingInterrupt {
  source: 'timer' | 'nic' | 'disk';
  vector: number;
}

export interface NetActivity {
  dir: 'tx' | 'rx';
  bytes: number;
  protocol: 'eth' | 'tcp' | 'udp';
  stage: 'nic-ring' | 'phy' | 'wire';
}

export interface DiskActivity {
  dir: 'read' | 'write';
  lba: number;
  bytes: number;
  stage: 'nvme-queue' | 'pcie' | 'controller' | 'nand';
}

export interface PageWalk {
  level: 0 | 1 | 2 | 3;
  pteAddr: number;
}

export interface ExecutionState {
  pc: number;
  currentInstr: AsmInstr | null;
  cycle: number;
  retiredInstrs: number;

  pipelineStage: PipelineStage;
  microStep: number;
  activeCore: number;

  activeRegs: Set<RegName>;
  aluOp: AluOp | null;
  aluA: number | null;
  aluB: number | null;
  aluResult: number | null;

  memTraffic: MemTraffic | null;

  tlbHit: boolean | null;
  pageWalk: PageWalk | null;
  pageFault: boolean;

  electronTime_ps: number;

  privMode: PrivMode;
  syscallActive: SyscallActive | null;
  pendingInterrupt: PendingInterrupt | null;

  netActivity: NetActivity | null;
  diskActivity: DiskActivity | null;

  playbackRate: number;
  paused: boolean;
}

export interface ExecutionActions {
  step: () => void;
  stepCycle: () => void;
  stepMicro: () => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setPlaybackRate: (rate: number) => void;
}

const initialState: ExecutionState = {
  pc: 0,
  currentInstr: null,
  cycle: 0,
  retiredInstrs: 0,
  pipelineStage: 'F',
  microStep: 0,
  activeCore: 0,
  activeRegs: new Set(),
  aluOp: null,
  aluA: null,
  aluB: null,
  aluResult: null,
  memTraffic: null,
  tlbHit: null,
  pageWalk: null,
  pageFault: false,
  electronTime_ps: 0,
  privMode: 'U',
  syscallActive: null,
  pendingInterrupt: null,
  netActivity: null,
  diskActivity: null,
  playbackRate: 1.0,
  paused: true,
};

// Phase 5 will replace these stubs with a real RV32I simulator driven by the
// assembly snippet. For Phase 0 the stubs let components mount and render.
export const useExecution = create<ExecutionState & ExecutionActions>((set) => ({
  ...initialState,

  step: () => set((s) => ({ retiredInstrs: s.retiredInstrs + 1, cycle: s.cycle + 5 })),
  stepCycle: () => set((s) => ({ cycle: s.cycle + 1 })),
  stepMicro: () => set((s) => ({ microStep: s.microStep + 1 })),
  play: () => set({ paused: false }),
  pause: () => set({ paused: true }),
  reset: () => set(initialState),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
}));
