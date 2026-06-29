import { initPanel } from "./panel";
import { initToc } from "./toc";
import { buildDrillUrl, initDrillBreadcrumb, loadSnapshot, saveSnapshot, clearSnapshot } from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";
import { applyWireColors } from "./wireColors";
import { initProseHighlight } from "./proseHighlight";
import { datapath, x, y, type Bit, type Pt } from "./lib/datapath";

// Symbol → wire colour (distinct hue per signal; bits of one symbol share it).
const WIRE_COLORS: Record<string, string> = {
  clk: "#56ccf2",
  pcnext: "#6f8cff", addr0: "#6f8cff", addr1: "#6f8cff",
  instr: "#b98cff",
  rs1h: "#57e08b", rs1l: "#57e08b",
  rs2h: "#2fcfc7", rs2l: "#2fcfc7",
  rd0: "#ff6fae", rd1: "#ff6fae",
  op: "#ffcf3a", op0: "#ffcf3a", op1: "#ffcf3a",
  rdataA: "#57e08b",
  rdataB: "#2fcfc7",
  aluY: "#ff8a3d",                                             // ALU result — orange
  memaddr: "#ff8a3d",                                          // ALU result used as the memory address
  memdata: "#7ee0ff",                                          // data-memory read out (loaded) — light blue
  memwrite: "#ffcf3a", memtoreg: "#ffcf3a",                    // control — amber
  wb: "#ff6fae",                                               // write-back return — pink
};

// CPU (load/store) — the R-type datapath PLUS a data memory and a revived
// write-back MUX. An R-type result has one write-back source; a load adds a
// second (data read from memory), so a MUX at the register write port now
// CHOOSES between ALU-result and loaded-data (memToReg). A store sends a
// register value back into memory. Toy ISA, 1-bit data:
//   op 00 ADD, 01 AND, 10 LW (rd ← Mem[rs1]), 11 SW (Mem[rs1] ← rs2).

const svg = document.getElementById("cpu") as unknown as SVGSVGElement;
const { R, stub, setupPulses, setNet, setPin, setBody, lightEmbed } = datapath(svg);

// ── ISA + demo program ──────────────────────────────────────────────────────
const OP_NAMES = ["ADD", "AND", "LW", "SW"];
const LW = 2, SW = 3;
type Instr = { op: number; rs1: number; rs2: number; rd: number };
const dec = (w: string): Instr => ({
  op: parseInt(w.slice(0, 2), 2), rs1: parseInt(w.slice(2, 4), 2),
  rs2: parseInt(w.slice(4, 6), 2), rd: parseInt(w.slice(6, 8), 2),
});
// SW r1,(r0) → Mem[1]=1 ; LW r2,(r0) → r2=Mem[1]=1 ; AND r3,r2,r1 → r3=1 ; AND r2,r0,r0 → r2=1
const PROGRAM = ["11000100", "10000010", "01100111", "01000010"];
const SEED: Bit[] = [1, 1, 0, 0];
const rtype = (a: Bit, b: Bit, op: number): Bit =>
  [(a ^ b) as Bit, (a & b) as Bit, 0 as Bit, 0 as Bit][op];   // only ADD/AND are R-type ops here

// ── State ───────────────────────────────────────────────────────────────────
type Snap = { pc: number; regs: Bit[]; mem: Bit[] };
const SNAP_KEY = "cpu_ldst";
const _s = loadSnapshot<Snap>(SNAP_KEY);
let pc = (_s?.pc ?? 0) & 0b11;
const regs: Bit[] = [0, 1, 2, 3].map((i) => (_s?.regs?.[i] ?? SEED[i]) as Bit);
const mem: Bit[] = [0, 1, 2, 3].map((i) => (_s?.mem?.[i] ?? 0) as Bit);
let clk: Bit = 0;

// control signals decoded from the opcode
const ctrl = (op: number) => ({
  memRead: (op === LW) as unknown as Bit,
  memWrite: (op === SW ? 1 : 0) as Bit,
  memToReg: (op === LW ? 1 : 0) as Bit,
  regWrite: (op === SW ? 0 : 1) as Bit,
});
// effective address (mem ops) = base register rs1's value; the ALU passes it.
const aluResult = (a: Bit, b: Bit, op: number): Bit => (op < 2 ? rtype(a, b, op) : a);

// ── Embed every child page; collect its projected pins. ─────────────────────
const embeds = autoFillEmbeds(svg);
const IM: Record<string, Pt> = embeds.get("slot-imem") || {};
const IDEC: Record<string, Pt> = embeds.get("slot-idecode") || {};
const RF: Record<string, Pt> = embeds.get("slot-regfile") || {};
const AL: Record<string, Pt> = embeds.get("slot-alu") || {};
const DM: Record<string, Pt> = embeds.get("slot-dmem") || {};
const MX: Record<string, Pt> = embeds.get("slot-wbmux") || {};

