import { initPanel } from "./panel";
import { initToc } from "./toc";
import { buildDrillUrl, initDrillBreadcrumb, loadSnapshot, saveSnapshot, clearSnapshot } from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";
import { applyWireColors } from "./wireColors";
import { initProseHighlight } from "./proseHighlight";
import { datapath, x, y, type Bit, type Pt } from "./lib/datapath";
import {
  CPU_BASE_COLORS, CPU_TERMS, SEED, asBits4, ctrlOf, decodeInstr, hiLo, annotateImemProgram,
  routeCpuTrunk, renderCpuTrunk, renderReadout, bindCpuControls, bindTrunkDrills,
  type Instr,
} from "./lib/cpuShared";

// CPU (branch) — the load/store datapath PLUS the branch: opcode 01 = BEQ
// (if regs[rs1] == regs[rs2], next PC = the rd field, used as the target).
// Textbook single-cycle shape (P&H): the decoder's control unit raises Branch
// and FORCES the ALU op to the compare (ALUOp; 1-bit subtract = XOR), the
// PCSrc block computes PCSrc = Branch AND Zero, and the PC-source MUX picks
// pc+1 vs. the target.  op 00 R-type(func), 01 BEQ, 10 LW, 11 SW.
//
// The fetch→execute trunk is shared via src/lib/cpuShared.ts; this file owns
// the branch pieces (target wires, PCSrc logic, PC-source MUX preview) plus
// the memory stage carried over from cpu_ldst.

const svg = document.getElementById("cpu") as unknown as SVGSVGElement;
const tk = datapath(svg);
const { R, stub, setupPulses, setNet, setPin, setBody, lightEmbed } = tk;

// ── ISA + demo program ──────────────────────────────────────────────────────
// AND r3,r0,r1 → r3=1 ; BEQ r0,r1,→3 (r0==r1 → TAKEN, skips pc2) ;
// ADD r2,r0,r1 → the victim: never runs, r2 stays 0 ; XOR r3,r0,r1 → r3=0.
const OP_NAMES = ["ADD", "AND", "OR", "XOR"];
const PROGRAM = ["0001000111", "0100000110", "0000000110", "0011000111"];
const rtype = (a: Bit, b: Bit, op: number): Bit =>
  [(a ^ b) as Bit, (a & b) as Bit, (a | b) as Bit, (a ^ b) as Bit][op];

// control signals — the decoder's control unit plus the branch row.
// A branch writes nothing: no register, no memory — only the PC.
const ctrl = (i: Instr) => {
  const c = ctrlOf(i);
  return { ...c, memRead: c.memToReg, regWrite: (c.memWrite || c.branch ? 0 : 1) as Bit };
};
const aluResult = (a: Bit, b: Bit, i: Instr): Bit =>
  i.opc >= 2 ? a : rtype(a, b, i.opc === 1 ? 3 : i.op);
// PCSrc = Branch AND Zero; for BEQ the ALU runs XOR, so Zero ⇔ Y == 0.
const pcsrcOf = (i: Instr, Y: Bit): Bit => (i.opc === 1 && Y === 0 ? 1 : 0);

// ── State ───────────────────────────────────────────────────────────────────
// `skipped` remembers the cell a taken branch jumped over (−1 = none), so the
// instruction-memory preview can mark it red — the visible hole in the fetch
// sequence is the whole lesson.
type Snap = { pc: number; regs: Bit[]; mem: Bit[]; skipped: number };
const SNAP_KEY = "cpu_branch";
const _s = loadSnapshot<Snap>(SNAP_KEY);
let pc = (Number(_s?.pc) || 0) & 0b11;
const regs: Bit[] = asBits4(_s?.regs, SEED);
const mem: Bit[] = asBits4(_s?.mem, [0, 0, 0, 0]);
let skipped = Number.isInteger(_s?.skipped) && (_s!.skipped >= 0 && _s!.skipped <= 3) ? _s!.skipped : -1;
let clk: Bit = 0;

