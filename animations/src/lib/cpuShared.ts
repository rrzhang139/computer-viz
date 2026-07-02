// Shared core for the assembled-CPU pages (cpu, cpu_ldst — and any future
// variant: branch, pipeline). Both pages are the SAME fetch→decode→read→execute
// trunk; each variant adds blocks after it (data memory, write-back MUX, …).
// This module owns everything that is provably identical between them:
// palette, ISA decode, the trunk's terminals + wire routes, common net/embed
// lighting, readout, run/reset controls, and the trunk drill-downs.

import { x, type Bit, type Pt } from "./datapath";

// ── ISA (toy, 10-bit word: opcode|func|rs1|rs2|rd — 2 bits each). ──────────
// opcode = the instruction KIND: 00 R-type, 10 LW, 11 SW (01 reserved: branch).
// func = the ALU operation (00 ADD, 01 AND, 10 OR, 11 XOR) — RISC-V's funct.
// Like a real machine, the opcode never leaves the decoder as data — its
// control unit decodes it, truth-table style, into memToReg / memWrite.
export type Instr = { opc: number; op: number; rs1: number; rs2: number; rd: number };
export const decodeInstr = (w: string): Instr => ({
  opc: parseInt(w.slice(0, 2), 2), op: parseInt(w.slice(2, 4), 2),
  rs1: parseInt(w.slice(4, 6), 2), rs2: parseInt(w.slice(6, 8), 2), rd: parseInt(w.slice(8, 10), 2),
});
export const ctrlOf = (i: Instr) => ({
  memToReg: (i.opc === 2 ? 1 : 0) as Bit,   // LW: write-back comes from memory
  memWrite: (i.opc === 3 ? 1 : 0) as Bit,   // SW: arm the memory write port
});
export const hiLo = (v: number): [Bit, Bit] => [((v >> 1) & 1) as Bit, (v & 1) as Bit];
export const SEED: Bit[] = [1, 1, 0, 0];

// Snapshots cross a storage boundary (sessionStorage JSON) — validate, don't
// cast. A corrupt element falls back to its seed, never to NaN-in-an-index.
export const asBits4 = (v: unknown, seed: Bit[]): Bit[] =>
  [0, 1, 2, 3].map((i) => {
    const b = Array.isArray(v) ? v[i] : undefined;
    return b === 1 || b === "1" ? 1 : b === 0 || b === "0" ? 0 : seed[i];
  });

// ── Symbol → wire colour (bits of one symbol share a hue). Variants extend. ──
export const CPU_BASE_COLORS: Record<string, string> = {
  clk: "#56ccf2",                                              // clock — cyan
  pcnext: "#6f8cff", addr0: "#6f8cff", addr1: "#6f8cff",        // PC / address — blue
  instr: "#b98cff",                                            // instruction word (/8) — violet
  rs1h: "#57e08b", rs1l: "#57e08b",                            // rs1 field — green
  rs2h: "#2fcfc7", rs2l: "#2fcfc7",                            // rs2 field — teal
  rd0: "#ff6fae", rd1: "#ff6fae",                              // rd field → write addr — pink
  op: "#ffcf3a", op0: "#ffcf3a", op1: "#ffcf3a",                // operation (control) — amber
  rdataA: "#57e08b",                                           // read operand A — green
  rdataB: "#2fcfc7",                                           // read operand B — teal
  aluY: "#ff8a3d",                                             // ALU result — orange
  wb: "#ff6fae",                                               // write-back return — pink
  memwrite: "#ffcf3a", memtoreg: "#ffcf3a",                    // control lines — amber
};

// ── Fixed CPU-level terminals (drawn in both pages' HTML at these coords) ───
export const CPU_TERMS = {
  CLK: { x: -100, y: 1200 }, ONE: { x: 1460, y: 410 }, ZERO: { x: 3090, y: 1080 },
  COUT: { x: 4090, y: 560 },
  PC_CLK: { x: 360, y: 130 }, PC_A1: { x: 480, y: 250 }, PC_A0: { x: 480, y: 350 },
} as const;

