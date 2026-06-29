import { initPanel } from "./panel";
import { initToc } from "./toc";
import { buildDrillUrl, initDrillBreadcrumb, loadSnapshot, saveSnapshot, clearSnapshot } from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";
import { applyWireColors } from "./wireColors";
import { initProseHighlight } from "./proseHighlight";
import { datapath, x, y, type Bit, type Pt } from "./lib/datapath";

// Symbol → wire colour. Many signals run in parallel across this wide datapath,
// so each gets its own hue (bits of one symbol share it). Tuned for the dark bg.
// (aluY/wb keep entries even where only the prose .wt-* text class uses them.)
const WIRE_COLORS: Record<string, string> = {
  clk: "#56ccf2",                                              // clock — cyan
  pcnext: "#6f8cff", addr0: "#6f8cff", addr1: "#6f8cff",        // PC / address — blue
  instr: "#b98cff",                                            // instruction word (/8) — violet
  rs1h: "#57e08b", rs1l: "#57e08b",                            // rs1 field → read-A addr — green
  rs2h: "#2fcfc7", rs2l: "#2fcfc7",                            // rs2 field → read-B addr — teal
  rd0: "#ff6fae", rd1: "#ff6fae",                              // rd field → write addr — pink
  op: "#ffcf3a", op0: "#ffcf3a", op1: "#ffcf3a",                // operation (control → ALU) — amber
  rdataA: "#57e08b",                                           // read operand A — green
  rdataB: "#2fcfc7",                                           // read operand B — teal
  aluY: "#ff8a3d",                                             // ALU result — orange
  wb: "#ff6fae",                                               // write-back return wire — pink
};

// CPU — a single-cycle R-type datapath where EVERY block is a live drill into
// the page that builds it. autoFillEmbeds clones each child page's real <svg>
// into the block and returns its projected pin positions; we route the wires
// ONTO those pins so the lines genuinely connect to each component's terminals.
// Toy R-type ISA (op|rs1|rs2|rd), 1-bit data.
//
//   fetch (PC → instruction memory) → decode (control + register-file reads)
//   → execute (ALU) → write-back (ALU result → register file write port).
//
// There is NO write-back MUX: an R-type result has exactly one source (the
// ALU), so it wires straight back to the write port. The load/store variant
// (cpu_ldst) re-introduces a MUX to choose ALU-result vs. memory-loaded data.

const svg = document.getElementById("cpu") as unknown as SVGSVGElement;
const { R, setupPulses, setNet, setPin, setBody, lightEmbed } = datapath(svg);

// ── ISA + demo program (hazard-free: every instr reads only r0/r1) ──────────
const OP_NAMES = ["ADD", "AND", "OR", "XOR"];
type Instr = { op: number; rs1: number; rs2: number; rd: number };
const dec = (w: string): Instr => ({
  op: parseInt(w.slice(0, 2), 2), rs1: parseInt(w.slice(2, 4), 2),
  rs2: parseInt(w.slice(4, 6), 2), rd: parseInt(w.slice(6, 8), 2),
});
const PROGRAM = ["00000110", "01000111", "10000110", "11000111"]; // ADD r2 / AND r3 / OR r2 / XOR r3 (all r0,r1)
const SEED: Bit[] = [1, 1, 0, 0];
const aluOp = (a: Bit, b: Bit, op: number): Bit =>
  [(a ^ b) as Bit, (a & b) as Bit, (a | b) as Bit, (a ^ b) as Bit][op];

// ── State ───────────────────────────────────────────────────────────────────
type Snap = { pc: number; regs: Bit[] };
const SNAP_KEY = "cpu";
const _s = loadSnapshot<Snap>(SNAP_KEY);
let pc = (_s?.pc ?? 0) & 0b11;
const regs: Bit[] = [0, 1, 2, 3].map((i) => (_s?.regs?.[i] ?? SEED[i]) as Bit);
let clk: Bit = 0;

// ── Embed every child page; collect its projected pins. ─────────────────────
const embeds = autoFillEmbeds(svg);
const IM: Record<string, Pt> = embeds.get("slot-imem") || {};
const IDEC: Record<string, Pt> = embeds.get("slot-idecode") || {};
const RF: Record<string, Pt> = embeds.get("slot-regfile") || {};
const AL: Record<string, Pt> = embeds.get("slot-alu") || {};