// ── Embed every child page; route the trunk + branch + memory stage. ────────
const embeds = autoFillEmbeds(svg);
const IM: Record<string, Pt> = embeds.get("slot-imem") || {};
const IDEC: Record<string, Pt> = embeds.get("slot-idecode") || {};
const RF: Record<string, Pt> = embeds.get("slot-regfile") || {};
const AL: Record<string, Pt> = embeds.get("slot-alu") || {};
const DM: Record<string, Pt> = embeds.get("slot-dmem") || {};
const MX: Record<string, Pt> = embeds.get("slot-wbmux") || {};
const PS: Record<string, Pt> = embeds.get("slot-pcsrc") || {};
const PC: Record<string, Pt> = embeds.get("slot-pc") || {};

const { CLK } = CPU_TERMS;
const ZERO2 = { x: 560, y: 1120 };
const MEMWRITE = { x: 540, y: 1240 }, MEMTOREG = { x: 3120, y: 1330 };

routeCpuTrunk(R, { IM, IDEC, RF, AL, PC });

// ── Branch stage ────────────────────────────────────────────────────────────
// ALU result → the PCSrc block's Zero detector (over the ALU's top; for BEQ
// this wire IS the comparison: XOR of the two reads, 0 ⇔ equal).
if (PS.pinResult) {
  R("wResultY", [AL.pinY, x(4100, AL.pinY), { x: 4100, y: 110 }, { x: 3230, y: 110 }, y(PS.pinResult.y, { x: 3230, y: 0 }), PS.pinResult], [AL.pinY, PS.pinResult]);
}
// Branch control: born at the embedded decoder's real pin (01·beq row), solid
// stub off the pin, dotted schematic run across the datapath, solid stub onto
// the embedded PCSrc block's Branch pin.
if (IDEC.pinBranch && PS.pinBranch) {
  const bStub = { x: 1440, y: IDEC.pinBranch.y };
  const bIn = { x: 3230, y: PS.pinBranch.y };
  R("wCtlBranch", [IDEC.pinBranch, bStub]);
  R("ctrlBranch", [bStub, { x: 3200, y: bStub.y }, { x: 3200, y: bIn.y }, bIn]);
  R("wPcsrcBr", [bIn, PS.pinBranch], [PS.pinBranch]);
}
// The decision: solid stub off the embedded PCSrc output pin, dotted run over
// the top of the datapath, solid drop onto the PC MUX's select pin.
if (PS.pinPcsrc && PC.pinPcsrc) {
  const pOut = { x: 3760, y: PS.pinPcsrc.y };
  R("wPcsrcOut", [PS.pinPcsrc, pOut], [PS.pinPcsrc]);
  R("ctrlPcsrc", [pOut, { x: 3790, y: pOut.y }, { x: 3790, y: 70 }, { x: PC.pinPcsrc.x - 30, y: 70 }]);
  R("wPcsrcIn", [{ x: PC.pinPcsrc.x - 30, y: 70 }, x(PC.pinPcsrc.x - 30, PC.pinPcsrc), PC.pinPcsrc], [PC.pinPcsrc]);
}
// Branch target: the rd field loops BACK into fetch — the wire that makes a
// branch a branch. Rides the y=500/512 lanes above the decoder, then climbs
// the far-left edge into the PC MUX's in1.
R("wImm1", [IDEC.pinWaddr, x(1486, IDEC.pinWaddr), { x: 1486, y: 500 }, { x: 20, y: 500 }, PC.pinImm1 && y(PC.pinImm1.y, { x: 20, y: 0 }), PC.pinImm1], [PC.pinImm1]);
R("wImm0", [{ x: 1486, y: 512 }, { x: 8, y: 512 }, PC.pinImm0 && y(PC.pinImm0.y, { x: 8, y: 0 }), PC.pinImm0], [PC.pinImm0]);

