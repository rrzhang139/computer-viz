import { initPanel } from "./panel";
import { initToc } from "./toc";
import { buildDrillUrl, readBitParam, initDrillBreadcrumb, loadSnapshot, saveSnapshot, clearSnapshot } from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";
import { applyWireColors } from "./wireColors";
import { initProseHighlight } from "./proseHighlight";

// Control unit — the circuit inside the instruction decoder that turns the
// opcode + funct fields into named control lines. One 2-to-4 decoder (an
// exact embed of /decoder.html) matches the opcode into a one-hot row;
// rows 10/11 ARE memToReg/memWrite; row 01 (the control-flow family) is
// refined by three gates: Branch = fam·f̄₁, Jump = fam·f₁·f̄₀.

type Bit = 0 | 1;
const SVG_NS = "http://www.w3.org/2000/svg";
const svg = document.getElementById("ctrlunit") as unknown as SVGSVGElement;

type Snap = { oc1: Bit; oc0: Bit; f1: Bit; f0: Bit };
const SNAP_KEY = "ctrlunit";
const _s = loadSnapshot<Snap>(SNAP_KEY);
let oc1: Bit = readBitParam("oc1", (_s?.oc1 ?? 0) as Bit);
let oc0: Bit = readBitParam("oc0", (_s?.oc0 ?? 0) as Bit);
let f1: Bit = readBitParam("f1", (_s?.f1 ?? 0) as Bit);
let f0: Bit = readBitParam("f0", (_s?.f0 ?? 0) as Bit);

// Embed the real decoder scene into the slot (renderer-backed page).
autoFillEmbeds(svg);
const opdecDetail = document.getElementById("opdecDetail");

// per-wire pulse overlays (page wires only, not the embedded decoder's)
const wires = Array.from(svg.querySelectorAll<SVGPolylineElement>(".wire")).filter((w) => !w.closest(".detailed"));
const pulseFor = new Map<SVGPolylineElement, SVGPolylineElement>();
for (const w of wires) {
  const p = document.createElementNS(SVG_NS, "polyline");
  p.setAttribute("class", "pulse");
  p.setAttribute("points", w.getAttribute("points") || "");
  const net = w.getAttribute("data-net");
  if (net) p.setAttribute("data-net", net);
  w.insertAdjacentElement("afterend", p);
  pulseFor.set(w, p);
}
function setNet(net: string, on: Bit) {
  for (const w of wires) if (w.getAttribute("data-net") === net) {
    w.setAttribute("data-on", String(on));
    pulseFor.get(w)?.setAttribute("data-on", String(on));
  }
}
const setEl = (id: string, on: Bit) => document.getElementById(id)?.setAttribute("data-on", String(on));
const T = (id: string) => document.getElementById(id) as HTMLElement;

applyWireColors(svg, {
  oc1: "#c084fc", oc0: "#c084fc",                 // instruction-field purple
  one: "#8b8b8b",
  fam: "#ffcf3a", r00: "#8b8b8b",
  f1: "#c084fc", f0: "#c084fc",
  f1bar: "#7ee0ff", f0bar: "#7ee0ff", jmp1: "#ffcf3a",
  branch: "#ffcf3a", jump: "#ffcf3a",             // control — amber
  memtoreg: "#ffcf3a", memwrite: "#ffcf3a",
});

const KIND = (o1: Bit, o0: Bit, g1: Bit, g0: Bit): string =>
  o1 === 0 && o0 === 0 ? "ADD (R-type)"
  : o1 === 0 && o0 === 1 ? (g1 === 0 ? (g0 === 0 ? "BEQ (branch)" : "BNE (branch)") : g0 === 0 ? "JAL (jump)" : "— (unused funct)")
  : o1 === 1 && o0 === 0 ? "LW (load)" : "SW (store)";

