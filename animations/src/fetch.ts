import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";

// Fetch — program counter addresses instruction memory; the addressed word is
// the instruction; on each clock the PC advances +1. The PC is a display block
// (its count + a +1 self-loop); the memory is an EXACT-copy embed of /mem.html
// (drillable), with addr/rdata wires routed onto its projected pins.

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('fetch') as unknown as SVGSVGElement;

const btnStep  = document.getElementById('btnStep')  as HTMLButtonElement;
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;

// Same seeded program as /mem.html (opcode|rs1|rs2|rd; op 00 ADD 01 AND 10 OR 11 XOR).
const PROGRAM = ['00000110', '10100011', '11110001', '01011000']; // addr 0..3
const OP_NAMES = ['ADD', 'AND', 'OR', 'XOR'];

type Snap = { pc: number };
const SNAP_KEY = 'fetch';
const _snap = loadSnapshot<Snap>(SNAP_KEY);
let pc = (_snap?.pc ?? 0) & 0b11;   // 2-bit program counter (0..3)
let clk: Bit = 0;

// ── Embed the real memory; route addr/rdata onto its projected pins. ──────
type Pt = { x: number; y: number };
const embeds = autoFillEmbeds(svg);
const MEM: Record<string, Pt> = embeds.get('slot-mem') || {};
const memDetail = document.getElementById('memDetail');
const setW = (id: string, pts: string) => document.getElementById(id)?.setAttribute('points', pts);

if (MEM.pinAddr1 && MEM.pinAddr0 && MEM.pinRdata) {
  setW('wAddr1', `480,520 660,520 660,${MEM.pinAddr1.y} ${MEM.pinAddr1.x},${MEM.pinAddr1.y}`);
  setW('wAddr0', `480,600 700,600 700,${MEM.pinAddr0.y} ${MEM.pinAddr0.x},${MEM.pinAddr0.y}`);
  setW('wInstr', `${MEM.pinRdata.x},${MEM.pinRdata.y} 1500,${MEM.pinRdata.y} 1500,560 1600,560`);
}

// Fill the embedded mem table with the actual program (the raw clone shows the
// static "00000000" defaults; .word-val texts are in DOM order word3..word0).
if (memDetail) {
  const vals = Array.from(memDetail.querySelectorAll<SVGTextElement>('.word-val'));
  const grp = (w: string) => `${w.slice(0, 2)} ${w.slice(2, 4)} ${w.slice(4, 6)} ${w.slice(6, 8)}`;
  [3, 2, 1, 0].forEach((addr, i) => { if (vals[i]) vals[i].textContent = grp(PROGRAM[addr]); });
}

// ── Per-wire pulse overlays (skip the embedded mem's own wires). ──────────
const wires = Array.from(svg.querySelectorAll<SVGPolylineElement>('.wire')).filter((w) => !w.closest('.detailed'));
const pulseFor = new Map<SVGPolylineElement, SVGPolylineElement>();
for (const w of wires) {
  const p = document.createElementNS(SVG_NS, 'polyline');
  p.setAttribute('class', 'pulse');
  p.setAttribute('points', w.getAttribute('points') || '');
  const net = w.getAttribute('data-net');
  if (net) p.setAttribute('data-net', net);
  p.setAttribute('data-on', w.getAttribute('data-on') || '0');
  w.insertAdjacentElement('afterend', p);
  pulseFor.set(w, p);
}
function setNet(net: string, on: Bit) {
  for (const w of wires) if (w.getAttribute('data-net') === net) {
    w.setAttribute('data-on', String(on));
    pulseFor.get(w)?.setAttribute('data-on', String(on));
  }
}
const setPin = (id: string, on: Bit) => document.getElementById(id)?.setAttribute('data-on', String(on));
const T = (id: string) => document.getElementById(id) as HTMLElement;
const grp = (w: string) => `${w.slice(0, 2)} ${w.slice(2, 4)} ${w.slice(4, 6)} ${w.slice(6, 8)}`;
const reg = (b: string) => 'r' + parseInt(b, 2);

function render() {
  const a1 = ((pc >> 1) & 1) as Bit, a0 = (pc & 1) as Bit;
  const word = PROGRAM[pc];

  // PC block
  document.getElementById('gPC')?.setAttribute('data-on', '1');
  T('pcCount').textContent = `${a1}${a0}`;
  setPin('pinPcClk', clk); setPin('pinPcAddr1', a1); setPin('pinPcAddr0', a0);

  // PC hover-preview mini (reg + +1 + feedback)
  const pcd = document.getElementById('pcDetail');
  if (pcd) {
    const cm = document.getElementById('pcCountMini'); if (cm) cm.textContent = `${a1}${a0}`;
    const wm = (net: string, on: Bit) =>
      pcd.querySelectorAll<SVGPolylineElement>(`.wire-mini[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
    wm('clk', clk); wm('addr1', a1); wm('addr0', a0); wm('cnt', 1); wm('fb', clk);
    document.getElementById('gPcReg')?.setAttribute('data-on', pc !== 0 ? '1' : '0');
    document.getElementById('gPcAdd')?.setAttribute('data-on', '1');
  }

  // fetch-level wires
  setNet('clk', clk);
  setNet('addr1', a1); setNet('addr0', a0);
  setNet('instr', 1);
  setPin('pinClk', clk); setPin('pinInstr', 1);

  // Light the embedded memory: addressed word lit + its read path.
  if (memDetail) {
    const w = (net: string, on: Bit) =>
      memDetail.querySelectorAll<SVGPolylineElement>(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
    const body = (id: string, on: Bit) =>
      memDetail.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on));
    w('addr1', a1); w('addr0', a0);
    for (let k = 0; k < 4; k++) { w(`word${k}`, (k === pc ? 1 : 0) as Bit); body(`gWord${k}`, (k === pc ? 1 : 0) as Bit); }
    w('rdata', 1); body('gReadmux', 1);
  }

  // Readouts
  T('pcBits').textContent = `${a1}${a0}`;
  T('pcDec').textContent = `(${pc})`;
  T('instrBits').textContent = grp(word);
  const op = parseInt(word.slice(0, 2), 2);
  T('decodeBits').textContent = `${OP_NAMES[op]} ${reg(word.slice(6, 8))},${reg(word.slice(2, 4))},${reg(word.slice(4, 6))}`;
}

function persist() { saveSnapshot<Snap>(SNAP_KEY, { pc }); }

// Clock: pulse the clk line, advance the PC on the (rising) edge.
btnStep.addEventListener('click', () => {
  clk = 1; render();
  setTimeout(() => { pc = (pc + 1) & 0b11; clk = 0; render(); persist(); }, 260);
});
btnReset.addEventListener('click', () => { pc = 0; clk = 0; clearSnapshot(SNAP_KEY); render(); });

// ── Drill-downs: PC → the counter; memory → /mem.html at the PC's address. ──
document.getElementById('slot-pc')?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/counter.html', { from: 'fetch', which: 'pc' }));
});
document.getElementById('slot-mem')?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/mem.html', {
    from: 'fetch', which: 'instruction-memory', addr1: (pc >> 1) & 1, addr0: pc & 1,
  }));
});

initDrillBreadcrumb();
render();

initCanvasZoom();
initSteps();
initPanel();
initToc();
