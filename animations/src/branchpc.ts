import { initPanel } from "./panel";
import { initToc } from "./toc";
import { buildDrillUrl, initDrillBreadcrumb, readBitParam, loadSnapshot, saveSnapshot, clearSnapshot } from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";
import { applyWireColors } from "./wireColors";
import { initProseHighlight } from "./proseHighlight";
import { datapath, type Bit, type Pt } from "./lib/datapath";

// Branching program counter, built ONLY from components the earlier pages
// built: two live embeds of /adder4.html (the +1 incrementer and the
// PC + imm target adder), one of /mux.html (the PC-source MUX), and one of
// /register.html (the PC itself — four DFFs). The static SVG carries the
// bus-level schematic (that's what the CPU page's mini preview shows); this
// module re-routes those wires onto the embedded components' projected pins
// and creates the per-bit fans, ties, and n/c stubs at runtime.

const SVG_NS = "http://www.w3.org/2000/svg";
const svg = document.getElementById("branchpc") as unknown as SVGSVGElement;
const tk = datapath(svg);
const { R, setupPulses, setNet, setPin, setBody, lightEmbed, srcTerm } = tk;

type Snap = { pc: number; pcsrc: Bit; t1: Bit; t0: Bit };   // t1/t0 = the imm field bits
const SNAP_KEY = "branchpc";
const _s = loadSnapshot<Snap>(SNAP_KEY);
let pc = (Number(_s?.pc) || 0) & 0b11;
let pcsrc: Bit = readBitParam("pcsrc", (_s?.pcsrc ?? 0) as Bit);
let t1: Bit = readBitParam("tgt1", (_s?.t1 ?? 0) as Bit);
let t0: Bit = readBitParam("tgt0", (_s?.t0 ?? 0) as Bit);
let clk: Bit = 0;

// ── Embed the four components ───────────────────────────────────────────────
const embeds = autoFillEmbeds(svg);
const ADD: Record<string, Pt> = embeds.get("slot-add") || {};
const TA: Record<string, Pt> = embeds.get("slot-tadd") || {};
const MX: Record<string, Pt> = embeds.get("slot-pcmux") || {};
const REG: Record<string, Pt> = embeds.get("slot-reg") || {};

// Runtime-only wires (per-bit fans, ties, n/c stubs). These deliberately do
// NOT exist in the static HTML: the CPU page's mini preview shows only the
// bus-level schematic, while the live page shows the real pin-level wiring.
function mk(id: string, net: string, pts: (Pt | undefined)[]) {
  if (pts.some((p) => !p)) return;
  const w = document.createElementNS(SVG_NS, "polyline");
  w.setAttribute("class", "wire"); w.setAttribute("id", id);
  w.setAttribute("data-net", net);
  w.setAttribute("points", (pts as Pt[]).map((p) => `${p.x},${p.y}`).join(" "));
  svg.appendChild(w);
}
const H = (p: Pt | undefined, x: number): Pt | undefined => p && { x, y: p.y };

const ready = ["pinA0", "pinA1", "pinA2", "pinA3", "pinB0", "pinB1", "pinB2", "pinB3", "pinS0", "pinS1", "pinCin", "pinCout"]
  .every((k) => ADD[k] && TA[k]) && REG.pinCLK && REG.pinD0 && MX.pinIn0;
