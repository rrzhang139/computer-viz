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
  CPU_BASE_COLORS, CPU_TERMS, SEED, asBits4, decodeInstr,
  routeCpuTrunk, renderCpuTrunk, renderReadout, bindCpuControls, bindTrunkDrills,
} from "./lib/cpuShared";

// CPU (load/store) — the R-type datapath PLUS a data memory and a revived
// write-back MUX. An R-type result has one write-back source; a load adds a
// second (data read from memory), so a MUX at the register write port now
// CHOOSES between ALU-result and loaded-data (memToReg). A store sends a
// register value back into memory. Toy ISA, 1-bit data:
//   op 00 ADD, 01 AND, 10 LW (rd ← Mem[rs1]), 11 SW (Mem[rs1] ← rs2).
//
// The fetch→execute trunk is shared via src/lib/cpuShared.ts; this file owns
// the memory stage: data memory, write-back MUX, the decoded control signals
// (memWrite/memToReg) and their dotted control lines.

const svg = document.getElementById("cpu") as unknown as SVGSVGElement;
const tk = datapath(svg);
const { R, stub, setupPulses, setNet, setPin, setBody, lightEmbed } = tk;

// ── ISA + demo program ──────────────────────────────────────────────────────
const OP_NAMES = ["ADD", "AND", "LW", "SW"];
const LW = 2, SW = 3;
// SW r1,(r0) → Mem[1]=1 ; LW r2,(r0) → r2=Mem[1]=1 ; AND r3,r2,r1 → r3=1 ; AND r2,r0,r0 → r2=1
const PROGRAM = ["11000100", "10000010", "01100111", "01000010"];
const rtype = (a: Bit, b: Bit, op: number): Bit =>
  [(a ^ b) as Bit, (a & b) as Bit, 0 as Bit, 0 as Bit][op];   // only ADD/AND are R-type ops here

// control signals decoded from the opcode
const ctrl = (op: number) => ({
  memRead: (op === LW ? 1 : 0) as Bit,
  memWrite: (op === SW ? 1 : 0) as Bit,
  memToReg: (op === LW ? 1 : 0) as Bit,
  regWrite: (op === SW ? 0 : 1) as Bit,
});
// effective address (mem ops) = base register rs1's value; the ALU passes it.
const aluResult = (a: Bit, b: Bit, op: number): Bit => (op < 2 ? rtype(a, b, op) : a);

// ── State ───────────────────────────────────────────────────────────────────
type Snap = { pc: number; regs: Bit[]; mem: Bit[] };
const SNAP_KEY = "cpu_ldst";
const _s = loadSnapshot<Snap>(SNAP_KEY);
let pc = (Number(_s?.pc) || 0) & 0b11;
const regs: Bit[] = asBits4(_s?.regs, SEED);
const mem: Bit[] = asBits4(_s?.mem, [0, 0, 0, 0]);
let clk: Bit = 0;

// ── Embed every child page; route the trunk + the memory stage. ─────────────
const embeds = autoFillEmbeds(svg);
const IM: Record<string, Pt> = embeds.get("slot-imem") || {};
const IDEC: Record<string, Pt> = embeds.get("slot-idecode") || {};
const RF: Record<string, Pt> = embeds.get("slot-regfile") || {};
const AL: Record<string, Pt> = embeds.get("slot-alu") || {};
const DM: Record<string, Pt> = embeds.get("slot-dmem") || {};
const MX: Record<string, Pt> = embeds.get("slot-wbmux") || {};

// page-specific source/sink terminals (fixed in cpu_ldst.html).
const { CLK } = CPU_TERMS;
const ZERO2 = { x: 560, y: 1120 };
const MEMWRITE = { x: 540, y: 1240 }, MEMTOREG = { x: 3120, y: 1330 };
const DECODE_CTRL = { x: 1100, y: 1060 };   // control origin on the decode block's bottom edge

routeCpuTrunk(R, { IM, IDEC, RF, AL });

