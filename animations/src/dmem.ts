import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";

// Data memory (addressable read+write store). The read path is identical to
// /mem.html: a 2-bit address selects one of four 1-bit cells; the read MUX
// (exact-copy embed of /mux.html) forwards it as rdata, combinationally. The
// write path: on a clock edge with we=1, an address-decoded write line stores
// wdata into the one addressed cell. Cells persist across clocks (this is the
// data the load/store path reads and writes).

type Bit = 0 | 1;
const SVG_NS = "http://www.w3.org/2000/svg";
const svg = document.getElementById("dmem") as unknown as SVGSVGElement;

const btnAddr1 = document.getElementById("btnAddr1") as HTMLButtonElement;
const btnAddr0 = document.getElementById("btnAddr0") as HTMLButtonElement;
const btnWdata = document.getElementById("btnWdata") as HTMLButtonElement;
const btnWe = document.getElementById("btnWe") as HTMLButtonElement;
const btnStep = document.getElementById("btnStep") as HTMLButtonElement;
const btnReset = document.getElementById("btnReset") as HTMLButtonElement;

const SEED: Bit[] = [0, 0, 0, 0];
type Snap = { a1: Bit; a0: Bit; wdata: Bit; we: Bit; cells: Bit[] };
const SNAP_KEY = "dmem";
const _snap = loadSnapshot<Snap>(SNAP_KEY);
let a1: Bit = readBitParam("addr1", _snap?.a1 ?? 0);
let a0: Bit = readBitParam("addr0", _snap?.a0 ?? 0);
let wdata: Bit = readBitParam("wdata", _snap?.wdata ?? 0);
let we: Bit = (_snap?.we ?? 0) as Bit;
const cells: Bit[] = [0, 1, 2, 3].map((i) => (_snap?.cells?.[i] ?? SEED[i]) as Bit);
let clk: Bit = 0;

// ── Embed the real MUX; route read wires onto its projected pins. ─────────
type Pt = { x: number; y: number };
const embeds = autoFillEmbeds(svg);
const MUX: Record<string, Pt> = embeds.get("slot-readmux") || {};
const readmuxDetail = document.getElementById("readmuxDetail");
const setW = (id: string, pts: string) => document.getElementById(id)?.setAttribute("points", pts);

const WORD_Y = [700, 520, 340, 160];   // cell center y, index = addr (0..3)
const WORD_LANE = [700, 660, 660, 700]; // word→MUX vertical lane x
const WSEL_LANE = [30, 90, 120, 150];   // write-select lanes (spread, < cells x=160)

if (MUX.pinS1 && MUX.pinS0 && MUX.pinIn0 && MUX.pinIn1 && MUX.pinIn2 && MUX.pinIn3 && MUX.pinOut) {
  setW("wAddr1", `0,100 0,50 840,50 840,${MUX.pinS1.y} ${MUX.pinS1.x},${MUX.pinS1.y}`);
  setW("wAddr0", `0,180 20,180 20,30 1080,30 1080,${MUX.pinS0.y} ${MUX.pinS0.x},${MUX.pinS0.y}`);
  const inPin = [MUX.pinIn0, MUX.pinIn1, MUX.pinIn2, MUX.pinIn3];
  for (let k = 0; k < 4; k++) {
    const lane = WORD_LANE[k], yy = WORD_Y[k], p = inPin[k];
    setW(`wWord${k}`, `480,${yy} ${lane},${yy} ${lane},${p.y} ${p.x},${p.y}`);
  }
  setW("wRdata", `${MUX.pinOut.x},${MUX.pinOut.y} 1520,${MUX.pinOut.y} 1520,480 1600,480`);
}
// write-select lines: write port top edge → up the gutter → into each cell's left edge
for (let k = 0; k < 4; k++) {
  const lane = WSEL_LANE[k], yy = WORD_Y[k];
  setW(`wWsel${k}`, `${lane},780 ${lane},${yy} 160,${yy}`);
}

// ── Per-wire pulse overlays (skip the embedded MUX's own wires). ──────────
const wires = Array.from(svg.querySelectorAll<SVGPolylineElement>(".wire")).filter((w) => !w.closest(".detailed"));
const pulseFor = new Map<SVGPolylineElement, SVGPolylineElement>();
for (const w of wires) {
  const p = document.createElementNS(SVG_NS, "polyline");
  p.setAttribute("class", "pulse");
  p.setAttribute("points", w.getAttribute("points") || "");
  const net = w.getAttribute("data-net");
  if (net) p.setAttribute("data-net", net);
  p.setAttribute("data-on", w.getAttribute("data-on") || "0");
  w.insertAdjacentElement("afterend", p);
  pulseFor.set(w, p);
}
function setNet(net: string, on: Bit) {
  for (const w of wires) if (w.getAttribute("data-net") === net) {
    w.setAttribute("data-on", String(on));
    pulseFor.get(w)?.setAttribute("data-on", String(on));
  }
}
const setPin = (id: string, on: Bit) => document.getElementById(id)?.setAttribute("data-on", String(on));
function setBtn(btn: HTMLButtonElement, label: string, v: Bit) {
  btn.setAttribute("data-on", String(v));
  btn.textContent = `${label} ${v}`;
}
const T = (id: string) => document.getElementById(id) as HTMLElement;