// ── MEM (data memory) + write-back MUX — carried over from cpu_ldst ────────
R("wAluY", [AL.pinY, x(4120, AL.pinY), { x: 4120, y: 1368 }, { x: 3160, y: 1368 }, x(3160, MX.pinIn0), MX.pinIn0], [AL.pinY, MX.pinIn0]);
R("wAluAddr", [AL.pinY, x(4140, AL.pinY), { x: 4140, y: 1396 }, { x: 600, y: 1396 }, x(600, DM.pinAddr0), DM.pinAddr0], [DM.pinAddr0]);
R("wDmAddr1", [ZERO2, x(660, ZERO2), x(660, DM.pinAddr1), DM.pinAddr1], [DM.pinAddr1]);
R("wDmWdata", [RF.pinRdataB, x(3040, RF.pinRdataB), { x: 3040, y: 1388 }, { x: 680, y: 1388 }, x(680, DM.pinWdata), DM.pinWdata], [DM.pinWdata]);
R("wDmWe", [MEMWRITE, x(640, MEMWRITE), x(640, DM.pinWe), DM.pinWe], [DM.pinWe]);
R("wDmClk", [CLK, x(620, CLK), x(620, DM.pinClk), DM.pinClk], [DM.pinClk]);
R("wDmRdata", [DM.pinRdata, x(1360, DM.pinRdata), { x: 1360, y: 1268 }, { x: 3160, y: 1268 }, x(3160, MX.pinIn1), MX.pinIn1], [DM.pinRdata, MX.pinIn1]);
stub("wMuxIn2", MX.pinIn2, "0", 3150);
stub("wMuxIn3", MX.pinIn3, "0", 3150);
stub("wMuxS1", MX.pinS1, "0", 3150);
R("wMuxS0", [MEMTOREG, x(3120, MX.pinS0), MX.pinS0], [MX.pinS0]);
if (IDEC.pinMemWrite && IDEC.pinMemToReg) {
  const mw = { x: 1408, y: IDEC.pinMemWrite.y }, mr = { x: 1424, y: IDEC.pinMemToReg.y };
  R("wCtlMemWrite", [IDEC.pinMemWrite, mw]);
  R("wCtlMemToReg", [IDEC.pinMemToReg, mr]);
  R("ctrlMemWrite", [mw, MEMWRITE]);
  R("ctrlMemToReg", [mr, MEMTOREG]);
}
R("wWdata", [MX.pinOut, x(3960, MX.pinOut), { x: 3960, y: 1376 }, y(1376, { x: 1478, y: 0 }), x(1478, RF.pinWdata), RF.pinWdata], [MX.pinOut, RF.pinWdata]);

setupPulses();
applyWireColors(svg, {
  ...CPU_BASE_COLORS,
  aluY: "#ff8a3d", memaddr: "#ff8a3d",
  memdata: "#7ee0ff",
  memwrite: "#ffcf3a", memtoreg: "#ffcf3a",
  branch: "#ffcf3a", pcsrc: "#ffcf3a",          // control — amber
  imm1: "#ff6fae", imm0: "#ff6fae",             // the imm field (rd slot) — pink
  tgt1: "#6f8cff", tgt0: "#6f8cff",             // computed target = a PC value — blue
  pcnext: "#6f8cff", pcsel: "#6f8cff",
});

const setCtrl = (net: string, on: number) =>
  svg.querySelectorAll<SVGElement>(`.ctrl-wire[data-net="${net}"]`).forEach((e) => e.setAttribute("data-on", String(on)));

const asmText = (i: Instr) =>
  i.opc === 1 ? `BEQ r${i.rs1},r${i.rs2},${i.imm >= 0 ? "+" : ""}${i.imm}`
  : i.opc === 2 ? `LW r${i.rd},(r${i.rs1})`
  : i.opc === 3 ? `SW r${i.rs2},(r${i.rs1})`
  : `${OP_NAMES[i.op]} r${i.rd},r${i.rs1},r${i.rs2}`;

annotateImemProgram(PROGRAM, asmText);

