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
  CPU_BASE_COLORS, SEED, asBits4, decodeInstr,
  routeCpuTrunk, renderCpuTrunk, renderReadout, bindCpuControls, bindTrunkDrills,
} from "./lib/cpuShared";

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
//
// The fetch→execute trunk (palette, terminals, routing, lighting, controls,
// drills) is shared with every CPU variant via src/lib/cpuShared.ts; this file
// owns only what is R-type-specific: the program, the ALU model, the direct
// write-back wire, and the render/commit glue.

const svg = document.getElementById("cpu") as unknown as SVGSVGElement;
const tk = datapath(svg);
const { R, setupPulses, setNet, setPin } = tk;

// ── ISA + demo program (hazard-free: every instr reads only r0/r1) ──────────
const OP_NAMES = ["ADD", "AND", "OR", "XOR"];
const PROGRAM = ["00000110", "01000111", "10000110", "11000111"]; // ADD r2 / AND r3 / OR r2 / XOR r3 (all r0,r1)
const aluOp = (a: Bit, b: Bit, op: number): Bit =>
  [(a ^ b) as Bit, (a & b) as Bit, (a | b) as Bit, (a ^ b) as Bit][op];

// ── State ───────────────────────────────────────────────────────────────────
type Snap = { pc: number; regs: Bit[] };
const SNAP_KEY = "cpu";
const _s = loadSnapshot<Snap>(SNAP_KEY);
let pc = (Number(_s?.pc) || 0) & 0b11;
const regs: Bit[] = asBits4(_s?.regs, SEED);
let clk: Bit = 0;

// ── Embed every child page; route the shared trunk + the direct write-back. ──
const embeds = autoFillEmbeds(svg);
const IM: Record<string, Pt> = embeds.get("slot-imem") || {};
const IDEC: Record<string, Pt> = embeds.get("slot-idecode") || {};
const RF: Record<string, Pt> = embeds.get("slot-regfile") || {};
const AL: Record<string, Pt> = embeds.get("slot-alu") || {};

routeCpuTrunk(R, { IM, IDEC, RF, AL });
// write-back: ALU result → register-file write-data port, DIRECT (no MUX).
// An R-type result has one source, so it just turns the corner and loops back
// along the bottom: out the ALU's right, down to the bottom lane, left to the
// write-data lane, up onto the register file's write-data pin.
R("wWdata", [AL.pinY, x(4100, AL.pinY), { x: 4100, y: 1395 }, y(1395, { x: 1478, y: 0 }), x(1478, RF.pinWdata), RF.pinWdata], [AL.pinY, RF.pinWdata]);

setupPulses();                          // flow overlays (after every wire is routed)
applyWireColors(svg, CPU_BASE_COLORS);  // colour each signal a distinct hue (dense datapath)

function render() {
  const i = decodeInstr(PROGRAM[pc]);
  const A = regs[i.rs1], B = regs[i.rs2], Y = aluOp(A, B, i.op);
  const { a1, a0 } = renderCpuTrunk(tk, { clk, pc, i, A, B, Y, regs, we: 1, wdata: Y });

  const cout = (i.op === 0 ? (A & B) : 0) as Bit;
  setNet("cout", cout); setPin("coutTerm", cout);
  setNet("wb", Y);      // the ALU result returning to the write port

  renderReadout({
    a1, a0, instr: `${OP_NAMES[i.op]} r${i.rd},r${i.rs1},r${i.rs2}`,
    A, B, result: Y, regs: `r0=${regs[0]} r1=${regs[1]} r2=${regs[2]} r3=${regs[3]}`,
  });
}

bindCpuControls({
  setClk: (b) => { clk = b; },
  commit: () => {
    const i = decodeInstr(PROGRAM[pc]);
    regs[i.rd] = aluOp(regs[i.rs1], regs[i.rs2], i.op);  // write-back on the edge
    pc = (pc + 1) & 0b11;
  },
  reset: () => { pc = 0; for (let k = 0; k < 4; k++) regs[k] = SEED[k]; clearSnapshot(SNAP_KEY); },
  render,
  persist: () => saveSnapshot<Snap>(SNAP_KEY, { pc, regs: [...regs] as Bit[] }),
});

// ── Drill-downs (click a block → its page, carrying current state). ─────────
const go = (href: string, params: Record<string, string | number>) =>
  window.location.assign(buildDrillUrl(href, { from: "cpu", ...params }));
bindTrunkDrills(go, () => ({ pc, i: decodeInstr(PROGRAM[pc]), regs, we: 1 as Bit }));

initDrillBreadcrumb();
render();
initCanvasZoom();
initSteps();
initProseHighlight(svg);
initPanel();
initToc();