function render() {
  const addr = a1 * 2 + a0;

  setNet("addr1", a1); setPin("pinAddr1", a1);
  setNet("addr0", a0); setPin("pinAddr0", a0);
  setNet("waddr", 1);  // the address also feeds the write decoder

  // cells: body lights by stored value; the word→MUX wire lights for the read selection
  for (let k = 0; k < 4; k++) {
    T(`vWord${k}`).textContent = String(cells[k]);
    document.getElementById(`gWord${k}`)?.setAttribute("data-on", String(cells[k]));
    setNet(`word${k}`, (k === addr ? 1 : 0) as Bit);
  }
  setNet("rdata", cells[addr]); setPin("pinRdata", cells[addr]);

  // write path: wdata/we/clk into the write port; the selected write line lights
  // only when armed (we=1) for the addressed cell.
  setNet("wdata", wdata); setPin("pinWdata", wdata);
  setNet("we", we); setPin("pinWe", we);
  setNet("clk", clk); setPin("pinClk", clk);
  setBody("gWritePort", (we && clk) as Bit);
  for (let k = 0; k < 4; k++) setNet(`wsel${k}`, (we && k === addr ? 1 : 0) as Bit);

  // read MUX embed lit to the selected path
  if (readmuxDetail) {
    const sel: Bit[] = [0, 0, 0, 0]; sel[addr] = 1;
    const body = (id: string, on: Bit) =>
      readmuxDetail.querySelector(`[data-body="${id}"]`)?.setAttribute("data-on", String(on));
    const w = (net: string, on: Bit) =>
      readmuxDetail.querySelectorAll<SVGPolylineElement>(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute("data-on", String(on)));
    w("s1", a1); w("s0", a0);
    for (let k = 0; k < 4; k++) {
      w(`in${k}`, (k === addr ? cells[k] : 0) as Bit);
      w(`sel${k}`, sel[k]);
      w(`andOut${k}`, (k === addr ? cells[k] : 0) as Bit);
      body(`gAnd${k}`, sel[k]);
    }
    w("out", cells[addr]);
    body("gOr", 1); body("gDecoder", 1);
  }

  setBtn(btnAddr1, "addr1", a1);
  setBtn(btnAddr0, "addr0", a0);
  setBtn(btnWdata, "wdata", wdata);
  setBtn(btnWe, "we", we);

  T("addrBits").textContent = `${a1}${a0}`;
  T("addrDec").textContent = `(${addr})`;
  T("rdataBits").textContent = String(cells[addr]);
  T("cellBits").textContent = `m0=${cells[0]} m1=${cells[1]} m2=${cells[2]} m3=${cells[3]}`;
}
const setBody = (id: string, on: Bit) => document.getElementById(id)?.setAttribute("data-on", String(on));

function persist() { saveSnapshot<Snap>(SNAP_KEY, { a1, a0, wdata, we, cells: [...cells] as Bit[] }); }

btnAddr1.addEventListener("click", () => { a1 = (a1 ? 0 : 1); render(); persist(); });
btnAddr0.addEventListener("click", () => { a0 = (a0 ? 0 : 1); render(); persist(); });
btnWdata.addEventListener("click", () => { wdata = (wdata ? 0 : 1); render(); persist(); });
btnWe.addEventListener("click", () => { we = (we ? 0 : 1); render(); persist(); });
btnStep.addEventListener("click", () => {
  clk = 1; render();
  setTimeout(() => {
    if (we) cells[a1 * 2 + a0] = wdata;   // commit on the edge
    clk = 0; render(); persist();
  }, 320);
});
btnReset.addEventListener("click", () => {
  a1 = 0; a0 = 0; wdata = 0; we = 0; for (let k = 0; k < 4; k++) cells[k] = SEED[k];
  clk = 0; clearSnapshot(SNAP_KEY); render();
});

// ── Drill-down: clicking the read MUX opens /mux.html with this address. ──
document.getElementById("slot-readmux")?.addEventListener("click", () => {
  window.location.assign(buildDrillUrl("/mux.html", {
    from: "dmem", which: "read-mux", s1: a1, s0: a0,
  }));
});

initDrillBreadcrumb();
render();
initCanvasZoom();
initSteps();
initPanel();
initToc();