type RouteFn = (id: string, pts: (Pt | undefined)[], markEnds?: Pt[]) => void;
export type EmbedPins = Record<string, Pt>;

// ── The trunk's wiring — identical on every CPU page ────────────────────────
// clock → PC (over the top) + register file; PC address → imem; instr bus →
// decoder; field buses → register file + ALU op; write-enable, operands, carry.
export function routeCpuTrunk(R: RouteFn, p: { IM: EmbedPins; IDEC: EmbedPins; RF: EmbedPins; AL: EmbedPins }) {
  const { IM, IDEC, RF, AL } = p;
  const { CLK, ONE, ZERO, COUT, PC_CLK, PC_A1, PC_A0 } = CPU_TERMS;
  R("wClkPc", [CLK, { x: -100, y: 100 }, { x: PC_CLK.x, y: 100 }, PC_CLK]);
  R("wClkRf", [CLK, x(1440, CLK), x(1440, RF.pinClk), RF.pinClk], [RF.pinClk]);
  R("wPcA1", [PC_A1, { x: 504, y: 250 }, { x: 504, y: 560 }, { x: 24, y: 560 }, x(24, IM.pinAddr1), IM.pinAddr1], [IM.pinAddr1]);
  R("wPcA0", [PC_A0, { x: 516, y: 350 }, { x: 516, y: 548 }, { x: 36, y: 548 }, x(36, IM.pinAddr0), IM.pinAddr0], [IM.pinAddr0]);
  R("wInstr", [IM.pinRdata, x(590, IM.pinRdata), x(590, IDEC.pinInstr), IDEC.pinInstr], [IM.pinRdata, IDEC.pinInstr]);
  R("wRfA1", [IDEC.pinRaddrA, x(1440, IDEC.pinRaddrA), x(1440, RF.pinRaddrA1), RF.pinRaddrA1], [IDEC.pinRaddrA, RF.pinRaddrA1]);
  R("wRfA0", [x(1440, RF.pinRaddrA1), x(1440, RF.pinRaddrA0), RF.pinRaddrA0], [RF.pinRaddrA0]);
  R("wRfB1", [IDEC.pinRaddrB, x(1456, IDEC.pinRaddrB), x(1456, RF.pinRaddrB1), RF.pinRaddrB1], [IDEC.pinRaddrB, RF.pinRaddrB1]);
  R("wRfB0", [x(1456, RF.pinRaddrB1), x(1456, RF.pinRaddrB0), RF.pinRaddrB0], [RF.pinRaddrB0]);
  R("wWaddr1", [IDEC.pinWaddr, x(1472, IDEC.pinWaddr), x(1472, RF.pinWaddr1), RF.pinWaddr1], [IDEC.pinWaddr, RF.pinWaddr1]);
  R("wWaddr0", [x(1472, RF.pinWaddr1), x(1472, RF.pinWaddr0), RF.pinWaddr0], [RF.pinWaddr0]);
  R("wAluOp1", [IDEC.pinOp, x(1424, IDEC.pinOp), { x: 1424, y: 400 }, { x: 3080, y: 400 }, x(3080, AL.pinOp1), AL.pinOp1], [IDEC.pinOp, AL.pinOp1]);
  R("wAluOp0", [{ x: 3080, y: 400 }, x(3080, AL.pinOp0), AL.pinOp0], [AL.pinOp0]);
  R("wWe", [ONE, x(1490, ONE), x(1490, RF.pinWe), RF.pinWe], [RF.pinWe]);
  R("wRdataA", [RF.pinRdata, x(3070, RF.pinRdata), x(3070, AL.pinA), AL.pinA], [RF.pinRdata, AL.pinA]);
  R("wRdataB", [RF.pinRdataB, x(3086, RF.pinRdataB), x(3086, AL.pinB), AL.pinB], [RF.pinRdataB, AL.pinB]);
  R("wAluCin", [ZERO, x(3115, ZERO), x(3115, AL.pinCin), AL.pinCin], [AL.pinCin]);
  R("wAluCout", [AL.pinCout, x(4090, AL.pinCout), COUT], [AL.pinCout]);
}

