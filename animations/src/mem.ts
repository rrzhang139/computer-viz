import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";

// Memory (addressable word store) — read path. A 2-bit address selects one of
// four stored 8-bit words; the read MUX forwards it as rdata. The four words
// are a seeded program (memory table); the read MUX is an EXACT-copy embed of
// /mux.html, with every word/address/output wire routed onto its projected
// pins. Read is combinational. (Write port joins this block for data memory.)
//   word_k → MUX in_k → addr k   (bottom word0 = addr 00, LSB at bottom)

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('mem') as unknown as SVGSVGElement;

const btnAddr1 = document.getElementById('btnAddr1') as HTMLButtonElement;
const btnAddr0 = document.getElementById('btnAddr0') as HTMLButtonElement;
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;

// Seeded program — 4 R-type instructions, opcode|rs1|rs2|rd (op: 00 ADD,
// 01 AND, 10 OR, 11 XOR). PROGRAM[addr] is the word at that address.
const PROGRAM = ['00000110', '10100011', '11110001', '01011000']; // addr 0..3
const OP_NAMES = ['ADD', 'AND', 'OR', 'XOR'];

type Snap = { a1: Bit; a0: Bit };
const SNAP_KEY = 'mem';
const _snap = loadSnapshot<Snap>(SNAP_KEY);
let a1: Bit = readBitParam('addr1', _snap?.a1 ?? 0);
let a0: Bit = readBitParam('addr0', _snap?.a0 ?? 0);

// ── Embed the real MUX; route every wire onto its projected pins. ─────────
type Pt = { x: number; y: number };
const embeds = autoFillEmbeds(svg);
const MUX: Record<string, Pt> = embeds.get('slot-readmux') || {};
const readmuxDetail = document.getElementById('readmuxDetail');
const setW = (id: string, pts: string) => document.getElementById(id)?.setAttribute('points', pts);

// word cell right-edge output y (SVG): word3 top … word0 bottom
const WORD_Y = [920, 680, 440, 200]; // index = addr (0..3)
const WORD_LANE = [700, 660, 660, 700]; // vertical lane x per word (avoid colinear)

if (MUX.pinS1 && MUX.pinS0 && MUX.pinIn0 && MUX.pinIn1 && MUX.pinIn2 && MUX.pinIn3 && MUX.pinOut) {
  // address → MUX select (routed over the top of the word table)
  setW('wAddr1', `0,80 840,80 840,${MUX.pinS1.y} ${MUX.pinS1.x},${MUX.pinS1.y}`);
  setW('wAddr0', `0,160 40,160 40,60 810,60 810,${MUX.pinS0.y} ${MUX.pinS0.x},${MUX.pinS0.y}`);
  // word_k → MUX in_k (bend from the cell's right edge into the data input)
  const inPin = [MUX.pinIn0, MUX.pinIn1, MUX.pinIn2, MUX.pinIn3];
  for (let k = 0; k < 4; k++) {
    const lane = WORD_LANE[k], y = WORD_Y[k], p = inPin[k];
    setW(`wWord${k}`, `480,${y} ${lane},${y} ${lane},${p.y} ${p.x},${p.y}`);
  }
  // MUX out → rdata (Manhattan: out right at pin-y, then down/up to the rdata pin)
  setW('wRdata', `${MUX.pinOut.x},${MUX.pinOut.y} 1520,${MUX.pinOut.y} 1520,560 1600,560`);
}

// ── Per-wire pulse overlays (skip the embedded MUX's own wires). ──────────
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
function setBtn(btn: HTMLButtonElement, label: string, v: Bit) {
  btn.setAttribute('data-on', String(v));
  btn.textContent = `${label} ${v}`;
}
const T = (id: string) => document.getElementById(id) as HTMLElement;
const grp = (w: string) => `${w.slice(0, 2)} ${w.slice(2, 4)} ${w.slice(4, 6)} ${w.slice(6, 8)}`;
const reg = (b: string) => 'r' + parseInt(b, 2);

function render() {
  const addr = a1 * 2 + a0;
  const word = PROGRAM[addr];

  setNet('addr1', a1); setPin('pinAddr1', a1);
  setNet('addr0', a0); setPin('pinAddr0', a0);

  // word cells: show every program word; light + route only the addressed one
  for (let k = 0; k < 4; k++) {
    T(`vWord${k}`).textContent = grp(PROGRAM[k]);
    document.getElementById(`gWord${k}`)?.setAttribute('data-on', String(k === addr ? 1 : 0));
    setNet(`word${k}`, (k === addr ? 1 : 0) as Bit);
  }
  setNet('rdata', 1); setPin('pinRdata', 1);

  // Light the embedded MUX to show the selected path (the read mechanism).
  if (readmuxDetail) {
    const sel: Bit[] = [0, 0, 0, 0]; sel[addr] = 1;
    const body = (id: string, on: Bit) =>
      readmuxDetail.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on));
    const w = (net: string, on: Bit) =>
      readmuxDetail.querySelectorAll<SVGPolylineElement>(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
    w('s1', a1); w('s0', a0);
    for (let k = 0; k < 4; k++) {
      w(`in${k}`, (k === addr ? 1 : 0) as Bit);
      w(`sel${k}`, sel[k]);
      w(`andOut${k}`, (k === addr ? 1 : 0) as Bit);
      body(`gAnd${k}`, sel[k]);
    }
    w('out', 1);
    body('gOr', 1); body('gDecoder', 1);
  }

  setBtn(btnAddr1, 'addr1', a1);
  setBtn(btnAddr0, 'addr0', a0);

  T('addrBits').textContent = `${a1}${a0}`;
  T('addrDec').textContent = `(${addr})`;
  T('rdataBits').textContent = grp(word);
  const op = parseInt(word.slice(0, 2), 2);
  T('decodeBits').textContent = `${OP_NAMES[op]} ${reg(word.slice(6, 8))},${reg(word.slice(2, 4))},${reg(word.slice(4, 6))}`;
}

function persist() { saveSnapshot<Snap>(SNAP_KEY, { a1, a0 }); }

btnAddr1.addEventListener('click', () => { a1 = (a1 ? 0 : 1); render(); persist(); });
btnAddr0.addEventListener('click', () => { a0 = (a0 ? 0 : 1); render(); persist(); });
btnReset.addEventListener('click', () => { a1 = 0; a0 = 0; clearSnapshot(SNAP_KEY); render(); });

// ── Drill-down: clicking the read MUX opens /mux.html with this address. ──
document.getElementById('slot-readmux')?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/mux.html', {
    from: 'mem', which: 'read-mux', s1: a1, s0: a0,
  }));
});

initDrillBreadcrumb();
render();

initCanvasZoom();
initSteps();
initPanel();
initToc();