// CPU-level source/sink terminals (fixed in cpu_ldst.html).
const CLK = { x: -100, y: 1200 }, ONE = { x: 1460, y: 410 }, ZERO = { x: 3090, y: 1080 };
const ZERO2 = { x: 560, y: 1120 }, COUT = { x: 4090, y: 560 };
const MEMWRITE = { x: 540, y: 1240 }, MEMTOREG = { x: 3120, y: 1330 };
const PC_CLK = { x: 360, y: 130 }, PC_A1 = { x: 480, y: 250 }, PC_A0 = { x: 480, y: 350 };

// ── fetch + decode + read + execute (identical to the R-type page) ──────────
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
// write-back MUX out → register-file write-data port (loop home, below the MUX).
R("wWdata", [MX.pinOut, x(3960, MX.pinOut), { x: 3960, y: 1376 }, y(1376, { x: 1478, y: 0 }), x(1478, RF.pinWdata), RF.pinWdata], [MX.pinOut, RF.pinWdata]);

setupPulses();
applyWireColors(svg, WIRE_COLORS);

const T = (id: string) => document.getElementById(id) as HTMLElement;
const reg = (b: number) => `r${b}`;
const asmText = (i: Instr) =>
  i.op === LW ? `LW ${reg(i.rd)},(${reg(i.rs1)})`
  : i.op === SW ? `SW ${reg(i.rs2)},(${reg(i.rs1)})`
  : `${OP_NAMES[i.op]} ${reg(i.rd)},${reg(i.rs1)},${reg(i.rs2)}`;

function render() {
  const i = dec(PROGRAM[pc]);
  const c = ctrl(i.op);
  const A = regs[i.rs1], B = regs[i.rs2];
  const Y = aluResult(A, B, i.op);          // R-type result, or the mem address
  const memData = mem[Y] as Bit;            // value read from data memory
  const wbVal = (c.memToReg ? memData : Y) as Bit;
  const a1 = ((pc >> 1) & 1) as Bit, a0 = (pc & 1) as Bit;
  const rs1h = ((i.rs1 >> 1) & 1) as Bit, rs1l = (i.rs1 & 1) as Bit;
  const rs2h = ((i.rs2 >> 1) & 1) as Bit, rs2l = (i.rs2 & 1) as Bit;
  const rd1 = ((i.rd >> 1) & 1) as Bit, rd0 = (i.rd & 1) as Bit;
  const op1 = ((i.op >> 1) & 1) as Bit, op0 = (i.op & 1) as Bit;

  setNet("clk", clk); setPin("pinClk", clk);
  setNet("pcnext", 1); setNet("addr1", a1); setNet("addr0", a0);
  setNet("rs1h", rs1h); setNet("rs1l", rs1l); setNet("rs2h", rs2h); setNet("rs2l", rs2l);
  setNet("rd1", rd1); setNet("rd0", rd0); setNet("op1", op1); setNet("op0", op0);
  setNet("one", 1); setPin("pinOne", 1);
  setNet("zero", 0); setPin("pinZero", 0); setPin("pinZero2", 0);
  setNet("rdataA", A); setNet("rdataB", B);
  setNet("cout", 0); setPin("coutTerm", 0);
  setNet("aluY", Y); setNet("memaddr", Y);
  setNet("memdata", c.memRead ? memData : 0);
  setNet("memwrite", c.memWrite); setPin("pinMemWrite", c.memWrite);
  setNet("memtoreg", c.memToReg); setPin("pinMemToReg", c.memToReg);
  setNet("wb", wbVal);
  setNet("instr", 1);

  setBody("gPc", 1); setBody("gImem", 1); setBody("gIdecode", 1);
  setBody("gRegfile", (A || B) as Bit); setBody("gAlu", 1);
  setBody("gDmem", (c.memRead || c.memWrite) as Bit); setBody("gWbmux", 1);

  lightEmbed("pcDetail", { clk, addr1: a1, addr0: a0, pcnext: 1 },
    { gPcAdd: 1, gPcReg: (pc !== 0 ? 1 : 0) as Bit });
  lightEmbed("imemDetail", { addr1: a1, addr0: a0, rdata: 1 },
    { [`gWord${pc}`]: 1, gReadmux: 1 });
  lightEmbed("idecodeDetail",
    { instr: 1, op: (op1 || op0) as Bit, raddrA: (rs1h || rs1l) as Bit, raddrB: (rs2h || rs2l) as Bit, waddr: (rd1 || rd0) as Bit },
    { gBitOp1: op1, gBitOp0: op0, gBitA1: rs1h, gBitA0: rs1l, gBitB1: rs2h, gBitB0: rs2l, gBitW1: rd1, gBitW0: rd0 });
  lightEmbed("regfileDetail", {
    raddrA1: rs1h, raddrA0: rs1l, raddrB1: rs2h, raddrB0: rs2l,
    waddr1: rd1, waddr0: rd0, we: c.regWrite, clk, wdata: wbVal,
    q0: regs[0], q1: regs[1], q2: regs[2], q3: regs[3], rdata: A, rdataB: B,
  }, { gDecoder: 1, gReg0: regs[0], gReg1: regs[1], gReg2: regs[2], gReg3: regs[3], gMux: A, gMuxB: B });
  lightEmbed("aluDetail", { op1, op0, Cin: 0, A, B, add: (A ^ B) as Bit, and: (A & B) as Bit, or: (A | B) as Bit, xor: (A ^ B) as Bit, Y },
    { gFa: 1, gAnd: A & B, gOr: A | B, gXor: A ^ B, gMux: Y });
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

  T("rPc").textContent = `${a1}${a0}`;
  T("rInstr").textContent = asmText(i);
  T("rA").textContent = String(A); T("rB").textContent = String(B); T("rY").textContent = String(wbVal);
  T("rRegs").textContent = `r0=${regs[0]} r1=${regs[1]} r2=${regs[2]} r3=${regs[3]}  ·  M0=${mem[0]} M1=${mem[1]}`;
}

