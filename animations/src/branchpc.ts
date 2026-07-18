import { initPanel } from "./panel";
import { initToc } from "./toc";
import { buildDrillUrl, initDrillBreadcrumb, readBitParam, loadSnapshot, saveSnapshot, clearSnapshot } from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";
import { applyWireColors } from "./wireColors";
import { initProseHighlight } from "./proseHighlight";
import { datapath, x, y, type Bit, type Pt } from "./lib/datapath";

// Branching program counter — the counter page's +1 loop, opened by a
// PC-source MUX: in0 = PC+1 (sequential), in1 = the branch target, select =
// PCSrc (Branch AND Zero, computed beside the ALU). The MUX slot is a live
// embed of /mux.html — the per-bit slice; this 2-bit PC is two such slices.

const svg = document.getElementById("branchpc") as unknown as SVGSVGElement;
const tk = datapath(svg);
const { R, stub, setupPulses, setNet, setPin, setBody, lightEmbed } = tk;

type Snap = { pc: number; pcsrc: Bit; t1: Bit; t0: Bit };
const SNAP_KEY = "branchpc";
const _s = loadSnapshot<Snap>(SNAP_KEY);
let pc = (Number(_s?.pc) || 0) & 0b11;
let pcsrc: Bit = readBitParam("pcsrc", (_s?.pcsrc ?? 0) as Bit);
let t1: Bit = readBitParam("tgt1", (_s?.t1 ?? 0) as Bit);
let t0: Bit = readBitParam("tgt0", (_s?.t0 ?? 0) as Bit);
let clk: Bit = 0;

// ── Embed the MUX; route every wire that touches it onto projected pins ─────
const embeds = autoFillEmbeds(svg);
const MX: Record<string, Pt> = embeds.get("slot-pcmux") || {};

const PCSRC_IN = { x: 60, y: 60 };
const T1_IN = { x: 60, y: 260 }, T0_IN = { x: 60, y: 320 };
const ADD_OUT1 = { x: 420, y: 288 }, ADD_OUT0 = { x: 420, y: 420 };
const REG_D = { x: 1040, y: 370 };

// select rides the top lane and drops onto the embedded MUX's s0 pin
R("wPcsrcSel", [PCSRC_IN, x(940, PCSRC_IN), x(940, MX.pinS0), MX.pinS0], [MX.pinS0]);
// tgt0 lands on the embedded slice's in1; tgt1 enters bit 1's twin block
R("wTgt1", [T1_IN, x(508, T1_IN), { x: 508, y: 100 }, { x: 560, y: 100 }]);
R("wTgt0", [T0_IN, x(520, T0_IN), MX.pinIn1 && y(MX.pinIn1.y, { x: 520, y: 0 }), MX.pinIn1], [MX.pinIn1]);
// +1 result: bit 0 → the embedded slice's in0; bit 1 → the twin block
R("wPcnext", [ADD_OUT1, x(472, ADD_OUT1), { x: 472, y: 124 }, { x: 560, y: 124 }]);
R("wPcnext0", [ADD_OUT0, x(448, ADD_OUT0), MX.pinIn0 && y(MX.pinIn0.y, { x: 448, y: 0 }), MX.pinIn0], [MX.pinIn0]);
// unused MUX inputs + high select tie to 0 — honest hardwired stubs
stub("wMuxIn2", MX.pinIn2, "0", 540);
stub("wMuxIn3", MX.pinIn3, "0", 540);
stub("wMuxS1", MX.pinS1, "0", 540);
// MUX output → the register's D
R("wPcsel", [MX.pinOut, x(980, MX.pinOut), x(980, REG_D), REG_D], [MX.pinOut]);

setupPulses();
applyWireColors(svg, {
  clk: "#56ccf2",
  pcsrc: "#ffcf3a",                    // control — amber
  tgt1: "#ff6fae", tgt0: "#ff6fae",    // branch target = the rd field — pink
  pcnext: "#6f8cff", pcsel: "#6f8cff", // PC values — blue
  addr1: "#6f8cff", addr0: "#6f8cff",
});