function render() {
  const sel = [
    (oc1 === 0 && oc0 === 0 ? 1 : 0) as Bit,
    (oc1 === 0 && oc0 === 1 ? 1 : 0) as Bit,
    (oc1 === 1 && oc0 === 0 ? 1 : 0) as Bit,
    (oc1 === 1 && oc0 === 1 ? 1 : 0) as Bit,
  ];
  const fam = sel[1];
  const f1bar = (f1 ? 0 : 1) as Bit, f0bar = (f0 ? 0 : 1) as Bit;
  const branch = (fam && f1bar ? 1 : 0) as Bit;
  const jmp1 = (fam && f1 ? 1 : 0) as Bit;
  const jump = (jmp1 && f0bar ? 1 : 0) as Bit;
  const memtoreg = sel[2], memwrite = sel[3];

  setNet("oc1", oc1); setNet("oc0", oc0); setNet("one", 1);
  setNet("fam", fam); setNet("r00", sel[0]);
  setNet("f1", f1); setNet("f0", f0);
  setNet("f1bar", f1bar); setNet("f0bar", f0bar); setNet("jmp1", jmp1);
  setNet("branch", branch); setNet("jump", jump);
  setNet("memtoreg", memtoreg); setNet("memwrite", memwrite);

  setEl("pinOc1", oc1); setEl("pinOc0", oc0); setEl("pinF1", f1); setEl("pinF0", f0);
  setEl("pinR", sel[0]);
  setEl("pinBranch", branch); setEl("pinJump", jump);
  setEl("pinMemToReg", memtoreg); setEl("pinMemWrite", memwrite);
  setEl("gOpdec", 1);
  setEl("gNot1", f1bar); setEl("gNot0", f0bar);
  setEl("gAnd1", branch); setEl("gAnd2", jmp1); setEl("gAnd3", jump);

  // The embedded decoder preview mirrors /decoder.html's own lighting rules.
  if (opdecDetail) {
    const na1 = (oc1 ? 0 : 1) as Bit, na0 = (oc0 ? 0 : 1) as Bit;
    const body = (id: string, on: Bit) =>
      opdecDetail.querySelector(`[data-body="${id}"]`)?.setAttribute("data-on", String(on));
    body("gInvA1", na1); body("gInvA0", na0);
    body("gAnd3", sel[3]); body("gAnd2", sel[2]); body("gAnd1", sel[1]); body("gAnd0", sel[0]);
    const pnet = (net: string, on: Bit) =>
      opdecDetail.querySelectorAll<SVGElement>(`.wire[data-net="${net}"]`).forEach((w) => w.setAttribute("data-on", String(on)));
    pnet("a1", oc1); pnet("a0", oc0); pnet("a1bar", na1); pnet("a0bar", na0); pnet("EN", 1);
    pnet("sel3", sel[3]); pnet("sel2", sel[2]); pnet("sel1", sel[1]); pnet("sel0", sel[0]);
  }

  const btn = (id: string, on: Bit, name: string) => {
    const b = document.getElementById(id) as HTMLButtonElement;
    b.setAttribute("data-on", String(on)); b.textContent = `${name} ${on}`;
  };
  btn("btnOc1", oc1, "oc₁"); btn("btnOc0", oc0, "oc₀");
  btn("btnF1", f1, "f₁"); btn("btnF0", f0, "f₀");

  T("rKind").textContent = KIND(oc1, oc0, f1, f0);
  T("rBranch").textContent = String(branch);
  T("rJump").textContent = String(jump);
  T("rMemToReg").textContent = String(memtoreg);
  T("rMemWrite").textContent = String(memwrite);
}

function persist() { saveSnapshot<Snap>(SNAP_KEY, { oc1, oc0, f1, f0 }); }
document.getElementById("btnOc1")?.addEventListener("click", () => { oc1 = oc1 ? 0 : 1; render(); persist(); });
document.getElementById("btnOc0")?.addEventListener("click", () => { oc0 = oc0 ? 0 : 1; render(); persist(); });
document.getElementById("btnF1")?.addEventListener("click", () => { f1 = f1 ? 0 : 1; render(); persist(); });
document.getElementById("btnF0")?.addEventListener("click", () => { f0 = f0 ? 0 : 1; render(); persist(); });
document.getElementById("btnReset")?.addEventListener("click", () => { oc1 = 0; oc0 = 0; f1 = 0; f0 = 0; clearSnapshot(SNAP_KEY); render(); });

// Drill: the decoder slot opens the real decoder page with the live address.
document.getElementById("slot-opdec")?.addEventListener("click", () => {
  window.location.assign(buildDrillUrl("/decoder.html", {
    from: "ctrlunit", which: "opdec", a1: oc1, a0: oc0, EN: 1,
  }));
});

initDrillBreadcrumb();
render();
initCanvasZoom();
initSteps();
initProseHighlight(svg);
initPanel();
initToc();