function render() {
  const i = decodeInstr(PROGRAM[pc]);
  const c = ctrl(i);
  const A = regs[i.rs1], B = regs[i.rs2];
  const Y = aluResult(A, B, i);
  const pcsrc = pcsrcOf(i, Y);
  const target = (pc + i.imm) & 0b11;
  const [t1, t0] = hiLo(i.imm < 0 ? i.imm + 4 : i.imm);   // raw imm field bits
  const memData = mem[Y] as Bit;
  const wbVal = (c.memToReg ? memData : Y) as Bit;

  // The control unit forces the ALU op to XOR for a branch (P&H ALUOp) — the
  // trunk renders the op the ALU actually receives, not the raw func field.
  const iEff = c.branch ? { ...i, op: 3 } : i;
  const { a1, a0 } = renderCpuTrunk(tk, { clk, pc, i: iEff, iRaw: i, A, B, Y, regs, we: c.regWrite, wdata: wbVal });

  // branch stage: target bus, control lines, the PCSrc decision, PC MUX preview
  setNet("imm1", (c.branch ? t1 : 0) as Bit); setNet("imm0", (c.branch ? t0 : 0) as Bit);
  setNet("branch", c.branch);
  setNet("pcsrc", pcsrc);
  lightEmbed("pcDetail", {
    clk, pcsrc, imm1: (c.branch ? t1 : 0), imm0: (c.branch ? t0 : 0),
    tgt1: (c.branch ? (target >> 1) & 1 : 0), tgt0: (c.branch ? target & 1 : 0),
    pcnext: 1, pcsel: 1, addr1: (pc >> 1) & 1, addr0: pc & 1, zero: 0,
  }, { gAdd: 1, gTAdd: c.branch, gReg: (pc !== 0 ? 1 : 0) as Bit, gPcmux: 1, gMux1: 1 });
  setCtrl("branch", c.branch); setCtrl("pcsrc", pcsrc);
  setBody("gPcsrc", pcsrc);
  setNet("pcsel", 1);
  // PCSrc embed: result → Zero detector → AND with Branch
  lightEmbed("pcsrcDetail", { branch: c.branch, result: Y, zero: (Y === 0 ? 1 : 0), pcsrc },
    { gZero: (Y === 0 ? 1 : 0), gAnd: pcsrc });

  setPin("pinZero2", 0);
  setNet("cout", 0); setPin("coutTerm", 0);
  setNet("aluY", Y); setNet("memaddr", Y);
  setNet("memdata", c.memRead ? memData : 0);
  setNet("memwrite", c.memWrite); setPin("pinMemWrite", c.memWrite);
  setNet("memtoreg", c.memToReg); setPin("pinMemToReg", c.memToReg);
  setCtrl("memwrite", c.memWrite); setCtrl("memtoreg", c.memToReg);
  setNet("wb", wbVal);

  setBody("gDmem", (c.memRead || c.memWrite) as Bit); setBody("gWbmux", 1);

  lightEmbed("dmemDetail", {
    addr1: 0, addr0: Y, rdata: memData, wdata: B, we: c.memWrite, clk,
    word0: (Y === 0 ? mem[0] : 0), word1: (Y === 1 ? mem[1] : 0), word2: 0, word3: 0,
    [`wsel${Y}`]: c.memWrite,
  }, { gReadmux: 1, gWritePort: (c.memWrite && clk) as Bit,
       gWord0: mem[0], gWord1: mem[1], gWord2: mem[2], gWord3: mem[3] });
  const muxSel = c.memToReg;
  lightEmbed("wbmuxDetail", {
    in0: Y, in1: memData, s1: 0, s0: muxSel,
    [`sel${muxSel ? 1 : 0}`]: 1, [`andOut${muxSel ? 1 : 0}`]: wbVal, out: wbVal,
  }, { [`gAnd${muxSel ? 1 : 0}`]: 1, gOr: 1, gDecoder: 1 });

  // Mark the cell a taken branch jumped over: the red-outlined hole in the
  // fetch sequence. (renderCpuTrunk re-lights the imem embed every render, so
  // re-stamp the marker after it.)
  for (let w = 0; w < 4; w++) {
    svg.querySelectorAll<SVGElement>(`#imemDetail [data-body="gWord${w}"]`)
      .forEach((el) => { if (w === skipped) el.setAttribute("data-skip", "1"); else el.removeAttribute("data-skip"); });
  }

  renderReadout({
    a1, a0, instr: asmText(i), A, B, result: (c.branch ? pcsrc : wbVal) as Bit,
    regs: `r0=${regs[0]} r1=${regs[1]} r2=${regs[2]} r3=${regs[3]}  ·  M0=${mem[0]} M1=${mem[1]}`,
  });
}