// ── Light the trunk (nets, bodies, the five embeds, readout) ────────────────
// The page computes its own Y / write-back value / write-enable and hands them
// in; everything downstream of the trunk stays in the page's render().
export type TrunkState = {
  clk: Bit; pc: number; i: Instr;
  A: Bit; B: Bit; Y: Bit;
  regs: Bit[]; we: Bit; wdata: Bit;
};

type Toolkit = {
  setNet(net: string, on: number): void;
  setPin(id: string, on: number): void;
  setBody(id: string, on: number): void;
  lightEmbed(hostId: string, wireMap: Record<string, number>, bodyMap?: Record<string, number>): void;
};

export function renderCpuTrunk(tk: Toolkit, s: TrunkState) {
  const { setNet, setPin, setBody, lightEmbed } = tk;
  const [a1, a0] = hiLo(s.pc);
  const [rs1h, rs1l] = hiLo(s.i.rs1), [rs2h, rs2l] = hiLo(s.i.rs2);
  const [rd1, rd0] = hiLo(s.i.rd), [op1, op0] = hiLo(s.i.op);
  const { A, B, Y } = s;

  setNet("clk", s.clk); setPin("pinClk", s.clk);
  setNet("pcnext", 1); setNet("addr1", a1); setNet("addr0", a0);
  setNet("rs1h", rs1h); setNet("rs1l", rs1l); setNet("rs2h", rs2h); setNet("rs2l", rs2l);
  setNet("rd1", rd1); setNet("rd0", rd0); setNet("op1", op1); setNet("op0", op0);
  setNet("one", 1); setPin("pinOne", 1);
  setNet("zero", 0); setPin("pinZero", 0);
  setNet("rdataA", A); setNet("rdataB", B);
  setNet("instr", 1);   // a word is always being fetched

  setBody("gPc", 1); setBody("gImem", 1); setBody("gIdecode", 1);
  setBody("gRegfile", (A || B) as Bit); setBody("gAlu", 1);

  lightEmbed("pcDetail", { clk: s.clk, addr1: a1, addr0: a0, pcnext: 1 },
    { gPcAdd: 1, gPcReg: (s.pc !== 0 ? 1 : 0) as Bit });
  lightEmbed("imemDetail", {
    addr1: a1, addr0: a0, rdata: 1,
    word0: (s.pc === 0 ? 1 : 0), word1: (s.pc === 1 ? 1 : 0), word2: (s.pc === 2 ? 1 : 0), word3: (s.pc === 3 ? 1 : 0),
  }, {
    gWord0: (s.pc === 0 ? 1 : 0), gWord1: (s.pc === 1 ? 1 : 0), gWord2: (s.pc === 2 ? 1 : 0), gWord3: (s.pc === 3 ? 1 : 0), gReadmux: 1,
  });
  const ctl = ctrlOf(s.i);
  const [oc1, oc0] = hiLo(s.i.opc);
  lightEmbed("idecodeDetail", {
    instr: 1, opcode: (oc1 || oc0) as Bit, op: (op1 || op0) as Bit,
    raddrA: (rs1h || rs1l) as Bit, raddrB: (rs2h || rs2l) as Bit, waddr: (rd1 || rd0) as Bit,
    memtoreg: ctl.memToReg, memwrite: ctl.memWrite,
  }, {
    gBitOc1: oc1, gBitOc0: oc0, gBitOp1: op1, gBitOp0: op0, gBitA1: rs1h, gBitA0: rs1l, gBitB1: rs2h, gBitB0: rs2l, gBitW1: rd1, gBitW0: rd0,
    gCtlMemToReg: ctl.memToReg, gCtlMemWrite: ctl.memWrite,
  });
  lightEmbed("regfileDetail", {
    raddrA1: rs1h, raddrA0: rs1l, raddrB1: rs2h, raddrB0: rs2l,
    waddr1: rd1, waddr0: rd0, we: s.we, clk: s.clk, wdata: s.wdata,
    q0: s.regs[0], q1: s.regs[1], q2: s.regs[2], q3: s.regs[3], rdata: A, rdataB: B,
  }, { gDecoder: 1, gReg0: s.regs[0], gReg1: s.regs[1], gReg2: s.regs[2], gReg3: s.regs[3], gMux: A, gMuxB: B });
  lightEmbed("aluDetail", { op1, op0, Cin: 0, A, B, add: (A ^ B) as Bit, and: (A & B) as Bit, or: (A | B) as Bit, xor: (A ^ B) as Bit, Y },
    { gFa: 1, gAnd: A & B, gOr: A | B, gXor: A ^ B, gMux: Y });

  return { a1, a0, rs1h, rs1l, rs2h, rs2l, rd1, rd0, op1, op0 };
}