// CPU-level source/sink terminals (fixed in cpu.html).
const CLK = { x: -100, y: 1200 }, ONE = { x: 1460, y: 410 }, ZERO = { x: 3090, y: 1080 };
const COUT = { x: 4090, y: 560 };
// PC block terminals — drawn in cpu.html (the PC is a hand-built 2-bit counter,
// not an embed): clk-in on TOP, the two address bits out on the RIGHT edge.
const PC_CLK = { x: 360, y: 130 }, PC_A1 = { x: 480, y: 250 }, PC_A0 = { x: 480, y: 350 };

// ── clock: PC's CLK is on TOP (approach over the top); RF's clk on LEFT. ──
R("wClkPc", [CLK, { x: -100, y: 100 }, { x: PC_CLK.x, y: 100 }, PC_CLK]);
R("wClkRf", [CLK, x(1440, CLK), x(1440, RF.pinClk), RF.pinClk], [RF.pinClk]);
// ── PC address out (RIGHT edge) → instruction memory address (LEFT edge,
// below). The +1 loop is internal to the PC, so the only thing leaving the
// block is the address: out the right, down the clear band under the PC, then
// down the left gutter onto imem's address pins. Two staggered lanes. ──
R("wPcA1", [PC_A1, { x: 504, y: 250 }, { x: 504, y: 560 }, { x: 24, y: 560 }, x(24, IM.pinAddr1), IM.pinAddr1], [IM.pinAddr1]);
R("wPcA0", [PC_A0, { x: 516, y: 350 }, { x: 516, y: 548 }, { x: 36, y: 548 }, x(36, IM.pinAddr0), IM.pinAddr0], [IM.pinAddr0]);
// ── instruction word: imem.rdata → the instruction decoder, as ONE 8-bit bus
// (/8). The decoder is its OWN column between fetch and the register file, so
// the field buses flow straight left→right — no doubling back. ──
R("wInstr", [IM.pinRdata, x(590, IM.pinRdata), x(590, IDEC.pinInstr), IDEC.pinInstr], [IM.pinRdata, IDEC.pinInstr]);

// ── decoded field buses (/2): decoder (RIGHT) → register file (LEFT, just to
// its right), each in its own gap lane, fanning into its field's two pins. ──
// rs1 → register-file read-address A
R("wRfA1", [IDEC.pinRaddrA, x(1440, IDEC.pinRaddrA), x(1440, RF.pinRaddrA1), RF.pinRaddrA1], [IDEC.pinRaddrA, RF.pinRaddrA1]);
R("wRfA0", [x(1440, RF.pinRaddrA1), x(1440, RF.pinRaddrA0), RF.pinRaddrA0], [RF.pinRaddrA0]);
// rs2 → register-file read-address B
R("wRfB1", [IDEC.pinRaddrB, x(1456, IDEC.pinRaddrB), x(1456, RF.pinRaddrB1), RF.pinRaddrB1], [IDEC.pinRaddrB, RF.pinRaddrB1]);
R("wRfB0", [x(1456, RF.pinRaddrB1), x(1456, RF.pinRaddrB0), RF.pinRaddrB0], [RF.pinRaddrB0]);
// rd → register-file write-address
R("wWaddr1", [IDEC.pinWaddr, x(1472, IDEC.pinWaddr), x(1472, RF.pinWaddr1), RF.pinWaddr1], [IDEC.pinWaddr, RF.pinWaddr1]);
R("wWaddr0", [x(1472, RF.pinWaddr1), x(1472, RF.pinWaddr0), RF.pinWaddr0], [RF.pinWaddr0]);
// opcode → ALU op select. Over the top lane (above the register file), down the
// gap before the ALU, fanning onto the ALU's two op pins.
R("wAluOp1", [IDEC.pinOp, x(1424, IDEC.pinOp), { x: 1424, y: 400 }, { x: 3080, y: 400 }, x(3080, AL.pinOp1), AL.pinOp1], [IDEC.pinOp, AL.pinOp1]);
R("wAluOp0", [{ x: 3080, y: 400 }, x(3080, AL.pinOp0), AL.pinOp0], [AL.pinOp0]);
// ── register file: write-enable (const 1) + read-port outputs → ALU operands. ──
R("wWe", [ONE, x(1490, ONE), x(1490, RF.pinWe), RF.pinWe], [RF.pinWe]);
R("wRdataA", [RF.pinRdata, x(3070, RF.pinRdata), x(3070, AL.pinA), AL.pinA], [RF.pinRdata, AL.pinA]);
R("wRdataB", [RF.pinRdataB, x(3086, RF.pinRdataB), x(3086, AL.pinB), AL.pinB], [RF.pinRdataB, AL.pinB]);
// ── ALU: carry-in (const 0) + carry-out stub. ──
R("wAluCin", [ZERO, x(3115, ZERO), x(3115, AL.pinCin), AL.pinCin], [AL.pinCin]);
R("wAluCout", [AL.pinCout, x(4090, AL.pinCout), COUT], [AL.pinCout]);
// ── write-back: ALU result → register-file write-data port, DIRECT (no MUX).
// An R-type result has one source, so it just turns the corner and loops back
// along the bottom: out the ALU's right, down to the bottom lane, left to the
// write-data lane, up onto the register file's write-data pin. ──
R("wWdata", [AL.pinY, x(4100, AL.pinY), { x: 4100, y: 1395 }, y(1395, { x: 1478, y: 0 }), x(1478, RF.pinWdata), RF.pinWdata], [AL.pinY, RF.pinWdata]);