// ── MEM (data memory, bottom-left) + write-back MUX (bottom-right) ───────────
// Routing avoids crossing any block interior. Cross-gap reads use the clear
// middle band (y 1260–1280, below the register file, between the two blocks);
// long left-going feeds to the data memory ride the bottom lanes (y 1388/1396,
// below the data-memory box at 1082–1382); the MUX's own returns ride just
// below the MUX (y 1368/1376, below its box at 1090–1360).
// ALU result → write-back MUX in0 (down the right edge, under the MUX).
R("wAluY", [AL.pinY, x(4120, AL.pinY), { x: 4120, y: 1368 }, { x: 3160, y: 1368 }, x(3160, MX.pinIn0), MX.pinIn0], [AL.pinY, MX.pinIn0]);
// ALU result → data-memory address (a second branch; mem ops: ALU passes rs1).
R("wAluAddr", [AL.pinY, x(4140, AL.pinY), { x: 4140, y: 1396 }, { x: 600, y: 1396 }, x(600, DM.pinAddr0), DM.pinAddr0], [DM.pinAddr0]);
// data-memory high address bit ties to 0 (1-bit data → only cells 0/1 used).
R("wDmAddr1", [ZERO2, x(660, ZERO2), x(660, DM.pinAddr1), DM.pinAddr1], [DM.pinAddr1]);
// rs2 read → data-memory write data (a store sends a register value to memory).
R("wDmWdata", [RF.pinRdataB, x(3040, RF.pinRdataB), { x: 3040, y: 1388 }, { x: 680, y: 1388 }, x(680, DM.pinWdata), DM.pinWdata], [DM.pinWdata]);
// control: memWrite → data-memory write enable; clock → data memory.
R("wDmWe", [MEMWRITE, x(640, MEMWRITE), x(640, DM.pinWe), DM.pinWe], [DM.pinWe]);
R("wDmClk", [CLK, x(620, CLK), x(620, DM.pinClk), DM.pinClk], [DM.pinClk]);
// data-memory read out → write-back MUX in1 (the loaded value), via the gap.
R("wDmRdata", [DM.pinRdata, x(1360, DM.pinRdata), { x: 1360, y: 1268 }, { x: 3160, y: 1268 }, x(3160, MX.pinIn1), MX.pinIn1], [DM.pinRdata, MX.pinIn1]);
// MUX unused inputs + high select tie to 0; low select = memToReg control.
stub("wMuxIn2", MX.pinIn2, "0", 3150);
stub("wMuxIn3", MX.pinIn3, "0", 3150);
stub("wMuxS1", MX.pinS1, "0", 3150);
R("wMuxS0", [MEMTOREG, x(3120, MX.pinS0), MX.pinS0], [MX.pinS0]);
// dotted control lines from the decode block to each control consumer — they
// emanate from decode (where the opcode is decoded) and cross components freely.
R("ctrlMemWrite", [DECODE_CTRL, MEMWRITE]);
R("ctrlMemToReg", [DECODE_CTRL, MEMTOREG]);
// write-back MUX out → register-file write-data port (loop home, below the MUX).
R("wWdata", [MX.pinOut, x(3960, MX.pinOut), { x: 3960, y: 1376 }, y(1376, { x: 1478, y: 0 }), x(1478, RF.pinWdata), RF.pinWdata], [MX.pinOut, RF.pinWdata]);

setupPulses();
applyWireColors(svg, {
  ...CPU_BASE_COLORS,
  aluY: "#ff8a3d",                            // ALU result — orange
  memaddr: "#ff8a3d",                         // ALU result used as the memory address
  memdata: "#7ee0ff",                         // data-memory read out (loaded) — light blue
  memwrite: "#ffcf3a", memtoreg: "#ffcf3a",   // control — amber
});

// dotted control lines aren't `.wire`, so light them directly.
const setCtrl = (net: string, on: number) =>
  svg.querySelectorAll<SVGElement>(`.ctrl-wire[data-net="${net}"]`).forEach((e) => e.setAttribute("data-on", String(on)));

const asmText = (i: { op: number; rs1: number; rs2: number; rd: number }) =>
  i.op === LW ? `LW r${i.rd},(r${i.rs1})`
  : i.op === SW ? `SW r${i.rs2},(r${i.rs1})`
  : `${OP_NAMES[i.op]} r${i.rd},r${i.rs1},r${i.rs2}`;