bindCpuControls({
  setClk: (b) => { clk = b; },
  commit: () => {
    const i = decodeInstr(PROGRAM[pc]);
    const c = ctrl(i);
    const A = regs[i.rs1], B = regs[i.rs2];
    const Y = aluResult(A, B, i);
    const pcsrc = pcsrcOf(i, Y);
    if (c.memWrite) mem[Y] = B;
    if (c.regWrite) regs[i.rd] = (c.memToReg ? mem[Y] : Y) as Bit;
    skipped = pcsrc ? (pc + 1) & 0b11 : -1;
    pc = pcsrc ? (pc + i.imm) & 0b11 : (pc + 1) & 0b11;
  },
  reset: () => {
    pc = 0; skipped = -1;
    for (let k = 0; k < 4; k++) { regs[k] = SEED[k]; mem[k] = 0; }
    clearSnapshot(SNAP_KEY);
  },
  render,
  persist: () => saveSnapshot<Snap>(SNAP_KEY, { pc, regs: [...regs] as Bit[], mem: [...mem] as Bit[], skipped }),
});

// ── Drill-downs ─────────────────────────────────────────────────────────────
const go = (href: string, params: Record<string, string | number>) =>
  window.location.assign(buildDrillUrl(href, { from: "cpu_branch", ...params }));
bindTrunkDrills(go, () => ({ pc, i: decodeInstr(PROGRAM[pc]), regs, we: ctrl(decodeInstr(PROGRAM[pc])).regWrite }), "/branchpc.html");
document.getElementById("slot-pcsrc")!.addEventListener("click", () => {
  const i = decodeInstr(PROGRAM[pc]);
  const A = regs[i.rs1], B = regs[i.rs2];
  go("/pcsrc.html", { which: "pcsrc", branch: ctrl(i).branch, result: aluResult(A, B, i) });
});
document.getElementById("slot-dmem")!.addEventListener("click", () => {
  const i = decodeInstr(PROGRAM[pc]); const A = regs[i.rs1];
  go("/dmem.html", { which: "data-memory", addr1: 0, addr0: A, wdata: regs[i.rs2], we: ctrl(i).memWrite });
});
document.getElementById("slot-wbmux")!.addEventListener("click", () => {
  const i = decodeInstr(PROGRAM[pc]);
  go("/mux.html", { which: "write-back", s1: 0, s0: ctrl(i).memToReg });
});

initDrillBreadcrumb();
render();
initCanvasZoom();
// Each walkthrough step declares the instruction it describes (data-pc); land
// on it so the diagram always matches the prose. The skip marker only makes
// sense at the branch target — clear it when the prose rewinds earlier.
initSteps({ onStepShow: (step) => {
  const v = step.dataset.pc;
  if (v != null) {
    pc = parseInt(v, 10) & 0b11; clk = 0;
    if (pc <= 1) skipped = -1;
    // Deep-linking straight to the skip lesson (?stage=skip) must still show
    // the hole the branch left — the step is ABOUT cell 2 being skipped.
    if (step.dataset.stage === "skip" && skipped < 0) skipped = 2;
    render();
    saveSnapshot<Snap>(SNAP_KEY, { pc, regs: [...regs] as Bit[], mem: [...mem] as Bit[], skipped });
  }
} });
initProseHighlight(svg);
initPanel();
initToc();