setupPulses();                       // flow overlays (after every wire is routed)
applyWireColors(svg, WIRE_COLORS);   // colour each signal a distinct hue (dense datapath)

const T = (id: string) => document.getElementById(id) as HTMLElement;
const reg = (b: number) => `r${b}`;

function render() {
  const i = dec(PROGRAM[pc]);
  const A = regs[i.rs1], B = regs[i.rs2], Y = aluOp(A, B, i.op);
  const a1 = ((pc >> 1) & 1) as Bit, a0 = (pc & 1) as Bit;
  const rs1h = ((i.rs1 >> 1) & 1) as Bit, rs1l = (i.rs1 & 1) as Bit;
  const rs2h = ((i.rs2 >> 1) & 1) as Bit, rs2l = (i.rs2 & 1) as Bit;
  const rd1 = ((i.rd >> 1) & 1) as Bit, rd0 = (i.rd & 1) as Bit;
  const op1 = ((i.op >> 1) & 1) as Bit, op0 = (i.op & 1) as Bit;

  // datapath wires + terminals
  setNet("clk", clk); setPin("pinClk", clk);
  setNet("pcnext", 1); setNet("addr1", a1); setNet("addr0", a0);
  setNet("rs1h", rs1h); setNet("rs1l", rs1l); setNet("rs2h", rs2h); setNet("rs2l", rs2l);
  setNet("rd1", rd1); setNet("rd0", rd0); setNet("op1", op1); setNet("op0", op0);
  setNet("one", 1); setPin("pinOne", 1); setNet("zero", 0); setPin("pinZero", 0);
  setNet("rdataA", A); setNet("rdataB", B);
  setNet("cout", (i.op === 0 ? (A & B) : 0) as Bit);
  setNet("wb", Y);      // the ALU result returning to the write port
  setNet("instr", 1);   // instruction-word bus (/8): a word is always being fetched
  setPin("coutTerm", (i.op === 0 ? (A & B) : 0) as Bit);

  // block bodies
  setBody("gPc", 1); setBody("gImem", 1); setBody("gIdecode", 1);
  setBody("gRegfile", (A || B) as Bit); setBody("gAlu", 1);

  // light the embedded child diagrams to match state (live exact copies)
  // PC preview = adder(+1) → register, looped. addr nets carry the current PC
  // (register Q, also the feedback); pcnext is the adder's Q+1 result.
  lightEmbed("pcDetail", { clk, addr1: a1, addr0: a0, pcnext: 1 },
    { gPcAdd: 1, gPcReg: (pc !== 0 ? 1 : 0) as Bit });
  lightEmbed("imemDetail", {
    addr1: a1, addr0: a0, rdata: 1,
    word0: (pc === 0 ? 1 : 0), word1: (pc === 1 ? 1 : 0), word2: (pc === 2 ? 1 : 0), word3: (pc === 3 ? 1 : 0),
  }, {
    gWord0: (pc === 0 ? 1 : 0), gWord1: (pc === 1 ? 1 : 0), gWord2: (pc === 2 ? 1 : 0), gWord3: (pc === 3 ? 1 : 0), gReadmux: 1,
  });
  lightEmbed("idecodeDetail",
    { instr: 1, op: (op1 || op0) as Bit, raddrA: (rs1h || rs1l) as Bit, raddrB: (rs2h || rs2l) as Bit, waddr: (rd1 || rd0) as Bit },
    { gBitOp1: op1, gBitOp0: op0, gBitA1: rs1h, gBitA0: rs1l, gBitB1: rs2h, gBitB0: rs2l, gBitW1: rd1, gBitW0: rd0 });
  lightEmbed("regfileDetail", {
    raddrA1: rs1h, raddrA0: rs1l, raddrB1: rs2h, raddrB0: rs2l,
    waddr1: rd1, waddr0: rd0, we: 1, clk, wdata: Y,
    q0: regs[0], q1: regs[1], q2: regs[2], q3: regs[3], rdata: A, rdataB: B,
  }, { gDecoder: 1, gReg0: regs[0], gReg1: regs[1], gReg2: regs[2], gReg3: regs[3], gMux: A, gMuxB: B });
  lightEmbed("aluDetail", { op1, op0, Cin: 0, A, B, add: (A ^ B) as Bit, and: (A & B) as Bit, or: (A | B) as Bit, xor: (A ^ B) as Bit, Y },
    { gFa: 1, gAnd: A & B, gOr: A | B, gXor: A ^ B, gMux: Y });

  // readout
  T("rPc").textContent = `${a1}${a0}`;
  T("rInstr").textContent = `${OP_NAMES[i.op]} ${reg(i.rd)},${reg(i.rs1)},${reg(i.rs2)}`;
  T("rA").textContent = String(A); T("rB").textContent = String(B); T("rY").textContent = String(Y);
  T("rRegs").textContent = `r0=${regs[0]} r1=${regs[1]} r2=${regs[2]} r3=${regs[3]}`;
}