function render() {
  const i = decodeInstr(PROGRAM[pc]);
  const c = ctrl(i.op);
  const A = regs[i.rs1], B = regs[i.rs2];
  const Y = aluResult(A, B, i.op);          // R-type result, or the mem address
  const memData = mem[Y] as Bit;            // value read from data memory
  const wbVal = (c.memToReg ? memData : Y) as Bit;

  const { a1, a0 } = renderCpuTrunk(tk, { clk, pc, i, A, B, Y, regs, we: c.regWrite, wdata: wbVal });

  setPin("pinZero2", 0);
  setNet("cout", 0); setPin("coutTerm", 0);
  setNet("aluY", Y); setNet("memaddr", Y);
  setNet("memdata", c.memRead ? memData : 0);
  setNet("memwrite", c.memWrite); setPin("pinMemWrite", c.memWrite);
  setNet("memtoreg", c.memToReg); setPin("pinMemToReg", c.memToReg);
  setCtrl("memwrite", c.memWrite); setCtrl("memtoreg", c.memToReg);
  setPin("pinCtrl", (c.memWrite || c.memToReg) as Bit);
  setNet("wb", wbVal);

  setBody("gDmem", (c.memRead || c.memWrite) as Bit); setBody("gWbmux", 1);

  // data memory embed: cell bodies show stored values; the addressed cell's
  // read wire carries its value out to the read MUX (the selection).
  lightEmbed("dmemDetail", {
    addr1: 0, addr0: Y, rdata: memData, wdata: B, we: c.memWrite, clk,
    word0: (Y === 0 ? mem[0] : 0), word1: (Y === 1 ? mem[1] : 0), word2: 0, word3: 0,
    [`wsel${Y}`]: c.memWrite,
  }, { gReadmux: 1, gWritePort: (c.memWrite && clk) as Bit,
       gWord0: mem[0], gWord1: mem[1], gWord2: mem[2], gWord3: mem[3] });
  // write-back MUX embed: in0 = ALU result, in1 = loaded data, select = memToReg
  const muxSel = c.memToReg;
  lightEmbed("wbmuxDetail", {
    in0: Y, in1: memData, s1: 0, s0: muxSel,
    [`sel${muxSel ? 1 : 0}`]: 1, [`andOut${muxSel ? 1 : 0}`]: wbVal, out: wbVal,
  }, { [`gAnd${muxSel ? 1 : 0}`]: 1, gOr: 1, gDecoder: 1 });

  renderReadout({
    a1, a0, instr: asmText(i), A, B, result: wbVal,
    regs: `r0=${regs[0]} r1=${regs[1]} r2=${regs[2]} r3=${regs[3]}  ·  M0=${mem[0]} M1=${mem[1]}`,
  });
}

bindCpuControls({
  setClk: (b) => { clk = b; },
  commit: () => {
    const i = decodeInstr(PROGRAM[pc]);
    const c = ctrl(i.op);
    const A = regs[i.rs1], B = regs[i.rs2];
    const Y = aluResult(A, B, i.op);
    if (c.memWrite) mem[Y] = B;                                       // store
    if (c.regWrite) regs[i.rd] = (c.memToReg ? mem[Y] : Y) as Bit;    // R-type / load
    pc = (pc + 1) & 0b11;
  },
  reset: () => {
    pc = 0; for (let k = 0; k < 4; k++) { regs[k] = SEED[k]; mem[k] = 0; }
    clearSnapshot(SNAP_KEY);
  },
  render,
  persist: () => saveSnapshot<Snap>(SNAP_KEY, { pc, regs: [...regs] as Bit[], mem: [...mem] as Bit[] }),
});

// ── Drill-downs ─────────────────────────────────────────────────────────────
const go = (href: string, params: Record<string, string | number>) =>
  window.location.assign(buildDrillUrl(href, { from: "cpu_ldst", ...params }));
bindTrunkDrills(go, () => ({ pc, i: decodeInstr(PROGRAM[pc]), regs, we: ctrl(decodeInstr(PROGRAM[pc]).op).regWrite }));
document.getElementById("slot-dmem")!.addEventListener("click", () => {
  const i = decodeInstr(PROGRAM[pc]); const A = regs[i.rs1];
  go("/dmem.html", { which: "data-memory", addr1: 0, addr0: A, wdata: regs[i.rs2], we: ctrl(i.op).memWrite });
});
document.getElementById("slot-wbmux")!.addEventListener("click", () => {
  const i = decodeInstr(PROGRAM[pc]);
  go("/mux.html", { which: "write-back", s1: 0, s0: ctrl(i.op).memToReg });
});

initDrillBreadcrumb();
render();
initCanvasZoom();
// Each walkthrough step declares the instruction it describes (data-pc); land on
// it so the diagram always matches the prose without manual sequencing.
initSteps({ onStepShow: (step) => {
  const v = step.dataset.pc;
  if (v != null) { pc = parseInt(v, 10) & 0b11; clk = 0; render(); saveSnapshot<Snap>(SNAP_KEY, { pc, regs: [...regs] as Bit[], mem: [...mem] as Bit[] }); }
} });
initProseHighlight(svg);
initPanel();
initToc();