const T = (id: string) => document.getElementById(id) as HTMLElement;
export function renderReadout(r: { a1: Bit; a0: Bit; instr: string; A: Bit; B: Bit; result: Bit; regs: string }) {
  T("rPc").textContent = `${r.a1}${r.a0}`;
  T("rInstr").textContent = r.instr;
  T("rA").textContent = String(r.A); T("rB").textContent = String(r.B); T("rY").textContent = String(r.result);
  T("rRegs").textContent = r.regs;
}

// ── Run / reset controls ─────────────────────────────────────────────────────
// One clock pulse per press: clk↑ render, then commit + clk↓ render + persist.
// `busy` ignores presses while a pulse is in flight — a double-click must not
// commit the same instruction twice.
export function bindCpuControls(o: {
  setClk(b: Bit): void; commit(): void; reset(): void;
  render(): void; persist(): void;
}, pulseMs = 320) {
  let busy = false;
  document.getElementById("btnStep")!.addEventListener("click", () => {
    if (busy) return;
    busy = true;
    o.setClk(1); o.render();
    setTimeout(() => {
      o.commit(); o.setClk(0); o.render(); o.persist();
      busy = false;
    }, pulseMs);
  });
  document.getElementById("btnReset")!.addEventListener("click", () => {
    if (busy) return;
    o.reset(); o.setClk(0); o.render();
  });
}

// ── Trunk drill-downs (PC, imem, decode, regfile, ALU — every CPU page) ─────
export function bindTrunkDrills(go: (href: string, params: Record<string, string | number>) => void,
  cur: () => { pc: number; i: Instr; regs: Bit[]; we: Bit }) {
  document.getElementById("slot-pc")!.addEventListener("click", () => go("/counter.html", { which: "pc" }));
  document.getElementById("slot-imem")!.addEventListener("click", () => {
    const { pc } = cur();
    go("/mem.html", { which: "instruction-memory", addr1: (pc >> 1) & 1, addr0: pc & 1 });
  });
  document.getElementById("slot-idecode")!.addEventListener("click", () => {
    const { i } = cur();
    go("/idecode.html", { which: "decode", oc1: (i.opc >> 1) & 1, oc0: i.opc & 1, op1: (i.op >> 1) & 1, op0: i.op & 1, raddrA1: (i.rs1 >> 1) & 1, raddrA0: i.rs1 & 1, raddrB1: (i.rs2 >> 1) & 1, raddrB0: i.rs2 & 1, waddr1: (i.rd >> 1) & 1, waddr0: i.rd & 1 });
  });
  document.getElementById("slot-regfile")!.addEventListener("click", () => {
    const { i, we } = cur();
    go("/regfile.html", { which: "regfile", raddrA1: (i.rs1 >> 1) & 1, raddrA0: i.rs1 & 1, raddrB1: (i.rs2 >> 1) & 1, raddrB0: i.rs2 & 1, waddr1: (i.rd >> 1) & 1, waddr0: i.rd & 1, we });
  });
  document.getElementById("slot-alu")!.addEventListener("click", () => {
    const { i, regs } = cur();
    go("/alu1.html", { which: "alu", A: regs[i.rs1], B: regs[i.rs2], Cin: 0, op1: (i.op >> 1) & 1, op0: i.op & 1 });
  });
}