if (ready) {
  const P = (id: string, p: Pt) => { const c = document.getElementById(id); if (c) { c.setAttribute("cx", String(p.x)); c.setAttribute("cy", String(p.y)); } };
  // select → the MUX's s0; spare select + inputs tied to 0
  R("wPcsrcSel", [{ x: 60, y: 60 }, { x: 590, y: 60 }, H({ x: 0, y: MX.pinS0!.y }, 590)!, MX.pinS0], [MX.pinS0]);
  // the same select drives BOTH slices — a genuine control fan
  R("wSel1", [{ x: 590, y: 312 }, { x: 640, y: 312 }]);
  mk("wMuxS1", "zero", [H(MX.pinS1, 610), MX.pinS1]); srcTerm({ x: 610, y: MX.pinS1!.y }, "0");
  mk("wMuxIn2", "zero", [H(MX.pinIn2, 610), MX.pinIn2]); srcTerm({ x: 610, y: MX.pinIn2!.y }, "0");
  mk("wMuxIn3", "zero", [H(MX.pinIn3, 610), MX.pinIn3]); srcTerm({ x: 610, y: MX.pinIn3!.y }, "0");
  // imm → target adder's B low bits; the sign bit fans into ALL upper B pins
  R("wImm1", [{ x: 60, y: 760 }, { x: 120, y: 760 }, H({ x: 0, y: TA.pinB1!.y }, 120)!, TA.pinB1], [TA.pinB1]);
  R("wImm0", [{ x: 60, y: 816 }, { x: 84, y: 816 }, H({ x: 0, y: TA.pinB0!.y }, 84)!, TA.pinB0], [TA.pinB0]);
  mk("wImmS2", "imm1", [{ x: 120, y: TA.pinB1!.y }, { x: 120, y: TA.pinB2!.y }, TA.pinB2]);
  mk("wImmS3", "imm1", [{ x: 120, y: TA.pinB2!.y }, { x: 120, y: TA.pinB3!.y }, TA.pinB3]);
  mk("wTaCin", "zero", [H(TA.pinCin, 100), TA.pinCin]); srcTerm({ x: 100, y: TA.pinCin!.y }, "0");
  mk("wTaCout", "nc", [TA.pinCout, H(TA.pinCout, 552)]); srcTerm({ x: 576, y: TA.pinCout!.y }, "n/c");
  // +1 adder: B hardwired to the constant 0001, Cin to 0
  mk("wAddB0", "one", [H(ADD.pinB0, 96), ADD.pinB0]); srcTerm({ x: 96, y: ADD.pinB0!.y }, "1 (Vdd)");
  mk("wAddB1", "one", [H(ADD.pinB1, 96), ADD.pinB1]); srcTerm({ x: 96, y: ADD.pinB1!.y }, "0");
  mk("wAddB2", "one", [H(ADD.pinB2, 96), ADD.pinB2]); srcTerm({ x: 96, y: ADD.pinB2!.y }, "0");
  mk("wAddB3", "one", [H(ADD.pinB3, 96), ADD.pinB3]); srcTerm({ x: 96, y: ADD.pinB3!.y }, "0");
  mk("wAddCin", "zero", [H(ADD.pinCin, 96), ADD.pinCin]); srcTerm({ x: 96, y: ADD.pinCin!.y }, "0");
  mk("wAddCout", "nc", [ADD.pinCout, H(ADD.pinCout, 552)]); srcTerm({ x: 576, y: ADD.pinCout!.y }, "n/c");
  // adder sums → the MUX (both low bits onto the per-bit slice's inputs);
  // upper sums honestly n/c (our PC is the low two bits)
  // one wire per bit: S0 into the drillable bit-0 slice, S1 into its twin
  R("wPcnext", [ADD.pinS0, H(ADD.pinS0, 560), { x: 560, y: MX.pinIn0!.y }, MX.pinIn0], [MX.pinIn0]);
  R("wPcnext1", [ADD.pinS1, H(ADD.pinS1, 548), { x: 548, y: 338 }, { x: 640, y: 338 }]);
  mk("wAddS2", "nc", [ADD.pinS2, H(ADD.pinS2, 552)]); srcTerm({ x: 576, y: ADD.pinS2!.y }, "n/c");
  mk("wAddS3", "nc", [ADD.pinS3, H(ADD.pinS3, 552)]); srcTerm({ x: 576, y: ADD.pinS3!.y }, "n/c");
  R("wTgt", [TA.pinS0, H(TA.pinS0, 620), { x: 620, y: MX.pinIn1!.y }, MX.pinIn1], [MX.pinIn1]);
  R("wTgt1", [TA.pinS1, H(TA.pinS1, 616), { x: 616, y: 364 }, { x: 640, y: 364 }]);
  mk("wTaS2", "nc", [TA.pinS2, H(TA.pinS2, 552)]); srcTerm({ x: 576, y: TA.pinS2!.y }, "n/c");
  mk("wTaS3", "nc", [TA.pinS3, H(TA.pinS3, 552)]); srcTerm({ x: 576, y: TA.pinS3!.y }, "n/c");
  // MUX out → the register's low D inputs; upper D tied 0
  R("wPcsel", [MX.pinOut, H(MX.pinOut, 1012), { x: 1012, y: REG.pinD0!.y }, REG.pinD0], [MX.pinOut, REG.pinD0]);
  R("wPcsel1", [{ x: 1000, y: 345 }, { x: 1022, y: 345 }, { x: 1022, y: REG.pinD1!.y }, REG.pinD1], [REG.pinD1]);
  mk("wRegD2", "zero", [H(REG.pinD2, 990), REG.pinD2]);
  mk("wRegD3", "zero", [H(REG.pinD3, 990), REG.pinD3]);
  // clock → the register's edge (over the top, from the page's left edge)
  R("wClk", [{ x: 60, y: 1160 }, { x: 1660, y: 1160 }, { x: 1660, y: 250 }, { x: REG.pinCLK!.x, y: 250 }, REG.pinCLK], [REG.pinCLK]);
  // the link tap: the PC+1 bus also leaves the block (a jump writes it back)
  R("wPcp1", [{ x: 560, y: MX.pinIn0!.y }, { x: 560, y: 1060 }, { x: 1700, y: 1060 }, { x: 1700, y: 980 }]);
  // Q → address out + the feedback loops into BOTH adders' A inputs
  P("pinA1", { x: 1490, y: REG.pinQ1!.y }); P("pinA0", { x: 1490, y: REG.pinQ0!.y });
  R("wQ1out", [REG.pinQ1, { x: 1490, y: REG.pinQ1!.y }]);
  R("wQ0out", [REG.pinQ0, { x: 1490, y: REG.pinQ0!.y }]);
  R("wFb", [REG.pinQ1, { x: 1628, y: REG.pinQ1!.y }, { x: 1628, y: 1120 }, { x: 100, y: 1120 }, { x: 100, y: ADD.pinA1!.y }, ADD.pinA1], [ADD.pinA1]);
  mk("wFb0", "addr0", [REG.pinQ0, { x: 1560, y: REG.pinQ0!.y }, { x: 1560, y: 1098 }, { x: 78, y: 1098 }, { x: 78, y: ADD.pinA0!.y }, ADD.pinA0]);
  R("wFbT", [{ x: 100, y: TA.pinA1!.y }, TA.pinA1], [TA.pinA1]);
  mk("wFbT0", "addr0", [{ x: 78, y: TA.pinA0!.y }, TA.pinA0]);
  // unused upper PC bits: tie both adders' upper A inputs to 0
  for (const [ad, tag] of [[ADD, "a"], [TA, "t"]] as const) {
    mk(`w${tag}A2z`, "zero", [H(ad.pinA2, 108), ad.pinA2]);
    mk(`w${tag}A3z`, "zero", [H(ad.pinA3, 108), ad.pinA3]);
  }
  // register upper Q bits honestly n/c
  mk("wRegQ2", "nc", [REG.pinQ2, H(REG.pinQ2, 1444)]); srcTerm({ x: 1468, y: REG.pinQ2!.y }, "n/c");
  mk("wRegQ3", "nc", [REG.pinQ3, H(REG.pinQ3, 1444)]); srcTerm({ x: 1468, y: REG.pinQ3!.y }, "n/c");
}

