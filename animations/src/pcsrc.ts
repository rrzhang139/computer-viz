import { initPanel } from "./panel";
import { initToc } from "./toc";
import { readBitParam, initDrillBreadcrumb, loadSnapshot, saveSnapshot, clearSnapshot } from "./drillContext";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";

// PCSrc — the branch decision (P&H single-cycle naming): the ALU result feeds
// a Zero detector (result == 0 ⇔ compared values equal; 1-bit data → a NOT),
// and PCSrc = Branch AND Zero steers the PC-source MUX back in fetch.

type Bit = 0 | 1;
const SVG_NS = "http://www.w3.org/2000/svg";
const svg = document.getElementById("pcsrc") as unknown as SVGSVGElement;

type Snap = { branch: Bit; result: Bit };
const SNAP_KEY = "pcsrc";
const _s = loadSnapshot<Snap>(SNAP_KEY);
let branch: Bit = readBitParam("branch", (_s?.branch ?? 0) as Bit);
let result: Bit = readBitParam("result", (_s?.result ?? 0) as Bit);

// per-wire pulse overlays (same pattern as idecode.ts)
const wires = Array.from(svg.querySelectorAll<SVGPolylineElement>(".wire"));
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
const T = (id: string) => document.getElementById(id) as HTMLElement;

function render() {
  const zero = (result === 0 ? 1 : 0) as Bit;
  const pcsrc = (branch && zero ? 1 : 0) as Bit;

  setNet("branch", branch);
  setNet("result", result);
  setNet("zero", zero);
  setNet("pcsrc", pcsrc);
  document.getElementById("pinBranch")?.setAttribute("data-on", String(branch));
  document.getElementById("pinResult")?.setAttribute("data-on", String(result));
  document.getElementById("pinPcsrc")?.setAttribute("data-on", String(pcsrc));
  document.getElementById("gZero")?.setAttribute("data-on", String(zero));
  document.getElementById("gAnd")?.setAttribute("data-on", String(pcsrc));

  const bB = document.getElementById("btnBranch") as HTMLButtonElement;
  bB.setAttribute("data-on", String(branch)); bB.textContent = `Branch ${branch}`;
  const bR = document.getElementById("btnResult") as HTMLButtonElement;
  bR.setAttribute("data-on", String(result)); bR.textContent = `result ${result}`;

  T("rBranch").textContent = String(branch);
  T("rResult").textContent = String(result);
  T("rZero").textContent = String(zero);
  T("rPcsrc").textContent = String(pcsrc);
}

function persist() { saveSnapshot<Snap>(SNAP_KEY, { branch, result }); }

document.getElementById("btnBranch")?.addEventListener("click", () => { branch = branch ? 0 : 1; render(); persist(); });
document.getElementById("btnResult")?.addEventListener("click", () => { result = result ? 0 : 1; render(); persist(); });
document.getElementById("btnReset")?.addEventListener("click", () => { branch = 0; result = 0; clearSnapshot(SNAP_KEY); render(); });

initDrillBreadcrumb();
render();
initCanvasZoom();
initSteps();
initPanel();
initToc();