const T = (id: string) => document.getElementById(id) as HTMLElement;
const setBtn = (id: string, label: string, v: Bit) => {
  const b = document.getElementById(id) as HTMLButtonElement;
  b.setAttribute("data-on", String(v)); b.textContent = `${label} ${v}`;
};

function render() {
  const next = (pc + 1) & 0b11;
  const tgt = t1 * 2 + t0;
  const pick = pcsrc ? tgt : next;
  const [a1, a0] = [(pc >> 1) & 1, pc & 1] as [Bit, Bit];

  setNet("clk", clk); setPin("pinClk", clk);
  setNet("pcsrc", pcsrc); setPin("pinPcsrc", pcsrc);
  setNet("tgt1", t1); setPin("pinT1", t1);
  setNet("tgt0", t0); setPin("pinT0", t0);
  setNet("pcnext", 1);
  setNet("pcsel", 1);
  setNet("addr1", a1); setPin("pinA1", a1);
  setNet("addr0", a0); setPin("pinA0", a0);
  setNet("zero", 0);
  setBody("gAdd", 1); setBody("gReg", (pc !== 0 ? 1 : 0) as Bit); setBody("gPcmux", 1); setBody("gMux1", 1);

  // the embedded MUX slice shows the low bit's traffic
  const in0 = next & 1, in1 = t0;
  const out = pick & 1;
  lightEmbed("pcmuxDetail", {
    in0, in1, in2: 0, in3: 0, s1: 0, s0: pcsrc,
    [`sel${pcsrc ? 1 : 0}`]: 1, [`andOut${pcsrc ? 1 : 0}`]: out, out,
  }, { [`gAnd${pcsrc ? 1 : 0}`]: 1, gOr: 1, gDecoder: 1 });

  setBtn("btnPcsrc", "PCSrc", pcsrc); setBtn("btnT1", "t₁", t1); setBtn("btnT0", "t₀", t0);
  T("rPc").textContent = `${a1}${a0}`;
  T("rNext").textContent = `${(next >> 1) & 1}${next & 1}`;
  T("rTgt").textContent = `${t1}${t0}`;
  T("rPick").textContent = `${(pick >> 1) & 1}${pick & 1} (${pcsrc ? "target" : "+1"})`;
}

function persist() { saveSnapshot<Snap>(SNAP_KEY, { pc, pcsrc, t1, t0 }); }

let busy = false;
document.getElementById("btnPulse")!.addEventListener("click", () => {
  if (busy) return;
  busy = true;
  clk = 1; render();
  setTimeout(() => {
    pc = pcsrc ? t1 * 2 + t0 : (pc + 1) & 0b11;
    clk = 0; render(); persist();
    busy = false;
  }, 320);
});
document.getElementById("btnPcsrc")!.addEventListener("click", () => { pcsrc = pcsrc ? 0 : 1; render(); persist(); });
document.getElementById("btnT1")!.addEventListener("click", () => { t1 = t1 ? 0 : 1; render(); persist(); });
document.getElementById("btnT0")!.addEventListener("click", () => { t0 = t0 ? 0 : 1; render(); persist(); });
document.getElementById("btnReset")!.addEventListener("click", () => {
  pc = 0; pcsrc = 0; t1 = 0; t0 = 0; clk = 0; clearSnapshot(SNAP_KEY); render();
});

// drill: the MUX slice is /mux.html with which=pc-source
document.getElementById("slot-pcmux")!.addEventListener("click", () => {
  window.location.assign(buildDrillUrl("/mux.html", { from: "branchpc", which: "pc-source", s1: 0, s0: pcsrc }));
});

initDrillBreadcrumb();
render();
initCanvasZoom();
initSteps();
initProseHighlight(svg);
initPanel();
initToc();