setupPulses();
applyWireColors(svg, {
  clk: "#56ccf2",
  pcsrc: "#ffcf3a",                    // control — amber
  imm1: "#ff6fae", imm0: "#ff6fae",    // the imm field (rd slot) — pink
  target: "#6f8cff", pcnext: "#6f8cff", pcsel: "#6f8cff",
  addr1: "#6f8cff", addr0: "#6f8cff",  // PC values — blue
  one: "#8a7a55", zero: "#555555", cout: "#555555",
});

const T = (id: string) => document.getElementById(id) as HTMLElement;
const setBtn = (id: string, label: string, v: Bit) => {
  const b = document.getElementById(id) as HTMLButtonElement;
  b.setAttribute("data-on", String(v)); b.textContent = `${label} ${v}`;
};

// light an embedded register / adder to its logical state (counter.ts pattern)
function lightRegister(hostId: string, D: Bit[], Q: Bit[], c: Bit) {
  const host = document.getElementById(hostId);
  if (!host) return;
  const w = (net: string, on: Bit) => host.querySelectorAll(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute("data-on", String(on)));
  const body = (id: string, on: Bit) => host.querySelector(`[data-body="${id}"]`)?.setAttribute("data-on", String(on));
  for (let i = 0; i < 4; i++) { w(`D${i}`, D[i]); w(`Q${i}`, Q[i]); body(`gBit${i}`, Q[i]); }
  w("CLK", c);
}
function lightAdder(hostId: string, A: Bit[], B: Bit[], cin: Bit) {
  const host = document.getElementById(hostId);
  if (!host) return;
  const w = (net: string, on: Bit) => host.querySelectorAll(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute("data-on", String(on)));
  const body = (id: string, on: Bit) => host.querySelector(`[data-body="${id}"]`)?.setAttribute("data-on", String(on));
  const c: Bit[] = [cin, 0, 0, 0, 0] as Bit[];
  const S: Bit[] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    S[i] = (A[i] ^ B[i] ^ c[i]) as Bit;
    c[i + 1] = ((A[i] & B[i]) | (A[i] & c[i]) | (B[i] & c[i])) as Bit;
    w(`A${i}`, A[i]); w(`B${i}`, B[i]); w(`S${i}`, S[i]); w(`C${i}`, c[i]);
    body(`gFa${i}`, (A[i] || B[i] || c[i]) as Bit);
  }
  w("Cin", cin); w("Cout", c[4] as Bit);
}