function persist() { saveSnapshot<Snap>(SNAP_KEY, { pc, regs: [...regs] as Bit[], mem: [...mem] as Bit[] }); }

document.getElementById("btnStep")!.addEventListener("click", () => {
  const i = dec(PROGRAM[pc]);
  const c = ctrl(i.op);
  clk = 1; render();
  setTimeout(() => {
    const A = regs[i.rs1], B = regs[i.rs2];
    const Y = aluResult(A, B, i.op);
    if (c.memWrite) mem[Y] = B;                          // store
    if (c.regWrite) regs[i.rd] = (c.memToReg ? mem[Y] : Y) as Bit;  // R-type / load
    pc = (pc + 1) & 0b11;
    clk = 0; render(); persist();
  }, 320);
});
document.getElementById("btnReset")!.addEventListener("click", () => {
  pc = 0; for (let k = 0; k < 4; k++) { regs[k] = SEED[k]; mem[k] = 0; }
  clk = 0; clearSnapshot(SNAP_KEY); render();
});

// ── Drill-downs ─────────────────────────────────────────────────────────────
const go = (href: string, params: Record<string, string | number>) =>
  window.location.assign(buildDrillUrl(href, { from: "cpu_ldst", ...params }));
document.getElementById("slot-pc")!.addEventListener("click", () => go("/counter.html", { which: "pc" }));
document.getElementById("slot-imem")!.addEventListener("click", () => go("/mem.html", { which: "instruction-memory", addr1: (pc >> 1) & 1, addr0: pc & 1 }));
document.getElementById("slot-idecode")!.addEventListener("click", () => { const i = dec(PROGRAM[pc]); go("/idecode.html", { which: "decode", op1: (i.op >> 1) & 1, op0: i.op & 1, raddrA1: (i.rs1 >> 1) & 1, raddrA0: i.rs1 & 1, raddrB1: (i.rs2 >> 1) & 1, raddrB0: i.rs2 & 1, waddr1: (i.rd >> 1) & 1, waddr0: i.rd & 1 }); });
document.getElementById("slot-regfile")!.addEventListener("click", () => {
  const i = dec(PROGRAM[pc]);
  go("/regfile.html", { which: "regfile", raddrA1: (i.rs1 >> 1) & 1, raddrA0: i.rs1 & 1, raddrB1: (i.rs2 >> 1) & 1, raddrB0: i.rs2 & 1, waddr1: (i.rd >> 1) & 1, waddr0: i.rd & 1, we: ctrl(i.op).regWrite });
});
document.getElementById("slot-alu")!.addEventListener("click", () => { const i = dec(PROGRAM[pc]); go("/alu1.html", { which: "alu", A: regs[i.rs1], B: regs[i.rs2], Cin: 0, op1: (i.op >> 1) & 1, op0: i.op & 1 }); });
document.getElementById("slot-dmem")!.addEventListener("click", () => { const i = dec(PROGRAM[pc]); const A = regs[i.rs1]; go("/dmem.html", { which: "data-memory", addr1: 0, addr0: A, wdata: regs[i.rs2], we: ctrl(i.op).memWrite }); });
document.getElementById("slot-wbmux")!.addEventListener("click", () => { const i = dec(PROGRAM[pc]); go("/mux.html", { which: "write-back", s1: 0, s0: ctrl(i.op).memToReg }); });

initDrillBreadcrumb();
render();
initCanvasZoom();
// Each walkthrough step declares the instruction it describes (data-pc); land on
// it so the diagram always matches the prose without manual sequencing.
initSteps({ onStepShow: (step) => {
  const v = step.dataset.pc;
  if (v != null) { pc = parseInt(v, 10) & 0b11; clk = 0; render(); persist(); }
} });
initProseHighlight(svg);
initPanel();
initToc();