function persist() { saveSnapshot<Snap>(SNAP_KEY, { pc, regs: [...regs] as Bit[] }); }

document.getElementById("btnStep")!.addEventListener("click", () => {
  const i = dec(PROGRAM[pc]);
  clk = 1; render();
  setTimeout(() => {
    regs[i.rd] = aluOp(regs[i.rs1], regs[i.rs2], i.op);  // write-back on the edge
    pc = (pc + 1) & 0b11;
    clk = 0; render(); persist();
  }, 320);
});
document.getElementById("btnReset")!.addEventListener("click", () => {
  pc = 0; for (let k = 0; k < 4; k++) regs[k] = SEED[k];
  clk = 0; clearSnapshot(SNAP_KEY); render();
});

// ── Drill-downs (click a block → its page, carrying current state). ─────────
const go = (href: string, params: Record<string, string | number>) =>
  window.location.assign(buildDrillUrl(href, { from: "cpu", ...params }));
document.getElementById("slot-pc")!.addEventListener("click", () => go("/counter.html", { which: "pc" }));
document.getElementById("slot-imem")!.addEventListener("click", () => go("/mem.html", { which: "instruction-memory", addr1: (pc >> 1) & 1, addr0: pc & 1 }));
document.getElementById("slot-idecode")!.addEventListener("click", () => { const i = dec(PROGRAM[pc]); go("/idecode.html", { which: "decode", op1: (i.op >> 1) & 1, op0: i.op & 1, raddrA1: (i.rs1 >> 1) & 1, raddrA0: i.rs1 & 1, raddrB1: (i.rs2 >> 1) & 1, raddrB0: i.rs2 & 1, waddr1: (i.rd >> 1) & 1, waddr0: i.rd & 1 }); });
document.getElementById("slot-regfile")!.addEventListener("click", () => {
  const i = dec(PROGRAM[pc]);
  go("/regfile.html", { which: "regfile", raddrA1: (i.rs1 >> 1) & 1, raddrA0: i.rs1 & 1, raddrB1: (i.rs2 >> 1) & 1, raddrB0: i.rs2 & 1, waddr1: (i.rd >> 1) & 1, waddr0: i.rd & 1, we: 1 });
});
document.getElementById("slot-alu")!.addEventListener("click", () => { const i = dec(PROGRAM[pc]); go("/alu1.html", { which: "alu", A: regs[i.rs1], B: regs[i.rs2], Cin: 0, op1: (i.op >> 1) & 1, op0: i.op & 1 }); });

initDrillBreadcrumb();
render();
initCanvasZoom();
initSteps();
initProseHighlight(svg);
initPanel();
initToc();