function render() {
  const next = (pc + 1) & 0b11;
  const simm = t1 * 2 + t0 >= 2 ? t1 * 2 + t0 - 4 : t1 * 2 + t0;   // signed 2-bit imm
  const tgt = (pc + simm) & 0b11;                                   // PC-relative target
  const pick = pcsrc ? tgt : next;
  const [a1, a0] = [(pc >> 1) & 1, pc & 1] as [Bit, Bit];
  const bit = (n: number, i: number): Bit => ((n >> i) & 1) as Bit;

  setNet("clk", clk); setPin("pinClk", clk);
  setNet("pcsrc", pcsrc); setPin("pinPcsrc", pcsrc);
  setNet("imm1", t1); setPin("pinImm1", t1);
  setNet("imm0", t0); setPin("pinImm0", t0);
  setNet("target", 1);
  setNet("pcnext", 1);
  setNet("pcsel", 1);
  setNet("one", 1); setNet("zero", 0); setNet("cout", 0);
  setNet("addr1", a1); setPin("pinA1", a1);
  setNet("addr0", a0); setPin("pinA0", a0);
  setBody("gAdd", 1); setBody("gTAdd", 1); setBody("gReg", 1); setBody("gPcmux", 1); setBody("gPcmux1", 1);

  // light the four real components to their logical state
  lightAdder("addDetail", [a0, a1, 0, 0], [1, 0, 0, 0], 0);
  // sign-extended imm: B = [imm0, imm1, imm1, imm1]
  lightAdder("taddDetail", [a0, a1, 0, 0], [t0, t1, t1, t1], 0);
  lightRegister("regDetail", [bit(pick, 0), bit(pick, 1), 0, 0], [a0, a1, 0, 0], clk);
  const in0 = next & 1, in1 = tgt & 1;
  const out = pick & 1;
  lightEmbed("pcmuxDetail", {
    in0, in1, in2: 0, in3: 0, s1: 0, s0: pcsrc,
    [`sel${pcsrc ? 1 : 0}`]: 1, [`andOut${pcsrc ? 1 : 0}`]: out, out,
  }, { [`gAnd${pcsrc ? 1 : 0}`]: 1, gOr: 1, gDecoder: 1 });

  setBtn("btnPcsrc", "PCSrc", pcsrc); setBtn("btnT1", "imm₁", t1); setBtn("btnT0", "imm₀", t0);
  T("rPc").textContent = `${a1}${a0}`;
  T("rNext").textContent = `${(next >> 1) & 1}${next & 1}`;
  T("rImm").textContent = `${simm >= 0 ? "+" : ""}${simm}`;
  T("rTgt").textContent = `${(tgt >> 1) & 1}${tgt & 1}`;
  T("rPick").textContent = `${(pick >> 1) & 1}${pick & 1} (${pcsrc ? "target" : "+1"})`;
}

function persist() { saveSnapshot<Snap>(SNAP_KEY, { pc, pcsrc, t1, t0 }); }

let busy = false;
document.getElementById("btnPulse")!.addEventListener("click", () => {
  if (busy) return;
  busy = true;
  clk = 1; render();
  setTimeout(() => {
    const simm = t1 * 2 + t0 >= 2 ? t1 * 2 + t0 - 4 : t1 * 2 + t0;
    pc = pcsrc ? (pc + simm) & 0b11 : (pc + 1) & 0b11;
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

// drills: every block descends into the page that built it
const go = (href: string, params: Record<string, string | number>) =>
  window.location.assign(buildDrillUrl(href, { from: "branchpc", ...params }));
document.getElementById("slot-add")!.addEventListener("click", () => go("/adder4.html", { which: "pc-plus-1" }));
document.getElementById("slot-tadd")!.addEventListener("click", () => go("/adder4.html", { which: "branch-target" }));
document.getElementById("slot-reg")!.addEventListener("click", () => go("/register.html", { which: "the-pc" }));
document.getElementById("slot-pcmux")!.addEventListener("click", () => go("/mux.html", { which: "pc-source", s1: 0, s0: pcsrc }));

initDrillBreadcrumb();
render();
initCanvasZoom();
initSteps();
initProseHighlight(svg);
initPanel();
initToc();
